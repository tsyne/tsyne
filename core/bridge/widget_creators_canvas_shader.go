package main

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
)

// ============================================================================
// Canvas Shader - GPU-accelerated fragment shader rendering
// ============================================================================

func (b *Bridge) handleCreateCanvasShader(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	width := float32(toFloat64(msg.Payload["width"]))
	height := float32(toFloat64(msg.Payload["height"]))
	fragmentSource := ""
	if src, ok := msg.Payload["fragmentSource"].(string); ok {
		fragmentSource = src
	}

	// Create the shader
	shader := canvas.NewShader(width, height, fragmentSource)

	// Set initial uniforms if provided
	if uniforms, ok := msg.Payload["uniforms"].(map[string]interface{}); ok {
		for name, val := range uniforms {
			shader.SetUniform(name, val)
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = shader
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasshader", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateCanvasShader(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Shader widget not found",
		}
	}

	shader, ok := w.(*canvas.Shader)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a shader",
		}
	}

	// Update shader source if provided
	if src, ok := msg.Payload["fragmentSource"].(string); ok && src != "" {
		shader.SetSource(src)
	}

	// Update uniforms if provided
	if uniforms, ok := msg.Payload["uniforms"].(map[string]interface{}); ok {
		for name, val := range uniforms {
			shader.SetUniform(name, val)
		}
	}

	// Refresh the shader
	fyne.Do(func() {
		shader.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}
