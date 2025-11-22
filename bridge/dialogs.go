package main

import (
	"fmt"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/dialog"
)

func (b *Bridge) handleShowInfo(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	title := msg.Payload["title"].(string)
	message := msg.Payload["message"].(string)

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

	dialog.ShowInformation(title, message, win)

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleShowError(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	_ = msg.Payload["title"].(string) // title is not used by ShowError, but keep for API compatibility
	message := msg.Payload["message"].(string)

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

	dialog.ShowError(fmt.Errorf("%s", message), win)

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleShowConfirm(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	title := msg.Payload["title"].(string)
	message := msg.Payload["message"].(string)
	callbackID := msg.Payload["callbackId"].(string)

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

	dialog.ShowConfirm(title, message, func(confirmed bool) {
		b.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{"callbackId": callbackID, "confirmed": confirmed},
		})
	}, win)

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleShowFileOpen(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	callbackID := msg.Payload["callbackId"].(string)

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

	dialog.ShowFileOpen(func(reader fyne.URIReadCloser, err error) {
		var filePath string
		if reader != nil {
			filePath = reader.URI().Path()
			reader.Close()
		}

		b.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": callbackID,
				"filePath":   filePath,
				"error":      err != nil,
			},
		})
	}, win)

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleShowFileSave(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	callbackID := msg.Payload["callbackId"].(string)
	fileName, _ := msg.Payload["fileName"].(string)

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

	dialog.ShowFileSave(func(writer fyne.URIWriteCloser, err error) {
		var filePath string
		if writer != nil {
			filePath = writer.URI().Path()
			writer.Close()
		}

		b.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": callbackID,
				"filePath":   filePath,
				"error":      err != nil,
			},
		})
	}, win)

	// Set default filename if provided
	if fileName != "" {
		// Note: Fyne doesn't have a direct API to set default filename in ShowFileSave
		// This would need to be enhanced with NewFileSave and SetFileName
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleShowCustom(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	title := msg.Payload["title"].(string)
	contentID := msg.Payload["contentId"].(string)
	dismissText, _ := msg.Payload["dismissText"].(string)
	callbackID, hasCallback := msg.Payload["callbackId"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	content, contentExists := b.widgets[contentID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	if !contentExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Content widget not found",
		})
		return
	}

	// Default dismiss text
	if dismissText == "" {
		dismissText = "Close"
	}

	// Create the custom dialog
	customDialog := dialog.NewCustom(title, dismissText, content, win)

	// Set callback for when dialog is closed
	if hasCallback {
		customDialog.SetOnClosed(func() {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{"callbackId": callbackID, "closed": true},
			})
		})
	}

	customDialog.Show()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleShowCustomConfirm(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	title := msg.Payload["title"].(string)
	contentID := msg.Payload["contentId"].(string)
	confirmText, _ := msg.Payload["confirmText"].(string)
	dismissText, _ := msg.Payload["dismissText"].(string)
	callbackID := msg.Payload["callbackId"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	content, contentExists := b.widgets[contentID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	if !contentExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Content widget not found",
		})
		return
	}

	// Default button texts
	if confirmText == "" {
		confirmText = "OK"
	}
	if dismissText == "" {
		dismissText = "Cancel"
	}

	// Create the custom confirm dialog
	customDialog := dialog.NewCustomConfirm(title, confirmText, dismissText, content, func(confirmed bool) {
		b.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{"callbackId": callbackID, "confirmed": confirmed},
		})
	}, win)

	customDialog.Show()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}
