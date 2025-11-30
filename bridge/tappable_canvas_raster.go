package main

import (
	"image"
	"image/color"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/widget"
)

// TappableCanvasRaster is a canvas raster that can respond to taps and provides position information.
type TappableCanvasRaster struct {
	widget.BaseWidget
	raster      *canvas.Raster
	pixelBuffer []byte
	width       int
	height      int
	onTapped    func(x, y int)
}

// NewTappableCanvasRaster creates a new tappable raster canvas.
func NewTappableCanvasRaster(width, height int, onTapped func(x, y int)) *TappableCanvasRaster {
	t := &TappableCanvasRaster{
		width:       width,
		height:      height,
		onTapped:    onTapped,
		pixelBuffer: make([]byte, width*height*4),
	}

	// Initialize with white pixels
	for i := 0; i < len(t.pixelBuffer); i += 4 {
		t.pixelBuffer[i] = 255   // R
		t.pixelBuffer[i+1] = 255 // G
		t.pixelBuffer[i+2] = 255 // B
		t.pixelBuffer[i+3] = 255 // A
	}

	t.raster = canvas.NewRaster(t.generateImage)
	t.ExtendBaseWidget(t)
	return t
}

// generateImage creates the image from the pixel buffer.
func (t *TappableCanvasRaster) generateImage(w, h int) image.Image {
	img := image.NewRGBA(image.Rect(0, 0, t.width, t.height))

	for y := 0; y < t.height; y++ {
		for x := 0; x < t.width; x++ {
			idx := (y*t.width + x) * 4
			if idx+3 < len(t.pixelBuffer) {
				img.Set(x, y, color.RGBA{
					R: t.pixelBuffer[idx],
					G: t.pixelBuffer[idx+1],
					B: t.pixelBuffer[idx+2],
					A: t.pixelBuffer[idx+3],
				})
			}
		}
	}

	return img
}

// SetPixels updates the pixel buffer with the provided pixel data.
func (t *TappableCanvasRaster) SetPixels(pixels []byte) {
	if len(pixels) == len(t.pixelBuffer) {
		copy(t.pixelBuffer, pixels)
		t.raster.Refresh()
	}
}

// SetPixel sets a single pixel at the given coordinates.
func (t *TappableCanvasRaster) SetPixel(x, y int, r, g, b, a uint8) {
	if x >= 0 && x < t.width && y >= 0 && y < t.height {
		idx := (y*t.width + x) * 4
		if idx+3 < len(t.pixelBuffer) {
			t.pixelBuffer[idx] = r
			t.pixelBuffer[idx+1] = g
			t.pixelBuffer[idx+2] = b
			t.pixelBuffer[idx+3] = a
			t.raster.Refresh()
		}
	}
}

// CreateRenderer is a private method to Fyne which links this widget to its renderer.
func (t *TappableCanvasRaster) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(t.raster)
}

// Tapped is called when the raster is tapped/clicked.
func (t *TappableCanvasRaster) Tapped(ev *fyne.PointEvent) {
	if t.onTapped != nil {
		// Convert the position to pixel coordinates
		// For now, we'll use direct position - zooming will be handled in the app layer
		x := int(ev.Position.X)
		y := int(ev.Position.Y)
		t.onTapped(x, y)
	}
}

// MinSize returns the minimum size of the widget.
func (t *TappableCanvasRaster) MinSize() fyne.Size {
	return fyne.NewSize(float32(t.width), float32(t.height))
}
