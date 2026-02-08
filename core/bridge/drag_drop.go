package main

import (
	"image/color"
	"sync"

	"fyne.io/fyne/v2"
	fyneCanvas "fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/widget"
)

// Global drag state for simulating drag and drop
var currentDragData string
var currentDragSourceID string

// Global drop target registry — DraggableWidget hit-tests against these during drag
var (
	dropTargetsMu sync.RWMutex
	dropTargets   []*DroppableWidget
)

func registerDropTarget(d *DroppableWidget) {
	dropTargetsMu.Lock()
	dropTargets = append(dropTargets, d)
	dropTargetsMu.Unlock()
}

func unregisterDropTarget(d *DroppableWidget) {
	dropTargetsMu.Lock()
	for i, dt := range dropTargets {
		if dt == d {
			dropTargets = append(dropTargets[:i], dropTargets[i+1:]...)
			break
		}
	}
	dropTargetsMu.Unlock()
}

// findDropTargetAt finds the drop target under the given absolute position
func findDropTargetAt(absPos fyne.Position) *DroppableWidget {
	dropTargetsMu.RLock()
	defer dropTargetsMu.RUnlock()

	for _, dt := range dropTargets {
		c := fyne.CurrentApp().Driver().CanvasForObject(dt)
		if c == nil {
			continue
		}
		dtAbsPos := fyne.CurrentApp().Driver().AbsolutePositionForObject(dt)
		dtSize := dt.Size()

		if absPos.X >= dtAbsPos.X && absPos.X <= dtAbsPos.X+dtSize.Width &&
			absPos.Y >= dtAbsPos.Y && absPos.Y <= dtAbsPos.Y+dtSize.Height {
			return dt
		}
	}
	return nil
}

// currentHoverTarget tracks which drop target the cursor is currently over
var currentHoverTarget *DroppableWidget

// lastCursorAbs tracks the last absolute cursor position during drag (for index calc at DragEnd)
var lastCursorAbs fyne.Position

// calculateDropIndex determines where in a container's children the cursor position falls.
// Returns the insertion index (0 = before first child, len = after last child).
func calculateDropIndex(dt *DroppableWidget, cursorAbsY float32) int {
	cont, ok := dt.content.(*fyne.Container)
	if !ok {
		return -1
	}
	dtAbsPos := fyne.CurrentApp().Driver().AbsolutePositionForObject(dt)
	cursorRelY := cursorAbsY - dtAbsPos.Y

	for i, child := range cont.Objects {
		childPos := child.Position()
		childSize := child.Size()
		childMid := childPos.Y + childSize.Height/2
		if cursorRelY < childMid {
			return i
		}
	}
	return len(cont.Objects)
}

// DraggableWidget wraps a widget to make it draggable
type DraggableWidget struct {
	widget.BaseWidget
	content                  fyne.CanvasObject
	dragData                 string
	dragLabel                string
	bridge                   *Bridge
	widgetID                 string
	onDragStartCallbackID    string
	onDragEndCallbackID      string
	onDoubleTapCallbackID    string
	onTapCallbackID          string
	isDragging               bool
	// Floating ghost overlay during drag
	ghostOverlay fyne.CanvasObject
	ghostCanvas  fyne.Canvas
	dragOffsetX  float32
	dragOffsetY  float32
}

// NewDraggableWidget creates a new draggable widget wrapper
func NewDraggableWidget(content fyne.CanvasObject, dragData, dragLabel string, bridge *Bridge, widgetID, onDragStartID, onDragEndID, onDoubleTapID, onTapID string) *DraggableWidget {
	d := &DraggableWidget{
		content:               content,
		dragData:              dragData,
		dragLabel:             dragLabel,
		bridge:                bridge,
		widgetID:              widgetID,
		onDragStartCallbackID: onDragStartID,
		onDragEndCallbackID:   onDragEndID,
		onDoubleTapCallbackID: onDoubleTapID,
		onTapCallbackID:       onTapID,
	}
	d.ExtendBaseWidget(d)
	return d
}

// DoubleTapped implements fyne.DoubleTappable
func (d *DraggableWidget) DoubleTapped(_ *fyne.PointEvent) {
	if d.onDoubleTapCallbackID != "" {
		d.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": d.onDoubleTapCallbackID,
				"dragData":   d.dragData,
			},
		})
	}
}

// Tapped implements fyne.Tappable
func (d *DraggableWidget) Tapped(_ *fyne.PointEvent) {
	if d.onTapCallbackID != "" {
		d.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": d.onTapCallbackID,
				"dragData":   d.dragData,
			},
		})
	}
}

// CreateRenderer implements fyne.Widget
func (d *DraggableWidget) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(d.content)
}

// createGhostOverlay builds a floating card representation for dragging
func (d *DraggableWidget) createGhostOverlay() fyne.CanvasObject {
	bg := fyneCanvas.NewRectangle(color.NRGBA{255, 255, 255, 210})
	bg.StrokeColor = color.NRGBA{0, 120, 191, 200} // blue border
	bg.StrokeWidth = 2
	bg.CornerRadius = 4

	label := d.dragLabel
	if label == "" {
		label = d.dragData
	}
	text := widget.NewLabel(label)

	ghost := container.NewStack(bg, container.NewPadded(text))

	// Size to match the dragged widget
	size := d.Size()
	if size.Width < 80 {
		size.Width = 180
	}
	if size.Height < 20 {
		size.Height = 36
	}
	ghost.Resize(size)

	return ghost
}

// Dragged implements fyne.Draggable
func (d *DraggableWidget) Dragged(e *fyne.DragEvent) {
	if !d.isDragging {
		d.isDragging = true
		currentDragData = d.dragData
		currentDragSourceID = d.widgetID

		// Create and show the ghost overlay
		c := fyne.CurrentApp().Driver().CanvasForObject(d)
		if c != nil {
			d.ghostCanvas = c
			d.ghostOverlay = d.createGhostOverlay()
			// Offset so ghost is centered on cursor
			ghostSize := d.ghostOverlay.Size()
			d.dragOffsetX = ghostSize.Width / 2
			d.dragOffsetY = ghostSize.Height / 2
			c.Overlays().Add(d.ghostOverlay)
		}

		if d.onDragStartCallbackID != "" {
			d.bridge.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": d.onDragStartCallbackID,
					"dragData":   d.dragData,
				},
			})
		}
	}

	// Hit-test drop targets: convert drag position to absolute coordinates
	absPos := fyne.CurrentApp().Driver().AbsolutePositionForObject(d)
	cursorAbs := fyne.NewPos(absPos.X+e.Position.X, absPos.Y+e.Position.Y)
	lastCursorAbs = cursorAbs

	// Move the ghost overlay to follow the cursor
	if d.ghostOverlay != nil {
		d.ghostOverlay.Move(fyne.NewPos(cursorAbs.X-d.dragOffsetX, cursorAbs.Y-d.dragOffsetY))
	}

	target := findDropTargetAt(cursorAbs)

	// Handle enter/leave transitions
	if target != currentHoverTarget {
		if currentHoverTarget != nil {
			currentHoverTarget.handleDragLeave()
		}
		if target != nil {
			target.handleDragEnter(currentDragData, currentDragSourceID)
		}
		currentHoverTarget = target
	}
}

// DragEnd implements fyne.Draggable
func (d *DraggableWidget) DragEnd() {
	if d.isDragging {
		// Remove the ghost overlay
		if d.ghostOverlay != nil && d.ghostCanvas != nil {
			d.ghostCanvas.Overlays().Remove(d.ghostOverlay)
			d.ghostOverlay = nil
			d.ghostCanvas = nil
		}

		// If hovering over a drop target, fire the drop
		if currentHoverTarget != nil {
			dropIndex := calculateDropIndex(currentHoverTarget, lastCursorAbs.Y)
			currentHoverTarget.handleDrop(currentDragData, currentDragSourceID, dropIndex)
			currentHoverTarget = nil
		}

		d.isDragging = false

		if d.onDragEndCallbackID != "" {
			d.bridge.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": d.onDragEndCallbackID,
					"dragData":   d.dragData,
				},
			})
		}

		// Clear global drag state
		currentDragData = ""
		currentDragSourceID = ""
	}
}

// SetDragData updates the drag data
func (d *DraggableWidget) SetDragData(data string) {
	d.dragData = data
}

// DroppableWidget wraps a widget to make it a drop target
type DroppableWidget struct {
	widget.BaseWidget
	content               fyne.CanvasObject
	bridge                *Bridge
	widgetID              string
	onDropCallbackID      string
	onDragEnterCallbackID string
	onDragLeaveCallbackID string
	isDragOver            bool
}

// NewDroppableWidget creates a new droppable widget wrapper
func NewDroppableWidget(content fyne.CanvasObject, bridge *Bridge, widgetID, onDropID, onDragEnterID, onDragLeaveID string) *DroppableWidget {
	d := &DroppableWidget{
		content:               content,
		bridge:                bridge,
		widgetID:              widgetID,
		onDropCallbackID:      onDropID,
		onDragEnterCallbackID: onDragEnterID,
		onDragLeaveCallbackID: onDragLeaveID,
	}
	d.ExtendBaseWidget(d)
	registerDropTarget(d)
	return d
}

// CreateRenderer implements fyne.Widget
func (d *DroppableWidget) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(d.content)
}

// handleDragEnter is called by DraggableWidget hit-testing when cursor enters this target
func (d *DroppableWidget) handleDragEnter(dragData, sourceID string) {
	if d.isDragOver {
		return
	}
	d.isDragOver = true

	if d.onDragEnterCallbackID != "" {
		d.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": d.onDragEnterCallbackID,
				"dragData":   dragData,
				"sourceId":   sourceID,
			},
		})
	}
}

// handleDragLeave is called by DraggableWidget hit-testing when cursor leaves this target
func (d *DroppableWidget) handleDragLeave() {
	if !d.isDragOver {
		return
	}
	d.isDragOver = false

	if d.onDragLeaveCallbackID != "" {
		d.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": d.onDragLeaveCallbackID,
			},
		})
	}
}

// handleDrop is called by DraggableWidget when drag ends over this target
func (d *DroppableWidget) handleDrop(dragData, sourceID string, dropIndex int) {
	if d.onDropCallbackID != "" {
		d.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": d.onDropCallbackID,
				"dragData":   dragData,
				"sourceId":   sourceID,
				"dropIndex":  dropIndex,
			},
		})
	}
	d.isDragOver = false
}

// Dragged implements fyne.Draggable — no-op, hit-testing is driven from DraggableWidget
func (d *DroppableWidget) Dragged(e *fyne.DragEvent) {}

// DragEnd implements fyne.Draggable — no-op, drop handling is driven from DraggableWidget
func (d *DroppableWidget) DragEnd() {}

// SimulateDrop simulates a drop event (for testing)
func (d *DroppableWidget) SimulateDrop(dragData, sourceID string) {
	if d.onDropCallbackID != "" {
		d.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": d.onDropCallbackID,
				"dragData":   dragData,
				"sourceId":   sourceID,
			},
		})
	}
}
