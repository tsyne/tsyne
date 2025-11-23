package main

// sync_handlers.go contains synchronous versions of handlers for gRPC use.
// These return results directly instead of via sendResponse() for stdout.

import (
	"fmt"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/widget"
)

// FindWidgetResult holds the result of a widget search
type FindWidgetResult struct {
	Success   bool
	WidgetIds []string
	Error     string
}

// FindWidgetSync searches for widgets by selector and returns results synchronously
func (b *Bridge) FindWidgetSync(selector string, selectorType string) FindWidgetResult {
	b.mu.RLock()

	// Resolve custom ID to real widget ID if needed
	resolvedSelector := selector
	if selectorType == "id" {
		if realID, exists := b.customIds[selector]; exists {
			resolvedSelector = realID
		}
	}

	var visibleMatches []string
	var hiddenMatches []string

	for widgetID, meta := range b.widgetMeta {
		var isMatch bool
		switch selectorType {
		case "text":
			isMatch = strings.Contains(meta.Text, selector)
		case "exactText":
			isMatch = meta.Text == selector
		case "type":
			isMatch = meta.Type == selector
		case "id":
			isMatch = widgetID == resolvedSelector
		case "placeholder":
			isMatch = meta.Placeholder == selector
		case "testId":
			isMatch = meta.TestId == selector
		case "role":
			if meta.CustomData != nil {
				if role, ok := meta.CustomData["a11y_role"].(string); ok {
					isMatch = role == selector
				}
			}
		case "label":
			if meta.CustomData != nil {
				if label, ok := meta.CustomData["a11y_label"].(string); ok {
					isMatch = strings.Contains(label, selector)
				}
			}
		}

		if isMatch {
			obj, exists := b.widgets[widgetID]
			if exists && obj.Visible() {
				visibleMatches = append(visibleMatches, widgetID)
			} else {
				hiddenMatches = append(hiddenMatches, widgetID)
			}
		}
	}

	// Check toolbar actions
	if selectorType == "id" {
		if _, exists := b.toolbarActions[selector]; exists {
			visibleMatches = append(visibleMatches, fmt.Sprintf("toolbar_action:%s", selector))
		}
	} else if selectorType == "text" || selectorType == "exactText" {
		for _, toolbarMeta := range b.toolbarItems {
			for _, label := range toolbarMeta.Labels {
				if label == "" {
					continue
				}
				var isMatch bool
				if selectorType == "text" {
					isMatch = strings.Contains(label, selector)
				} else {
					isMatch = label == selector
				}
				if isMatch {
					visibleMatches = append(visibleMatches, fmt.Sprintf("toolbar_action:%s", label))
				}
			}
		}
	}

	b.mu.RUnlock()

	// Prioritize visible widgets
	matches := append(visibleMatches, hiddenMatches...)

	// Remove duplicates
	uniqueMatches := make([]string, 0, len(matches))
	seen := make(map[string]bool)
	for _, match := range matches {
		if _, ok := seen[match]; !ok {
			uniqueMatches = append(uniqueMatches, match)
			seen[match] = true
		}
	}

	return FindWidgetResult{
		Success:   true,
		WidgetIds: uniqueMatches,
	}
}

// GetTextResult holds the result of getting text from a widget
type GetTextResult struct {
	Success bool
	Text    string
	Error   string
}

// GetTextSync gets text from a widget synchronously
func (b *Bridge) GetTextSync(widgetID string) GetTextResult {
	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	entryObj, hasEntry := b.widgets[widgetID+"_entry"]
	b.mu.RUnlock()

	if !exists {
		return GetTextResult{
			Success: false,
			Error:   "Widget not found",
		}
	}

	var text string

	// If we have a separate entry reference, use that
	if hasEntry {
		if entry, ok := entryObj.(*widget.Entry); ok {
			fyne.DoAndWait(func() {
				text = entry.Text
			})
			return GetTextResult{
				Success: true,
				Text:    text,
			}
		}
	}

	fyne.DoAndWait(func() {
		switch w := obj.(type) {
		case *widget.Entry:
			text = w.Text
		case *widget.Label:
			text = w.Text
		case *widget.Button:
			text = w.Text
		default:
			// Fall back to metadata
			b.mu.RLock()
			if meta, ok := b.widgetMeta[widgetID]; ok {
				text = meta.Text
			}
			b.mu.RUnlock()
		}
	})

	return GetTextResult{
		Success: true,
		Text:    text,
	}
}

// GetCheckedResult holds the result of getting checkbox state
type GetCheckedResult struct {
	Success bool
	Checked bool
	Error   string
}

// GetCheckedSync gets checkbox checked state synchronously
func (b *Bridge) GetCheckedSync(widgetID string) GetCheckedResult {
	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return GetCheckedResult{
			Success: false,
			Error:   "Widget not found",
		}
	}

	var checked bool
	var found bool

	fyne.DoAndWait(func() {
		if checkbox, ok := obj.(*widget.Check); ok {
			checked = checkbox.Checked
			found = true
		}
	})

	if !found {
		return GetCheckedResult{
			Success: false,
			Error:   "Widget is not a checkbox",
		}
	}

	return GetCheckedResult{
		Success: true,
		Checked: checked,
	}
}

// GetProgressResult holds the result of getting progress value
type GetProgressResult struct {
	Success bool
	Value   float64
	Error   string
}

// GetProgressSync gets progress bar value synchronously
func (b *Bridge) GetProgressSync(widgetID string) GetProgressResult {
	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return GetProgressResult{
			Success: false,
			Error:   "Widget not found",
		}
	}

	var value float64
	var found bool

	fyne.DoAndWait(func() {
		if progress, ok := obj.(*widget.ProgressBar); ok {
			value = progress.Value
			found = true
		}
	})

	if !found {
		return GetProgressResult{
			Success: false,
			Error:   "Widget is not a progress bar",
		}
	}

	return GetProgressResult{
		Success: true,
		Value:   value,
	}
}

// WidgetInfoResult holds widget information
type WidgetInfoResult struct {
	Success   bool
	ID        string
	Type      string
	Text      string
	X         float32
	Y         float32
	AbsoluteX float32
	AbsoluteY float32
	Width     float32
	Height    float32
	Error     string
}

// GetWidgetInfoSync gets widget info synchronously
func (b *Bridge) GetWidgetInfoSync(widgetID string) WidgetInfoResult {
	b.mu.RLock()
	obj, widgetExists := b.widgets[widgetID]
	meta, metaExists := b.widgetMeta[widgetID]
	b.mu.RUnlock()

	if !widgetExists {
		return WidgetInfoResult{
			Success: false,
			Error:   "Widget not found",
		}
	}

	result := WidgetInfoResult{
		Success: true,
		ID:      widgetID,
		Type:    "unknown",
	}

	if metaExists {
		result.Type = meta.Type
		result.Text = meta.Text
	}

	fyne.DoAndWait(func() {
		pos := obj.Position()
		size := obj.Size()
		absPos := b.app.Driver().AbsolutePositionForObject(obj)

		result.X = pos.X
		result.Y = pos.Y
		result.AbsoluteX = absPos.X
		result.AbsoluteY = absPos.Y
		result.Width = size.Width
		result.Height = size.Height

		switch w := obj.(type) {
		case *widget.Label:
			result.Text = w.Text
			result.Type = "label"
		case *widget.Entry:
			result.Text = w.Text
			result.Type = "entry"
		case *widget.Button:
			result.Text = w.Text
			result.Type = "button"
		}
	})

	return result
}

// AllWidgetsResult holds the list of all widgets
type AllWidgetsResult struct {
	Success bool
	Widgets []map[string]interface{}
	Error   string
}

// GetAllWidgetsSync gets all widgets synchronously
func (b *Bridge) GetAllWidgetsSync() AllWidgetsResult {
	b.mu.RLock()

	type widgetData struct {
		id   string
		obj  fyne.CanvasObject
		meta WidgetMetadata
	}

	widgetList := make([]widgetData, 0, len(b.widgetMeta))
	for widgetID, meta := range b.widgetMeta {
		if obj, exists := b.widgets[widgetID]; exists {
			widgetList = append(widgetList, widgetData{
				id:   widgetID,
				obj:  obj,
				meta: meta,
			})
		}
	}

	b.mu.RUnlock()

	widgets := make([]map[string]interface{}, 0, len(widgetList))

	fyne.DoAndWait(func() {
		for _, wd := range widgetList {
			widgetInfo := map[string]interface{}{
				"id":   wd.id,
				"type": wd.meta.Type,
				"text": wd.meta.Text,
			}

			switch w := wd.obj.(type) {
			case *widget.Label:
				widgetInfo["text"] = w.Text
			case *widget.Entry:
				widgetInfo["text"] = w.Text
			case *widget.Button:
				widgetInfo["text"] = w.Text
			}

			widgets = append(widgets, widgetInfo)
		}
	})

	return AllWidgetsResult{
		Success: true,
		Widgets: widgets,
	}
}
