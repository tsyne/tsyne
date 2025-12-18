package main

import (
	"testing"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/test"
)

func TestTappableCanvasRasterReceivesTaps(t *testing.T) {
	app := test.NewApp()
	defer app.Quit()

	tapReceived := false
	tapX := 0
	tapY := 0

	// Create a tappable canvas raster
	raster := NewTappableCanvasRaster(100, 100, func(x, y int) {
		tapReceived = true
		tapX = x
		tapY = y
		t.Logf("Tap received at: %d, %d", x, y)
	})

	// Create a test window and set content
	w := app.NewWindow("Test")
	w.SetContent(raster)
	w.Resize(fyne.NewSize(200, 200))

	// Show window
	w.Show()

	// Give time for layout
	time.Sleep(100 * time.Millisecond)

	// Log widget size
	t.Logf("Widget MinSize: %v", raster.MinSize())
	t.Logf("Widget Size: %v", raster.Size())

	// Simulate a tap at the center of the raster
	test.Tap(raster)

	// Give time for event processing
	time.Sleep(100 * time.Millisecond)

	// Verify tap was received
	if !tapReceived {
		t.Error("Tap was not received by TappableCanvasRaster")
	} else {
		t.Logf("Tap received successfully at: %d, %d", tapX, tapY)
	}
}

func TestTappableCanvasRasterInCenter(t *testing.T) {
	app := test.NewApp()
	defer app.Quit()

	tapReceived := false

	// Create a tappable canvas raster
	raster := NewTappableCanvasRaster(50, 50, func(x, y int) {
		tapReceived = true
		t.Logf("Tap received at: %d, %d", x, y)
	})

	// Wrap in center container
	centered := container.NewCenter(raster)

	// Create a test window and set content
	w := app.NewWindow("Test")
	w.SetContent(centered)
	w.Resize(fyne.NewSize(200, 200))

	// Show window
	w.Show()

	// Give time for layout
	time.Sleep(100 * time.Millisecond)

	// Log widget size
	t.Logf("Widget MinSize: %v", raster.MinSize())
	t.Logf("Widget Size: %v", raster.Size())

	// Simulate a tap
	test.Tap(raster)

	// Give time for event processing
	time.Sleep(100 * time.Millisecond)

	// Verify tap was received
	if !tapReceived {
		t.Error("Tap was not received when wrapped in center container")
	}
}

func TestTappableCanvasRasterInScrollAndCenter(t *testing.T) {
	app := test.NewApp()
	defer app.Quit()

	tapReceived := false

	// Create a tappable canvas raster
	raster := NewTappableCanvasRaster(50, 50, func(x, y int) {
		tapReceived = true
		t.Logf("Tap received at: %d, %d", x, y)
	})

	// Wrap in center container, then scroll container
	centered := container.NewCenter(raster)
	scrolled := container.NewScroll(centered)

	// Create a test window and set content
	w := app.NewWindow("Test")
	w.SetContent(scrolled)
	w.Resize(fyne.NewSize(200, 200))

	// Show window
	w.Show()

	// Give time for layout
	time.Sleep(100 * time.Millisecond)

	// Log widget size
	t.Logf("Widget MinSize: %v", raster.MinSize())
	t.Logf("Widget Size: %v", raster.Size())

	// Simulate a tap
	test.Tap(raster)

	// Give time for event processing
	time.Sleep(100 * time.Millisecond)

	// Verify tap was received
	if !tapReceived {
		t.Error("Tap was not received when wrapped in scroll+center container")
	}
}
