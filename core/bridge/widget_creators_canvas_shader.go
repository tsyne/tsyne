package main

import (
	"encoding/base64"
	"image"
	"image/color"
	"log"

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

	// Update texture uniforms if provided
	if textures, ok := msg.Payload["textures"].(map[string]interface{}); ok {
		for name, val := range textures {
			shader.SetTextureUniform(name, val)
		}
	}

	// Update cubemap uniforms if provided
	if cubemaps, ok := msg.Payload["cubemaps"].(map[string]interface{}); ok {
		for name, faceVal := range cubemaps {
			if faces, ok := faceVal.([]interface{}); ok && len(faces) == 6 {
				var faceArray [6]interface{}
				copy(faceArray[:], faces)
				shader.SetCubemapUniform(name, faceArray)
			} else {
				// Try as map with face names
				log.Printf("[createCanvasShader] WARNING: Invalid cubemap format for %s", name)
			}
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

// handleSetShaderTextureUniform sets a texture uniform from base64-encoded RGBA data
func (b *Bridge) handleSetShaderTextureUniform(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	uniformName := msg.Payload["uniformName"].(string)
	imageDataB64 := msg.Payload["imageData"].(string)
	width := int(toFloat64(msg.Payload["width"]))
	height := int(toFloat64(msg.Payload["height"]))

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

	// Decode base64 image data
	imageData, err := base64.StdEncoding.DecodeString(imageDataB64)
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Failed to decode base64 image data: " + err.Error(),
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
