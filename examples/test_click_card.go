package main

import (
	"fmt"
	"image"
	"image/color"
	"log"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/widget"
)

// ClickableContainer wraps a canvas object to add single-click support
type ClickableContainer struct {
	widget.BaseWidget
	content       fyne.CanvasObject
	ClickCallback func()
}

// NewClickableContainer creates a new clickable container
func NewClickableContainer(content fyne.CanvasObject, callback func()) *ClickableContainer {
	c := &ClickableContainer{
		content:       content,
		ClickCallback: callback,
	}
	c.ExtendBaseWidget(c)
	return c
}

// Tapped handles single-click events
func (c *ClickableContainer) Tapped(e *fyne.PointEvent) {
	log.Printf("[ClickableContainer] Tapped, firing callback")
	if c.ClickCallback != nil {
		c.ClickCallback()
	}

	// Also tap the content if it's tappable
	if tappable, ok := c.content.(fyne.Tappable); ok {
		tappable.Tapped(e)
	}
}

// CreateRenderer for the clickable container
func (c *ClickableContainer) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(c.content)
}

// createTestCard creates a simple 200x290 image resembling a playing card
func createTestCard() image.Image {
	width, height := 200, 290
	img := image.NewRGBA(image.Rect(0, 0, width, height))

	// White background
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, color.White)
		}
	}

	// Red border
	borderColor := color.RGBA{R: 255, G: 0, B: 0, A: 255}
	borderWidth := 5

	// Top and bottom borders
	for y := 0; y < borderWidth; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, borderColor)
			img.Set(x, height-1-y, borderColor)
		}
	}

	// Left and right borders
	for x := 0; x < borderWidth; x++ {
		for y := 0; y < height; y++ {
			img.Set(x, y, borderColor)
			img.Set(width-1-x, y, borderColor)
		}
	}

	// Add a simple center square
	centerColor := color.RGBA{R: 0, G: 0, B: 0, A: 255}
	centerX, centerY := width/2, height/2
	for y := centerY - 20; y < centerY+20; y++ {
		for x := centerX - 20; x < centerX+20; x++ {
			img.Set(x, y, centerColor)
		}
	}

	return img
}

func main() {
	myApp := app.New()
	myWindow := myApp.NewWindow("Card Click Test - Go/Fyne")
	myWindow.Resize(fyne.NewSize(600, 600))

	// Create a test card image
	testCard := createTestCard()
	log.Printf("Created test card image: %dx%d", testCard.Bounds().Dx(), testCard.Bounds().Dy())

	// Create canvas.Image
	img := canvas.NewImageFromImage(testCard)
	img.FillMode = canvas.ImageFillOriginal
	img.SetMinSize(fyne.NewSize(200, 290))

	clickCount := 0
	statusLabel := widget.NewLabel(fmt.Sprintf("Click count: %d", clickCount))

	// Wrap in clickable container
	clickableCard := NewClickableContainer(img, func() {
		clickCount++
		log.Printf("Card clicked! Count: %d", clickCount)
		statusLabel.SetText(fmt.Sprintf("Click count: %d", clickCount))
	})

	content := container.NewVBox(
		widget.NewLabel("Click Test - Click on the card below"),
		widget.NewSeparator(),
		clickableCard,
		widget.NewSeparator(),
		statusLabel,
	)

	myWindow.SetContent(content)
	myWindow.ShowAndRun()
}
