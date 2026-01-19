package main

import (
	"image/color"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
)

// ============================================================================
// Canvas Shape Primitives: Line, Circle, Rectangle, Arc, Ellipse
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
		if x1, ok := getFloat64(msg.Payload["x1"]); ok {
			if y1, ok := getFloat64(msg.Payload["y1"]); ok {
				line.Position1 = fyne.NewPos(float32(x1), float32(y1))
			}
		}
		if x2, ok := getFloat64(msg.Payload["x2"]); ok {
			if y2, ok := getFloat64(msg.Payload["y2"]); ok {
				line.Position2 = fyne.NewPos(float32(x2), float32(y2))
			}
		}

		// Update stroke color if provided
		if colorHex, ok := msg.Payload["strokeColor"].(string); ok {
			line.StrokeColor = parseHexColorSimple(colorHex)
		}

		// Update stroke width if provided
		if strokeWidth, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
			line.StrokeWidth = float32(strokeWidth)
		}

		line.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
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
		// Update position if provided
		if x, ok := getFloat64(msg.Payload["x"]); ok {
			if y, ok := getFloat64(msg.Payload["y"]); ok {
				circle.Position1 = fyne.NewPos(float32(x), float32(y))
			}
		}
		if x2, ok := getFloat64(msg.Payload["x2"]); ok {
			if y2, ok := getFloat64(msg.Payload["y2"]); ok {
				circle.Position2 = fyne.NewPos(float32(x2), float32(y2))
			}
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
		if strokeWidth, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
			circle.StrokeWidth = float32(strokeWidth)
		}

		circle.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
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
	if strokeWidth, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
		rect.StrokeWidth = float32(strokeWidth)
	}

	// Set corner radius if provided
	if radius, ok := getFloat64(msg.Payload["cornerRadius"]); ok {
		rect.CornerRadius = float32(radius)
	}

	// Set position and size from x, y, x2, y2 coordinates
	// Rectangle uses Move/Resize unlike Circle which has Position1/Position2
	var posX, posY, x2Val, y2Val float32
	hasPos := false
	hasSize := false
	if x, ok := msg.Payload["x"]; ok {
		posX = toFloat32(x)
		hasPos = true
	}
	if y, ok := msg.Payload["y"]; ok {
		posY = toFloat32(y)
	}
	if x2, ok := msg.Payload["x2"]; ok {
		x2Val = toFloat32(x2)
		hasSize = true
	}
	if y2, ok := msg.Payload["y2"]; ok {
		y2Val = toFloat32(y2)
	}
	if hasPos {
		rect.Move(fyne.NewPos(posX, posY))
	}
	if hasSize {
		rect.Resize(fyne.NewSize(x2Val-posX, y2Val-posY))
	}

	// Set minimum size if provided (alternative to x2, y2)
	if width, ok := getFloat64(msg.Payload["width"]); ok {
		if height, ok := getFloat64(msg.Payload["height"]); ok {
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
		// Update position if provided
		needsResize := false
		var newPos fyne.Position
		var newSize fyne.Size

		if x, ok := getFloat64(msg.Payload["x"]); ok {
			if y, ok := getFloat64(msg.Payload["y"]); ok {
				newPos = fyne.NewPos(float32(x), float32(y))
				rect.Move(newPos)
			}
		}

		// Update size via x2, y2
		if x2, ok := getFloat64(msg.Payload["x2"]); ok {
			if y2, ok := getFloat64(msg.Payload["y2"]); ok {
				// Calculate size from current position and x2, y2
				currentPos := rect.Position()
				newSize = fyne.NewSize(float32(x2)-currentPos.X, float32(y2)-currentPos.Y)
				needsResize = true
			}
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
		if strokeWidth, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
			rect.StrokeWidth = float32(strokeWidth)
		}

		// Update corner radius if provided
		if radius, ok := getFloat64(msg.Payload["cornerRadius"]); ok {
			rect.CornerRadius = float32(radius)
		}

		if needsResize {
			rect.Resize(newSize)
		}

		rect.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleCreateTappableCanvasRectangle creates a tappable canvas rectangle widget
func (b *Bridge) handleCreateTappableCanvasRectangle(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	// Get dimensions
	width := toFloat32(msg.Payload["width"])
	height := toFloat32(msg.Payload["height"])

	// Get fill color
	var fillColor color.Color = color.Transparent
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		fillColor = parseHexColorSimple(fillHex)
	}

	// Get stroke color
	var strokeColor color.Color = nil
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		strokeColor = parseHexColorSimple(strokeHex)
	}

	// Get stroke width
	var strokeWidth float32 = 0
	if sw, ok := msg.Payload["strokeWidth"]; ok {
		strokeWidth = toFloat32(sw)
	}

	// Get corner radius
	var cornerRadius float32 = 0
	if radius, ok := msg.Payload["cornerRadius"]; ok {
		cornerRadius = toFloat32(radius)
	}

	// Create the tappable rectangle with callback
	tappable := NewTappableCanvasRectangle(width, height, fillColor, strokeColor, strokeWidth, cornerRadius, func(x, y int) {
		b.sendEvent(Event{
			Type:     "canvasRectangleTapped",
			WidgetID: widgetID,
			Data: map[string]interface{}{
				"x": x,
				"y": y,
			},
		})
	})

	b.mu.Lock()
	b.widgets[widgetID] = tappable
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "tappablecanvasrectangle", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

// handleCreateCanvasEllipse creates an ellipse using a raster
func (b *Bridge) handleCreateCanvasEllipse(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	x := toFloat32(msg.Payload["x"])
	y := toFloat32(msg.Payload["y"])
	width := toFloat32(msg.Payload["width"])
	height := toFloat32(msg.Payload["height"])

	var fillColor color.RGBA = color.RGBA{R: 128, G: 128, B: 128, A: 255}
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		if parsed, ok := parseHexColorSimple(fillHex).(color.RGBA); ok {
			fillColor = parsed
		}
	}

	// Store ellipse data for updates
	b.mu.Lock()
	if b.ellipseData == nil {
		b.ellipseData = make(map[string]*EllipseData)
	}
	b.ellipseData[widgetID] = &EllipseData{x, y, width, height, fillColor}
	b.mu.Unlock()

	ellipseID := widgetID

	raster := canvas.NewRasterWithPixels(func(px, py, w, h int) color.Color {
		b.mu.RLock()
		data := b.ellipseData[ellipseID]
		if data == nil {
			b.mu.RUnlock()
			return color.RGBA{A: 0}
		}
		fill := data.FillColor
		b.mu.RUnlock()

		// Ellipse equation: (x/a)^2 + (y/b)^2 <= 1
		cx := float64(w) / 2
		cy := float64(h) / 2
		a := float64(w) / 2
		bVal := float64(h) / 2

		dx := float64(px) - cx
		dy := float64(py) - cy

		if (dx*dx)/(a*a)+(dy*dy)/(bVal*bVal) <= 1.0 {
			return fill
		}
		return color.RGBA{A: 0}
	})

	raster.Move(fyne.NewPos(x, y))
	raster.Resize(fyne.NewSize(width, height))
	raster.SetMinSize(fyne.NewSize(width, height))

	b.mu.Lock()
	b.widgets[widgetID] = raster
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasellipse", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateCanvasEllipse(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	data, dataExists := b.ellipseData[widgetID]
	b.mu.RUnlock()

	if !exists || !dataExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Ellipse widget not found",
		}
	}

	raster, ok := w.(*canvas.Raster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an ellipse raster",
		}
	}

	b.mu.Lock()
	if x, ok := getFloat64(msg.Payload["x"]); ok {
		data.X = float32(x)
	}
	if y, ok := getFloat64(msg.Payload["y"]); ok {
		data.Y = float32(y)
	}
	newX := data.X
	newY := data.Y
	b.mu.Unlock()

	fyne.DoAndWait(func() {
		raster.Move(fyne.NewPos(newX, newY))
		raster.Refresh()
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
	if sa, ok := getFloat64(msg.Payload["startAngle"]); ok {
		startAngle = sa
	}
	if ea, ok := getFloat64(msg.Payload["endAngle"]); ok {
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
	if sw, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
		strokeWidth = float32(sw)
	}

	// Set position and size
	var x1, y1, x2, y2 float32 = 0, 0, 100, 100
	if x, ok := getFloat64(msg.Payload["x"]); ok {
		x1 = float32(x)
	}
	if y, ok := getFloat64(msg.Payload["y"]); ok {
		y1 = float32(y)
	}
	if x, ok := getFloat64(msg.Payload["x2"]); ok {
		x2 = float32(x)
	}
	if y, ok := getFloat64(msg.Payload["y2"]); ok {
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

	// Capture widgetID for closure to read dynamic arc data
	arcWidgetID := widgetID

	raster := canvas.NewRasterWithPixels(func(px, py, w, h int) color.Color {
		// Read current arc data (allows dynamic updates)
		b.mu.RLock()
		arcInfo := b.arcData[arcWidgetID]
		if arcInfo == nil {
			b.mu.RUnlock()
			return color.RGBA{A: 1}
		}
		arcStart := arcInfo.StartAngle
		arcEnd := arcInfo.EndAngle
		cR := int(arcInfo.FillColor.R)
		cG := int(arcInfo.FillColor.G)
		cB := int(arcInfo.FillColor.B)
		b.mu.RUnlock()

		// Calculate center and radius
		cx := float64(w) / 2
		cy := float64(h) / 2
		rx := float64(w) / 2
		ry := float64(h) / 2

		if rx < 1 || ry < 1 {
			return color.RGBA{A: 1} // Nearly transparent (A=0 causes render skip)
		}

		// Normalized distance from center
		dx := (float64(px) - cx) / rx
		dy := (float64(py) - cy) / ry
		dist := dx*dx + dy*dy

		// Outside ellipse
		if dist > 1.0 {
			return color.RGBA{R: 255, G: 255, B: 255, A: 1} // Nearly transparent white
		}

		// Calculate angle (flip Y for math coords)
		angle := atan2(-dy, dx)
		if angle < 0 {
			angle += 2 * 3.14159265358979
		}

		// Normalize arc angles to 0-2pi
		start := arcStart
		end := arcEnd
		for start < 0 {
			start += 2 * 3.14159265358979
		}
		for end < 0 {
			end += 2 * 3.14159265358979
		}
		start = float64Mod(start, 2*3.14159265358979)
		end = float64Mod(end, 2*3.14159265358979)

		// Check if angle is within arc range
		inArc := false
		if start <= end {
			inArc = angle >= start && angle <= end
		} else {
			inArc = angle >= start || angle <= end
		}

		if inArc {
			return color.RGBA{R: uint8(cR), G: uint8(cG), B: uint8(cB), A: 255}
		}
		return color.RGBA{A: 1} // Nearly transparent (A=0 causes render skip)
	})

	width := x2 - x1
	height := y2 - y1
	if width < 10 {
		width = 100
	}
	if height < 10 {
		height = 100
	}

	// For NewWithoutLayout containers, we need explicit position and size
	raster.Move(fyne.NewPos(x1, y1))
	raster.Resize(fyne.NewSize(width, height))
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
	if sa, ok := getFloat64(msg.Payload["startAngle"]); ok {
		arcInfo.StartAngle = sa
	}
	if ea, ok := getFloat64(msg.Payload["endAngle"]); ok {
		arcInfo.EndAngle = ea
	}
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		arcInfo.FillColor = parseHexColorSimple(fillHex).(color.RGBA)
	}
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		arcInfo.StrokeColor = parseHexColorSimple(strokeHex)
	}
	if sw, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
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
