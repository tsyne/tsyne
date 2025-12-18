// +build ignore

package main

import (
	"fmt"
	"image/color"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/widget"
)

// SimpleTappable is a minimal tappable widget for testing
type SimpleTappable struct {
	widget.BaseWidget
	onTapped func(x, y int)
}

func NewSimpleTappable(onTapped func(x, y int)) *SimpleTappable {
	t := &SimpleTappable{
		onTapped: onTapped,
	}
	t.ExtendBaseWidget(t)
	return t
}

func (t *SimpleTappable) Tapped(ev *fyne.PointEvent) {
	fmt.Printf("SimpleTappable.Tapped at: %.0f, %.0f\n", ev.Position.X, ev.Position.Y)
	if t.onTapped != nil {
		t.onTapped(int(ev.Position.X), int(ev.Position.Y))
	}
}

func (t *SimpleTappable) MinSize() fyne.Size {
	return fyne.NewSize(200, 200)
}

func (t *SimpleTappable) CreateRenderer() fyne.WidgetRenderer {
	rect := canvas.NewRectangle(color.RGBA{R: 100, G: 150, B: 200, A: 255})
	return widget.NewSimpleRenderer(rect)
}

var _ fyne.Tappable = (*SimpleTappable)(nil)

func main() {
	a := app.New()
	w := a.NewWindow("Tap Test")

	label := widget.NewLabel("Click the blue area")

	tappable := NewSimpleTappable(func(x, y int) {
		label.SetText(fmt.Sprintf("Tapped at: %d, %d", x, y))
	})

	// Test 1: Direct in window (no scroll)
	content := container.NewVBox(
		label,
		tappable,
	)

	w.SetContent(content)
	w.Resize(fyne.NewSize(300, 300))
	w.ShowAndRun()
}
