package main

import (
	"fmt"
	"image/color"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
)

// colorToHex converts a color.Color to a hex string (#RRGGBBAA or #RRGGBB)
func colorToHex(c color.Color) string {
	r, g, b, a := c.RGBA()
	// RGBA returns 16-bit values, scale to 8-bit
	r8 := uint8(r >> 8)
	g8 := uint8(g >> 8)
	b8 := uint8(b >> 8)
	a8 := uint8(a >> 8)
	if a8 == 255 {
		return fmt.Sprintf("#%02X%02X%02X", r8, g8, b8)
	}
	return fmt.Sprintf("#%02X%02X%02X%02X", r8, g8, b8, a8)
}

func (b *Bridge) handleSetMainMenu(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	menuItemsInterface := msg.Payload["menuItems"].([]interface{})

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

	// Build menu structure
	var menus []*fyne.Menu
	for _, menuInterface := range menuItemsInterface {
		menuData := menuInterface.(map[string]interface{})
		label := menuData["label"].(string)
		itemsInterface := menuData["items"].([]interface{})

		var items []*fyne.MenuItem
		for _, itemInterface := range itemsInterface {
			itemData := itemInterface.(map[string]interface{})
			itemLabel := itemData["label"].(string)

			// Check if this is a separator
			if isSeparator, ok := itemData["isSeparator"].(bool); ok && isSeparator {
				items = append(items, fyne.NewMenuItemSeparator())
				continue
			}

			// Regular menu item with callback
			if callbackID, ok := itemData["callbackId"].(string); ok {
				menuItem := fyne.NewMenuItem(itemLabel, func() {
					b.sendEvent(Event{
						Type: "callback",
						Data: map[string]interface{}{
							"callbackId": callbackID,
						},
					})
				})

				// Set disabled state if provided
				if disabled, ok := itemData["disabled"].(bool); ok {
					menuItem.Disabled = disabled
				}

				// Set checked state if provided
				if checked, ok := itemData["checked"].(bool); ok {
					menuItem.Checked = checked
				}

				items = append(items, menuItem)
			}
		}

		menus = append(menus, fyne.NewMenu(label, items...))
	}

	mainMenu := fyne.NewMainMenu(menus...)
	// Setting window menu must happen on the main thread
	fyne.DoAndWait(func() {
		win.SetMainMenu(mainMenu)
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleSetWidgetContextMenu(msg Message) Response {
	widgetID, ok := msg.Payload["widgetId"].(string)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "widgetId is required",
		}
	}

	items, ok := msg.Payload["items"].([]interface{})
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "items array is required",
		}
	}

	b.mu.Lock()
	defer b.mu.Unlock()

	obj, exists := b.widgets[widgetID]
	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	// Build menu items
	var menuItems []*fyne.MenuItem
	for _, item := range items {
		itemMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		label, ok := itemMap["label"].(string)
		if !ok {
			continue
		}

		// Check if it's a separator
		if isSep, ok := itemMap["isSeparator"].(bool); ok && isSep {
			menuItems = append(menuItems, fyne.NewMenuItemSeparator())
			continue
		}

		// Get callback ID
		callbackID, _ := itemMap["callbackId"].(string)

		// Check if disabled
		disabled := false
		if d, ok := itemMap["disabled"].(bool); ok {
			disabled = d
		}

		// Check if checked
		checked := false
		if c, ok := itemMap["checked"].(bool); ok {
			checked = c
		}

		menuItem := fyne.NewMenuItem(label, func(cid string) func() {
			return func() {
				// Send callback event
				b.sendEvent(Event{
					Type:     "callback",
					WidgetID: cid,
				})
			}
		}(callbackID))

		menuItem.Disabled = disabled
		menuItem.Checked = checked

		menuItems = append(menuItems, menuItem)
	}

	// Create menu
	menu := fyne.NewMenu("", menuItems...)
	b.contextMenus[widgetID] = menu

	// Wrap the widget to add context menu support
	// We need to find which window this widget belongs to
	var targetWindow fyne.Window
	for _, win := range b.windows {
		targetWindow = win
		break // Use first window for now
	}

	if targetWindow != nil {
		wrapper := NewTappableWrapper(obj)
		wrapper.SetMenu(menu)
		wrapper.SetCanvas(targetWindow.Canvas())

		// Replace the widget with the wrapper
		b.widgets[widgetID] = wrapper
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleSetWidgetStyle(msg Message) Response {
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

	// UI updates must happen on the main thread
	fyne.DoAndWait(func() {
		// Apply font style if specified
		if fontStyle, ok := msg.Payload["fontStyle"].(string); ok {
			switch w := obj.(type) {
			case *widget.Label:
				switch fontStyle {
				case "bold":
					w.TextStyle = fyne.TextStyle{Bold: true}
				case "italic":
					w.TextStyle = fyne.TextStyle{Italic: true}
				case "bold-italic":
					w.TextStyle = fyne.TextStyle{Bold: true, Italic: true}
				case "normal":
					w.TextStyle = fyne.TextStyle{}
				}
				w.Refresh()
			case *widget.Button:
				switch fontStyle {
				case "bold":
					w.Importance = widget.HighImportance
				}
				w.Refresh()
			}
		}

		// Apply font family if specified
		if fontFamily, ok := msg.Payload["fontFamily"].(string); ok {
			switch w := obj.(type) {
			case *widget.Label:
				if fontFamily == "monospace" {
					w.TextStyle.Monospace = true
					w.Refresh()
				}
			case *widget.Entry:
				if fontFamily == "monospace" {
					// Entry doesn't directly support monospace, but we can note it
				}
			}
		}

		// Apply text alignment if specified
		if textAlign, ok := msg.Payload["textAlign"].(string); ok {
			switch w := obj.(type) {
			case *widget.Label:
				switch textAlign {
				case "left":
					w.Alignment = fyne.TextAlignLeading
				case "center":
					w.Alignment = fyne.TextAlignCenter
				case "right":
					w.Alignment = fyne.TextAlignTrailing
				}
				w.Refresh()
			}
		}

		// Apply font size if specified
		// Note: Fyne doesn't support per-widget font sizes easily
		// This is a workaround using MinSize which affects the widget size
		if fontSize, ok := getFloat64(msg.Payload["fontSize"]); ok {
			switch w := obj.(type) {
			case *widget.Button:
				// For buttons, we can adjust the minimum size as a proxy
				// This doesn't directly change font size, but makes the button larger
				currentSize := w.MinSize()
				scaleFactor := float32(fontSize / 14.0) // 14 is default font size
				w.Resize(fyne.NewSize(currentSize.Width*scaleFactor, currentSize.Height*scaleFactor))
				w.Refresh()
			case *widget.Label:
				// Similar approach for labels
				w.Refresh()
			}
		}

		// Apply background color if specified (map to importance for buttons)
		if backgroundColor, ok := msg.Payload["backgroundColor"].(string); ok {
			if btn, ok := obj.(*widget.Button); ok {
				// Map color to importance level as a workaround for Fyne's limitation
				// This provides 5 color "buckets" until Fyne adds per-widget color support
				importance := mapColorToImportance(backgroundColor)
				if importance != "" {
					btn.Importance = importanceFromString(importance)
					btn.Refresh()
				}
			}
		}

		// Apply importance directly if specified
		if importance, ok := msg.Payload["importance"].(string); ok {
			if btn, ok := obj.(*widget.Button); ok {
				btn.Importance = importanceFromString(importance)
				btn.Refresh()
			}
		}
	})

	// Note: Color and text color styling in Fyne requires custom themes
	// or custom widgets. For now, buttons use importance levels (5 colors max).
	// Text color for labels is not yet supported.

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleSetWidgetMinSize sets the minimum size on any widget
func (b *Bridge) handleSetWidgetMinSize(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	minWidth := toFloat32(msg.Payload["minWidth"])
	minHeight := toFloat32(msg.Payload["minHeight"])

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found: " + widgetID,
		}
	}

	fyne.Do(func() {
		// Try to call SetMinSize if the widget supports it
		if sizable, ok := obj.(interface{ SetMinSize(fyne.Size) }); ok {
			sizable.SetMinSize(fyne.NewSize(minWidth, minHeight))
			obj.Refresh()
		}
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// mapColorToImportance maps a CSS color string to a Fyne importance level
// This is a workaround for Fyne's limitation of not supporting per-widget colors
func mapColorToImportance(colorStr string) string {
	// Parse hex color (format: #RRGGBB)
	if len(colorStr) != 7 || colorStr[0] != '#' {
		return ""
	}

	// Extract RGB components
	var r, g, b int
	fmt.Sscanf(colorStr[1:], "%02x%02x%02x", &r, &g, &b)

	// Calculate hue to determine color family
	// Convert RGB to HSV to get hue
	rNorm := float64(r) / 255.0
	gNorm := float64(g) / 255.0
	bNorm := float64(b) / 255.0

	max := rNorm
	if gNorm > max {
		max = gNorm
	}
	if bNorm > max {
		max = bNorm
	}

	min := rNorm
	if gNorm < min {
		min = gNorm
	}
	if bNorm < min {
		min = bNorm
	}

	delta := max - min

	// If grayscale or very low saturation, use medium (neutral)
	if delta < 0.1 {
		return "medium"
	}

	// Calculate hue (0-360)
	var hue float64
	if max == rNorm {
		hue = 60 * (((gNorm - bNorm) / delta) + 0)
		if hue < 0 {
			hue += 360
		}
	} else if max == gNorm {
		hue = 60 * (((bNorm - rNorm) / delta) + 2)
	} else {
		hue = 60 * (((rNorm - gNorm) / delta) + 4)
	}

	// Map hue ranges to importance levels
	// Red/Orange (0-60): warning
	// Yellow/Green (60-150): success
	// Cyan/Blue (150-270): high
	// Purple/Magenta (270-330): low
	// Red (330-360): warning

	if hue >= 0 && hue < 60 {
		return "warning" // Red/Orange
	} else if hue >= 60 && hue < 150 {
		return "success" // Yellow/Green
	} else if hue >= 150 && hue < 270 {
		return "high" // Cyan/Blue
	} else if hue >= 270 && hue < 330 {
		return "low" // Purple/Magenta
	} else {
		return "warning" // Red
	}
}

// importanceFromString converts string to Fyne importance level
func importanceFromString(importance string) widget.Importance {
	switch importance {
	case "low":
		return widget.LowImportance
	case "medium":
		return widget.MediumImportance
	case "high":
		return widget.HighImportance
	case "warning":
		return widget.WarningImportance
	case "success":
		return widget.SuccessImportance
	default:
		return widget.MediumImportance
	}
}

func (b *Bridge) handleSetTheme(msg Message) Response {
	themeName := msg.Payload["theme"].(string)

	if b.scalableTheme == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Scalable theme not initialized",
		}
	}

	switch themeName {
	case "dark":
		b.scalableTheme.SetVariant(theme.VariantDark)
	case "light":
		b.scalableTheme.SetVariant(theme.VariantLight)
	default:
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Unknown theme: %s. Use 'dark' or 'light'", themeName),
		}
	}

	// Refresh all windows to apply the theme change
	b.mu.RLock()
	windows := make([]fyne.Window, 0, len(b.windows))
	for _, win := range b.windows {
		windows = append(windows, win)
	}
	b.mu.RUnlock()

	fyne.DoAndWait(func() {
		for _, win := range windows {
			win.Canvas().Refresh(win.Content())
		}
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleGetTheme(msg Message) Response {
	themeName := "light"

	if b.scalableTheme != nil {
		variant := b.scalableTheme.GetVariant()
		if variant == theme.VariantDark {
			themeName = "dark"
		}
	} else {
		// Fallback to system theme
		variant := b.app.Settings().ThemeVariant()
		if variant == 1 { // Dark variant
			themeName = "dark"
		}
	}

	return Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"theme": themeName,
		},
	}
}

func (b *Bridge) handleSetFontScale(msg Message) Response {
	scale, ok := getFloat64(msg.Payload["scale"])
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Missing or invalid 'scale' parameter",
		}
	}

	if b.scalableTheme == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Scalable theme not initialized",
		}
	}

	// Update the theme's font scale
	b.scalableTheme.SetFontScale(float32(scale))

	// Refresh all windows to apply the new theme
	fyne.DoAndWait(func() {
		for _, window := range b.windows {
			window.Canvas().Refresh(window.Content())
		}
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// parseHexColor parses a hex color string (#RRGGBB or #RRGGBBAA) to a color.NRGBA
func parseHexColor(colorStr string) (color.NRGBA, bool) {
	if len(colorStr) < 7 || colorStr[0] != '#' {
		return color.NRGBA{}, false
	}

	var r, g, b, a uint8
	a = 255 // Default alpha

	if len(colorStr) == 7 { // #RRGGBB
		fmt.Sscanf(colorStr[1:], "%02x%02x%02x", &r, &g, &b)
	} else if len(colorStr) == 9 { // #RRGGBBAA
		fmt.Sscanf(colorStr[1:], "%02x%02x%02x%02x", &r, &g, &b, &a)
	} else {
		return color.NRGBA{}, false
	}

	return color.NRGBA{R: r, G: g, B: b, A: a}, true
}

func (b *Bridge) handleSetCustomTheme(msg Message) Response {
	if b.scalableTheme == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Scalable theme not initialized",
		}
	}

	colors, ok := msg.Payload["colors"].(map[string]interface{})
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Missing or invalid 'colors' parameter",
		}
	}

	customColors := &CustomColors{}

	// Parse each color from the payload
	colorMap := map[string]*color.Color{
		"background":        (*color.Color)(&customColors.Background),
		"foreground":        (*color.Color)(&customColors.Foreground),
		"button":            (*color.Color)(&customColors.Button),
		"disabledButton":    (*color.Color)(&customColors.DisabledButton),
		"disabled":          (*color.Color)(&customColors.Disabled),
		"hover":             (*color.Color)(&customColors.Hover),
		"focus":             (*color.Color)(&customColors.Focus),
		"placeholder":       (*color.Color)(&customColors.Placeholder),
		"primary":           (*color.Color)(&customColors.Primary),
		"pressed":           (*color.Color)(&customColors.Pressed),
		"scrollBar":         (*color.Color)(&customColors.ScrollBar),
		"selection":         (*color.Color)(&customColors.Selection),
		"separator":         (*color.Color)(&customColors.Separator),
		"shadow":            (*color.Color)(&customColors.Shadow),
		"inputBackground":   (*color.Color)(&customColors.InputBackground),
		"inputBorder":       (*color.Color)(&customColors.InputBorder),
		"menuBackground":    (*color.Color)(&customColors.MenuBackground),
		"overlayBackground": (*color.Color)(&customColors.OverlayBackground),
		"error":             (*color.Color)(&customColors.Error),
		"success":           (*color.Color)(&customColors.Success),
		"warning":           (*color.Color)(&customColors.Warning),
		"hyperlink":         (*color.Color)(&customColors.Hyperlink),
		"headerBackground":  (*color.Color)(&customColors.HeaderBackground),
	}

	for name, ptr := range colorMap {
		if colorStr, ok := colors[name].(string); ok {
			if c, valid := parseHexColor(colorStr); valid {
				*ptr = c
			}
		}
	}

	// Apply custom colors
	b.scalableTheme.SetCustomColors(customColors)

	// Refresh all windows to apply the new theme
	fyne.DoAndWait(func() {
		for _, window := range b.windows {
			window.Canvas().Refresh(window.Content())
		}
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleClearCustomTheme(msg Message) Response {
	if b.scalableTheme == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Scalable theme not initialized",
		}
	}

	// Clear custom colors
	b.scalableTheme.ClearCustomColors()

	// Refresh all windows
	fyne.DoAndWait(func() {
		for _, window := range b.windows {
			window.Canvas().Refresh(window.Content())
		}
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleSetCustomSizes(msg Message) Response {
	if b.scalableTheme == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Scalable theme not initialized",
		}
	}

	sizes, ok := msg.Payload["sizes"].(map[string]interface{})
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Missing or invalid 'sizes' parameter",
		}
	}

	customSizes := &CustomSizes{}

	// Parse each size from the payload
	sizeMap := map[string]*float32{
		"captionText":        &customSizes.CaptionText,
		"inlineIcon":         &customSizes.InlineIcon,
		"innerPadding":       &customSizes.InnerPadding,
		"lineSpacing":        &customSizes.LineSpacing,
		"padding":            &customSizes.Padding,
		"scrollBar":          &customSizes.ScrollBar,
		"scrollBarSmall":     &customSizes.ScrollBarSmall,
		"separatorThickness": &customSizes.SeparatorThickness,
		"text":               &customSizes.Text,
		"headingText":        &customSizes.HeadingText,
		"subHeadingText":     &customSizes.SubHeadingText,
		"inputBorder":        &customSizes.InputBorder,
		"inputRadius":        &customSizes.InputRadius,
		"selectionRadius":    &customSizes.SelectionRadius,
		"scrollBarRadius":    &customSizes.ScrollBarRadius,
	}

	for name, ptr := range sizeMap {
		if value, ok := sizes[name]; ok {
			*ptr = toFloat32(value)
		}
	}

	b.scalableTheme.SetCustomSizes(customSizes)

	// Refresh all windows
	fyne.DoAndWait(func() {
		for _, window := range b.windows {
			window.Canvas().Refresh(window.Content())
		}
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleClearCustomSizes(msg Message) Response {
	if b.scalableTheme == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Scalable theme not initialized",
		}
	}

	b.scalableTheme.ClearCustomSizes()

	// Refresh all windows
	fyne.DoAndWait(func() {
		for _, window := range b.windows {
			window.Canvas().Refresh(window.Content())
		}
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleGetThemeConfig(msg Message) Response {
	if b.scalableTheme == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Scalable theme not initialized",
		}
	}

	config := map[string]interface{}{
		"fontScale": b.scalableTheme.GetFontScale(),
		"variant":   "light",
	}

	if b.scalableTheme.GetVariant() == 1 { // VariantDark
		config["variant"] = "dark"
	}

	// Get current custom colors
	customColors := b.scalableTheme.GetCustomColors()
	if customColors != nil {
		colors := map[string]string{}
		colorMap := map[string]color.Color{
			"background":        customColors.Background,
			"foreground":        customColors.Foreground,
			"button":            customColors.Button,
			"disabledButton":    customColors.DisabledButton,
			"disabled":          customColors.Disabled,
			"hover":             customColors.Hover,
			"focus":             customColors.Focus,
			"placeholder":       customColors.Placeholder,
			"primary":           customColors.Primary,
			"pressed":           customColors.Pressed,
			"scrollBar":         customColors.ScrollBar,
			"selection":         customColors.Selection,
			"separator":         customColors.Separator,
			"shadow":            customColors.Shadow,
			"inputBackground":   customColors.InputBackground,
			"inputBorder":       customColors.InputBorder,
			"menuBackground":    customColors.MenuBackground,
			"overlayBackground": customColors.OverlayBackground,
			"error":             customColors.Error,
			"success":           customColors.Success,
			"warning":           customColors.Warning,
			"hyperlink":         customColors.Hyperlink,
			"headerBackground":  customColors.HeaderBackground,
		}
		for name, c := range colorMap {
			if c != nil {
				colors[name] = colorToHex(c)
			}
		}
		config["colors"] = colors
	}

	// Get current custom sizes
	customSizes := b.scalableTheme.GetCustomSizes()
	if customSizes != nil {
		sizes := map[string]float32{}
		sizeMap := map[string]float32{
			"captionText":        customSizes.CaptionText,
			"inlineIcon":         customSizes.InlineIcon,
			"innerPadding":       customSizes.InnerPadding,
			"lineSpacing":        customSizes.LineSpacing,
			"padding":            customSizes.Padding,
			"scrollBar":          customSizes.ScrollBar,
			"scrollBarSmall":     customSizes.ScrollBarSmall,
			"separatorThickness": customSizes.SeparatorThickness,
			"text":               customSizes.Text,
			"headingText":        customSizes.HeadingText,
			"subHeadingText":     customSizes.SubHeadingText,
			"inputBorder":        customSizes.InputBorder,
			"inputRadius":        customSizes.InputRadius,
			"selectionRadius":    customSizes.SelectionRadius,
			"scrollBarRadius":    customSizes.ScrollBarRadius,
		}
		for name, value := range sizeMap {
			if value > 0 {
				sizes[name] = value
			}
		}
		config["sizes"] = sizes
	}

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  config,
	}
}

func (b *Bridge) handleSetCustomFont(msg Message) Response {
	if b.scalableTheme == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Scalable theme not initialized",
		}
	}

	fontPath, ok := msg.Payload["path"].(string)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Missing or invalid 'path' parameter",
		}
	}

	// Determine which text style to apply the font to
	styleStr, _ := msg.Payload["style"].(string)
	textStyle := fyne.TextStyle{}

	switch styleStr {
	case "bold":
		textStyle.Bold = true
	case "italic":
		textStyle.Italic = true
	case "boldItalic":
		textStyle.Bold = true
		textStyle.Italic = true
	case "monospace":
		textStyle.Monospace = true
	case "symbol":
		textStyle.Symbol = true
	// default: regular style (no flags set)
	}

	// Load and set the custom font
	err := b.scalableTheme.SetCustomFont(textStyle, fontPath)
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Failed to load font: %v", err),
		}
	}

	// Refresh all windows to apply the new font
	fyne.DoAndWait(func() {
		for _, window := range b.windows {
			window.Canvas().Refresh(window.Content())
		}
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleClearCustomFont(msg Message) Response {
	if b.scalableTheme == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Scalable theme not initialized",
		}
	}

	// Determine which text style to clear
	styleStr, _ := msg.Payload["style"].(string)

	if styleStr == "all" || styleStr == "" {
		b.scalableTheme.ClearAllCustomFonts()
	} else {
		textStyle := fyne.TextStyle{}
		switch styleStr {
		case "bold":
			textStyle.Bold = true
		case "italic":
			textStyle.Italic = true
		case "boldItalic":
			textStyle.Bold = true
			textStyle.Italic = true
		case "monospace":
			textStyle.Monospace = true
		case "symbol":
			textStyle.Symbol = true
		}
		b.scalableTheme.ClearCustomFont(textStyle)
	}

	// Refresh all windows
	fyne.DoAndWait(func() {
		for _, window := range b.windows {
			window.Canvas().Refresh(window.Content())
		}
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleGetAvailableFonts(msg Message) Response {
	// Return a list of common font locations and supported font file extensions
	// Note: Fyne supports TTF and OTF fonts
	fonts := map[string]interface{}{
		"supportedExtensions": []string{".ttf", ".otf"},
		"commonLocations": map[string][]string{
			"linux":   {"/usr/share/fonts", "/usr/local/share/fonts", "~/.fonts", "~/.local/share/fonts"},
			"darwin":  {"/System/Library/Fonts", "/Library/Fonts", "~/Library/Fonts"},
			"windows": {"C:\\Windows\\Fonts"},
		},
		"styles": []string{"regular", "bold", "italic", "boldItalic", "monospace", "symbol"},
	}

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  fonts,
	}
}

func (b *Bridge) handleQuit(msg Message) Response {
	response := Response{
		ID:      msg.ID,
		Success: true,
	}

	// Signal quit channel for test mode
	if b.testMode {
		select {
		case b.quitChan <- true:
		default:
		}
	}

	// UI operations must be called on the main thread
	fyne.Do(func() {
		b.app.Quit()
	})

	return response
}
