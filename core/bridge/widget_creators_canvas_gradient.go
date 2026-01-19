package main

import (
	"image/color"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
)

// ============================================================================
// Canvas Gradient Primitives: Linear Gradient, Radial Gradient
// ============================================================================

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
	if angle, ok := getFloat64(msg.Payload["angle"]); ok {
		gradient.Angle = angle
	}

	// Set minimum size if provided
	if width, ok := getFloat64(msg.Payload["width"]); ok {
		if height, ok := getFloat64(msg.Payload["height"]); ok {
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
		if angle, ok := getFloat64(msg.Payload["angle"]); ok {
			gradient.Angle = angle
		}

		gradient.Refresh()
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
	if offsetX, ok := getFloat64(msg.Payload["centerOffsetX"]); ok {
		gradient.CenterOffsetX = offsetX
	}
	if offsetY, ok := getFloat64(msg.Payload["centerOffsetY"]); ok {
		gradient.CenterOffsetY = offsetY
	}

	// Set minimum size if provided
	if width, ok := getFloat64(msg.Payload["width"]); ok {
		if height, ok := getFloat64(msg.Payload["height"]); ok {
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
		if offsetX, ok := getFloat64(msg.Payload["centerOffsetX"]); ok {
			gradient.CenterOffsetX = offsetX
		}
		if offsetY, ok := getFloat64(msg.Payload["centerOffsetY"]); ok {
			gradient.CenterOffsetY = offsetY
		}

		gradient.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}
