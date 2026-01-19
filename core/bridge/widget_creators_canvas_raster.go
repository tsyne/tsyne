package main

import (
	"bytes"
	"fmt"
	"image"
	"image/color"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
)

// ============================================================================
// Canvas Raster Primitives
// ============================================================================

func (b *Bridge) handleCreateCanvasRaster(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	width := toInt(msg.Payload["width"])
	height := toInt(msg.Payload["height"])

	// Get the initial pixel data if provided (format: [[r,g,b,a], ...])
	var pixelData [][]uint8
	if pixels, ok := msg.Payload["pixels"].([]interface{}); ok {
		for _, p := range pixels {
			if pArr, ok := p.([]interface{}); ok {
				pixel := make([]uint8, 4)
				for i := 0; i < 4 && i < len(pArr); i++ {
					pixel[i] = uint8(toInt(pArr[i]))
				}
				pixelData = append(pixelData, pixel)
			}
		}
	}

	// Create pixel buffer
	pixelBuffer := make([][]color.Color, height)
	for y := 0; y < height; y++ {
		pixelBuffer[y] = make([]color.Color, width)
		for x := 0; x < width; x++ {
			pixelIdx := y*width + x
			if pixelIdx < len(pixelData) {
				p := pixelData[pixelIdx]
				pixelBuffer[y][x] = color.RGBA{R: p[0], G: p[1], B: p[2], A: p[3]}
			} else {
				pixelBuffer[y][x] = color.RGBA{R: 255, G: 255, B: 255, A: 255} // Default white
			}
		}
	}

	// Store pixel buffer for later updates
	b.mu.Lock()
	if b.rasterData == nil {
		b.rasterData = make(map[string][][]color.Color)
	}
	b.rasterData[widgetID] = pixelBuffer
	b.mu.Unlock()

	// Create raster with generator function
	// Store the original dimensions for the generator to use
	origWidth := width
	origHeight := height
	raster := canvas.NewRasterWithPixels(func(x, y, w, h int) color.Color {
		// Scale coordinates from display size (w, h) to buffer size (origWidth, origHeight)
		bufX := x * origWidth / w
		bufY := y * origHeight / h
		if bufX >= origWidth {
			bufX = origWidth - 1
		}
		if bufY >= origHeight {
			bufY = origHeight - 1
		}

		b.mu.RLock()
		defer b.mu.RUnlock()
		if buf, ok := b.rasterData[widgetID]; ok {
			if bufY < len(buf) && bufX < len(buf[bufY]) {
				return buf[bufY][bufX]
			}
		}
		return color.White
	})

	raster.SetMinSize(fyne.NewSize(float32(width), float32(height)))

	b.mu.Lock()
	b.widgets[widgetID] = raster
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasraster", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateCanvasRaster(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Raster widget not found",
		}
	}

	raster, ok := w.(*canvas.Raster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a raster",
		}
	}

	// Update individual pixels if provided
	if updates, ok := msg.Payload["updates"].([]interface{}); ok {
		b.mu.Lock()
		buf := b.rasterData[widgetID]
		for _, upd := range updates {
			if updMap, ok := upd.(map[string]interface{}); ok {
				x := toInt(updMap["x"])
				y := toInt(updMap["y"])
				r := uint8(toInt(updMap["r"]))
				g := uint8(toInt(updMap["g"]))
				bl := uint8(toInt(updMap["b"]))
				a := uint8(toInt(updMap["a"]))

				if y >= 0 && y < len(buf) && x >= 0 && x < len(buf[y]) {
					buf[y][x] = color.RGBA{R: r, G: g, B: bl, A: a}
				}
			}
		}
		b.mu.Unlock()
	}

	// Refresh the raster to show updates (must be done on main thread)
	fyne.Do(func() {
		raster.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleFillCanvasRasterRect fills a rectangular region with a solid color
func (b *Bridge) handleFillCanvasRasterRect(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Raster widget not found",
		}
	}

	raster, ok := w.(*canvas.Raster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a raster",
		}
	}

	// Get fill parameters
	x := toInt(msg.Payload["x"])
	y := toInt(msg.Payload["y"])
	width := toInt(msg.Payload["width"])
	height := toInt(msg.Payload["height"])
	r := uint8(toInt(msg.Payload["r"]))
	g := uint8(toInt(msg.Payload["g"]))
	bl := uint8(toInt(msg.Payload["b"]))
	a := uint8(toInt(msg.Payload["a"]))

	fillColor := color.RGBA{R: r, G: g, B: bl, A: a}

	b.mu.Lock()
	buf := b.rasterData[widgetID]
	if buf != nil {
		bufHeight := len(buf)
		bufWidth := 0
		if bufHeight > 0 {
			bufWidth = len(buf[0])
		}

		// Fill the rectangle with bounds checking
		for dy := 0; dy < height; dy++ {
			py := y + dy
			if py < 0 || py >= bufHeight {
				continue
			}
			for dx := 0; dx < width; dx++ {
				px := x + dx
				if px < 0 || px >= bufWidth {
					continue
				}
				buf[py][px] = fillColor
			}
		}
	}
	b.mu.Unlock()

	// Refresh the raster
	fyne.Do(func() {
		raster.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleBlitToCanvasRaster copies a registered image resource onto the raster
func (b *Bridge) handleBlitToCanvasRaster(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	resourceName := msg.Payload["resourceName"].(string)
	destX := toInt(msg.Payload["x"])
	destY := toInt(msg.Payload["y"])
	alpha := 255
	if a, ok := getFloat64(msg.Payload["alpha"]); ok {
		alpha = int(a)
	}

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Raster widget not found",
		}
	}

	raster, ok := w.(*canvas.Raster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a raster",
		}
	}

	// Get the resource image data
	imgData, resourceExists := b.getResource(resourceName)
	if !resourceExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Resource '%s' not found", resourceName),
		}
	}

	// Decode the image
	decoded, _, err := image.Decode(bytes.NewReader(imgData))
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Failed to decode resource image: %v", err),
		}
	}

	bounds := decoded.Bounds()

	b.mu.Lock()
	buf := b.rasterData[widgetID]
	if buf != nil {
		bufHeight := len(buf)
		bufWidth := 0
		if bufHeight > 0 {
			bufWidth = len(buf[0])
		}

		// Blit the image onto the raster buffer
		for iy := bounds.Min.Y; iy < bounds.Max.Y; iy++ {
			py := destY + (iy - bounds.Min.Y)
			if py < 0 || py >= bufHeight {
				continue
			}
			for ix := bounds.Min.X; ix < bounds.Max.X; ix++ {
				px := destX + (ix - bounds.Min.X)
				if px < 0 || px >= bufWidth {
					continue
				}

				srcColor := decoded.At(ix, iy)
				sr, sg, sb, sa := srcColor.RGBA()
				sr8 := uint8(sr >> 8)
				sg8 := uint8(sg >> 8)
				sb8 := uint8(sb >> 8)
				sa8 := uint8((sa >> 8) * uint32(alpha) / 255)

				// Skip fully transparent pixels
				if sa8 == 0 {
					continue
				}

				// Alpha blending if not fully opaque
				if sa8 < 255 {
					dstColor := buf[py][px]
					dr, dg, db, da := dstColor.RGBA()
					dr8 := uint8(dr >> 8)
					dg8 := uint8(dg >> 8)
					db8 := uint8(db >> 8)
					da8 := uint8(da >> 8)

					srcAlpha := float64(sa8) / 255.0
					invAlpha := 1.0 - srcAlpha

					sr8 = uint8(float64(sr8)*srcAlpha + float64(dr8)*invAlpha)
					sg8 = uint8(float64(sg8)*srcAlpha + float64(dg8)*invAlpha)
					sb8 = uint8(float64(sb8)*srcAlpha + float64(db8)*invAlpha)
					sa8 = uint8(float64(sa8) + float64(da8)*invAlpha)
				}

				buf[py][px] = color.RGBA{R: sr8, G: sg8, B: sb8, A: sa8}
			}
		}
	}
	b.mu.Unlock()

	// Refresh the raster
	fyne.Do(func() {
		raster.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}
