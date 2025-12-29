package main

import (
	"bytes"
	"image"
	"image/color"
	"log"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/widget"
)

// ============================================================================
// Complex/Data Widgets: Tree, Table, List, Menu, Toolbar, TextGrid
// ============================================================================

func (b *Bridge) handleCreateTree(msg Message) Response {
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

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleCreateTable(msg Message) Response {
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

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleCreateList(msg Message) Response {
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

	// Handle unselection callback if provided
	if onUnselectedCallbackID, ok := msg.Payload["onUnselectedCallbackId"].(string); ok {
		list.OnUnselected = func(itemID widget.ListItemID) {
			b.mu.RLock()
			listData := b.listData[id]
			b.mu.RUnlock()

			var unselectedItem string
			if itemID < len(listData) {
				unselectedItem = listData[itemID]
			}

			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": onUnselectedCallbackID,
					"index":      itemID,
					"item":       unselectedItem,
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

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleCreateMenu(msg Message) Response {
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

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleCreateToolbar(msg Message) Response {
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

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// ============================================================================
// TextGrid Widget - Terminal-style text display
// ============================================================================

func (b *Bridge) handleCreateTextGrid(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	text, _ := msg.Payload["text"].(string)
	showLineNumbers, _ := msg.Payload["showLineNumbers"].(bool)
	showWhitespace, _ := msg.Payload["showWhitespace"].(bool)

	// Extract optional keyboard callback IDs
	onKeyDownCallbackId, _ := msg.Payload["onKeyDownCallbackId"].(string)
	onKeyUpCallbackId, _ := msg.Payload["onKeyUpCallbackId"].(string)
	onTypedCallbackId, _ := msg.Payload["onTypedCallbackId"].(string)
	onFocusCallbackId, _ := msg.Payload["onFocusCallbackId"].(string)

	var textGrid *widget.TextGrid
	if text != "" {
		textGrid = widget.NewTextGridFromString(text)
	} else {
		textGrid = widget.NewTextGrid()
	}

	textGrid.ShowLineNumbers = showLineNumbers
	textGrid.ShowWhitespace = showWhitespace

	// Create TsyneTextGrid wrapper for focusable/keyboard support
	tsyneTextGrid := NewTsyneTextGrid(textGrid, b, widgetID)
	tsyneTextGrid.SetCallbackIds(onKeyDownCallbackId, onKeyUpCallbackId, onTypedCallbackId, onFocusCallbackId)

	b.mu.Lock()
	b.widgets[widgetID] = tsyneTextGrid
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "textgrid", Text: text}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleSetTextGridText(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	text := msg.Payload["text"].(string)

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

	tsyneTextGrid, ok := w.(*TsyneTextGrid)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a TextGrid",
		}
	}

	fyne.DoAndWait(func() {
		tsyneTextGrid.TextGrid.SetText(text)
		tsyneTextGrid.TextGrid.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleSetTextGridCell(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	row := toInt(msg.Payload["row"])
	col := toInt(msg.Payload["col"])
	char, hasChar := msg.Payload["char"].(string)

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

	tsyneTextGrid, ok := w.(*TsyneTextGrid)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a TextGrid",
		}
	}

	fyne.DoAndWait(func() {
		if hasChar && len(char) > 0 {
			// Set rune at position
			tsyneTextGrid.TextGrid.SetRune(row, col, rune(char[0]))
		}

		// Apply style if provided
		if styleData, ok := msg.Payload["style"].(map[string]interface{}); ok {
			style := parseTextGridStyle(styleData)
			tsyneTextGrid.TextGrid.SetStyle(row, col, style)
		}

		tsyneTextGrid.TextGrid.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleSetTextGridRow(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	row := toInt(msg.Payload["row"])
	text := msg.Payload["text"].(string)

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

	tsyneTextGrid, ok := w.(*TsyneTextGrid)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a TextGrid",
		}
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

	fyne.DoAndWait(func() {
		tsyneTextGrid.TextGrid.SetRow(row, widget.TextGridRow{Cells: cells})
		tsyneTextGrid.TextGrid.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleSetTextGridStyle(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	row := toInt(msg.Payload["row"])
	col := toInt(msg.Payload["col"])
	styleData := msg.Payload["style"].(map[string]interface{})

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

	tsyneTextGrid, ok := w.(*TsyneTextGrid)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a TextGrid",
		}
	}

	style := parseTextGridStyle(styleData)
	fyne.DoAndWait(func() {
		tsyneTextGrid.TextGrid.SetStyle(row, col, style)
		tsyneTextGrid.TextGrid.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleSetTextGridStyleRange(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	startRow := toInt(msg.Payload["startRow"])
	startCol := toInt(msg.Payload["startCol"])
	endRow := toInt(msg.Payload["endRow"])
	endCol := toInt(msg.Payload["endCol"])
	styleData := msg.Payload["style"].(map[string]interface{})

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

	tsyneTextGrid, ok := w.(*TsyneTextGrid)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a TextGrid",
		}
	}

	style := parseTextGridStyle(styleData)
	fyne.DoAndWait(func() {
		tsyneTextGrid.TextGrid.SetStyleRange(startRow, startCol, endRow, endCol, style)
		tsyneTextGrid.TextGrid.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleGetTextGridText(msg Message) Response {
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

	tsyneTextGrid, ok := w.(*TsyneTextGrid)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a TextGrid",
		}
	}

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"text": tsyneTextGrid.TextGrid.Text()},
	}
}

// TextGridStyleImpl implements widget.TextGridStyle
type TextGridStyleImpl struct {
	FGColor   color.Color
	BGColor   color.Color
	TextStyle fyne.TextStyle
}

func (s *TextGridStyleImpl) TextColor() color.Color {
	return s.FGColor
}

func (s *TextGridStyleImpl) BackgroundColor() color.Color {
	return s.BGColor
}

func (s *TextGridStyleImpl) Style() fyne.TextStyle {
	return s.TextStyle
}

// parseTextGridStyle parses style data from TypeScript into a TextGridStyle
func parseTextGridStyle(styleData map[string]interface{}) widget.TextGridStyle {
	style := &TextGridStyleImpl{
		FGColor:   nil,
		BGColor:   nil,
		TextStyle: fyne.TextStyle{},
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
		style.TextStyle.Bold = true
	}
	if italic, ok := styleData["italic"].(bool); ok && italic {
		style.TextStyle.Italic = true
	}
	if monospace, ok := styleData["monospace"].(bool); ok && monospace {
		style.TextStyle.Monospace = true
	}

	return style
}

// parseColorHex parses a hex color string to color.Color
func parseColorHex(hexStr string) color.Color {
	// Remove leading # if present
	if len(hexStr) > 0 && hexStr[0] == '#' {
		hexStr = hexStr[1:]
	}

	// Handle named colors
	switch hexStr {
	case "black":
		return color.RGBA{R: 0, G: 0, B: 0, A: 255}
	case "white":
		return color.RGBA{R: 255, G: 255, B: 255, A: 255}
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

	// Parse as hex
	var r, g, b, a uint8 = 0, 0, 0, 255

	switch len(hexStr) {
	case 3: // #RGB
		var rh, gh, bh uint8
		for i, c := range hexStr {
			val := hexCharToInt(c)
			switch i {
			case 0:
				rh = val
			case 1:
				gh = val
			case 2:
				bh = val
			}
		}
		r, g, b = rh*17, gh*17, bh*17
	case 6: // #RRGGBB
		for i := 0; i < 3; i++ {
			high := hexCharToInt(rune(hexStr[i*2]))
			low := hexCharToInt(rune(hexStr[i*2+1]))
			val := high*16 + low
			switch i {
			case 0:
				r = val
			case 1:
				g = val
			case 2:
				b = val
			}
		}
	case 8: // #RRGGBBAA
		for i := 0; i < 4; i++ {
			high := hexCharToInt(rune(hexStr[i*2]))
			low := hexCharToInt(rune(hexStr[i*2+1]))
			val := high*16 + low
			switch i {
			case 0:
				r = val
			case 1:
				g = val
			case 2:
				b = val
			case 3:
				a = val
			}
		}
	}

	return color.RGBA{R: r, G: g, B: b, A: a}
}

func hexCharToInt(c rune) uint8 {
	switch {
	case c >= '0' && c <= '9':
		return uint8(c - '0')
	case c >= 'a' && c <= 'f':
		return uint8(c - 'a' + 10)
	case c >= 'A' && c <= 'F':
		return uint8(c - 'A' + 10)
	}
	return 0
}

// =============================================================================
// Desktop Canvas handlers - for draggable icon desktop
// =============================================================================

func (b *Bridge) handleCreateDesktopCanvas(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	bgColorStr, _ := msg.Payload["bgColor"].(string)

	// Parse background color (default to dark blue)
	var bgColor color.Color = color.RGBA{R: 30, G: 60, B: 90, A: 255}
	if bgColorStr != "" {
		bgColor = parseColorHex(bgColorStr)
	}

	desktop := NewTsyneDesktopCanvas(widgetID, bgColor, b)

	b.mu.Lock()
	b.widgets[widgetID] = desktop
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "desktopCanvas"}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleCreateDesktopIcon(msg Message) Response {
	iconID := msg.Payload["id"].(string)
	desktopID := msg.Payload["desktopId"].(string)
	label, _ := msg.Payload["label"].(string)
	x := toFloat64(msg.Payload["x"])
	y := toFloat64(msg.Payload["y"])
	colorStr, _ := msg.Payload["color"].(string)
	resourceName, _ := msg.Payload["resource"].(string)

	// Extract callback IDs
	onDragCallbackId, _ := msg.Payload["onDragCallbackId"].(string)
	onDragEndCallbackId, _ := msg.Payload["onDragEndCallbackId"].(string)
	onClickCallbackId, _ := msg.Payload["onClickCallbackId"].(string)
	onDblClickCallbackId, _ := msg.Payload["onDblClickCallbackId"].(string)
	onRightClickCallbackId, _ := msg.Payload["onRightClickCallbackId"].(string)

	// Get the desktop canvas
	b.mu.RLock()
	desktopWidget, exists := b.widgets[desktopID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Desktop canvas not found",
		}
	}

	desktop, ok := desktopWidget.(*TsyneDesktopCanvas)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a desktop canvas",
		}
	}

	// Parse icon color (default to blue)
	var iconColor color.Color = color.RGBA{R: 50, G: 100, B: 220, A: 255}
	if colorStr != "" {
		iconColor = parseColorHex(colorStr)
	}

	// Decode optional image resource
	var iconImage image.Image
	if resourceName != "" {
		if resourceData, exists := b.getResource(resourceName); exists {
			decoded, _, err := image.Decode(bytes.NewReader(resourceData))
			if err != nil {
				log.Printf("Failed to decode desktop icon resource %s: %v", resourceName, err)
			} else {
				iconImage = trimTransparentPadding(decoded)
			}
		} else {
			log.Printf("Desktop icon resource not found: %s", resourceName)
		}
	}

	// Extract onDropReceived callback ID
	onDropReceivedCallbackId, _ := msg.Payload["onDropReceivedCallbackId"].(string)

	// Create the icon
	icon := NewTsyneDraggableIcon(iconID, label, iconColor, float32(x), float32(y), desktop, b, iconImage)
	icon.SetCallbackIds(onDragCallbackId, onDragEndCallbackId, onClickCallbackId, onDblClickCallbackId, onRightClickCallbackId, onDropReceivedCallbackId)

	// Add to desktop
	desktop.AddIcon(icon)

	// Store reference
	b.mu.Lock()
	b.widgets[iconID] = icon
	b.widgetMeta[iconID] = WidgetMetadata{Type: "desktopIcon", Text: label}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"iconId": iconID},
	}
}

func (b *Bridge) handleMoveDesktopIcon(msg Message) Response {
	iconID := msg.Payload["iconId"].(string)
	x := toFloat64(msg.Payload["x"])
	y := toFloat64(msg.Payload["y"])

	b.mu.RLock()
	iconWidget, exists := b.widgets[iconID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Icon not found",
		}
	}

	icon, ok := iconWidget.(*TsyneDraggableIcon)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a desktop icon",
		}
	}

	icon.PosX = float32(x)
	icon.PosY = float32(y)

	if icon.desktop != nil {
		icon.desktop.MoveIcon(icon)
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleUpdateDesktopIconLabel(msg Message) Response {
	iconID := msg.Payload["iconId"].(string)
	label := msg.Payload["label"].(string)

	b.mu.RLock()
	iconWidget, exists := b.widgets[iconID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Icon not found",
		}
	}

	icon, ok := iconWidget.(*TsyneDraggableIcon)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a desktop icon",
		}
	}

	icon.Label = label
	icon.TextObj.Text = label
	icon.Refresh()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleUpdateDesktopIconColor(msg Message) Response {
	iconID := msg.Payload["iconId"].(string)
	colorStr := msg.Payload["color"].(string)

	b.mu.RLock()
	iconWidget, exists := b.widgets[iconID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Icon not found",
		}
	}

	icon, ok := iconWidget.(*TsyneDraggableIcon)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a desktop icon",
		}
	}

	icon.IconRect.FillColor = parseColorHex(colorStr)
	icon.Refresh()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// =============================================================================
// DesktopMDI - Combined Desktop Canvas + MDI Container
// Solves the layering problem by combining both in a single widget
// =============================================================================

func (b *Bridge) handleCreateDesktopMDI(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	bgColorStr, _ := msg.Payload["bgColor"].(string)

	// Parse background color (default to dark blue)
	var bgColor color.Color = color.RGBA{R: 45, G: 90, B: 135, A: 255}
	if bgColorStr != "" {
		bgColor = parseColorHex(bgColorStr)
	}

	desktop := NewTsyneDesktopMDI(widgetID, bgColor, b)

	b.mu.Lock()
	b.widgets[widgetID] = desktop
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "desktopMDI"}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleDesktopMDIAddIcon(msg Message) Response {
	iconID := msg.Payload["id"].(string)
	desktopID := msg.Payload["desktopId"].(string)
	label, _ := msg.Payload["label"].(string)
	x := toFloat64(msg.Payload["x"])
	y := toFloat64(msg.Payload["y"])
	colorStr, _ := msg.Payload["color"].(string)
	resourceName, _ := msg.Payload["resource"].(string)

	// Extract callback IDs
	onDragCallbackId, _ := msg.Payload["onDragCallbackId"].(string)
	onDragEndCallbackId, _ := msg.Payload["onDragEndCallbackId"].(string)
	onClickCallbackId, _ := msg.Payload["onClickCallbackId"].(string)
	onDblClickCallbackId, _ := msg.Payload["onDblClickCallbackId"].(string)
	onRightClickCallbackId, _ := msg.Payload["onRightClickCallbackId"].(string)

	// Get the desktop MDI
	b.mu.RLock()
	desktopWidget, exists := b.widgets[desktopID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Desktop MDI not found",
		}
	}

	desktop, ok := desktopWidget.(*TsyneDesktopMDI)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a desktop MDI",
		}
	}

	// Parse icon color (default to blue)
	var iconColor color.Color = color.RGBA{R: 50, G: 100, B: 220, A: 255}
	if colorStr != "" {
		iconColor = parseColorHex(colorStr)
	}

	// Decode optional image resource
	var iconImage image.Image
	if resourceName != "" {
		if resourceData, exists := b.getResource(resourceName); exists {
			decoded, _, err := image.Decode(bytes.NewReader(resourceData))
			if err != nil {
				log.Printf("Failed to decode desktop icon resource %s: %v", resourceName, err)
			} else {
				iconImage = trimTransparentPadding(decoded)
			}
		} else {
			log.Printf("Desktop icon resource not found: %s", resourceName)
		}
	}

	// Extract onDropReceived callback ID
	onDropReceivedCallbackId, _ := msg.Payload["onDropReceivedCallbackId"].(string)

	// Create the icon using the MDI constructor
	icon := NewTsyneDraggableIconForMDI(iconID, label, iconColor, float32(x), float32(y), desktop, b, iconImage)
	icon.SetCallbackIds(onDragCallbackId, onDragEndCallbackId, onClickCallbackId, onDblClickCallbackId, onRightClickCallbackId, onDropReceivedCallbackId)

	// Add to desktop MDI
	desktop.AddIcon(icon)

	// Store reference
	b.mu.Lock()
	b.widgets[iconID] = icon
	b.widgetMeta[iconID] = WidgetMetadata{Type: "desktopIcon", Text: label}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"iconId": iconID},
	}
}

func (b *Bridge) handleDesktopMDIAddWindow(msg Message) Response {
	containerID := msg.Payload["containerId"].(string)
	windowID := msg.Payload["windowId"].(string)

	b.mu.RLock()
	containerObj, containerExists := b.widgets[containerID]
	windowObj, windowExists := b.widgets[windowID]
	b.mu.RUnlock()

	if !containerExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "DesktopMDI container not found",
		}
	}

	if !windowExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "InnerWindow not found",
		}
	}

	desktop, ok := containerObj.(*TsyneDesktopMDI)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a DesktopMDI container",
		}
	}

	innerWin, ok := windowObj.(*container.InnerWindow)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an InnerWindow",
		}
	}

	// Add the window to the container
	fyne.DoAndWait(func() {
		desktop.AddWindow(innerWin)

		// Position the window if coordinates provided, otherwise center it
		if x, ok := getFloat64(msg.Payload["x"]); ok {
			y := toFloat64(msg.Payload["y"])
			innerWin.Move(fyne.NewPos(float32(x), float32(y)))
		} else {
			// Center the window in the container
			containerSize := desktop.Size()
			windowSize := innerWin.MinSize()
			// Use a reasonable default size if MinSize is too small
			if windowSize.Width < 200 {
				windowSize.Width = 300
			}
			if windowSize.Height < 150 {
				windowSize.Height = 250
			}
			x := (containerSize.Width - windowSize.Width) / 2
			y := (containerSize.Height - windowSize.Height) / 2
			if x < 0 {
				x = 20
			}
			if y < 0 {
				y = 20
			}
			innerWin.Move(fyne.NewPos(x, y))
		}
	})

	b.mu.Lock()
	b.childToParent[windowID] = containerID
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleDesktopMDIRemoveWindow(msg Message) Response {
	containerID := msg.Payload["containerId"].(string)
	windowID := msg.Payload["windowId"].(string)

	b.mu.RLock()
	containerObj, containerExists := b.widgets[containerID]
	windowObj, windowExists := b.widgets[windowID]
	b.mu.RUnlock()

	if !containerExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "DesktopMDI container not found",
		}
	}

	if !windowExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "InnerWindow not found",
		}
	}

	desktop, ok := containerObj.(*TsyneDesktopMDI)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a DesktopMDI container",
		}
	}

	innerWin, ok := windowObj.(*container.InnerWindow)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an InnerWindow",
		}
	}

	// Remove the window from the container
	fyne.DoAndWait(func() {
		desktop.RemoveWindow(innerWin)
	})

	b.mu.Lock()
	delete(b.childToParent, windowID)
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}
