package main

import (
	"fmt"
	"image/color"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
)

// ============================================================================
// Helper functions for type conversion
// ============================================================================

// toInt converts interface{} to int, handling both JSON (float64) and msgpack (various int types)
func toInt(v interface{}) int {
	switch val := v.(type) {
	case float64:
		return int(val)
	case int:
		return val
	case int8:
		return int(val)
	case int16:
		return int(val)
	case int32:
		return int(val)
	case int64:
		return int(val)
	case uint:
		return int(val)
	case uint8:
		return int(val)
	case uint16:
		return int(val)
	case uint32:
		return int(val)
	case uint64:
		return int(val)
	default:
		return 0
	}
}

// toFloat32 converts interface{} to float32, handling both JSON (float64) and msgpack (various numeric types)
func toFloat32(v interface{}) float32 {
	switch val := v.(type) {
	case float64:
		return float32(val)
	case float32:
		return val
	case int:
		return float32(val)
	case int8:
		return float32(val)
	case int16:
		return float32(val)
	case int32:
		return float32(val)
	case int64:
		return float32(val)
	case uint:
		return float32(val)
	case uint8:
		return float32(val)
	case uint16:
		return float32(val)
	case uint32:
		return float32(val)
	case uint64:
		return float32(val)
	default:
		return 0
	}
}

// toFloat64 converts interface{} to float64, handling both JSON (float64) and msgpack (various numeric types)
func toFloat64(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int:
		return float64(val)
	case int8:
		return float64(val)
	case int16:
		return float64(val)
	case int32:
		return float64(val)
	case int64:
		return float64(val)
	case uint:
		return float64(val)
	case uint8:
		return float64(val)
	case uint16:
		return float64(val)
	case uint32:
		return float64(val)
	case uint64:
		return float64(val)
	default:
		return 0
	}
}

// ============================================================================
// Canvas Primitives: Line, Circle, Rectangle, Text, Raster, LinearGradient
// ============================================================================

func (b *Bridge) handleCreateCanvasLine(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	x1 := toFloat32(msg.Payload["x1"])
	y1 := toFloat32(msg.Payload["y1"])
	x2 := toFloat32(msg.Payload["x2"])
	y2 := toFloat32(msg.Payload["y2"])

	line := canvas.NewLine(color.Black)
	// Position1 and Position2 are absolute coordinates in the parent's space
	line.Position1 = fyne.NewPos(x1, y1)
	line.Position2 = fyne.NewPos(x2, y2)

	// Set stroke color if provided
	if colorHex, ok := msg.Payload["strokeColor"].(string); ok {
		line.StrokeColor = parseHexColorSimple(colorHex)
	}

	// Set stroke width if provided
	if strokeWidth, ok := msg.Payload["strokeWidth"]; ok {
		line.StrokeWidth = toFloat32(strokeWidth)
	}

	b.mu.Lock()
	b.widgets[widgetID] = line
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasline", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleCreateCanvasCircle(msg Message) Response {
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
	if strokeWidth, ok := msg.Payload["strokeWidth"]; ok {
		circle.StrokeWidth = toFloat32(strokeWidth)
	}

	// Set position and size
	if x, ok := msg.Payload["x"]; ok {
		if y, ok := msg.Payload["y"]; ok {
			circle.Position1 = fyne.NewPos(toFloat32(x), toFloat32(y))
		}
	}
	if x2, ok := msg.Payload["x2"]; ok {
		if y2, ok := msg.Payload["y2"]; ok {
			circle.Position2 = fyne.NewPos(toFloat32(x2), toFloat32(y2))
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = circle
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvascircle", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleCreateCanvasRectangle(msg Message) Response {
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

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleCreateCanvasText(msg Message) Response {
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

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

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

func (b *Bridge) handleCreateCanvasLinearGradient(msg Message) Response {
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

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateCanvasLine(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Line widget not found",
		}
	}

	line, ok := w.(*canvas.Line)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a line",
		}
	}

	fyne.DoAndWait(func() {
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
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleUpdateCanvasCircle(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Circle widget not found",
		}
	}

	circle, ok := w.(*canvas.Circle)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a circle",
		}
	}

	fyne.DoAndWait(func() {
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
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleUpdateCanvasRectangle(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Rectangle widget not found",
		}
	}

	rect, ok := w.(*canvas.Rectangle)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a rectangle",
		}
	}

	fyne.DoAndWait(func() {
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
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleUpdateCanvasText(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Canvas text widget not found",
		}
	}

	canvasText, ok := w.(*canvas.Text)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a canvas text",
		}
	}

	fyne.DoAndWait(func() {
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
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleUpdateCanvasLinearGradient(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Gradient widget not found",
		}
	}

	gradient, ok := w.(*canvas.LinearGradient)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a linear gradient",
		}
	}

	fyne.DoAndWait(func() {
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
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleCreateCanvasArc(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	// Parse start and end angles (in radians)
	var startAngle, endAngle float64 = 0, 3.14159 // Default half circle
	if sa, ok := msg.Payload["startAngle"].(float64); ok {
		startAngle = sa
	}
	if ea, ok := msg.Payload["endAngle"].(float64); ok {
		endAngle = ea
	}

	// Set fill color if provided
	fillColor := color.RGBA{R: 100, G: 100, B: 255, A: 255} // Default blue
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		fillColor = parseHexColorSimple(fillHex).(color.RGBA)
	}

	// Set stroke color if provided
	var strokeColor color.Color = color.Transparent
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		strokeColor = parseHexColorSimple(strokeHex)
	}

	// Set stroke width if provided
	var strokeWidth float32 = 1
	if sw, ok := msg.Payload["strokeWidth"].(float64); ok {
		strokeWidth = float32(sw)
	}

	// Set position and size
	var x1, y1, x2, y2 float32 = 0, 0, 100, 100
	if x, ok := msg.Payload["x"].(float64); ok {
		x1 = float32(x)
	}
	if y, ok := msg.Payload["y"].(float64); ok {
		y1 = float32(y)
	}
	if x, ok := msg.Payload["x2"].(float64); ok {
		x2 = float32(x)
	}
	if y, ok := msg.Payload["y2"].(float64); ok {
		y2 = float32(y)
	}

	// Store arc metadata for later use
	b.mu.Lock()
	if b.arcData == nil {
		b.arcData = make(map[string]*ArcData)
	}
	b.arcData[widgetID] = &ArcData{
		StartAngle:  startAngle,
		EndAngle:    endAngle,
		FillColor:   fillColor,
		StrokeColor: strokeColor,
		StrokeWidth: strokeWidth,
		X1:          x1,
		Y1:          y1,
		X2:          x2,
		Y2:          y2,
	}
	b.mu.Unlock()

	// Create a raster that draws the arc
	raster := canvas.NewRasterWithPixels(func(px, py, w, h int) color.Color {
		b.mu.RLock()
		arcInfo, exists := b.arcData[widgetID]
		b.mu.RUnlock()

		if !exists {
			return color.Transparent
		}

		// Calculate center and radius
		centerX := float64(w) / 2
		centerY := float64(h) / 2
		radiusX := float64(w) / 2
		radiusY := float64(h) / 2

		// Calculate angle for current pixel
		dx := float64(px) - centerX
		dy := float64(py) - centerY

		// Normalize to unit circle
		nx := dx / radiusX
		ny := dy / radiusY
		dist := nx*nx + ny*ny

		// Check if within the ellipse
		if dist > 1.0 {
			return color.Transparent
		}

		// Calculate angle (atan2 returns -pi to pi)
		angle := atan2(ny, nx)
		if angle < 0 {
			angle += 2 * 3.14159265358979
		}

		// Check if angle is within arc range
		start := arcInfo.StartAngle
		end := arcInfo.EndAngle

		// Normalize angles to 0-2pi range
		for start < 0 {
			start += 2 * 3.14159265358979
		}
		for end < 0 {
			end += 2 * 3.14159265358979
		}
		start = float64Mod(start, 2*3.14159265358979)
		end = float64Mod(end, 2*3.14159265358979)

		// Check if angle falls within the arc
		inArc := false
		if start <= end {
			inArc = angle >= start && angle <= end
		} else {
			inArc = angle >= start || angle <= end
		}

		if inArc {
			return arcInfo.FillColor
		}
		return color.Transparent
	})

	width := x2 - x1
	height := y2 - y1
	if width < 10 {
		width = 100
	}
	if height < 10 {
		height = 100
	}
	raster.SetMinSize(fyne.NewSize(width, height))

	b.mu.Lock()
	b.widgets[widgetID] = raster
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasarc", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateCanvasArc(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	arcInfo, arcExists := b.arcData[widgetID]
	b.mu.RUnlock()

	if !exists || !arcExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Arc widget not found",
		}
	}

	raster, ok := w.(*canvas.Raster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an arc raster",
		}
	}

	// Update arc data
	b.mu.Lock()
	if sa, ok := msg.Payload["startAngle"].(float64); ok {
		arcInfo.StartAngle = sa
	}
	if ea, ok := msg.Payload["endAngle"].(float64); ok {
		arcInfo.EndAngle = ea
	}
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		arcInfo.FillColor = parseHexColorSimple(fillHex).(color.RGBA)
	}
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		arcInfo.StrokeColor = parseHexColorSimple(strokeHex)
	}
	if sw, ok := msg.Payload["strokeWidth"].(float64); ok {
		arcInfo.StrokeWidth = float32(sw)
	}
	b.mu.Unlock()

	fyne.DoAndWait(func() {
		raster.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleCreateCanvasPolygon(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	// Parse fill color
	fillColor := color.RGBA{R: 100, G: 100, B: 255, A: 255} // Default blue
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		fillColor = parseHexColorSimple(fillHex).(color.RGBA)
	}

	// Parse stroke color
	var strokeColor color.Color = color.Transparent
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		strokeColor = parseHexColorSimple(strokeHex)
	}

	// Parse stroke width
	var strokeWidth float32 = 1
	if sw, ok := msg.Payload["strokeWidth"].(float64); ok {
		strokeWidth = float32(sw)
	}

	// Parse points
	var points []fyne.Position
	if pts, ok := msg.Payload["points"].([]interface{}); ok {
		for _, p := range pts {
			if pt, ok := p.(map[string]interface{}); ok {
				x := float32(pt["x"].(float64))
				y := float32(pt["y"].(float64))
				points = append(points, fyne.NewPos(x, y))
			}
		}
	}

	// Store polygon data
	b.mu.Lock()
	if b.polygonData == nil {
		b.polygonData = make(map[string]*PolygonData)
	}
	b.polygonData[widgetID] = &PolygonData{
		Points:      points,
		FillColor:   fillColor,
		StrokeColor: strokeColor,
		StrokeWidth: strokeWidth,
	}
	b.mu.Unlock()

	// Calculate bounding box
	var minX, minY, maxX, maxY float32 = 0, 0, 100, 100
	if len(points) > 0 {
		minX, minY = points[0].X, points[0].Y
		maxX, maxY = points[0].X, points[0].Y
		for _, p := range points {
			if p.X < minX {
				minX = p.X
			}
			if p.Y < minY {
				minY = p.Y
			}
			if p.X > maxX {
				maxX = p.X
			}
			if p.Y > maxY {
				maxY = p.Y
			}
		}
	}

	width := maxX - minX
	height := maxY - minY
	if width < 10 {
		width = 100
	}
	if height < 10 {
		height = 100
	}

	// Create a raster that draws the polygon using point-in-polygon algorithm
	raster := canvas.NewRasterWithPixels(func(px, py, w, h int) color.Color {
		b.mu.RLock()
		polyInfo, exists := b.polygonData[widgetID]
		b.mu.RUnlock()

		if !exists || len(polyInfo.Points) < 3 {
			return color.Transparent
		}

		// Point in polygon test using ray casting
		x := float32(px)
		y := float32(py)
		inside := false
		n := len(polyInfo.Points)
		j := n - 1

		for i := 0; i < n; i++ {
			xi := polyInfo.Points[i].X
			yi := polyInfo.Points[i].Y
			xj := polyInfo.Points[j].X
			yj := polyInfo.Points[j].Y

			if ((yi > y) != (yj > y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi) {
				inside = !inside
			}
			j = i
		}

		if inside {
			return polyInfo.FillColor
		}
		return color.Transparent
	})

	raster.SetMinSize(fyne.NewSize(width, height))

	b.mu.Lock()
	b.widgets[widgetID] = raster
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvaspolygon", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateCanvasPolygon(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	polyInfo, polyExists := b.polygonData[widgetID]
	b.mu.RUnlock()

	if !exists || !polyExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Polygon widget not found",
		}
	}

	raster, ok := w.(*canvas.Raster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a polygon raster",
		}
	}

	// Update polygon data
	b.mu.Lock()
	if pts, ok := msg.Payload["points"].([]interface{}); ok {
		var points []fyne.Position
		for _, p := range pts {
			if pt, ok := p.(map[string]interface{}); ok {
				x := float32(pt["x"].(float64))
				y := float32(pt["y"].(float64))
				points = append(points, fyne.NewPos(x, y))
			}
		}
		polyInfo.Points = points
	}
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		polyInfo.FillColor = parseHexColorSimple(fillHex).(color.RGBA)
	}
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		polyInfo.StrokeColor = parseHexColorSimple(strokeHex)
	}
	if sw, ok := msg.Payload["strokeWidth"].(float64); ok {
		polyInfo.StrokeWidth = float32(sw)
	}
	b.mu.Unlock()

	fyne.DoAndWait(func() {
		raster.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleCreateCanvasRadialGradient(msg Message) Response {
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

	gradient := canvas.NewRadialGradient(startColor, endColor)

	// Set center offset if provided
	if offsetX, ok := msg.Payload["centerOffsetX"].(float64); ok {
		gradient.CenterOffsetX = offsetX
	}
	if offsetY, ok := msg.Payload["centerOffsetY"].(float64); ok {
		gradient.CenterOffsetY = offsetY
	}

	// Set minimum size if provided
	if width, ok := msg.Payload["width"].(float64); ok {
		if height, ok := msg.Payload["height"].(float64); ok {
			gradient.SetMinSize(fyne.NewSize(float32(width), float32(height)))
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = gradient
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasradialgradient", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateCanvasRadialGradient(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Radial gradient widget not found",
		}
	}

	gradient, ok := w.(*canvas.RadialGradient)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a radial gradient",
		}
	}

	fyne.DoAndWait(func() {
		// Update start color if provided
		if startHex, ok := msg.Payload["startColor"].(string); ok {
			gradient.StartColor = parseHexColorSimple(startHex)
		}

		// Update end color if provided
		if endHex, ok := msg.Payload["endColor"].(string); ok {
			gradient.EndColor = parseHexColorSimple(endHex)
		}

		// Update center offset if provided
		if offsetX, ok := msg.Payload["centerOffsetX"].(float64); ok {
			gradient.CenterOffsetX = offsetX
		}
		if offsetY, ok := msg.Payload["centerOffsetY"].(float64); ok {
			gradient.CenterOffsetY = offsetY
		}

		gradient.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// Helper functions for arc calculations
func atan2(y, x float64) float64 {
	// Simple atan2 implementation
	if x > 0 {
		return atan(y / x)
	}
	if x < 0 && y >= 0 {
		return atan(y/x) + 3.14159265358979
	}
	if x < 0 && y < 0 {
		return atan(y/x) - 3.14159265358979
	}
	if x == 0 && y > 0 {
		return 3.14159265358979 / 2
	}
	if x == 0 && y < 0 {
		return -3.14159265358979 / 2
	}
	return 0 // x == 0 && y == 0
}

func atan(x float64) float64 {
	// Simple atan approximation using Taylor series
	if x > 1 {
		return 3.14159265358979/2 - atan(1/x)
	}
	if x < -1 {
		return -3.14159265358979/2 - atan(1/x)
	}
	// Taylor series for |x| <= 1
	result := x
	term := x
	for i := 1; i < 20; i++ {
		term *= -x * x
		result += term / float64(2*i+1)
	}
	return result
}

func float64Mod(a, b float64) float64 {
	for a >= b {
		a -= b
	}
	for a < 0 {
		a += b
	}
	return a
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
	case "transparent":
		return color.RGBA{R: 0, G: 0, B: 0, A: 0}
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

// handleCreateTappableCanvasRaster creates a tappable canvas raster widget that responds to tap events
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

	// Get the initial pixel data if provided (format: [[r,g,b,a], ...])
	if pixels, ok := msg.Payload["pixels"].([]interface{}); ok {
		pixelBytes := make([]byte, width*height*4)

		for i, p := range pixels {
			if pArr, ok := p.([]interface{}); ok && len(pArr) >= 4 {
				pixelBytes[i*4] = uint8(toInt(pArr[0]))     // R
				pixelBytes[i*4+1] = uint8(toInt(pArr[1]))   // G
				pixelBytes[i*4+2] = uint8(toInt(pArr[2]))   // B
				pixelBytes[i*4+3] = uint8(toInt(pArr[3]))   // A
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
	if updates, ok := msg.Payload["updates"].([]interface{}); ok {
		for _, u := range updates {
			if update, ok := u.(map[string]interface{}); ok {
				x := toInt(update["x"])
				y := toInt(update["y"])
				r := uint8(toInt(update["r"]))
				g := uint8(toInt(update["g"]))
				b := uint8(toInt(update["b"]))
				a := uint8(toInt(update["a"]))

				tappable.SetPixel(x, y, r, g, b, a)
			}
		}
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}
