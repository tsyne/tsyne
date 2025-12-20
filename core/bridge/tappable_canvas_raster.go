package main

import (
	"image"
	"image/color"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/driver/desktop"
	"fyne.io/fyne/v2/widget"
)

// TappableCanvasRaster is a canvas raster that can respond to taps, keyboard, scroll, and mouse events.
// It implements fyne.Focusable, desktop.Keyable, fyne.Scrollable, and desktop.Hoverable for input handling.
type TappableCanvasRaster struct {
	widget.BaseWidget
	raster      *canvas.Raster
	pixelBuffer []byte
	width       int
	height      int
	onTapped    func(x, y int)
	focused     bool

	// Keyboard callback IDs
	onKeyDownCallbackId string
	onKeyUpCallbackId   string

	// Scroll callback ID
	onScrollCallbackId string

	// Mouse move callback ID
	onMouseMoveCallbackId string

	// Drag callback IDs
	onDragCallbackId    string
	onDragEndCallbackId string

	bridge *Bridge
}

// NewTappableCanvasRaster creates a new tappable raster canvas.
func NewTappableCanvasRaster(width, height int, onTapped func(x, y int)) *TappableCanvasRaster {
	t := &TappableCanvasRaster{
		width:       width,
		height:      height,
		onTapped:    onTapped,
		pixelBuffer: make([]byte, width*height*4),
	}

	// Initialize with white pixels
	for i := 0; i < len(t.pixelBuffer); i += 4 {
		t.pixelBuffer[i] = 255   // R
		t.pixelBuffer[i+1] = 255 // G
		t.pixelBuffer[i+2] = 255 // B
		t.pixelBuffer[i+3] = 255 // A
	}

	t.raster = canvas.NewRaster(t.generateImage)
	t.ExtendBaseWidget(t)
	return t
}

// generateImage creates the image from the pixel buffer.
func (t *TappableCanvasRaster) generateImage(w, h int) image.Image {
	img := image.NewRGBA(image.Rect(0, 0, t.width, t.height))

	for y := 0; y < t.height; y++ {
		for x := 0; x < t.width; x++ {
			idx := (y*t.width + x) * 4
			if idx+3 < len(t.pixelBuffer) {
				img.Set(x, y, color.RGBA{
					R: t.pixelBuffer[idx],
					G: t.pixelBuffer[idx+1],
					B: t.pixelBuffer[idx+2],
					A: t.pixelBuffer[idx+3],
				})
			}
		}
	}

	return img
}

// SetPixels updates the pixel buffer with the provided pixel data.
func (t *TappableCanvasRaster) SetPixels(pixels []byte) {
	if len(pixels) == len(t.pixelBuffer) {
		copy(t.pixelBuffer, pixels)
		fyne.Do(func() {
			t.raster.Refresh()
		})
	}
}

// SetPixel sets a single pixel at the given coordinates and refreshes.
// For setting many pixels, use SetPixelNoRefresh followed by Refresh().
func (t *TappableCanvasRaster) SetPixel(x, y int, r, g, b, a uint8) {
	t.SetPixelNoRefresh(x, y, r, g, b, a)
	fyne.Do(func() {
		t.raster.Refresh()
	})
}

// SetPixelNoRefresh sets a single pixel without triggering a refresh.
// Call Refresh() after setting all pixels.
func (t *TappableCanvasRaster) SetPixelNoRefresh(x, y int, r, g, b, a uint8) {
	if x >= 0 && x < t.width && y >= 0 && y < t.height {
		idx := (y*t.width + x) * 4
		if idx+3 < len(t.pixelBuffer) {
			t.pixelBuffer[idx] = r
			t.pixelBuffer[idx+1] = g
			t.pixelBuffer[idx+2] = b
			t.pixelBuffer[idx+3] = a
		}
	}
}

// RefreshCanvas triggers a visual refresh of the canvas.
func (t *TappableCanvasRaster) RefreshCanvas() {
	fyne.Do(func() {
		t.raster.Refresh()
	})
}

// ResizeBuffer resizes the pixel buffer to the new dimensions.
// The canvas will be cleared to white after resize.
func (t *TappableCanvasRaster) ResizeBuffer(width, height int) {
	t.width = width
	t.height = height
	t.pixelBuffer = make([]byte, width*height*4)

	// Initialize with white pixels
	for i := 0; i < len(t.pixelBuffer); i += 4 {
		t.pixelBuffer[i] = 255   // R
		t.pixelBuffer[i+1] = 255 // G
		t.pixelBuffer[i+2] = 255 // B
		t.pixelBuffer[i+3] = 255 // A
	}

	fyne.Do(func() {
		t.raster.Refresh()
		t.Refresh()
	})
}

// GetWidth returns the current width of the canvas
func (t *TappableCanvasRaster) GetWidth() int {
	return t.width
}

// GetHeight returns the current height of the canvas
func (t *TappableCanvasRaster) GetHeight() int {
	return t.height
}

// CreateRenderer is a private method to Fyne which links this widget to its renderer.
func (t *TappableCanvasRaster) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(t.raster)
}

// Tapped is called when the raster is tapped/clicked.
func (t *TappableCanvasRaster) Tapped(ev *fyne.PointEvent) {
	// Request focus so we receive keyboard events
	if c := fyne.CurrentApp().Driver().CanvasForObject(t); c != nil {
		c.Focus(t)
	}

	if t.onTapped != nil {
		// Convert the position to pixel coordinates
		// For now, we'll use direct position - zooming will be handled in the app layer
		x := int(ev.Position.X)
		y := int(ev.Position.Y)
		t.onTapped(x, y)
	}
}

// MinSize returns the minimum size of the widget.
func (t *TappableCanvasRaster) MinSize() fyne.Size {
	return fyne.NewSize(float32(t.width), float32(t.height))
}

// SetKeyCallbacks sets the callback IDs for keyboard events
func (t *TappableCanvasRaster) SetKeyCallbacks(bridge *Bridge, keyDown, keyUp string) {
	t.bridge = bridge
	t.onKeyDownCallbackId = keyDown
	t.onKeyUpCallbackId = keyUp
}

// --- fyne.Focusable interface ---

// FocusGained is called when this widget gains keyboard focus
func (t *TappableCanvasRaster) FocusGained() {
	t.focused = true
}

// FocusLost is called when this widget loses keyboard focus
func (t *TappableCanvasRaster) FocusLost() {
	t.focused = false
}

// TypedRune is called when a printable character is typed while focused
func (t *TappableCanvasRaster) TypedRune(r rune) {
	// Forward as key event
	if t.onKeyDownCallbackId != "" && t.bridge != nil {
		t.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": t.onKeyDownCallbackId,
				"key":        string(r),
			},
		})
	}
}

// TypedKey handles special key input (arrows, function keys, etc.)
// This is called repeatedly when a key is held down, so we use it for key-down events.
func (t *TappableCanvasRaster) TypedKey(e *fyne.KeyEvent) {
	if t.onKeyDownCallbackId == "" || t.bridge == nil {
		return
	}
	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onKeyDownCallbackId,
			"key":        string(e.Name),
		},
	})
}

// --- desktop.Keyable interface ---

// KeyDown is called when a key is first pressed (no repeat)
// We use TypedKey instead for repeated key events, so this is a no-op
func (t *TappableCanvasRaster) KeyDown(e *fyne.KeyEvent) {
	// Using TypedKey for key handling as it supports key repeat
}

// KeyUp is called when a key is released while focused
func (t *TappableCanvasRaster) KeyUp(e *fyne.KeyEvent) {
	if t.onKeyUpCallbackId == "" || t.bridge == nil {
		return
	}
	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onKeyUpCallbackId,
			"key":        string(e.Name),
		},
	})
}

// --- fyne.Scrollable interface ---

// Scrolled is called when a scroll event occurs (e.g., mouse wheel, touchpad two-finger scroll)
func (t *TappableCanvasRaster) Scrolled(e *fyne.ScrollEvent) {
	if t.onScrollCallbackId == "" || t.bridge == nil {
		return
	}
	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onScrollCallbackId,
			"deltaX":     float64(e.Scrolled.DX),
			"deltaY":     float64(e.Scrolled.DY),
			"x":          float64(e.Position.X),
			"y":          float64(e.Position.Y),
		},
	})
}

// SetOnScrollCallback sets the callback ID for scroll events
func (t *TappableCanvasRaster) SetOnScrollCallback(bridge *Bridge, callbackId string) {
	t.bridge = bridge
	t.onScrollCallbackId = callbackId
}

// --- desktop.Hoverable interface ---

// MouseIn is called when the mouse enters the widget
func (t *TappableCanvasRaster) MouseIn(e *desktop.MouseEvent) {
	// We don't need to do anything special on mouse enter
}

// MouseOut is called when the mouse leaves the widget
func (t *TappableCanvasRaster) MouseOut() {
	// We don't need to do anything special on mouse exit
}

// MouseMoved is called when the mouse moves within the widget
func (t *TappableCanvasRaster) MouseMoved(e *desktop.MouseEvent) {
	if t.onMouseMoveCallbackId == "" || t.bridge == nil {
		return
	}
	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onMouseMoveCallbackId,
			"x":          float64(e.Position.X),
			"y":          float64(e.Position.Y),
		},
	})
}

// SetOnMouseMoveCallback sets the callback ID for mouse move events
func (t *TappableCanvasRaster) SetOnMouseMoveCallback(bridge *Bridge, callbackId string) {
	t.bridge = bridge
	t.onMouseMoveCallbackId = callbackId
}

// --- fyne.Draggable interface ---

// Dragged is called when the user drags on the canvas
func (t *TappableCanvasRaster) Dragged(e *fyne.DragEvent) {
	if t.onDragCallbackId == "" || t.bridge == nil {
		return
	}
	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onDragCallbackId,
			"x":          float64(e.Position.X),
			"y":          float64(e.Position.Y),
			"deltaX":     float64(e.Dragged.DX),
			"deltaY":     float64(e.Dragged.DY),
		},
	})
}

// DragEnd is called when a drag gesture ends
func (t *TappableCanvasRaster) DragEnd() {
	if t.onDragEndCallbackId == "" || t.bridge == nil {
		return
	}
	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onDragEndCallbackId,
		},
	})
}

// SetOnDragCallback sets the callback IDs for drag events
func (t *TappableCanvasRaster) SetOnDragCallback(bridge *Bridge, dragId, dragEndId string) {
	t.bridge = bridge
	t.onDragCallbackId = dragId
	t.onDragEndCallbackId = dragEndId
}

// RequestFocus requests keyboard focus for this canvas
func (t *TappableCanvasRaster) RequestFocus() {
	if c := fyne.CurrentApp().Driver().CanvasForObject(t); c != nil {
		c.Focus(t)
	}
}

// Ensure TappableCanvasRaster implements the required interfaces
var _ fyne.Tappable = (*TappableCanvasRaster)(nil)
var _ fyne.Focusable = (*TappableCanvasRaster)(nil)
var _ desktop.Keyable = (*TappableCanvasRaster)(nil)
var _ fyne.Scrollable = (*TappableCanvasRaster)(nil)
var _ desktop.Hoverable = (*TappableCanvasRaster)(nil)
var _ fyne.Draggable = (*TappableCanvasRaster)(nil)
