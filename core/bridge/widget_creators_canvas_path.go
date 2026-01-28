package main

import (
	"fyne.io/fyne/v2"
	"github.com/fogleman/gg"
)

// ============================================================================
// Canvas Path Primitives - SVG-style paths with Bezier curve support
// Uses the gg library for antialiased rendering via canvas.Raster
// ============================================================================

// handleCreateCanvasPath creates a new path raster widget
func (b *Bridge) handleCreateCanvasPath(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	width := toInt(msg.Payload["width"])
	height := toInt(msg.Payload["height"])

	var pr *PathRaster

	// Create the path raster on Fyne thread
	fyne.DoAndWait(func() {
		pr = NewPathRaster(width, height)
	})

	// Set initial path if provided
	if pathStr, ok := msg.Payload["path"].(string); ok {
		pr.SetPath(pathStr)
	}

	// Set stroke color if provided
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		pr.SetStrokeColor(parseHexColorSimple(strokeHex))
	}

	// Set stroke width if provided
	if sw, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
		pr.SetStrokeWidth(sw)
	}

	// Set fill color if provided
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		pr.SetFillColor(parseHexColorSimple(fillHex))
	}

	// Set line cap if provided
	if capStr, ok := msg.Payload["lineCap"].(string); ok {
		pr.SetLineCap(stringToLineCap(capStr))
	}

	// Set line join if provided
	if joinStr, ok := msg.Payload["lineJoin"].(string); ok {
		pr.SetLineJoin(stringToLineJoin(joinStr))
	}

	// Store the path raster for updates
	b.mu.Lock()
	if b.pathData == nil {
		b.pathData = make(map[string]*PathRaster)
	}
	b.pathData[widgetID] = pr
	b.widgets[widgetID] = pr.Raster()
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvaspath", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

// handleUpdateCanvasPath updates an existing path raster
func (b *Bridge) handleUpdateCanvasPath(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	pr, exists := b.pathData[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Path widget not found",
		}
	}

	// Update path string if provided
	if pathStr, ok := msg.Payload["path"].(string); ok {
		pr.SetPath(pathStr)
	}

	// Update stroke color if provided
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		pr.SetStrokeColor(parseHexColorSimple(strokeHex))
	}

	// Update stroke width if provided
	if sw, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
		pr.SetStrokeWidth(sw)
	}

	// Update fill color if provided
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		pr.SetFillColor(parseHexColorSimple(fillHex))
	}

	// Update line cap if provided
	if capStr, ok := msg.Payload["lineCap"].(string); ok {
		pr.SetLineCap(stringToLineCap(capStr))
	}

	// Update line join if provided
	if joinStr, ok := msg.Payload["lineJoin"].(string); ok {
		pr.SetLineJoin(stringToLineJoin(joinStr))
	}

	// Refresh the raster to show updates (Refresh handles fyne.Do internally)
	pr.Refresh()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// stringToLineCap converts a string to gg.LineCap
func stringToLineCap(s string) gg.LineCap {
	switch s {
	case "butt":
		return gg.LineCapButt
	case "square":
		return gg.LineCapSquare
	case "round":
		return gg.LineCapRound
	default:
		return gg.LineCapRound
	}
}

// stringToLineJoin converts a string to gg.LineJoin
// Note: gg library only supports Round and Bevel (no Miter)
func stringToLineJoin(s string) gg.LineJoin {
	switch s {
	case "bevel":
		return gg.LineJoinBevel
	case "round":
		return gg.LineJoinRound
	default:
		return gg.LineJoinRound
	}
}
