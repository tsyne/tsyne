package main

import (
	"fmt"
	"image"
	"image/png"
	"os"

	"fyne.io/fyne/v2"
)

func (b *Bridge) handleCreateWindow(msg Message) {
	title := msg.Payload["title"].(string)
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

		// Set window size if provided
		if width, ok := msg.Payload["width"].(float64); ok {
			if height, ok := msg.Payload["height"].(float64); ok {
				win.Resize(fyne.NewSize(float32(width), float32(height)))
			}
		}

		// Set fixed size if provided
		if fixedSize, ok := msg.Payload["fixedSize"].(bool); ok && fixedSize {
			win.SetFixedSize(true)
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
							b.app.Quit()
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
					b.app.Quit()
				}
			}
		})
	})

	b.mu.Lock()
	b.windows[windowID] = win
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"windowId": windowID},
	})
}

func (b *Bridge) handleShowWindow(msg Message) {
	windowID := msg.Payload["windowId"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	// Showing window must happen on the main thread
	fyne.DoAndWait(func() {
		win.Show()
	})

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleSetWindowTitle(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	title := msg.Payload["title"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	// Setting window title must happen on the main thread
	fyne.DoAndWait(func() {
		win.SetTitle(title)
	})

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleSetWindowFullScreen(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	fullscreen := msg.Payload["fullscreen"].(bool)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	win.SetFullScreen(fullscreen)

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCaptureWindow(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	filePath := msg.Payload["filePath"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	var img image.Image

	// Canvas capture must happen on main thread
	fyne.DoAndWait(func() {
		img = win.Canvas().Capture()
	})

	// Create file
	f, err := os.Create(filePath)
	if err != nil {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Failed to create file: %v", err),
		})
		return
	}
	defer f.Close()

	// Encode as PNG
	if err := png.Encode(f, img); err != nil {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Failed to encode PNG: %v", err),
		})
		return
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCenterWindow(msg Message) {
	windowID := msg.Payload["windowId"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	win.CenterOnScreen()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleResizeWindow(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	width := msg.Payload["width"].(float64)
	height := msg.Payload["height"].(float64)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	win.Resize(fyne.NewSize(float32(width), float32(height)))

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleSetWindowIcon(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	resourceName := msg.Payload["resourceName"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	iconData, iconExists := b.resources[resourceName]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	if !iconExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Resource not found: " + resourceName,
		})
		return
	}

	fyne.DoAndWait(func() {
		resource := fyne.NewStaticResource(resourceName, iconData)
		win.SetIcon(resource)
	})

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleSetWindowCloseIntercept(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	callbackId := msg.Payload["callbackId"].(string)

	b.mu.RLock()
	_, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	b.mu.Lock()
	b.closeIntercepts[windowID] = callbackId
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCloseInterceptResponse(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	allowClose := msg.Payload["allowClose"].(bool)

	b.mu.RLock()
	responseChan, exists := b.closeResponses[windowID]
	b.mu.RUnlock()

	if exists {
		responseChan <- allowClose
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCloseWindow(msg Message) {
	windowID := msg.Payload["windowId"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	b.mu.Lock()
	delete(b.windows, windowID)
	delete(b.closeIntercepts, windowID)
	windowCount := len(b.windows)
	b.mu.Unlock()

	fyne.DoAndWait(func() {
		win.Close()
	})

	// If no more windows, quit the application
	if windowCount == 0 {
		b.app.Quit()
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}
