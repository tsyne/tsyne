package main

import (
	"bytes"
	"encoding/base64"
	"image"

	"fyne.io/fyne/v2"
)

// ============================================================================
// Tappable Canvas Raster Handlers
// ============================================================================

func (b *Bridge) handleCreateTappableCanvasRaster(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	width := toInt(msg.Payload["width"])
	height := toInt(msg.Payload["height"])

	// Create the tappable raster with a tap callback
	tappable := NewTappableCanvasRaster(width, height, func(x, y int) {
		// Send tap event back to the TypeScript layer
		b.sendEvent(Event{
			Type:     "canvasRasterTapped",
			WidgetID: widgetID,
			Data: map[string]interface{}{
				"x": x,
				"y": y,
			},
		})
	})

	// Set up keyboard callbacks if provided
	onKeyDownCallbackId, _ := msg.Payload["onKeyDownCallbackId"].(string)
	onKeyUpCallbackId, _ := msg.Payload["onKeyUpCallbackId"].(string)
	if onKeyDownCallbackId != "" || onKeyUpCallbackId != "" {
		tappable.SetKeyCallbacks(b, onKeyDownCallbackId, onKeyUpCallbackId)
	}

	// Set up scroll callback if provided
	onScrollCallbackId, _ := msg.Payload["onScrollCallbackId"].(string)
	if onScrollCallbackId != "" {
		tappable.SetOnScrollCallback(b, onScrollCallbackId)
	}

	// Set up mouse move callback if provided
	onMouseMoveCallbackId, _ := msg.Payload["onMouseMoveCallbackId"].(string)
	if onMouseMoveCallbackId != "" {
		tappable.SetOnMouseMoveCallback(b, onMouseMoveCallbackId)
	}

	// Set up drag callbacks if provided
	onDragCallbackId, _ := msg.Payload["onDragCallbackId"].(string)
	onDragEndCallbackId, _ := msg.Payload["onDragEndCallbackId"].(string)
	if onDragCallbackId != "" || onDragEndCallbackId != "" {
		tappable.SetOnDragCallback(b, onDragCallbackId, onDragEndCallbackId)
	}

	// Position the widget at (0,0) and resize to fill canvas area
	// This is required for NewWithoutLayout containers to receive tap events
	tappable.Move(fyne.NewPos(0, 0))
	tappable.Resize(fyne.NewSize(float32(width), float32(height)))

	// Get the initial pixel data if provided (format: [[r,g,b,a], ...])
	if pixels, ok := msg.Payload["pixels"].([]interface{}); ok {
		pixelBytes := make([]byte, width*height*4)

		for i, p := range pixels {
			if pArr, ok := p.([]interface{}); ok && len(pArr) >= 4 {
				pixelBytes[i*4] = uint8(toInt(pArr[0]))   // R
				pixelBytes[i*4+1] = uint8(toInt(pArr[1])) // G
				pixelBytes[i*4+2] = uint8(toInt(pArr[2])) // B
				pixelBytes[i*4+3] = uint8(toInt(pArr[3])) // A
			}
		}

		tappable.SetPixels(pixelBytes)
	}

	b.mu.Lock()
	b.widgets[widgetID] = tappable
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "tappablecanvasraster", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

// handleUpdateTappableCanvasRaster updates pixels in a tappable canvas raster
func (b *Bridge) handleUpdateTappableCanvasRaster(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Tappable raster widget not found",
		}
	}

	tappable, ok := w.(*TappableCanvasRaster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a tappable canvas raster",
		}
	}

	// Handle pixel updates (format: [{x, y, r, g, b, a}, ...])
	// Use SetPixelNoRefresh for all pixels, then refresh once at the end
	if updates, ok := msg.Payload["updates"].([]interface{}); ok {
		for _, u := range updates {
			if update, ok := u.(map[string]interface{}); ok {
				x := toInt(update["x"])
				y := toInt(update["y"])
				r := uint8(toInt(update["r"]))
				g := uint8(toInt(update["g"]))
				bl := uint8(toInt(update["b"]))
				a := uint8(toInt(update["a"]))

				tappable.SetPixelNoRefresh(x, y, r, g, bl, a)
			}
		}
		// Single refresh after all pixels are set
		tappable.RefreshCanvas()
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleResizeTappableCanvasRaster resizes the pixel buffer of a tappable canvas raster
func (b *Bridge) handleResizeTappableCanvasRaster(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	width := toInt(msg.Payload["width"])
	height := toInt(msg.Payload["height"])

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Tappable raster widget not found",
		}
	}

	tappable, ok := w.(*TappableCanvasRaster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a tappable canvas raster",
		}
	}

	tappable.ResizeBuffer(width, height)

	return Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"width":  width,
			"height": height,
		},
	}
}

// handleFocusTappableCanvasRaster requests keyboard focus for a tappable canvas raster
func (b *Bridge) handleFocusTappableCanvasRaster(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Tappable raster widget not found",
		}
	}

	tappable, ok := w.(*TappableCanvasRaster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a tappable canvas raster",
		}
	}

	fyne.Do(func() {
		tappable.RequestFocus()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleSetTappableCanvasImage sets the canvas from a base64-encoded PNG image
// This allows sending PNG bytes directly without TS-side decoding
func (b *Bridge) handleSetTappableCanvasImage(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	imageB64 := msg.Payload["image"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Tappable raster widget not found",
		}
	}

	tappable, ok := w.(*TappableCanvasRaster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a tappable canvas raster",
		}
	}

	// Decode base64 image data
	imageBytes, err := base64.StdEncoding.DecodeString(imageB64)
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Failed to decode image data: " + err.Error(),
		}
	}

	// Decode the PNG image
	img, _, err := image.Decode(bytes.NewReader(imageBytes))
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Failed to decode PNG image: " + err.Error(),
		}
	}

	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	// Convert image to RGBA pixels
	pixels := make([]byte, width*height*4)
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			r, g, bl, a := img.At(bounds.Min.X+x, bounds.Min.Y+y).RGBA()
			idx := (y*width + x) * 4
			pixels[idx] = uint8(r >> 8)
			pixels[idx+1] = uint8(g >> 8)
			pixels[idx+2] = uint8(bl >> 8)
			pixels[idx+3] = uint8(a >> 8)
		}
	}

	// Set all pixels at once
	tappable.SetPixels(pixels)

	return Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"width":  width,
			"height": height,
		},
	}
}

// handleSetTappableCanvasBuffer sets all pixels at once from a base64-encoded RGBA buffer
func (b *Bridge) handleSetTappableCanvasBuffer(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	bufferB64 := msg.Payload["buffer"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Tappable raster widget not found",
		}
	}

	tappable, ok := w.(*TappableCanvasRaster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a tappable canvas raster",
		}
	}

	// Decode base64 buffer
	pixels, err := base64.StdEncoding.DecodeString(bufferB64)
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Failed to decode pixel buffer: " + err.Error(),
		}
	}

	// Set all pixels at once
	tappable.SetPixels(pixels)

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleSetTappableCanvasRect sets a rectangular region of pixels from a base64-encoded RGBA buffer
func (b *Bridge) handleSetTappableCanvasRect(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	x := toInt(msg.Payload["x"])
	y := toInt(msg.Payload["y"])
	rectWidth := toInt(msg.Payload["width"])
	rectHeight := toInt(msg.Payload["height"])
	bufferB64 := msg.Payload["buffer"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Tappable raster widget not found",
		}
	}

	tappable, ok := w.(*TappableCanvasRaster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a tappable canvas raster",
		}
	}

	// Decode base64 buffer
	pixels, err := base64.StdEncoding.DecodeString(bufferB64)
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Failed to decode pixel buffer: " + err.Error(),
		}
	}

	// Set the rectangular region
	tappable.SetPixelRect(x, y, rectWidth, rectHeight, pixels)

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}
