package main

import (
	"image/color"
	"os"
	"sync"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/theme"
)

// darkTheme is a theme that forces dark variant
type darkTheme struct{}

func (d *darkTheme) Color(name fyne.ThemeColorName, variant fyne.ThemeVariant) color.Color {
	return theme.DefaultTheme().Color(name, theme.VariantDark)
}

func (d *darkTheme) Font(style fyne.TextStyle) fyne.Resource {
	return theme.DefaultTheme().Font(style)
}

func (d *darkTheme) Icon(name fyne.ThemeIconName) fyne.Resource {
	return theme.DefaultTheme().Icon(name)
}

func (d *darkTheme) Size(name fyne.ThemeSizeName) float32 {
	return theme.DefaultTheme().Size(name)
}

// lightTheme is a theme that forces light variant
type lightTheme struct{}

// customColorsTheme is a theme that applies custom colors (for ThemeOverride)
type customColorsTheme struct {
	colors   *CustomColors
	fontPath string
	fontRes  fyne.Resource
}

// NewCustomColorsTheme creates a theme with custom colors for use in ThemeOverride
func NewCustomColorsTheme(colors *CustomColors, fontPath string) *customColorsTheme {
	t := &customColorsTheme{colors: colors, fontPath: fontPath}
	if fontPath != "" {
		if data, err := os.ReadFile(fontPath); err == nil {
			t.fontRes = fyne.NewStaticResource(fontPath, data)
		}
	}
	return t
}

func (c *customColorsTheme) Color(name fyne.ThemeColorName, variant fyne.ThemeVariant) color.Color {
	if c.colors != nil {
		switch name {
		case theme.ColorNameBackground:
			if c.colors.Background != nil {
				return c.colors.Background
			}
		case theme.ColorNameForeground:
			if c.colors.Foreground != nil {
				return c.colors.Foreground
			}
		case theme.ColorNameButton:
			if c.colors.Button != nil {
				return c.colors.Button
			}
		case theme.ColorNameDisabledButton:
			if c.colors.DisabledButton != nil {
				return c.colors.DisabledButton
			}
		case theme.ColorNameDisabled:
			if c.colors.Disabled != nil {
				return c.colors.Disabled
			}
		case theme.ColorNameHover:
			if c.colors.Hover != nil {
				return c.colors.Hover
			}
		case theme.ColorNameFocus:
			if c.colors.Focus != nil {
				return c.colors.Focus
			}
		case theme.ColorNamePlaceHolder:
			if c.colors.Placeholder != nil {
				return c.colors.Placeholder
			}
		case theme.ColorNamePrimary:
			if c.colors.Primary != nil {
				return c.colors.Primary
			}
		case theme.ColorNamePressed:
			if c.colors.Pressed != nil {
				return c.colors.Pressed
			}
		case theme.ColorNameScrollBar:
			if c.colors.ScrollBar != nil {
				return c.colors.ScrollBar
			}
		case theme.ColorNameSelection:
			if c.colors.Selection != nil {
				return c.colors.Selection
			}
		case theme.ColorNameSeparator:
			if c.colors.Separator != nil {
				return c.colors.Separator
			}
		case theme.ColorNameShadow:
			if c.colors.Shadow != nil {
				return c.colors.Shadow
			}
		case theme.ColorNameInputBackground:
			if c.colors.InputBackground != nil {
				return c.colors.InputBackground
			}
		case theme.ColorNameInputBorder:
			if c.colors.InputBorder != nil {
				return c.colors.InputBorder
			}
		case theme.ColorNameMenuBackground:
			if c.colors.MenuBackground != nil {
				return c.colors.MenuBackground
			}
		case theme.ColorNameOverlayBackground:
			if c.colors.OverlayBackground != nil {
				return c.colors.OverlayBackground
			}
		case theme.ColorNameError:
			if c.colors.Error != nil {
				return c.colors.Error
			}
		case theme.ColorNameSuccess:
			if c.colors.Success != nil {
				return c.colors.Success
			}
		case theme.ColorNameWarning:
			if c.colors.Warning != nil {
				return c.colors.Warning
			}
		case theme.ColorNameHyperlink:
			if c.colors.Hyperlink != nil {
				return c.colors.Hyperlink
			}
		case theme.ColorNameHeaderBackground:
			if c.colors.HeaderBackground != nil {
				return c.colors.HeaderBackground
			}
		}
	}
	return theme.DefaultTheme().Color(name, variant)
}

func (c *customColorsTheme) Font(style fyne.TextStyle) fyne.Resource {
	if c.fontRes != nil {
		return c.fontRes
	}
	return theme.DefaultTheme().Font(style)
}

func (c *customColorsTheme) Icon(name fyne.ThemeIconName) fyne.Resource {
	return theme.DefaultTheme().Icon(name)
}

func (c *customColorsTheme) Size(name fyne.ThemeSizeName) float32 {
	return theme.DefaultTheme().Size(name)
}

func (l *lightTheme) Color(name fyne.ThemeColorName, variant fyne.ThemeVariant) color.Color {
	return theme.DefaultTheme().Color(name, theme.VariantLight)
}

func (l *lightTheme) Font(style fyne.TextStyle) fyne.Resource {
	return theme.DefaultTheme().Font(style)
}

func (l *lightTheme) Icon(name fyne.ThemeIconName) fyne.Resource {
	return theme.DefaultTheme().Icon(name)
}

func (l *lightTheme) Size(name fyne.ThemeSizeName) float32 {
	return theme.DefaultTheme().Size(name)
}

// CustomColors defines custom color overrides for a theme
type CustomColors struct {
	Background         color.Color
	Foreground         color.Color
	Button             color.Color
	DisabledButton     color.Color
	Disabled           color.Color
	Hover              color.Color
	Focus              color.Color
	Placeholder        color.Color
	Primary            color.Color
	Pressed            color.Color
	ScrollBar          color.Color
	Selection          color.Color
	Separator          color.Color
	Shadow             color.Color
	InputBackground    color.Color
	InputBorder        color.Color
	MenuBackground     color.Color
	OverlayBackground  color.Color
	Error              color.Color
	Success            color.Color
	Warning            color.Color
	Hyperlink          color.Color
	HeaderBackground   color.Color
}

// CustomSizes defines custom size overrides for a theme
// Use -1 to indicate "not set" (will fall back to default)
type CustomSizes struct {
	CaptionText        float32
	InlineIcon         float32
	InnerPadding       float32
	LineSpacing        float32
	Padding            float32
	ScrollBar          float32
	ScrollBarSmall     float32
	SeparatorThickness float32
	Text               float32
	HeadingText        float32
	SubHeadingText     float32
	InputBorder        float32
	InputRadius        float32
	SelectionRadius    float32
	ScrollBarRadius    float32
}

// ScalableTheme wraps the default theme and allows font size scaling
type ScalableTheme struct {
	base         fyne.Theme
	fontScale    float32
	customColors *CustomColors
	customSizes  *CustomSizes
	customFonts  map[fyne.TextStyle]fyne.Resource
	fontMu       sync.RWMutex
	variant      fyne.ThemeVariant // 0 = light, 1 = dark
}

// NewScalableTheme creates a new scalable theme with the given font scale
// scale = 0.75 for small, 1.0 for normal, 1.5 for large
func NewScalableTheme(scale float32) *ScalableTheme {
	return &ScalableTheme{
		base:        theme.DefaultTheme(),
		fontScale:   scale,
		customFonts: make(map[fyne.TextStyle]fyne.Resource),
		variant:     theme.VariantLight,
	}
}

// SetFontScale updates the font scale factor
func (st *ScalableTheme) SetFontScale(scale float32) {
	st.fontScale = scale
}

// SetCustomColors sets custom color overrides
func (st *ScalableTheme) SetCustomColors(colors *CustomColors) {
	st.customColors = colors
}

// ClearCustomColors clears all custom color overrides
func (st *ScalableTheme) ClearCustomColors() {
	st.customColors = nil
}

// SetCustomSizes sets custom size overrides
func (st *ScalableTheme) SetCustomSizes(sizes *CustomSizes) {
	st.customSizes = sizes
}

// ClearCustomSizes clears all custom size overrides
func (st *ScalableTheme) ClearCustomSizes() {
	st.customSizes = nil
}

// GetCustomColors returns the current custom colors (for theme editor)
func (st *ScalableTheme) GetCustomColors() *CustomColors {
	return st.customColors
}

// GetCustomSizes returns the current custom sizes (for theme editor)
func (st *ScalableTheme) GetCustomSizes() *CustomSizes {
	return st.customSizes
}

// GetFontScale returns the current font scale
func (st *ScalableTheme) GetFontScale() float32 {
	return st.fontScale
}

// GetVariant returns the current theme variant
func (st *ScalableTheme) GetVariant() fyne.ThemeVariant {
	return st.variant
}

// SetVariant sets the theme variant (light or dark)
func (st *ScalableTheme) SetVariant(variant fyne.ThemeVariant) {
	st.variant = variant
}

// Color returns a color from the custom colors if set, otherwise from the base theme
// Note: We ignore the variant parameter and use our stored variant instead
func (st *ScalableTheme) Color(name fyne.ThemeColorName, _ fyne.ThemeVariant) color.Color {
	// Use our stored variant
	variant := st.variant

	// Use custom colors if set
	if st.customColors != nil {
		switch name {
		case theme.ColorNameBackground:
			if st.customColors.Background != nil {
				return st.customColors.Background
			}
		case theme.ColorNameForeground:
			if st.customColors.Foreground != nil {
				return st.customColors.Foreground
			}
		case theme.ColorNameButton:
			if st.customColors.Button != nil {
				return st.customColors.Button
			}
		case theme.ColorNameDisabledButton:
			if st.customColors.DisabledButton != nil {
				return st.customColors.DisabledButton
			}
		case theme.ColorNameDisabled:
			if st.customColors.Disabled != nil {
				return st.customColors.Disabled
			}
		case theme.ColorNameHover:
			if st.customColors.Hover != nil {
				return st.customColors.Hover
			}
		case theme.ColorNameFocus:
			if st.customColors.Focus != nil {
				return st.customColors.Focus
			}
		case theme.ColorNamePlaceHolder:
			if st.customColors.Placeholder != nil {
				return st.customColors.Placeholder
			}
		case theme.ColorNamePrimary:
			if st.customColors.Primary != nil {
				return st.customColors.Primary
			}
		case theme.ColorNamePressed:
			if st.customColors.Pressed != nil {
				return st.customColors.Pressed
			}
		case theme.ColorNameScrollBar:
			if st.customColors.ScrollBar != nil {
				return st.customColors.ScrollBar
			}
		case theme.ColorNameSelection:
			if st.customColors.Selection != nil {
				return st.customColors.Selection
			}
		case theme.ColorNameSeparator:
			if st.customColors.Separator != nil {
				return st.customColors.Separator
			}
		case theme.ColorNameShadow:
			if st.customColors.Shadow != nil {
				return st.customColors.Shadow
			}
		case theme.ColorNameInputBackground:
			if st.customColors.InputBackground != nil {
				return st.customColors.InputBackground
			}
		case theme.ColorNameInputBorder:
			if st.customColors.InputBorder != nil {
				return st.customColors.InputBorder
			}
		case theme.ColorNameMenuBackground:
			if st.customColors.MenuBackground != nil {
				return st.customColors.MenuBackground
			}
		case theme.ColorNameOverlayBackground:
			if st.customColors.OverlayBackground != nil {
				return st.customColors.OverlayBackground
			}
		case theme.ColorNameError:
			if st.customColors.Error != nil {
				return st.customColors.Error
			}
		case theme.ColorNameSuccess:
			if st.customColors.Success != nil {
				return st.customColors.Success
			}
		case theme.ColorNameWarning:
			if st.customColors.Warning != nil {
				return st.customColors.Warning
			}
		case theme.ColorNameHyperlink:
			if st.customColors.Hyperlink != nil {
				return st.customColors.Hyperlink
			}
		case theme.ColorNameHeaderBackground:
			if st.customColors.HeaderBackground != nil {
				return st.customColors.HeaderBackground
			}
		}
	}

	return st.base.Color(name, variant)
}

// SetCustomFont sets a custom font for a specific text style
func (st *ScalableTheme) SetCustomFont(style fyne.TextStyle, fontPath string) error {
	fontData, err := os.ReadFile(fontPath)
	if err != nil {
		return err
	}

	resource := fyne.NewStaticResource(fontPath, fontData)

	st.fontMu.Lock()
	st.customFonts[style] = resource
	st.fontMu.Unlock()

	return nil
}

// SetCustomFontFromData sets a custom font from raw font data
func (st *ScalableTheme) SetCustomFontFromData(style fyne.TextStyle, name string, data []byte) {
	resource := fyne.NewStaticResource(name, data)

	st.fontMu.Lock()
	st.customFonts[style] = resource
	st.fontMu.Unlock()
}

// ClearCustomFont removes a custom font for a specific text style
func (st *ScalableTheme) ClearCustomFont(style fyne.TextStyle) {
	st.fontMu.Lock()
	delete(st.customFonts, style)
	st.fontMu.Unlock()
}

// ClearAllCustomFonts removes all custom fonts
func (st *ScalableTheme) ClearAllCustomFonts() {
	st.fontMu.Lock()
	st.customFonts = make(map[fyne.TextStyle]fyne.Resource)
	st.fontMu.Unlock()
}

// Font returns a font resource from custom fonts if set, otherwise from the base theme
func (st *ScalableTheme) Font(style fyne.TextStyle) fyne.Resource {
	st.fontMu.RLock()
	if font, ok := st.customFonts[style]; ok {
		st.fontMu.RUnlock()
		return font
	}
	st.fontMu.RUnlock()

	return st.base.Font(style)
}

// Icon returns an icon resource from the base theme
func (st *ScalableTheme) Icon(name fyne.ThemeIconName) fyne.Resource {
	return st.base.Icon(name)
}

// Size returns a custom size if set, otherwise a scaled size value
func (st *ScalableTheme) Size(name fyne.ThemeSizeName) float32 {
	// Check custom sizes first (values > 0 are set)
	if st.customSizes != nil {
		switch name {
		case theme.SizeNameCaptionText:
			if st.customSizes.CaptionText > 0 {
				return st.customSizes.CaptionText
			}
		case theme.SizeNameInlineIcon:
			if st.customSizes.InlineIcon > 0 {
				return st.customSizes.InlineIcon
			}
		case theme.SizeNameInnerPadding:
			if st.customSizes.InnerPadding > 0 {
				return st.customSizes.InnerPadding
			}
		case theme.SizeNameLineSpacing:
			if st.customSizes.LineSpacing > 0 {
				return st.customSizes.LineSpacing
			}
		case theme.SizeNamePadding:
			if st.customSizes.Padding > 0 {
				return st.customSizes.Padding
			}
		case theme.SizeNameScrollBar:
			if st.customSizes.ScrollBar > 0 {
				return st.customSizes.ScrollBar
			}
		case theme.SizeNameScrollBarSmall:
			if st.customSizes.ScrollBarSmall > 0 {
				return st.customSizes.ScrollBarSmall
			}
		case theme.SizeNameSeparatorThickness:
			if st.customSizes.SeparatorThickness > 0 {
				return st.customSizes.SeparatorThickness
			}
		case theme.SizeNameText:
			if st.customSizes.Text > 0 {
				return st.customSizes.Text
			}
		case theme.SizeNameHeadingText:
			if st.customSizes.HeadingText > 0 {
				return st.customSizes.HeadingText
			}
		case theme.SizeNameSubHeadingText:
			if st.customSizes.SubHeadingText > 0 {
				return st.customSizes.SubHeadingText
			}
		case theme.SizeNameInputBorder:
			if st.customSizes.InputBorder > 0 {
				return st.customSizes.InputBorder
			}
		case theme.SizeNameInputRadius:
			if st.customSizes.InputRadius > 0 {
				return st.customSizes.InputRadius
			}
		case theme.SizeNameSelectionRadius:
			if st.customSizes.SelectionRadius > 0 {
				return st.customSizes.SelectionRadius
			}
		case theme.SizeNameScrollBarRadius:
			if st.customSizes.ScrollBarRadius > 0 {
				return st.customSizes.ScrollBarRadius
			}
		}
	}

	// Fall back to base size with scaling
	baseSize := st.base.Size(name)

	// Scale text-related sizes
	switch name {
	case theme.SizeNameText,
		theme.SizeNameHeadingText,
		theme.SizeNameSubHeadingText,
		theme.SizeNameCaptionText:
		return baseSize * st.fontScale
	case theme.SizeNamePadding,
		theme.SizeNameInlineIcon:
		// Scale padding and icons proportionally but less aggressively
		scaleFactor := 1.0 + (st.fontScale-1.0)*0.5
		return baseSize * scaleFactor
	default:
		// Other sizes remain unchanged
		return baseSize
	}
}
