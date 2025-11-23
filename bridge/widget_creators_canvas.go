package main

import (
	"fmt"
	"image/color"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
)

// ============================================================================
// Canvas Primitives: Line, Circle, Rectangle, Text, Raster, LinearGradient
// ============================================================================

func (b *Bridge) handleCreateCanvasLine(msg Message) {
	widgetID := msg.Payload["id"].(string)
	x1 := float32(msg.Payload["x1"].(float64))
	y1 := float32(msg.Payload["y1"].(float64))
	x2 := float32(msg.Payload["x2"].(float64))
	y2 := float32(msg.Payload["y2"].(float64))

	line := canvas.NewLine(color.Black)
	line.Position1 = fyne.NewPos(x1, y1)
	line.Position2 = fyne.NewPos(x2, y2)

	// Set stroke color if provided
	if colorHex, ok := msg.Payload["strokeColor"].(string); ok {
		line.StrokeColor = parseHexColorSimple(colorHex)
	}

	// Set stroke width if provided
	if strokeWidth, ok := msg.Payload["strokeWidth"].(float64); ok {
		line.StrokeWidth = float32(strokeWidth)
	}

	b.mu.Lock()
	b.widgets[widgetID] = line
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasline", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateCanvasCircle(msg Message) {
	widgetID := msg.Payload["id"].(string)

	circle := canvas.NewCircle(color.Transparent)

	// Set fill color if provided
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		circle.FillColor = parseHexColorSimple(fillHex)
	}

	// Set stroke color if provided
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		circle.StrokeColor = parseHexColorSimple(strokeHex)
	}

	// Set stroke width if provided
	if strokeWidth, ok := msg.Payload["strokeWidth"].(float64); ok {
		circle.StrokeWidth = float32(strokeWidth)
	}

	// Set position and size
	if x, ok := msg.Payload["x"].(float64); ok {
		if y, ok := msg.Payload["y"].(float64); ok {
			circle.Position1 = fyne.NewPos(float32(x), float32(y))
		}
	}
	if x2, ok := msg.Payload["x2"].(float64); ok {
		if y2, ok := msg.Payload["y2"].(float64); ok {
			circle.Position2 = fyne.NewPos(float32(x2), float32(y2))
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = circle
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvascircle", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateCanvasRectangle(msg Message) {
	widgetID := msg.Payload["id"].(string)

	rect := canvas.NewRectangle(color.Transparent)

	// Set fill color if provided
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		rect.FillColor = parseHexColorSimple(fillHex)
	}

	// Set stroke color if provided
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		rect.StrokeColor = parseHexColorSimple(strokeHex)
	}

	// Set stroke width if provided
	if strokeWidth, ok := msg.Payload["strokeWidth"].(float64); ok {
		rect.StrokeWidth = float32(strokeWidth)
	}

	// Set corner radius if provided
	if radius, ok := msg.Payload["cornerRadius"].(float64); ok {
		rect.CornerRadius = float32(radius)
	}

	// Set minimum size if provided
	if width, ok := msg.Payload["width"].(float64); ok {
		if height, ok := msg.Payload["height"].(float64); ok {
			rect.SetMinSize(fyne.NewSize(float32(width), float32(height)))
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = rect
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasrectangle", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateCanvasText(msg Message) {
	widgetID := msg.Payload["id"].(string)
	text := msg.Payload["text"].(string)

	canvasText := canvas.NewText(text, color.Black)

	// Set text color if provided
	if colorHex, ok := msg.Payload["color"].(string); ok {
		canvasText.Color = parseHexColorSimple(colorHex)
	}

	// Set text size if provided
	if textSize, ok := msg.Payload["textSize"].(float64); ok {
		canvasText.TextSize = float32(textSize)
	}

	// Set text style
	if bold, ok := msg.Payload["bold"].(bool); ok && bold {
		canvasText.TextStyle.Bold = true
	}
	if italic, ok := msg.Payload["italic"].(bool); ok && italic {
		canvasText.TextStyle.Italic = true
	}
	if monospace, ok := msg.Payload["monospace"].(bool); ok && monospace {
		canvasText.TextStyle.Monospace = true
	}

	// Set alignment
	if alignment, ok := msg.Payload["alignment"].(string); ok {
		switch alignment {
		case "leading":
			canvasText.Alignment = fyne.TextAlignLeading
		case "center":
			canvasText.Alignment = fyne.TextAlignCenter
		case "trailing":
			canvasText.Alignment = fyne.TextAlignTrailing
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = canvasText
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvastext", Text: text}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateCanvasRaster(msg Message) {
	widgetID := msg.Payload["id"].(string)
	width := int(msg.Payload["width"].(float64))
	height := int(msg.Payload["height"].(float64))

	// Get the initial pixel data if provided (format: [[r,g,b,a], ...])
	var pixelData [][]uint8
	if pixels, ok := msg.Payload["pixels"].([]interface{}); ok {
		for _, p := range pixels {
			if pArr, ok := p.([]interface{}); ok {
				pixel := make([]uint8, 4)
				for i := 0; i < 4 && i < len(pArr); i++ {
					pixel[i] = uint8(pArr[i].(float64))
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
	raster := canvas.NewRasterWithPixels(func(x, y, w, h int) color.Color {
		b.mu.RLock()
		defer b.mu.RUnlock()
		if buf, ok := b.rasterData[widgetID]; ok {
			if y < len(buf) && x < len(buf[y]) {
				return buf[y][x]
			}
		}
		return color.White
	})

	raster.SetMinSize(fyne.NewSize(float32(width), float32(height)))

	b.mu.Lock()
	b.widgets[widgetID] = raster
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasraster", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleUpdateCanvasRaster(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Raster widget not found",
		})
		return
	}

	raster, ok := w.(*canvas.Raster)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a raster",
		})
		return
	}

	// Update individual pixels if provided
	if updates, ok := msg.Payload["updates"].([]interface{}); ok {
		b.mu.Lock()
		buf := b.rasterData[widgetID]
		for _, upd := range updates {
			if updMap, ok := upd.(map[string]interface{}); ok {
				x := int(updMap["x"].(float64))
				y := int(updMap["y"].(float64))
				r := uint8(updMap["r"].(float64))
				g := uint8(updMap["g"].(float64))
				bl := uint8(updMap["b"].(float64))
				a := uint8(updMap["a"].(float64))

				if y >= 0 && y < len(buf) && x >= 0 && x < len(buf[y]) {
					buf[y][x] = color.RGBA{R: r, G: g, B: bl, A: a}
				}
			}
		}
		b.mu.Unlock()
	}

	// Refresh the raster to show updates
	raster.Refresh()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCreateCanvasLinearGradient(msg Message) {
	widgetID := msg.Payload["id"].(string)

	// Parse start and end colors
	var startColor color.Color = color.White
	var endColor color.Color = color.Black

	if startHex, ok := msg.Payload["startColor"].(string); ok {
		startColor = parseHexColorSimple(startHex)
	}
	if endHex, ok := msg.Payload["endColor"].(string); ok {
		endColor = parseHexColorSimple(endHex)
	}

	gradient := canvas.NewLinearGradient(startColor, endColor, 0)

	// Set angle if provided (in degrees)
	if angle, ok := msg.Payload["angle"].(float64); ok {
		gradient.Angle = angle
	}

	// Set minimum size if provided
	if width, ok := msg.Payload["width"].(float64); ok {
		if height, ok := msg.Payload["height"].(float64); ok {
			gradient.SetMinSize(fyne.NewSize(float32(width), float32(height)))
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = gradient
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvaslineargradient", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleUpdateCanvasLine(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Line widget not found",
		})
		return
	}

	line, ok := w.(*canvas.Line)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a line",
		})
		return
	}

	// Update position if provided
	if x1, ok := msg.Payload["x1"].(float64); ok {
		if y1, ok := msg.Payload["y1"].(float64); ok {
			line.Position1 = fyne.NewPos(float32(x1), float32(y1))
		}
	}
	if x2, ok := msg.Payload["x2"].(float64); ok {
		if y2, ok := msg.Payload["y2"].(float64); ok {
			line.Position2 = fyne.NewPos(float32(x2), float32(y2))
		}
	}

	// Update stroke color if provided
	if colorHex, ok := msg.Payload["strokeColor"].(string); ok {
		line.StrokeColor = parseHexColorSimple(colorHex)
	}

	// Update stroke width if provided
	if strokeWidth, ok := msg.Payload["strokeWidth"].(float64); ok {
		line.StrokeWidth = float32(strokeWidth)
	}

	line.Refresh()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleUpdateCanvasCircle(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Circle widget not found",
		})
		return
	}

	circle, ok := w.(*canvas.Circle)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a circle",
		})
		return
	}

	// Update fill color if provided
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		circle.FillColor = parseHexColorSimple(fillHex)
	}

	// Update stroke color if provided
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		circle.StrokeColor = parseHexColorSimple(strokeHex)
	}

	// Update stroke width if provided
	if strokeWidth, ok := msg.Payload["strokeWidth"].(float64); ok {
		circle.StrokeWidth = float32(strokeWidth)
	}

	// Update position if provided
	if x, ok := msg.Payload["x"].(float64); ok {
		if y, ok := msg.Payload["y"].(float64); ok {
			circle.Position1 = fyne.NewPos(float32(x), float32(y))
		}
	}
	if x2, ok := msg.Payload["x2"].(float64); ok {
		if y2, ok := msg.Payload["y2"].(float64); ok {
			circle.Position2 = fyne.NewPos(float32(x2), float32(y2))
		}
	}

	circle.Refresh()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleUpdateCanvasRectangle(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Rectangle widget not found",
		})
		return
	}

	rect, ok := w.(*canvas.Rectangle)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a rectangle",
		})
		return
	}

	// Update fill color if provided
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		rect.FillColor = parseHexColorSimple(fillHex)
	}

	// Update stroke color if provided
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		rect.StrokeColor = parseHexColorSimple(strokeHex)
	}

	// Update stroke width if provided
	if strokeWidth, ok := msg.Payload["strokeWidth"].(float64); ok {
		rect.StrokeWidth = float32(strokeWidth)
	}

	// Update corner radius if provided
	if radius, ok := msg.Payload["cornerRadius"].(float64); ok {
		rect.CornerRadius = float32(radius)
	}

	// Update size if provided
	if width, ok := msg.Payload["width"].(float64); ok {
		if height, ok := msg.Payload["height"].(float64); ok {
			rect.SetMinSize(fyne.NewSize(float32(width), float32(height)))
		}
	}

	rect.Refresh()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleUpdateCanvasText(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Canvas text widget not found",
		})
		return
	}

	canvasText, ok := w.(*canvas.Text)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a canvas text",
		})
		return
	}

	// Update text if provided
	if text, ok := msg.Payload["text"].(string); ok {
		canvasText.Text = text
	}

	// Update color if provided
	if colorHex, ok := msg.Payload["color"].(string); ok {
		canvasText.Color = parseHexColorSimple(colorHex)
	}

	// Update text size if provided
	if textSize, ok := msg.Payload["textSize"].(float64); ok {
		canvasText.TextSize = float32(textSize)
	}

	canvasText.Refresh()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleUpdateCanvasLinearGradient(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Gradient widget not found",
		})
		return
	}

	gradient, ok := w.(*canvas.LinearGradient)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a linear gradient",
		})
		return
	}

	// Update start color if provided
	if startHex, ok := msg.Payload["startColor"].(string); ok {
		gradient.StartColor = parseHexColorSimple(startHex)
	}

	// Update end color if provided
	if endHex, ok := msg.Payload["endColor"].(string); ok {
		gradient.EndColor = parseHexColorSimple(endHex)
	}

	// Update angle if provided
	if angle, ok := msg.Payload["angle"].(float64); ok {
		gradient.Angle = angle
	}

	gradient.Refresh()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

// parseHexColorSimple parses a hex color string (e.g., "#FF0000" or "FF0000") to color.Color
// This is a simpler version that returns a default color on error, used by canvas primitives
func parseHexColorSimple(hexStr string) color.Color {
	// Remove leading # if present
	if len(hexStr) > 0 && hexStr[0] == '#' {
		hexStr = hexStr[1:]
	}

	// Handle named colors
	switch strings.ToLower(hexStr) {
	case "black":
		return color.RGBA{R: 0, G: 0, B: 0, A: 255}
	case "white":
		return color.RGBA{R: 255, G: 255, B: 255, A: 255}
	case "red":
		return color.RGBA{R: 255, G: 0, B: 0, A: 255}
	case "green":
		return color.RGBA{R: 0, G: 255, B: 0, A: 255}
	case "blue":
		return color.RGBA{R: 0, G: 0, B: 255, A: 255}
	case "yellow":
		return color.RGBA{R: 255, G: 255, B: 0, A: 255}
	case "cyan":
		return color.RGBA{R: 0, G: 255, B: 255, A: 255}
	case "magenta":
		return color.RGBA{R: 255, G: 0, B: 255, A: 255}
	case "gray", "grey":
		return color.RGBA{R: 128, G: 128, B: 128, A: 255}
	}

	// Handle hex colors (#RGB, #RRGGBB, #RRGGBBAA)
	if strings.HasPrefix(hexStr, "#") {
		hexStr = hexStr[1:]
	}

	var r, g, b, a uint8 = 0, 0, 0, 255

	switch len(hexStr) {
	case 3: // #RGB
		fmt.Sscanf(hexStr, "%1x%1x%1x", &r, &g, &b)
		r *= 17
		g *= 17
		b *= 17
	case 6: // #RRGGBB
		fmt.Sscanf(hexStr, "%2x%2x%2x", &r, &g, &b)
	case 8: // #RRGGBBAA
		fmt.Sscanf(hexStr, "%2x%2x%2x%2x", &r, &g, &b, &a)
	}

	return color.RGBA{R: r, G: g, B: b, A: a}
}
