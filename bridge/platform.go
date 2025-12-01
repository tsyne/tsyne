package main

import (
	"log"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/driver/desktop"
)

// handleSetSystemTray sets up a system tray icon with menu
func (b *Bridge) handleSetSystemTray(msg Message) Response {
	// Check if we're on a desktop platform
	if desk, ok := b.app.(desktop.App); ok {
		// Create menu items
		var menuItems []*fyne.MenuItem

		if itemsInterface, ok := msg.Payload["menuItems"].([]interface{}); ok {
			for _, itemInterface := range itemsInterface {
				itemData := itemInterface.(map[string]interface{})
				label := itemData["label"].(string)

				// Check for separator
				if isSep, ok := itemData["isSeparator"].(bool); ok && isSep {
					menuItems = append(menuItems, fyne.NewMenuItemSeparator())
					continue
				}

				// Create menu item with callback
				if callbackID, ok := itemData["callbackId"].(string); ok {
					capturedCallbackID := callbackID
					menuItem := fyne.NewMenuItem(label, func() {
						b.sendEvent(Event{
							Type: "callback",
							Data: map[string]interface{}{
								"callbackId": capturedCallbackID,
							},
						})
					})
					menuItems = append(menuItems, menuItem)
				}
			}
		}

		// Create the menu
		menu := fyne.NewMenu("", menuItems...)

		// Set up the system tray
		fyne.DoAndWait(func() {
			desk.SetSystemTrayMenu(menu)

			// Set tray icon if provided
			if iconPath, ok := msg.Payload["iconPath"].(string); ok && iconPath != "" {
				resource, err := fyne.LoadResourceFromPath(iconPath)
				if err == nil {
					desk.SetSystemTrayIcon(resource)
				} else {
					log.Printf("Failed to load tray icon: %v", err)
				}
			}
		})

		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "System tray not supported on this platform",
		}
	}
}

// handleSendNotification sends a desktop notification
func (b *Bridge) handleSendNotification(msg Message) Response {
	title := msg.Payload["title"].(string)
	content := msg.Payload["content"].(string)

	notification := fyne.NewNotification(title, content)

	fyne.DoAndWait(func() {
		b.app.SendNotification(notification)
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleClipboardGet retrieves text from the clipboard
func (b *Bridge) handleClipboardGet(msg Message) Response {
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

	var content string
	fyne.DoAndWait(func() {
		content = win.Clipboard().Content()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"content": content,
		},
	}
}

// handleClipboardSet sets text to the clipboard
func (b *Bridge) handleClipboardSet(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	content := msg.Payload["content"].(string)

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
		win.Clipboard().SetContent(content)
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handlePreferencesGet retrieves a preference value
func (b *Bridge) handlePreferencesGet(msg Message) Response {
	key := msg.Payload["key"].(string)

	// Get the default value type hint
	defaultType := "string"
	if dt, ok := msg.Payload["type"].(string); ok {
		defaultType = dt
	}

	prefs := b.app.Preferences()

	var value interface{}
	switch defaultType {
	case "string":
		defaultValue := ""
		if dv, ok := msg.Payload["default"].(string); ok {
			defaultValue = dv
		}
		value = prefs.StringWithFallback(key, defaultValue)
	case "int":
		defaultValue := 0
		if dv, ok := msg.Payload["default"].(float64); ok {
			defaultValue = int(dv)
		}
		value = prefs.IntWithFallback(key, defaultValue)
	case "float":
		defaultValue := 0.0
		if dv, ok := msg.Payload["default"].(float64); ok {
			defaultValue = dv
		}
		value = prefs.FloatWithFallback(key, defaultValue)
	case "bool":
		defaultValue := false
		if dv, ok := msg.Payload["default"].(bool); ok {
			defaultValue = dv
		}
		value = prefs.BoolWithFallback(key, defaultValue)
	default:
		value = prefs.String(key)
	}

	return Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"value": value,
		},
	}
}

// handlePreferencesSet stores a preference value
func (b *Bridge) handlePreferencesSet(msg Message) Response {
	key := msg.Payload["key"].(string)
	value := msg.Payload["value"]

	prefs := b.app.Preferences()

	switch v := value.(type) {
	case string:
		prefs.SetString(key, v)
	case float64:
		// Check if it's actually an int
		if v == float64(int(v)) {
			prefs.SetInt(key, int(v))
		} else {
			prefs.SetFloat(key, v)
		}
	case bool:
		prefs.SetBool(key, v)
	default:
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Unsupported preference value type",
		}
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handlePreferencesRemove removes a preference
func (b *Bridge) handlePreferencesRemove(msg Message) Response {
	key := msg.Payload["key"].(string)

	prefs := b.app.Preferences()
	prefs.RemoveValue(key)

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleSetDraggable makes a widget draggable
func (b *Bridge) handleSetDraggable(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	dragData := ""
	if dd, ok := msg.Payload["dragData"].(string); ok {
		dragData = dd
	}

	b.mu.Lock()
	obj, exists := b.widgets[widgetID]
	if !exists {
		b.mu.Unlock()
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	// Get callbacks if provided
	onDragStartCallbackID := ""
	onDragEndCallbackID := ""
	if cb, ok := msg.Payload["onDragStartCallbackId"].(string); ok {
		onDragStartCallbackID = cb
	}
	if cb, ok := msg.Payload["onDragEndCallbackId"].(string); ok {
		onDragEndCallbackID = cb
	}

	// Wrap the widget in a draggable container
	draggable := NewDraggableWidget(obj, dragData, b, widgetID, onDragStartCallbackID, onDragEndCallbackID)
	b.widgets[widgetID] = draggable
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleSetDroppable makes a widget a drop target
func (b *Bridge) handleSetDroppable(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.Lock()
	obj, exists := b.widgets[widgetID]
	if !exists {
		b.mu.Unlock()
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	// Get callbacks if provided
	onDropCallbackID := ""
	onDragEnterCallbackID := ""
	onDragLeaveCallbackID := ""
	if cb, ok := msg.Payload["onDropCallbackId"].(string); ok {
		onDropCallbackID = cb
	}
	if cb, ok := msg.Payload["onDragEnterCallbackId"].(string); ok {
		onDragEnterCallbackID = cb
	}
	if cb, ok := msg.Payload["onDragLeaveCallbackId"].(string); ok {
		onDragLeaveCallbackID = cb
	}

	// Wrap the widget in a droppable container
	droppable := NewDroppableWidget(obj, b, widgetID, onDropCallbackID, onDragEnterCallbackID, onDragLeaveCallbackID)
	b.widgets[widgetID] = droppable
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}
