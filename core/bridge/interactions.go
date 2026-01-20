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

func (b *Bridge) handleClickWidget(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	// Extract optional coordinates for click position
	var clickX, clickY float32
	if x, ok := msg.Payload["x"]; ok {
		clickX = float32(toFloat64(x))
	}
	if y, ok := msg.Payload["y"]; ok {
		clickY = float32(toFloat64(y))
	}
	pointEvent := &fyne.PointEvent{
		Position: fyne.NewPos(clickX, clickY),
	}

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	// Simulate click
	if btn, ok := obj.(*widget.Button); ok {
		// Invoke button callback directly
		// The callback sends events to TypeScript asynchronously
		btn.OnTapped()
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else if tsyneBtn, ok := obj.(*TsyneButton); ok {
		// Handle TsyneButton (custom button with hover/mouse events)
		// Invoke button callback directly
		tsyneBtn.OnTapped()
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else if check, ok := obj.(*widget.Check); ok {
		// Handle checkbox clicks
		check.Checked = !check.Checked
		if check.OnChanged != nil {
			check.OnChanged(check.Checked)
		}
		return Response{
			ID:      msg.ID,
			Success: true,
		}
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
			// External URL - invoke hyperlink callback
			hyperlink.Tapped(pointEvent)
		}

		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else if draggable, ok := obj.(*DraggableContainer); ok {
		// Handle DraggableContainer clicks (images with both onClick and onDrag)
		draggable.Tapped(pointEvent)
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else if clickable, ok := obj.(*ClickableContainer); ok {
		// Handle ClickableContainer clicks (images with onClick only)
		clickable.Tapped(pointEvent)
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else if desktopIcon, ok := obj.(*TsyneDraggableIcon); ok {
		// Handle TsyneDraggableIcon clicks (desktop icons)
		desktopIcon.Tapped(pointEvent)
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else if tappableRaster, ok := obj.(*TappableCanvasRaster); ok {
		// Handle TappableCanvasRaster clicks - use coordinates for precise pixel targeting
		tappableRaster.Tapped(pointEvent)
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else if tappableRect, ok := obj.(*TappableCanvasRectangle); ok {
		// Handle TappableCanvasRectangle clicks
		tappableRect.Tapped(pointEvent)
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else if wrapper, ok := obj.(*TappableWrapper); ok {
		// Handle TappableWrapper - click through to its content (may be nested wrappers)
		return b.clickThroughContent(msg, wrapper.content)
	} else if droppable, ok := obj.(*DroppableWidget); ok {
		// Handle DroppableWidget - click through to its content
		return b.clickThroughContent(msg, droppable.content)
	} else if draggableW, ok := obj.(*DraggableWidget); ok {
		// Handle DraggableWidget - click through to its content
		return b.clickThroughContent(msg, draggableW.content)
	} else if container, ok := obj.(*fyne.Container); ok {
		// Handle regular Fyne containers by finding and clicking tappable children
		// This allows tests to click on container IDs and have clicks propagate to interactive content
		tappable := b.findFirstTappableChild(container)
		if tappable != nil {
			tappable.Tapped(pointEvent)
			return Response{
				ID:      msg.ID,
				Success: true,
			}
		} else {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Container has no tappable children (id: %s)", widgetID),
			}
		}
	} else if tappable, ok := obj.(fyne.Tappable); ok {
		// Generic fallback for any widget implementing fyne.Tappable
		tappable.Tapped(pointEvent)
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		// Get widget type for debugging
		widgetType := fmt.Sprintf("%T", obj)
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Widget is not clickable (type: %s, id: %s)", widgetType, widgetID),
		}
	}
}

// clickThroughContent recursively clicks through wrapper layers until it finds a clickable widget
func (b *Bridge) clickThroughContent(msg Message, content fyne.CanvasObject) Response {
	// Handle Button directly
	if btn, ok := content.(*widget.Button); ok {
		btn.OnTapped()
		return Response{ID: msg.ID, Success: true}
	}

	// Handle HoverableButton
	if hoverBtn, ok := content.(*HoverableButton); ok {
		hoverBtn.OnTapped()
		return Response{ID: msg.ID, Success: true}
	}

	// Handle nested TappableWrapper
	if wrapper, ok := content.(*TappableWrapper); ok {
		return b.clickThroughContent(msg, wrapper.content)
	}

	// Handle nested DroppableWidget
	if droppable, ok := content.(*DroppableWidget); ok {
		return b.clickThroughContent(msg, droppable.content)
	}

	// Handle nested DraggableWidget
	if draggable, ok := content.(*DraggableWidget); ok {
		return b.clickThroughContent(msg, draggable.content)
	}

	// Generic fallback for any tappable content
	if tappable, ok := content.(fyne.Tappable); ok {
		tappable.Tapped(&fyne.PointEvent{})
		return Response{ID: msg.ID, Success: true}
	}

	return Response{
		ID:      msg.ID,
		Success: false,
		Error:   fmt.Sprintf("Wrapper content is not clickable (type: %T)", content),
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

func (b *Bridge) handleClickToolbarAction(msg Message) Response {
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
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Toolbar action not found",
		}
	}

	// Simulate tap on the toolbar action
	if action.OnActivated != nil {
		action.OnActivated()
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleDoubleTapWidget(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	// Use test.DoubleTap if in test mode
	if b.testMode {
		if tappable, ok := obj.(fyne.DoubleTappable); ok {
			test.DoubleTap(tappable)
			return Response{
				ID:      msg.ID,
				Success: true,
			}
		} else {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   "Widget is not double-tappable",
			}
		}
	} else {
		// In normal mode, trigger OnDoubleTapped if available
		if dt, ok := obj.(fyne.DoubleTappable); ok {
			dt.DoubleTapped(nil)
			return Response{
				ID:      msg.ID,
				Success: true,
			}
		} else {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   "Widget does not support double-tap",
			}
		}
	}
}

func (b *Bridge) handleRightClickWidget(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	// Use test.TapSecondary if in test mode
	if b.testMode {
		if tappable, ok := obj.(fyne.SecondaryTappable); ok {
			test.TapSecondary(tappable)
			return Response{
				ID:      msg.ID,
				Success: true,
			}
		} else {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   "Widget does not support right-click",
			}
		}
	} else {
		// In normal mode, trigger OnTappedSecondary if available
		if st, ok := obj.(fyne.SecondaryTappable); ok {
			st.TappedSecondary(nil)
			return Response{
				ID:      msg.ID,
				Success: true,
			}
		} else {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   "Widget does not support right-click",
			}
		}
	}
}

func (b *Bridge) handleHoverWidget(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	windowID := msg.Payload["windowId"].(string)
	win, winExists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	if !winExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	// Use test.MoveMouse to hover over the widget
	if b.testMode {
		canvas := win.Canvas()
		// Get widget position (simplified - assumes widget at center)
		pos := obj.Position()
		test.MoveMouse(canvas, pos)
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		// In normal mode, trigger MouseIn if available
		if hoverable, ok := obj.(interface{ MouseIn(*fyne.PointEvent) }); ok {
			hoverable.MouseIn(&fyne.PointEvent{})
			return Response{
				ID:      msg.ID,
				Success: true,
			}
		} else {
			return Response{
				ID:      msg.ID,
				Success: true, // Success even if not hoverable
			}
		}
	}
}

func (b *Bridge) handleTypeText(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	text := msg.Payload["text"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	// Check if this is a TappableEntry with a separate entry reference
	entryObj, hasEntry := b.widgets[widgetID+"_entry"]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	// If we have a separate entry reference (from TappableEntry), use that
	var entry *widget.Entry
	if hasEntry {
		if e, ok := entryObj.(*widget.Entry); ok {
			entry = e
		}
	} else if e, ok := obj.(*widget.Entry); ok {
		entry = e
	} else if te, ok := obj.(*TsyneEntry); ok {
		entry = &te.Entry
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

		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a text entry",
		}
	}
}

func (b *Bridge) handleSubmitEntry(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	// Check if this is an Entry wrapped in a container (from minWidth)
	entryObj, hasEntry := b.widgets[widgetID+"_entry"]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	// If we have a separate entry reference (from minWidth wrapping), use that
	if hasEntry {
		if entry, ok := entryObj.(*widget.Entry); ok {
			if entry.OnSubmitted != nil {
				// Trigger the OnSubmitted callback
				fyne.DoAndWait(func() {
					entry.OnSubmitted(entry.Text)
				})
				return Response{
					ID:      msg.ID,
					Success: true,
				}
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
			return Response{
				ID:      msg.ID,
				Success: true,
			}
		}
	}

	// Check if it's a TsyneEntry widget with OnSubmitted callback
	if te, ok := obj.(*TsyneEntry); ok {
		if te.OnSubmitted != nil {
			// Trigger the OnSubmitted callback
			fyne.DoAndWait(func() {
				te.OnSubmitted(te.Text)
			})
			return Response{
				ID:      msg.ID,
				Success: true,
			}
		}
	}

	return Response{
		ID:      msg.ID,
		Success: false,
		Error:   "Widget is not an Entry or has no OnSubmitted callback",
	}
}

func (b *Bridge) handleDragCanvas(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	fromX := toFloat64(msg.Payload["fromX"])
	fromY := toFloat64(msg.Payload["fromY"])
	deltaX := toFloat64(msg.Payload["deltaX"])
	deltaY := toFloat64(msg.Payload["deltaY"])

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

	if b.testMode {
		canvas := win.Canvas()
		pos := fyne.NewPos(float32(fromX), float32(fromY))
		log.Printf("[handleDragCanvas] Calling test.Drag at pos=(%.1f, %.1f), delta=(%.1f, %.1f)", fromX, fromY, deltaX, deltaY)
		test.Drag(canvas, pos, float32(deltaX), float32(deltaY))
		log.Printf("[handleDragCanvas] test.Drag completed")
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Drag is only supported in test mode",
		}
	}
}

func (b *Bridge) handleScrollCanvas(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	deltaX := toFloat64(msg.Payload["deltaX"])
	deltaY := toFloat64(msg.Payload["deltaY"])

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

	if b.testMode {
		canvas := win.Canvas()
		// Scroll at center of canvas
		size := canvas.Size()
		pos := fyne.NewPos(size.Width/2, size.Height/2)
		test.Scroll(canvas, pos, float32(deltaX), float32(deltaY))
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Scroll is only supported in test mode",
		}
	}
}

func (b *Bridge) handleFocusWidget(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	// Check if this is a TappableEntry with a separate entry reference
	entryObj, hasEntry := b.widgets[widgetID+"_entry"]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
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
					return Response{
						ID:      msg.ID,
						Success: true,
					}
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
				return Response{
					ID:      msg.ID,
					Success: true,
				}
			}
		}
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Could not find canvas for widget",
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not focusable",
		}
	}
}

func (b *Bridge) handleFocusNext(msg Message) Response {
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

	if b.testMode {
		canvas := win.Canvas()
		test.FocusNext(canvas)
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "FocusNext is only supported in test mode",
		}
	}
}

func (b *Bridge) handleFocusPrevious(msg Message) Response {
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

	if b.testMode {
		canvas := win.Canvas()
		test.FocusPrevious(canvas)
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "FocusPrevious is only supported in test mode",
		}
	}
}

func (b *Bridge) handleFindWidget(msg Message) Response {
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

	return Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"widgetIds": matches,
		},
	}
}

func (b *Bridge) handleGetWidgetInfo(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, widgetExists := b.widgets[widgetID]
	meta, metaExists := b.widgetMeta[widgetID]
	b.mu.RUnlock()

	if !widgetExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
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
		case *widget.Slider:
			info["type"] = "slider"
			info["value"] = w.Value
			info["min"] = w.Min
			info["max"] = w.Max
		}

		// Check if widget is disabled
		if disableable, ok := obj.(fyne.Disableable); ok {
			info["disabled"] = disableable.Disabled()
		} else {
			info["disabled"] = false
		}
	})

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  info,
	}
}

func (b *Bridge) handleGetAllWidgets(msg Message) Response {
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

			// Add size and position info
			size := wd.obj.Size()
			pos := wd.obj.Position()
			widgetInfo["width"] = size.Width
			widgetInfo["height"] = size.Height
			widgetInfo["x"] = pos.X
			widgetInfo["y"] = pos.Y

			// Add padding info if set
			if wd.meta.PaddingTop != 0 || wd.meta.PaddingRight != 0 ||
				wd.meta.PaddingBottom != 0 || wd.meta.PaddingLeft != 0 {
				widgetInfo["padding"] = map[string]interface{}{
					"top":    wd.meta.PaddingTop,
					"right":  wd.meta.PaddingRight,
					"bottom": wd.meta.PaddingBottom,
					"left":   wd.meta.PaddingLeft,
				}
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

	return Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"widgets": widgets,
		},
	}
}

func (b *Bridge) handleGetParent(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	parentID, exists := b.childToParent[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"parentId": ""}, // No parent found
		}
	}

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"parentId": parentID},
	}
}

func (b *Bridge) handleRegisterCustomId(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	customID := msg.Payload["customId"].(string)

	b.mu.Lock()
	b.customIds[customID] = widgetID
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleRegisterTestId(msg Message) Response {
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

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleDragWidget(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	x := toFloat64(msg.Payload["x"])
	y := toFloat64(msg.Payload["y"])

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	if draggable, ok := obj.(fyne.Draggable); ok {
		// In normal mode, trigger the drag events
		draggable.Dragged(&fyne.DragEvent{
			PointEvent: fyne.PointEvent{
				Position: fyne.NewPos(float32(x), float32(y)),
			},
		})
		draggable.DragEnd()
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not draggable",
		}
	}
}

// handleDumpWidgetTree dumps the widget tree structure with sizes for debugging
func (b *Bridge) handleDumpWidgetTree(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	// Dump the tree
	var sb strings.Builder
	b.dumpWidget(&sb, obj, widgetID, 0)

	fmt.Println("=== WIDGET TREE DUMP ===")
	fmt.Println(sb.String())
	fmt.Println("=== END DUMP ===")

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"tree": sb.String()},
	}
}

func (b *Bridge) dumpWidget(sb *strings.Builder, obj fyne.CanvasObject, id string, depth int) {
	indent := strings.Repeat("  ", depth)
	size := obj.Size()
	minSize := obj.MinSize()
	pos := obj.Position()

	// Get type name
	typeName := fmt.Sprintf("%T", obj)
	// Strip package prefix
	if idx := strings.LastIndex(typeName, "."); idx >= 0 {
		typeName = typeName[idx+1:]
	}

	// Get metadata if available
	b.mu.RLock()
	meta, hasMeta := b.widgetMeta[id]
	b.mu.RUnlock()

	metaStr := ""
	if hasMeta {
		metaStr = fmt.Sprintf(" [%s: %q]", meta.Type, meta.Text)
	}

	sb.WriteString(fmt.Sprintf("%s%s%s pos=(%.0f,%.0f) size=(%.0f,%.0f) minSize=(%.0f,%.0f)\n",
		indent, typeName, metaStr,
		pos.X, pos.Y, size.Width, size.Height, minSize.Width, minSize.Height))

	// Recurse into containers - only *fyne.Container is a pointer type
	if container, ok := obj.(*fyne.Container); ok {
		for i, child := range container.Objects {
			childID := fmt.Sprintf("%s_child%d", id, i)
			b.dumpWidget(sb, child, childID, depth+1)
		}
	}
}

// handleGetWidgetTree returns a structured JSON tree of widget hierarchy
func (b *Bridge) handleGetWidgetTree(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	var tree map[string]interface{}

	fyne.DoAndWait(func() {
		tree = b.buildWidgetTree(obj, widgetID)
	})

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"tree": tree},
	}
}

// handleTypeRune injects a character keystroke to the currently focused widget
// This enables virtual keyboards to type into any focusable text entry
func (b *Bridge) handleTypeRune(msg Message) Response {
	runeStr := msg.Payload["rune"].(string)

	if len(runeStr) == 0 {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Empty rune string",
		}
	}

	r := []rune(runeStr)[0]

	// Find the main window's canvas to get the focused widget
	b.mu.RLock()
	var focused fyne.Focusable
	for _, win := range b.windows {
		if win != nil && win.Canvas() != nil {
			focused = win.Canvas().Focused()
			if focused != nil {
				break
			}
		}
	}
	b.mu.RUnlock()

	if focused == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "No widget is currently focused",
		}
	}

	// Inject the rune to the focused widget
	fyne.DoAndWait(func() {
		focused.TypedRune(r)
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleTypeKey injects a special key event to the currently focused widget
// Supports: BackSpace, Return, Tab, Escape, Delete, Insert, Home, End,
// PageUp, PageDown, Up, Down, Left, Right, F1-F12
func (b *Bridge) handleTypeKey(msg Message) Response {
	keyName := msg.Payload["key"].(string)

	// Map common key names to Fyne KeyName constants
	var fyneKey fyne.KeyName
	switch keyName {
	case "BackSpace", "Backspace":
		fyneKey = fyne.KeyBackspace
	case "Return", "Enter":
		fyneKey = fyne.KeyReturn
	case "Tab":
		fyneKey = fyne.KeyTab
	case "Escape", "Esc":
		fyneKey = fyne.KeyEscape
	case "Delete", "Del":
		fyneKey = fyne.KeyDelete
	case "Insert", "Ins":
		fyneKey = fyne.KeyInsert
	case "Home":
		fyneKey = fyne.KeyHome
	case "End":
		fyneKey = fyne.KeyEnd
	case "PageUp", "PgUp":
		fyneKey = fyne.KeyPageUp
	case "PageDown", "PgDn":
		fyneKey = fyne.KeyPageDown
	case "Up", "ArrowUp":
		fyneKey = fyne.KeyUp
	case "Down", "ArrowDown":
		fyneKey = fyne.KeyDown
	case "Left", "ArrowLeft":
		fyneKey = fyne.KeyLeft
	case "Right", "ArrowRight":
		fyneKey = fyne.KeyRight
	case "F1":
		fyneKey = fyne.KeyF1
	case "F2":
		fyneKey = fyne.KeyF2
	case "F3":
		fyneKey = fyne.KeyF3
	case "F4":
		fyneKey = fyne.KeyF4
	case "F5":
		fyneKey = fyne.KeyF5
	case "F6":
		fyneKey = fyne.KeyF6
	case "F7":
		fyneKey = fyne.KeyF7
	case "F8":
		fyneKey = fyne.KeyF8
	case "F9":
		fyneKey = fyne.KeyF9
	case "F10":
		fyneKey = fyne.KeyF10
	case "F11":
		fyneKey = fyne.KeyF11
	case "F12":
		fyneKey = fyne.KeyF12
	default:
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Unknown key name: %s", keyName),
		}
	}

	// Find the main window's canvas to get the focused widget
	b.mu.RLock()
	var focused fyne.Focusable
	for _, win := range b.windows {
		if win != nil && win.Canvas() != nil {
			focused = win.Canvas().Focused()
			if focused != nil {
				break
			}
		}
	}
	b.mu.RUnlock()

	if focused == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "No widget is currently focused",
		}
	}

	// Inject the key event to the focused widget
	fyne.DoAndWait(func() {
		focused.TypedKey(&fyne.KeyEvent{Name: fyneKey})
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// buildWidgetTree recursively builds a JSON-friendly widget tree
func (b *Bridge) buildWidgetTree(obj fyne.CanvasObject, widgetID string) map[string]interface{} {
	size := obj.Size()
	minSize := obj.MinSize()
	pos := obj.Position()

	// Get type name
	typeName := fmt.Sprintf("%T", obj)
	if idx := strings.LastIndex(typeName, "."); idx >= 0 {
		typeName = typeName[idx+1:]
	}

	// Look up widget ID and custom ID
	actualID := widgetID
	customID := ""
	b.mu.RLock()
	// Try to find actual widget ID by reverse lookup
	for id, widget := range b.widgets {
		if widget == obj {
			actualID = id
			break
		}
	}
	// Look up custom ID
	for cid, wid := range b.customIds {
		if wid == actualID {
			customID = cid
			break
		}
	}
	meta, hasMeta := b.widgetMeta[actualID]
	b.mu.RUnlock()

	node := map[string]interface{}{
		"id":   actualID,
		"type": typeName,
		"x":    pos.X,
		"y":    pos.Y,
		"w":    size.Width,
		"h":    size.Height,
		"minW": minSize.Width,
		"minH": minSize.Height,
	}

	if customID != "" {
		node["customId"] = customID
	}

	if hasMeta {
		node["widgetType"] = meta.Type
		if meta.Text != "" {
			node["text"] = meta.Text
		}
		// Add padding if set
		if meta.PaddingTop != 0 || meta.PaddingRight != 0 ||
			meta.PaddingBottom != 0 || meta.PaddingLeft != 0 {
			node["padding"] = map[string]interface{}{
				"top":    meta.PaddingTop,
				"right":  meta.PaddingRight,
				"bottom": meta.PaddingBottom,
				"left":   meta.PaddingLeft,
			}
		}
	}

	// Recurse into containers
	if container, ok := obj.(*fyne.Container); ok {
		children := make([]map[string]interface{}, 0, len(container.Objects))
		for _, child := range container.Objects {
			childTree := b.buildWidgetTree(child, "")
			children = append(children, childTree)
		}
		node["children"] = children
	}

	return node
}

// handleTapAt simulates a tap at specific coordinates on a window's canvas.
// This goes through Fyne's full event dispatch system.
func (b *Bridge) handleTapAt(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	x := float32(toFloat64(msg.Payload["x"]))
	y := float32(toFloat64(msg.Payload["y"]))

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Window not found: %s", windowID),
		}
	}

	// Get the canvas from the window
	canvas := win.Canvas()
	if canvas == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window has no canvas",
		}
	}

	// Use Fyne's test package to simulate a tap at the position
	// This goes through the full event dispatch system
	pos := fyne.NewPos(x, y)
	log.Printf("[handleTapAt] Calling test.TapCanvas at pos=(%.1f, %.1f)", x, y)
	test.TapCanvas(canvas, pos)
	log.Printf("[handleTapAt] test.TapCanvas completed")

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}
