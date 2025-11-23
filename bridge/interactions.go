package main

import (
	"fmt"
	"log"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/test"
	"fyne.io/fyne/v2/widget"
)

func (b *Bridge) handleClickWidget(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	// Simulate click
	if btn, ok := obj.(*widget.Button); ok {
		if b.testMode {
			test.Tap(btn)
		} else {
			// In normal mode, just trigger the callback
			btn.OnTapped()
		}
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else if check, ok := obj.(*widget.Check); ok {
		// Handle checkbox clicks
		if b.testMode {
			test.Tap(check)
		} else {
			// Toggle the checkbox state and trigger the callback manually
			newState := !check.Checked
			var callback func(bool)

			// Update UI on main thread
			fyne.DoAndWait(func() {
				check.SetChecked(newState)
				// Capture callback reference (don't call it here - would block main thread)
				callback = check.OnChanged
			})

			// Call callback AFTER DoAndWait to avoid blocking main thread
			if callback != nil {
				callback(newState)
			}
		}
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else if hyperlink, ok := obj.(*widget.Hyperlink); ok {
		// Handle hyperlink clicks

		// Check if this is a browser navigation hyperlink (relative URL)
		b.mu.RLock()
		meta, hasMeta := b.widgetMeta[widgetID]
		b.mu.RUnlock()

		isRelativeURL := hasMeta && meta.URL != "" && !strings.Contains(meta.URL, "://") && strings.HasPrefix(meta.URL, "/")

		if isRelativeURL {
			// This is a relative URL - trigger browser navigation instead of opening externally
			b.sendEvent(Event{
				Type:     "hyperlinkNavigation",
				WidgetID: widgetID,
				Data:     map[string]interface{}{"url": meta.URL},
			})
		} else {
			// External URL - use normal hyperlink behavior
			if b.testMode {
				test.Tap(hyperlink)
			} else {
				// Trigger hyperlink tap on main thread
				fyne.DoAndWait(func() {
					hyperlink.Tapped(&fyne.PointEvent{})
				})
			}
		}

		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else if draggable, ok := obj.(*DraggableContainer); ok {
		// Handle DraggableContainer clicks (images with both onClick and onDrag)
		if b.testMode {
			test.Tap(draggable)
		} else {
			// Trigger tap on main thread
			fyne.DoAndWait(func() {
				draggable.Tapped(&fyne.PointEvent{})
			})
		}
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else if clickable, ok := obj.(*ClickableContainer); ok {
		// Handle ClickableContainer clicks (images with onClick only)
		if b.testMode {
			test.Tap(clickable)
		} else {
			// Trigger tap on main thread
			fyne.DoAndWait(func() {
				clickable.Tapped(&fyne.PointEvent{})
			})
		}
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else if container, ok := obj.(*fyne.Container); ok {
		// Handle regular Fyne containers by finding and clicking tappable children
		// This allows tests to click on container IDs and have clicks propagate to interactive content
		tappable := b.findFirstTappableChild(container)
		if tappable != nil {
			if b.testMode {
				test.Tap(tappable)
			} else {
				// Trigger tap on main thread
				fyne.DoAndWait(func() {
					tappable.Tapped(&fyne.PointEvent{})
				})
			}
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
			})
		} else {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Container has no tappable children (id: %s)", widgetID),
			})
		}
	} else {
		// Get widget type for debugging
		widgetType := fmt.Sprintf("%T", obj)
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Widget is not clickable (type: %s, id: %s)", widgetType, widgetID),
		})
	}
}

// findFirstTappableChild recursively searches a container for tappable children
// Returns the first tappable object found (depth-first search)
func (b *Bridge) findFirstTappableChild(obj fyne.CanvasObject) fyne.Tappable {
	// Check if this object itself is tappable
	if tappable, ok := obj.(fyne.Tappable); ok {
		return tappable
	}

	// If it's a container, recursively search its children
	if container, ok := obj.(*fyne.Container); ok {
		for _, child := range container.Objects {
			if found := b.findFirstTappableChild(child); found != nil {
				return found
			}
		}
	}

	return nil
}

func (b *Bridge) handleClickToolbarAction(msg Message) {
	customID := msg.Payload["customId"].(string)

	b.mu.RLock()
	action, exists := b.toolbarActions[customID]

	// If not found by custom ID, search by label in toolbar items
	if !exists {
		for _, toolbarMeta := range b.toolbarItems {
			for i, label := range toolbarMeta.Labels {
				if label == customID {
					// Found matching label, get the corresponding toolbar item
					if i < len(toolbarMeta.Items) {
						if toolbarAction, ok := toolbarMeta.Items[i].(*widget.ToolbarAction); ok {
							action = toolbarAction
							exists = true
							break
						}
					}
				}
			}
			if exists {
				break
			}
		}
	}

	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Toolbar action not found",
		})
		return
	}

	// Simulate tap on the toolbar action
	if action.OnActivated != nil {
		action.OnActivated()
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleDoubleTapWidget(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	// Use test.DoubleTap if in test mode
	if b.testMode {
		if tappable, ok := obj.(fyne.DoubleTappable); ok {
			test.DoubleTap(tappable)
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
			})
		} else {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   "Widget is not double-tappable",
			})
		}
	} else {
		// In normal mode, trigger OnDoubleTapped if available
		if dt, ok := obj.(fyne.DoubleTappable); ok {
			dt.DoubleTapped(nil)
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
			})
		} else {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   "Widget does not support double-tap",
			})
		}
	}
}

func (b *Bridge) handleRightClickWidget(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	// Use test.TapSecondary if in test mode
	if b.testMode {
		if tappable, ok := obj.(fyne.SecondaryTappable); ok {
			test.TapSecondary(tappable)
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
			})
		} else {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   "Widget does not support right-click",
			})
		}
	} else {
		// In normal mode, trigger OnTappedSecondary if available
		if st, ok := obj.(fyne.SecondaryTappable); ok {
			st.TappedSecondary(nil)
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
			})
		} else {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   "Widget does not support right-click",
			})
		}
	}
}

func (b *Bridge) handleHoverWidget(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	windowID := msg.Payload["windowId"].(string)
	win, winExists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	if !winExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	// Use test.MoveMouse to hover over the widget
	if b.testMode {
		canvas := win.Canvas()
		// Get widget position (simplified - assumes widget at center)
		pos := obj.Position()
		test.MoveMouse(canvas, pos)
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		// In normal mode, trigger MouseIn if available
		if hoverable, ok := obj.(interface{ MouseIn(*fyne.PointEvent) }); ok {
			hoverable.MouseIn(&fyne.PointEvent{})
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
			})
		} else {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true, // Success even if not hoverable
			})
		}
	}
}

func (b *Bridge) handleTypeText(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	text := msg.Payload["text"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	// Check if this is a TappableEntry with a separate entry reference
	entryObj, hasEntry := b.widgets[widgetID+"_entry"]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	// If we have a separate entry reference (from TappableEntry), use that
	var entry *widget.Entry
	if hasEntry {
		if e, ok := entryObj.(*widget.Entry); ok {
			entry = e
		}
	} else if e, ok := obj.(*widget.Entry); ok {
		entry = e
	}

	if entry != nil {
		if b.testMode {
			test.Type(entry, text)
		} else {
			// UI operations must be called on the main thread
			fyne.DoAndWait(func() {
				entry.SetText(text)
			})
		}

		// Update metadata
		b.mu.Lock()
		if meta, exists := b.widgetMeta[widgetID]; exists {
			meta.Text = text
			b.widgetMeta[widgetID] = meta
		}
		b.mu.Unlock()

		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a text entry",
		})
	}
}

func (b *Bridge) handleSubmitEntry(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	// Check if this is an Entry wrapped in a container (from minWidth)
	entryObj, hasEntry := b.widgets[widgetID+"_entry"]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	// If we have a separate entry reference (from minWidth wrapping), use that
	if hasEntry {
		if entry, ok := entryObj.(*widget.Entry); ok {
			if entry.OnSubmitted != nil {
				// Trigger the OnSubmitted callback
				fyne.DoAndWait(func() {
					entry.OnSubmitted(entry.Text)
				})
				b.sendResponse(Response{
					ID:      msg.ID,
					Success: true,
				})
				return
			}
		}
	}

	// Check if it's an Entry widget with OnSubmitted callback
	if entry, ok := obj.(*widget.Entry); ok {
		if entry.OnSubmitted != nil {
			// Trigger the OnSubmitted callback
			fyne.DoAndWait(func() {
				entry.OnSubmitted(entry.Text)
			})
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
			})
			return
		}
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: false,
		Error:   "Widget is not an Entry or has no OnSubmitted callback",
	})
}

func (b *Bridge) handleDragCanvas(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	fromX := msg.Payload["fromX"].(float64)
	fromY := msg.Payload["fromY"].(float64)
	deltaX := msg.Payload["deltaX"].(float64)
	deltaY := msg.Payload["deltaY"].(float64)

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

	if b.testMode {
		canvas := win.Canvas()
		pos := fyne.NewPos(float32(fromX), float32(fromY))
		test.Drag(canvas, pos, float32(deltaX), float32(deltaY))
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Drag is only supported in test mode",
		})
	}
}

func (b *Bridge) handleScrollCanvas(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	deltaX := msg.Payload["deltaX"].(float64)
	deltaY := msg.Payload["deltaY"].(float64)

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

	if b.testMode {
		canvas := win.Canvas()
		// Scroll at center of canvas
		size := canvas.Size()
		pos := fyne.NewPos(size.Width/2, size.Height/2)
		test.Scroll(canvas, pos, float32(deltaX), float32(deltaY))
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Scroll is only supported in test mode",
		})
	}
}

func (b *Bridge) handleFocusWidget(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	// Check if this is a TappableEntry with a separate entry reference
	entryObj, hasEntry := b.widgets[widgetID+"_entry"]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	// If we have a separate entry reference (from TappableEntry), use that
	if hasEntry {
		if entry, ok := entryObj.(*widget.Entry); ok {
			// Find the canvas for this widget
			for _, win := range b.windows {
				canvas := win.Canvas()
				if canvas != nil {
					fyne.DoAndWait(func() {
						canvas.Focus(entry)
					})
					b.sendResponse(Response{
						ID:      msg.ID,
						Success: true,
					})
					return
				}
			}
		}
	}

	// Try to focus the widget directly
	if focusable, ok := obj.(fyne.Focusable); ok {
		// Find the canvas for this widget
		for _, win := range b.windows {
			canvas := win.Canvas()
			if canvas != nil {
				fyne.DoAndWait(func() {
					canvas.Focus(focusable)
				})
				b.sendResponse(Response{
					ID:      msg.ID,
					Success: true,
				})
				return
			}
		}
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Could not find canvas for widget",
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not focusable",
		})
	}
}

func (b *Bridge) handleFocusNext(msg Message) {
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

	if b.testMode {
		canvas := win.Canvas()
		test.FocusNext(canvas)
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "FocusNext is only supported in test mode",
		})
	}
}

func (b *Bridge) handleFocusPrevious(msg Message) {
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

	if b.testMode {
		canvas := win.Canvas()
		test.FocusPrevious(canvas)
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "FocusPrevious is only supported in test mode",
		})
	}
}

func (b *Bridge) handleFindWidget(msg Message) {
	selector := msg.Payload["selector"].(string)
	selectorType := msg.Payload["type"].(string)

	b.mu.RLock()

	// Resolve custom ID to real widget ID if needed
	resolvedSelector := selector
	if selectorType == "id" {
		if realID, exists := b.customIds[selector]; exists {
			resolvedSelector = realID
		}
	}

	var visibleMatches []string
	var hiddenMatches []string

	for widgetID, meta := range b.widgetMeta {
		var isMatch bool
		switch selectorType {
		case "text":
			isMatch = strings.Contains(meta.Text, selector)
		case "exactText":
			isMatch = meta.Text == selector
		case "type":
			isMatch = meta.Type == selector
		case "id":
			isMatch = widgetID == resolvedSelector
		case "placeholder":
			isMatch = meta.Placeholder == selector
		case "testId":
			isMatch = meta.TestId == selector
		case "role":
			// Look up role from accessibility CustomData
			if meta.CustomData != nil {
				if role, ok := meta.CustomData["a11y_role"].(string); ok {
					isMatch = role == selector
				}
			}
		case "label":
			// Look up accessibility label from CustomData
			if meta.CustomData != nil {
				if label, ok := meta.CustomData["a11y_label"].(string); ok {
					isMatch = strings.Contains(label, selector)
				}
			}
		}

		if isMatch {
			// Check if widget is visible
			obj, exists := b.widgets[widgetID]
			if exists && obj.Visible() {
				visibleMatches = append(visibleMatches, widgetID)
			} else {
				hiddenMatches = append(hiddenMatches, widgetID)
			}
		}
	}

	// Additionally, check for toolbar actions when selecting by ID or text
	// Keep read lock to access toolbar data
	if selectorType == "id" {
		if _, exists := b.toolbarActions[selector]; exists {
			// Use a special prefix to identify toolbar actions, as they are not real widgets
			visibleMatches = append(visibleMatches, fmt.Sprintf("toolbar_action:%s", selector))
		}
	} else if selectorType == "text" || selectorType == "exactText" {
		// Search toolbar items by their label text
		for _, toolbarMeta := range b.toolbarItems {
			for _, label := range toolbarMeta.Labels {
				if label == "" {
					continue // Skip separators and spacers
				}
				var isMatch bool
				if selectorType == "text" {
					isMatch = strings.Contains(label, selector)
				} else { // exactText
					isMatch = label == selector
				}
				if isMatch {
					// Return the label as a toolbar action identifier
					visibleMatches = append(visibleMatches, fmt.Sprintf("toolbar_action:%s", label))
				}
			}
		}
	}

	// Additionally, search RadioGroup and CheckGroup options by text
	if selectorType == "text" || selectorType == "exactText" {
		for widgetID, obj := range b.widgets {
			meta := b.widgetMeta[widgetID]
			if meta.Type == "radiogroup" {
				if radio, ok := obj.(*widget.RadioGroup); ok {
					for _, option := range radio.Options {
						var isMatch bool
						if selectorType == "text" {
							isMatch = strings.Contains(option, selector)
						} else {
							isMatch = option == selector
						}
						if isMatch && radio.Visible() {
							visibleMatches = append(visibleMatches, widgetID)
							break
						}
					}
				}
			} else if meta.Type == "checkgroup" {
				if checkGroup, ok := obj.(*widget.CheckGroup); ok {
					for _, option := range checkGroup.Options {
						var isMatch bool
						if selectorType == "text" {
							isMatch = strings.Contains(option, selector)
						} else {
							isMatch = option == selector
						}
						if isMatch && checkGroup.Visible() {
							visibleMatches = append(visibleMatches, widgetID)
							break
						}
					}
				}
			}
		}
	}

	b.mu.RUnlock() // Release read lock before sending response!

	// Prioritize visible widgets - return visible first, then hidden
	matches := append(visibleMatches, hiddenMatches...)

	// Remove duplicates before sending
	uniqueMatches := make([]string, 0, len(matches))
	seen := make(map[string]bool)
	for _, match := range matches {
		if _, ok := seen[match]; !ok {
			uniqueMatches = append(uniqueMatches, match)
			seen[match] = true
		}
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"widgetIds": matches,
		},
	})
}

func (b *Bridge) handleGetWidgetInfo(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, widgetExists := b.widgets[widgetID]
	meta, metaExists := b.widgetMeta[widgetID]
	b.mu.RUnlock()

	if !widgetExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	info := map[string]interface{}{
		"id":   widgetID,
		"type": "unknown",
		"text": "",
	}

	if metaExists {
		info["type"] = meta.Type
		info["text"] = meta.Text
	}

	// Get current widget properties - must happen on main thread
	fyne.DoAndWait(func() {
		pos := obj.Position()
		size := obj.Size()

		// Get absolute position
		absPos := b.app.Driver().AbsolutePositionForObject(obj)

		log.Printf("[DEBUG] handleGetWidgetInfo: widgetId=%s, pos=(%f, %f), absPos=(%f, %f), size=(%f, %f)", widgetID, pos.X, pos.Y, absPos.X, absPos.Y, size.Width, size.Height)
		info["x"] = pos.X
		info["y"] = pos.Y
		info["absoluteX"] = absPos.X
		info["absoluteY"] = absPos.Y
		info["width"] = size.Width
		info["height"] = size.Height

		switch w := obj.(type) {
		case *widget.Label:
			info["text"] = w.Text
			info["type"] = "label"
		case *widget.Entry:
			info["text"] = w.Text
			info["type"] = "entry"
			info["placeholder"] = w.PlaceHolder
		case *widget.Button:
			info["text"] = w.Text
			info["type"] = "button"
		case *canvas.Image:
			info["type"] = "image"
			if metaExists {
				info["path"] = meta.Text // path is stored in meta.Text
			}
			size := w.MinSize()
			info["width"] = size.Width
			info["height"] = size.Height
			// Convert FillMode to string
			switch w.FillMode {
			case canvas.ImageFillContain:
				info["fillMode"] = "contain"
			case canvas.ImageFillStretch:
				info["fillMode"] = "stretch"
			case canvas.ImageFillOriginal:
				info["fillMode"] = "original"
			default:
				info["fillMode"] = "unknown"
			}
		}

		// Check if widget is disabled
		if disableable, ok := obj.(fyne.Disableable); ok {
			info["disabled"] = disableable.Disabled()
		} else {
			info["disabled"] = false
		}
	})

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  info,
	})
}

func (b *Bridge) handleGetAllWidgets(msg Message) {
	// First, collect widget IDs and metadata while holding the lock
	b.mu.RLock()

	type widgetData struct {
		id   string
		obj  fyne.CanvasObject
		meta WidgetMetadata
	}

	widgetList := make([]widgetData, 0, len(b.widgetMeta))
	for widgetID, meta := range b.widgetMeta {
		if obj, exists := b.widgets[widgetID]; exists {
			widgetList = append(widgetList, widgetData{
				id:   widgetID,
				obj:  obj,
				meta: meta,
			})
		}
	}

	b.mu.RUnlock()

	// Now access widget properties on the main thread
	widgets := make([]map[string]interface{}, 0, len(widgetList))

	fyne.DoAndWait(func() {
		for _, wd := range widgetList {
			widgetInfo := map[string]interface{}{
				"id":   wd.id,
				"type": wd.meta.Type,
				"text": wd.meta.Text,
			}

			// Get current text value from widget
			switch w := wd.obj.(type) {
			case *widget.Label:
				widgetInfo["text"] = w.Text
			case *widget.Entry:
				widgetInfo["text"] = w.Text
			case *widget.Button:
				widgetInfo["text"] = w.Text
			case *widget.Toolbar:
				// Traverse Toolbar.Items to extract toolbar action labels
				b.mu.RLock()
				if toolbarMeta, exists := b.toolbarItems[wd.id]; exists {
					widgetInfo["items"] = toolbarMeta.Labels
				}
				b.mu.RUnlock()
			case *widget.RadioGroup:
				widgetInfo["options"] = w.Options
				widgetInfo["selected"] = w.Selected
			case *widget.CheckGroup:
				widgetInfo["options"] = w.Options
				widgetInfo["selected"] = w.Selected
			case *fyne.Container:
				// Traverse Container.Objects to get child widget IDs
				var childIDs []string
				for _, childObj := range w.Objects {
					// Find the widget ID for this object (reverse lookup)
					b.mu.RLock()
					for childID, widgetObj := range b.widgets {
						if widgetObj == childObj {
							childIDs = append(childIDs, childID)
							break
						}
					}
					b.mu.RUnlock()
				}
				widgetInfo["objects"] = childIDs
			}

			widgets = append(widgets, widgetInfo)
		}
	})

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"widgets": widgets,
		},
	})
}

func (b *Bridge) handleGetParent(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	parentID, exists := b.childToParent[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"parentId": ""}, // No parent found
		})
		return
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"parentId": parentID},
	})
}

func (b *Bridge) handleRegisterCustomId(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	customID := msg.Payload["customId"].(string)

	b.mu.Lock()
	b.customIds[customID] = widgetID
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleRegisterTestId(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	testID := msg.Payload["testId"].(string)

	b.mu.Lock()
	if meta, exists := b.widgetMeta[widgetID]; exists {
		meta.TestId = testID
		b.widgetMeta[widgetID] = meta
	} else {
		b.widgetMeta[widgetID] = WidgetMetadata{TestId: testID}
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleDragWidget(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	x := msg.Payload["x"].(float64)
	y := msg.Payload["y"].(float64)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	if draggable, ok := obj.(fyne.Draggable); ok {
		// In normal mode, trigger the drag events
		draggable.Dragged(&fyne.DragEvent{
			PointEvent: fyne.PointEvent{
				Position: fyne.NewPos(float32(x), float32(y)),
			},
		})
		draggable.DragEnd()
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not draggable",
		})
	}
}
