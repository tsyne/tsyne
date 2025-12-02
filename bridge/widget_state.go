package main

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/widget"
)

func (b *Bridge) handleShowWidget(msg Message) Response {
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

	fyne.DoAndWait(func() {
		obj.Show()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleHideWidget(msg Message) Response {
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

	fyne.DoAndWait(func() {
		obj.Hide()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleEnableWidget(msg Message) Response {
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
			fyne.DoAndWait(func() {
				entry.Enable()
			})
			return Response{
				ID:      msg.ID,
				Success: true,
			}
		}
	}

	// Try to enable the widget directly
	if disableable, ok := obj.(fyne.Disableable); ok {
		fyne.DoAndWait(func() {
			disableable.Enable()
		})
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget does not support enabling",
		}
	}
}

func (b *Bridge) handleDisableWidget(msg Message) Response {
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
			fyne.DoAndWait(func() {
				entry.Disable()
			})
			return Response{
				ID:      msg.ID,
				Success: true,
			}
		}
	}

	// Try to disable the widget directly
	if disableable, ok := obj.(fyne.Disableable); ok {
		fyne.DoAndWait(func() {
			disableable.Disable()
		})
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget does not support disabling",
		}
	}
}

func (b *Bridge) handleIsEnabled(msg Message) Response {
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
			enabled := !entry.Disabled()
			return Response{
				ID:      msg.ID,
				Success: true,
				Result: map[string]interface{}{
					"enabled": enabled,
				},
			}
		}
	}

	// Try to check if the widget is enabled
	if disableable, ok := obj.(fyne.Disableable); ok {
		enabled := !disableable.Disabled()
		return Response{
			ID:      msg.ID,
			Success: true,
			Result: map[string]interface{}{
				"enabled": enabled,
			},
		}
	} else {
		// Widget doesn't implement Disableable, so it's always "enabled"
		return Response{
			ID:      msg.ID,
			Success: true,
			Result: map[string]interface{}{
				"enabled": true,
			},
		}
	}
}
