package main

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/driver/desktop"
)

// Bitmask constants matching the TypeScript wire protocol.
// Used by handleSetWidgetEvents and widget creators to select event capabilities.
const (
	evBitTap       uint16 = 1 << 0
	evBitDoubleTap uint16 = 1 << 1
	evBitSecTap    uint16 = 1 << 2
	evBitHover     uint16 = 1 << 3
	evBitMouse     uint16 = 1 << 4
	evBitFocus     uint16 = 1 << 5
	evBitKey       uint16 = 1 << 6
	evBitDrag      uint16 = 1 << 7
	evBitScroll    uint16 = 1 << 8
	evBitCursor    uint16 = 1 << 9
)

// EventKind identifies the type of event for indexed dispatch
type EventKind uint8

const (
	EvTap EventKind = iota
	EvDoubleTap
	EvSecondaryTap
	EvMouseIn
	EvMouseOut
	EvMouseMoved
	EvMouseDown
	EvMouseUp
	EvFocusGained
	EvFocusLost
	EvKeyDown
	EvKeyUp
	EvDragged
	EvDragEnd
	EvScrolled
	eventCount
)

// EventDispatcher routes events to TypeScript callbacks via the bridge.
// Callbacks are stored in a fixed-size array indexed by EventKind —
// no map allocation, no string lookup at dispatch time.
type EventDispatcher struct {
	bridge    *Bridge
	widgetID  string
	callbacks [eventCount]string
}

func (d *EventDispatcher) fire(kind EventKind, data map[string]interface{}) {
	cbID := d.callbacks[kind]
	if cbID == "" {
		return
	}
	if data == nil {
		data = map[string]interface{}{"callbackId": cbID}
	} else {
		data["callbackId"] = cbID
	}
	d.bridge.sendEvent(Event{
		Type:     "callback",
		WidgetID: d.widgetID,
		Data:     data,
	})
}

func (d *EventDispatcher) setCallback(kind EventKind, id string) {
	d.callbacks[kind] = id
}

// cbKeyToEventKind maps short wire keys to the EventKind enum
func cbKeyToEventKind(key string) EventKind {
	switch key {
	case "tap":
		return EvTap
	case "doubleTap":
		return EvDoubleTap
	case "secondaryTap":
		return EvSecondaryTap
	case "mouseIn":
		return EvMouseIn
	case "mouseOut":
		return EvMouseOut
	case "mouseMoved":
		return EvMouseMoved
	case "mouseDown":
		return EvMouseDown
	case "mouseUp":
		return EvMouseUp
	case "focusGained":
		return EvFocusGained
	case "focusLost":
		return EvFocusLost
	case "keyDown":
		return EvKeyDown
	case "keyUp":
		return EvKeyUp
	case "dragged":
		return EvDragged
	case "dragEnd":
		return EvDragEnd
	case "scrolled":
		return EvScrolled
	default:
		return EvTap // fallback
	}
}

// ============================================================================
// Capability structs — one per Fyne interface, all dispatch through fire()
// ============================================================================

// Helper functions for building event data maps

func posData(pos fyne.Position) map[string]interface{} {
	return map[string]interface{}{
		"position": map[string]interface{}{
			"x": pos.X,
			"y": pos.Y,
		},
	}
}

func mouseData(e *desktop.MouseEvent) map[string]interface{} {
	return map[string]interface{}{
		"button": int(e.Button),
		"position": map[string]interface{}{
			"x": e.Position.X,
			"y": e.Position.Y,
		},
	}
}

func keyData(e *fyne.KeyEvent) map[string]interface{} {
	return map[string]interface{}{
		"key": string(e.Name),
	}
}

func dragData(e *fyne.DragEvent) map[string]interface{} {
	return map[string]interface{}{
		"position": map[string]interface{}{
			"x": e.Position.X,
			"y": e.Position.Y,
		},
		"dragged": map[string]interface{}{
			"dx": e.Dragged.DX,
			"dy": e.Dragged.DY,
		},
	}
}

func scrollData(e *fyne.ScrollEvent) map[string]interface{} {
	return map[string]interface{}{
		"position": map[string]interface{}{
			"x": e.Position.X,
			"y": e.Position.Y,
		},
		"scrolled": map[string]interface{}{
			"dx": e.Scrolled.DX,
			"dy": e.Scrolled.DY,
		},
	}
}

// TappableCap implements fyne.Tappable
type TappableCap struct{ *EventDispatcher }

func (c *TappableCap) Tapped(*fyne.PointEvent) {
	c.fire(EvTap, nil)
}

// DoubleTappableCap implements fyne.DoubleTappable
type DoubleTappableCap struct{ *EventDispatcher }

func (c *DoubleTappableCap) DoubleTapped(*fyne.PointEvent) {
	c.fire(EvDoubleTap, nil)
}

// SecondaryTappableCap implements fyne.SecondaryTappable
type SecondaryTappableCap struct{ *EventDispatcher }

func (c *SecondaryTappableCap) TappedSecondary(*fyne.PointEvent) {
	c.fire(EvSecondaryTap, nil)
}

// HoverableCap implements desktop.Hoverable
type HoverableCap struct{ *EventDispatcher }

func (c *HoverableCap) MouseIn(e *desktop.MouseEvent) {
	c.fire(EvMouseIn, posData(e.Position))
	// Also send pointerEnter for accessibility announcements
	c.bridge.sendEvent(Event{
		Type:     "pointerEnter",
		WidgetID: c.widgetID,
	})
}

func (c *HoverableCap) MouseOut() {
	c.fire(EvMouseOut, nil)
	// Also send pointerExit for accessibility
	c.bridge.sendEvent(Event{
		Type:     "pointerExit",
		WidgetID: c.widgetID,
	})
}

func (c *HoverableCap) MouseMoved(e *desktop.MouseEvent) {
	c.fire(EvMouseMoved, posData(e.Position))
}

// MouseableCap implements desktop.Mouseable
type MouseableCap struct{ *EventDispatcher }

func (c *MouseableCap) MouseDown(e *desktop.MouseEvent) {
	c.fire(EvMouseDown, mouseData(e))
}

func (c *MouseableCap) MouseUp(e *desktop.MouseEvent) {
	c.fire(EvMouseUp, mouseData(e))
}

// FocusableCap implements fyne.Focusable
type FocusableCap struct {
	*EventDispatcher
	focused bool
}

func (c *FocusableCap) FocusGained() {
	c.focused = true
	c.fire(EvFocusGained, map[string]interface{}{"focused": true})
}

func (c *FocusableCap) FocusLost() {
	c.focused = false
	c.fire(EvFocusLost, map[string]interface{}{"focused": false})
}

func (c *FocusableCap) TypedRune(r rune) {}

func (c *FocusableCap) TypedKey(e *fyne.KeyEvent) {}

// KeyableCap implements desktop.Keyable
type KeyableCap struct{ *EventDispatcher }

func (c *KeyableCap) KeyDown(e *fyne.KeyEvent) {
	c.fire(EvKeyDown, keyData(e))
}

func (c *KeyableCap) KeyUp(e *fyne.KeyEvent) {
	c.fire(EvKeyUp, keyData(e))
}

// DraggableCap implements fyne.Draggable
type DraggableCap struct{ *EventDispatcher }

func (c *DraggableCap) Dragged(e *fyne.DragEvent) {
	c.fire(EvDragged, dragData(e))
}

func (c *DraggableCap) DragEnd() {
	c.fire(EvDragEnd, nil)
}

// ScrollableCap implements fyne.Scrollable (not to be confused with widget.Scroll)
type ScrollableCap struct{ *EventDispatcher }

func (c *ScrollableCap) Scrolled(e *fyne.ScrollEvent) {
	c.fire(EvScrolled, scrollData(e))
}
