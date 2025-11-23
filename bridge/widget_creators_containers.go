package main

import (
	"fmt"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/widget"
)

// ============================================================================
// Container Widgets: VBox, HBox, Scroll, Grid, Center, Clip, Max, Stack,
// Card, Accordion, Form, Border, GridWrap, AdaptiveGrid, Padded, Split,
// Tabs, DocTabs, ThemeOverride, InnerWindow, Navigation, Popup
// ============================================================================

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

func (b *Bridge) handleCreateStack(msg Message) {
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

	// NewStack stacks all widgets on top of each other (Z-layering)
	// Unlike Max, Stack preserves natural sizes - children are not forced to fill
	stackContainer := container.NewStack(children...)

	b.mu.Lock()
	b.widgets[widgetID] = stackContainer
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "stack", Text: ""}
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

func (b *Bridge) handleCreateAdaptiveGrid(msg Message) {
	widgetID := msg.Payload["id"].(string)
	rowcols := int(msg.Payload["rowcols"].(float64))
	childIDs, _ := msg.Payload["children"].([]interface{})

	var children []fyne.CanvasObject
	b.mu.RLock()
	for _, childID := range childIDs {
		if child, exists := b.widgets[childID.(string)]; exists {
			children = append(children, child)
		}
	}
	b.mu.RUnlock()

	adaptiveGrid := container.NewAdaptiveGrid(rowcols, children...)

	b.mu.Lock()
	b.widgets[widgetID] = adaptiveGrid
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "adaptivegrid", Text: ""}
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

func (b *Bridge) handleCreatePadded(msg Message) {
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

	padded := container.NewPadded(child)

	b.mu.Lock()
	b.widgets[widgetID] = padded
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "padded", Text: ""}
	b.childToParent[childID] = widgetID
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
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

func (b *Bridge) handleCreateDocTabs(msg Message) {
	id := msg.Payload["id"].(string)
	tabsInterface := msg.Payload["tabs"].([]interface{})
	closeCallbackID, hasCloseCallback := msg.Payload["closeCallbackId"].(string)

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

	docTabs := container.NewDocTabs(tabItems...)

	// Store tab info for close callback
	tabInfos := make([]map[string]interface{}, len(tabsInterface))
	for i, t := range tabsInterface {
		tabInfos[i] = t.(map[string]interface{})
	}

	// Set OnClosed callback if provided
	if hasCloseCallback {
		docTabs.OnClosed = func(item *container.TabItem) {
			// Find the tab info for this item
			for i, tabInfo := range tabInfos {
				if tabInfo["title"].(string) == item.Text {
					b.sendEvent(Event{
						Type: "callback",
						Data: map[string]interface{}{
							"callbackId": closeCallbackID,
							"tabIndex":   i,
							"tabTitle":   item.Text,
							"contentId":  tabInfo["contentId"].(string),
						},
					})
					break
				}
			}
		}
	}

	// Set location if provided (top, bottom, leading, trailing)
	if location, ok := msg.Payload["location"].(string); ok {
		switch location {
		case "top":
			docTabs.SetTabLocation(container.TabLocationTop)
		case "bottom":
			docTabs.SetTabLocation(container.TabLocationBottom)
		case "leading":
			docTabs.SetTabLocation(container.TabLocationLeading)
		case "trailing":
			docTabs.SetTabLocation(container.TabLocationTrailing)
		}
	}

	b.mu.Lock()
	b.widgets[id] = docTabs
	b.widgetMeta[id] = WidgetMetadata{
		Type: "doctabs",
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

func (b *Bridge) handleDocTabsAppend(msg Message) {
	id := msg.Payload["id"].(string)
	title := msg.Payload["title"].(string)
	contentID := msg.Payload["contentId"].(string)

	b.mu.RLock()
	widgetObj, exists := b.widgets[id]
	content, contentExists := b.widgets[contentID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("DocTabs not found: %s", id),
		})
		return
	}

	if !contentExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Tab content widget not found: %s", contentID),
		})
		return
	}

	docTabs, ok := widgetObj.(*container.DocTabs)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Widget is not a DocTabs: %s", id),
		})
		return
	}

	tabItem := container.NewTabItem(title, content)
	docTabs.Append(tabItem)

	// Select the new tab if requested
	if selectNew, ok := msg.Payload["select"].(bool); ok && selectNew {
		docTabs.Select(tabItem)
	}

	b.mu.Lock()
	b.childToParent[contentID] = id
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleDocTabsRemove(msg Message) {
	id := msg.Payload["id"].(string)
	tabIndex := int(msg.Payload["tabIndex"].(float64))

	b.mu.RLock()
	widgetObj, exists := b.widgets[id]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("DocTabs not found: %s", id),
		})
		return
	}

	docTabs, ok := widgetObj.(*container.DocTabs)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Widget is not a DocTabs: %s", id),
		})
		return
	}

	items := docTabs.Items
	if tabIndex < 0 || tabIndex >= len(items) {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Tab index out of range: %d", tabIndex),
		})
		return
	}

	docTabs.Remove(items[tabIndex])

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleDocTabsSelect(msg Message) {
	id := msg.Payload["id"].(string)
	tabIndex := int(msg.Payload["tabIndex"].(float64))

	b.mu.RLock()
	widgetObj, exists := b.widgets[id]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("DocTabs not found: %s", id),
		})
		return
	}

	docTabs, ok := widgetObj.(*container.DocTabs)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Widget is not a DocTabs: %s", id),
		})
		return
	}

	items := docTabs.Items
	if tabIndex < 0 || tabIndex >= len(items) {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Tab index out of range: %d", tabIndex),
		})
		return
	}

	docTabs.Select(items[tabIndex])

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCreateThemeOverride(msg Message) {
	widgetID := msg.Payload["id"].(string)
	childID := msg.Payload["childId"].(string)
	themeVariant := msg.Payload["variant"].(string) // "dark" or "light"

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

	// Create the appropriate theme based on variant
	var overrideTheme fyne.Theme
	if themeVariant == "dark" {
		// Create a dark theme override
		overrideTheme = &darkTheme{}
	} else {
		// Create a light theme override
		overrideTheme = &lightTheme{}
	}

	// Create the theme override container
	themeOverride := container.NewThemeOverride(child, overrideTheme)

	b.mu.Lock()
	b.widgets[widgetID] = themeOverride
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "themeoverride", Text: themeVariant}
	b.childToParent[childID] = widgetID
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
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
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "InnerWindow not found",
		})
		return
	}

	innerWindow, ok := w.(*container.InnerWindow)
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

func (b *Bridge) handleCreateNavigation(msg Message) {
	id := msg.Payload["id"].(string)
	rootID := msg.Payload["rootId"].(string)
	title, hasTitle := msg.Payload["title"].(string)

	b.mu.RLock()
	root, exists := b.widgets[rootID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Root widget not found",
		})
		return
	}

	var nav *container.Navigation
	if hasTitle && title != "" {
		nav = container.NewNavigationWithTitle(root, title)
	} else {
		nav = container.NewNavigation(root)
	}

	// Set OnBack callback if provided
	if onBackCallbackID, ok := msg.Payload["onBackCallbackId"].(string); ok {
		nav.OnBack = func() {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": onBackCallbackID,
				},
			})
		}
	}

	// Set OnForward callback if provided
	if onForwardCallbackID, ok := msg.Payload["onForwardCallbackId"].(string); ok {
		nav.OnForward = func() {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": onForwardCallbackID,
				},
			})
		}
	}

	b.mu.Lock()
	b.widgets[id] = nav
	b.widgetMeta[id] = WidgetMetadata{Type: "navigation", Text: title}
	b.childToParent[rootID] = id
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": id},
	})
}

func (b *Bridge) handleNavigationPush(msg Message) {
	navID := msg.Payload["navigationId"].(string)
	contentID := msg.Payload["contentId"].(string)
	title, hasTitle := msg.Payload["title"].(string)

	b.mu.RLock()
	navWidget, navExists := b.widgets[navID]
	content, contentExists := b.widgets[contentID]
	b.mu.RUnlock()

	if !navExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Navigation widget not found",
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

	nav, ok := navWidget.(*container.Navigation)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a Navigation container",
		})
		return
	}

	if hasTitle && title != "" {
		nav.PushWithTitle(content, title)
	} else {
		nav.Push(content)
	}

	b.mu.Lock()
	b.childToParent[contentID] = navID
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleNavigationBack(msg Message) {
	navID := msg.Payload["navigationId"].(string)

	b.mu.RLock()
	navWidget, exists := b.widgets[navID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Navigation widget not found",
		})
		return
	}

	nav, ok := navWidget.(*container.Navigation)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a Navigation container",
		})
		return
	}

	nav.Back()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleNavigationForward(msg Message) {
	navID := msg.Payload["navigationId"].(string)

	b.mu.RLock()
	navWidget, exists := b.widgets[navID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Navigation widget not found",
		})
		return
	}

	nav, ok := navWidget.(*container.Navigation)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a Navigation container",
		})
		return
	}

	nav.Forward()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleNavigationSetTitle(msg Message) {
	navID := msg.Payload["navigationId"].(string)
	title := msg.Payload["title"].(string)
	isCurrent, _ := msg.Payload["current"].(bool)

	b.mu.RLock()
	navWidget, exists := b.widgets[navID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Navigation widget not found",
		})
		return
	}

	nav, ok := navWidget.(*container.Navigation)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a Navigation container",
		})
		return
	}

	if isCurrent {
		nav.SetCurrentTitle(title)
	} else {
		nav.SetTitle(title)
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCreatePopup(msg Message) {
	widgetID := msg.Payload["id"].(string)
	contentID := msg.Payload["contentId"].(string)
	windowID := msg.Payload["windowId"].(string)

	b.mu.RLock()
	content, contentExists := b.widgets[contentID]
	win, windowExists := b.windows[windowID]
	b.mu.RUnlock()

	if !contentExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Content widget not found",
		})
		return
	}

	if !windowExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	// Create the popup widget
	popup := widget.NewPopUp(content, win.Canvas())

	// Initially hidden
	popup.Hide()

	b.mu.Lock()
	b.widgets[widgetID] = popup
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "popup", Text: ""}
	b.childToParent[contentID] = widgetID
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleShowPopup(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Popup widget not found",
		})
		return
	}

	popup, ok := w.(*widget.PopUp)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a popup",
		})
		return
	}

	// Show at position if provided, otherwise show centered
	if x, hasX := msg.Payload["x"].(float64); hasX {
		if y, hasY := msg.Payload["y"].(float64); hasY {
			popup.ShowAtPosition(fyne.NewPos(float32(x), float32(y)))
		} else {
			popup.Show()
		}
	} else {
		popup.Show()
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleHidePopup(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Popup widget not found",
		})
		return
	}

	popup, ok := w.(*widget.PopUp)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a popup",
		})
		return
	}

	popup.Hide()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleMovePopup(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	x := msg.Payload["x"].(float64)
	y := msg.Payload["y"].(float64)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Popup widget not found",
		})
		return
	}

	popup, ok := w.(*widget.PopUp)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a popup",
		})
		return
	}

	popup.Move(fyne.NewPos(float32(x), float32(y)))

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

// ============================================================================
// MultipleWindows - MDI container for managing multiple InnerWindows
// ============================================================================

func (b *Bridge) handleCreateMultipleWindows(msg Message) {
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

	// Cast children to InnerWindows
	var innerWindows []*container.InnerWindow
	for _, child := range children {
		if iw, ok := child.(*container.InnerWindow); ok {
			innerWindows = append(innerWindows, iw)
		}
	}

	// Create the MultipleWindows container
	multiWin := container.NewMultipleWindows(innerWindows...)

	b.mu.Lock()
	b.widgets[widgetID] = multiWin
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "multiplewindows", Text: ""}
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

func (b *Bridge) handleMultipleWindowsAddWindow(msg Message) {
	containerID := msg.Payload["containerId"].(string)
	windowID := msg.Payload["windowId"].(string)

	b.mu.RLock()
	containerObj, containerExists := b.widgets[containerID]
	windowObj, windowExists := b.widgets[windowID]
	b.mu.RUnlock()

	if !containerExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "MultipleWindows container not found",
		})
		return
	}

	if !windowExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "InnerWindow not found",
		})
		return
	}

	multiWin, ok := containerObj.(*container.MultipleWindows)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a MultipleWindows container",
		})
		return
	}

	innerWin, ok := windowObj.(*container.InnerWindow)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an InnerWindow",
		})
		return
	}

	// Add the window to the container
	fyne.DoAndWait(func() {
		multiWin.Add(innerWin)
	})

	b.mu.Lock()
	b.childToParent[windowID] = containerID
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleMultipleWindowsRemoveWindow(msg Message) {
	containerID := msg.Payload["containerId"].(string)
	windowID := msg.Payload["windowId"].(string)

	b.mu.RLock()
	containerObj, containerExists := b.widgets[containerID]
	windowObj, windowExists := b.widgets[windowID]
	b.mu.RUnlock()

	if !containerExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "MultipleWindows container not found",
		})
		return
	}

	if !windowExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "InnerWindow not found",
		})
		return
	}

	multiWin, ok := containerObj.(*container.MultipleWindows)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a MultipleWindows container",
		})
		return
	}

	innerWin, ok := windowObj.(*container.InnerWindow)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an InnerWindow",
		})
		return
	}

	// Remove the window from the container
	fyne.DoAndWait(func() {
		multiWin.Remove(innerWin)
	})

	b.mu.Lock()
	delete(b.childToParent, windowID)
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}
