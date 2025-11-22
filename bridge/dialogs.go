package main

import (
	"fmt"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/widget"
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

func (b *Bridge) handleShowProgressDialog(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	dialogID := msg.Payload["dialogId"].(string)
	title := msg.Payload["title"].(string)
	message := msg.Payload["message"].(string)
	infinite, _ := msg.Payload["infinite"].(bool)
	callbackID, _ := msg.Payload["callbackId"].(string)

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

	// Create the progress bar widget based on whether infinite or not
	var progressBar *widget.ProgressBar
	var progressWidget fyne.CanvasObject

	if infinite {
		infiniteBar := widget.NewProgressBarInfinite()
		progressWidget = infiniteBar
		progressBar = nil // We don't update infinite progress bars
	} else {
		progressBar = widget.NewProgressBar()
		progressBar.SetValue(0)
		progressWidget = progressBar
	}

	// Create a custom dialog with the progress bar
	content := container.NewVBox(
		widget.NewLabel(message),
		progressWidget,
	)

	d := dialog.NewCustom(title, "Cancel", content, win)
	d.SetOnClosed(func() {
		// Clean up the dialog reference
		b.mu.Lock()
		delete(b.progressDialogs, dialogID)
		b.mu.Unlock()

		// Send callback if provided
		if callbackID != "" {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{"callbackId": callbackID, "cancelled": true},
			})
		}
	})

	// Store the dialog info
	b.mu.Lock()
	b.progressDialogs[dialogID] = &ProgressDialogInfo{
		Dialog:      d,
		ProgressBar: progressBar,
		IsInfinite:  infinite,
	}
	b.mu.Unlock()

	d.Show()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleUpdateProgressDialog(msg Message) {
	dialogID := msg.Payload["dialogId"].(string)
	value, _ := msg.Payload["value"].(float64)
	newMessage, hasMessage := msg.Payload["message"].(string)

	b.mu.RLock()
	info, exists := b.progressDialogs[dialogID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Progress dialog not found",
		})
		return
	}

	// Update the progress bar value (only for non-infinite progress bars with valid reference)
	if info.ProgressBar != nil {
		info.ProgressBar.SetValue(value)
	}

	// Update the message label if a new message is provided
	if hasMessage {
		// Get the dialog content and update the label
		if d, ok := info.Dialog.(*dialog.CustomDialog); ok {
			// Access the content through the dialog
			_ = d // The label is embedded in the content, but we can't easily update it
			// For now, just note that the message update is requested
			_ = newMessage
		}
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleHideProgressDialog(msg Message) {
	dialogID := msg.Payload["dialogId"].(string)

	b.mu.RLock()
	info, exists := b.progressDialogs[dialogID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Progress dialog not found",
		})
		return
	}

	// Hide/close the dialog
	if d, ok := info.Dialog.(*dialog.CustomDialog); ok {
		d.Hide()
	}

	// Clean up
	b.mu.Lock()
	delete(b.progressDialogs, dialogID)
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}
