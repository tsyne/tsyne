package main

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/driver/desktop"
	"fyne.io/fyne/v2/widget"
	xWidget "fyne.io/x/fyne/widget"
)

func (b *Bridge) handleGetText(msg Message) Response {
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

	// If we have a separate entry reference, use that
	actualWidget := obj
	if hasEntry {
		actualWidget = entryObj
	}

	var text string
	switch w := actualWidget.(type) {
	case *widget.Label:
		text = w.Text
	case *LabelWithHover:
		text = w.Text
	case *widget.Entry:
		text = w.Text
	case *TsyneEntry:
		text = w.Text
	case *widget.SelectEntry:
		text = w.Text
	case *xWidget.CompletionEntry:
		text = w.Text
	case *widget.Button:
		text = w.Text
	case *ButtonWithHover:
		text = w.Text
	case *ButtonWithHoverMouse:
		text = w.Text
	case *ButtonWithHoverFocusKey:
		text = w.Text
	case *widget.Check:
		text = w.Text
	default:
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget does not support getText",
		}
	}

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"text": text},
	}
}

// getTextFromObject extracts text from a fyne.CanvasObject.
func (b *Bridge) getTextFromObject(msg Message, obj fyne.CanvasObject) Response {
	switch w := obj.(type) {
	case *widget.Label:
		return Response{ID: msg.ID, Success: true, Result: map[string]interface{}{"text": w.Text}}
	case *LabelWithHover:
		return Response{ID: msg.ID, Success: true, Result: map[string]interface{}{"text": w.Text}}
	case *widget.Entry:
		return Response{ID: msg.ID, Success: true, Result: map[string]interface{}{"text": w.Text}}
	case *TsyneEntry:
		return Response{ID: msg.ID, Success: true, Result: map[string]interface{}{"text": w.Text}}
	case *widget.Button:
		return Response{ID: msg.ID, Success: true, Result: map[string]interface{}{"text": w.Text}}
	case *ButtonWithHover:
		return Response{ID: msg.ID, Success: true, Result: map[string]interface{}{"text": w.Text}}
	case *ButtonWithHoverMouse:
		return Response{ID: msg.ID, Success: true, Result: map[string]interface{}{"text": w.Text}}
	case *ButtonWithHoverFocusKey:
		return Response{ID: msg.ID, Success: true, Result: map[string]interface{}{"text": w.Text}}
	case *widget.Check:
		return Response{ID: msg.ID, Success: true, Result: map[string]interface{}{"text": w.Text}}
	default:
		return Response{ID: msg.ID, Success: false, Error: "Widget does not support getText"}
	}
}

// setTextOnObject sets text on a fyne.CanvasObject.
func setTextOnObject(obj fyne.CanvasObject, text string) {
	switch w := obj.(type) {
	case *widget.Label:
		w.SetText(text)
	case *LabelWithHover:
		w.SetText(text)
	case *widget.Button:
		w.SetText(text)
	case *ButtonWithHover:
		w.SetText(text)
	case *ButtonWithHoverMouse:
		w.SetText(text)
	case *ButtonWithHoverFocusKey:
		w.SetText(text)
	case *widget.Entry:
		w.SetText(text)
	}
}

func (b *Bridge) handleSetText(msg Message) Response {
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

	// If we have a separate entry reference, use that
	actualWidget := obj
	if hasEntry {
		actualWidget = entryObj
	}

	// UI updates must happen on the main thread
	fyne.DoAndWait(func() {
		switch w := actualWidget.(type) {
		case *widget.Label:
			w.SetText(text)
		case *LabelWithHover:
			w.SetText(text)
		case *widget.Entry:
			w.SetText(text)
		case *TsyneEntry:
			w.SetText(text)
		case *widget.SelectEntry:
			w.SetText(text)
		case *xWidget.CompletionEntry:
			w.SetText(text)
		case *widget.Button:
			w.SetText(text)
		case *ButtonWithHover:
			w.SetText(text)
		case *ButtonWithHoverMouse:
			w.SetText(text)
		case *ButtonWithHoverFocusKey:
			w.SetText(text)
		case *TappableWrapper:
			setTextOnObject(w.content, text)
		case *widget.Check:
			w.SetText(text)
		}
		// Mark canvas dirty to trigger repaint
		// Without this, SetText on an already-displayed widget won't visually update
		// until something else (like touch) triggers a repaint
		if canvas := fyne.CurrentApp().Driver().CanvasForObject(actualWidget); canvas != nil {
			if paint, ok := canvas.(interface{ SetDirty() }); ok {
				paint.SetDirty()
			}
		}
	})

	// Check if widget type is supported
	supported := false
	switch actualWidget.(type) {
	case *widget.Label, *LabelWithHover, *widget.Entry, *TsyneEntry, *widget.SelectEntry, *xWidget.CompletionEntry, *widget.Button, *ButtonWithHover, *ButtonWithHoverMouse, *ButtonWithHoverFocusKey, *TappableWrapper, *widget.Check:
		supported = true
	}

	if !supported {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget does not support setText",
		}
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
}

func (b *Bridge) handleSetEntryOnChange(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	callbackID := msg.Payload["callbackId"].(string)

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

	// Handle different entry types
	switch entry := obj.(type) {
	case *widget.Entry:
		entry.OnChanged = func(text string) {
			b.sendEvent(Event{
				Type:     "callback",
				WidgetID: widgetID,
				Data:     map[string]interface{}{"callbackId": callbackID, "text": text},
			})
		}
	case *TsyneEntry:
		entry.OnChanged = func(text string) {
			b.sendEvent(Event{
				Type:     "callback",
				WidgetID: widgetID,
				Data:     map[string]interface{}{"callbackId": callbackID, "text": text},
			})
		}
	default:
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an Entry",
		}
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleGetChecked(msg Message) Response {
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

	if check, ok := obj.(*widget.Check); ok {
		return Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"checked": check.Checked},
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a checkbox",
		}
	}
}

func (b *Bridge) handleSetChecked(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	checked := msg.Payload["checked"].(bool)

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

	if check, ok := obj.(*widget.Check); ok {
		// UI updates must happen on the main thread
		// Temporarily disable OnChanged to prevent infinite loops when setting initial state
		fyne.DoAndWait(func() {
			originalCallback := check.OnChanged
			check.OnChanged = nil
			check.SetChecked(checked)
			check.OnChanged = originalCallback
		})
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a checkbox",
		}
	}
}

func (b *Bridge) handleGetValue(msg Message) Response {
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

	if slider, ok := obj.(*widget.Slider); ok {
		return Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"value": slider.Value},
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a slider",
		}
	}
}

func (b *Bridge) handleSetValue(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	value := toFloat64(msg.Payload["value"])

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

	if slider, ok := obj.(*widget.Slider); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			slider.SetValue(value)
		})
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a slider",
		}
	}
}

func (b *Bridge) handleGetProgress(msg Message) Response {
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

	if pb, ok := obj.(*widget.ProgressBar); ok {
		return Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"value": pb.Value},
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a progressbar",
		}
	}
}

func (b *Bridge) handleSetProgress(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	value := toFloat64(msg.Payload["value"])

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

	if pb, ok := obj.(*widget.ProgressBar); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			pb.SetValue(value)
		})
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a progressbar",
		}
	}
}

func (b *Bridge) handleGetSelected(msg Message) Response {
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

	if sel, ok := obj.(*widget.Select); ok {
		return Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"selected": sel.Selected},
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a select",
		}
	}
}

func (b *Bridge) handleSetSelected(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	selected := msg.Payload["selected"].(string)

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

	if sel, ok := obj.(*widget.Select); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			sel.SetSelected(selected)
		})
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a select",
		}
	}
}

func (b *Bridge) handleSetSelectOptions(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	optionsInterface := msg.Payload["options"].([]interface{})

	// Convert []interface{} to []string
	options := make([]string, len(optionsInterface))
	for i, v := range optionsInterface {
		options[i] = v.(string)
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

	if sel, ok := obj.(*widget.Select); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			sel.Options = options
			sel.Refresh()
		})
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a select",
		}
	}
}

func (b *Bridge) handleSetRadioOptions(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	optionsInterface := msg.Payload["options"].([]interface{})

	// Convert []interface{} to []string
	options := make([]string, len(optionsInterface))
	for i, v := range optionsInterface {
		options[i] = v.(string)
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

	if radio, ok := obj.(*widget.RadioGroup); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			radio.Options = options
			radio.Refresh()
		})
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a radio group",
		}
	}
}

func (b *Bridge) handleGetRadioSelected(msg Message) Response {
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

	if radio, ok := obj.(*widget.RadioGroup); ok {
		return Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"selected": radio.Selected},
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a radio group",
		}
	}
}

func (b *Bridge) handleSetRadioSelected(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	selected := msg.Payload["selected"].(string)

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

	if radio, ok := obj.(*widget.RadioGroup); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			radio.SetSelected(selected)
		})
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a radio group",
		}
	}
}

func (b *Bridge) handleGetCheckGroupSelected(msg Message) Response {
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

	if checkGroup, ok := obj.(*widget.CheckGroup); ok {
		return Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"selected": checkGroup.Selected},
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a check group",
		}
	}
}

func (b *Bridge) handleSetCheckGroupSelected(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	selectedInterface := msg.Payload["selected"].([]interface{})

	// Convert []interface{} to []string
	selected := make([]string, len(selectedInterface))
	for i, v := range selectedInterface {
		selected[i] = v.(string)
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

	if checkGroup, ok := obj.(*widget.CheckGroup); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			checkGroup.SetSelected(selected)
		})
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a check group",
		}
	}
}

func (b *Bridge) handleGetTableData(msg Message) Response {
	id := msg.Payload["id"].(string)

	b.mu.RLock()
	data, exists := b.tableData[id]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Table not found",
		}
	}

	return Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"data": data,
		},
	}
}

func (b *Bridge) handleUpdateTableData(msg Message) Response {
	id := msg.Payload["id"].(string)
	dataInterface := msg.Payload["data"].([]interface{})

	// Convert data
	var data [][]string
	for _, rowInterface := range dataInterface {
		rowData := rowInterface.([]interface{})
		row := make([]string, len(rowData))
		for j, cell := range rowData {
			row[j] = cell.(string)
		}
		data = append(data, row)
	}

	b.mu.Lock()
	b.tableData[id] = data
	obj, exists := b.widgets[id]
	b.mu.Unlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Table not found",
		}
	}

	if table, ok := obj.(*widget.Table); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			table.Refresh()
		})
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a table",
		}
	}
}

func (b *Bridge) handleGetListData(msg Message) Response {
	id := msg.Payload["id"].(string)

	b.mu.RLock()
	data, exists := b.listData[id]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "List not found",
		}
	}

	return Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"data": data,
		},
	}
}

func (b *Bridge) handleUpdateListData(msg Message) Response {
	id := msg.Payload["id"].(string)
	itemsInterface := msg.Payload["items"].([]interface{})

	// Convert items
	items := make([]string, len(itemsInterface))
	for i, item := range itemsInterface {
		items[i] = item.(string)
	}

	b.mu.Lock()
	b.listData[id] = items
	obj, exists := b.widgets[id]
	b.mu.Unlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "List not found",
		}
	}

	if list, ok := obj.(*widget.List); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			list.Refresh()
		})
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a list",
		}
	}
}

func (b *Bridge) handleUnselectAllList(msg Message) Response {
	id := msg.Payload["id"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[id]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "List not found",
		}
	}

	if list, ok := obj.(*widget.List); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			list.UnselectAll()
		})
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a list",
		}
	}
}

func (b *Bridge) handleUpdateImage(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	// Check which type of image source is provided
	imageData, hasImageData := msg.Payload["imageData"].(string)
	path, hasPath := msg.Payload["path"].(string)
	resourceName, hasResource := msg.Payload["resource"].(string)
	svgString, hasSVG := msg.Payload["svg"].(string)
	urlString, hasURL := msg.Payload["url"].(string)

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

	var decodedImg image.Image
	var err error

	// Handle different image source types
	if hasResource && resourceName != "" {
		// Resource-based image
		resourceData, exists := b.getResource(resourceName)
		if !exists {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Resource not found: %s", resourceName),
			}
		}

		decodedImg, _, err = image.Decode(bytes.NewReader(resourceData))
		if err != nil {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to decode resource image: %v", err),
			}
		}
	} else if hasPath && path != "" {
		// File path-based image
		data, err := os.ReadFile(path)
		if err != nil {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to read image file: %v", err),
			}
		}

		decodedImg, _, err = image.Decode(bytes.NewReader(data))
		if err != nil {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to decode image file: %v", err),
			}
		}
	} else if hasSVG && svgString != "" {
		// Raw SVG string - convert to image
		decodedImg, _, err = image.Decode(strings.NewReader(svgString))
		if err != nil {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to decode SVG: %v", err),
			}
		}
	} else if hasURL && urlString != "" {
		// Remote URL - fetch and decode
		resp, err := http.Get(urlString)
		if err != nil {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to fetch URL: %v", err),
			}
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("HTTP error: %d %s", resp.StatusCode, resp.Status),
			}
		}

		data, err := io.ReadAll(resp.Body)
		if err != nil {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to read response body: %v", err),
			}
		}

		decodedImg, _, err = image.Decode(bytes.NewReader(data))
		if err != nil {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to decode image from URL: %v", err),
			}
		}
	} else if hasImageData && imageData != "" {
		// Base64 data URI (backwards compatible)
		var base64Data string
		if strings.HasPrefix(imageData, "data:") {
			// Split on comma to separate header from data
			parts := strings.SplitN(imageData, ",", 2)
			if len(parts) != 2 {
				return Response{
					ID:      msg.ID,
					Success: false,
					Error:   "Invalid data URL format",
				}
			}
			base64Data = parts[1]
		} else {
			// Assume it's already base64 without the data URL prefix
			base64Data = imageData
		}

		// Decode base64
		imgBytes, err := base64.StdEncoding.DecodeString(base64Data)
		if err != nil {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to decode base64: %v", err),
			}
		}

		// Decode image bytes
		decodedImg, _, err = image.Decode(bytes.NewReader(imgBytes))
		if err != nil {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to decode image: %v", err),
			}
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "No image source provided (expected imageData, path, resource, svg, or url)",
		}
	}

	// Find the actual canvas.Image widget
	// It might be wrapped in a ClickableContainer or DraggableContainer
	var imgWidget *canvas.Image

	switch container := obj.(type) {
	case *canvas.Image:
		// Direct image widget
		imgWidget = container
	case *ClickableContainer:
		// Image wrapped in clickable container
		if img, ok := container.content.(*canvas.Image); ok {
			imgWidget = img
		}
	case *DraggableContainer:
		// Image wrapped in draggable container
		if img, ok := container.content.(*canvas.Image); ok {
			imgWidget = img
		}
	}

	if imgWidget == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an image",
		}
	}

	// UI updates must happen on the main thread
	fyne.DoAndWait(func() {
		imgWidget.Image = decodedImg
		// Update MinSize based on the new image dimensions
		// Use a reasonable minimum (200x200) to avoid forcing window to be huge
		// The image will scale based on its FillMode setting
		if decodedImg != nil {
			bounds := decodedImg.Bounds()
			minW := float32(200)
			minH := float32(200)
			// Use actual dimensions if smaller than minimum
			if float32(bounds.Dx()) < minW {
				minW = float32(bounds.Dx())
			}
			if float32(bounds.Dy()) < minH {
				minH = float32(bounds.Dy())
			}
			imgWidget.SetMinSize(fyne.NewSize(minW, minH))
		}
		imgWidget.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleGetToolbarItems(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	toolbarMeta, hasItemsMeta := b.toolbarItems[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	// Verify it's a toolbar
	if _, ok := obj.(*widget.Toolbar); !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a toolbar",
		}
	}

	// Get toolbar items metadata
	var items []string
	if hasItemsMeta {
		items = toolbarMeta.Labels
	}

	return Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"items": items,
		},
	}
}

func (b *Bridge) handleGetContainerObjects(msg Message) Response {
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

	// Verify it's a container
	container, ok := obj.(*fyne.Container)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a container",
		}
	}

	// Get container objects (child widget IDs)
	var childIDs []string
	fyne.DoAndWait(func() {
		for _, childObj := range container.Objects {
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
	})

	return Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"objects": childIDs,
		},
	}
}

func (b *Bridge) handleSetAccessibility(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	widget, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	// Extract accessibility options
	// For now, we store them in metadata for future use
	// Fyne doesn't have direct accessibility properties, but we can prepare for it
	label, _ := msg.Payload["label"].(string)
	description, _ := msg.Payload["description"].(string)
	role, _ := msg.Payload["role"].(string)
	hint, _ := msg.Payload["hint"].(string)

	b.mu.Lock()
	if meta, exists := b.widgetMeta[widgetID]; exists {
		// Store accessibility info in metadata for future use
		meta.CustomData = map[string]interface{}{
			"a11y_label":       label,
			"a11y_description": description,
			"a11y_role":        role,
			"a11y_hint":        hint,
		}
		b.widgetMeta[widgetID] = meta
	}
	b.mu.Unlock()

	// Determine parent widget ID by checking if this widget is in any container
	var parentID string
	b.mu.RLock()
	for potentialParentID, potentialParentWidget := range b.widgets {
		if container, ok := potentialParentWidget.(*fyne.Container); ok {
			for _, childObj := range container.Objects {
				if childObj == widget {
					parentID = potentialParentID
					break
				}
			}
			if parentID != "" {
				break
			}
		}
	}
	b.mu.RUnlock()

	// Send accessibility registration event to TypeScript
	b.sendEvent(Event{
		Type: "accessibilityRegistered",
		Data: map[string]interface{}{
			"widgetId":    widgetID,
			"label":       label,
			"description": description,
			"role":        role,
			"hint":        hint,
			"parentId":    parentID,
		},
	})

	// TODO: When Fyne supports accessibility APIs, apply them here
	// For now, this is a no-op that prevents the error

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleEnableAccessibility(msg Message) Response {
	// Enable accessibility mode globally
	// For now, this is a no-op since Fyne doesn't have global accessibility APIs
	// But we acknowledge the request to prevent errors

	// TODO: When Fyne adds accessibility APIs, enable them here

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleDisableAccessibility(msg Message) Response {
	// Disable accessibility mode globally
	// For now, this is a no-op since Fyne doesn't have global accessibility APIs

	// TODO: When Fyne adds accessibility APIs, disable them here

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleAnnounce handles TTS announce messages
func (b *Bridge) handleAnnounce(msg Message) Response {
	// The text to announce is in the payload
	// For now, we just log it and return success
	// In the future, this could integrate with native platform TTS
	text, _ := msg.Payload["text"].(string)
	if b.testMode {
		log.Printf("[TTS] %s", text)
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleStopSpeech handles stop speech messages
func (b *Bridge) handleStopSpeech(msg Message) Response {
	// Stop any current speech
	// For now, this is a no-op since we're using client-side TTS
	// In the future, this could stop native platform TTS

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleSetPointerEnter handles pointer enter event registration
func (b *Bridge) handleSetPointerEnter(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.Lock()

	// Get the existing widget
	_, exists := b.widgets[widgetID]
	if !exists {
		b.mu.Unlock()
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	// Update metadata to indicate hover is enabled
	widgetMeta, exists := b.widgetMeta[widgetID]
	if !exists {
		widgetMeta = WidgetMetadata{}
	}
	if widgetMeta.CustomData == nil {
		widgetMeta.CustomData = make(map[string]interface{})
	}
	widgetMeta.CustomData["announceOnHover"] = true
	b.widgetMeta[widgetID] = widgetMeta


	// Unlock before sending response
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// ============================================================================
// handleSetWidgetEvents — new bitmask-based event system
// ============================================================================

// getOrCreateDispatcher returns the dispatcher for a widget, creating one if needed.
// Caller must hold b.mu lock.
func (b *Bridge) getOrCreateDispatcher(widgetID string) *EventDispatcher {
	if d, ok := b.dispatchers[widgetID]; ok {
		return d
	}
	d := &EventDispatcher{
		bridge:   b,
		widgetID: widgetID,
	}
	b.dispatchers[widgetID] = d
	return d
}

// handleSetWidgetEvents handles the batched event registration message.
// Creates/updates EventDispatcher with callback IDs from the cbs map.
// If the widget hasn't been upgraded to a concrete event variant yet, does so now.
func (b *Bridge) handleSetWidgetEvents(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	events := uint16(toInt(msg.Payload["events"]))
	cbs, _ := msg.Payload["cbs"].(map[string]interface{})

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

	// Build or update EventDispatcher
	disp := b.getOrCreateDispatcher(widgetID)
	for key, val := range cbs {
		if id, ok := val.(string); ok {
			disp.setCallback(cbKeyToEventKind(key), id)
		}
	}

	// Check if widget needs upgrading to a concrete event variant
	var replacement fyne.CanvasObject
	switch w := obj.(type) {
	case *widget.Button:
		replacement = b.buttonVariant(w, events, disp)
	case *widget.Label:
		replacement = b.labelVariant(w, events, disp)
	}

	if replacement != nil && replacement != obj {
		b.widgets[widgetID] = replacement
		// Replace in parent container
		if parentID, ok := b.childToParent[widgetID]; ok {
			if parentObj, ok := b.widgets[parentID]; ok {
				if cont, ok := parentObj.(*fyne.Container); ok {
					for i, child := range cont.Objects {
						if child == obj {
							cont.Objects[i] = replacement
							break
						}
					}
				}
			}
		}
	}

	b.mu.Unlock()
	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleStimulateEvent fires an event on a widget by calling its real Fyne
// interface methods (MouseIn, FocusGained, KeyDown, etc.), exercising the same
// code path as headed mode. Falls back to direct dispatcher fire for widgets
// without concrete variants.
// Test-mode only — in headed mode, real input events drive callbacks.
func (b *Bridge) handleStimulateEvent(msg Message) Response {
	if !b.testMode {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "stimulateEvent is only available in test mode",
		}
	}

	widgetID := msg.Payload["widgetId"].(string)
	eventStr := msg.Payload["event"].(string)
	kind := cbKeyToEventKind(eventStr)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	disp, hasDisp := b.dispatchers[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found: " + widgetID,
		}
	}

	// Try to call the real widget interface method first — but only on our
	// concrete event variants (ButtonWithHover*, LabelWithHover). Base Fyne
	// widgets like widget.Button implement some interfaces (e.g. Focusable,
	// Hoverable) natively but their methods don't fire our EventDispatcher,
	// so we must skip them and fall through to the dispatcher.
	isVariant := isEventVariant(obj)
	ok := false
	if isVariant {
		switch eventStr {
		case "mouseIn":
			if h, is := obj.(desktop.Hoverable); is {
				h.MouseIn(buildMouseEvent(msg))
				ok = true
			}
		case "mouseOut":
			if h, is := obj.(desktop.Hoverable); is {
				h.MouseOut()
				ok = true
			}
		case "mouseMoved":
			if h, is := obj.(desktop.Hoverable); is {
				h.MouseMoved(buildMouseEvent(msg))
				ok = true
			}
		case "mouseDown":
			if m, is := obj.(desktop.Mouseable); is {
				m.MouseDown(buildMouseEvent(msg))
				ok = true
			}
		case "mouseUp":
			if m, is := obj.(desktop.Mouseable); is {
				m.MouseUp(buildMouseEvent(msg))
				ok = true
			}
		case "focusGained":
			if f, is := obj.(fyne.Focusable); is {
				f.FocusGained()
				ok = true
			}
		case "focusLost":
			if f, is := obj.(fyne.Focusable); is {
				f.FocusLost()
				ok = true
			}
		case "keyDown":
			if k, is := obj.(desktop.Keyable); is {
				k.KeyDown(buildKeyEvent(msg))
				ok = true
			}
		case "keyUp":
			if k, is := obj.(desktop.Keyable); is {
				k.KeyUp(buildKeyEvent(msg))
				ok = true
			}
		case "tap":
			if t, is := obj.(fyne.Tappable); is {
				t.Tapped(buildPointEvent(msg))
				ok = true
			}
		case "doubleTap":
			if dt, is := obj.(fyne.DoubleTappable); is {
				dt.DoubleTapped(buildPointEvent(msg))
				ok = true
			}
		case "secondaryTap":
			if st, is := obj.(fyne.SecondaryTappable); is {
				st.TappedSecondary(buildPointEvent(msg))
				ok = true
			}
		case "dragged":
			if d, is := obj.(fyne.Draggable); is {
				d.Dragged(buildDragEvent(msg))
				ok = true
			}
		case "dragEnd":
			if d, is := obj.(fyne.Draggable); is {
				d.DragEnd()
				ok = true
			}
		case "scrolled":
			if s, is := obj.(fyne.Scrollable); is {
				s.Scrolled(buildScrollEvent(msg))
				ok = true
			}
		}
	}

	if ok {
		return Response{ID: msg.ID, Success: true}
	}

	// Fallback: fire on dispatcher directly (widgets without concrete variants)
	if hasDisp {
		var data map[string]interface{}
		switch kind {
		case EvMouseIn, EvMouseOut, EvMouseMoved:
			data = map[string]interface{}{
				"position": map[string]interface{}{
					"x": toFloat64(msg.Payload["x"]),
					"y": toFloat64(msg.Payload["y"]),
				},
			}
		case EvMouseDown, EvMouseUp:
			data = map[string]interface{}{
				"button": toInt(msg.Payload["button"]),
				"position": map[string]interface{}{
					"x": toFloat64(msg.Payload["x"]),
					"y": toFloat64(msg.Payload["y"]),
				},
			}
		case EvKeyDown, EvKeyUp:
			keyVal, _ := msg.Payload["key"].(string)
			data = map[string]interface{}{
				"key": keyVal,
			}
		case EvFocusGained:
			data = map[string]interface{}{"focused": true}
		case EvFocusLost:
			data = map[string]interface{}{"focused": false}
		case EvDragged:
			data = map[string]interface{}{
				"position": map[string]interface{}{
					"x": toFloat64(msg.Payload["x"]),
					"y": toFloat64(msg.Payload["y"]),
				},
				"dragged": map[string]interface{}{
					"dx": toFloat64(msg.Payload["dx"]),
					"dy": toFloat64(msg.Payload["dy"]),
				},
			}
		case EvScrolled:
			data = map[string]interface{}{
				"position": map[string]interface{}{
					"x": toFloat64(msg.Payload["x"]),
					"y": toFloat64(msg.Payload["y"]),
				},
				"scrolled": map[string]interface{}{
					"dx": toFloat64(msg.Payload["dx"]),
					"dy": toFloat64(msg.Payload["dy"]),
				},
			}
		default:
			data = nil
		}

		disp.fire(kind, data)
		return Response{ID: msg.ID, Success: true}
	}

	return Response{
		ID:      msg.ID,
		Success: false,
		Error:   "Widget does not implement the requested event interface and has no dispatcher",
	}
}

// Fyne event struct builders for stimulateEvent interface dispatch

func buildMouseEvent(msg Message) *desktop.MouseEvent {
	return &desktop.MouseEvent{
		PointEvent: fyne.PointEvent{
			Position: fyne.NewPos(
				float32(toFloat64(msg.Payload["x"])),
				float32(toFloat64(msg.Payload["y"])),
			),
		},
		Button: desktop.MouseButton(toInt(msg.Payload["button"])),
	}
}

func buildKeyEvent(msg Message) *fyne.KeyEvent {
	keyVal, _ := msg.Payload["key"].(string)
	return &fyne.KeyEvent{Name: fyne.KeyName(keyVal)}
}

func buildPointEvent(msg Message) *fyne.PointEvent {
	return &fyne.PointEvent{
		Position: fyne.NewPos(
			float32(toFloat64(msg.Payload["x"])),
			float32(toFloat64(msg.Payload["y"])),
		),
	}
}

func buildDragEvent(msg Message) *fyne.DragEvent {
	return &fyne.DragEvent{
		PointEvent: fyne.PointEvent{
			Position: fyne.NewPos(
				float32(toFloat64(msg.Payload["x"])),
				float32(toFloat64(msg.Payload["y"])),
			),
		},
		Dragged: fyne.NewDelta(
			float32(toFloat64(msg.Payload["dx"])),
			float32(toFloat64(msg.Payload["dy"])),
		),
	}
}

func buildScrollEvent(msg Message) *fyne.ScrollEvent {
	return &fyne.ScrollEvent{
		PointEvent: fyne.PointEvent{
			Position: fyne.NewPos(
				float32(toFloat64(msg.Payload["x"])),
				float32(toFloat64(msg.Payload["y"])),
			),
		},
		Scrolled: fyne.NewDelta(
			float32(toFloat64(msg.Payload["dx"])),
			float32(toFloat64(msg.Payload["dy"])),
		),
	}
}

// isEventVariant returns true if obj is one of our concrete event widget types
// (ButtonWithHover*, LabelWithHover) whose interface methods fire through the
// EventDispatcher. Base Fyne widgets (widget.Button, widget.Label) may implement
// the same interfaces natively, but their methods don't fire our dispatcher.
func isEventVariant(obj fyne.CanvasObject) bool {
	switch obj.(type) {
	case *ButtonWithHover, *ButtonWithHoverMouse, *ButtonWithHoverFocusKey, *LabelWithHover:
		return true
	}
	return false
}

// maybeWrapWithEvents is called by handleCreate* functions after creating
// the base Fyne widget. If events+cbs fields are present in the payload,
// it creates an EventDispatcher and returns a concrete widget variant that
// implements the requested event interfaces natively (no wrapper pattern).
// Caller must hold b.mu lock.
func (b *Bridge) maybeWrapWithEvents(msg Message, widgetID string, obj fyne.CanvasObject) fyne.CanvasObject {
	eventsRaw, ok := msg.Payload["events"]
	if !ok {
		return obj // no events requested
	}
	events := uint16(toInt(eventsRaw))
	cbs, _ := msg.Payload["cbs"].(map[string]interface{})

	disp := b.getOrCreateDispatcher(widgetID)
	for key, val := range cbs {
		if id, ok := val.(string); ok {
			disp.setCallback(cbKeyToEventKind(key), id)
		}
	}

	// Select the right concrete type based on base widget type + requested events
	switch w := obj.(type) {
	case *widget.Button:
		return b.buttonVariant(w, events, disp)
	case *widget.Label:
		return b.labelVariant(w, events, disp)
	}

	// No concrete variant available — return plain widget with dispatcher registered
	return obj
}

// buttonVariant selects the right ButtonWith* type based on events bitmask.
func (b *Bridge) buttonVariant(btn *widget.Button, events uint16, d *EventDispatcher) fyne.CanvasObject {
	hasHover := events&evBitHover != 0
	hasMouse := events&evBitMouse != 0
	hasFocus := events&evBitFocus != 0
	hasKey := events&evBitKey != 0

	switch {
	case hasHover && hasFocus && hasKey:
		v := NewButtonWithHoverFocusKey(btn.Text, btn.OnTapped, d)
		v.Importance = btn.Importance
		v.Icon = btn.Icon
		return v
	case hasHover && hasMouse:
		v := NewButtonWithHoverMouse(btn.Text, btn.OnTapped, d)
		v.Importance = btn.Importance
		v.Icon = btn.Icon
		return v
	case hasHover:
		v := NewButtonWithHover(btn.Text, btn.OnTapped, d)
		v.Importance = btn.Importance
		v.Icon = btn.Icon
		return v
	default:
		return btn
	}
}

// labelVariant selects the right LabelWith* type based on events bitmask.
func (b *Bridge) labelVariant(lbl *widget.Label, events uint16, d *EventDispatcher) fyne.CanvasObject {
	hasHover := events&evBitHover != 0

	switch {
	case hasHover:
		v := NewLabelWithHover(lbl.Text, d)
		v.Alignment = lbl.Alignment
		v.Wrapping = lbl.Wrapping
		v.TextStyle = lbl.TextStyle
		return v
	default:
		return lbl
	}
}

// ProgressBarInfinite handlers

func (b *Bridge) handleStartProgressInfinite(msg Message) Response {
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

	if pb, ok := obj.(*widget.ProgressBarInfinite); ok {
		fyne.DoAndWait(func() {
			pb.Start()
		})
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an infinite progress bar",
		}
	}
}

func (b *Bridge) handleStopProgressInfinite(msg Message) Response {
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

	if pb, ok := obj.(*widget.ProgressBarInfinite); ok {
		fyne.DoAndWait(func() {
			pb.Stop()
		})
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an infinite progress bar",
		}
	}
}

func (b *Bridge) handleIsProgressRunning(msg Message) Response {
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

	if pb, ok := obj.(*widget.ProgressBarInfinite); ok {
		running := pb.Running()
		return Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"running": running},
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an infinite progress bar",
		}
	}
}

func (b *Bridge) handleSetSelectEntryOptions(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	optionsInterface, _ := msg.Payload["options"].([]interface{})

	// Convert []interface{} to []string
	options := make([]string, len(optionsInterface))
	for i, opt := range optionsInterface {
		options[i] = opt.(string)
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

	if selectEntry, ok := obj.(*widget.SelectEntry); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			selectEntry.SetOptions(options)
		})
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a SelectEntry",
		}
	}
}

// handleGetWidgetSize returns the current rendered size of a widget
func (b *Bridge) handleGetWidgetSize(msg Message) Response {
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

	// Get the size from the canvas object
	canvasObj, ok := obj.(fyne.CanvasObject)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a canvas object",
		}
	}

	size := canvasObj.Size()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"width":  size.Width,
			"height": size.Height,
		},
	}
}

// handleSetWidgetCallback sets or updates the callback for a widget
// This allows callbacks to be set after widget creation, supporting the chainable .onClick() pattern
func (b *Bridge) handleSetWidgetCallback(msg Message) Response {
	widgetID, ok := msg.Payload["widgetId"].(string)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Missing widgetId",
		}
	}

	callbackID, ok := msg.Payload["callbackId"].(string)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Missing callbackId",
		}
	}

	// Store the callback ID in the map
	b.mu.Lock()
	b.callbacks[widgetID] = callbackID
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}
