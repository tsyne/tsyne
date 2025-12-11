package main

import (
	"image/color"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/widget"
)

// TappableCanvasRectangle is a canvas rectangle that can respond to taps and provides position information.
type TappableCanvasRectangle struct {
	widget.BaseWidget
	rect     *canvas.Rectangle
	onTapped func(x, y int)
	width    float32
	height   float32
}

// NewTappableCanvasRectangle creates a new tappable rectangle.
func NewTappableCanvasRectangle(width, height float32, fillColor, strokeColor color.Color, strokeWidth, cornerRadius float32, onTapped func(x, y int)) *TappableCanvasRectangle {
	t := &TappableCanvasRectangle{
		width:    width,
		height:   height,
		onTapped: onTapped,
	}

	t.rect = canvas.NewRectangle(fillColor)
	if strokeColor != nil {
		t.rect.StrokeColor = strokeColor
	}
	t.rect.StrokeWidth = strokeWidth
	t.rect.CornerRadius = cornerRadius

	t.ExtendBaseWidget(t)
	return t
}

// CreateRenderer is a private method to Fyne which links this widget to its renderer.
func (t *TappableCanvasRectangle) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(t.rect)
}

// Tapped is called when the rectangle is tapped/clicked.
func (t *TappableCanvasRectangle) Tapped(ev *fyne.PointEvent) {
	if t.onTapped != nil {
		x := int(ev.Position.X)
		y := int(ev.Position.Y)
		t.onTapped(x, y)
	}
}

// MinSize returns the minimum size of the widget.
func (t *TappableCanvasRectangle) MinSize() fyne.Size {
	return fyne.NewSize(t.width, t.height)
}

// SetFillColor sets the fill color of the rectangle.
func (t *TappableCanvasRectangle) SetFillColor(c color.Color) {
	t.rect.FillColor = c
	fyne.Do(func() {
		t.rect.Refresh()
	})
}

// SetStrokeColor sets the stroke color of the rectangle.
func (t *TappableCanvasRectangle) SetStrokeColor(c color.Color) {
	t.rect.StrokeColor = c
	fyne.Do(func() {
		t.rect.Refresh()
	})
}

// SetStrokeWidth sets the stroke width of the rectangle.
func (t *TappableCanvasRectangle) SetStrokeWidth(w float32) {
	t.rect.StrokeWidth = w
	fyne.Do(func() {
		t.rect.Refresh()
	})
}

// SetCornerRadius sets the corner radius of the rectangle.
func (t *TappableCanvasRectangle) SetCornerRadius(r float32) {
	t.rect.CornerRadius = r
	fyne.Do(func() {
		t.rect.Refresh()
	})
}
