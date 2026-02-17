package main

import (
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"image"
	"log"
	"math"
	"os"
	"strings"
	"sync"

	"fyne.io/fyne/v2"
	canvasPkg "fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
)

// GLCanvas represents a WebGL rendering context mapped to Fyne's Shader canvas
// This bridges three.js GL commands to Fyne's GPU-accelerated rendering pipeline
// The GLCanvas can be added to Fyne containers and displayed alongside other widgets
type GLCanvas struct {
	ID     string
	Width  int
	Height int

	// Fyne integration - these are the widgets used to display the GL canvas
	FyneCanvas        fyne.Canvas              // The Fyne canvas for rendering
	ShaderObject      *canvasPkg.Shader           // The underlying Fyne Shader primitive (set up by setup-fyne-fork.sh)
	HoverableObject   *canvasPkg.HoverableShader  // Optional: hoverable version for mouse events
	Container         fyne.CanvasObject        // Container to hold the shader in the widget hierarchy
	Interactive       bool                     // Whether this canvas receives mouse events

	// GL object tracking (maps JS-side IDs to internal state)
	programs       map[uint32]*shaderProgram
	buffers        map[uint32]*shaderBuffer
	textures       map[uint32]*shaderTexture
	shaders        map[uint32]*shaderSource
	uniformLocs    map[uint32]*uniformInfo
	currentProgram uint32
	currentBuffer  uint32
	elementBuffer  uint32

	// Texture state
	activeTextureUnit uint32                       // Currently active texture unit (0-31)
	boundTextures     map[uint32]uint32            // Maps texture unit → bound texture ID
	samplerUniforms   map[string]uint32            // Maps sampler uniform name → texture unit

	// Attribute location tracking (maps location → attribute name)
	attribLocations map[int32]string

	// Attribute binding tracking (maps location → buffer/size/stride/offset at time of vertexAttribPointer)
	attribBindings map[int32]struct {
		bufferId uint32
		size     int
		stride   int // bytes (0 = tightly packed)
		offset   int // bytes
	}

	// VAO (Vertex Array Object) tracking
	vaos       map[uint32]*vaoState // Maps VAO ID → saved state
	currentVAO uint32               // Currently bound VAO (0 = default)

	// Vertex data accumulation (legacy)
	vertexData  []float32
	indexData   []uint16
	vertexDirty bool
	indexDirty  bool

	// Mouse event buffer (accumulated between frames, drained on request)
	pendingMouseEvents []MouseEvent
	mouseEventMu       sync.Mutex
}

// MouseEvent represents a buffered mouse event
type MouseEvent struct {
	Type   string  `json:"type"`   // "mousemove", "mouseenter", "mouseleave", "mousedown", "mouseup"
	X      float32 `json:"x"`
	Y      float32 `json:"y"`
	Button int     `json:"button"` // 0=left, 1=middle, 2=right (DOM convention)
}

// centerNoMinLayout centers children like container.NewCenter but reports
// MinSize as (1,1) so the window can shrink below the child's initial size.
type centerNoMinLayout struct{}

func (l *centerNoMinLayout) Layout(objects []fyne.CanvasObject, size fyne.Size) {
	for _, child := range objects {
		childSize := child.MinSize()
		child.Resize(childSize)
		child.Move(fyne.NewPos(
			(size.Width-childSize.Width)/2,
			(size.Height-childSize.Height)/2,
		))
	}
}

func (l *centerNoMinLayout) MinSize(objects []fyne.CanvasObject) fyne.Size {
	return fyne.NewSize(1, 1)
}

// vaoState captures the GL state that a Vertex Array Object tracks:
// attribute bindings, attribute locations, and element array buffer binding.
type vaoState struct {
	attribBindings  map[int32]struct {
		bufferId uint32
		size     int
		stride   int
		offset   int
	}
	attribLocations map[int32]string
	elementBuffer   uint32
}

// shaderProgram represents a compiled shader program
type shaderProgram struct {
	id                 uint32
	vertexSrc          string
	fragSrc            string
	convertedVertexSrc string // Converted to GLSL 110
	convertedFragSrc   string // Converted to GLSL 110
	linked             bool
}


// shaderBuffer represents vertex or index buffer data
type shaderBuffer struct {
	id            uint32
	target        uint32
	data          []float32
	indexData     []uint16
	attributeName string // The attribute this buffer is associated with (e.g., "position", "normal")
	componentSize int    // Number of components per vertex (e.g., 3 for vec3)
}

// shaderTexture represents a texture
type shaderTexture struct {
	id    uint32
	image image.Image
}

// shaderSource represents shader source code waiting to be compiled
type shaderSource struct {
	id     uint32
	typ    uint32
	source string
}

// uniformInfo represents a uniform variable
type uniformInfo struct {
	id   uint32
	name string
}

// Store active GL canvases (maps canvasId -> GLCanvas)
var glCanvases = make(map[string]*GLCanvas)
var glCanvasCounter = 0

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

// ═══════════════════════════════════════════════════════════════
// Handler for creating a GL canvas
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) handleCreateGLCanvas(msg Message) Response {
	payload := msg.Payload

	// Use toFloat32 helper to handle msgpack numeric encoding (int64, uint16, etc.)
	widthVal, widthOk := payload["width"]
	heightVal, heightOk := payload["height"]
	if !widthOk || !heightOk {
		log.Println("[GL] Error: missing width or height")
		return Response{Error: "missing width or height"}
	}

	width := toFloat32(widthVal)
	height := toFloat32(heightVal)

	glCanvasCounter++
	canvasID := fmt.Sprintf("gl_canvas_%d", glCanvasCounter)

	// Check if this canvas needs mouse interactivity
	interactive, _ := payload["interactive"].(bool)

	// Create a Fyne Shader canvas (provided by setup-fyne-fork.sh)
	// For now, we'll use a minimal fragment shader that clears to black
	minimalShader := `
void main() {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`

	var shaderObject *canvasPkg.Shader
	var hoverableObject *canvasPkg.HoverableShader
	var shaderContainer fyne.CanvasObject

	if interactive {
		// Create a hoverable shader for mouse events
		hoverableObject = canvasPkg.NewHoverableShader(width, height, minimalShader)
		shaderObject = hoverableObject.Shader
		shaderContainer = hoverableObject
		log.Printf("[GL] Creating interactive GL canvas with mouse events")
	} else {
		// Create a regular shader (no mouse events)
		shaderObject = canvasPkg.NewShader(width, height, minimalShader)
		shaderContainer = shaderObject
	}

	// Wrap the shader in a container so it can be added to Fyne widget hierarchies
	// The container will be added to the window's content
	glContainer := container.New(&centerNoMinLayout{}, shaderContainer)
	// Resize must happen on main thread
	fyne.DoAndWait(func() {
		glContainer.Resize(fyne.NewSize(width, height))
	})

	glCanv := &GLCanvas{
		ID:              canvasID,
		Width:           int(width),
		Height:          int(height),
		ShaderObject:    shaderObject,
		HoverableObject: hoverableObject,
		Container:       glContainer,
		Interactive:     interactive,
		programs:        make(map[uint32]*shaderProgram),
		buffers:         make(map[uint32]*shaderBuffer),
		textures:        make(map[uint32]*shaderTexture),
		shaders:         make(map[uint32]*shaderSource),
		uniformLocs:     make(map[uint32]*uniformInfo),
		attribLocations: make(map[int32]string),
		attribBindings:  make(map[int32]struct{ bufferId uint32; size int; stride int; offset int }),
		vaos:            make(map[uint32]*vaoState),
		vertexData:      make([]float32, 0),
		indexData:       make([]uint16, 0),
	}

	// Set up mouse event callbacks for interactive canvases
	if interactive && hoverableObject != nil {
		hoverableObject.SetOnMouseMoved(func(x, y float32) {
			b.sendMouseEvent(canvasID, "mousemove", x, y, 0)
		})
		hoverableObject.SetOnMouseIn(func(x, y float32) {
			b.sendMouseEvent(canvasID, "mouseenter", x, y, 0)
		})
		hoverableObject.SetOnMouseOut(func() {
			b.sendMouseEvent(canvasID, "mouseleave", 0, 0, 0)
		})
		hoverableObject.SetOnMouseDown(func(x, y float32, button int) {
			// Convert Fyne button (1=primary, 2=secondary, 4=tertiary) to DOM button (0=left, 2=right, 1=middle)
			domButton := fyneButtonToDOM(button)
			b.sendMouseEvent(canvasID, "mousedown", x, y, domButton)
		})
		hoverableObject.SetOnMouseUp(func(x, y float32, button int) {
			domButton := fyneButtonToDOM(button)
			b.sendMouseEvent(canvasID, "mouseup", x, y, domButton)
		})
	}

	glCanvases[canvasID] = glCanv

	// IoC: Get target window from message, or use first available window
	windowID, _ := payload["windowId"].(string)
	if windowID == "" {
		// If no window specified, find the first window
		b.mu.RLock()
		for id := range b.windows {
			windowID = id
			break
		}
		b.mu.RUnlock()
	}

	// Add GL canvas to the specified window, or auto-create one if needed
	if windowID != "" {
		b.mu.RLock()
		win, exists := b.windows[windowID]
		b.mu.RUnlock()

		if exists {
			// Set on main thread to avoid Fyne threading issues
			fyne.DoAndWait(func() {
				win.SetContent(glContainer)
			})
		}
	} else {
		// No window exists and none specified - auto-create one for GL rendering
		fyne.DoAndWait(func() {
			// Create default GL rendering window
			glWindow := b.app.NewWindow("Three.js Rendering")
			glWindow.Resize(fyne.NewSize(float32(glCanv.Width), float32(glCanv.Height)))
			glWindow.SetContent(glContainer)

			// Register it in the windows map
			b.mu.Lock()
			if windowID == "" {
				windowID = "gl_window_0"
			}
			b.windows[windowID] = glWindow
			b.mu.Unlock()

			glWindow.Show()
		})
	}

	// log.Printf("[GL] Successfully created GL canvas %s, returning response", canvasID)
	return Response{
		Success: true,
		Result: map[string]interface{}{
			"canvasId": canvasID,
			"widgetId": canvasID, // Can be used to reference this widget in Fyne containers
		},
	}
}

// ═══════════════════════════════════════════════════════════════
// Handler for resizing a GL canvas
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) handleResizeGLCanvas(msg Message) Response {
	payload := msg.Payload

	canvasID, ok := payload["canvasId"].(string)
	if !ok {
		return Response{Error: "missing or invalid canvasId"}
	}

	canvas, exists := glCanvases[canvasID]
	if !exists {
		return Response{Error: fmt.Sprintf("canvas not found: %s", canvasID)}
	}

	widthVal, widthOk := payload["width"]
	heightVal, heightOk := payload["height"]
	if !widthOk || !heightOk {
		return Response{Error: "missing width or height"}
	}

	width := toFloat32(widthVal)
	height := toFloat32(heightVal)

	canvas.Width = int(width)
	canvas.Height = int(height)

	// Update the shader's min size on the main thread.
	// Don't Refresh the shader — that would trigger drawShader on the main
	// thread while the animation loop's executeBatch goroutine may be writing
	// to the shader's attribute maps (concurrent map access).
	// The next animation frame's executeBatch already does a synchronized
	// Refresh + WaitForPaint.  The Center layout will re-center the widget
	// when Fyne re-lays-out the window at the new size.
	fyne.DoAndWait(func() {
		newSize := fyne.NewSize(width, height)
		canvas.ShaderObject.SetMinSize(newSize)
	})

	log.Printf("[GL] Resized GL canvas %s to %dx%d", canvasID, int(width), int(height))
	return Response{Success: true}
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

	// Per-batch logging disabled for performance
	// log.Printf("[GL] handleExecuteBatch: %d commands for canvas %s", len(commandsRaw), canvasID)

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

	// Push attribute buffers to the shader using the attribBindings map
	// This maps attribute locations to buffer IDs with component sizes
	attrCount := 0
	// Per-batch logging disabled for performance
	// log.Printf("[GL] Processing %d attrib bindings, %d buffers, FragSrc=%d bytes, VertSrc=%d bytes",
	//	len(canvas.attribBindings), len(canvas.buffers),
	//	len(canvas.ShaderObject.FragmentSource), len(canvas.ShaderObject.VertexSource))

	for location, binding := range canvas.attribBindings {
		// Get the attribute name for this location
		attrName, hasName := canvas.attribLocations[location]
		if !hasName {
			// Fallback to common attribute names
			switch location {
			case 0:
				attrName = "position"
			case 1:
				attrName = "normal"
			case 2:
				attrName = "uv"
			default:
				attrName = fmt.Sprintf("attr_%d", location)
			}
		}

		// Get the buffer data
		buffer, exists := canvas.buffers[binding.bufferId]
		if !exists {
			// Warning log disabled for performance (can enable for debugging)
			// log.Printf("[GL] WARNING: Buffer %d for attribute %s (loc %d) not found", binding.bufferId, attrName, location)
			continue
		}

		if len(buffer.data) > 0 {
			canvas.ShaderObject.SetAttributeBuffer(attrName, buffer.data, binding.size, binding.stride, binding.offset)
			// Per-attribute logging disabled for performance
			// log.Printf("[GL] Set attribute buffer %s: %d floats, size=%d, stride=%d, offset=%d (buffer %d, loc %d)",
			//	attrName, len(buffer.data), binding.size, binding.stride, binding.offset, binding.bufferId, location)
			attrCount++
		} else {
			// Warning log disabled for performance
			// log.Printf("[GL] WARNING: Buffer %d has no data for attribute %s", binding.bufferId, attrName)
		}
	}

	// Debug logging disabled for performance
	_ = attrCount // Suppress unused warning
	// if attrCount == 0 && len(canvas.attribBindings) == 0 {
	//	log.Printf("[GL] WARNING: No attribute bindings! Buffers available: %d", len(canvas.buffers))
	//	for bufId, buffer := range canvas.buffers {
	//		log.Printf("[GL]   Buffer %d: data=%d floats", bufId, len(buffer.data))
	//	}
	// }

	// Push index data if available
	if canvas.indexDirty && len(canvas.indexData) > 0 {
		canvas.ShaderObject.SetIndices(canvas.indexData)
		canvas.indexDirty = false
	}

	// Signal that we're about to paint and want to wait for completion
	canvas.ShaderObject.BeginPaint()

	// Refresh the shader to trigger rendering - must happen on main thread
	// When using HoverableShader, refresh that instead of the embedded Shader
	fyne.DoAndWait(func() {
		if canvas.HoverableObject != nil {
			canvas.HoverableObject.Refresh()
		} else {
			canvas.ShaderObject.Refresh()
		}
	})

	// Wait for the actual GL paint to complete before returning
	// This prevents the next frame from overwriting render commands before they're painted
	canvas.ShaderObject.WaitForPaint()

	// Include coalesced mouse events in response (no separate fetch needed)
	events := drainMouseEvents(canvasID)
	if len(events) > 0 {
		return Response{Success: true, Result: map[string]interface{}{"mouseEvents": events}}
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

	// Query the GL parameter - return reasonable defaults
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

	// Return NO_ERROR (0) - Fyne's painter will handle actual GL errors
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

	// Uniform operations
	case "uniform1f", "uniform2f", "uniform3f", "uniform4f":
		return b.glUniformFloat(canvas, cmd, args)
	case "uniform1i", "uniform2i", "uniform3i", "uniform4i":
		return b.glUniformInt(canvas, cmd, args)
	case "uniform1iv", "uniform2iv", "uniform3iv", "uniform4iv":
		return b.glUniformIntv(canvas, cmd, args)
	case "uniform1fv", "uniform2fv", "uniform3fv", "uniform4fv":
		return b.glUniformFloatv(canvas, cmd, args)
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
	case "texStorage2D":
		return b.glTexStorage2D(canvas, args)
	// State operations
	case "clear":
		return b.glClear(canvas, args)
	case "clearColor":
		return b.glClearColor(canvas, args)
	case "clearDepth":
		return b.glClearDepth(canvas, args)
	case "clearStencil":
		return b.glClearStencil(canvas, args)
	case "colorMask":
		return b.glColorMask(canvas, args)
	case "viewport":
		return b.glViewport(canvas, args)
	case "enable":
		return b.glEnable(canvas, args)
	case "disable":
		return b.glDisable(canvas, args)
	case "depthFunc":
		return b.glDepthFunc(canvas, args)
	case "depthMask":
		return b.glDepthMask(canvas, args)
	case "depthRange":
		return nil // Depth range - not yet needed
	case "stencilFunc":
		return b.glStencilFunc(canvas, args)
	case "stencilOp":
		return b.glStencilOp(canvas, args)
	case "stencilMask":
		return b.glStencilMask(canvas, args)
	case "stencilFuncSeparate":
		return b.glStencilFuncSeparate(canvas, args)
	case "stencilOpSeparate":
		return b.glStencilOpSeparate(canvas, args)
	case "stencilMaskSeparate":
		return b.glStencilMaskSeparate(canvas, args)
	case "frontFace":
		return b.glFrontFace(canvas, args)
	case "cullFace":
		return b.glCullFace(canvas, args)
	case "blendFunc":
		return b.glBlendFunc(canvas, args)
	case "blendFuncSeparate":
		return b.glBlendFuncSeparate(canvas, args)
	case "blendEquation":
		return b.glBlendEquation(canvas, args)
	case "blendEquationSeparate":
		return b.glBlendEquationSeparate(canvas, args)
	case "blendColor":
		return b.glBlendColor(canvas, args)
	case "polygonOffset":
		return b.glPolygonOffset(canvas, args)
	case "lineWidth":
		return b.glLineWidth(canvas, args)
	case "pixelStorei":
		return nil // Pixel storage - handled by painter
	case "hint":
		return nil // Hints - ignored

	// Drawing operations
	case "drawArrays":
		return b.glDrawArrays(canvas, args)
	case "drawElements":
		return b.glDrawElements(canvas, args)
	case "drawArraysInstanced":
		return b.glDrawArraysInstanced(canvas, args)
	case "drawElementsInstanced":
		return b.glDrawElementsInstanced(canvas, args)

	// Vertex attributes
	case "enableVertexAttribArray", "disableVertexAttribArray":
		return nil // Handled by painter
	case "getAttribLocation":
		return b.glGetAttribLocation(canvas, args)
	case "vertexAttribPointer":
		return b.glVertexAttribPointer(canvas, args)
	case "vertexAttribDivisor":
		return b.glVertexAttribDivisor(canvas, args)
	case "vertexAttrib1f", "vertexAttrib2f", "vertexAttrib3f", "vertexAttrib4f",
		"vertexAttrib1fv", "vertexAttrib2fv", "vertexAttrib3fv", "vertexAttrib4fv":
		return b.glVertexAttribFv(canvas, cmd, args)

	// Framebuffer operations
	case "createFramebuffer":
		return b.glCreateFramebuffer(canvas, args)
	case "deleteFramebuffer":
		return b.glDeleteFramebuffer(canvas, args)
	case "bindFramebuffer":
		return b.glBindFramebuffer(canvas, args)
	case "framebufferTexture2D":
		return b.glFramebufferTexture2D(canvas, args)
	case "framebufferRenderbuffer":
		return b.glFramebufferRenderbuffer(canvas, args)
	case "checkFramebufferStatus":
		return nil // Returns hardcoded FRAMEBUFFER_COMPLETE from JS side

	// Renderbuffer operations
	case "createRenderbuffer":
		return b.glCreateRenderbuffer(canvas, args)
	case "deleteRenderbuffer":
		return b.glDeleteRenderbuffer(canvas, args)
	case "bindRenderbuffer":
		return b.glBindRenderbuffer(canvas, args)
	case "renderbufferStorage":
		return b.glRenderbufferStorage(canvas, args)

	// Vertex array operations
	case "createVertexArray":
		return b.glCreateVertexArray(canvas, args)
	case "deleteVertexArray":
		return b.glDeleteVertexArray(canvas, args)
	case "bindVertexArray":
		return b.glBindVertexArray(canvas, args)

	// 3D texture operations
	case "texImage3D", "texSubImage3D":
		return nil // 3D textures - handled by painter

	// Draw/read buffer operations
	case "drawBuffers":
		return b.glDrawBuffers(canvas, args)
	case "readBuffer":
		return nil // Read buffer selection - not yet needed
	case "blitFramebuffer":
		return nil // Framebuffer blit - not yet needed

	// Texture parameter operations
	case "texParameteri", "texParameterf":
		return b.glTexParameteri(canvas, args)

	// Misc operations
	case "scissor":
		return b.glScissor(canvas, args)
	case "generateMipmap", "readPixels":
		return nil // Misc - handled by painter

	default:
		return fmt.Errorf("unknown GL command: %s", cmd)
	}
}

// ═══════════════════════════════════════════════════════════════
// Shader & Program Operations
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glCreateShader(canvas *GLCanvas, args map[string]interface{}) error {
	shaderIdVal, ok := args["shaderId"]
	if !ok {
		return fmt.Errorf("missing shaderId")
	}
	shaderTypeVal, ok := args["type"]
	if !ok {
		return fmt.Errorf("missing type")
	}
	shaderId := toFloat32(shaderIdVal)
	shaderType := toFloat32(shaderTypeVal)

	canvas.shaders[uint32(shaderId)] = &shaderSource{
		id:  uint32(shaderId),
		typ: uint32(shaderType),
	}
	return nil
}

func (b *Bridge) glDeleteShader(canvas *GLCanvas, args map[string]interface{}) error {
	shaderIdVal, ok := args["shaderId"]
	if !ok {
		return fmt.Errorf("missing shaderId")
	}
	shaderId := toFloat32(shaderIdVal)
	delete(canvas.shaders, uint32(shaderId))
	return nil
}

func (b *Bridge) glShaderSource(canvas *GLCanvas, args map[string]interface{}) error {
	shaderIdVal, ok := args["shaderId"]
	if !ok {
		return fmt.Errorf("missing shaderId")
	}
	source, ok := args["source"].(string)
	if !ok {
		return fmt.Errorf("missing source")
	}
	shaderId := toFloat32(shaderIdVal)

	shader, exists := canvas.shaders[uint32(shaderId)]
	if !exists {
		return fmt.Errorf("shader not found: %d", uint32(shaderId))
	}

	// Shader source logging disabled for performance (enable for debugging)
	// preview := source
	// if len(preview) > 500 {
	//	preview = preview[:500]
	// }
	// log.Printf("[GL] shaderSource: id=%d, type=%d, preview:\n%s", uint32(shaderId), shader.typ, preview)

	shader.source = source
	return nil
}

func (b *Bridge) glCompileShader(canvas *GLCanvas, args map[string]interface{}) error {
	// Shaders are compiled when program is linked
	return nil
}

func (b *Bridge) glCreateProgram(canvas *GLCanvas, args map[string]interface{}) error {
	programIdVal, ok := args["programId"]
	if !ok {
		return fmt.Errorf("missing programId")
	}
	programId := toFloat32(programIdVal)

	canvas.programs[uint32(programId)] = &shaderProgram{
		id: uint32(programId),
	}
	return nil
}

func (b *Bridge) glDeleteProgram(canvas *GLCanvas, args map[string]interface{}) error {
	programIdVal, ok := args["programId"]
	if !ok {
		return fmt.Errorf("missing programId")
	}
	programId := toFloat32(programIdVal)
	delete(canvas.programs, uint32(programId))
	return nil
}

func (b *Bridge) glAttachShader(canvas *GLCanvas, args map[string]interface{}) error {
	programIdVal, ok := args["programId"]
	if !ok {
		return fmt.Errorf("missing programId")
	}
	shaderIdVal, ok := args["shaderId"]
	if !ok {
		return fmt.Errorf("missing shaderId")
	}
	programId := toFloat32(programIdVal)
	shaderId := toFloat32(shaderIdVal)

	program, pExists := canvas.programs[uint32(programId)]
	if !pExists {
		return fmt.Errorf("program not found: %d", uint32(programId))
	}

	shader, sExists := canvas.shaders[uint32(shaderId)]
	if !sExists {
		return fmt.Errorf("shader not found: %d", uint32(shaderId))
	}

	// Attach shader source to program based on type
	if shader.typ == 0x8B31 { // VERTEX_SHADER
		program.vertexSrc = shader.source
	} else if shader.typ == 0x8B30 { // FRAGMENT_SHADER
		program.fragSrc = shader.source
	}

	return nil
}

func (b *Bridge) glDetachShader(canvas *GLCanvas, args map[string]interface{}) error {
	// Not needed for our simplified model
	return nil
}

func (b *Bridge) glLinkProgram(canvas *GLCanvas, args map[string]interface{}) error {
	programIdVal, ok := args["programId"]
	if !ok {
		return fmt.Errorf("missing programId")
	}
	programId := toFloat32(programIdVal)

	program, exists := canvas.programs[uint32(programId)]
	if !exists {
		return fmt.Errorf("program not found: %d", uint32(programId))
	}

	// Convert and store vertex shader source if available
	if program.vertexSrc != "" {
		// Convert GLSL 300 ES to GLSL 110 for desktop OpenGL
		program.convertedVertexSrc = ConvertVertexShader(program.vertexSrc, ShaderGLSL110)

		// Write vertex shader to tmp file for debugging (with program ID for uniqueness)
		_ = writeShaderDebugFile(fmt.Sprintf("/tmp/vertex_shader_%d.glsl", programId), program.vertexSrc)
		_ = writeShaderDebugFile(fmt.Sprintf("/tmp/vertex_shader_%d_converted.glsl", programId), program.convertedVertexSrc)

		// Debug: check for USE_COLOR in vertex shader
		// if strings.Contains(program.vertexSrc, "#define USE_COLOR") {
		// 	log.Printf("[GL-DEBUG] Program %d: HAS USE_COLOR defined in vertex shader", programId)
		// } else if strings.Contains(program.vertexSrc, "USE_COLOR") {
		// 	log.Printf("[GL-DEBUG] Program %d: Uses USE_COLOR but NOT defined (conditional will be false)", programId)
		// }
	}

	// Convert and store fragment shader source if available
	if program.fragSrc != "" {
		// Convert GLSL 300 ES to target language
		program.convertedFragSrc = ConvertFragmentShader(program.fragSrc, ShaderGLSL110)

		// Write shader to tmp file for debugging
		_ = writeShaderDebugFile(fmt.Sprintf("/tmp/fragment_shader_%d.glsl", programId), program.fragSrc)
		_ = writeShaderDebugFile(fmt.Sprintf("/tmp/fragment_shader_%d_converted.glsl", programId), program.convertedFragSrc)

		// Debug logging for shader analysis (enable when debugging shader issues)
		// hasLightDefines := false
		// lines := strings.Split(program.fragSrc, "\n")
		// for _, line := range lines {
		// 	if strings.Contains(line, "NUM_DIR_LIGHTS") || strings.Contains(line, "NUM_POINT_LIGHTS") ||
		// 		strings.Contains(line, "NUM_SPOT_LIGHTS") || strings.Contains(line, "DirectionalLight") {
		// 		log.Printf("[GL-DEBUG] Light line: %s", line)
		// 		hasLightDefines = true
		// 	}
		// }
		// if !hasLightDefines {
		// 	log.Printf("[GL-DEBUG] WARNING: No light defines found in shader!")
		// }
		// log.Printf("[GL-DEBUG] Program %d: Fragment shader CONVERTED (%d bytes)", programId, len(program.convertedFragSrc))
	}

	program.linked = true
	return nil
}

func (b *Bridge) glUseProgram(canvas *GLCanvas, args map[string]interface{}) error {
	programIdVal, ok := args["programId"]
	if !ok {
		return fmt.Errorf("missing programId")
	}
	programId := uint32(toFloat32(programIdVal))

	prevProgram := canvas.currentProgram
	canvas.currentProgram = programId

	if program, exists := canvas.programs[programId]; exists && program.linked {
		vertSrc := program.convertedVertexSrc
		fragSrc := program.convertedFragSrc
		// Use direct field assignment to avoid setting needsCompile=true,
		// which would cause unnecessary recompilation every frame in
		// multi-program scenes. The painter detects source changes via
		// program cache lookup instead.
		if vertSrc != "" {
			canvas.ShaderObject.VertexSource = vertSrc
		}
		if fragSrc != "" {
			canvas.ShaderObject.FragmentSource = fragSrc
		}
		// Queue useProgram render command when switching programs
		// This ensures the first program's objects use the correct shader,
		// not the last program compiled at the top of drawShader
		if prevProgram != programId {
			canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
				Type: "useProgram",
				Value: canvasPkg.UseProgramParams{
					VertexSource:   vertSrc,
					FragmentSource: fragSrc,
				},
			})
		}
	}
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Vertex Attribute Operations
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glGetAttribLocation(canvas *GLCanvas, args map[string]interface{}) error {
	name, ok := args["name"].(string)
	if !ok {
		return fmt.Errorf("missing name")
	}
	locationVal, ok := args["location"]
	if !ok {
		return fmt.Errorf("missing location")
	}
	location := int32(toFloat32(locationVal))

	// Store the mapping from location to attribute name
	canvas.attribLocations[location] = name

	// Also store on the shader object so the painter can use it
	// (bypasses OpenGL's glGetAttribLocation which returns -1 for optimized-out attributes)
	if canvas.ShaderObject != nil {
		canvas.ShaderObject.SetAttributeLocation(name, location)
	}
	// log.Printf("[GL] getAttribLocation: name=%q -> location=%d", name, location)
	return nil
}

func (b *Bridge) glVertexAttribPointer(canvas *GLCanvas, args map[string]interface{}) error {
	locationVal, ok := args["location"]
	if !ok {
		// log.Printf("[GL] vertexAttribPointer: missing location arg, args=%v", args)
		return nil // Location not provided, skip
	}
	location := int32(toFloat32(locationVal))

	sizeVal, ok := args["size"]
	if !ok {
		// log.Printf("[GL] vertexAttribPointer: missing size arg")
		return nil
	}
	size := int(toFloat32(sizeVal))

	// log.Printf("[GL] vertexAttribPointer: loc=%d, size=%d, currentBuffer=%d",
	//	location, size, canvas.currentBuffer)

	// Extract stride and offset (bytes; 0 = tightly packed)
	stride := int(toFloat32(args["stride"]))
	offset := int(toFloat32(args["offset"]))

	// Store the binding: which buffer is bound to this attribute location
	if canvas.currentBuffer > 0 {
		canvas.attribBindings[location] = struct {
			bufferId uint32
			size     int
			stride   int
			offset   int
		}{canvas.currentBuffer, size, stride, offset}
		// log.Printf("[GL] vertexAttribPointer: bound location %d -> buffer %d, size %d, stride %d, offset %d", location, canvas.currentBuffer, size, stride, offset)
	}
	// else {
	//	log.Printf("[GL] vertexAttribPointer: no currentBuffer bound!")
	// }

	return nil
}

func (b *Bridge) glVertexAttribFv(canvas *GLCanvas, cmd string, args map[string]interface{}) error {
	index := uint32(toFloat32(args["index"]))
	var values []float32

	switch cmd {
	case "vertexAttrib1f":
		values = []float32{toFloat32(args["x"])}
	case "vertexAttrib2f":
		values = []float32{toFloat32(args["x"]), toFloat32(args["y"])}
	case "vertexAttrib3f":
		values = []float32{toFloat32(args["x"]), toFloat32(args["y"]), toFloat32(args["z"])}
	case "vertexAttrib4f":
		values = []float32{toFloat32(args["x"]), toFloat32(args["y"]), toFloat32(args["z"]), toFloat32(args["w"])}
	case "vertexAttrib1fv", "vertexAttrib2fv", "vertexAttrib3fv", "vertexAttrib4fv":
		if valsRaw, ok := args["values"]; ok {
			if arr, ok := valsRaw.([]interface{}); ok {
				values = make([]float32, len(arr))
				for i, v := range arr {
					values[i] = toFloat32(v)
				}
			}
		}
	}
	if len(values) == 0 {
		return nil
	}

	// Pack index + values into a single float32 slice for the render command
	packed := make([]float32, 1+len(values))
	packed[0] = float32(index)
	copy(packed[1:], values)

	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  cmd,
		Value: packed,
	})
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Vertex Array Object (VAO) Operations
// ═══════════════════════════════════════════════════════════════

// saveCurrentVAOState saves the current attrib bindings and element buffer to the
// currently bound VAO. Called before switching away from a VAO.
func (b *Bridge) saveCurrentVAOState(canvas *GLCanvas) {
	vaoId := canvas.currentVAO
	vao := canvas.vaos[vaoId]
	if vao == nil {
		vao = &vaoState{
			attribBindings: make(map[int32]struct{ bufferId uint32; size int; stride int; offset int }),
			attribLocations: make(map[int32]string),
		}
		canvas.vaos[vaoId] = vao
	}
	// Save attrib bindings
	for k, v := range canvas.attribBindings {
		vao.attribBindings[k] = v
	}
	// Save attrib locations
	for k, v := range canvas.attribLocations {
		vao.attribLocations[k] = v
	}
	// Save element buffer binding
	vao.elementBuffer = canvas.elementBuffer
}

// restoreVAOState restores attrib bindings and element buffer from the given VAO.
func (b *Bridge) restoreVAOState(canvas *GLCanvas, vaoId uint32) {
	vao := canvas.vaos[vaoId]
	if vao == nil {
		// New/empty VAO — clear bindings
		canvas.attribBindings = make(map[int32]struct{ bufferId uint32; size int; stride int; offset int })
		canvas.elementBuffer = 0
		return
	}

	// Restore attrib bindings
	canvas.attribBindings = make(map[int32]struct{ bufferId uint32; size int; stride int; offset int })
	for k, v := range vao.attribBindings {
		canvas.attribBindings[k] = v
	}
	// Restore attrib locations
	for k, v := range vao.attribLocations {
		canvas.attribLocations[k] = v
	}
	// Restore element buffer binding and its index data
	canvas.elementBuffer = vao.elementBuffer
	if vao.elementBuffer > 0 {
		if buf, exists := canvas.buffers[vao.elementBuffer]; exists && len(buf.indexData) > 0 {
			canvas.indexData = buf.indexData
		}
	}
}

func (b *Bridge) glCreateVertexArray(canvas *GLCanvas, args map[string]interface{}) error {
	vaIdVal, ok := args["vaId"]
	if !ok {
		return fmt.Errorf("missing vaId")
	}
	vaId := uint32(toFloat64(vaIdVal))
	canvas.vaos[vaId] = &vaoState{
		attribBindings: make(map[int32]struct{ bufferId uint32; size int; stride int; offset int }),
		attribLocations: make(map[int32]string),
	}
	return nil
}

func (b *Bridge) glDeleteVertexArray(canvas *GLCanvas, args map[string]interface{}) error {
	vaIdVal, ok := args["vaId"]
	if !ok {
		return fmt.Errorf("missing vaId")
	}
	vaId := uint32(toFloat64(vaIdVal))
	delete(canvas.vaos, vaId)
	return nil
}

func (b *Bridge) glBindVertexArray(canvas *GLCanvas, args map[string]interface{}) error {
	vaIdVal, ok := args["vaId"]
	if !ok {
		return fmt.Errorf("missing vaId")
	}
	vaId := uint32(toFloat64(vaIdVal))

	// Save current state to the currently bound VAO
	b.saveCurrentVAOState(canvas)

	// Switch to new VAO
	canvas.currentVAO = vaId

	// Restore state from the new VAO
	b.restoreVAOState(canvas, vaId)

	return nil
}

// ═══════════════════════════════════════════════════════════════
// Buffer Operations
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glCreateBuffer(canvas *GLCanvas, args map[string]interface{}) error {
	bufferIdVal, ok := args["bufferId"]
	if !ok {
		return fmt.Errorf("missing bufferId")
	}
	bufferId := toFloat32(bufferIdVal)

	canvas.buffers[uint32(bufferId)] = &shaderBuffer{
		id: uint32(bufferId),
	}
	return nil
}

func (b *Bridge) glDeleteBuffer(canvas *GLCanvas, args map[string]interface{}) error {
	bufferIdVal, ok := args["bufferId"]
	if !ok {
		return fmt.Errorf("missing bufferId")
	}
	bufferId := toFloat32(bufferIdVal)
	delete(canvas.buffers, uint32(bufferId))
	return nil
}

func (b *Bridge) glBindBuffer(canvas *GLCanvas, args map[string]interface{}) error {
	targetVal, ok := args["target"]
	if !ok {
		return fmt.Errorf("missing target")
	}
	bufferIdVal, ok := args["bufferId"]
	if !ok {
		return fmt.Errorf("missing bufferId")
	}
	target := toFloat32(targetVal)
	bufferId := toFloat32(bufferIdVal)

	// log.Printf("[GL] glBindBuffer: target=%d (0x%x), bufferId=%d", uint32(target), uint32(target), uint32(bufferId))
	if uint32(target) == 0x8893 { // ELEMENT_ARRAY_BUFFER
		canvas.elementBuffer = uint32(bufferId)
		// Restore index data from the buffer's stored data (different geometry may have different indices)
		if buf, exists := canvas.buffers[uint32(bufferId)]; exists && len(buf.indexData) > 0 {
			canvas.indexData = buf.indexData
		}
	} else {
		canvas.currentBuffer = uint32(bufferId)
	}
	return nil
}

func (b *Bridge) glBufferData(canvas *GLCanvas, args map[string]interface{}) error {
	dataStr, ok := args["data"].(string)
	if !ok {
		return nil // No data provided
	}

	// Decode base64 data
	data, err := base64.StdEncoding.DecodeString(dataStr)
	if err != nil {
		return fmt.Errorf("failed to decode buffer data: %v", err)
	}

	target := uint32(toFloat64(args["target"]))

	if target == 0x8893 { // ELEMENT_ARRAY_BUFFER
		// Index buffer - convert bytes to uint16
		if buffer, exists := canvas.buffers[canvas.elementBuffer]; exists {
			indexData := make([]uint16, len(data)/2)
			for i := 0; i < len(indexData); i++ {
				offset := i * 2
				indexData[i] = uint16(data[offset]) | (uint16(data[offset+1]) << 8)
			}
			buffer.indexData = indexData
			canvas.indexData = indexData
			canvas.indexDirty = true
		}
	} else if canvas.currentBuffer > 0 {
		// Vertex buffer - convert bytes to float32 (little-endian IEEE 754)
		if buffer, exists := canvas.buffers[canvas.currentBuffer]; exists {
			floatData := make([]float32, len(data)/4)
			for i := 0; i < len(floatData); i++ {
				offset := i * 4
				bits := uint32(data[offset]) |
					(uint32(data[offset+1]) << 8) |
					(uint32(data[offset+2]) << 16) |
					(uint32(data[offset+3]) << 24)
				floatData[i] = math.Float32frombits(bits)
			}
			buffer.data = floatData
			canvas.vertexData = append(canvas.vertexData, floatData...)
			canvas.vertexDirty = true
		}
	}

	return nil
}

func (b *Bridge) glBufferSubData(canvas *GLCanvas, args map[string]interface{}) error {
	dataStr, ok := args["data"].(string)
	if !ok {
		return nil // No data provided
	}

	// Decode base64 data
	data, err := base64.StdEncoding.DecodeString(dataStr)
	if err != nil {
		return fmt.Errorf("failed to decode bufferSubData: %v", err)
	}

	dstByteOffset := int(toFloat64(args["dstByteOffset"]))
	target := uint32(toFloat64(args["target"]))

	if target == 0x8893 { // ELEMENT_ARRAY_BUFFER
		if buffer, exists := canvas.buffers[canvas.elementBuffer]; exists {
			dstIdx := dstByteOffset / 2 // byte offset to uint16 index
			for i := 0; i < len(data)/2; i++ {
				off := i * 2
				val := uint16(data[off]) | (uint16(data[off+1]) << 8)
				idx := dstIdx + i
				if idx < len(buffer.indexData) {
					buffer.indexData[idx] = val
				}
			}
			canvas.indexData = buffer.indexData
			canvas.indexDirty = true
		}
	} else if canvas.currentBuffer > 0 {
		// ARRAY_BUFFER - partial update of vertex data
		if buffer, exists := canvas.buffers[canvas.currentBuffer]; exists {
			dstIdx := dstByteOffset / 4 // byte offset to float32 index
			for i := 0; i < len(data)/4; i++ {
				off := i * 4
				bits := uint32(data[off]) |
					(uint32(data[off+1]) << 8) |
					(uint32(data[off+2]) << 16) |
					(uint32(data[off+3]) << 24)
				idx := dstIdx + i
				if idx < len(buffer.data) {
					buffer.data[idx] = math.Float32frombits(bits)
				}
			}
			canvas.vertexDirty = true
		}
	}

	return nil
}

// ═══════════════════════════════════════════════════════════════
// Uniform Operations
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glUniformFloat(canvas *GLCanvas, cmd string, args map[string]interface{}) error {
	// Get uniform name from args (sent from gl-proxy.ts)
	name, _ := args["name"].(string)
	if name == "" {
		name = fmt.Sprintf("u_uniform_%v", args["locationId"])
	}
	// log.Printf("[GL] %s: name=%s", cmd, name)

	switch cmd {
	case "uniform1f":
		x := toFloat64(args["x"])
		canvas.ShaderObject.QueueUniform(name, float32(x))
	case "uniform2f":
		x := toFloat64(args["x"])
		y := toFloat64(args["y"])
		canvas.ShaderObject.QueueUniform(name, [2]float32{float32(x), float32(y)})
	case "uniform3f":
		x := toFloat64(args["x"])
		y := toFloat64(args["y"])
		z := toFloat64(args["z"])
		canvas.ShaderObject.QueueUniform(name, [3]float32{float32(x), float32(y), float32(z)})
	case "uniform4f":
		x := toFloat64(args["x"])
		y := toFloat64(args["y"])
		z := toFloat64(args["z"])
		w := toFloat64(args["w"])
		canvas.ShaderObject.QueueUniform(name, [4]float32{float32(x), float32(y), float32(z), float32(w)})
	}
	return nil
}

func (b *Bridge) glUniformInt(canvas *GLCanvas, cmd string, args map[string]interface{}) error {
	// Get uniform name from args
	name, _ := args["name"].(string)
	if name == "" {
		name = fmt.Sprintf("u_uniform_%v", args["locationId"])
	}

	switch cmd {
	case "uniform1i":
		x := toFloat64(args["x"])
		textureUnit := uint32(x)
		// log.Printf("[GL] uniform1i: name=%s value=%d", name, textureUnit)

		// Check if this looks like a sampler uniform (common patterns)
		lowerName := strings.ToLower(name)
		isSampler := strings.Contains(lowerName, "map") ||
			strings.Contains(lowerName, "texture") ||
			strings.Contains(lowerName, "sampler") ||
			strings.Contains(lowerName, "tex")

		if isSampler {
			// Track sampler → texture unit mapping
			if canvas.samplerUniforms == nil {
				canvas.samplerUniforms = make(map[string]uint32)
			}
			canvas.samplerUniforms[name] = textureUnit

			// If we have a texture bound to this unit, set it on the shader
			if canvas.boundTextures != nil {
				textureId := canvas.boundTextures[textureUnit]
				if textureId != 0 {
					if texture, exists := canvas.textures[textureId]; exists && texture.image != nil {
						canvas.ShaderObject.SetTextureUniform(name, texture.image)
						// log.Printf("[GL] uniform1i: setting texture %s = unit %d (texId=%d, %dx%d)",
						//	name, textureUnit, textureId,
						//	texture.image.Bounds().Dx(), texture.image.Bounds().Dy())
					}
				}
			}
		}

		// Also queue as regular uniform (needed for non-texture int uniforms)
		canvas.ShaderObject.QueueUniform(name, int32(x))
	}
	return nil
}

func (b *Bridge) glUniformIntv(canvas *GLCanvas, cmd string, args map[string]interface{}) error {
	name, _ := args["name"].(string)
	if name == "" {
		name = fmt.Sprintf("u_uniform_%v", args["locationId"])
	}

	dataStr, ok := args["data"].(string)
	if !ok {
		return nil
	}
	decoded, err := base64.StdEncoding.DecodeString(dataStr)
	if err != nil {
		return err
	}

	// Convert bytes to int32 slice
	intCount := len(decoded) / 4
	ints := make([]int32, intCount)
	for i := 0; i < intCount; i++ {
		ints[i] = int32(binary.LittleEndian.Uint32(decoded[i*4 : (i+1)*4]))
	}

	// For uniform1iv, each element is a separate sampler/int value
	// Three.js uses this for shadow map sampler arrays like spotShadowMap[0..N]
	switch cmd {
	case "uniform1iv":
		if len(ints) == 1 {
			canvas.ShaderObject.QueueUniform(name, ints[0])
		} else {
			// Array of ints - queue each element with array index
			for i, v := range ints {
				arrName := fmt.Sprintf("%s[%d]", name, i)
				canvas.ShaderObject.QueueUniform(arrName, v)
			}
		}
	case "uniform2iv":
		if len(ints) >= 2 {
			canvas.ShaderObject.QueueUniform(name, ints[:2])
		}
	case "uniform3iv":
		if len(ints) >= 3 {
			canvas.ShaderObject.QueueUniform(name, ints[:3])
		}
	case "uniform4iv":
		if len(ints) >= 4 {
			canvas.ShaderObject.QueueUniform(name, ints[:4])
		}
	}
	return nil
}

func (b *Bridge) glUniformFloatv(canvas *GLCanvas, cmd string, args map[string]interface{}) error {
	// Get uniform name from args
	name, _ := args["name"].(string)
	if name == "" {
		name = fmt.Sprintf("u_uniform_%v", args["locationId"])
	}
	// log.Printf("[GL] %s: name=%s", cmd, name)

	// Decode base64 data
	dataStr, ok := args["data"].(string)
	if !ok {
		return nil
	}
	decoded, err := base64.StdEncoding.DecodeString(dataStr)
	if err != nil {
		return err
	}

	// Convert bytes to float32 slice
	floatCount := len(decoded) / 4
	floats := make([]float32, floatCount)
	for i := 0; i < floatCount; i++ {
		bits := binary.LittleEndian.Uint32(decoded[i*4 : (i+1)*4])
		floats[i] = math.Float32frombits(bits)
	}

	// Queue uniform (don't use SetUniform — it calls Refresh() which needs the main thread)
	switch cmd {
	case "uniform1fv":
		if len(floats) >= 1 {
			canvas.ShaderObject.QueueUniform(name, floats[0])
		}
	case "uniform2fv":
		if len(floats) >= 2 {
			canvas.ShaderObject.QueueUniform(name, [2]float32{floats[0], floats[1]})
		}
	case "uniform3fv":
		if len(floats) >= 3 {
			canvas.ShaderObject.QueueUniform(name, [3]float32{floats[0], floats[1], floats[2]})
		}
	case "uniform4fv":
		if len(floats) >= 4 {
			canvas.ShaderObject.QueueUniform(name, [4]float32{floats[0], floats[1], floats[2], floats[3]})
		}
	}
	return nil
}

func (b *Bridge) glUniformMatrix(canvas *GLCanvas, cmd string, args map[string]interface{}) error {
	// Get uniform name from args
	name, _ := args["name"].(string)
	if name == "" {
		name = fmt.Sprintf("u_uniform_%v", args["locationId"])
	}
	// log.Printf("[GL] %s: name=%s", cmd, name)

	// Decode base64 data
	dataStr, ok := args["data"].(string)
	if !ok {
		return nil
	}
	decoded, err := base64.StdEncoding.DecodeString(dataStr)
	if err != nil {
		return err
	}

	// Convert bytes to float32 slice
	floatCount := len(decoded) / 4
	floats := make([]float32, floatCount)
	for i := 0; i < floatCount; i++ {
		bits := binary.LittleEndian.Uint32(decoded[i*4 : (i+1)*4])
		floats[i] = math.Float32frombits(bits)
	}

	// Queue matrix uniform
	switch cmd {
	case "uniformMatrix2fv":
		if len(floats) >= 4 {
			canvas.ShaderObject.QueueUniform(name, floats[:4])
		}
	case "uniformMatrix3fv":
		if len(floats) >= 9 {
			canvas.ShaderObject.QueueUniform(name, floats[:9])
		}
	case "uniformMatrix4fv":
		if len(floats) >= 16 {
			canvas.ShaderObject.QueueUniform(name, floats[:16])
		}
	}
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Texture Operations
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glCreateTexture(canvas *GLCanvas, args map[string]interface{}) error {
	textureIdVal, ok := args["textureId"]
	if !ok {
		return fmt.Errorf("missing textureId")
	}
	textureId := toFloat32(textureIdVal)
	canvas.textures[uint32(textureId)] = &shaderTexture{
		id: uint32(textureId),
	}
	return nil
}

func (b *Bridge) glDeleteTexture(canvas *GLCanvas, args map[string]interface{}) error {
	textureIdVal, ok := args["textureId"]
	if !ok {
		return fmt.Errorf("missing textureId")
	}
	textureId := toFloat32(textureIdVal)
	delete(canvas.textures, uint32(textureId))
	return nil
}

func (b *Bridge) glBindTexture(canvas *GLCanvas, args map[string]interface{}) error {
	textureIdVal, ok := args["textureId"]
	if !ok {
		return fmt.Errorf("missing textureId")
	}
	textureId := uint32(toFloat32(textureIdVal))
	target := uint32(toFloat32(args["target"]))

	// Initialize boundTextures map if needed
	if canvas.boundTextures == nil {
		canvas.boundTextures = make(map[uint32]uint32)
	}

	// Bind texture to the active texture unit
	canvas.boundTextures[canvas.activeTextureUnit] = textureId

	// Also forward as render command for GPU-only textures (shadow maps, etc.)
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type: "bindTexture",
		Name: fmt.Sprintf("%d", textureId),
		Value: target,
	})
	return nil
}

func (b *Bridge) glActiveTexture(canvas *GLCanvas, args map[string]interface{}) error {
	textureVal, ok := args["texture"]
	if !ok {
		return fmt.Errorf("missing texture")
	}
	// texture is GL_TEXTURE0 + n, where n is the unit number
	// GL_TEXTURE0 = 0x84C0 = 33984
	textureEnum := uint32(toFloat32(textureVal))
	canvas.activeTextureUnit = textureEnum - 33984 // GL_TEXTURE0

	// Forward as render command so painter can set active texture unit
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "activeTexture",
		Value: textureEnum,
	})
	return nil
}

func (b *Bridge) glTexImage2D(canvas *GLCanvas, args map[string]interface{}) error {
	w := int(toFloat32(args["width"]))
	h := int(toFloat32(args["height"]))
	format := toFloat32(args["format"])           // GL_RGBA, GL_RGB, etc.
	internalformat := toFloat32(args["internalformat"])
	pixelsStr, hasPixels := args["pixels"].(string)

	// Get the currently bound texture
	if canvas.boundTextures == nil {
		canvas.boundTextures = make(map[uint32]uint32)
	}
	textureId := canvas.boundTextures[canvas.activeTextureUnit]
	if textureId == 0 {
		// No texture bound, nothing to do
		return nil
	}

	// Check for null pixels (GPU-only texture allocation, e.g., shadow maps)
	// When pixels is nil/missing, we allocate a texture on the GPU without uploading data
	if !hasPixels || pixelsStr == "" {
		typeVal := uint32(toFloat32(args["type"]))
		level := int(toFloat32(args["level"]))
		canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
			Type: "texImage2D_gpu",
			Name: fmt.Sprintf("%d", textureId),
			Value: canvasPkg.TexImage2DGPUParams{
				Target:         uint32(toFloat32(args["target"])),
				Level:          level,
				Internalformat: uint32(internalformat),
				Width:          w,
				Height:         h,
				Format:         uint32(format),
				Type:           typeVal,
			},
		})
		// Store format info for on-demand upload in the painter
		canvas.ShaderObject.SetGPUTexFormat(int(textureId), canvasPkg.GPUTextureFormat{
			Internalformat: uint32(internalformat),
			Format:         uint32(format),
			Type:           typeVal,
		})
		log.Printf("[GL] texImage2D: GPU-only texture %d (%dx%d, format=0x%x, type=0x%x)", textureId, w, h, uint32(format), typeVal)
		return nil
	}

	texture, exists := canvas.textures[textureId]
	if !exists {
		return fmt.Errorf("texture %d not found", textureId)
	}

	// Create the image
	img := image.NewRGBA(image.Rect(0, 0, w, h))

	if hasPixels && pixelsStr != "" {
		// Decode base64 pixel data
		pixelData, err := base64.StdEncoding.DecodeString(pixelsStr)
		if err != nil {
			log.Printf("[GL] texImage2D: failed to decode base64 pixel data: %v", err)
			return nil
		}

		// Interpret format
		const (
			GL_RED        = 0x1903
			GL_ALPHA      = 6406
			GL_RGB        = 6407
			GL_RGBA       = 6408
			GL_LUMINANCE  = 6409
			GL_RG         = 0x8227
			GL_HALF_FLOAT = 0x140B
		)

		formatEnum := uint32(format)
		if formatEnum == 0 {
			formatEnum = uint32(internalformat)
		}

		switch formatEnum {
		case GL_RGBA:
			// Direct copy - data is already RGBA
			if len(pixelData) >= w*h*4 {
				copy(img.Pix, pixelData[:w*h*4])
			}
		case GL_RGB:
			// Convert RGB to RGBA
			if len(pixelData) >= w*h*3 {
				for i := 0; i < w*h; i++ {
					img.Pix[i*4+0] = pixelData[i*3+0]
					img.Pix[i*4+1] = pixelData[i*3+1]
					img.Pix[i*4+2] = pixelData[i*3+2]
					img.Pix[i*4+3] = 255
				}
			}
		case GL_LUMINANCE:
			// Convert luminance to RGBA (grayscale)
			if len(pixelData) >= w*h {
				for i := 0; i < w*h; i++ {
					v := pixelData[i]
					img.Pix[i*4+0] = v
					img.Pix[i*4+1] = v
					img.Pix[i*4+2] = v
					img.Pix[i*4+3] = 255
				}
			}
		case GL_ALPHA:
			// Convert alpha to RGBA (white with varying alpha)
			if len(pixelData) >= w*h {
				for i := 0; i < w*h; i++ {
					img.Pix[i*4+0] = 255
					img.Pix[i*4+1] = 255
					img.Pix[i*4+2] = 255
					img.Pix[i*4+3] = pixelData[i]
				}
			}
		case GL_RG:
			// Convert RG to RGBA, handling HalfFloat type for dfgLUT BRDF lookup textures
			typeVal := uint32(toFloat32(args["type"]))
			if typeVal == GL_HALF_FLOAT && len(pixelData) >= w*h*4 {
				// Half-float RG: 2 bytes per component, 2 components = 4 bytes per pixel
				for i := 0; i < w*h; i++ {
					offset := i * 4
					r := halfToFloat(uint16(pixelData[offset]) | uint16(pixelData[offset+1])<<8)
					g := halfToFloat(uint16(pixelData[offset+2]) | uint16(pixelData[offset+3])<<8)
					img.Pix[i*4+0] = clampByte(r)
					img.Pix[i*4+1] = clampByte(g)
					img.Pix[i*4+2] = 0
					img.Pix[i*4+3] = 255
				}
				log.Printf("[GL] texImage2D: converted RG16F %dx%d half-float texture to RGBA8", w, h)
			} else if len(pixelData) >= w*h*2 {
				// Uint8 RG: 1 byte per component
				for i := 0; i < w*h; i++ {
					img.Pix[i*4+0] = pixelData[i*2+0]
					img.Pix[i*4+1] = pixelData[i*2+1]
					img.Pix[i*4+2] = 0
					img.Pix[i*4+3] = 255
				}
			}
		case GL_RED:
			// Convert Red channel (1 byte/pixel) to RGBA grayscale
			if len(pixelData) >= w*h {
				for i := 0; i < w*h; i++ {
					v := pixelData[i]
					img.Pix[i*4+0] = v
					img.Pix[i*4+1] = v
					img.Pix[i*4+2] = v
					img.Pix[i*4+3] = 255
				}
			}
		default:
			log.Printf("[GL] texImage2D: unknown format %d, treating as RGBA", formatEnum)
			if len(pixelData) >= w*h*4 {
				copy(img.Pix, pixelData[:w*h*4])
			}
		}
	}

	// Store the image in the texture
	texture.image = img
	// log.Printf("[GL] texImage2D: stored %dx%d texture in id=%d (unit=%d)", w, h, textureId, canvas.activeTextureUnit)

	// Link sampler uniforms to this texture
	// This handles the case where uniform1i is called before the texture is uploaded
	for samplerName, unit := range canvas.samplerUniforms {
		if canvas.boundTextures[unit] == textureId {
			// This sampler uses the texture we just uploaded
			canvas.ShaderObject.SetTextureUniform(samplerName, img)
			log.Printf("[GL] texImage2D: linked sampler %s to texture %d (%dx%d)",
				samplerName, textureId, w, h)
		}
	}

	return nil
}

func (b *Bridge) glTexSubImage2D(canvas *GLCanvas, args map[string]interface{}) error {
	xoffset := int(toFloat32(args["xoffset"]))
	yoffset := int(toFloat32(args["yoffset"]))
	w := int(toFloat32(args["width"]))
	h := int(toFloat32(args["height"]))
	format := toFloat32(args["format"])
	pixelsStr, hasPixels := args["pixels"].(string)

	// Get the currently bound texture
	if canvas.boundTextures == nil {
		return nil
	}
	textureId := canvas.boundTextures[canvas.activeTextureUnit]
	if textureId == 0 {
		return nil
	}

	texture, exists := canvas.textures[textureId]
	if !exists || texture.image == nil {
		return nil
	}

	// Cast to *image.RGBA
	rgba, ok := texture.image.(*image.RGBA)
	if !ok {
		return nil
	}

	if !hasPixels || pixelsStr == "" {
		return nil
	}

	// Decode base64 pixel data
	pixelData, err := base64.StdEncoding.DecodeString(pixelsStr)
	if err != nil {
		log.Printf("[GL] texSubImage2D: failed to decode pixel data: %v", err)
		return nil
	}

	// GL format constants
	const (
		GL_RED  = 0x1903
		GL_RGB  = 6407
		GL_RGBA = 6408
	)

	// Copy pixel data to sub-region
	formatEnum := uint32(format)
	stride := rgba.Stride
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			dstIdx := (yoffset+y)*stride + (xoffset+x)*4
			if formatEnum == GL_RGBA {
				srcIdx := (y*w + x) * 4
				if srcIdx+3 < len(pixelData) && dstIdx+3 < len(rgba.Pix) {
					rgba.Pix[dstIdx] = pixelData[srcIdx]
					rgba.Pix[dstIdx+1] = pixelData[srcIdx+1]
					rgba.Pix[dstIdx+2] = pixelData[srcIdx+2]
					rgba.Pix[dstIdx+3] = pixelData[srcIdx+3]
				}
			} else if formatEnum == GL_RGB {
				srcIdx := (y*w + x) * 3
				if srcIdx+2 < len(pixelData) && dstIdx+3 < len(rgba.Pix) {
					rgba.Pix[dstIdx] = pixelData[srcIdx]
					rgba.Pix[dstIdx+1] = pixelData[srcIdx+1]
					rgba.Pix[dstIdx+2] = pixelData[srcIdx+2]
					rgba.Pix[dstIdx+3] = 255
				}
			} else if formatEnum == GL_RED {
				srcIdx := y*w + x
				if srcIdx < len(pixelData) && dstIdx+3 < len(rgba.Pix) {
					v := pixelData[srcIdx]
					rgba.Pix[dstIdx] = v
					rgba.Pix[dstIdx+1] = v
					rgba.Pix[dstIdx+2] = v
					rgba.Pix[dstIdx+3] = 255
				}
			}
		}
	}

	log.Printf("[GL] texSubImage2D: updated %dx%d region at (%d,%d) in texture %d", w, h, xoffset, yoffset, textureId)

	// Store CPU image by JS texture ID for on-demand GPU upload in the painter.
	// This is needed because texStorage2D creates empty GPU textures, and when Three.js
	// binds different textures per draw call, the painter needs to upload the correct
	// pixel data to each GPU texture on first use.
	canvas.ShaderObject.SetCPUTexImage(int(textureId), rgba)

	// Check if any sampler uniform uses this texture's unit and set the texture
	// This handles the case where uniform1i is called before the texture is uploaded
	for samplerName, unit := range canvas.samplerUniforms {
		if canvas.boundTextures[unit] == textureId {
			// This sampler uses the texture we just updated
			if texture, exists := canvas.textures[textureId]; exists && texture.image != nil {
				canvas.ShaderObject.SetTextureUniform(samplerName, texture.image)
				// Record JS texture ID → sampler mapping so the painter can populate
				// gpuTexCache with the Phase 2.1 uploaded texture (overwriting the empty
				// GPU texture created by texImage2D_gpu/texStorage2D)
				canvas.ShaderObject.SetJSTexForSampler(samplerName, int(textureId))
				log.Printf("[GL] texSubImage2D: linked sampler %s to texture %d (%dx%d)",
					samplerName, textureId, texture.image.Bounds().Dx(), texture.image.Bounds().Dy())
			}
		}
	}

	return nil
}

func (b *Bridge) glTexStorage2D(canvas *GLCanvas, args map[string]interface{}) error {
	// texStorage2D allocates immutable texture storage
	w := int(toFloat32(args["width"]))
	h := int(toFloat32(args["height"]))
	internalformat := uint32(toFloat32(args["internalformat"]))

	// Get the currently bound texture
	if canvas.boundTextures == nil {
		return nil
	}
	textureId := canvas.boundTextures[canvas.activeTextureUnit]
	if textureId == 0 {
		return nil
	}

	// Determine if this is a depth texture (GPU-only, no CPU-side image)
	// Common depth internal formats: DEPTH_COMPONENT16 (0x81A5), DEPTH_COMPONENT24 (0x81A6),
	// DEPTH_COMPONENT32F (0x8CAC), DEPTH24_STENCIL8 (0x88F0), DEPTH32F_STENCIL8 (0x8CAD)
	isDepthFormat := internalformat == 0x81A5 || internalformat == 0x81A6 ||
		internalformat == 0x8CAC || internalformat == 0x88F0 || internalformat == 0x8CAD ||
		internalformat == 0x1902 // DEPTH_COMPONENT

	// Queue GPU-only texture allocation for depth textures and other non-standard formats
	// Also queue for regular textures since texStorage2D creates immutable storage
	// that may be used as FBO attachment
	target := uint32(toFloat32(args["target"]))

	// Determine format and type from internal format for the GPU allocation
	var format, typ uint32
	if isDepthFormat {
		format = 0x1902 // DEPTH_COMPONENT
		typ = 0x1405    // UNSIGNED_INT
	} else {
		switch internalformat {
		case 0x8229: // GL_R8
			format = 0x1903 // GL_RED
			typ = 0x1401    // UNSIGNED_BYTE
		case 0x822A: // GL_RG8
			format = 0x8227 // GL_RG
			typ = 0x1401    // UNSIGNED_BYTE
		case 0x8051: // GL_RGB8
			format = 0x1907 // GL_RGB
			typ = 0x1401    // UNSIGNED_BYTE
		default: // GL_RGBA8 and others
			format = 0x1908 // GL_RGBA
			typ = 0x1401    // UNSIGNED_BYTE
		}
	}

	// Store format info so the painter can upload with the correct format
	canvas.ShaderObject.SetGPUTexFormat(int(textureId), canvasPkg.GPUTextureFormat{
		Internalformat: internalformat,
		Format:         format,
		Type:           typ,
	})

	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type: "texImage2D_gpu",
		Name: fmt.Sprintf("%d", textureId),
		Value: canvasPkg.TexImage2DGPUParams{
			Target:         target,
			Level:          0,
			Internalformat: internalformat,
			Width:          w,
			Height:         h,
			Format:         format,
			Type:           typ,
		},
	})
	log.Printf("[GL] texStorage2D: GPU texture %d (%dx%d, internalformat=0x%x)", textureId, w, h, internalformat)

	// Also keep the CPU-side image for texSubImage2D updates (if not depth)
	if !isDepthFormat {
		texture, exists := canvas.textures[textureId]
		if exists {
			texture.image = image.NewRGBA(image.Rect(0, 0, w, h))
		}
	}
	return nil
}

// ═══════════════════════════════════════════════════════════════
// State Operations
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glEnable(canvas *GLCanvas, args map[string]interface{}) error {
	capVal, ok := args["cap"]
	if !ok {
		return nil
	}
	cap := uint32(toFloat64(capVal))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "enable",
		Value: cap,
	})
	return nil
}

func (b *Bridge) glDisable(canvas *GLCanvas, args map[string]interface{}) error {
	capVal, ok := args["cap"]
	if !ok {
		return nil
	}
	cap := uint32(toFloat64(capVal))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "disable",
		Value: cap,
	})
	return nil
}

func (b *Bridge) glCullFace(canvas *GLCanvas, args map[string]interface{}) error {
	modeVal, ok := args["mode"]
	if !ok {
		return nil
	}
	mode := uint32(toFloat64(modeVal))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "cullFace",
		Value: mode,
	})
	return nil
}

func (b *Bridge) glBlendFunc(canvas *GLCanvas, args map[string]interface{}) error {
	sfactorVal, ok := args["sfactor"]
	if !ok {
		return nil
	}
	dfactorVal, ok := args["dfactor"]
	if !ok {
		return nil
	}
	sfactor := uint32(toFloat64(sfactorVal))
	dfactor := uint32(toFloat64(dfactorVal))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "blendFunc",
		Value: [2]uint32{sfactor, dfactor},
	})
	return nil
}

func (b *Bridge) glBlendFuncSeparate(canvas *GLCanvas, args map[string]interface{}) error {
	srcRGB := uint32(toFloat64(args["srcRGB"]))
	dstRGB := uint32(toFloat64(args["dstRGB"]))
	srcAlpha := uint32(toFloat64(args["srcAlpha"]))
	dstAlpha := uint32(toFloat64(args["dstAlpha"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "blendFuncSeparate",
		Value: [4]uint32{srcRGB, dstRGB, srcAlpha, dstAlpha},
	})
	return nil
}

func (b *Bridge) glBlendEquation(canvas *GLCanvas, args map[string]interface{}) error {
	mode := uint32(toFloat64(args["mode"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "blendEquation",
		Value: mode,
	})
	return nil
}

func (b *Bridge) glBlendEquationSeparate(canvas *GLCanvas, args map[string]interface{}) error {
	modeRGB := uint32(toFloat64(args["modeRGB"]))
	modeAlpha := uint32(toFloat64(args["modeAlpha"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "blendEquationSeparate",
		Value: [2]uint32{modeRGB, modeAlpha},
	})
	return nil
}

func (b *Bridge) glBlendColor(canvas *GLCanvas, args map[string]interface{}) error {
	r := float32(toFloat64(args["red"]))
	g := float32(toFloat64(args["green"]))
	b2 := float32(toFloat64(args["blue"]))
	a := float32(toFloat64(args["alpha"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "blendColor",
		Value: [4]float32{r, g, b2, a},
	})
	return nil
}

func (b *Bridge) glPolygonOffset(canvas *GLCanvas, args map[string]interface{}) error {
	factor := float32(toFloat64(args["factor"]))
	units := float32(toFloat64(args["units"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "polygonOffset",
		Value: [2]float32{factor, units},
	})
	return nil
}

func (b *Bridge) glLineWidth(canvas *GLCanvas, args map[string]interface{}) error {
	width := float32(toFloat64(args["width"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "lineWidth",
		Value: width,
	})
	return nil
}

func (b *Bridge) glScissor(canvas *GLCanvas, args map[string]interface{}) error {
	x := int32(toFloat64(args["x"]))
	y := int32(toFloat64(args["y"]))
	w := int32(toFloat64(args["width"]))
	h := int32(toFloat64(args["height"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "scissor",
		Value: [4]int32{x, y, w, h},
	})
	return nil
}

func (b *Bridge) glClear(canvas *GLCanvas, args map[string]interface{}) error {
	mask := uint32(toFloat64(args["mask"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "clear",
		Value: mask,
	})
	return nil
}

func (b *Bridge) glClearColor(canvas *GLCanvas, args map[string]interface{}) error {
	r := float32(toFloat64(args["red"]))
	g := float32(toFloat64(args["green"]))
	blue := float32(toFloat64(args["blue"]))
	a := float32(toFloat64(args["alpha"]))
	canvas.ShaderObject.SetClearColor(r, g, blue, a)
	// Also queue as render command so it's applied in order with other GL state
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "clearColor",
		Value: [4]float32{r, g, blue, a},
	})
	return nil
}

func (b *Bridge) glViewport(canvas *GLCanvas, args map[string]interface{}) error {
	x := int(toFloat64(args["x"]))
	y := int(toFloat64(args["y"]))
	w := int(toFloat64(args["width"]))
	h := int(toFloat64(args["height"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "viewport",
		Value: canvasPkg.ViewportParams{X: x, Y: y, Width: w, Height: h},
	})
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Drawing Operations
// ═══════════════════════════════════════════════════════════════

// pushAttribBuffersToShader updates the shader's attribute buffers from the current
// attribBindings state. Called before QueueDrawArrays so the geometry snapshot
// captures the correct buffers for each draw call (needed for multi-geometry scenes).
func (b *Bridge) pushAttribBuffersToShader(canvas *GLCanvas) {
	for location, binding := range canvas.attribBindings {
		attrName, hasName := canvas.attribLocations[location]
		if !hasName {
			switch location {
			case 0:
				attrName = "position"
			case 1:
				attrName = "normal"
			case 2:
				attrName = "uv"
			default:
				attrName = fmt.Sprintf("attr_%d", location)
			}
		}
		buffer, exists := canvas.buffers[binding.bufferId]
		if !exists || len(buffer.data) == 0 {
			continue
		}
		canvas.ShaderObject.SetAttributeBuffer(attrName, buffer.data, binding.size, binding.stride, binding.offset)
	}
}

func (b *Bridge) glDrawArrays(canvas *GLCanvas, args map[string]interface{}) error {
	// Queue the draw call to be executed in order with uniforms
	mode := uint32(toFloat64(args["mode"]))
	first := int(toFloat64(args["first"]))
	count := int(toFloat64(args["count"]))
	// Push current attribute buffers to shader before snapshotting
	// so QueueDrawArrays captures the correct geometry for THIS draw call
	b.pushAttribBuffersToShader(canvas)
	canvas.ShaderObject.QueueDrawArrays(mode, first, count)
	return nil
}

func (b *Bridge) glDrawElements(canvas *GLCanvas, args map[string]interface{}) error {
	// Queue the draw call to be executed in order with uniforms
	mode := uint32(toFloat64(args["mode"]))
	count := int(toFloat64(args["count"]))
	offset := int(toFloat64(args["offset"]))
	// Push current attribute buffers and indices to shader before snapshotting
	// so QueueDrawElements captures the correct geometry for THIS draw call
	b.pushAttribBuffersToShader(canvas)
	if len(canvas.indexData) > 0 {
		canvas.ShaderObject.SetIndicesNoRefresh(canvas.indexData)
	}
	canvas.ShaderObject.QueueDrawElements(mode, count, offset)
	return nil
}

func (b *Bridge) glDrawArraysInstanced(canvas *GLCanvas, args map[string]interface{}) error {
	mode := uint32(toFloat64(args["mode"]))
	first := int(toFloat64(args["first"]))
	count := int(toFloat64(args["count"]))
	instanceCount := int(toFloat64(args["instancecount"]))
	// log.Printf("[GL] drawArraysInstanced: mode=%d first=%d count=%d instances=%d", mode, first, count, instanceCount)
	b.pushAttribBuffersToShader(canvas)
	canvas.ShaderObject.QueueDrawArraysInstanced(mode, first, count, instanceCount)
	return nil
}

func (b *Bridge) glDrawElementsInstanced(canvas *GLCanvas, args map[string]interface{}) error {
	mode := uint32(toFloat64(args["mode"]))
	count := int(toFloat64(args["count"]))
	offset := int(toFloat64(args["offset"]))
	instanceCount := int(toFloat64(args["instancecount"]))
	// log.Printf("[GL] drawElementsInstanced: mode=%d count=%d offset=%d instances=%d", mode, count, offset, instanceCount)
	b.pushAttribBuffersToShader(canvas)
	if len(canvas.indexData) > 0 {
		canvas.ShaderObject.SetIndicesNoRefresh(canvas.indexData)
	}
	canvas.ShaderObject.QueueDrawElementsInstanced(mode, count, offset, instanceCount)
	return nil
}

func (b *Bridge) glVertexAttribDivisor(canvas *GLCanvas, args map[string]interface{}) error {
	index := int32(toFloat64(args["index"]))
	divisor := uint32(toFloat64(args["divisor"]))

	// Find attribute name for this location (may be a mat4 sub-column)
	attrName := ""
	if name, ok := canvas.attribLocations[index]; ok {
		attrName = name
	} else {
		// Check if this is a mat4 sub-column (base location has the name)
		for offset := int32(1); offset <= 3; offset++ {
			if name, ok := canvas.attribLocations[index-offset]; ok {
				attrName = name
				break
			}
		}
	}
	if attrName == "" {
		attrName = fmt.Sprintf("attr_%d", index)
	}

	// Store divisor by attribute name (painter looks up by name, not JS location)
	canvas.ShaderObject.SetAttribDivisor(attrName, divisor)
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Stencil Operations
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glStencilFunc(canvas *GLCanvas, args map[string]interface{}) error {
	fn := uint32(toFloat64(args["func"]))
	ref := uint32(toFloat64(args["ref"]))
	mask := uint32(toFloat64(args["mask"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "stencilFunc",
		Value: [3]uint32{fn, ref, mask},
	})
	return nil
}

func (b *Bridge) glStencilOp(canvas *GLCanvas, args map[string]interface{}) error {
	sfail := uint32(toFloat64(args["fail"]))
	dpfail := uint32(toFloat64(args["zfail"]))
	dppass := uint32(toFloat64(args["zpass"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "stencilOp",
		Value: [3]uint32{sfail, dpfail, dppass},
	})
	return nil
}

func (b *Bridge) glStencilMask(canvas *GLCanvas, args map[string]interface{}) error {
	mask := uint32(toFloat64(args["mask"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "stencilMask",
		Value: mask,
	})
	return nil
}

func (b *Bridge) glStencilFuncSeparate(canvas *GLCanvas, args map[string]interface{}) error {
	face := uint32(toFloat64(args["face"]))
	fn := uint32(toFloat64(args["func"]))
	ref := uint32(toFloat64(args["ref"]))
	mask := uint32(toFloat64(args["mask"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "stencilFuncSeparate",
		Value: [4]uint32{face, fn, ref, mask},
	})
	return nil
}

func (b *Bridge) glStencilOpSeparate(canvas *GLCanvas, args map[string]interface{}) error {
	face := uint32(toFloat64(args["face"]))
	sfail := uint32(toFloat64(args["sfail"]))
	dpfail := uint32(toFloat64(args["dpfail"]))
	dppass := uint32(toFloat64(args["dppass"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "stencilOpSeparate",
		Value: [4]uint32{face, sfail, dpfail, dppass},
	})
	return nil
}

func (b *Bridge) glStencilMaskSeparate(canvas *GLCanvas, args map[string]interface{}) error {
	face := uint32(toFloat64(args["face"]))
	mask := uint32(toFloat64(args["mask"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "stencilMaskSeparate",
		Value: [2]uint32{face, mask},
	})
	return nil
}

func (b *Bridge) glClearStencil(canvas *GLCanvas, args map[string]interface{}) error {
	s := int32(toFloat64(args["s"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "clearStencil",
		Value: s,
	})
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Framebuffer Operations
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glCreateFramebuffer(canvas *GLCanvas, args map[string]interface{}) error {
	fbIdVal, ok := args["framebufferId"]
	if !ok {
		return fmt.Errorf("missing framebufferId")
	}
	fbId := int(toFloat64(fbIdVal))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type: "createFramebuffer",
		Name: fmt.Sprintf("%d", fbId),
	})
	return nil
}

func (b *Bridge) glDeleteFramebuffer(canvas *GLCanvas, args map[string]interface{}) error {
	fbIdVal, ok := args["framebufferId"]
	if !ok {
		return fmt.Errorf("missing framebufferId")
	}
	fbId := int(toFloat64(fbIdVal))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type: "deleteFramebuffer",
		Name: fmt.Sprintf("%d", fbId),
	})
	return nil
}

func (b *Bridge) glBindFramebuffer(canvas *GLCanvas, args map[string]interface{}) error {
	targetVal, ok := args["target"]
	if !ok {
		return fmt.Errorf("missing target")
	}
	target := uint32(toFloat64(targetVal))
	fbId := 0
	if fbIdVal, ok := args["framebufferId"]; ok {
		fbId = int(toFloat64(fbIdVal))
	}
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type: "bindFramebuffer",
		Value: canvasPkg.BindFramebufferParams{
			Target:        target,
			FramebufferId: fbId,
		},
	})
	return nil
}

func (b *Bridge) glFramebufferTexture2D(canvas *GLCanvas, args map[string]interface{}) error {
	target := uint32(toFloat64(args["target"]))
	attachment := uint32(toFloat64(args["attachment"]))
	textarget := uint32(toFloat64(args["textarget"]))
	textureId := int(toFloat64(args["textureId"]))
	level := int(toFloat64(args["level"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type: "framebufferTexture2D",
		Value: canvasPkg.FramebufferTexture2DParams{
			Target:     target,
			Attachment: attachment,
			Textarget:  textarget,
			TextureId:  textureId,
			Level:      level,
		},
	})
	return nil
}

func (b *Bridge) glFramebufferRenderbuffer(canvas *GLCanvas, args map[string]interface{}) error {
	target := uint32(toFloat64(args["target"]))
	attachment := uint32(toFloat64(args["attachment"]))
	rbtarget := uint32(toFloat64(args["renderbuffertarget"]))
	rbId := int(toFloat64(args["renderbufferId"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type: "framebufferRenderbuffer",
		Value: canvasPkg.FramebufferRenderbufferParams{
			Target:             target,
			Attachment:         attachment,
			RenderbufferTarget: rbtarget,
			RenderbufferId:     rbId,
		},
	})
	return nil
}

func (b *Bridge) glCreateRenderbuffer(canvas *GLCanvas, args map[string]interface{}) error {
	rbIdVal, ok := args["renderbufferId"]
	if !ok {
		return fmt.Errorf("missing renderbufferId")
	}
	rbId := int(toFloat64(rbIdVal))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type: "createRenderbuffer",
		Name: fmt.Sprintf("%d", rbId),
	})
	return nil
}

func (b *Bridge) glDeleteRenderbuffer(canvas *GLCanvas, args map[string]interface{}) error {
	rbIdVal, ok := args["renderbufferId"]
	if !ok {
		return fmt.Errorf("missing renderbufferId")
	}
	rbId := int(toFloat64(rbIdVal))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type: "deleteRenderbuffer",
		Name: fmt.Sprintf("%d", rbId),
	})
	return nil
}

func (b *Bridge) glBindRenderbuffer(canvas *GLCanvas, args map[string]interface{}) error {
	target := uint32(toFloat64(args["target"]))
	rbId := 0
	if rbIdVal, ok := args["renderbufferId"]; ok {
		rbId = int(toFloat64(rbIdVal))
	}
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type: "bindRenderbuffer",
		Value: canvasPkg.BindFramebufferParams{
			Target:        target,
			FramebufferId: rbId, // Reuse same param type, field holds RBO id
		},
	})
	return nil
}

func (b *Bridge) glRenderbufferStorage(canvas *GLCanvas, args map[string]interface{}) error {
	target := uint32(toFloat64(args["target"]))
	internalformat := uint32(toFloat64(args["internalformat"]))
	w := int(toFloat64(args["width"]))
	h := int(toFloat64(args["height"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type: "renderbufferStorage",
		Value: canvasPkg.RenderbufferStorageParams{
			Target:         target,
			Internalformat: internalformat,
			Width:          w,
			Height:         h,
		},
	})
	return nil
}

func (b *Bridge) glColorMask(canvas *GLCanvas, args map[string]interface{}) error {
	r, _ := args["red"].(bool)
	g, _ := args["green"].(bool)
	blue, _ := args["blue"].(bool)
	a, _ := args["alpha"].(bool)
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type: "colorMask",
		Value: canvasPkg.ColorMaskParams{R: r, G: g, B: blue, A: a},
	})
	return nil
}

func (b *Bridge) glClearDepth(canvas *GLCanvas, args map[string]interface{}) error {
	depth := float32(toFloat64(args["depth"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type: "clearDepth",
		Value: canvasPkg.ClearDepthParams{Depth: depth},
	})
	return nil
}

func (b *Bridge) glDrawBuffers(canvas *GLCanvas, args map[string]interface{}) error {
	bufsRaw, ok := args["buffers"].([]interface{})
	if !ok {
		return nil
	}
	bufs := make([]uint32, len(bufsRaw))
	for i, v := range bufsRaw {
		bufs[i] = uint32(toFloat64(v))
	}
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type: "drawBuffers",
		Value: canvasPkg.DrawBuffersParams{Buffers: bufs},
	})
	return nil
}

func (b *Bridge) glDepthFunc(canvas *GLCanvas, args map[string]interface{}) error {
	funcVal, ok := args["func"]
	if !ok {
		return nil
	}
	fn := uint32(toFloat64(funcVal))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "depthFunc",
		Value: fn,
	})
	return nil
}

func (b *Bridge) glDepthMask(canvas *GLCanvas, args map[string]interface{}) error {
	flagVal, ok := args["flag"]
	if !ok {
		return nil
	}
	flag, _ := flagVal.(bool)
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "depthMask",
		Value: flag,
	})
	return nil
}

func (b *Bridge) glFrontFace(canvas *GLCanvas, args map[string]interface{}) error {
	modeVal, ok := args["mode"]
	if !ok {
		return nil
	}
	mode := uint32(toFloat64(modeVal))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type:  "frontFace",
		Value: mode,
	})
	return nil
}

func (b *Bridge) glTexParameteri(canvas *GLCanvas, args map[string]interface{}) error {
	target := uint32(toFloat64(args["target"]))
	pname := uint32(toFloat64(args["pname"]))
	param := int32(toFloat64(args["param"]))
	canvas.ShaderObject.QueueRenderCommand(canvasPkg.RenderCommand{
		Type: "texParameteri",
		Value: canvasPkg.TexParameteriParams{
			Target: target,
			Pname:  pname,
			Param:  param,
		},
	})
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

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

// writeShaderDebugFile writes shader source to a file for debugging
func writeShaderDebugFile(filename, content string) error {
	return os.WriteFile(filename, []byte(content), 0644)
}

// fyneButtonToDOM converts Fyne mouse button constants (bitmask: 1=primary, 2=secondary, 4=tertiary)
// to DOM MouseEvent.button values (0=left, 1=middle, 2=right)
func fyneButtonToDOM(fyneButton int) int {
	switch fyneButton {
	case 1: // MouseButtonPrimary
		return 0
	case 2: // MouseButtonSecondary
		return 2
	case 4: // MouseButtonTertiary
		return 1
	default:
		return 0
	}
}

// sendMouseEvent buffers a mouse event for the given canvas
// Events are accumulated and returned with the next executeBatch response
func (b *Bridge) sendMouseEvent(canvasID string, eventType string, x, y float32, button int) {
	canvas, exists := glCanvases[canvasID]
	if !exists {
		return
	}

	canvas.mouseEventMu.Lock()
	defer canvas.mouseEventMu.Unlock()

	// For mousemove, only keep the latest position (coalesce)
	if eventType == "mousemove" && len(canvas.pendingMouseEvents) > 0 {
		last := &canvas.pendingMouseEvents[len(canvas.pendingMouseEvents)-1]
		if last.Type == "mousemove" {
			// Update existing mousemove instead of adding new one
			last.X = x
			last.Y = y
			return
		}
	}

	canvas.pendingMouseEvents = append(canvas.pendingMouseEvents, MouseEvent{
		Type:   eventType,
		X:      x,
		Y:      y,
		Button: button,
	})
}

// drainMouseEvents returns and clears pending mouse events for a canvas
func drainMouseEvents(canvasID string) []MouseEvent {
	canvas, exists := glCanvases[canvasID]
	if !exists {
		return nil
	}

	canvas.mouseEventMu.Lock()
	defer canvas.mouseEventMu.Unlock()

	events := canvas.pendingMouseEvents
	canvas.pendingMouseEvents = nil
	return events
}

// hasPendingMouseEvents checks if there are buffered mouse events
func hasPendingMouseEvents(canvasID string) bool {
	canvas, exists := glCanvases[canvasID]
	if !exists {
		return false
	}

	canvas.mouseEventMu.Lock()
	defer canvas.mouseEventMu.Unlock()

	return len(canvas.pendingMouseEvents) > 0
}

// halfToFloat converts an IEEE 754 binary16 half-precision float to float32
func halfToFloat(h uint16) float32 {
	sign := uint32(h>>15) & 0x1
	exp := uint32(h>>10) & 0x1f
	mant := uint32(h) & 0x3ff

	if exp == 0 {
		if mant == 0 {
			// Zero
			return math.Float32frombits(sign << 31)
		}
		// Subnormal: normalize
		for mant&0x400 == 0 {
			mant <<= 1
			exp--
		}
		exp++
		mant &= 0x3ff
	} else if exp == 31 {
		// Inf / NaN
		return math.Float32frombits((sign << 31) | 0x7f800000 | (mant << 13))
	}

	exp = exp + (127 - 15) // rebias exponent
	return math.Float32frombits((sign << 31) | (exp << 23) | (mant << 13))
}

// clampByte converts a float32 [0,1] to a uint8 [0,255], clamped
func clampByte(f float32) uint8 {
	if f <= 0 {
		return 0
	}
	if f >= 1 {
		return 255
	}
	return uint8(f * 255)
}
