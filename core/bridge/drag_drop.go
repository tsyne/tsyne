package main

import (

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/widget"
)

// Global drag state for simulating drag and drop
var currentDragData string
var currentDragSourceID string

// DraggableWidget wraps a widget to make it draggable
type DraggableWidget struct {
	widget.BaseWidget
	content                fyne.CanvasObject
	dragData               string
	bridge                 *Bridge
	widgetID               string
	onDragStartCallbackID  string
	onDragEndCallbackID    string
	isDragging             bool
}

// NewDraggableWidget creates a new draggable widget wrapper
func NewDraggableWidget(content fyne.CanvasObject, dragData string, bridge *Bridge, widgetID, onDragStartID, onDragEndID string) *DraggableWidget {
	d := &DraggableWidget{
		content:               content,
		dragData:              dragData,
		bridge:                bridge,
		widgetID:              widgetID,
		onDragStartCallbackID: onDragStartID,
		onDragEndCallbackID:   onDragEndID,
	}
	d.ExtendBaseWidget(d)
	return d
}

// CreateRenderer implements fyne.Widget
func (d *DraggableWidget) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(d.content)
}

// Dragged implements fyne.Draggable
func (d *DraggableWidget) Dragged(e *fyne.DragEvent) {
	if !d.isDragging {
		d.isDragging = true
		currentDragData = d.dragData
		currentDragSourceID = d.widgetID


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
}

// DragEnd implements fyne.Draggable
func (d *DraggableWidget) DragEnd() {
	if d.isDragging {
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
	content                 fyne.CanvasObject
	bridge                  *Bridge
	widgetID                string
	onDropCallbackID        string
	onDragEnterCallbackID   string
	onDragLeaveCallbackID   string
	isDragOver              bool
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
	return d
}

// CreateRenderer implements fyne.Widget
func (d *DroppableWidget) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(d.content)
}

// Dragged implements fyne.Draggable - used to detect when something is dragged over
func (d *DroppableWidget) Dragged(e *fyne.DragEvent) {
	if !d.isDragOver && currentDragData != "" {
		d.isDragOver = true

		if d.onDragEnterCallbackID != "" {
			d.bridge.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": d.onDragEnterCallbackID,
					"dragData":   currentDragData,
					"sourceId":   currentDragSourceID,
				},
			})
		}
	}
}

// DragEnd implements fyne.Draggable - called when drag ends over this widget (drop)
func (d *DroppableWidget) DragEnd() {
	if d.isDragOver {

		if d.onDropCallbackID != "" && currentDragData != "" {
			d.bridge.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": d.onDropCallbackID,
					"dragData":   currentDragData,
					"sourceId":   currentDragSourceID,
				},
			})
		}

		d.isDragOver = false
	}
}

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
