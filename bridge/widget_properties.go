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
	"fyne.io/fyne/v2/widget"
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
	case *widget.Entry:
		text = w.Text
	case *widget.SelectEntry:
		text = w.Text
	case *widget.Button:
		text = w.Text
	case *HoverableButton: // Handle HoverableButton
		text = w.Text
	case *HoverableWrapper: // Handle HoverableWrapper
		if label, ok := w.content.(*widget.Label); ok {
			text = label.Text
		} else if btn, ok := w.content.(*widget.Button); ok {
			text = btn.Text
		} else if hoverBtn, ok := w.content.(*HoverableButton); ok {
			text = hoverBtn.Text
		}
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
		case *widget.Entry:
			w.SetText(text)
		case *widget.SelectEntry:
			w.SetText(text)
		case *widget.Button:
			w.SetText(text)
		case *HoverableButton:
			w.SetText(text)
			w.Refresh() // Added Refresh for HoverableButton
		case *HoverableWrapper: // Handle HoverableWrapper
			if label, ok := w.content.(*widget.Label); ok {
				label.SetText(text)
			} else if btn, ok := w.content.(*widget.Button); ok {
				btn.SetText(text)
			} else if hoverBtn, ok := w.content.(*HoverableButton); ok {
				hoverBtn.SetText(text)
				hoverBtn.Refresh() // Added Refresh for HoverableButton inside wrapper
			}
		case *TappableWrapper: // Handle TappableWrapper (context menu wrapper)
			if label, ok := w.content.(*widget.Label); ok {
				label.SetText(text)
			} else if btn, ok := w.content.(*widget.Button); ok {
				btn.SetText(text)
			} else if hoverBtn, ok := w.content.(*HoverableButton); ok {
				hoverBtn.SetText(text)
				hoverBtn.Refresh()
			}
		case *widget.Check:
			w.SetText(text)
		}
	})

	// Check if widget type is supported
	supported := false
	switch actualWidget.(type) {
	case *widget.Label, *widget.Entry, *widget.SelectEntry, *widget.Button, *HoverableButton, *HoverableWrapper, *TappableWrapper, *widget.Check:
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
	value := msg.Payload["value"].(float64)

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
	value := msg.Payload["value"].(float64)

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
// This only stores metadata - actual wrapping happens later in processHoverWrappers
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
	// The actual wrapping will happen later in processHoverWrappers
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

// handleProcessHoverWrappers wraps all widgets that have announceOnHover metadata
// This should be called after the widget tree is complete
func (b *Bridge) handleProcessHoverWrappers(msg Message) Response {
	b.mu.Lock()
	// Note: Don't use defer unlock here - we unlock manually before sendResponse to avoid deadlock

	// In test mode, don't wrap widgets to avoid threading issues
	if b.testMode {
		b.mu.Unlock()
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	}

	wrappedCount := 0

	// Iterate through all widgets looking for announceOnHover metadata
	for widgetID, widgetMeta := range b.widgetMeta {
		if widgetMeta.CustomData != nil && widgetMeta.CustomData["announceOnHover"] == true {
			obj, exists := b.widgets[widgetID]
			if !exists {
				continue
			}

			// Check if already a TsyneButton or wrapped
			if _, alreadyTsyne := obj.(*TsyneButton); alreadyTsyne {
				continue
			}
			if _, alreadyWrapped := obj.(*HoverableWrapper); alreadyWrapped {
				continue
			}

			var replacement fyne.CanvasObject

			// For buttons, create a TsyneButton
			if btn, isButton := obj.(*widget.Button); isButton {
				tsyneBtn := NewTsyneButton(btn.Text, btn.OnTapped, b, widgetID)
				tsyneBtn.Importance = btn.Importance
				tsyneBtn.Icon = btn.Icon
				tsyneBtn.IconPlacement = btn.IconPlacement
				tsyneBtn.Alignment = btn.Alignment
				// Note: No callback IDs set here - processHoverWrappers is for accessibility
				// The pointerEnter event is always sent regardless of callback IDs
				if btn.Disabled() {
					tsyneBtn.Disable()
				}
				replacement = tsyneBtn
			} else {
				// For other widgets, use the wrapper approach
				replacement = NewHoverableWrapper(obj, b, widgetID)
			}

			// Replace in widgets map
			b.widgets[widgetID] = replacement

			// Replace in parent container
			parentID, hasParent := b.childToParent[widgetID]
			if hasParent {
				parentObj, exists := b.widgets[parentID]
				if exists {
					if container, ok := parentObj.(interface{ Objects() []fyne.CanvasObject }); ok {
						objects := container.Objects()
						for i, child := range objects {
							if child == obj {
								objects[i] = replacement
								// Note: Don't refresh here - windows haven't been shown yet
								// The refresh will happen naturally when the window is shown
								wrappedCount++
								break
							}
						}
					}
				}
			}
		}
	}


	// Unlock before sending response to avoid deadlock (sendResponse also acquires the lock)
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"wrappedCount": wrappedCount,
		},
	}
}

// handleSetWidgetHoverable handles enabling hover events on a widget
// This wraps the widget to support mouse in/out/move events
func (b *Bridge) handleSetWidgetHoverable(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	// Extract optional callback IDs for Hoverable interface
	onMouseInCallbackId, _ := msg.Payload["onMouseInCallbackId"].(string)
	onMouseMoveCallbackId, _ := msg.Payload["onMouseMoveCallbackId"].(string)
	onMouseOutCallbackId, _ := msg.Payload["onMouseOutCallbackId"].(string)

	// Extract optional callback IDs for Mouseable interface
	onMouseDownCallbackId, _ := msg.Payload["onMouseDownCallbackId"].(string)
	onMouseUpCallbackId, _ := msg.Payload["onMouseUpCallbackId"].(string)

	// Extract optional callback IDs for Keyable interface
	onKeyDownCallbackId, _ := msg.Payload["onKeyDownCallbackId"].(string)
	onKeyUpCallbackId, _ := msg.Payload["onKeyUpCallbackId"].(string)

	// Extract optional callback ID for Focus events
	onFocusCallbackId, _ := msg.Payload["onFocusCallbackId"].(string)

	// Extract optional cursor type for Cursorable interface
	cursorType, _ := msg.Payload["cursorType"].(string)

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

	// Store callback IDs in widget metadata
	widgetMeta, metaExists := b.widgetMeta[widgetID]
	if !metaExists {
		widgetMeta = WidgetMetadata{}
	}
	if widgetMeta.CustomData == nil {
		widgetMeta.CustomData = make(map[string]interface{})
	}

	// Store callback IDs for event dispatching
	if onMouseInCallbackId != "" {
		widgetMeta.CustomData["onMouseInCallbackId"] = onMouseInCallbackId
	}
	if onMouseMoveCallbackId != "" {
		widgetMeta.CustomData["onMouseMoveCallbackId"] = onMouseMoveCallbackId
	}
	if onMouseOutCallbackId != "" {
		widgetMeta.CustomData["onMouseOutCallbackId"] = onMouseOutCallbackId
	}
	if onMouseDownCallbackId != "" {
		widgetMeta.CustomData["onMouseDownCallbackId"] = onMouseDownCallbackId
	}
	if onMouseUpCallbackId != "" {
		widgetMeta.CustomData["onMouseUpCallbackId"] = onMouseUpCallbackId
	}
	if onKeyDownCallbackId != "" {
		widgetMeta.CustomData["onKeyDownCallbackId"] = onKeyDownCallbackId
	}
	if onKeyUpCallbackId != "" {
		widgetMeta.CustomData["onKeyUpCallbackId"] = onKeyUpCallbackId
	}
	if onFocusCallbackId != "" {
		widgetMeta.CustomData["onFocusCallbackId"] = onFocusCallbackId
	}
	if cursorType != "" {
		widgetMeta.CustomData["cursorType"] = cursorType
	}
	widgetMeta.CustomData["hoverable"] = true
	b.widgetMeta[widgetID] = widgetMeta

	// Check if already a TsyneButton - if so, update its callback IDs
	if tsyneBtn, alreadyTsyne := obj.(*TsyneButton); alreadyTsyne {
		// Update Hoverable callback IDs
		if onMouseInCallbackId != "" {
			tsyneBtn.onMouseInCallbackId = onMouseInCallbackId
		}
		if onMouseOutCallbackId != "" {
			tsyneBtn.onMouseOutCallbackId = onMouseOutCallbackId
		}
		if onMouseMoveCallbackId != "" {
			tsyneBtn.onMouseMovedCallbackId = onMouseMoveCallbackId
		}
		// Update Mouseable callback IDs
		if onMouseDownCallbackId != "" {
			tsyneBtn.onMouseDownCallbackId = onMouseDownCallbackId
		}
		if onMouseUpCallbackId != "" {
			tsyneBtn.onMouseUpCallbackId = onMouseUpCallbackId
		}
		// Update Keyable callback IDs
		if onKeyDownCallbackId != "" {
			tsyneBtn.onKeyDownCallbackId = onKeyDownCallbackId
		}
		if onKeyUpCallbackId != "" {
			tsyneBtn.onKeyUpCallbackId = onKeyUpCallbackId
		}
		// Update Focus callback ID
		if onFocusCallbackId != "" {
			tsyneBtn.onFocusCallbackId = onFocusCallbackId
		}
		// Update cursor type
		if cursorType != "" {
			tsyneBtn.SetCursor(stringToCursor(cursorType))
		}
		b.mu.Unlock()
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	}
	if _, alreadyWrapped := obj.(*HoverableWrapper); alreadyWrapped {
		b.mu.Unlock()
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	}

	// In test mode, skip the actual wrapping but return success
	// Events will be handled differently in test mode
	if b.testMode {
		b.mu.Unlock()
		return Response{
			ID:      msg.ID,
			Success: true,
		}
	}

	// Wrap the widget to make it interactive
	var replacement fyne.CanvasObject

	// For buttons, create a TsyneButton with appropriate callback IDs
	if btn, isButton := obj.(*widget.Button); isButton {
		tsyneBtn := NewTsyneButton(btn.Text, btn.OnTapped, b, widgetID)
		tsyneBtn.Importance = btn.Importance
		tsyneBtn.Icon = btn.Icon
		tsyneBtn.IconPlacement = btn.IconPlacement
		tsyneBtn.Alignment = btn.Alignment
		if btn.Disabled() {
			tsyneBtn.Disable()
		}

		// Set Hoverable callback IDs
		tsyneBtn.onMouseInCallbackId = onMouseInCallbackId
		tsyneBtn.onMouseOutCallbackId = onMouseOutCallbackId
		tsyneBtn.onMouseMovedCallbackId = onMouseMoveCallbackId

		// Set Mouseable callback IDs
		tsyneBtn.onMouseDownCallbackId = onMouseDownCallbackId
		tsyneBtn.onMouseUpCallbackId = onMouseUpCallbackId

		// Set Keyable callback IDs
		tsyneBtn.onKeyDownCallbackId = onKeyDownCallbackId
		tsyneBtn.onKeyUpCallbackId = onKeyUpCallbackId

		// Set Focus callback ID
		tsyneBtn.onFocusCallbackId = onFocusCallbackId

		// Set cursor type
		if cursorType != "" {
			tsyneBtn.SetCursor(stringToCursor(cursorType))
		}

		replacement = tsyneBtn
	} else {
		// For other widgets, use the wrapper approach
		replacement = NewHoverableWrapper(obj, b, widgetID)
	}

	// Replace in widgets map
	b.widgets[widgetID] = replacement

	// Replace in parent container if it exists
	parentID, hasParent := b.childToParent[widgetID]
	if hasParent {
		parentObj, parentExists := b.widgets[parentID]
		if parentExists {
			if container, ok := parentObj.(*fyne.Container); ok {
				for i, child := range container.Objects {
					if child == obj {
						container.Objects[i] = replacement
						break
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
