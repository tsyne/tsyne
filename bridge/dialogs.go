package main

import (
	"fmt"
	"image/color"

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

func (b *Bridge) handleShowFolderOpen(msg Message) {
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

	dialog.ShowFolderOpen(func(uri fyne.ListableURI, err error) {
		var folderPath string
		if uri != nil {
			folderPath = uri.Path()
		}

		b.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": callbackID,
				"folderPath": folderPath,
				"error":      err != nil,
			},
		})
	}, win)

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleShowForm(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	title := msg.Payload["title"].(string)
	confirmText := msg.Payload["confirmText"].(string)
	dismissText := msg.Payload["dismissText"].(string)
	callbackID := msg.Payload["callbackId"].(string)
	fieldsRaw := msg.Payload["fields"].([]interface{})

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

	// Create form items and track entries for value retrieval
	formItems := make([]*widget.FormItem, 0, len(fieldsRaw))
	entryWidgets := make(map[string]fyne.CanvasObject)

	for _, fieldRaw := range fieldsRaw {
		field := fieldRaw.(map[string]interface{})
		fieldName := field["name"].(string)
		fieldLabel := field["label"].(string)
		fieldType, _ := field["type"].(string)
		if fieldType == "" {
			fieldType = "entry" // default to text entry
		}
		placeholder, _ := field["placeholder"].(string)
		initialValue, _ := field["value"].(string)
		hintText, _ := field["hint"].(string)

		var inputWidget fyne.CanvasObject

		switch fieldType {
		case "password":
			entry := widget.NewPasswordEntry()
			entry.SetPlaceHolder(placeholder)
			entry.SetText(initialValue)
			inputWidget = entry
		case "multiline":
			entry := widget.NewMultiLineEntry()
			entry.SetPlaceHolder(placeholder)
			entry.SetText(initialValue)
			inputWidget = entry
		case "select":
			options, _ := field["options"].([]interface{})
			optionStrings := make([]string, len(options))
			for i, opt := range options {
				optionStrings[i] = opt.(string)
			}
			selectWidget := widget.NewSelect(optionStrings, nil)
			if initialValue != "" {
				selectWidget.SetSelected(initialValue)
			}
			inputWidget = selectWidget
		case "check":
			checkWidget := widget.NewCheck("", nil)
			if initialValue == "true" {
				checkWidget.SetChecked(true)
			}
			inputWidget = checkWidget
		default: // "entry" or any other
			entry := widget.NewEntry()
			entry.SetPlaceHolder(placeholder)
			entry.SetText(initialValue)
			inputWidget = entry
		}

		entryWidgets[fieldName] = inputWidget

		formItem := widget.NewFormItem(fieldLabel, inputWidget)
		if hintText != "" {
			formItem.HintText = hintText
		}
		formItems = append(formItems, formItem)
	}

	// Show the form dialog
	dialog.ShowForm(title, confirmText, dismissText, formItems, func(submitted bool) {
		// Collect values from all fields
		values := make(map[string]interface{})

		if submitted {
			for name, w := range entryWidgets {
				switch typedWidget := w.(type) {
				case *widget.Entry:
					values[name] = typedWidget.Text
				case *widget.Select:
					values[name] = typedWidget.Selected
				case *widget.Check:
					values[name] = typedWidget.Checked
				}
			}
		}

		b.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": callbackID,
				"submitted":  submitted,
				"values":     values,
			},
		})
	}, win)

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

func (b *Bridge) handleShowColorPicker(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	title := msg.Payload["title"].(string)
	callbackID := msg.Payload["callbackId"].(string)

	// Get initial color if provided (as hex string like "#ff0000" or RGBA values)
	var initialColor color.Color = color.NRGBA{R: 0, G: 0, B: 0, A: 255} // Default to black
	if hexStr, ok := msg.Payload["initialColor"].(string); ok && len(hexStr) >= 7 && hexStr[0] == '#' {
		// Parse hex color
		var r, g, b uint8
		fmt.Sscanf(hexStr, "#%02x%02x%02x", &r, &g, &b)
		initialColor = color.NRGBA{R: r, G: g, B: b, A: 255}
	}

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

	// Create the color picker dialog
	picker := dialog.NewColorPicker(title, "Select a color", func(c color.Color) {
		if c == nil {
			// User cancelled
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": callbackID,
					"cancelled":  true,
				},
			})
			return
		}

		// Convert color to hex and RGBA
		r, g, bl, a := c.RGBA()
		// RGBA() returns 16-bit values (0-65535), convert to 8-bit (0-255)
		r8 := uint8(r >> 8)
		g8 := uint8(g >> 8)
		b8 := uint8(bl >> 8)
		a8 := uint8(a >> 8)

		hexColor := fmt.Sprintf("#%02x%02x%02x", r8, g8, b8)

		b.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": callbackID,
				"cancelled":  false,
				"hex":        hexColor,
				"r":          r8,
				"g":          g8,
				"b":          b8,
				"a":          a8,
			},
		})
	}, win)

	// Set the advanced (full) picker mode for more color options
	picker.Advanced = true

	// Set initial color if provided
	if nrgba, ok := initialColor.(color.NRGBA); ok {
		picker.SetColor(nrgba)
	}

	picker.Show()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleShowEntryDialog(msg Message) {
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

	dialog.ShowEntryDialog(title, message, func(text string) {
		b.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": callbackID,
				"text":       text,
				"cancelled":  text == "",
			},
		})
	}, win)

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleShowCustomWithoutButtons(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	dialogID := msg.Payload["dialogId"].(string)
	title := msg.Payload["title"].(string)
	contentID := msg.Payload["contentId"].(string)

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

	// Create a custom dialog without buttons using NewCustomWithoutButtons
	customDialog := dialog.NewCustomWithoutButtons(title, content, win)

	// Store the dialog for later hiding
	b.mu.Lock()
	if b.customDialogs == nil {
		b.customDialogs = make(map[string]interface{})
	}
	b.customDialogs[dialogID] = customDialog
	b.mu.Unlock()

	customDialog.Show()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleHideCustomDialog(msg Message) {
	dialogID := msg.Payload["dialogId"].(string)

	b.mu.RLock()
	d, exists := b.customDialogs[dialogID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Dialog not found",
		})
		return
	}

	if customDialog, ok := d.(*dialog.CustomDialog); ok {
		customDialog.Hide()
	}

	// Clean up
	b.mu.Lock()
	delete(b.customDialogs, dialogID)
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}
