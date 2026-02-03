package main

import (
	"encoding/base64"
	"fmt"
	"log"
)

// GLCanvas represents a WebGL rendering context mapped to native OpenGL
type GLCanvas struct {
	ID           string
	Width        int
	Height       int
	// On desktop: OpenGL context (via go-gl)
	// On mobile: OpenGL ES 3.0 context (via gomobile)
	// For now, we'll placeholder the actual GL implementation
}

// GLCommandBatch represents a batch of GL commands to execute
type GLCommandBatch struct {
	CanvasID string
	Commands []GLCommand
}

// GLCommand represents a single GL operation
type GLCommand struct {
	Cmd  string                 `mapstructure:"cmd"`
	Args map[string]interface{} `mapstructure:"args"`
}

// Store active GL canvases (maps canvasId -> GLCanvas)
var glCanvases = make(map[string]*GLCanvas)
var glCanvasCounter = 0

// ═══════════════════════════════════════════════════════════════
// Handler for creating a GL canvas
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) handleCreateGLCanvas(msg Message) Response {
	payload := msg.Payload

	width, ok := payload["width"].(float64)
	if !ok {
		return Response{Error: "missing or invalid width"}
	}

	height, ok := payload["height"].(float64)
	if !ok {
		return Response{Error: "missing or invalid height"}
	}

	glCanvasCounter++
	canvasID := fmt.Sprintf("gl_canvas_%d", glCanvasCounter)

	canvas := &GLCanvas{
		ID:     canvasID,
		Width:  int(width),
		Height: int(height),
	}

	glCanvases[canvasID] = canvas

	return Response{
		Success: true,
		Result: map[string]interface{}{
			"canvasId": canvasID,
		},
	}
}

// ═══════════════════════════════════════════════════════════════
// Handler for executing a batch of GL commands
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) handleExecuteBatch(msg Message) Response {
	payload := msg.Payload

	canvasID, ok := payload["canvasId"].(string)
	if !ok {
		return Response{Error: "missing or invalid canvasId"}
	}

	canvas, exists := glCanvases[canvasID]
	if !exists {
		return Response{Error: fmt.Sprintf("canvas not found: %s", canvasID)}
	}

	// Get the commands array
	commandsRaw, ok := payload["commands"].([]interface{})
	if !ok {
		return Response{Error: "missing or invalid commands"}
	}

	// Parse and execute each command
	for _, cmdRaw := range commandsRaw {
		cmdMap, ok := cmdRaw.(map[string]interface{})
		if !ok {
			continue
		}

		cmd, ok := cmdMap["cmd"].(string)
		if !ok {
			continue
		}

		args, ok := cmdMap["args"].(map[string]interface{})
		if !ok {
			args = make(map[string]interface{})
		}

		// Execute the GL command
		if err := b.executeGLCommand(canvas, cmd, args); err != nil {
			log.Printf("GL command error: %v", err)
			// Continue with next command instead of failing the batch
		}
	}

	return Response{Success: true}
}

// ═══════════════════════════════════════════════════════════════
// Handler for GL parameter queries
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) handleGetParameter(msg Message) Response {
	payload := msg.Payload

	canvasID, ok := payload["canvasId"].(string)
	if !ok {
		return Response{Error: "missing or invalid canvasId"}
	}

	_, exists := glCanvases[canvasID]
	if !exists {
		return Response{Error: fmt.Sprintf("canvas not found: %s", canvasID)}
	}

	pname, ok := payload["pname"].(float64)
	if !ok {
		return Response{Error: "missing or invalid pname"}
	}

	// Query the GL parameter - for now return defaults
	// Real implementation would query the actual GL context
	value := getGLParameterValue(int(pname))

	return Response{
		Success: true,
		Result: map[string]interface{}{
			"value": value,
		},
	}
}

// ═══════════════════════════════════════════════════════════════
// Handler for GL error queries
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) handleGetError(msg Message) Response {
	payload := msg.Payload

	canvasID, ok := payload["canvasId"].(string)
	if !ok {
		return Response{Error: "missing or invalid canvasId"}
	}

	_, exists := glCanvases[canvasID]
	if !exists {
		return Response{Error: fmt.Sprintf("canvas not found: %s", canvasID)}
	}

	// For now, always return NO_ERROR (0)
	// Real implementation would check the GL error state
	return Response{
		Success: true,
		Result: map[string]interface{}{
			"error": 0,
		},
	}
}

// ═══════════════════════════════════════════════════════════════
// GL Command Execution
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) executeGLCommand(canvas *GLCanvas, cmd string, args map[string]interface{}) error {
	switch cmd {
	// Buffer operations
	case "createBuffer":
		return b.glCreateBuffer(canvas, args)
	case "deleteBuffer":
		return b.glDeleteBuffer(canvas, args)
	case "bindBuffer":
		return b.glBindBuffer(canvas, args)
	case "bufferData":
		return b.glBufferData(canvas, args)
	case "bufferSubData":
		return b.glBufferSubData(canvas, args)

	// Shader operations
	case "createShader":
		return b.glCreateShader(canvas, args)
	case "deleteShader":
		return b.glDeleteShader(canvas, args)
	case "shaderSource":
		return b.glShaderSource(canvas, args)
	case "compileShader":
		return b.glCompileShader(canvas, args)

	// Program operations
	case "createProgram":
		return b.glCreateProgram(canvas, args)
	case "deleteProgram":
		return b.glDeleteProgram(canvas, args)
	case "attachShader":
		return b.glAttachShader(canvas, args)
	case "detachShader":
		return b.glDetachShader(canvas, args)
	case "linkProgram":
		return b.glLinkProgram(canvas, args)
	case "useProgram":
		return b.glUseProgram(canvas, args)

	// Uniform operations
	case "uniform1f", "uniform2f", "uniform3f", "uniform4f":
		return b.glUniformFloat(canvas, cmd, args)
	case "uniform1i", "uniform2i", "uniform3i", "uniform4i":
		return b.glUniformInt(canvas, cmd, args)
	case "uniform1fv", "uniform2fv", "uniform3fv", "uniform4fv":
		return b.glUniformFloatv(canvas, cmd, args)
	case "uniform1iv", "uniform2iv", "uniform3iv", "uniform4iv":
		return b.glUniformIntv(canvas, cmd, args)
	case "uniformMatrix2fv", "uniformMatrix3fv", "uniformMatrix4fv":
		return b.glUniformMatrix(canvas, cmd, args)

	// Texture operations
	case "createTexture":
		return b.glCreateTexture(canvas, args)
	case "deleteTexture":
		return b.glDeleteTexture(canvas, args)
	case "bindTexture":
		return b.glBindTexture(canvas, args)
	case "activeTexture":
		return b.glActiveTexture(canvas, args)
	case "texImage2D":
		return b.glTexImage2D(canvas, args)
	case "texSubImage2D":
		return b.glTexSubImage2D(canvas, args)
	case "texParameteri":
		return b.glTexParameteri(canvas, args)
	case "texParameterf":
		return b.glTexParameterf(canvas, args)
	case "generateMipmap":
		return b.glGenerateMipmap(canvas, args)

	// Framebuffer operations
	case "createFramebuffer":
		return b.glCreateFramebuffer(canvas, args)
	case "deleteFramebuffer":
		return b.glDeleteFramebuffer(canvas, args)
	case "bindFramebuffer":
		return b.glBindFramebuffer(canvas, args)
	case "framebufferTexture2D":
		return b.glFramebufferTexture2D(canvas, args)

	// Renderbuffer operations
	case "createRenderbuffer":
		return b.glCreateRenderbuffer(canvas, args)
	case "deleteRenderbuffer":
		return b.glDeleteRenderbuffer(canvas, args)
	case "bindRenderbuffer":
		return b.glBindRenderbuffer(canvas, args)
	case "renderbufferStorage":
		return b.glRenderbufferStorage(canvas, args)
	case "framebufferRenderbuffer":
		return b.glFramebufferRenderbuffer(canvas, args)

	// Vertex array operations
	case "createVertexArray":
		return b.glCreateVertexArray(canvas, args)
	case "deleteVertexArray":
		return b.glDeleteVertexArray(canvas, args)
	case "bindVertexArray":
		return b.glBindVertexArray(canvas, args)
	case "enableVertexAttribArray":
		return b.glEnableVertexAttribArray(canvas, args)
	case "disableVertexAttribArray":
		return b.glDisableVertexAttribArray(canvas, args)
	case "vertexAttribPointer":
		return b.glVertexAttribPointer(canvas, args)
	case "vertexAttribDivisor":
		return b.glVertexAttribDivisor(canvas, args)

	// Drawing operations
	case "drawArrays":
		return b.glDrawArrays(canvas, args)
	case "drawElements":
		return b.glDrawElements(canvas, args)
	case "drawArraysInstanced":
		return b.glDrawArraysInstanced(canvas, args)
	case "drawElementsInstanced":
		return b.glDrawElementsInstanced(canvas, args)

	// State operations
	case "clear":
		return b.glClear(canvas, args)
	case "clearColor":
		return b.glClearColor(canvas, args)
	case "clearDepth":
		return b.glClearDepth(canvas, args)
	case "clearStencil":
		return b.glClearStencil(canvas, args)
	case "viewport":
		return b.glViewport(canvas, args)
	case "scissor":
		return b.glScissor(canvas, args)
	case "enable":
		return b.glEnable(canvas, args)
	case "disable":
		return b.glDisable(canvas, args)

	// Depth/Stencil operations
	case "depthFunc":
		return b.glDepthFunc(canvas, args)
	case "depthMask":
		return b.glDepthMask(canvas, args)
	case "depthRange":
		return b.glDepthRange(canvas, args)
	case "stencilFunc":
		return b.glStencilFunc(canvas, args)
	case "stencilOp":
		return b.glStencilOp(canvas, args)
	case "stencilMask":
		return b.glStencilMask(canvas, args)

	// Blending operations
	case "blendColor":
		return b.glBlendColor(canvas, args)
	case "blendEquation":
		return b.glBlendEquation(canvas, args)
	case "blendEquationSeparate":
		return b.glBlendEquationSeparate(canvas, args)
	case "blendFunc":
		return b.glBlendFunc(canvas, args)
	case "blendFuncSeparate":
		return b.glBlendFuncSeparate(canvas, args)

	// Face/Polygon operations
	case "cullFace":
		return b.glCullFace(canvas, args)
	case "frontFace":
		return b.glFrontFace(canvas, args)
	case "polygonOffset":
		return b.glPolygonOffset(canvas, args)
	case "lineWidth":
		return b.glLineWidth(canvas, args)

	// Pixel operations
	case "pixelStorei":
		return b.glPixelStorei(canvas, args)
	case "readPixels":
		return b.glReadPixels(canvas, args)

	// Misc
	case "hint":
		return b.glHint(canvas, args)

	default:
		return fmt.Errorf("unknown GL command: %s", cmd)
	}
}

// ═══════════════════════════════════════════════════════════════
// Buffer Operation Implementations (stubs for now)
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glCreateBuffer(canvas *GLCanvas, args map[string]interface{}) error {
	// Implementation would create an actual OpenGL buffer object
	return nil
}

func (b *Bridge) glDeleteBuffer(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glBindBuffer(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glBufferData(canvas *GLCanvas, args map[string]interface{}) error {
	// Decode pixel data if present
	if pixelsRaw, ok := args["pixels"]; ok {
		if pixelsStr, ok := pixelsRaw.(string); ok {
			// Decode base64-encoded buffer data
			_, err := base64.StdEncoding.DecodeString(pixelsStr)
			if err != nil {
				return fmt.Errorf("failed to decode buffer data: %v", err)
			}
			// Would use decoded data to populate OpenGL buffer
		}
	}
	return nil
}

func (b *Bridge) glBufferSubData(canvas *GLCanvas, args map[string]interface{}) error {
	if pixelsRaw, ok := args["pixels"]; ok {
		if pixelsStr, ok := pixelsRaw.(string); ok {
			_, err := base64.StdEncoding.DecodeString(pixelsStr)
			if err != nil {
				return fmt.Errorf("failed to decode buffer data: %v", err)
			}
		}
	}
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Shader/Program Operation Implementations (stubs for now)
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glCreateShader(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glDeleteShader(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glShaderSource(canvas *GLCanvas, args map[string]interface{}) error {
	// Get shader source and potentially convert GLSL 300 ES to GLSL 110
	if source, ok := args["source"].(string); ok {
		// Phase 5 of the plan: Implement GLSL conversion
		_ = source
	}
	return nil
}

func (b *Bridge) glCompileShader(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glCreateProgram(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glDeleteProgram(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glAttachShader(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glDetachShader(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glLinkProgram(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glUseProgram(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Uniform Operation Implementations (stubs for now)
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glUniformFloat(canvas *GLCanvas, cmd string, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glUniformInt(canvas *GLCanvas, cmd string, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glUniformFloatv(canvas *GLCanvas, cmd string, args map[string]interface{}) error {
	if dataRaw, ok := args["data"]; ok {
		if dataStr, ok := dataRaw.(string); ok {
			_, err := base64.StdEncoding.DecodeString(dataStr)
			if err != nil {
				return fmt.Errorf("failed to decode uniform data: %v", err)
			}
		}
	}
	return nil
}

func (b *Bridge) glUniformIntv(canvas *GLCanvas, cmd string, args map[string]interface{}) error {
	if dataRaw, ok := args["data"]; ok {
		if dataStr, ok := dataRaw.(string); ok {
			_, err := base64.StdEncoding.DecodeString(dataStr)
			if err != nil {
				return fmt.Errorf("failed to decode uniform data: %v", err)
			}
		}
	}
	return nil
}

func (b *Bridge) glUniformMatrix(canvas *GLCanvas, cmd string, args map[string]interface{}) error {
	if dataRaw, ok := args["data"]; ok {
		if dataStr, ok := dataRaw.(string); ok {
			_, err := base64.StdEncoding.DecodeString(dataStr)
			if err != nil {
				return fmt.Errorf("failed to decode matrix data: %v", err)
			}
		}
	}
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Texture Operation Implementations (stubs for now)
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glCreateTexture(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glDeleteTexture(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glBindTexture(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glActiveTexture(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glTexImage2D(canvas *GLCanvas, args map[string]interface{}) error {
	if pixelsRaw, ok := args["pixels"]; ok {
		if pixelsStr, ok := pixelsRaw.(string); ok {
			_, err := base64.StdEncoding.DecodeString(pixelsStr)
			if err != nil {
				return fmt.Errorf("failed to decode texture data: %v", err)
			}
		}
	}
	return nil
}

func (b *Bridge) glTexSubImage2D(canvas *GLCanvas, args map[string]interface{}) error {
	if pixelsRaw, ok := args["pixels"]; ok {
		if pixelsStr, ok := pixelsRaw.(string); ok {
			_, err := base64.StdEncoding.DecodeString(pixelsStr)
			if err != nil {
				return fmt.Errorf("failed to decode texture data: %v", err)
			}
		}
	}
	return nil
}

func (b *Bridge) glTexParameteri(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glTexParameterf(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glGenerateMipmap(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Framebuffer Operation Implementations (stubs for now)
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glCreateFramebuffer(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glDeleteFramebuffer(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glBindFramebuffer(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glFramebufferTexture2D(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Renderbuffer Operation Implementations (stubs for now)
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glCreateRenderbuffer(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glDeleteRenderbuffer(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glBindRenderbuffer(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glRenderbufferStorage(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glFramebufferRenderbuffer(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Vertex Array Operation Implementations (stubs for now)
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glCreateVertexArray(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glDeleteVertexArray(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glBindVertexArray(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glEnableVertexAttribArray(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glDisableVertexAttribArray(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glVertexAttribPointer(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glVertexAttribDivisor(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Drawing Operation Implementations (stubs for now)
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glDrawArrays(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glDrawElements(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glDrawArraysInstanced(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glDrawElementsInstanced(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

// ═══════════════════════════════════════════════════════════════
// State Operation Implementations (stubs for now)
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glClear(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glClearColor(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glClearDepth(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glClearStencil(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glViewport(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glScissor(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glEnable(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glDisable(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Depth/Stencil Operation Implementations (stubs for now)
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glDepthFunc(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glDepthMask(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glDepthRange(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glStencilFunc(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glStencilOp(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glStencilMask(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Blending Operation Implementations (stubs for now)
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glBlendColor(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glBlendEquation(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glBlendEquationSeparate(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glBlendFunc(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glBlendFuncSeparate(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Face/Polygon Operation Implementations (stubs for now)
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glCullFace(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glFrontFace(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glPolygonOffset(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glLineWidth(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Pixel Operation Implementations (stubs for now)
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glPixelStorei(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

func (b *Bridge) glReadPixels(canvas *GLCanvas, args map[string]interface{}) error {
	if pixelsRaw, ok := args["pixels"]; ok {
		if pixelsStr, ok := pixelsRaw.(string); ok {
			_, err := base64.StdEncoding.DecodeString(pixelsStr)
			if err != nil {
				return fmt.Errorf("failed to decode pixels: %v", err)
			}
		}
	}
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Misc Implementation
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glHint(canvas *GLCanvas, args map[string]interface{}) error {
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

// getGLParameterValue returns reasonable defaults for common GL parameter queries
func getGLParameterValue(pname int) interface{} {
	switch pname {
	case 0x0ba2: // VIEWPORT
		return []int{0, 0, 800, 600}
	case 0x0c44: // SCISSOR_BOX
		return []int{0, 0, 800, 600}
	case 0x0d33: // MAX_TEXTURE_SIZE
		return 2048
	case 0x851c: // MAX_CUBE_MAP_TEXTURE_SIZE
		return 2048
	case 0x84e8: // MAX_RENDERBUFFER_SIZE
		return 2048
	case 0x8869: // MAX_VERTEX_ATTRIBS
		return 16
	case 0x8dfb: // MAX_VERTEX_UNIFORM_VECTORS
		return 128
	case 0x8dfd: // MAX_FRAGMENT_UNIFORM_VECTORS
		return 64
	case 0x8dfc: // MAX_VARYING_VECTORS
		return 8
	case 0x86a3: // COMPRESSED_TEXTURE_FORMATS
		return []int{}
	default:
		return nil
	}
}
