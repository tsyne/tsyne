package main

import (
	"image"
	"image/color"
	"image/draw"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
)

// ============================================================================
// Canvas Polygon Primitive
// ============================================================================

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
	if sw, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
		strokeWidth = float32(sw)
	}

	// Parse points
	var points []fyne.Position
	if pts, ok := msg.Payload["points"].([]interface{}); ok {
		for _, p := range pts {
			if pt, ok := p.(map[string]interface{}); ok {
				x := toFloat32(pt["x"])
				y := toFloat32(pt["y"])
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
	// Ensure minimum size for proper rendering
	if width < 2 {
		width = 2
	}
	if height < 2 {
		height = 2
	}

	// Store offset for the raster coordinate transformation
	offsetX := minX
	offsetY := minY

	// Create a raster that draws the polygon using point-in-polygon algorithm
	// Use NewRaster with a generator function that creates an RGBA image
	capturedFillColor := fillColor
	capturedPoints := points
	capturedOffsetX := offsetX
	capturedOffsetY := offsetY

	raster := canvas.NewRaster(func(w, h int) image.Image {
		img := image.NewRGBA(image.Rect(0, 0, w, h))
		// Fill with transparent
		draw.Draw(img, img.Bounds(), image.Transparent, image.Point{}, draw.Src)

		// Draw polygon using point-in-polygon test
		for py := 0; py < h; py++ {
			for px := 0; px < w; px++ {
				x := float32(px) + capturedOffsetX
				y := float32(py) + capturedOffsetY
				inside := false
				n := len(capturedPoints)
				j := n - 1

				for i := 0; i < n; i++ {
					xi := capturedPoints[i].X
					yi := capturedPoints[i].Y
					xj := capturedPoints[j].X
					yj := capturedPoints[j].Y

					if ((yi > y) != (yj > y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi) {
						inside = !inside
					}
					j = i
				}

				if inside {
					img.Set(px, py, capturedFillColor)
				}
			}
		}
		return img
	})

	raster.SetMinSize(fyne.NewSize(width, height))
	raster.Resize(fyne.NewSize(width, height))
	raster.Move(fyne.NewPos(minX, minY))
	// Force refresh to ensure the raster is rendered
	raster.Refresh()

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
				x := toFloat32(pt["x"])
				y := toFloat32(pt["y"])
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
	if sw, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
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
