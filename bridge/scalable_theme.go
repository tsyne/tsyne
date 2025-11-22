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

// ScalableTheme wraps the default theme and allows font size scaling
type ScalableTheme struct {
	base         fyne.Theme
	fontScale    float32
	customColors *CustomColors
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

// SetVariant sets the theme variant (light or dark)
func (st *ScalableTheme) SetVariant(variant fyne.ThemeVariant) {
	st.variant = variant
}

// Color returns a color from the custom colors if set, otherwise from the base theme
func (st *ScalableTheme) Color(name fyne.ThemeColorName, variant fyne.ThemeVariant) color.Color {
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

// Size returns a scaled size value
func (st *ScalableTheme) Size(name fyne.ThemeSizeName) float32 {
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
