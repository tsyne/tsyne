package main

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/widget"
)

// DraggableContainer is a container that handles drag events.
type DraggableContainer struct {
	widget.BaseWidget
	content   fyne.CanvasObject
	onDrag    func(x, y float32)
	onDragEnd func(x, y float32)
	onClick   func()
}

// NewDraggableContainer creates a new DraggableContainer.
func NewDraggableContainer(content fyne.CanvasObject, onDrag, onDragEnd func(x, y float32), onClick func()) *DraggableContainer {
	c := &DraggableContainer{
		content:   content,
		onDrag:    onDrag,
		onDragEnd: onDragEnd,
		onClick:   onClick,
	}
	c.ExtendBaseWidget(c)
	return c
}

// CreateRenderer is a private method to Fyne which links this widget to its renderer
func (c *DraggableContainer) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(c.content)
}

// Dragged is called when the container is dragged.
func (c *DraggableContainer) Dragged(e *fyne.DragEvent) {
	if c.onDrag != nil {
		c.onDrag(e.Position.X, e.Position.Y)
	}
}

// DragEnd is called when the drag event ends.
func (c *DraggableContainer) DragEnd() {
	if c.onDragEnd != nil {
		// Fyne does not provide the position on DragEnd, so we can't pass it here.
		c.onDragEnd(0, 0)
	}
}

// Tapped is called when the container is tapped.
func (c *DraggableContainer) Tapped(_ *fyne.PointEvent) {
	if c.onClick != nil {
		c.onClick()
	}
}
