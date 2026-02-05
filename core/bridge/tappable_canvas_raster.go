package main

import (
	"image"
	"image/color"
	"strings"
	"sync"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/driver/desktop"
	"fyne.io/fyne/v2/widget"
)

// TappableEvent represents a buffered event for piggybacked delivery.
// Events are buffered and drained onto pixel-operation responses.
// If no response arrives within 16ms, events flush via sendEvent (push).
type TappableEvent struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data,omitempty"`
}

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

	// Key state tracking - prevents duplicate events and handles rune releases
	// Maps key name (string) to pressed state (bool)
	keysPressed map[string]bool

	// Scroll callback ID
	onScrollCallbackId string

	// Mouse move callback ID
	onMouseMoveCallbackId string

	// Drag callback IDs
	onDragCallbackId    string
	onDragEndCallbackId string

	bridge   *Bridge
	widgetID string

	// Event buffering for piggybacked delivery
	pendingEvents   []TappableEvent
	pendingEventsMu sync.Mutex
	drainTimer      *time.Timer
}

// Compile-time interface verification
var _ fyne.Tappable = (*TappableCanvasRaster)(nil)

// NewTappableCanvasRaster creates a new tappable raster canvas.
func NewTappableCanvasRaster(width, height int, onTapped func(x, y int)) *TappableCanvasRaster {
	t := &TappableCanvasRaster{
		width:       width,
		height:      height,
		onTapped:    onTapped,
		pixelBuffer: make([]byte, width*height*4),
		keysPressed: make(map[string]bool),
	}

	// Initialize with transparent pixels so shapes underneath are visible
	// (alpha = 0 means fully transparent)
	for i := 0; i < len(t.pixelBuffer); i += 4 {
		t.pixelBuffer[i] = 0   // R
		t.pixelBuffer[i+1] = 0 // G
		t.pixelBuffer[i+2] = 0 // B
		t.pixelBuffer[i+3] = 0 // A (transparent)
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

// SetPixelRect updates a rectangular region of the pixel buffer.
// pixels should be rectWidth * rectHeight * 4 bytes (RGBA for each pixel).
func (t *TappableCanvasRaster) SetPixelRect(x, y, rectWidth, rectHeight int, pixels []byte) {
	expectedLen := rectWidth * rectHeight * 4
	if len(pixels) != expectedLen {
		return // Buffer size mismatch
	}

	// Copy each row of the source rectangle to the canvas buffer
	for row := 0; row < rectHeight; row++ {
		destY := y + row
		if destY < 0 || destY >= t.height {
			continue
		}

		// Calculate source and destination offsets
		srcOffset := row * rectWidth * 4

		// Determine the actual x range to copy (handle clipping)
		startX := x
		endX := x + rectWidth
		srcStartOffset := 0

		if startX < 0 {
			srcStartOffset = -startX * 4
			startX = 0
		}
		if endX > t.width {
			endX = t.width
		}
		if startX >= endX {
			continue
		}

		destOffset := (destY*t.width + startX) * 4
		copyLen := (endX - startX) * 4

		copy(t.pixelBuffer[destOffset:destOffset+copyLen], pixels[srcOffset+srcStartOffset:srcOffset+srcStartOffset+copyLen])
	}

	fyne.Do(func() {
		t.raster.Refresh()
	})
}

// SetPixel sets a single pixel at the given coordinates and refreshes.
// For setting many pixels, use SetPixelNoRefresh followed by Refresh().
func (t *TappableCanvasRaster) SetPixel(x, y int, r, g, b, a uint8) {
	t.SetPixelNoRefresh(x, y, r, g, b, a)
	fyne.Do(func() {
		t.raster.Refresh()
	})
}

// SetBlendMode sets the blend mode for the underlying raster
func (t *TappableCanvasRaster) SetBlendMode(mode canvas.BlendMode) {
	t.raster.SetBlendMode(mode)
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

	// Initialize with transparent pixels so shapes underneath are visible
	// (alpha = 0 means fully transparent)
	for i := 0; i < len(t.pixelBuffer); i += 4 {
		t.pixelBuffer[i] = 0   // R
		t.pixelBuffer[i+1] = 0 // G
		t.pixelBuffer[i+2] = 0 // B
		t.pixelBuffer[i+3] = 0 // A (transparent)
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

	if t.widgetID != "" {
		x := int(ev.Position.X)
		y := int(ev.Position.Y)
		t.bufferEvent(TappableEvent{
			Type: "tap",
			Data: map[string]interface{}{
				"x": x,
				"y": y,
			},
		})
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
// Releases all held keys to prevent stuck keys when focus is lost
func (t *TappableCanvasRaster) FocusLost() {
	t.focused = false

	// Release all held keys
	if t.onKeyUpCallbackId != "" {
		for key, pressed := range t.keysPressed {
			if pressed {
				t.bufferEvent(TappableEvent{
					Type: "keyup",
					Data: map[string]interface{}{
						"key": key,
					},
				})
			}
		}
	}
	// Clear key state
	t.keysPressed = make(map[string]bool)
}

// normalizeKey converts single-character keys to lowercase for consistent matching
// between TypedRune (which gets lowercase) and KeyUp (which may get uppercase KeyName).
// Special keys like "Up", "Down", "Space" are left unchanged.
func normalizeKey(key string) string {
	if len(key) == 1 {
		return strings.ToLower(key)
	}
	return key
}

// TypedRune is called when a printable character is typed while focused.
// Note: TypedRune can fire repeatedly when a key is held, similar to TypedKey.
// We track state to only send key-down on first press.
func (t *TappableCanvasRaster) TypedRune(r rune) {
	if t.onKeyDownCallbackId == "" || t.bridge == nil {
		return
	}

	key := normalizeKey(string(r))

	// Only send key-down if not already pressed (prevents duplicates from key repeat)
	if !t.keysPressed[key] {
		t.keysPressed[key] = true
		t.bufferEvent(TappableEvent{
			Type: "keydown",
			Data: map[string]interface{}{
				"key": key,
			},
		})
	}
}

// TypedKey handles special key input (arrows, function keys, etc.)
// This is called repeatedly when a key is held down.
// We track state to only send key-down on first press (prevents flood of events).
func (t *TappableCanvasRaster) TypedKey(e *fyne.KeyEvent) {
	if t.onKeyDownCallbackId == "" || t.bridge == nil {
		return
	}

	key := normalizeKey(string(e.Name))

	// Only send key-down if not already pressed (prevents duplicates from key repeat)
	if !t.keysPressed[key] {
		t.keysPressed[key] = true
		t.bufferEvent(TappableEvent{
			Type: "keydown",
			Data: map[string]interface{}{
				"key": key,
			},
		})
	}
}

// --- desktop.Keyable interface ---

// KeyDown is called when a key is first pressed (no repeat)
// We use TypedKey instead for repeated key events, so this is a no-op
func (t *TappableCanvasRaster) KeyDown(e *fyne.KeyEvent) {
	// Using TypedKey for key handling as it supports key repeat
}

// KeyUp is called when a key is released while focused
func (t *TappableCanvasRaster) KeyUp(e *fyne.KeyEvent) {
	key := normalizeKey(string(e.Name))

	// Clear tracked state
	delete(t.keysPressed, key)

	if t.onKeyUpCallbackId == "" || t.bridge == nil {
		return
	}
	t.bufferEvent(TappableEvent{
		Type: "keyup",
		Data: map[string]interface{}{
			"key": key,
		},
	})
}

// --- fyne.Scrollable interface ---

// Scrolled is called when a scroll event occurs (e.g., mouse wheel, touchpad two-finger scroll)
func (t *TappableCanvasRaster) Scrolled(e *fyne.ScrollEvent) {
	if t.onScrollCallbackId == "" || t.bridge == nil {
		return
	}
	t.bufferEvent(TappableEvent{
		Type: "scroll",
		Data: map[string]interface{}{
			"deltaX": float64(e.Scrolled.DX),
			"deltaY": float64(e.Scrolled.DY),
			"x":      float64(e.Position.X),
			"y":      float64(e.Position.Y),
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
	t.bufferEvent(TappableEvent{
		Type: "mousemove",
		Data: map[string]interface{}{
			"x": float64(e.Position.X),
			"y": float64(e.Position.Y),
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
	t.bufferEvent(TappableEvent{
		Type: "drag",
		Data: map[string]interface{}{
			"x":      float64(e.Position.X),
			"y":      float64(e.Position.Y),
			"deltaX": float64(e.Dragged.DX),
			"deltaY": float64(e.Dragged.DY),
		},
	})
}

// DragEnd is called when a drag gesture ends
func (t *TappableCanvasRaster) DragEnd() {
	if t.onDragEndCallbackId == "" || t.bridge == nil {
		return
	}
	t.bufferEvent(TappableEvent{
		Type: "dragend",
		Data: map[string]interface{}{},
	})
}

// SetOnDragCallback sets the callback IDs for drag events
func (t *TappableCanvasRaster) SetOnDragCallback(bridge *Bridge, dragId, dragEndId string) {
	t.bridge = bridge
	t.onDragCallbackId = dragId
	t.onDragEndCallbackId = dragEndId
}

// bufferEvent adds an event to the pending buffer with coalescing.
// Events are drained on the next pixel-operation response (piggybacked delivery).
// If no response arrives within 16ms, events flush via sendEvent (push fallback).
func (t *TappableCanvasRaster) bufferEvent(event TappableEvent) {
	t.pendingEventsMu.Lock()
	defer t.pendingEventsMu.Unlock()

	// Coalescing rules per event type
	switch event.Type {
	case "mousemove":
		// Keep latest position only
		for i := len(t.pendingEvents) - 1; i >= 0; i-- {
			if t.pendingEvents[i].Type == "mousemove" {
				t.pendingEvents[i] = event
				t.resetDrainTimerLocked()
				return
			}
		}
	case "scroll":
		// Sum deltas into existing scroll event
		for i := len(t.pendingEvents) - 1; i >= 0; i-- {
			if t.pendingEvents[i].Type == "scroll" {
				existing := t.pendingEvents[i].Data
				existing["deltaX"] = existing["deltaX"].(float64) + event.Data["deltaX"].(float64)
				existing["deltaY"] = existing["deltaY"].(float64) + event.Data["deltaY"].(float64)
				existing["x"] = event.Data["x"] // latest position
				existing["y"] = event.Data["y"]
				t.resetDrainTimerLocked()
				return
			}
		}
	}
	// keydown, keyup, drag, dragend, tap: keep all (every event matters)

	t.pendingEvents = append(t.pendingEvents, event)
	t.resetDrainTimerLocked()
}

// resetDrainTimerLocked resets the fallback push timer. Must be called with pendingEventsMu held.
func (t *TappableCanvasRaster) resetDrainTimerLocked() {
	if t.drainTimer != nil {
		t.drainTimer.Stop()
	}
	t.drainTimer = time.AfterFunc(16*time.Millisecond, func() {
		t.flushViaPush()
	})
}

// drainEvents returns and clears all buffered events. Called from pixel-operation handlers.
func (t *TappableCanvasRaster) drainEvents() []TappableEvent {
	t.pendingEventsMu.Lock()
	defer t.pendingEventsMu.Unlock()

	if t.drainTimer != nil {
		t.drainTimer.Stop()
		t.drainTimer = nil
	}

	events := t.pendingEvents
	t.pendingEvents = nil
	return events
}

// flushViaPush sends all buffered events via the push (sendEvent) path.
// This is the timer fallback for when no pixel-operation response arrives.
func (t *TappableCanvasRaster) flushViaPush() {
	t.pendingEventsMu.Lock()
	events := t.pendingEvents
	t.pendingEvents = nil
	t.pendingEventsMu.Unlock()

	if t.bridge == nil || len(events) == 0 {
		return
	}

	for _, evt := range events {
		switch evt.Type {
		case "mousemove":
			if t.onMouseMoveCallbackId != "" {
				t.bridge.sendEvent(Event{
					Type: "callback",
					Data: map[string]interface{}{
						"callbackId": t.onMouseMoveCallbackId,
						"x":          evt.Data["x"],
						"y":          evt.Data["y"],
					},
				})
			}
		case "keydown":
			if t.onKeyDownCallbackId != "" {
				t.bridge.sendEvent(Event{
					Type: "callback",
					Data: map[string]interface{}{
						"callbackId": t.onKeyDownCallbackId,
						"key":        evt.Data["key"],
					},
				})
			}
		case "keyup":
			if t.onKeyUpCallbackId != "" {
				t.bridge.sendEvent(Event{
					Type: "callback",
					Data: map[string]interface{}{
						"callbackId": t.onKeyUpCallbackId,
						"key":        evt.Data["key"],
					},
				})
			}
		case "scroll":
			if t.onScrollCallbackId != "" {
				t.bridge.sendEvent(Event{
					Type: "callback",
					Data: map[string]interface{}{
						"callbackId": t.onScrollCallbackId,
						"deltaX":     evt.Data["deltaX"],
						"deltaY":     evt.Data["deltaY"],
						"x":          evt.Data["x"],
						"y":          evt.Data["y"],
					},
				})
			}
		case "drag":
			if t.onDragCallbackId != "" {
				t.bridge.sendEvent(Event{
					Type: "callback",
					Data: map[string]interface{}{
						"callbackId": t.onDragCallbackId,
						"x":          evt.Data["x"],
						"y":          evt.Data["y"],
						"deltaX":     evt.Data["deltaX"],
						"deltaY":     evt.Data["deltaY"],
					},
				})
			}
		case "dragend":
			if t.onDragEndCallbackId != "" {
				t.bridge.sendEvent(Event{
					Type: "callback",
					Data: map[string]interface{}{
						"callbackId": t.onDragEndCallbackId,
					},
				})
			}
		case "tap":
			t.bridge.sendEvent(Event{
				Type:     "canvasRasterTapped",
				WidgetID: t.widgetID,
				Data:     evt.Data,
			})
		}
	}
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
