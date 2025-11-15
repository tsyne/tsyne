package main

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/widget"
)

func (b *Bridge) handleGetText(msg Message) {
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

	// If we have a separate entry reference, use that
	actualWidget := obj
	if hasEntry {
		actualWidget = entryObj
	}

	var text string
	switch w := actualWidget.(type) {
	case *widget.Label:
		text = w.Text
	case *widget.Entry:
		text = w.Text
	case *widget.Button:
		text = w.Text
	case *widget.Check:
		text = w.Text
	default:
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget does not support getText",
		})
		return
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"text": text},
	})
}

func (b *Bridge) handleSetText(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	text := msg.Payload["text"].(string)

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
		case *widget.Entry:
			w.SetText(text)
		case *widget.Button:
			w.SetText(text)
		case *widget.Check:
			w.SetText(text)
		}
	})

	// Check if widget type is supported
	supported := false
	switch actualWidget.(type) {
	case *widget.Label, *widget.Entry, *widget.Button, *widget.Check:
		supported = true
	}

	if !supported {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget does not support setText",
		})
		return
	}

	// Update metadata
	b.mu.Lock()
	if meta, exists := b.widgetMeta[widgetID]; exists {
		meta.Text = text
		b.widgetMeta[widgetID] = meta
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleGetChecked(msg Message) {
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

	if check, ok := obj.(*widget.Check); ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"checked": check.Checked},
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a checkbox",
		})
	}
}

func (b *Bridge) handleSetChecked(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	checked := msg.Payload["checked"].(bool)

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

	if check, ok := obj.(*widget.Check); ok {
		// UI updates must happen on the main thread
		// Temporarily disable OnChanged to prevent infinite loops when setting initial state
		fyne.DoAndWait(func() {
			originalCallback := check.OnChanged
			check.OnChanged = nil
			check.SetChecked(checked)
			check.OnChanged = originalCallback
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a checkbox",
		})
	}
}

func (b *Bridge) handleGetValue(msg Message) {
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

	if slider, ok := obj.(*widget.Slider); ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"value": slider.Value},
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a slider",
		})
	}
}

func (b *Bridge) handleSetValue(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	value := msg.Payload["value"].(float64)

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

	if slider, ok := obj.(*widget.Slider); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			slider.SetValue(value)
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a slider",
		})
	}
}

func (b *Bridge) handleGetProgress(msg Message) {
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

	if pb, ok := obj.(*widget.ProgressBar); ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"value": pb.Value},
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a progressbar",
		})
	}
}

func (b *Bridge) handleSetProgress(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	value := msg.Payload["value"].(float64)

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

	if pb, ok := obj.(*widget.ProgressBar); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			pb.SetValue(value)
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a progressbar",
		})
	}
}

func (b *Bridge) handleGetSelected(msg Message) {
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

	if sel, ok := obj.(*widget.Select); ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"selected": sel.Selected},
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a select",
		})
	}
}

func (b *Bridge) handleSetSelected(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	selected := msg.Payload["selected"].(string)

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

	if sel, ok := obj.(*widget.Select); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			sel.SetSelected(selected)
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a select",
		})
	}
}

func (b *Bridge) handleGetRadioSelected(msg Message) {
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

	if radio, ok := obj.(*widget.RadioGroup); ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"selected": radio.Selected},
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a radio group",
		})
	}
}

func (b *Bridge) handleSetRadioSelected(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	selected := msg.Payload["selected"].(string)

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

	if radio, ok := obj.(*widget.RadioGroup); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			radio.SetSelected(selected)
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a radio group",
		})
	}
}

func (b *Bridge) handleGetTableData(msg Message) {
	id := msg.Payload["id"].(string)

	b.mu.RLock()
	data, exists := b.tableData[id]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Table not found",
		})
		return
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"data": data,
		},
	})
}

func (b *Bridge) handleUpdateTableData(msg Message) {
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
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Table not found",
		})
		return
	}

	if table, ok := obj.(*widget.Table); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			table.Refresh()
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a table",
		})
	}
}

func (b *Bridge) handleGetListData(msg Message) {
	id := msg.Payload["id"].(string)

	b.mu.RLock()
	data, exists := b.listData[id]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "List not found",
		})
		return
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"data": data,
		},
	})
}

func (b *Bridge) handleUpdateListData(msg Message) {
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
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "List not found",
		})
		return
	}

	if list, ok := obj.(*widget.List); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			list.Refresh()
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a list",
		})
	}
}

func (b *Bridge) handleUpdateImage(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	imageData := msg.Payload["imageData"].(string)

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

	// Parse the data URL format: "data:image/png;base64,..."
	var base64Data string
	if strings.HasPrefix(imageData, "data:") {
		// Split on comma to separate header from data
		parts := strings.SplitN(imageData, ",", 2)
		if len(parts) != 2 {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   "Invalid data URL format",
			})
			return
		}
		base64Data = parts[1]
	} else {
		// Assume it's already base64 without the data URL prefix
		base64Data = imageData
	}

	// Decode base64
	imgBytes, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Failed to decode base64: %v", err),
		})
		return
	}

	// Decode image bytes
	decodedImg, _, err := image.Decode(bytes.NewReader(imgBytes))
	if err != nil {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Failed to decode image: %v", err),
		})
		return
	}

	// UI updates must happen on the main thread
	fyne.DoAndWait(func() {
		if imgWidget, ok := obj.(*canvas.Image); ok {
			imgWidget.Image = decodedImg
			imgWidget.Refresh()
		}
	})

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}
