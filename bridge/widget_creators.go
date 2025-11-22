package main

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/color"
	"log"
	"net/url"
	"os"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/widget"
)

func (b *Bridge) handleCreateButton(msg Message) {
	widgetID := msg.Payload["id"].(string)
	text := msg.Payload["text"].(string)
	callbackID, hasCallback := msg.Payload["callbackId"].(string)

	btn := widget.NewButton(text, func() {
		if hasCallback {
			b.sendEvent(Event{
				Type:     "callback",
				WidgetID: widgetID,
				Data:     map[string]interface{}{"callbackId": callbackID},
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

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateLabel(msg Message) {
	widgetID := msg.Payload["id"].(string)
	text := msg.Payload["text"].(string)

	lbl := widget.NewLabel(text)

	b.mu.Lock()
	b.widgets[widgetID] = lbl
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "label", Text: text}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateEntry(msg Message) {
	widgetID := msg.Payload["id"].(string)
	placeholder, _ := msg.Payload["placeholder"].(string)

	entry := widget.NewEntry()
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

	// Set minimum width if provided
	var widgetToStore fyne.CanvasObject = entry
	var needsEntryRef bool = false

	if minWidth, ok := msg.Payload["minWidth"].(float64); ok && minWidth > 0 {
		// Create a sized container with the entry
		sizedEntry := canvas.NewRectangle(color.Transparent)
		sizedEntry.SetMinSize(fyne.NewSize(float32(minWidth), entry.MinSize().Height))
		widgetToStore = container.NewMax(sizedEntry, entry)
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

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateMultiLineEntry(msg Message) {
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

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreatePasswordEntry(msg Message) {
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

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateSeparator(msg Message) {
	widgetID := msg.Payload["id"].(string)

	separator := widget.NewSeparator()

	b.mu.Lock()
	b.widgets[widgetID] = separator
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "separator", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateHyperlink(msg Message) {
	widgetID := msg.Payload["id"].(string)
	text := msg.Payload["text"].(string)
	urlStr := msg.Payload["url"].(string)

	// Parse URL
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Invalid URL: %v", err),
		})
		return
	}

	hyperlink := widget.NewHyperlink(text, parsedURL)

	b.mu.Lock()
	b.widgets[widgetID] = hyperlink
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "hyperlink", Text: text, URL: urlStr}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateVBox(msg Message) {
	widgetID := msg.Payload["id"].(string)
	childIDs, _ := msg.Payload["children"].([]interface{})

	var children []fyne.CanvasObject
	b.mu.RLock()
	for _, childID := range childIDs {
		if child, exists := b.widgets[childID.(string)]; exists {
			children = append(children, child)
		}
	}
	b.mu.RUnlock()

	vbox := container.NewVBox(children...)

	b.mu.Lock()
	b.widgets[widgetID] = vbox
	for _, childID := range childIDs {
		b.childToParent[childID.(string)] = widgetID
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateHBox(msg Message) {
	widgetID := msg.Payload["id"].(string)
	childIDs, _ := msg.Payload["children"].([]interface{})

	var children []fyne.CanvasObject
	b.mu.RLock()
	for _, childID := range childIDs {
		if child, exists := b.widgets[childID.(string)]; exists {
			children = append(children, child)
		}
	}
	b.mu.RUnlock()

	hbox := container.NewHBox(children...)

	b.mu.Lock()
	b.widgets[widgetID] = hbox
	for _, childID := range childIDs {
		b.childToParent[childID.(string)] = widgetID
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateCheckbox(msg Message) {
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

	b.mu.Lock()
	b.widgets[widgetID] = check
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "checkbox", Text: text}
	if hasCallback {
		b.callbacks[widgetID] = callbackID
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateSelect(msg Message) {
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

	b.mu.Lock()
	b.widgets[widgetID] = sel
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "select", Text: ""}
	if hasCallback {
		b.callbacks[widgetID] = callbackID
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateSlider(msg Message) {
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

	b.mu.Lock()
	b.widgets[widgetID] = slider
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "slider", Text: ""}
	if hasCallback {
		b.callbacks[widgetID] = callbackID
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateProgressBar(msg Message) {
	widgetID := msg.Payload["id"].(string)
	infinite, _ := msg.Payload["infinite"].(bool)

	var progressBar fyne.CanvasObject

	if infinite {
		progressBar = widget.NewProgressBarInfinite()
	} else {
		pb := widget.NewProgressBar()
		// Set initial value if provided
		if initialValue, ok := msg.Payload["value"].(float64); ok {
			pb.Value = initialValue
		}
		progressBar = pb
	}

	b.mu.Lock()
	b.widgets[widgetID] = progressBar
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "progressbar", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateScroll(msg Message) {
	widgetID := msg.Payload["id"].(string)
	contentID := msg.Payload["contentId"].(string)

	b.mu.RLock()
	content, exists := b.widgets[contentID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Content widget not found",
		})
		return
	}

	scroll := container.NewScroll(content)

	b.mu.Lock()
	b.widgets[widgetID] = scroll
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "scroll", Text: ""}
	b.childToParent[contentID] = widgetID
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateGrid(msg Message) {
	widgetID := msg.Payload["id"].(string)
	columns := int(msg.Payload["columns"].(float64))
	childIDs, _ := msg.Payload["children"].([]interface{})

	var children []fyne.CanvasObject
	b.mu.RLock()
	for _, childID := range childIDs {
		if child, exists := b.widgets[childID.(string)]; exists {
			children = append(children, child)
		}
	}
	b.mu.RUnlock()

	grid := container.NewGridWithColumns(columns, children...)

	b.mu.Lock()
	b.widgets[widgetID] = grid
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "grid", Text: ""}
	for _, childID := range childIDs {
		b.childToParent[childID.(string)] = widgetID
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateCenter(msg Message) {
	widgetID := msg.Payload["id"].(string)
	childID := msg.Payload["childId"].(string)

	b.mu.RLock()
	child, exists := b.widgets[childID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Child widget not found",
		})
		return
	}

	centered := container.NewCenter(child)

	b.mu.Lock()
	b.widgets[widgetID] = centered
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "center", Text: ""}
	b.childToParent[childID] = widgetID
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateClip(msg Message) {
	widgetID := msg.Payload["id"].(string)
	childID := msg.Payload["childId"].(string)

	b.mu.RLock()
	child, exists := b.widgets[childID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Child widget not found",
		})
		return
	}

	// NewClip creates a container that clips any content that extends beyond the bounds of its child
	clipped := container.NewClip(child)

	b.mu.Lock()
	b.widgets[widgetID] = clipped
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "clip", Text: ""}
	b.childToParent[childID] = widgetID
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateMax(msg Message) {
	widgetID := msg.Payload["id"].(string)
	childIDs, ok := msg.Payload["childIds"].([]interface{})

	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "childIds must be an array",
		})
		return
	}

	var children []fyne.CanvasObject

	b.mu.RLock()
	for _, childIDInterface := range childIDs {
		childID, ok := childIDInterface.(string)
		if !ok {
			continue
		}
		child, exists := b.widgets[childID]
		if exists {
			children = append(children, child)
		}
	}
	b.mu.RUnlock()

	if len(children) == 0 {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "No valid child widgets found",
		})
		return
	}

	// NewMax stacks all widgets on top of each other, expanding all to the max size
	maxContainer := container.NewMax(children...)

	b.mu.Lock()
	b.widgets[widgetID] = maxContainer
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "max", Text: ""}
	for _, childIDInterface := range childIDs {
		if childID, ok := childIDInterface.(string); ok {
			b.childToParent[childID] = widgetID
		}
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateCard(msg Message) {
	widgetID := msg.Payload["id"].(string)
	title := msg.Payload["title"].(string)
	subtitle, _ := msg.Payload["subtitle"].(string)
	contentID := msg.Payload["contentId"].(string)

	b.mu.RLock()
	content, exists := b.widgets[contentID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Content widget not found",
		})
		return
	}

	card := widget.NewCard(title, subtitle, content)

	b.mu.Lock()
	b.widgets[widgetID] = card
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "card", Text: title}
	b.childToParent[contentID] = widgetID
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateAccordion(msg Message) {
	widgetID := msg.Payload["id"].(string)
	itemsInterface := msg.Payload["items"].([]interface{})

	var accordionItems []*widget.AccordionItem

	for _, itemInterface := range itemsInterface {
		itemData := itemInterface.(map[string]interface{})
		title := itemData["title"].(string)
		contentID := itemData["contentId"].(string)

		b.mu.RLock()
		content, exists := b.widgets[contentID]
		b.mu.RUnlock()

		if exists {
			accordionItem := widget.NewAccordionItem(title, content)
			accordionItems = append(accordionItems, accordionItem)
		}
	}

	accordion := widget.NewAccordion(accordionItems...)

	b.mu.Lock()
	b.widgets[widgetID] = accordion
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "accordion", Text: ""}
	for _, item := range accordionItems {
		// Find the content widget ID for this accordion item
		for _, itemData := range itemsInterface {
			if itemData.(map[string]interface{})["title"].(string) == item.Title {
				contentID := itemData.(map[string]interface{})["contentId"].(string)
				b.childToParent[contentID] = widgetID
				break
			}
		}
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateForm(msg Message) {
	widgetID := msg.Payload["id"].(string)
	itemsInterface := msg.Payload["items"].([]interface{})

	var formItems []*widget.FormItem

	for _, itemInterface := range itemsInterface {
		itemData := itemInterface.(map[string]interface{})
		label := itemData["label"].(string)
		widgetIDStr := itemData["widgetId"].(string)

		b.mu.RLock()
		w, exists := b.widgets[widgetIDStr]
		b.mu.RUnlock()

		if exists {
			formItem := widget.NewFormItem(label, w)
			formItems = append(formItems, formItem)
		}
	}

	// Create form with optional submit/cancel handlers
	var onSubmit func()
	var onCancel func()

	if submitCallbackID, ok := msg.Payload["submitCallbackId"].(string); ok {
		onSubmit = func() {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{"callbackId": submitCallbackID},
			})
		}
	}

	if cancelCallbackID, ok := msg.Payload["cancelCallbackId"].(string); ok {
		onCancel = func() {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{"callbackId": cancelCallbackID},
			})
		}
	}

	var form *widget.Form
	if onSubmit != nil || onCancel != nil {
		form = &widget.Form{
			Items:    formItems,
			OnSubmit: onSubmit,
			OnCancel: onCancel,
		}
	} else {
		form = &widget.Form{
			Items: formItems,
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = form
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "form", Text: ""}
	for _, item := range formItems {
		// item.Widget is the actual widget object, we need its ID
		for id, w := range b.widgets {
			if w == item.Widget {
				b.childToParent[id] = widgetID
				break
			}
		}
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateTree(msg Message) {
	widgetID := msg.Payload["id"].(string)
	rootLabel := msg.Payload["rootLabel"].(string)

	// Create tree with simple structure
	// Tree nodes are built recursively from the data structure
	tree := widget.NewTree(
		func(uid string) []string {
			// This is a simple tree - TypeScript will manage the structure
			// For now, return empty children (tree can be enhanced later)
			return []string{}
		},
		func(uid string) bool {
			// All nodes can have children
			return true
		},
		func(branch bool) fyne.CanvasObject {
			return widget.NewLabel("Node")
		},
		func(uid string, branch bool, obj fyne.CanvasObject) {
			label := obj.(*widget.Label)
			label.SetText(uid)
		},
	)

	// Open root node
	tree.OpenBranch(rootLabel)

	b.mu.Lock()
	b.widgets[widgetID] = tree
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "tree", Text: rootLabel}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateRichText(msg Message) {
	widgetID := msg.Payload["id"].(string)
	segmentsInterface := msg.Payload["segments"].([]interface{})

	var richTextSegments []widget.RichTextSegment

	for _, segInterface := range segmentsInterface {
		segData := segInterface.(map[string]interface{})
		text := segData["text"].(string)

		style := widget.RichTextStyle{}

		if bold, ok := segData["bold"].(bool); ok && bold {
			style.TextStyle.Bold = true
		}
		if italic, ok := segData["italic"].(bool); ok && italic {
			style.TextStyle.Italic = true
		}
		if monospace, ok := segData["monospace"].(bool); ok && monospace {
			style.TextStyle.Monospace = true
		}

		segment := &widget.TextSegment{
			Text:  text,
			Style: style,
		}
		richTextSegments = append(richTextSegments, segment)
	}

	richText := widget.NewRichText(richTextSegments...)

	b.mu.Lock()
	b.widgets[widgetID] = richText
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "richtext", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateImage(msg Message) {
	widgetID := msg.Payload["id"].(string)
	path, hasPath := msg.Payload["path"].(string)
	resourceName, hasResource := msg.Payload["resource"].(string)

	var img *canvas.Image

	// Check if using resource reference (new approach)
	if hasResource && resourceName != "" {
		imageData, exists := b.getResource(resourceName)
		if !exists {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Resource not found: %s", resourceName),
			})
			return
		}

		// Decode image data
		decodedImg, _, err := image.Decode(bytes.NewReader(imageData))
		if err != nil {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to decode resource image: %v", err),
			})
			return
		}

		bounds := decodedImg.Bounds()
		width, height := bounds.Dx(), bounds.Dy()

		img = canvas.NewImageFromImage(decodedImg)
		// Set MinSize to ensure proper layout - this is critical for display!
		img.SetMinSize(fyne.NewSize(float32(width), float32(height)))
	} else if !hasPath || path == "" {
		// If path is empty, create a blank image (will be updated with base64 later)
		log.Printf("[Image] Creating blank image widget %s (will be updated with base64)", widgetID)
		img = canvas.NewImageFromImage(nil)
	} else if strings.HasPrefix(path, "data:") {
		// Handle base64 data URI directly
		// Parse the data URL format: "data:image/png;base64,..."
		parts := strings.SplitN(path, ",", 2)
		if len(parts) != 2 {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   "Invalid data URL format",
			})
			return
		}

		base64Data := parts[1]
		imageData, err := base64.StdEncoding.DecodeString(base64Data)
		if err != nil {
			log.Printf("[Image] Error decoding base64: %v", err)
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to decode base64: %v", err),
			})
			return
		}

		// Decode image data
		decodedImg, _, err := image.Decode(bytes.NewReader(imageData))
		if err != nil {
			log.Printf("[Image] Error decoding image: %v", err)
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to decode image: %v", err),
			})
			return
		}

		bounds := decodedImg.Bounds()
		width, height := bounds.Dx(), bounds.Dy()

		img = canvas.NewImageFromImage(decodedImg)
		// Set MinSize to ensure proper layout - this is critical for display!
		img.SetMinSize(fyne.NewSize(float32(width), float32(height)))
	} else {
		// Load image from file - use file reading for better SVG support
		data, err := os.ReadFile(path)
		if err != nil {
			log.Printf("[Image] Error reading file %s: %v", path, err)
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to read image file: %v", err),
			})
			return
		}

		// Create a static resource from the file data
		resource := fyne.NewStaticResource(path, data)
		img = canvas.NewImageFromResource(resource)
	}

	// Set fill mode if provided
	if fillMode, ok := msg.Payload["fillMode"].(string); ok {
		switch fillMode {
		case "contain":
			img.FillMode = canvas.ImageFillContain
		case "stretch":
			img.FillMode = canvas.ImageFillStretch
		case "original":
			img.FillMode = canvas.ImageFillOriginal
		}
	} else {
		img.FillMode = canvas.ImageFillOriginal // Use original size to preserve image quality
	}

	// Force refresh to ensure the image renders
	img.Refresh()

	// Check if we need to wrap the image for click and/or drag support
	var widgetToStore fyne.CanvasObject = img
	dragCallbackID, hasDragCallback := msg.Payload["onDragCallbackId"].(string)
	dragEndCallbackID, hasDragEndCallback := msg.Payload["onDragEndCallbackId"].(string)
	clickCallbackID, hasClickCallback := msg.Payload["callbackId"].(string)

	if hasDragCallback || hasDragEndCallback {
		// Wrap image in a draggable container for drag support
		var dragCallback func(x, y float32)
		var dragEndCallback func(x, y float32)
		var clickCallback func()

		if hasDragCallback {
			dragCallback = func(x, y float32) {
				log.Printf("[Image] Dragging image widget %s at (%f, %f), sending callback %s", widgetID, x, y, dragCallbackID)
				b.sendEvent(Event{
					Type: "callback",
					Data: map[string]interface{}{
						"callbackId": dragCallbackID,
						"x":          x,
						"y":          y,
					},
				})
			}
		}

		if hasDragEndCallback {
			dragEndCallback = func(x, y float32) {
				log.Printf("[Image] DragEnd for image widget %s at (%f, %f), sending callback %s", widgetID, x, y, dragEndCallbackID)
				b.sendEvent(Event{
					Type: "callback",
					Data: map[string]interface{}{
						"callbackId": dragEndCallbackID,
						"x":          x,
						"y":          y,
					},
				})
			}
		}

		if hasClickCallback {
			clickCallback = func() {
				log.Printf("[Image] Clicked image widget %s, sending callback %s", widgetID, clickCallbackID)
				b.sendEvent(Event{
					Type: "callback",
					Data: map[string]interface{}{
						"callbackId": clickCallbackID,
					},
				})
			}
		}

		widgetToStore = NewDraggableContainer(img, dragCallback, dragEndCallback, clickCallback)
	} else if hasClickCallback {
		// Wrap image in a clickable container for single-click support only
		callback := func() {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": clickCallbackID,
				},
			})
		}
		widgetToStore = NewClickableContainer(img, callback)
	}

	b.mu.Lock()
	b.widgets[widgetID] = widgetToStore
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "image", Text: path}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateBorder(msg Message) {
	widgetID := msg.Payload["id"].(string)

	// Get optional border widgets
	var top, bottom, left, right, center fyne.CanvasObject

	b.mu.RLock()
	if topID, ok := msg.Payload["topId"].(string); ok {
		top = b.widgets[topID]
	}
	if bottomID, ok := msg.Payload["bottomId"].(string); ok {
		bottom = b.widgets[bottomID]
	}
	if leftID, ok := msg.Payload["leftId"].(string); ok {
		left = b.widgets[leftID]
	}
	if rightID, ok := msg.Payload["rightId"].(string); ok {
		right = b.widgets[rightID]
	}
	if centerID, ok := msg.Payload["centerId"].(string); ok {
		center = b.widgets[centerID]
	}
	b.mu.RUnlock()

	border := container.NewBorder(top, bottom, left, right, center)

	b.mu.Lock()
	b.widgets[widgetID] = border
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "border", Text: ""}
	if topID, ok := msg.Payload["topId"].(string); ok {
		b.childToParent[topID] = widgetID
	}
	if bottomID, ok := msg.Payload["bottomId"].(string); ok {
		b.childToParent[bottomID] = widgetID
	}
	if leftID, ok := msg.Payload["leftId"].(string); ok {
		b.childToParent[leftID] = widgetID
	}
	if rightID, ok := msg.Payload["rightId"].(string); ok {
		b.childToParent[rightID] = widgetID
	}
	if centerID, ok := msg.Payload["centerId"].(string); ok {
		b.childToParent[centerID] = widgetID
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateGridWrap(msg Message) {
	widgetID := msg.Payload["id"].(string)
	itemWidth := float32(msg.Payload["itemWidth"].(float64))
	itemHeight := float32(msg.Payload["itemHeight"].(float64))
	childIDs, _ := msg.Payload["children"].([]interface{})

	var children []fyne.CanvasObject
	b.mu.RLock()
	for _, childID := range childIDs {
		if child, exists := b.widgets[childID.(string)]; exists {
			children = append(children, child)
		}
	}
	b.mu.RUnlock()

	gridWrap := container.NewGridWrap(
		fyne.NewSize(itemWidth, itemHeight),
		children...,
	)

	b.mu.Lock()
	b.widgets[widgetID] = gridWrap
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "gridwrap", Text: ""}
	for _, childID := range childIDs {
		b.childToParent[childID.(string)] = widgetID
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateRadioGroup(msg Message) {
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

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCreateSplit(msg Message) {
	id := msg.Payload["id"].(string)
	orientation := msg.Payload["orientation"].(string)
	leadingID := msg.Payload["leadingId"].(string)
	trailingID := msg.Payload["trailingId"].(string)

	b.mu.RLock()
	leading, leadingExists := b.widgets[leadingID]
	trailing, trailingExists := b.widgets[trailingID]
	b.mu.RUnlock()

	if !leadingExists || !trailingExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Leading or trailing widget not found",
		})
		return
	}

	var split *container.Split
	if orientation == "horizontal" {
		split = container.NewHSplit(leading, trailing)
	} else {
		split = container.NewVSplit(leading, trailing)
	}

	// Set offset if provided (0.0 to 1.0)
	if offset, ok := msg.Payload["offset"].(float64); ok {
		split.SetOffset(offset)
	}

	b.mu.Lock()
	b.widgets[id] = split
	b.widgetMeta[id] = WidgetMetadata{
		Type: "split",
		Text: "",
	}
	b.childToParent[leadingID] = id
	b.childToParent[trailingID] = id
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCreateTabs(msg Message) {
	id := msg.Payload["id"].(string)
	tabsInterface := msg.Payload["tabs"].([]interface{})

	var tabItems []*container.TabItem

	for _, tabInterface := range tabsInterface {
		tabData := tabInterface.(map[string]interface{})
		title := tabData["title"].(string)
		contentID := tabData["contentId"].(string)

		b.mu.RLock()
		content, exists := b.widgets[contentID]
		b.mu.RUnlock()

		if !exists {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Tab content widget not found: %s", contentID),
			})
			return
		}

		tabItems = append(tabItems, container.NewTabItem(title, content))
	}

	tabs := container.NewAppTabs(tabItems...)

	// Set location if provided (top, bottom, leading, trailing)
	if location, ok := msg.Payload["location"].(string); ok {
		switch location {
		case "top":
			tabs.SetTabLocation(container.TabLocationTop)
		case "bottom":
			tabs.SetTabLocation(container.TabLocationBottom)
		case "leading":
			tabs.SetTabLocation(container.TabLocationLeading)
		case "trailing":
			tabs.SetTabLocation(container.TabLocationTrailing)
		}
	}

	b.mu.Lock()
	b.widgets[id] = tabs
	b.widgetMeta[id] = WidgetMetadata{
		Type: "tabs",
		Text: "",
	}
	for _, tabItem := range tabItems {
		// Find the content widget ID for this tab item
		for _, t := range tabsInterface {
			tabData := t.(map[string]interface{})
			if tabData["title"].(string) == tabItem.Text {
				contentID := tabData["contentId"].(string)
				b.childToParent[contentID] = id
				break
			}
		}
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCreateToolbar(msg Message) {
	id := msg.Payload["id"].(string)
	itemsInterface := msg.Payload["items"].([]interface{})

	var toolbarItems []widget.ToolbarItem
	var itemLabels []string // Track labels for testing/traversal

	for _, itemInterface := range itemsInterface {
		itemData := itemInterface.(map[string]interface{})
		itemType := itemData["type"].(string)

		switch itemType {
		case "action":
			label := itemData["label"].(string)
			callbackID := itemData["callbackId"].(string)

			action := widget.NewToolbarAction(
				nil, // Icon (we'll keep it simple for now)
				func() {
					b.sendEvent(Event{
						Type: "callback",
						Data: map[string]interface{}{
							"callbackId": callbackID,
						},
					})
				},
			)
			toolbarItems = append(toolbarItems, action)
			itemLabels = append(itemLabels, label)

			// If a custom ID is provided for testing, store the action
			if customID, ok := itemData["customId"].(string); ok {
				b.toolbarActions[customID] = action
			}

		case "separator":
			toolbarItems = append(toolbarItems, widget.NewToolbarSeparator())
			itemLabels = append(itemLabels, "") // Empty label for separator

		case "spacer":
			toolbarItems = append(toolbarItems, widget.NewToolbarSpacer())
			itemLabels = append(itemLabels, "") // Empty label for spacer
		}
	}

	toolbar := widget.NewToolbar(toolbarItems...)

	b.mu.Lock()
	b.widgets[id] = toolbar
	b.widgetMeta[id] = WidgetMetadata{
		Type: "toolbar",
		Text: "",
	}
	// Store item labels in the toolbarItems map for traversal
	b.toolbarItems[id] = &ToolbarItemsMetadata{
		Labels: itemLabels,
		Items:  toolbarItems,
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCreateTable(msg Message) {
	id := msg.Payload["id"].(string)
	headersInterface := msg.Payload["headers"].([]interface{})
	dataInterface := msg.Payload["data"].([]interface{})

	// Convert headers
	headers := make([]string, len(headersInterface))
	for i, h := range headersInterface {
		headers[i] = h.(string)
	}

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

	// Store data
	b.mu.Lock()
	b.tableData[id] = data
	b.mu.Unlock()

	// Create table widget
	table := widget.NewTable(
		func() (int, int) {
			b.mu.RLock()
			defer b.mu.RUnlock()
			tableData := b.tableData[id]
			if len(tableData) == 0 {
				return 1, len(headers) // Just header row
			}
			return len(tableData) + 1, len(headers) // +1 for header
		},
		func() fyne.CanvasObject {
			return widget.NewLabel("")
		},
		func(cell widget.TableCellID, obj fyne.CanvasObject) {
			label := obj.(*widget.Label)
			b.mu.RLock()
			tableData := b.tableData[id]
			b.mu.RUnlock()

			if cell.Row == 0 {
				// Header row
				if cell.Col < len(headers) {
					label.SetText(headers[cell.Col])
					label.TextStyle = fyne.TextStyle{Bold: true}
				}
			} else {
				// Data row
				rowIdx := cell.Row - 1
				if rowIdx < len(tableData) && cell.Col < len(tableData[rowIdx]) {
					label.SetText(tableData[rowIdx][cell.Col])
					label.TextStyle = fyne.TextStyle{}
				}
			}
		},
	)

	b.mu.Lock()
	b.widgets[id] = table
	b.widgetMeta[id] = WidgetMetadata{
		Type: "table",
		Text: "",
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCreateList(msg Message) {
	id := msg.Payload["id"].(string)
	itemsInterface := msg.Payload["items"].([]interface{})

	// Convert items
	items := make([]string, len(itemsInterface))
	for i, item := range itemsInterface {
		items[i] = item.(string)
	}

	// Store data
	b.mu.Lock()
	b.listData[id] = items
	b.mu.Unlock()

	// Create list widget
	list := widget.NewList(
		func() int {
			b.mu.RLock()
			defer b.mu.RUnlock()
			return len(b.listData[id])
		},
		func() fyne.CanvasObject {
			return widget.NewLabel("")
		},
		func(itemID widget.ListItemID, obj fyne.CanvasObject) {
			label := obj.(*widget.Label)
			b.mu.RLock()
			listData := b.listData[id]
			b.mu.RUnlock()

			if itemID < len(listData) {
				label.SetText(listData[itemID])
			}
		},
	)

	// Handle selection callback if provided
	if callbackID, ok := msg.Payload["callbackId"].(string); ok {
		list.OnSelected = func(itemID widget.ListItemID) {
			b.mu.RLock()
			listData := b.listData[id]
			b.mu.RUnlock()

			var selectedItem string
			if itemID < len(listData) {
				selectedItem = listData[itemID]
			}

			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": callbackID,
					"index":      itemID,
					"item":       selectedItem,
				},
			})
		}
	}

	b.mu.Lock()
	b.widgets[id] = list
	b.widgetMeta[id] = WidgetMetadata{
		Type: "list",
		Text: "",
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCreateMenu(msg Message) {
	widgetID := msg.Payload["id"].(string)
	itemsInterface := msg.Payload["items"].([]interface{})

	// Build menu items
	var menuItems []*fyne.MenuItem

	for _, itemInterface := range itemsInterface {
		itemData := itemInterface.(map[string]interface{})

		// Check if this is a separator
		if isSeparator, ok := itemData["isSeparator"].(bool); ok && isSeparator {
			menuItems = append(menuItems, fyne.NewMenuItemSeparator())
			continue
		}

		label := itemData["label"].(string)
		callbackID, hasCallback := itemData["callbackId"].(string)

		// Capture callback ID in local scope to avoid closure issues
		capturedCallbackID := callbackID
		capturedHasCallback := hasCallback

		menuItem := fyne.NewMenuItem(label, func() {
			if capturedHasCallback {
				b.sendEvent(Event{
					Type: "callback",
					Data: map[string]interface{}{
						"callbackId": capturedCallbackID,
					},
				})
			}
		})

		// Set disabled state if provided
		if disabled, ok := itemData["disabled"].(bool); ok && disabled {
			menuItem.Disabled = true
		}

		// Set checked state if provided
		if checked, ok := itemData["checked"].(bool); ok && checked {
			menuItem.Checked = true
		}

		menuItems = append(menuItems, menuItem)
	}

	// Create the menu widget
	menu := widget.NewMenu(fyne.NewMenu("", menuItems...))

	b.mu.Lock()
	b.widgets[widgetID] = menu
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "menu", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

// ============================================================================
// Canvas Primitives
// ============================================================================

func (b *Bridge) handleCreateCanvasLine(msg Message) {
	widgetID := msg.Payload["id"].(string)
	x1 := float32(msg.Payload["x1"].(float64))
	y1 := float32(msg.Payload["y1"].(float64))
	x2 := float32(msg.Payload["x2"].(float64))
	y2 := float32(msg.Payload["y2"].(float64))

	line := canvas.NewLine(color.Black)
	line.Position1 = fyne.NewPos(x1, y1)
	line.Position2 = fyne.NewPos(x2, y2)

	// Set stroke color if provided
	if colorHex, ok := msg.Payload["strokeColor"].(string); ok {
		line.StrokeColor = parseHexColorSimple(colorHex)
	}

	// Set stroke width if provided
	if strokeWidth, ok := msg.Payload["strokeWidth"].(float64); ok {
		line.StrokeWidth = float32(strokeWidth)
	}

	b.mu.Lock()
	b.widgets[widgetID] = line
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasline", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateCanvasCircle(msg Message) {
	widgetID := msg.Payload["id"].(string)

	circle := canvas.NewCircle(color.Transparent)

	// Set fill color if provided
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		circle.FillColor = parseHexColorSimple(fillHex)
	}

	// Set stroke color if provided
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		circle.StrokeColor = parseHexColorSimple(strokeHex)
	}

	// Set stroke width if provided
	if strokeWidth, ok := msg.Payload["strokeWidth"].(float64); ok {
		circle.StrokeWidth = float32(strokeWidth)
	}

	// Set position and size
	if x, ok := msg.Payload["x"].(float64); ok {
		if y, ok := msg.Payload["y"].(float64); ok {
			circle.Position1 = fyne.NewPos(float32(x), float32(y))
		}
	}
	if x2, ok := msg.Payload["x2"].(float64); ok {
		if y2, ok := msg.Payload["y2"].(float64); ok {
			circle.Position2 = fyne.NewPos(float32(x2), float32(y2))
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = circle
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvascircle", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateCanvasRectangle(msg Message) {
	widgetID := msg.Payload["id"].(string)

	rect := canvas.NewRectangle(color.Transparent)

	// Set fill color if provided
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		rect.FillColor = parseHexColorSimple(fillHex)
	}

	// Set stroke color if provided
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		rect.StrokeColor = parseHexColorSimple(strokeHex)
	}

	// Set stroke width if provided
	if strokeWidth, ok := msg.Payload["strokeWidth"].(float64); ok {
		rect.StrokeWidth = float32(strokeWidth)
	}

	// Set corner radius if provided
	if radius, ok := msg.Payload["cornerRadius"].(float64); ok {
		rect.CornerRadius = float32(radius)
	}

	// Set minimum size if provided
	if width, ok := msg.Payload["width"].(float64); ok {
		if height, ok := msg.Payload["height"].(float64); ok {
			rect.SetMinSize(fyne.NewSize(float32(width), float32(height)))
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = rect
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasrectangle", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateCanvasText(msg Message) {
	widgetID := msg.Payload["id"].(string)
	text := msg.Payload["text"].(string)

	canvasText := canvas.NewText(text, color.Black)

	// Set text color if provided
	if colorHex, ok := msg.Payload["color"].(string); ok {
		canvasText.Color = parseHexColorSimple(colorHex)
	}

	// Set text size if provided
	if textSize, ok := msg.Payload["textSize"].(float64); ok {
		canvasText.TextSize = float32(textSize)
	}

	// Set text style
	if bold, ok := msg.Payload["bold"].(bool); ok && bold {
		canvasText.TextStyle.Bold = true
	}
	if italic, ok := msg.Payload["italic"].(bool); ok && italic {
		canvasText.TextStyle.Italic = true
	}
	if monospace, ok := msg.Payload["monospace"].(bool); ok && monospace {
		canvasText.TextStyle.Monospace = true
	}

	// Set alignment
	if alignment, ok := msg.Payload["alignment"].(string); ok {
		switch alignment {
		case "leading":
			canvasText.Alignment = fyne.TextAlignLeading
		case "center":
			canvasText.Alignment = fyne.TextAlignCenter
		case "trailing":
			canvasText.Alignment = fyne.TextAlignTrailing
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = canvasText
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvastext", Text: text}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateCanvasRaster(msg Message) {
	widgetID := msg.Payload["id"].(string)
	width := int(msg.Payload["width"].(float64))
	height := int(msg.Payload["height"].(float64))

	// Get the initial pixel data if provided (format: [[r,g,b,a], ...])
	var pixelData [][]uint8
	if pixels, ok := msg.Payload["pixels"].([]interface{}); ok {
		for _, p := range pixels {
			if pArr, ok := p.([]interface{}); ok {
				pixel := make([]uint8, 4)
				for i := 0; i < 4 && i < len(pArr); i++ {
					pixel[i] = uint8(pArr[i].(float64))
				}
				pixelData = append(pixelData, pixel)
			}
		}
	}

	// Create pixel buffer
	pixelBuffer := make([][]color.Color, height)
	for y := 0; y < height; y++ {
		pixelBuffer[y] = make([]color.Color, width)
		for x := 0; x < width; x++ {
			pixelIdx := y*width + x
			if pixelIdx < len(pixelData) {
				p := pixelData[pixelIdx]
				pixelBuffer[y][x] = color.RGBA{R: p[0], G: p[1], B: p[2], A: p[3]}
			} else {
				pixelBuffer[y][x] = color.RGBA{R: 255, G: 255, B: 255, A: 255} // Default white
			}
		}
	}

	// Store pixel buffer for later updates
	b.mu.Lock()
	if b.rasterData == nil {
		b.rasterData = make(map[string][][]color.Color)
	}
	b.rasterData[widgetID] = pixelBuffer
	b.mu.Unlock()

	// Create raster with generator function
	raster := canvas.NewRasterWithPixels(func(x, y, w, h int) color.Color {
		b.mu.RLock()
		defer b.mu.RUnlock()
		if buf, ok := b.rasterData[widgetID]; ok {
			if y < len(buf) && x < len(buf[y]) {
				return buf[y][x]
			}
		}
		return color.White
	})

	raster.SetMinSize(fyne.NewSize(float32(width), float32(height)))

	b.mu.Lock()
	b.widgets[widgetID] = raster
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasraster", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleUpdateCanvasRaster(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	widget, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Raster widget not found",
		})
		return
	}

	raster, ok := widget.(*canvas.Raster)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a raster",
		})
		return
	}

	// Update individual pixels if provided
	if updates, ok := msg.Payload["updates"].([]interface{}); ok {
		b.mu.Lock()
		buf := b.rasterData[widgetID]
		for _, upd := range updates {
			if updMap, ok := upd.(map[string]interface{}); ok {
				x := int(updMap["x"].(float64))
				y := int(updMap["y"].(float64))
				r := uint8(updMap["r"].(float64))
				g := uint8(updMap["g"].(float64))
				bl := uint8(updMap["b"].(float64))
				a := uint8(updMap["a"].(float64))

				if y >= 0 && y < len(buf) && x >= 0 && x < len(buf[y]) {
					buf[y][x] = color.RGBA{R: r, G: g, B: bl, A: a}
				}
			}
		}
		b.mu.Unlock()
	}

	// Refresh the raster to show updates
	raster.Refresh()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCreateCanvasLinearGradient(msg Message) {
	widgetID := msg.Payload["id"].(string)

	// Parse start and end colors
	var startColor color.Color = color.White
	var endColor color.Color = color.Black

	if startHex, ok := msg.Payload["startColor"].(string); ok {
		startColor = parseHexColorSimple(startHex)
	}
	if endHex, ok := msg.Payload["endColor"].(string); ok {
		endColor = parseHexColorSimple(endHex)
	}

	gradient := canvas.NewLinearGradient(startColor, endColor, 0)

	// Set angle if provided (in degrees)
	if angle, ok := msg.Payload["angle"].(float64); ok {
		gradient.Angle = angle
	}

	// Set minimum size if provided
	if width, ok := msg.Payload["width"].(float64); ok {
		if height, ok := msg.Payload["height"].(float64); ok {
			gradient.SetMinSize(fyne.NewSize(float32(width), float32(height)))
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = gradient
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvaslineargradient", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleUpdateCanvasLine(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	widget, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Line widget not found",
		})
		return
	}

	line, ok := widget.(*canvas.Line)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a line",
		})
		return
	}

	// Update position if provided
	if x1, ok := msg.Payload["x1"].(float64); ok {
		if y1, ok := msg.Payload["y1"].(float64); ok {
			line.Position1 = fyne.NewPos(float32(x1), float32(y1))
		}
	}
	if x2, ok := msg.Payload["x2"].(float64); ok {
		if y2, ok := msg.Payload["y2"].(float64); ok {
			line.Position2 = fyne.NewPos(float32(x2), float32(y2))
		}
	}

	// Update stroke color if provided
	if colorHex, ok := msg.Payload["strokeColor"].(string); ok {
		line.StrokeColor = parseHexColorSimple(colorHex)
	}

	// Update stroke width if provided
	if strokeWidth, ok := msg.Payload["strokeWidth"].(float64); ok {
		line.StrokeWidth = float32(strokeWidth)
	}

	line.Refresh()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleUpdateCanvasCircle(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	widget, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Circle widget not found",
		})
		return
	}

	circle, ok := widget.(*canvas.Circle)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a circle",
		})
		return
	}

	// Update fill color if provided
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		circle.FillColor = parseHexColorSimple(fillHex)
	}

	// Update stroke color if provided
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		circle.StrokeColor = parseHexColorSimple(strokeHex)
	}

	// Update stroke width if provided
	if strokeWidth, ok := msg.Payload["strokeWidth"].(float64); ok {
		circle.StrokeWidth = float32(strokeWidth)
	}

	// Update position if provided
	if x, ok := msg.Payload["x"].(float64); ok {
		if y, ok := msg.Payload["y"].(float64); ok {
			circle.Position1 = fyne.NewPos(float32(x), float32(y))
		}
	}
	if x2, ok := msg.Payload["x2"].(float64); ok {
		if y2, ok := msg.Payload["y2"].(float64); ok {
			circle.Position2 = fyne.NewPos(float32(x2), float32(y2))
		}
	}

	circle.Refresh()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleUpdateCanvasRectangle(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	widget, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Rectangle widget not found",
		})
		return
	}

	rect, ok := widget.(*canvas.Rectangle)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a rectangle",
		})
		return
	}

	// Update fill color if provided
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		rect.FillColor = parseHexColorSimple(fillHex)
	}

	// Update stroke color if provided
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		rect.StrokeColor = parseHexColorSimple(strokeHex)
	}

	// Update stroke width if provided
	if strokeWidth, ok := msg.Payload["strokeWidth"].(float64); ok {
		rect.StrokeWidth = float32(strokeWidth)
	}

	// Update corner radius if provided
	if radius, ok := msg.Payload["cornerRadius"].(float64); ok {
		rect.CornerRadius = float32(radius)
	}

	// Update size if provided
	if width, ok := msg.Payload["width"].(float64); ok {
		if height, ok := msg.Payload["height"].(float64); ok {
			rect.SetMinSize(fyne.NewSize(float32(width), float32(height)))
		}
	}

	rect.Refresh()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleUpdateCanvasText(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	widget, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Canvas text widget not found",
		})
		return
	}

	canvasText, ok := widget.(*canvas.Text)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a canvas text",
		})
		return
	}

	// Update text if provided
	if text, ok := msg.Payload["text"].(string); ok {
		canvasText.Text = text
	}

	// Update color if provided
	if colorHex, ok := msg.Payload["color"].(string); ok {
		canvasText.Color = parseHexColorSimple(colorHex)
	}

	// Update text size if provided
	if textSize, ok := msg.Payload["textSize"].(float64); ok {
		canvasText.TextSize = float32(textSize)
	}

	canvasText.Refresh()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleUpdateCanvasLinearGradient(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	widget, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Gradient widget not found",
		})
		return
	}

	gradient, ok := widget.(*canvas.LinearGradient)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a linear gradient",
		})
		return
	}

	// Update start color if provided
	if startHex, ok := msg.Payload["startColor"].(string); ok {
		gradient.StartColor = parseHexColorSimple(startHex)
	}

	// Update end color if provided
	if endHex, ok := msg.Payload["endColor"].(string); ok {
		gradient.EndColor = parseHexColorSimple(endHex)
	}

	// Update angle if provided
	if angle, ok := msg.Payload["angle"].(float64); ok {
		gradient.Angle = angle
	}

	gradient.Refresh()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

// parseHexColorSimple parses a hex color string (e.g., "#FF0000" or "FF0000") to color.Color
// This is a simpler version that returns a default color on error, used by canvas primitives
func parseHexColorSimple(hexStr string) color.Color {
	// Remove leading # if present
	if len(hexStr) > 0 && hexStr[0] == '#' {
		hexStr = hexStr[1:]
	}

	// Parse hex values
	var r, g, bl, a uint8
	a = 255 // Default alpha

	switch len(hexStr) {
	case 6: // RGB
		fmt.Sscanf(hexStr, "%02x%02x%02x", &r, &g, &bl)
	case 8: // RGBA
		fmt.Sscanf(hexStr, "%02x%02x%02x%02x", &r, &g, &bl, &a)
	case 3: // Short RGB (e.g., "F00" for red)
		var sr, sg, sb uint8
		fmt.Sscanf(hexStr, "%1x%1x%1x", &sr, &sg, &sb)
		r, g, bl = sr*17, sg*17, sb*17
	default:
		return color.Black
	}

	return color.RGBA{R: r, G: g, B: bl, A: a}
}

func (b *Bridge) handleCreateInnerWindow(msg Message) {
	widgetID := msg.Payload["id"].(string)
	title := msg.Payload["title"].(string)
	contentID := msg.Payload["contentId"].(string)

	b.mu.RLock()
	content, exists := b.widgets[contentID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Content widget not found: %s", contentID),
		})
		return
	}

	innerWindow := container.NewInnerWindow(title, content)

	// Set up onClose callback if provided
	if closeCallbackID, ok := msg.Payload["onCloseCallbackId"].(string); ok {
		innerWindow.CloseIntercept = func() {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": closeCallbackID,
				},
			})
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = innerWindow
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "innerwindow", Text: title}
	b.childToParent[contentID] = widgetID
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleInnerWindowClose(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	widget, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "InnerWindow not found",
		})
		return
	}

	innerWindow, ok := widget.(*container.InnerWindow)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an InnerWindow",
		})
		return
	}

	innerWindow.Close()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleSetInnerWindowTitle(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	title := msg.Payload["title"].(string)

	b.mu.RLock()
	_, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "InnerWindow not found",
		})
		return
	}

	// Note: Fyne's InnerWindow title is set at creation time and cannot be changed
	// We update the metadata for tracking purposes
	// To change the title, the window would need to be recreated
	b.mu.Lock()
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "innerwindow", Text: title}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

// TextGridStyleImpl implements widget.TextGridStyle for custom cell styling
type TextGridStyleImpl struct {
	FGColor color.Color
	BGColor color.Color
	Style   fyne.TextStyle
}

func (s *TextGridStyleImpl) TextColor() color.Color {
	return s.FGColor
}

func (s *TextGridStyleImpl) BackgroundColor() color.Color {
	return s.BGColor
}

func (b *Bridge) handleCreateTextGrid(msg Message) {
	widgetID := msg.Payload["id"].(string)
	text, _ := msg.Payload["text"].(string)
	showLineNumbers, _ := msg.Payload["showLineNumbers"].(bool)
	showWhitespace, _ := msg.Payload["showWhitespace"].(bool)

	var textGrid *widget.TextGrid
	if text != "" {
		textGrid = widget.NewTextGridFromString(text)
	} else {
		textGrid = widget.NewTextGrid()
	}

	textGrid.ShowLineNumbers = showLineNumbers
	textGrid.ShowWhitespace = showWhitespace

	b.mu.Lock()
	b.widgets[widgetID] = textGrid
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "textgrid", Text: text}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleSetTextGridText(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	text := msg.Payload["text"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	textGrid, ok := w.(*widget.TextGrid)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a TextGrid",
		})
		return
	}

	textGrid.SetText(text)
	textGrid.Refresh()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleSetTextGridCell(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	row := int(msg.Payload["row"].(float64))
	col := int(msg.Payload["col"].(float64))
	char, hasChar := msg.Payload["char"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	textGrid, ok := w.(*widget.TextGrid)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a TextGrid",
		})
		return
	}

	if hasChar && len(char) > 0 {
		// Set rune at position
		textGrid.SetRune(row, col, rune(char[0]))
	}

	// Apply style if provided
	if styleData, ok := msg.Payload["style"].(map[string]interface{}); ok {
		style := parseTextGridStyle(styleData)
		textGrid.SetStyle(row, col, style)
	}

	textGrid.Refresh()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleSetTextGridRow(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	row := int(msg.Payload["row"].(float64))
	text := msg.Payload["text"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	textGrid, ok := w.(*widget.TextGrid)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a TextGrid",
		})
		return
	}

	// Create TextGridRow from text
	cells := make([]widget.TextGridCell, len(text))
	for i, r := range text {
		cells[i] = widget.TextGridCell{Rune: r}
	}

	// Apply style if provided
	if styleData, ok := msg.Payload["style"].(map[string]interface{}); ok {
		style := parseTextGridStyle(styleData)
		for i := range cells {
			cells[i].Style = style
		}
	}

	textGrid.SetRow(row, widget.TextGridRow{Cells: cells})
	textGrid.Refresh()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleSetTextGridStyle(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	row := int(msg.Payload["row"].(float64))
	col := int(msg.Payload["col"].(float64))
	styleData := msg.Payload["style"].(map[string]interface{})

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	textGrid, ok := w.(*widget.TextGrid)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a TextGrid",
		})
		return
	}

	style := parseTextGridStyle(styleData)
	textGrid.SetStyle(row, col, style)
	textGrid.Refresh()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleSetTextGridStyleRange(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	startRow := int(msg.Payload["startRow"].(float64))
	startCol := int(msg.Payload["startCol"].(float64))
	endRow := int(msg.Payload["endRow"].(float64))
	endCol := int(msg.Payload["endCol"].(float64))
	styleData := msg.Payload["style"].(map[string]interface{})

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	textGrid, ok := w.(*widget.TextGrid)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a TextGrid",
		})
		return
	}

	style := parseTextGridStyle(styleData)
	textGrid.SetStyleRange(startRow, startCol, endRow, endCol, style)
	textGrid.Refresh()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleGetTextGridText(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	textGrid, ok := w.(*widget.TextGrid)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a TextGrid",
		})
		return
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"text": textGrid.Text()},
	})
}

// parseTextGridStyle parses style data from TypeScript into a TextGridStyle
func parseTextGridStyle(styleData map[string]interface{}) widget.TextGridStyle {
	style := &TextGridStyleImpl{
		FGColor: nil,
		BGColor: nil,
		Style:   fyne.TextStyle{},
	}

	// Parse foreground color (hex string like "#ff0000" or "red")
	if fgHex, ok := styleData["fgColor"].(string); ok && fgHex != "" {
		style.FGColor = parseColorHex(fgHex)
	}

	// Parse background color
	if bgHex, ok := styleData["bgColor"].(string); ok && bgHex != "" {
		style.BGColor = parseColorHex(bgHex)
	}

	// Parse text style flags
	if bold, ok := styleData["bold"].(bool); ok && bold {
		style.Style.Bold = true
	}
	if italic, ok := styleData["italic"].(bool); ok && italic {
		style.Style.Italic = true
	}
	if monospace, ok := styleData["monospace"].(bool); ok && monospace {
		style.Style.Monospace = true
	}

	return style
}

// parseColorHex parses a hex color string into color.Color
func parseColorHex(hex string) color.Color {
	// Handle named colors
	switch strings.ToLower(hex) {
	case "black":
		return color.Black
	case "white":
		return color.White
	case "red":
		return color.RGBA{R: 255, G: 0, B: 0, A: 255}
	case "green":
		return color.RGBA{R: 0, G: 255, B: 0, A: 255}
	case "blue":
		return color.RGBA{R: 0, G: 0, B: 255, A: 255}
	case "yellow":
		return color.RGBA{R: 255, G: 255, B: 0, A: 255}
	case "cyan":
		return color.RGBA{R: 0, G: 255, B: 255, A: 255}
	case "magenta":
		return color.RGBA{R: 255, G: 0, B: 255, A: 255}
	case "gray", "grey":
		return color.RGBA{R: 128, G: 128, B: 128, A: 255}
	}

	// Handle hex colors (#RGB, #RRGGBB, #RRGGBBAA)
	if strings.HasPrefix(hex, "#") {
		hex = hex[1:]
	}

	var r, g, b, a uint8 = 0, 0, 0, 255

	switch len(hex) {
	case 3: // #RGB
		fmt.Sscanf(hex, "%1x%1x%1x", &r, &g, &b)
		r *= 17
		g *= 17
		b *= 17
	case 6: // #RRGGBB
		fmt.Sscanf(hex, "%2x%2x%2x", &r, &g, &b)
	case 8: // #RRGGBBAA
		fmt.Sscanf(hex, "%2x%2x%2x%2x", &r, &g, &b, &a)
	}

	return color.RGBA{R: r, G: g, B: b, A: a}
}
