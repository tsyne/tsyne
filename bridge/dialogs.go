package main

import (
	"fmt"
	"image/color"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/widget"
)

func (b *Bridge) handleShowInfo(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	title := msg.Payload["title"].(string)
	message := msg.Payload["message"].(string)

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

	dialog.ShowInformation(title, message, win)

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleShowError(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	_ = msg.Payload["title"].(string) // title is not used by ShowError, but keep for API compatibility
	message := msg.Payload["message"].(string)

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

	dialog.ShowError(fmt.Errorf("%s", message), win)

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleShowConfirm(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	title := msg.Payload["title"].(string)
	message := msg.Payload["message"].(string)
	callbackID := msg.Payload["callbackId"].(string)

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

	dialog.ShowConfirm(title, message, func(confirmed bool) {
		b.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{"callbackId": callbackID, "confirmed": confirmed},
		})
	}, win)

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleShowFileOpen(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	callbackID := msg.Payload["callbackId"].(string)

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

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleShowFileSave(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	callbackID := msg.Payload["callbackId"].(string)
	fileName, _ := msg.Payload["fileName"].(string)

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

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleShowFolderOpen(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	callbackID := msg.Payload["callbackId"].(string)

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

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleShowForm(msg Message) Response {
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
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
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

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleShowCustom(msg Message) Response {
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
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	if !contentExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Content widget not found",
		}
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

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleShowCustomConfirm(msg Message) Response {
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
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	if !contentExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Content widget not found",
		}
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

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleShowProgressDialog(msg Message) Response {
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
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
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

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleUpdateProgressDialog(msg Message) Response {
	dialogID := msg.Payload["dialogId"].(string)
	value, _ := msg.Payload["value"].(float64)
	newMessage, hasMessage := msg.Payload["message"].(string)

	b.mu.RLock()
	info, exists := b.progressDialogs[dialogID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Progress dialog not found",
		}
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

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleHideProgressDialog(msg Message) Response {
	dialogID := msg.Payload["dialogId"].(string)

	b.mu.RLock()
	info, exists := b.progressDialogs[dialogID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Progress dialog not found",
		}
	}

	// Hide/close the dialog
	if d, ok := info.Dialog.(*dialog.CustomDialog); ok {
		d.Hide()
	}

	// Clean up
	b.mu.Lock()
	delete(b.progressDialogs, dialogID)
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleShowColorPicker(msg Message) Response {
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
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
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

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleShowEntryDialog(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	title := msg.Payload["title"].(string)
	message := msg.Payload["message"].(string)
	callbackID := msg.Payload["callbackId"].(string)

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

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleShowCustomWithoutButtons(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	dialogID := msg.Payload["dialogId"].(string)
	title := msg.Payload["title"].(string)
	contentID := msg.Payload["contentId"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	content, contentExists := b.widgets[contentID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	if !contentExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Content widget not found",
		}
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

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleHideCustomDialog(msg Message) Response {
	dialogID := msg.Payload["dialogId"].(string)

	b.mu.RLock()
	d, exists := b.customDialogs[dialogID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Dialog not found",
		}
	}

	if customDialog, ok := d.(*dialog.CustomDialog); ok {
		customDialog.Hide()
	}

	// Clean up
	b.mu.Lock()
	delete(b.customDialogs, dialogID)
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleGetActiveDialogs returns information about dialogs currently shown on the canvas overlays
func (b *Bridge) handleGetActiveDialogs(msg Message) Response {
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

	// Get all overlays from the canvas
	overlays := win.Canvas().Overlays().List()
	dialogs := make([]map[string]interface{}, 0)

	for _, overlay := range overlays {
		dialogInfo := b.extractDialogInfo(overlay)
		if dialogInfo != nil {
			dialogs = append(dialogs, dialogInfo)
		}
	}

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"dialogs": dialogs},
	}
}

// extractDialogInfo tries to extract title and message from a dialog overlay
func (b *Bridge) extractDialogInfo(obj fyne.CanvasObject) map[string]interface{} {
	// Collect all text from labels in the overlay
	labels := b.findAllLabels(obj)

	if len(labels) == 0 {
		return nil
	}

	info := map[string]interface{}{
		"texts": labels,
	}

	// Check if any label is "Error" to determine dialog type
	isError := false
	for _, label := range labels {
		if label == "Error" {
			isError = true
			break
		}
	}

	if isError {
		info["type"] = "error"
		info["title"] = "Error"
		// Find the non-"Error" label as the message
		for _, label := range labels {
			if label != "Error" {
				info["message"] = label
				break
			}
		}
	} else {
		// For info dialogs, first label is title, second is message
		info["type"] = "info"
		if len(labels) >= 1 {
			info["title"] = labels[0]
		}
		if len(labels) >= 2 {
			info["message"] = labels[1]
		}
	}

	return info
}

// findAllLabels recursively finds all label texts in a canvas object tree
func (b *Bridge) findAllLabels(obj fyne.CanvasObject) []string {
	var labels []string

	switch w := obj.(type) {
	case *widget.Label:
		if w.Text != "" {
			labels = append(labels, w.Text)
		}
	case *widget.RichText:
		// RichText is used in some dialogs
		text := ""
		for _, seg := range w.Segments {
			if textSeg, ok := seg.(*widget.TextSegment); ok {
				text += textSeg.Text
			}
		}
		if text != "" {
			labels = append(labels, text)
		}
	case *widget.PopUp:
		// PopUp has a Content field that contains the actual dialog content
		if w.Content != nil {
			labels = append(labels, b.findAllLabels(w.Content)...)
		}
	case *fyne.Container:
		for _, child := range w.Objects {
			labels = append(labels, b.findAllLabels(child)...)
		}
	case fyne.Widget:
		// Try to get renderer and iterate children
		// This handles custom container widgets
		if container, ok := obj.(interface{ Objects() []fyne.CanvasObject }); ok {
			for _, child := range container.Objects() {
				labels = append(labels, b.findAllLabels(child)...)
			}
		}
	}

	return labels
}

// handleDismissActiveDialog dismisses the top-most dialog overlay
func (b *Bridge) handleDismissActiveDialog(msg Message) Response {
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

	// Get the top overlay
	topOverlay := win.Canvas().Overlays().Top()
	if topOverlay == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "No active dialog",
		}
	}

	// Try to find and tap a dismiss/OK button in the overlay
	dismissed := b.tapDialogButton(topOverlay, []string{"OK", "Close", "Dismiss", "Cancel"})

	if !dismissed {
		// Fallback: remove the overlay directly
		win.Canvas().Overlays().Remove(topOverlay)
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// tapDialogButton finds and taps a button with one of the given labels
func (b *Bridge) tapDialogButton(obj fyne.CanvasObject, buttonLabels []string) bool {
	switch w := obj.(type) {
	case *widget.Button:
		for _, label := range buttonLabels {
			if w.Text == label {
				w.OnTapped()
				return true
			}
		}
	case *widget.PopUp:
		// PopUp has a Content field
		if w.Content != nil {
			return b.tapDialogButton(w.Content, buttonLabels)
		}
	case *fyne.Container:
		for _, child := range w.Objects {
			if b.tapDialogButton(child, buttonLabels) {
				return true
			}
		}
	case fyne.Widget:
		if container, ok := obj.(interface{ Objects() []fyne.CanvasObject }); ok {
			for _, child := range container.Objects() {
				if b.tapDialogButton(child, buttonLabels) {
					return true
				}
			}
		}
	}
	return false
}
