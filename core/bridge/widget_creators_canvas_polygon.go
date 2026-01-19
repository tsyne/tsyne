package main

import (
	"image"
	"image/color"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
)

// ============================================================================
// Canvas Polygon Primitive
// ============================================================================

func calculatePolygonBounds(points []fyne.Position) (minX, minY, width, height float32) {
	if len(points) == 0 {
		return 0, 0, 2, 2
	}
	minX, minY = points[0].X, points[0].Y
	maxX, maxY := points[0].X, points[0].Y
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
	width = maxX - minX
	height = maxY - minY
	if width < 2 {
		width = 2
	}
	if height < 2 {
		height = 2
	}
	return
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

	minX, minY, width, height := calculatePolygonBounds(points)

	// Create a raster that draws the polygon using point-in-polygon algorithm
	// Use NewRaster with a generator function that creates an RGBA image
	
	// We capture 'b' and 'widgetID' to look up current data, enabling updates
	raster := canvas.NewRaster(func(w, h int) image.Image {
		if w <= 0 || h <= 0 {
			return image.NewRGBA(image.Rect(0, 0, 0, 0))
		}

		b.mu.RLock()
		polyData, ok := b.polygonData[widgetID]
		// Copy data to avoid holding lock during rendering
		var currentPoints []fyne.Position
		var currentFill color.RGBA
		if ok {
			currentPoints = make([]fyne.Position, len(polyData.Points))
			copy(currentPoints, polyData.Points)
			currentFill = polyData.FillColor
		}
		b.mu.RUnlock()

		if !ok || len(currentPoints) == 0 {
			return image.NewRGBA(image.Rect(0, 0, w, h))
		}

		// Recalculate bounds to determine local coordinates
		pMinX, pMinY, pWidth, pHeight := calculatePolygonBounds(currentPoints)

		// Calculate scale factors (Physical Pixels / Logical Units)
		scaleX := float32(w) / pWidth
		scaleY := float32(h) / pHeight

		if w > 1 && h > 1 {
			// fmt.Printf("DEBUG: PolygonRaster id=%s w=%d h=%d logicalW=%f logicalH=%f scaleX=%f scaleY=%f\n", widgetID, w, h, pWidth, pHeight, scaleX, scaleY)
		}

		img := image.NewRGBA(image.Rect(0, 0, w, h))
		// Fill with transparent (default for NewRGBA)
		
		// Draw polygon using point-in-polygon test
		for py := 0; py < h; py++ {
			for px := 0; px < w; px++ {
				// Convert physical pixel (px, py) to logical coordinate space
				// x_logical = minX + (px / scaleX)
				x := pMinX + (float32(px) / scaleX)
				y := pMinY + (float32(py) / scaleY)
				
				inside := false
				n := len(currentPoints)
				j := n - 1

				for i := 0; i < n; i++ {
					xi := currentPoints[i].X
					yi := currentPoints[i].Y
					xj := currentPoints[j].X
					yj := currentPoints[j].Y

					if ((yi > y) != (yj > y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi) {
						inside = !inside
					}
					j = i
				}

				if inside {
					img.Set(px, py, currentFill)
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
	
	// Recalculate bounds with new points
	minX, minY, width, height := calculatePolygonBounds(polyInfo.Points)
	b.mu.Unlock()

	fyne.DoAndWait(func() {
		raster.SetMinSize(fyne.NewSize(width, height))
		raster.Resize(fyne.NewSize(width, height))
		raster.Move(fyne.NewPos(minX, minY))
		raster.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}