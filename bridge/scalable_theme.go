package main

import (
	"image/color"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/theme"
)

// ScalableTheme wraps the default theme and allows font size scaling
type ScalableTheme struct {
	base      fyne.Theme
	fontScale float32
}

// NewScalableTheme creates a new scalable theme with the given font scale
// scale = 0.75 for small, 1.0 for normal, 1.5 for large
func NewScalableTheme(scale float32) *ScalableTheme {
	return &ScalableTheme{
		base:      theme.DefaultTheme(),
		fontScale: scale,
	}
}

// SetFontScale updates the font scale factor
func (st *ScalableTheme) SetFontScale(scale float32) {
	st.fontScale = scale
}

// Color returns a color from the base theme
func (st *ScalableTheme) Color(name fyne.ThemeColorName, variant fyne.ThemeVariant) color.Color {
	return st.base.Color(name, variant)
}

// Font returns a font resource from the base theme
func (st *ScalableTheme) Font(style fyne.TextStyle) fyne.Resource {
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
