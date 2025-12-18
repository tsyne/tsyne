package main

import (
	"fmt"
	"image/color"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/widget"
)

// ============================================================================
// Input Widgets: Button, Entry, MultiLineEntry, PasswordEntry, Checkbox,
// Select, SelectEntry, Slider, RadioGroup, CheckGroup, DateEntry
// ============================================================================

func (b *Bridge) handleCreateButton(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	text := msg.Payload["text"].(string)
	callbackID, hasCallback := msg.Payload["callbackId"].(string)

	// Create button with a callback that looks up the callback ID from the map at click time
	// This allows callbacks to be set/updated after button creation via setWidgetCallback
	btn := widget.NewButton(text, func() {
		b.mu.RLock()
		storedCallbackID, hasStoredCallback := b.callbacks[widgetID]
		b.mu.RUnlock()

		if hasStoredCallback {
			b.sendEvent(Event{
				Type:     "callback",
				WidgetID: widgetID,
				Data:     map[string]interface{}{"callbackId": storedCallbackID},
			})
		}
	})

	// Set button importance if provided
	if importance, ok := msg.Payload["importance"].(string); ok {
		switch importance {
		case "low":
			btn.Importance = widget.LowImportance
		case "medium":
			btn.Importance = widget.MediumImportance
		case "high":
			btn.Importance = widget.HighImportance
		case "warning":
			btn.Importance = widget.WarningImportance
		case "success":
			btn.Importance = widget.SuccessImportance
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = btn
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "button", Text: text}
	if hasCallback {
		b.callbacks[widgetID] = callbackID
	}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleCreateEntry(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	placeholder, _ := msg.Payload["placeholder"].(string)
	onFocusCallbackID, _ := msg.Payload["onFocusCallbackId"].(string)

	// ALWAYS use TsyneEntry so we get global textInputFocus events
	// This enables PhoneTop to show/hide the virtual keyboard for any Entry
	tsyneEntry := NewTsyneEntry(b, widgetID)
	if onFocusCallbackID != "" {
		tsyneEntry.SetOnFocusCallbackId(onFocusCallbackID)
	}
	tsyneEntry.SetPlaceHolder(placeholder)
	entry := &tsyneEntry.Entry

	// Set onSubmit callback if provided (triggered on Enter key)
	if callbackID, ok := msg.Payload["callbackId"].(string); ok {
		entry.OnSubmitted = func(text string) {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": callbackID,
					"text":       text,
				},
			})
		}
	}

	// Set onChange callback if provided (triggered on every text change)
	if onChangeCallbackID, ok := msg.Payload["onChangeCallbackId"].(string); ok {
		entry.OnChanged = func(text string) {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": onChangeCallbackID,
					"text":       text,
				},
			})
		}
	}

	// Set onCursorChanged callback if provided (triggered on cursor position change)
	if onCursorChangedCallbackID, ok := msg.Payload["onCursorChangedCallbackId"].(string); ok {
		entry.OnCursorChanged = func() {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": onCursorChangedCallbackID,
				},
			})
		}
	}

	// Set minimum width if provided
	// tsyneEntry is always set (embeds Entry)
	var widgetToStore fyne.CanvasObject = tsyneEntry
	var needsEntryRef bool = false

	if minWidth, ok := msg.Payload["minWidth"].(float64); ok && minWidth > 0 {
		// Create a sized container with the entry
		sizedEntry := canvas.NewRectangle(color.Transparent)
		sizedEntry.SetMinSize(fyne.NewSize(float32(minWidth), entry.MinSize().Height))
		widgetToStore = container.NewMax(sizedEntry, tsyneEntry)
		needsEntryRef = true // Entry is now wrapped, so we need a separate reference
	}

	// If double-click callback is provided, wrap in a double-tappable container
	if doubleClickCallbackID, ok := msg.Payload["doubleClickCallbackId"].(string); ok {
		callback := func() {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": doubleClickCallbackID,
				},
			})
		}

		// Wrap whatever we have so far (entry or sized container) in double-tappable container
		widgetToStore = NewDoubleTappableContainer(widgetToStore, callback)
		needsEntryRef = true // We need entry reference for operations
	}

	// Store the actual entry widget separately if it's wrapped
	if needsEntryRef {
		b.mu.Lock()
		b.widgets[widgetID+"_entry"] = entry
		b.mu.Unlock()
	}

	b.mu.Lock()
	b.widgets[widgetID] = widgetToStore
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "entry", Text: "", Placeholder: placeholder}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleCreateMultiLineEntry(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	placeholder, _ := msg.Payload["placeholder"].(string)

	entry := widget.NewMultiLineEntry()
	entry.SetPlaceHolder(placeholder)

	// Set wrapping mode (default to word wrap)
	if wrapping, ok := msg.Payload["wrapping"].(string); ok {
		switch wrapping {
		case "off":
			entry.Wrapping = fyne.TextWrapOff
		case "word":
			entry.Wrapping = fyne.TextWrapWord
		case "break":
			entry.Wrapping = fyne.TextWrapBreak
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = entry
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "multilineentry", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleCreatePasswordEntry(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	placeholder, _ := msg.Payload["placeholder"].(string)

	entry := widget.NewPasswordEntry()
	entry.SetPlaceHolder(placeholder)

	// Set onSubmit callback if provided (triggered on Enter key)
	if callbackID, ok := msg.Payload["callbackId"].(string); ok {
		entry.OnSubmitted = func(text string) {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": callbackID,
					"text":       text,
				},
			})
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = entry
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "passwordentry", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleCreateCheckbox(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	text := msg.Payload["text"].(string)
	callbackID, hasCallback := msg.Payload["callbackId"].(string)

	check := widget.NewCheck(text, func(checked bool) {
		if hasCallback {
			b.sendEvent(Event{
				Type:     "callback",
				WidgetID: widgetID,
				Data:     map[string]interface{}{"callbackId": callbackID, "checked": checked},
			})
		}
	})

	// Note: Check widget does not support OnFocusGained/OnFocusLost in Fyne API
	// Focus callbacks are not available for checkbox widgets

	b.mu.Lock()
	b.widgets[widgetID] = check
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "checkbox", Text: text}
	if hasCallback {
		b.callbacks[widgetID] = callbackID
	}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleCreateSelect(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	optionsInterface, _ := msg.Payload["options"].([]interface{})
	callbackID, hasCallback := msg.Payload["callbackId"].(string)

	// Convert []interface{} to []string
	options := make([]string, len(optionsInterface))
	for i, opt := range optionsInterface {
		options[i] = opt.(string)
	}

	sel := widget.NewSelect(options, func(selected string) {
		if hasCallback {
			b.sendEvent(Event{
				Type:     "callback",
				WidgetID: widgetID,
				Data:     map[string]interface{}{"callbackId": callbackID, "selected": selected},
			})
		}
	})

	// Note: Select widget does not support OnFocusGained/OnFocusLost in Fyne API
	// Focus callbacks are not available for select widgets

	b.mu.Lock()
	b.widgets[widgetID] = sel
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "select", Text: ""}
	if hasCallback {
		b.callbacks[widgetID] = callbackID
	}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleCreateSelectEntry(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	optionsInterface, _ := msg.Payload["options"].([]interface{})
	placeholder, _ := msg.Payload["placeholder"].(string)
	onChangedCallbackID, hasOnChanged := msg.Payload["onChangedCallbackId"].(string)
	onSubmittedCallbackID, hasOnSubmitted := msg.Payload["onSubmittedCallbackId"].(string)
	onSelectedCallbackID, hasOnSelected := msg.Payload["onSelectedCallbackId"].(string)

	// Convert []interface{} to []string
	options := make([]string, len(optionsInterface))
	for i, opt := range optionsInterface {
		options[i] = opt.(string)
	}

	selectEntry := widget.NewSelectEntry(options)
	selectEntry.SetPlaceHolder(placeholder)

	if hasOnChanged {
		selectEntry.OnChanged = func(text string) {
			b.sendEvent(Event{
				Type:     "callback",
				WidgetID: widgetID,
				Data:     map[string]interface{}{"callbackId": onChangedCallbackID, "text": text},
			})
		}
	}

	if hasOnSubmitted {
		selectEntry.OnSubmitted = func(text string) {
			b.sendEvent(Event{
				Type:     "callback",
				WidgetID: widgetID,
				Data:     map[string]interface{}{"callbackId": onSubmittedCallbackID, "text": text},
			})
		}
	}

	// OnSelected is triggered when user selects from dropdown
	if hasOnSelected {
		// SelectEntry doesn't have direct OnSelected, but OnChanged fires for dropdown selections too
		// We track this by wrapping OnChanged to detect dropdown selections
		originalOnChanged := selectEntry.OnChanged
		selectEntry.OnChanged = func(text string) {
			// Check if the text matches one of the options (indicates selection)
			for _, opt := range options {
				if opt == text {
					b.sendEvent(Event{
						Type:     "callback",
						WidgetID: widgetID,
						Data:     map[string]interface{}{"callbackId": onSelectedCallbackID, "selected": text},
					})
					break
				}
			}
			// Still fire the original OnChanged if it exists
			if originalOnChanged != nil {
				originalOnChanged(text)
			}
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = selectEntry
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "selectentry", Text: "", Placeholder: placeholder}
	if hasOnChanged {
		b.callbacks[widgetID] = onChangedCallbackID
	}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleCreateSlider(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	min := msg.Payload["min"].(float64)
	max := msg.Payload["max"].(float64)
	callbackID, hasCallback := msg.Payload["callbackId"].(string)

	slider := widget.NewSlider(min, max)

	// Set initial value if provided
	if initialValue, ok := msg.Payload["value"].(float64); ok {
		slider.Value = initialValue
	}

	if hasCallback {
		slider.OnChanged = func(value float64) {
			b.sendEvent(Event{
				Type:     "callback",
				WidgetID: widgetID,
				Data:     map[string]interface{}{"callbackId": callbackID, "value": value},
			})
		}
	}

	// Note: Slider widget does not support OnFocusGained/OnFocusLost in Fyne API
	// Focus callbacks are not available for slider widgets

	b.mu.Lock()
	b.widgets[widgetID] = slider
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "slider", Text: ""}
	if hasCallback {
		b.callbacks[widgetID] = callbackID
	}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleCreateRadioGroup(msg Message) Response {
	id := msg.Payload["id"].(string)
	optionsInterface := msg.Payload["options"].([]interface{})

	// Convert []interface{} to []string
	options := make([]string, len(optionsInterface))
	for i, v := range optionsInterface {
		options[i] = v.(string)
	}

	var callbackID string
	hasCallback := false
	if cid, ok := msg.Payload["callbackId"].(string); ok {
		callbackID = cid
		hasCallback = true
	}

	// Create radio group with change callback
	radio := widget.NewRadioGroup(options, func(selected string) {
		if hasCallback {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": callbackID,
					"selected":   selected,
				},
			})
		}
	})

	// Set horizontal property if provided
	if horizontal, ok := msg.Payload["horizontal"].(bool); ok {
		radio.Horizontal = horizontal
	}

	// Set initial selection if provided
	if initialSelected, ok := msg.Payload["selected"].(string); ok {
		radio.Selected = initialSelected
	}

	b.mu.Lock()
	b.widgets[id] = radio
	b.widgetMeta[id] = WidgetMetadata{
		Type: "radiogroup",
		Text: "", // Radio groups don't have a single text value
	}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleCreateCheckGroup(msg Message) Response {
	id := msg.Payload["id"].(string)
	optionsInterface := msg.Payload["options"].([]interface{})

	// Convert []interface{} to []string
	options := make([]string, len(optionsInterface))
	for i, v := range optionsInterface {
		options[i] = v.(string)
	}

	var callbackID string
	hasCallback := false
	if cid, ok := msg.Payload["callbackId"].(string); ok {
		callbackID = cid
		hasCallback = true
	}

	// Create check group with change callback
	checkGroup := widget.NewCheckGroup(options, func(selected []string) {
		if hasCallback {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": callbackID,
					"selected":   selected,
				},
			})
		}
	})

	// Set initial selection if provided
	if initialSelected, ok := msg.Payload["selected"].([]interface{}); ok {
		selectedStrings := make([]string, len(initialSelected))
		for i, v := range initialSelected {
			selectedStrings[i] = v.(string)
		}
		checkGroup.Selected = selectedStrings
	}

	b.mu.Lock()
	b.widgets[id] = checkGroup
	b.widgetMeta[id] = WidgetMetadata{
		Type: "checkgroup",
		Text: "", // Check groups don't have a single text value
	}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleCreateDateEntry(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	callbackID, hasCallback := msg.Payload["callbackId"].(string)

	dateEntry := widget.NewDateEntry()

	// Set OnChanged callback if provided
	if hasCallback {
		dateEntry.OnChanged = func(t *time.Time) {
			var dateStr string
			if t != nil {
				dateStr = t.Format("2006-01-02")
			}
			b.sendEvent(Event{
				Type:     "callback",
				WidgetID: widgetID,
				Data: map[string]interface{}{
					"callbackId": callbackID,
					"date":       dateStr,
				},
			})
		}
	}

	// Set initial date if provided (format: "2006-01-02")
	if initialDate, ok := msg.Payload["date"].(string); ok && initialDate != "" {
		if t, err := time.Parse("2006-01-02", initialDate); err == nil {
			dateEntry.SetDate(&t)
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = dateEntry
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "dateentry", Text: ""}
	if hasCallback {
		b.callbacks[widgetID] = callbackID
	}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleSetDate(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	dateStr := msg.Payload["date"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	dateEntry, ok := w.(*widget.DateEntry)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a DateEntry",
		}
	}

	if dateStr == "" {
		dateEntry.SetDate(nil)
	} else {
		if t, err := time.Parse("2006-01-02", dateStr); err == nil {
			dateEntry.SetDate(&t)
		} else {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Invalid date format: %v", err),
			}
		}
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleGetDate(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	dateEntry, ok := w.(*widget.DateEntry)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a DateEntry",
		}
	}

	var dateStr string
	if dateEntry.Date != nil {
		dateStr = dateEntry.Date.Format("2006-01-02")
	}

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"date": dateStr},
	}
}
