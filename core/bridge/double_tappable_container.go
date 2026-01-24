package main

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/widget"
)

// DoubleTappableContainer is a container that handles double taps.
type DoubleTappableContainer struct {
	widget.BaseWidget
	content      fyne.CanvasObject
	onDoubleTapped func()
}

// NewDoubleTappableContainer creates a new DoubleTappableContainer.
func NewDoubleTappableContainer(content fyne.CanvasObject, onDoubleTapped func()) *DoubleTappableContainer {
	c := &DoubleTappableContainer{
		content:      content,
		onDoubleTapped: onDoubleTapped,
	}
	c.ExtendBaseWidget(c)
	return c
}

// CreateRenderer is a private method to Fyne which links this widget to its renderer
func (c *DoubleTappableContainer) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(c.content)
}

// DoubleTapped is called when the container is double-tapped.
func (c *DoubleTappableContainer) DoubleTapped(_ *fyne.PointEvent) {
	if c.onDoubleTapped != nil {
		c.onDoubleTapped()
	}
}

// MinSize returns the minimum size of the double-tappable container (delegates to content)
func (c *DoubleTappableContainer) MinSize() fyne.Size {
	return c.content.MinSize()
}
