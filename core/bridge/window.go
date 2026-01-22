package main

import (
	"fmt"
	"image"
	"image/png"
	"log"
	"os"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/driver/desktop"
)

// dumpCanvasObjectTree recursively dumps the canvas object tree with positions and sizes
func (b *Bridge) dumpCanvasObjectTree(obj fyne.CanvasObject, depth int) {
	indent := strings.Repeat("  ", depth)
	pos := obj.Position()
	size := obj.Size()
	minSize := obj.MinSize()

	// Get type name (strip package prefix)
	typeName := fmt.Sprintf("%T", obj)
	if idx := strings.LastIndex(typeName, "."); idx >= 0 {
		typeName = typeName[idx+1:]
	}

	// Reverse lookup widget ID, custom ID, and metadata
	widgetID := ""
	customID := ""
	var meta WidgetMetadata
	hasMeta := false
	b.mu.RLock()
	for id, widget := range b.widgets {
		if widget == obj {
			widgetID = id
			break
		}
	}
	// Also look up custom ID (reverse lookup: find custom ID that maps to this widget ID)
	if widgetID != "" {
		for cid, wid := range b.customIds {
			if wid == widgetID {
				customID = cid
				break
			}
		}
		// Look up metadata for padding info
		meta, hasMeta = b.widgetMeta[widgetID]
	}
	b.mu.RUnlock()

	idStr := ""
	if customID != "" {
		idStr = fmt.Sprintf(" id=%s", customID)
	} else if widgetID != "" {
		idStr = fmt.Sprintf(" id=%s", widgetID)
	}

	// Build padding string if padding is set
	paddingStr := ""
	if hasMeta {
		pt, pr, pb, pl := meta.PaddingTop, meta.PaddingRight, meta.PaddingBottom, meta.PaddingLeft
		if pt != 0 || pr != 0 || pb != 0 || pl != 0 {
			// Check if all padding values are the same
			if pt == pr && pr == pb && pb == pl {
				paddingStr = fmt.Sprintf(" p=%.0f", pt)
			} else {
				paddingStr = fmt.Sprintf(" pt=%.0f pr=%.0f pb=%.0f pl=%.0f", pt, pr, pb, pl)
			}
		}
	}

	log.Printf("%s%s%s x=%.0f y=%.0f w=%.0f h=%.0f (min=%.0f,%.0f)%s",
		indent, typeName, idStr, pos.X, pos.Y, size.Width, size.Height, minSize.Width, minSize.Height, paddingStr)

	// Recurse into containers
	if container, ok := obj.(*fyne.Container); ok {
		for _, child := range container.Objects {
			b.dumpCanvasObjectTree(child, depth+1)
		}
	}
}

func (b *Bridge) handleCreateWindow(msg Message) Response {
	title, _ := msg.Payload["title"].(string) // Default to empty string if not provided
	windowID := msg.Payload["id"].(string)

	var win fyne.Window

	// Window creation must happen on the main thread
	fyne.DoAndWait(func() {
		// Apply theme on first window creation (when event loop is running)
		b.mu.Lock()
		if len(b.windows) == 0 && b.scalableTheme != nil {
			b.app.Settings().SetTheme(b.scalableTheme)
		}
		b.mu.Unlock()

		win = b.app.NewWindow(title)

		// Register window immediately after creation to prevent race conditions
		// where showWindow arrives before createWindow completes in gRPC mode
		b.mu.Lock()
		b.windows[windowID] = win
		b.mu.Unlock()

		// Set window size if provided
		// Use toFloat32 helper to handle msgpack numeric encoding (int64, uint16, etc.)
		if widthVal, ok := msg.Payload["width"]; ok {
			if heightVal, ok := msg.Payload["height"]; ok {
				win.Resize(fyne.NewSize(toFloat32(widthVal), toFloat32(heightVal)))
			}
		}

		// Set fixed size if provided
		if fixedSize, ok := msg.Payload["fixedSize"].(bool); ok && fixedSize {
			win.SetFixedSize(true)
		}

		// Set padded if provided (default is true, set to false for fullscreen)
		if padded, ok := msg.Payload["padded"].(bool); ok && !padded {
			win.SetPadded(false)
		}

		// Set window icon if provided
		if iconName, ok := msg.Payload["icon"].(string); ok {
			b.mu.RLock()
			iconData, exists := b.resources[iconName]
			b.mu.RUnlock()
			if exists {
				resource := fyne.NewStaticResource(iconName, iconData)
				win.SetIcon(resource)
			}
		}

		// Register Ctrl+Shift+I shortcut to open inspector (unless disabled)
		inspectorEnabled := true
		if val, ok := msg.Payload["inspectorEnabled"].(bool); ok {
			inspectorEnabled = val
		}
		if inspectorEnabled {
			inspectorShortcut := &desktop.CustomShortcut{
				KeyName:  fyne.KeyI,
				Modifier: fyne.KeyModifierControl | fyne.KeyModifierShift,
			}
			win.Canvas().AddShortcut(inspectorShortcut, func(shortcut fyne.Shortcut) {
				log.Printf("[Inspector] Ctrl+Shift+I pressed for window: %s", windowID)
				inspector := NewInspector(b, windowID)
				inspector.Show()
			})

			// Register Ctrl+Shift+T shortcut to open theme editor
			themeEditorShortcut := &desktop.CustomShortcut{
				KeyName:  fyne.KeyT,
				Modifier: fyne.KeyModifierControl | fyne.KeyModifierShift,
			}
			win.Canvas().AddShortcut(themeEditorShortcut, func(shortcut fyne.Shortcut) {
				log.Printf("[ThemeEditor] Ctrl+Shift+T pressed")
				editor := NewThemeEditor(b)
				editor.Show()
			})
		}

		// Handle window close - quit app when last window is closed
		win.SetCloseIntercept(func() {
			// Check if there's a custom close intercept handler
			b.mu.RLock()
			callbackId, hasCallback := b.closeIntercepts[windowID]
			b.mu.RUnlock()

			if hasCallback {
				// Create response channel
				responseChan := make(chan bool, 1)
				b.mu.Lock()
				b.closeResponses[windowID] = responseChan
				b.mu.Unlock()

				// Send event to TypeScript
				b.sendEvent(Event{
					Type: "callback",
					Data: map[string]interface{}{
						"callbackId": callbackId,
						"windowId":   windowID,
					},
				})

				// Wait for response
				go func() {
					allowClose := <-responseChan

					b.mu.Lock()
					delete(b.closeResponses, windowID)
					b.mu.Unlock()

					if allowClose {
						b.mu.Lock()
						delete(b.windows, windowID)
						delete(b.closeIntercepts, windowID)
						windowCount := len(b.windows)
						b.mu.Unlock()

						fyne.DoAndWait(func() {
							win.Close()
						})

						if windowCount == 0 {
							fyne.Do(func() {
								b.app.Quit()
							})
						}
					}
				}()
			} else {
				// No custom handler - use default behavior
				b.mu.Lock()
				delete(b.windows, windowID)
				windowCount := len(b.windows)
				b.mu.Unlock()

				// Close this window
				win.Close()

				// If no more windows, quit the application
				if windowCount == 0 {
					fyne.Do(func() {
						b.app.Quit()
					})
				}
			}
		})
	})

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"windowId": windowID},
	}
}

func (b *Bridge) handleShowWindow(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	// Showing window must happen on the main thread
	fyne.DoAndWait(func() {
		win.Show()

	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleSetWindowTitle(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	title := msg.Payload["title"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	// Setting window title must happen on the main thread
	fyne.DoAndWait(func() {
		win.SetTitle(title)
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleSetWindowFullScreen(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	fullscreen := msg.Payload["fullscreen"].(bool)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	win.SetFullScreen(fullscreen)

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleCaptureWindow(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	filePath := msg.Payload["filePath"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	var img image.Image

	// Canvas capture must happen on main thread
	fyne.DoAndWait(func() {
		img = win.Canvas().Capture()
	})

	// Create file
	f, err := os.Create(filePath)
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Failed to create file: %v", err),
		}
	}
	defer f.Close()

	// Encode as PNG
	if err := png.Encode(f, img); err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Failed to encode PNG: %v", err),
		}
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleCenterWindow(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	win.CenterOnScreen()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleResizeWindow(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	width := toFloat64(msg.Payload["width"])
	height := toFloat64(msg.Payload["height"])

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	win.Resize(fyne.NewSize(float32(width), float32(height)))

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleSetWindowIcon(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	resourceName := msg.Payload["resourceName"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	iconData, iconExists := b.resources[resourceName]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	if !iconExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Resource not found: " + resourceName,
		}
	}

	fyne.DoAndWait(func() {
		resource := fyne.NewStaticResource(resourceName, iconData)
		win.SetIcon(resource)
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleSetWindowCloseIntercept(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	callbackId := msg.Payload["callbackId"].(string)

	b.mu.RLock()
	_, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	b.mu.Lock()
	b.closeIntercepts[windowID] = callbackId
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleCloseInterceptResponse(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	allowClose := msg.Payload["allowClose"].(bool)

	b.mu.RLock()
	responseChan, exists := b.closeResponses[windowID]
	b.mu.RUnlock()

	if exists {
		responseChan <- allowClose
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleCloseWindow(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	b.mu.Lock()
	delete(b.windows, windowID)
	delete(b.closeIntercepts, windowID)
	windowCount := len(b.windows)
	b.mu.Unlock()

	fyne.DoAndWait(func() {
		win.Close()
		// If no more windows, quit the application
		if windowCount == 0 {
			b.app.Quit()
		}
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleRequestFocusWindow(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	fyne.DoAndWait(func() {
		win.RequestFocus()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}
