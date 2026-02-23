package main

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/driver/desktop"
	"fyne.io/fyne/v2/widget"
)

// InteractiveShader wraps a canvas.Shader with all event interfaces.
// Unlike the Button variant pattern (which needs combinatorial structs to
// preserve native behavior), the shader has NO native event behavior.
// One struct, all interfaces. The fire() no-op check is the filter —
// zero overhead for unused events.
type InteractiveShader struct {
	widget.BaseWidget
	shader       *canvas.Shader
	disp         *EventDispatcher
	tooltipPopup *widget.PopUp
	keysPressed  map[string]bool
}

// NewInteractiveShader creates an InteractiveShader wrapping the given shader.
func NewInteractiveShader(shader *canvas.Shader, disp *EventDispatcher) *InteractiveShader {
	i := &InteractiveShader{
		shader:      shader,
		disp:        disp,
		keysPressed: make(map[string]bool),
	}
	i.ExtendBaseWidget(i)
	return i
}

// Shader returns the underlying canvas.Shader for use by existing handlers.
func (i *InteractiveShader) Shader() *canvas.Shader {
	return i.shader
}

// CreateRenderer returns a SimpleRenderer wrapping the shader.
func (i *InteractiveShader) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(i.shader)
}

// --- desktop.Hoverable ---

func (i *InteractiveShader) MouseIn(e *desktop.MouseEvent) {
	i.disp.fire(EvMouseIn, posData(e.Position))
	i.disp.bridge.sendEvent(Event{Type: "pointerEnter", WidgetID: i.disp.widgetID})
}

func (i *InteractiveShader) MouseOut() {
	i.disp.fire(EvMouseOut, nil)
	i.disp.bridge.sendEvent(Event{Type: "pointerExit", WidgetID: i.disp.widgetID})
}

func (i *InteractiveShader) MouseMoved(e *desktop.MouseEvent) {
	i.disp.fire(EvMouseMoved, posData(e.Position))
}

// --- desktop.Mouseable ---

func (i *InteractiveShader) MouseDown(e *desktop.MouseEvent) {
	i.disp.fire(EvMouseDown, mouseData(e))
}

func (i *InteractiveShader) MouseUp(e *desktop.MouseEvent) {
	i.disp.fire(EvMouseUp, mouseData(e))
}

// --- fyne.Draggable ---

func (i *InteractiveShader) Dragged(e *fyne.DragEvent) {
	i.disp.fire(EvDragged, dragData(e))
}

func (i *InteractiveShader) DragEnd() {
	i.disp.fire(EvDragEnd, nil)
}

// --- fyne.Scrollable ---

func (i *InteractiveShader) Scrolled(e *fyne.ScrollEvent) {
	i.disp.fire(EvScrolled, scrollData(e))
}

// --- fyne.Focusable ---

func (i *InteractiveShader) FocusGained() {
	i.disp.fire(EvFocusGained, map[string]interface{}{"focused": true})
}

func (i *InteractiveShader) FocusLost() {
	i.disp.fire(EvFocusLost, map[string]interface{}{"focused": false})
}

func (i *InteractiveShader) TypedRune(r rune) {
	key := normalizeKey(string(r))
	if !i.keysPressed[key] {
		i.keysPressed[key] = true
		i.disp.fire(EvKeyDown, map[string]interface{}{"key": key})
	}
}

func (i *InteractiveShader) TypedKey(e *fyne.KeyEvent) {
	key := normalizeKey(string(e.Name))
	if !i.keysPressed[key] {
		i.keysPressed[key] = true
		i.disp.fire(EvKeyDown, map[string]interface{}{"key": key})
	}
}

// --- desktop.Keyable ---

// KeyDown is a no-op — we use TypedRune/TypedKey for key-down events
// since they are reliably called for focused widgets.
func (i *InteractiveShader) KeyDown(e *fyne.KeyEvent) {}

func (i *InteractiveShader) KeyUp(e *fyne.KeyEvent) {
	key := normalizeKey(string(e.Name))
	delete(i.keysPressed, key)
	i.disp.fire(EvKeyUp, map[string]interface{}{"key": key})
}

// --- Tooltip support ---

// ShowTooltip displays a tooltip popup at the given position relative to the shader.
func (i *InteractiveShader) ShowTooltip(text string, x, y float32) {
	c := fyne.CurrentApp().Driver().CanvasForObject(i)
	if c == nil {
		return
	}
	fyne.Do(func() {
		i.HideTooltip()
		label := widget.NewLabel(text)
		i.tooltipPopup = widget.NewPopUp(label, c)
		absPos := fyne.CurrentApp().Driver().AbsolutePositionForObject(i)
		i.tooltipPopup.ShowAtPosition(fyne.NewPos(absPos.X+x, absPos.Y+y+20))
	})
}

// HideTooltip hides and removes the tooltip popup.
func (i *InteractiveShader) HideTooltip() {
	if i.tooltipPopup != nil {
		i.tooltipPopup.Hide()
		i.tooltipPopup = nil
	}
}

// Interface assertions
var _ desktop.Hoverable = (*InteractiveShader)(nil)
var _ desktop.Mouseable = (*InteractiveShader)(nil)
var _ fyne.Draggable = (*InteractiveShader)(nil)
var _ fyne.Scrollable = (*InteractiveShader)(nil)
var _ fyne.Focusable = (*InteractiveShader)(nil)
var _ desktop.Keyable = (*InteractiveShader)(nil)
