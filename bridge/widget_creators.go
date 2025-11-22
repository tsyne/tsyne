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
