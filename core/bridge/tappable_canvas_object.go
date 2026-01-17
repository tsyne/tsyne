package main

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/widget"
)

// TappableCanvasObject wraps any fyne.CanvasObject to make it tappable.
// Used for Phase 5 sphere interactivity and other canvas objects that need tap handling.
type TappableCanvasObject struct {
	widget.BaseWidget
	wrapped  fyne.CanvasObject
	onTapped func(pos fyne.Position)
}

// Compile-time interface verification
var _ fyne.Tappable = (*TappableCanvasObject)(nil)
var _ fyne.Draggable = (*TappableCanvasObject)(nil)

// NewTappableCanvasObject wraps a canvas object to make it tappable.
func NewTappableCanvasObject(obj fyne.CanvasObject, onTapped func(pos fyne.Position)) *TappableCanvasObject {
	t := &TappableCanvasObject{
		wrapped:  obj,
		onTapped: onTapped,
	}
	t.ExtendBaseWidget(t)
	return t
}

// CreateRenderer is a private method to Fyne which links this widget to its renderer.
func (t *TappableCanvasObject) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(t.wrapped)
}

// Tapped is called when the object is tapped/clicked.
func (t *TappableCanvasObject) Tapped(ev *fyne.PointEvent) {
	if t.onTapped != nil {
		t.onTapped(ev.Position)
	}
}

// TappedSecondary is called when the object is right-clicked (optional, but helps with some Fyne versions)
func (t *TappableCanvasObject) TappedSecondary(ev *fyne.PointEvent) {
	// Ignore secondary taps
}

// MinSize returns the minimum size of the wrapped object.
func (t *TappableCanvasObject) MinSize() fyne.Size {
	return t.wrapped.MinSize()
}

// Resize the wrapped object.
// We intentionally keep the wrapped object at its MinSize to prevent layout stretching
// from affecting the sphere's rendering and hit detection.
func (t *TappableCanvasObject) Resize(size fyne.Size) {
	// Keep wrapped object at its MinSize, don't stretch it
	minSize := t.wrapped.MinSize()
	t.wrapped.Resize(minSize)
	t.BaseWidget.Resize(size)
}

// Move the wrapped object.
func (t *TappableCanvasObject) Move(pos fyne.Position) {
	// Wrapped object stays at (0,0) relative to this widget
	// Only the widget itself moves to the layout position
	t.wrapped.Move(fyne.NewPos(0, 0))
	t.BaseWidget.Move(pos)
}

// --- fyne.Draggable interface ---
// Implementing Draggable prevents scroll containers from intercepting drag events
// which would otherwise prevent taps from being recognized.

// Dragged is called when the user drags on the widget.
func (t *TappableCanvasObject) Dragged(e *fyne.DragEvent) {
	// No-op: we just need to claim the drag to prevent scroll from capturing it
}

// DragEnd is called when a drag gesture ends.
func (t *TappableCanvasObject) DragEnd() {
	// No-op
}
