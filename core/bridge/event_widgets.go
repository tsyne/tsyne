package main

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/driver/desktop"
	"fyne.io/fyne/v2/widget"
)

// ============================================================================
// Concrete widget variants with event capabilities.
// Each type embeds the real Fyne widget + an EventDispatcher.
// Interface methods are implemented explicitly to avoid ambiguity with
// methods already on the base widget (e.g. widget.Button has MouseIn).
// ============================================================================

// LabelWithHover is a label that implements desktop.Hoverable.
type LabelWithHover struct {
	widget.Label
	disp *EventDispatcher
}

func NewLabelWithHover(text string, d *EventDispatcher) *LabelWithHover {
	l := &LabelWithHover{disp: d}
	l.SetText(text)
	l.ExtendBaseWidget(l)
	return l
}

func (l *LabelWithHover) MouseIn(e *desktop.MouseEvent) {
	l.disp.fire(EvMouseIn, posData(e.Position))
	l.disp.bridge.sendEvent(Event{Type: "pointerEnter", WidgetID: l.disp.widgetID})
}
func (l *LabelWithHover) MouseOut() {
	l.disp.fire(EvMouseOut, nil)
	l.disp.bridge.sendEvent(Event{Type: "pointerExit", WidgetID: l.disp.widgetID})
}
func (l *LabelWithHover) MouseMoved(e *desktop.MouseEvent) {
	l.disp.fire(EvMouseMoved, posData(e.Position))
}

var _ desktop.Hoverable = (*LabelWithHover)(nil)

// ButtonWithHover is a button that implements desktop.Hoverable,
// overriding widget.Button's built-in hover to also fire TS callbacks.
type ButtonWithHover struct {
	widget.Button
	disp *EventDispatcher
}

func NewButtonWithHover(text string, onTapped func(), d *EventDispatcher) *ButtonWithHover {
	b := &ButtonWithHover{disp: d}
	b.SetText(text)
	b.OnTapped = onTapped
	b.ExtendBaseWidget(b)
	return b
}

func (b *ButtonWithHover) MouseIn(e *desktop.MouseEvent) {
	b.Button.MouseIn(e) // keep button's hover highlight
	b.disp.fire(EvMouseIn, posData(e.Position))
	b.disp.bridge.sendEvent(Event{Type: "pointerEnter", WidgetID: b.disp.widgetID})
}
func (b *ButtonWithHover) MouseOut() {
	b.Button.MouseOut() // keep button's hover highlight
	b.disp.fire(EvMouseOut, nil)
	b.disp.bridge.sendEvent(Event{Type: "pointerExit", WidgetID: b.disp.widgetID})
}
func (b *ButtonWithHover) MouseMoved(e *desktop.MouseEvent) {
	b.Button.MouseMoved(e)
	b.disp.fire(EvMouseMoved, posData(e.Position))
}

var _ desktop.Hoverable = (*ButtonWithHover)(nil)

// ButtonWithHoverMouse is a button with hover + mouse button tracking.
type ButtonWithHoverMouse struct {
	widget.Button
	disp *EventDispatcher
}

func NewButtonWithHoverMouse(text string, onTapped func(), d *EventDispatcher) *ButtonWithHoverMouse {
	b := &ButtonWithHoverMouse{disp: d}
	b.SetText(text)
	b.OnTapped = onTapped
	b.ExtendBaseWidget(b)
	return b
}

func (b *ButtonWithHoverMouse) MouseIn(e *desktop.MouseEvent) {
	b.Button.MouseIn(e)
	b.disp.fire(EvMouseIn, posData(e.Position))
	b.disp.bridge.sendEvent(Event{Type: "pointerEnter", WidgetID: b.disp.widgetID})
}
func (b *ButtonWithHoverMouse) MouseOut() {
	b.Button.MouseOut()
	b.disp.fire(EvMouseOut, nil)
	b.disp.bridge.sendEvent(Event{Type: "pointerExit", WidgetID: b.disp.widgetID})
}
func (b *ButtonWithHoverMouse) MouseMoved(e *desktop.MouseEvent) {
	b.Button.MouseMoved(e)
	b.disp.fire(EvMouseMoved, posData(e.Position))
}
func (b *ButtonWithHoverMouse) MouseDown(e *desktop.MouseEvent) {
	b.disp.fire(EvMouseDown, mouseData(e))
}
func (b *ButtonWithHoverMouse) MouseUp(e *desktop.MouseEvent) {
	b.disp.fire(EvMouseUp, mouseData(e))
}

var _ desktop.Hoverable = (*ButtonWithHoverMouse)(nil)
var _ desktop.Mouseable = (*ButtonWithHoverMouse)(nil)

// ButtonWithHoverFocusKey is a button with hover + focus + keyboard.
type ButtonWithHoverFocusKey struct {
	widget.Button
	disp    *EventDispatcher
	focused bool
}

func NewButtonWithHoverFocusKey(text string, onTapped func(), d *EventDispatcher) *ButtonWithHoverFocusKey {
	b := &ButtonWithHoverFocusKey{disp: d}
	b.SetText(text)
	b.OnTapped = onTapped
	b.ExtendBaseWidget(b)
	return b
}

// Tapped focuses the button then fires the regular button tap.
func (b *ButtonWithHoverFocusKey) Tapped(e *fyne.PointEvent) {
	if c := fyne.CurrentApp().Driver().CanvasForObject(b); c != nil {
		c.Focus(b)
	}
	b.Button.Tapped(e)
}

// Hoverable
func (b *ButtonWithHoverFocusKey) MouseIn(e *desktop.MouseEvent) {
	b.Button.MouseIn(e)
	b.disp.fire(EvMouseIn, posData(e.Position))
	b.disp.bridge.sendEvent(Event{Type: "pointerEnter", WidgetID: b.disp.widgetID})
}
func (b *ButtonWithHoverFocusKey) MouseOut() {
	b.Button.MouseOut()
	b.disp.fire(EvMouseOut, nil)
	b.disp.bridge.sendEvent(Event{Type: "pointerExit", WidgetID: b.disp.widgetID})
}
func (b *ButtonWithHoverFocusKey) MouseMoved(e *desktop.MouseEvent) {
	b.Button.MouseMoved(e)
	b.disp.fire(EvMouseMoved, posData(e.Position))
}

// Focusable
func (b *ButtonWithHoverFocusKey) FocusGained() {
	b.focused = true
	b.disp.fire(EvFocusGained, map[string]interface{}{"focused": true})
}
func (b *ButtonWithHoverFocusKey) FocusLost() {
	b.focused = false
	b.disp.fire(EvFocusLost, map[string]interface{}{"focused": false})
}
func (b *ButtonWithHoverFocusKey) TypedRune(r rune) {}
func (b *ButtonWithHoverFocusKey) TypedKey(e *fyne.KeyEvent) {}

// Keyable
func (b *ButtonWithHoverFocusKey) KeyDown(e *fyne.KeyEvent) {
	b.disp.fire(EvKeyDown, keyData(e))
}
func (b *ButtonWithHoverFocusKey) KeyUp(e *fyne.KeyEvent) {
	b.disp.fire(EvKeyUp, keyData(e))
}

var _ desktop.Hoverable = (*ButtonWithHoverFocusKey)(nil)
var _ fyne.Focusable = (*ButtonWithHoverFocusKey)(nil)
var _ desktop.Keyable = (*ButtonWithHoverFocusKey)(nil)
