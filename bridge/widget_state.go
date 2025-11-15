package main

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/widget"
)

func (b *Bridge) handleShowWidget(msg Message) {
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

	fyne.DoAndWait(func() {
		obj.Show()
	})

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleHideWidget(msg Message) {
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

	fyne.DoAndWait(func() {
		obj.Hide()
	})

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleEnableWidget(msg Message) {
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
			fyne.DoAndWait(func() {
				entry.Enable()
			})
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
			})
			return
		}
	}

	// Try to enable the widget directly
	if disableable, ok := obj.(fyne.Disableable); ok {
		fyne.DoAndWait(func() {
			disableable.Enable()
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget does not support enabling",
		})
	}
}

func (b *Bridge) handleDisableWidget(msg Message) {
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
			fyne.DoAndWait(func() {
				entry.Disable()
			})
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
			})
			return
		}
	}

	// Try to disable the widget directly
	if disableable, ok := obj.(fyne.Disableable); ok {
		fyne.DoAndWait(func() {
			disableable.Disable()
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget does not support disabling",
		})
	}
}

func (b *Bridge) handleIsEnabled(msg Message) {
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
			enabled := !entry.Disabled()
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
				Result: map[string]interface{}{
					"enabled": enabled,
				},
			})
			return
		}
	}

	// Try to check if the widget is enabled
	if disableable, ok := obj.(fyne.Disableable); ok {
		enabled := !disableable.Disabled()
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
			Result: map[string]interface{}{
				"enabled": enabled,
			},
		})
	} else {
		// Widget doesn't implement Disableable, so it's always "enabled"
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
			Result: map[string]interface{}{
				"enabled": true,
			},
		})
	}
}
