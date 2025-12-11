package main

import (
	"encoding/json"
	"fmt"
	"image/color"
	"os"
	"strconv"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/layout"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
)

// ThemeEditor provides a GUI for editing theme colors and sizes
type ThemeEditor struct {
	bridge *Bridge
	window fyne.Window

	// Color entries (hex input)
	colorEntries map[string]*widget.Entry

	// Size entries
	sizeEntries map[string]*widget.Entry

	// Font scale slider
	fontScaleSlider *widget.Slider
	fontScaleLabel  *widget.Label

	// Theme variant
	variantSelect *widget.Select
}

// ThemeConfigJSON is the JSON structure for saving/loading themes
type ThemeConfigJSON struct {
	Variant   string             `json:"variant"`
	FontScale float32            `json:"fontScale"`
	Colors    map[string]string  `json:"colors,omitempty"`
	Sizes     map[string]float32 `json:"sizes,omitempty"`
}

// colorNames lists all theme color names
var colorNames = []string{
	"background",
	"foreground",
	"primary",
	"button",
	"disabledButton",
	"disabled",
	"hover",
	"focus",
	"placeholder",
	"pressed",
	"scrollBar",
	"selection",
	"separator",
	"shadow",
	"inputBackground",
	"inputBorder",
	"menuBackground",
	"overlayBackground",
	"error",
	"success",
	"warning",
	"hyperlink",
	"headerBackground",
}

// sizeNames lists all theme size names
var sizeNames = []string{
	"text",
	"headingText",
	"subHeadingText",
	"captionText",
	"padding",
	"innerPadding",
	"lineSpacing",
	"inlineIcon",
	"scrollBar",
	"scrollBarSmall",
	"separatorThickness",
	"inputBorder",
	"inputRadius",
	"selectionRadius",
	"scrollBarRadius",
}

// PresetTheme defines a preset theme with name and colors
type PresetTheme struct {
	Name    string
	Variant string
	Colors  map[string]string
}

// presetThemes contains popular color schemes
// Ordered to maximize visual distinction between adjacent themes
var presetThemes = []PresetTheme{
	// === DARK THEMES ===
	{
		Name:    "Dracula",
		Variant: "dark",
		Colors: map[string]string{
			"background":        "#282A36",
			"foreground":        "#F8F8F2",
			"primary":           "#BD93F9",
			"button":            "#44475A",
			"hover":             "#6272A4",
			"focus":             "#BD93F9",
			"selection":         "#44475A",
			"inputBackground":   "#21222C",
			"inputBorder":       "#6272A4",
			"separator":         "#44475A",
			"error":             "#FF5555",
			"success":           "#50FA7B",
			"warning":           "#FFB86C",
			"hyperlink":         "#8BE9FD",
			"menuBackground":    "#21222C",
			"overlayBackground": "#282A36",
		},
	},
	{
		Name:    "Nord",
		Variant: "dark",
		Colors: map[string]string{
			"background":        "#2E3440",
			"foreground":        "#ECEFF4",
			"primary":           "#88C0D0",
			"button":            "#3B4252",
			"hover":             "#434C5E",
			"focus":             "#88C0D0",
			"selection":         "#434C5E",
			"inputBackground":   "#3B4252",
			"inputBorder":       "#4C566A",
			"separator":         "#4C566A",
			"error":             "#BF616A",
			"success":           "#A3BE8C",
			"warning":           "#EBCB8B",
			"hyperlink":         "#81A1C1",
			"menuBackground":    "#3B4252",
			"overlayBackground": "#2E3440",
		},
	},
	{
		Name:    "Gruvbox Dark",
		Variant: "dark",
		Colors: map[string]string{
			"background":        "#282828",
			"foreground":        "#EBDBB2",
			"primary":           "#FABD2F",
			"button":            "#3C3836",
			"hover":             "#504945",
			"focus":             "#FABD2F",
			"selection":         "#504945",
			"inputBackground":   "#3C3836",
			"inputBorder":       "#665C54",
			"separator":         "#3C3836",
			"error":             "#FB4934",
			"success":           "#B8BB26",
			"warning":           "#FE8019",
			"hyperlink":         "#83A598",
			"menuBackground":    "#3C3836",
			"overlayBackground": "#282828",
		},
	},
	{
		Name:    "Solarized Dark",
		Variant: "dark",
		Colors: map[string]string{
			"background":        "#002B36",
			"foreground":        "#839496",
			"primary":           "#268BD2",
			"button":            "#073642",
			"hover":             "#586E75",
			"focus":             "#268BD2",
			"selection":         "#073642",
			"inputBackground":   "#073642",
			"inputBorder":       "#586E75",
			"separator":         "#073642",
			"error":             "#DC322F",
			"success":           "#859900",
			"warning":           "#B58900",
			"hyperlink":         "#2AA198",
			"menuBackground":    "#073642",
			"overlayBackground": "#002B36",
		},
	},
	{
		Name:    "Tokyo Night",
		Variant: "dark",
		Colors: map[string]string{
			"background":        "#1A1B26",
			"foreground":        "#A9B1D6",
			"primary":           "#7AA2F7",
			"button":            "#24283B",
			"hover":             "#33467C",
			"focus":             "#7AA2F7",
			"selection":         "#33467C",
			"inputBackground":   "#24283B",
			"inputBorder":       "#565F89",
			"separator":         "#24283B",
			"error":             "#F7768E",
			"success":           "#9ECE6A",
			"warning":           "#E0AF68",
			"hyperlink":         "#BB9AF7",
			"menuBackground":    "#16161E",
			"overlayBackground": "#1A1B26",
		},
	},
	{
		Name:    "Catppuccin Mocha",
		Variant: "dark",
		Colors: map[string]string{
			"background":        "#1E1E2E",
			"foreground":        "#CDD6F4",
			"primary":           "#89B4FA",
			"button":            "#313244",
			"hover":             "#45475A",
			"focus":             "#89B4FA",
			"selection":         "#45475A",
			"inputBackground":   "#313244",
			"inputBorder":       "#6C7086",
			"separator":         "#313244",
			"error":             "#F38BA8",
			"success":           "#A6E3A1",
			"warning":           "#F9E2AF",
			"hyperlink":         "#CBA6F7",
			"menuBackground":    "#181825",
			"overlayBackground": "#1E1E2E",
		},
	},
	{
		Name:    "Catppuccin Frappé",
		Variant: "dark",
		Colors: map[string]string{
			"background":        "#303446",
			"foreground":        "#C6D0F5",
			"primary":           "#8CAAEE",
			"button":            "#414559",
			"hover":             "#51576D",
			"focus":             "#8CAAEE",
			"selection":         "#51576D",
			"inputBackground":   "#414559",
			"inputBorder":       "#737994",
			"separator":         "#414559",
			"error":             "#E78284",
			"success":           "#A6D189",
			"warning":           "#E5C890",
			"hyperlink":         "#CA9EE6",
			"menuBackground":    "#292C3C",
			"overlayBackground": "#303446",
		},
	},
	{
		Name:    "Rosé Pine",
		Variant: "dark",
		Colors: map[string]string{
			"background":        "#191724",
			"foreground":        "#E0DEF4",
			"primary":           "#EBBCBA",
			"button":            "#1F1D2E",
			"hover":             "#26233A",
			"focus":             "#EBBCBA",
			"selection":         "#403D52",
			"inputBackground":   "#1F1D2E",
			"inputBorder":       "#6E6A86",
			"separator":         "#26233A",
			"error":             "#EB6F92",
			"success":           "#9CCFD8",
			"warning":           "#F6C177",
			"hyperlink":         "#C4A7E7",
			"menuBackground":    "#1F1D2E",
			"overlayBackground": "#191724",
		},
	},
	// === LIGHT THEMES ===
	{
		Name:    "Kawaii Pink",
		Variant: "light",
		Colors: map[string]string{
			"background":        "#FFF0F5",
			"foreground":        "#5D4954",
			"primary":           "#F075AB",
			"button":            "#FAD8CC",
			"hover":             "#F5A6CD",
			"focus":             "#F075AB",
			"selection":         "#F5A6CD",
			"inputBackground":   "#FFFFFF",
			"inputBorder":       "#D879C9",
			"separator":         "#F5A6CD",
			"error":             "#E74C3C",
			"success":           "#7068BD",
			"warning":           "#F2BD93",
			"hyperlink":         "#D879C9",
			"menuBackground":    "#FFF5F8",
			"overlayBackground": "#FFF0F5",
		},
	},
	{
		Name:    "Rosé Pine Dawn",
		Variant: "light",
		Colors: map[string]string{
			"background":        "#FAF4ED",
			"foreground":        "#575279",
			"primary":           "#D7827E",
			"button":            "#F2E9E1",
			"hover":             "#DFDAD9",
			"focus":             "#D7827E",
			"selection":         "#DFDAD9",
			"inputBackground":   "#FFFAF3",
			"inputBorder":       "#9893A5",
			"separator":         "#F2E9E1",
			"error":             "#B4637A",
			"success":           "#56949F",
			"warning":           "#EA9D34",
			"hyperlink":         "#907AA9",
			"menuBackground":    "#FFFAF3",
			"overlayBackground": "#FAF4ED",
		},
	},
	{
		Name:    "Catppuccin Latte",
		Variant: "light",
		Colors: map[string]string{
			"background":        "#EFF1F5",
			"foreground":        "#4C4F69",
			"primary":           "#1E66F5",
			"button":            "#DCE0E8",
			"hover":             "#CCD0DA",
			"focus":             "#1E66F5",
			"selection":         "#CCD0DA",
			"inputBackground":   "#DCE0E8",
			"inputBorder":       "#9CA0B0",
			"separator":         "#DCE0E8",
			"error":             "#D20F39",
			"success":           "#40A02B",
			"warning":           "#DF8E1D",
			"hyperlink":         "#8839EF",
			"menuBackground":    "#E6E9EF",
			"overlayBackground": "#EFF1F5",
		},
	},
	{
		Name:    "Solarized Light",
		Variant: "light",
		Colors: map[string]string{
			"background":        "#FDF6E3",
			"foreground":        "#657B83",
			"primary":           "#268BD2",
			"button":            "#EEE8D5",
			"hover":             "#93A1A1",
			"focus":             "#268BD2",
			"selection":         "#EEE8D5",
			"inputBackground":   "#EEE8D5",
			"inputBorder":       "#93A1A1",
			"separator":         "#EEE8D5",
			"error":             "#DC322F",
			"success":           "#859900",
			"warning":           "#B58900",
			"hyperlink":         "#2AA198",
			"menuBackground":    "#EEE8D5",
			"overlayBackground": "#FDF6E3",
		},
	},
	{
		Name:    "GitHub Light",
		Variant: "light",
		Colors: map[string]string{
			"background":        "#FFFFFF",
			"foreground":        "#24292F",
			"primary":           "#0969DA",
			"button":            "#F6F8FA",
			"hover":             "#EAEEF2",
			"focus":             "#0969DA",
			"selection":         "#DDFBE1",
			"inputBackground":   "#F6F8FA",
			"inputBorder":       "#D0D7DE",
			"separator":         "#D8DEE4",
			"error":             "#CF222E",
			"success":           "#1A7F37",
			"warning":           "#9A6700",
			"hyperlink":         "#0969DA",
			"menuBackground":    "#FFFFFF",
			"overlayBackground": "#FFFFFF",
		},
	},
	{
		Name:    "Tokyo Night Light",
		Variant: "light",
		Colors: map[string]string{
			"background":        "#D5D6DB",
			"foreground":        "#343B58",
			"primary":           "#34548A",
			"button":            "#C4C5CA",
			"hover":             "#B4B5BA",
			"focus":             "#34548A",
			"selection":         "#B4B5BA",
			"inputBackground":   "#C4C5CA",
			"inputBorder":       "#9699A3",
			"separator":         "#C4C5CA",
			"error":             "#8C4351",
			"success":           "#485E30",
			"warning":           "#8F5E15",
			"hyperlink":         "#5A4A78",
			"menuBackground":    "#CBCCD1",
			"overlayBackground": "#D5D6DB",
		},
	},
}

// NewThemeEditor creates a new theme editor
func NewThemeEditor(bridge *Bridge) *ThemeEditor {
	return &ThemeEditor{
		bridge:       bridge,
		colorEntries: make(map[string]*widget.Entry),
		sizeEntries:  make(map[string]*widget.Entry),
	}
}

// Show displays the theme editor window
func (te *ThemeEditor) Show() {
	te.window = te.bridge.app.NewWindow("Theme Editor")
	te.window.Resize(fyne.NewSize(500, 600))

	// Create tabs
	tabs := container.NewAppTabs(
		container.NewTabItem("Colors", te.createColorsTab()),
		container.NewTabItem("Sizes", te.createSizesTab()),
		container.NewTabItem("General", te.createGeneralTab()),
	)

	// Buttons
	applyBtn := widget.NewButton("Apply", func() {
		te.applyTheme()
	})
	applyBtn.Importance = widget.HighImportance

	resetBtn := widget.NewButton("Reset to Default", func() {
		te.resetToDefault()
	})

	saveBtn := widget.NewButton("Save Theme...", func() {
		te.saveTheme()
	})

	loadBtn := widget.NewButton("Load Theme...", func() {
		te.loadTheme()
	})

	buttons := container.NewHBox(
		applyBtn,
		resetBtn,
		layout.NewSpacer(),
		saveBtn,
		loadBtn,
	)

	content := container.NewBorder(
		nil,
		buttons,
		nil,
		nil,
		tabs,
	)

	te.window.SetContent(content)
	te.window.Show()

	// Load current values
	te.loadCurrentValues()
}

// createColorsTab creates the colors editing tab
func (te *ThemeEditor) createColorsTab() fyne.CanvasObject {
	// Preset themes dropdown
	presetNames := make([]string, len(presetThemes)+1)
	presetNames[0] = "-- Select Preset --"
	for i, preset := range presetThemes {
		presetNames[i+1] = preset.Name
	}

	presetSelect := widget.NewSelect(presetNames, func(selected string) {
		if selected == "-- Select Preset --" {
			return
		}
		// Find and apply the preset
		for _, preset := range presetThemes {
			if preset.Name == selected {
				te.applyPreset(preset)
				break
			}
		}
	})
	presetSelect.SetSelected("-- Select Preset --")

	presetRow := container.NewHBox(
		widget.NewLabel("Preset Theme:"),
		presetSelect,
	)

	grid := container.NewGridWithColumns(2)

	for _, name := range colorNames {
		nameCopy := name
		label := widget.NewLabel(name)

		entry := widget.NewEntry()
		entry.SetPlaceHolder("#RRGGBB")
		te.colorEntries[nameCopy] = entry

		// Preview color swatch
		swatch := newColorSwatch()

		// Update swatch on entry change
		entry.OnChanged = func(s string) {
			if c, ok := parseHexColor(s); ok {
				swatch.color = c
				swatch.Refresh()
			}
		}

		// Wrap entry in a container with minimum width for #RRGGBBAA (9 chars + padding)
		entryContainer := container.New(&minWidthLayout{minWidth: 100}, entry)

		row := container.NewHBox(label, layout.NewSpacer(), swatch, entryContainer)
		grid.Add(row)
	}

	return container.NewBorder(
		container.NewVBox(presetRow, widget.NewSeparator()),
		nil, nil, nil,
		container.NewScroll(grid),
	)
}

// applyPreset applies a preset theme to the editor fields
func (te *ThemeEditor) applyPreset(preset PresetTheme) {
	// Set variant
	te.variantSelect.SetSelected(preset.Variant)

	// Clear existing colors first
	for _, entry := range te.colorEntries {
		entry.SetText("")
	}

	// Apply preset colors
	for name, hex := range preset.Colors {
		if entry, ok := te.colorEntries[name]; ok {
			entry.SetText(hex)
		}
	}
}

// minWidthLayout is a layout that enforces a minimum width
type minWidthLayout struct {
	minWidth float32
}

func (l *minWidthLayout) MinSize(objects []fyne.CanvasObject) fyne.Size {
	if len(objects) == 0 {
		return fyne.NewSize(l.minWidth, 0)
	}
	childMin := objects[0].MinSize()
	return fyne.NewSize(fyne.Max(l.minWidth, childMin.Width), childMin.Height)
}

func (l *minWidthLayout) Layout(objects []fyne.CanvasObject, size fyne.Size) {
	for _, obj := range objects {
		obj.Resize(size)
		obj.Move(fyne.NewPos(0, 0))
	}
}

// createSizesTab creates the sizes editing tab
func (te *ThemeEditor) createSizesTab() fyne.CanvasObject {
	grid := container.NewGridWithColumns(2)

	for _, name := range sizeNames {
		nameCopy := name
		label := widget.NewLabel(name)

		entry := widget.NewEntry()
		entry.SetPlaceHolder("0")
		te.sizeEntries[nameCopy] = entry

		// Get default value
		defaultVal := theme.DefaultTheme().Size(getSizeName(nameCopy))
		defaultLabel := widget.NewLabel(fmt.Sprintf("(default: %.1f)", defaultVal))
		defaultLabel.TextStyle.Italic = true

		row := container.NewHBox(label, layout.NewSpacer(), entry, defaultLabel)
		grid.Add(row)
	}

	return container.NewScroll(grid)
}

// createGeneralTab creates the general settings tab
func (te *ThemeEditor) createGeneralTab() fyne.CanvasObject {
	// Theme variant
	variantLabel := widget.NewLabel("Theme Variant:")
	te.variantSelect = widget.NewSelect([]string{"light", "dark"}, func(s string) {})
	te.variantSelect.SetSelected("light")

	// Font scale
	fontScaleLabel := widget.NewLabel("Font Scale:")
	te.fontScaleLabel = widget.NewLabel("1.00")
	te.fontScaleSlider = widget.NewSlider(0.5, 2.0)
	te.fontScaleSlider.Step = 0.05
	te.fontScaleSlider.Value = 1.0
	te.fontScaleSlider.OnChanged = func(v float64) {
		te.fontScaleLabel.SetText(fmt.Sprintf("%.2f", v))
	}

	return container.NewVBox(
		container.NewHBox(variantLabel, te.variantSelect),
		widget.NewSeparator(),
		container.NewHBox(fontScaleLabel, te.fontScaleSlider, te.fontScaleLabel),
		widget.NewSeparator(),
		widget.NewLabel("Font Scale: 0.75 = small, 1.0 = normal, 1.5 = large"),
	)
}

// loadCurrentValues loads current theme values into the editor
func (te *ThemeEditor) loadCurrentValues() {
	if te.bridge.scalableTheme == nil {
		return
	}

	// Load variant
	if te.bridge.scalableTheme.GetVariant() == theme.VariantDark {
		te.variantSelect.SetSelected("dark")
	} else {
		te.variantSelect.SetSelected("light")
	}

	// Load font scale
	scale := te.bridge.scalableTheme.GetFontScale()
	te.fontScaleSlider.SetValue(float64(scale))

	// Load custom colors
	customColors := te.bridge.scalableTheme.GetCustomColors()
	if customColors != nil {
		te.loadColorValue("background", customColors.Background)
		te.loadColorValue("foreground", customColors.Foreground)
		te.loadColorValue("button", customColors.Button)
		te.loadColorValue("disabledButton", customColors.DisabledButton)
		te.loadColorValue("disabled", customColors.Disabled)
		te.loadColorValue("hover", customColors.Hover)
		te.loadColorValue("focus", customColors.Focus)
		te.loadColorValue("placeholder", customColors.Placeholder)
		te.loadColorValue("primary", customColors.Primary)
		te.loadColorValue("pressed", customColors.Pressed)
		te.loadColorValue("scrollBar", customColors.ScrollBar)
		te.loadColorValue("selection", customColors.Selection)
		te.loadColorValue("separator", customColors.Separator)
		te.loadColorValue("shadow", customColors.Shadow)
		te.loadColorValue("inputBackground", customColors.InputBackground)
		te.loadColorValue("inputBorder", customColors.InputBorder)
		te.loadColorValue("menuBackground", customColors.MenuBackground)
		te.loadColorValue("overlayBackground", customColors.OverlayBackground)
		te.loadColorValue("error", customColors.Error)
		te.loadColorValue("success", customColors.Success)
		te.loadColorValue("warning", customColors.Warning)
		te.loadColorValue("hyperlink", customColors.Hyperlink)
		te.loadColorValue("headerBackground", customColors.HeaderBackground)
	}

	// Load custom sizes
	customSizes := te.bridge.scalableTheme.GetCustomSizes()
	if customSizes != nil {
		te.loadSizeValue("captionText", customSizes.CaptionText)
		te.loadSizeValue("inlineIcon", customSizes.InlineIcon)
		te.loadSizeValue("innerPadding", customSizes.InnerPadding)
		te.loadSizeValue("lineSpacing", customSizes.LineSpacing)
		te.loadSizeValue("padding", customSizes.Padding)
		te.loadSizeValue("scrollBar", customSizes.ScrollBar)
		te.loadSizeValue("scrollBarSmall", customSizes.ScrollBarSmall)
		te.loadSizeValue("separatorThickness", customSizes.SeparatorThickness)
		te.loadSizeValue("text", customSizes.Text)
		te.loadSizeValue("headingText", customSizes.HeadingText)
		te.loadSizeValue("subHeadingText", customSizes.SubHeadingText)
		te.loadSizeValue("inputBorder", customSizes.InputBorder)
		te.loadSizeValue("inputRadius", customSizes.InputRadius)
		te.loadSizeValue("selectionRadius", customSizes.SelectionRadius)
		te.loadSizeValue("scrollBarRadius", customSizes.ScrollBarRadius)
	}
}

func (te *ThemeEditor) loadColorValue(name string, c color.Color) {
	if entry, ok := te.colorEntries[name]; ok && c != nil {
		entry.SetText(colorToHex(c))
	}
}

func (te *ThemeEditor) loadSizeValue(name string, v float32) {
	if entry, ok := te.sizeEntries[name]; ok && v > 0 {
		entry.SetText(fmt.Sprintf("%.1f", v))
	}
}

// applyTheme applies the current editor values to the theme
func (te *ThemeEditor) applyTheme() {
	if te.bridge.scalableTheme == nil {
		return
	}

	// Apply variant
	if te.variantSelect.Selected == "dark" {
		te.bridge.scalableTheme.SetVariant(theme.VariantDark)
	} else {
		te.bridge.scalableTheme.SetVariant(theme.VariantLight)
	}

	// Apply font scale
	te.bridge.scalableTheme.SetFontScale(float32(te.fontScaleSlider.Value))

	// Apply colors
	customColors := &CustomColors{}
	hasColors := false
	for name, entry := range te.colorEntries {
		if entry.Text != "" {
			if c, ok := parseHexColor(entry.Text); ok {
				hasColors = true
				te.setColorField(customColors, name, c)
			}
		}
	}
	if hasColors {
		te.bridge.scalableTheme.SetCustomColors(customColors)
	} else {
		te.bridge.scalableTheme.ClearCustomColors()
	}

	// Apply sizes
	customSizes := &CustomSizes{}
	hasSizes := false
	for name, entry := range te.sizeEntries {
		if entry.Text != "" {
			if v, err := strconv.ParseFloat(entry.Text, 32); err == nil && v > 0 {
				hasSizes = true
				te.setSizeField(customSizes, name, float32(v))
			}
		}
	}
	if hasSizes {
		te.bridge.scalableTheme.SetCustomSizes(customSizes)
	} else {
		te.bridge.scalableTheme.ClearCustomSizes()
	}

	// Refresh all windows
	for _, win := range te.bridge.windows {
		win.Canvas().Refresh(win.Content())
	}
}

func (te *ThemeEditor) setColorField(colors *CustomColors, name string, c color.Color) {
	switch name {
	case "background":
		colors.Background = c
	case "foreground":
		colors.Foreground = c
	case "button":
		colors.Button = c
	case "disabledButton":
		colors.DisabledButton = c
	case "disabled":
		colors.Disabled = c
	case "hover":
		colors.Hover = c
	case "focus":
		colors.Focus = c
	case "placeholder":
		colors.Placeholder = c
	case "primary":
		colors.Primary = c
	case "pressed":
		colors.Pressed = c
	case "scrollBar":
		colors.ScrollBar = c
	case "selection":
		colors.Selection = c
	case "separator":
		colors.Separator = c
	case "shadow":
		colors.Shadow = c
	case "inputBackground":
		colors.InputBackground = c
	case "inputBorder":
		colors.InputBorder = c
	case "menuBackground":
		colors.MenuBackground = c
	case "overlayBackground":
		colors.OverlayBackground = c
	case "error":
		colors.Error = c
	case "success":
		colors.Success = c
	case "warning":
		colors.Warning = c
	case "hyperlink":
		colors.Hyperlink = c
	case "headerBackground":
		colors.HeaderBackground = c
	}
}

func (te *ThemeEditor) setSizeField(sizes *CustomSizes, name string, v float32) {
	switch name {
	case "captionText":
		sizes.CaptionText = v
	case "inlineIcon":
		sizes.InlineIcon = v
	case "innerPadding":
		sizes.InnerPadding = v
	case "lineSpacing":
		sizes.LineSpacing = v
	case "padding":
		sizes.Padding = v
	case "scrollBar":
		sizes.ScrollBar = v
	case "scrollBarSmall":
		sizes.ScrollBarSmall = v
	case "separatorThickness":
		sizes.SeparatorThickness = v
	case "text":
		sizes.Text = v
	case "headingText":
		sizes.HeadingText = v
	case "subHeadingText":
		sizes.SubHeadingText = v
	case "inputBorder":
		sizes.InputBorder = v
	case "inputRadius":
		sizes.InputRadius = v
	case "selectionRadius":
		sizes.SelectionRadius = v
	case "scrollBarRadius":
		sizes.ScrollBarRadius = v
	}
}

// resetToDefault clears all custom values
func (te *ThemeEditor) resetToDefault() {
	if te.bridge.scalableTheme == nil {
		return
	}

	// Clear entries
	for _, entry := range te.colorEntries {
		entry.SetText("")
	}
	for _, entry := range te.sizeEntries {
		entry.SetText("")
	}

	// Reset variant and scale
	te.variantSelect.SetSelected("light")
	te.fontScaleSlider.SetValue(1.0)

	// Clear theme
	te.bridge.scalableTheme.ClearCustomColors()
	te.bridge.scalableTheme.ClearCustomSizes()
	te.bridge.scalableTheme.SetFontScale(1.0)
	te.bridge.scalableTheme.SetVariant(theme.VariantLight)

	// Refresh all windows
	for _, win := range te.bridge.windows {
		win.Canvas().Refresh(win.Content())
	}
}

// saveTheme saves the current theme to a JSON file
func (te *ThemeEditor) saveTheme() {
	dialog.ShowFileSave(func(writer fyne.URIWriteCloser, err error) {
		if err != nil || writer == nil {
			return
		}
		defer writer.Close()

		config := ThemeConfigJSON{
			Variant:   te.variantSelect.Selected,
			FontScale: float32(te.fontScaleSlider.Value),
			Colors:    make(map[string]string),
			Sizes:     make(map[string]float32),
		}

		// Collect colors
		for name, entry := range te.colorEntries {
			if entry.Text != "" {
				config.Colors[name] = entry.Text
			}
		}

		// Collect sizes
		for name, entry := range te.sizeEntries {
			if entry.Text != "" {
				if v, err := strconv.ParseFloat(entry.Text, 32); err == nil && v > 0 {
					config.Sizes[name] = float32(v)
				}
			}
		}

		// Write JSON
		data, err := json.MarshalIndent(config, "", "  ")
		if err != nil {
			dialog.ShowError(err, te.window)
			return
		}

		if _, err := writer.Write(data); err != nil {
			dialog.ShowError(err, te.window)
		}
	}, te.window)
}

// loadTheme loads a theme from a JSON file
func (te *ThemeEditor) loadTheme() {
	dialog.ShowFileOpen(func(reader fyne.URIReadCloser, err error) {
		if err != nil || reader == nil {
			return
		}
		defer reader.Close()

		// Read file
		data, err := os.ReadFile(reader.URI().Path())
		if err != nil {
			dialog.ShowError(err, te.window)
			return
		}

		var config ThemeConfigJSON
		if err := json.Unmarshal(data, &config); err != nil {
			dialog.ShowError(err, te.window)
			return
		}

		// Apply to UI
		te.variantSelect.SetSelected(config.Variant)
		te.fontScaleSlider.SetValue(float64(config.FontScale))

		// Clear and set colors
		for _, entry := range te.colorEntries {
			entry.SetText("")
		}
		for name, value := range config.Colors {
			if entry, ok := te.colorEntries[name]; ok {
				entry.SetText(value)
			}
		}

		// Clear and set sizes
		for _, entry := range te.sizeEntries {
			entry.SetText("")
		}
		for name, value := range config.Sizes {
			if entry, ok := te.sizeEntries[name]; ok {
				entry.SetText(fmt.Sprintf("%.1f", value))
			}
		}

		// Apply immediately
		te.applyTheme()
	}, te.window)
}

// getSizeName converts a string name to fyne.ThemeSizeName
func getSizeName(name string) fyne.ThemeSizeName {
	switch name {
	case "captionText":
		return theme.SizeNameCaptionText
	case "inlineIcon":
		return theme.SizeNameInlineIcon
	case "innerPadding":
		return theme.SizeNameInnerPadding
	case "lineSpacing":
		return theme.SizeNameLineSpacing
	case "padding":
		return theme.SizeNamePadding
	case "scrollBar":
		return theme.SizeNameScrollBar
	case "scrollBarSmall":
		return theme.SizeNameScrollBarSmall
	case "separatorThickness":
		return theme.SizeNameSeparatorThickness
	case "text":
		return theme.SizeNameText
	case "headingText":
		return theme.SizeNameHeadingText
	case "subHeadingText":
		return theme.SizeNameSubHeadingText
	case "inputBorder":
		return theme.SizeNameInputBorder
	case "inputRadius":
		return theme.SizeNameInputRadius
	case "selectionRadius":
		return theme.SizeNameSelectionRadius
	case "scrollBarRadius":
		return theme.SizeNameScrollBarRadius
	default:
		return theme.SizeNameText
	}
}

// colorSwatch is a simple color preview widget
type colorSwatch struct {
	widget.BaseWidget
	color color.Color
}

func newColorSwatch() *colorSwatch {
	s := &colorSwatch{color: color.Transparent}
	s.ExtendBaseWidget(s)
	return s
}

func (s *colorSwatch) CreateRenderer() fyne.WidgetRenderer {
	rect := canvas.NewRectangle(s.color)
	rect.StrokeColor = color.Gray{Y: 128}
	rect.StrokeWidth = 1
	return &swatchRenderer{swatch: s, rect: rect}
}

func (s *colorSwatch) MinSize() fyne.Size {
	return fyne.NewSize(24, 24)
}

type swatchRenderer struct {
	swatch *colorSwatch
	rect   *canvas.Rectangle
}

func (r *swatchRenderer) Layout(size fyne.Size) {
	r.rect.Resize(size)
}

func (r *swatchRenderer) MinSize() fyne.Size {
	return fyne.NewSize(24, 24)
}

func (r *swatchRenderer) Refresh() {
	r.rect.FillColor = r.swatch.color
	r.rect.Refresh()
}

func (r *swatchRenderer) Objects() []fyne.CanvasObject {
	return []fyne.CanvasObject{r.rect}
}

func (r *swatchRenderer) Destroy() {}
