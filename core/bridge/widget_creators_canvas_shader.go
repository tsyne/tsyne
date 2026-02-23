package main

import (
	"image"
	"image/color"
	"log"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
)

// ============================================================================
// Canvas Shader - GPU-accelerated fragment shader rendering
// ============================================================================

// extractShader unwraps a canvas.Shader from either a plain *canvas.Shader
// or an *InteractiveShader wrapper.
func extractShader(obj fyne.CanvasObject) (*canvas.Shader, bool) {
	if s, ok := obj.(*canvas.Shader); ok {
		return s, true
	}
	if i, ok := obj.(*InteractiveShader); ok {
		return i.shader, true
	}
	return nil, false
}

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

	// If events bitmask is present, wrap in InteractiveShader
	var widgetObj fyne.CanvasObject = shader
	if _, hasEvents := msg.Payload["events"]; hasEvents {
		cbs, _ := msg.Payload["cbs"].(map[string]interface{})
		disp := b.getOrCreateDispatcher(widgetID)
		for key, val := range cbs {
			if id, ok := val.(string); ok {
				disp.setCallback(cbKeyToEventKind(key), id)
			}
		}
		widgetObj = NewInteractiveShader(shader, disp)
	}

	b.mu.Lock()
	b.widgets[widgetID] = widgetObj
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

	shader, ok := extractShader(w)
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

	// Set uniforms/textures/cubemaps directly (no per-value Refresh),
	// then call Refresh once at the end on the main thread.
	if uniforms, ok := msg.Payload["uniforms"].(map[string]interface{}); ok {
		shader.SetUniformsBatch(uniforms)
	}

	if textures, ok := msg.Payload["textures"].(map[string]interface{}); ok {
		for name, val := range textures {
			shader.SetTextureUniform(name, val)
		}
	}

	if cubemaps, ok := msg.Payload["cubemaps"].(map[string]interface{}); ok {
		for name, faceVal := range cubemaps {
			if faces, ok := faceVal.([]interface{}); ok && len(faces) == 6 {
				var faceArray [6]interface{}
				copy(faceArray[:], faces)
				shader.SetCubemapUniformSilent(name, faceArray)
			} else {
				log.Printf("[createCanvasShader] WARNING: Invalid cubemap format for %s", name)
			}
		}
	}

	// Single refresh on the main thread
	fyne.Do(func() {
		shader.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleSetShaderTextureUniform sets a texture uniform from base64-encoded RGBA data
func (b *Bridge) handleSetShaderTextureUniform(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	uniformName := msg.Payload["uniformName"].(string)
	width := int(toFloat64(msg.Payload["width"]))
	height := int(toFloat64(msg.Payload["height"]))

	imageData, err := extractBinary(msg.Payload["imageData"])
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Failed to decode image data: " + err.Error(),
		}
	}

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

	shader, ok := extractShader(w)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a shader",
		}
	}

	// Create RGBA image from raw data
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			i := (y*width + x) * 4
			if i+3 < len(imageData) {
				img.SetRGBA(x, y, color.RGBA{
					R: imageData[i],
					G: imageData[i+1],
					B: imageData[i+2],
					A: imageData[i+3],
				})
			}
		}
	}

	// Set texture uniform
	shader.SetTextureUniform(uniformName, img)

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleSetShaderCubemapUniform sets a cubemap uniform from 6 base64-encoded RGBA faces
// Payload: { widgetId, uniformName, faces: [{ imageData, width, height }, ...] (6 faces) }
// Face order: +X, -X, +Y, -Y, +Z, -Z
func (b *Bridge) handleSetShaderCubemapUniform(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	uniformName := msg.Payload["uniformName"].(string)
	facesData, ok := msg.Payload["faces"].([]interface{})
	if !ok || len(facesData) != 6 {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Cubemap requires exactly 6 faces",
		}
	}

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

	shader, ok := extractShader(w)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a shader",
		}
	}

	// Parse and decode each face
	var faceImages [6]interface{}
	for i, faceData := range facesData {
		face, ok := faceData.(map[string]interface{})
		if !ok {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   "Invalid face data format",
			}
		}

		width := int(toFloat64(face["width"]))
		height := int(toFloat64(face["height"]))

		imageData, err := extractBinary(face["imageData"])
		if err != nil {
			return Response{
				ID:      msg.ID,
				Success: false,
				Error:   "Failed to decode image data for face " + string(rune('0'+i)) + ": " + err.Error(),
			}
		}

		// Create RGBA image from raw data
		img := image.NewRGBA(image.Rect(0, 0, width, height))
		for y := 0; y < height; y++ {
			for x := 0; x < width; x++ {
				idx := (y*width + x) * 4
				if idx+3 < len(imageData) {
					img.SetRGBA(x, y, color.RGBA{
						R: imageData[idx],
						G: imageData[idx+1],
						B: imageData[idx+2],
						A: imageData[idx+3],
					})
				}
			}
		}

		faceImages[i] = img
	}

	// Set cubemap uniform with all 6 faces
	shader.SetCubemapUniform(uniformName, faceImages)

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleSetShaderAutoAnimate enables or disables Go-side 60fps auto-animation
func (b *Bridge) handleSetShaderAutoAnimate(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	enabled, _ := msg.Payload["enabled"].(bool)

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

	shader, ok := extractShader(w)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a shader",
		}
	}

	shader.SetAutoAnimate(enabled)

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleResizeCanvasShader resizes a canvas shader (plain or interactive)
func (b *Bridge) handleResizeCanvasShader(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	width := float32(toFloat64(msg.Payload["width"]))
	height := float32(toFloat64(msg.Payload["height"]))

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

	shader, ok := extractShader(w)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a shader",
		}
	}

	fyne.DoAndWait(func() {
		newSize := fyne.NewSize(width, height)
		shader.Resize(newSize)
		// If wrapped in InteractiveShader, resize that too
		if interactive, ok := w.(*InteractiveShader); ok {
			interactive.Resize(newSize)
		}
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}
