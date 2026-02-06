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

	// Attribute binding tracking (maps location → buffer/size at time of vertexAttribPointer)
	attribBindings map[int32]struct {
		bufferId uint32
		size     int
	}

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
	log.Println("[GL] handleCreateGLCanvas called")
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

	reqWindowID, _ := payload["windowId"].(string)
	log.Printf("[GL] Creating GL canvas %dx%d for window: %s", int(width), int(height), reqWindowID)

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
	glContainer := container.NewWithoutLayout(shaderContainer)
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
		attribBindings:  make(map[int32]struct{ bufferId uint32; size int }),
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

	log.Printf("[GL] Successfully created GL canvas %s, returning response", canvasID)
	return Response{
		Success: true,
		Result: map[string]interface{}{
			"canvasId": canvasID,
			"widgetId": canvasID, // Can be used to reference this widget in Fyne containers
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
	// log.Printf("[GL] Processing %d attrib bindings, %d buffers", len(canvas.attribBindings), len(canvas.buffers))

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
			canvas.ShaderObject.SetAttributeBuffer(attrName, buffer.data, binding.size)
			// Per-attribute logging disabled for performance
			// log.Printf("[GL] Set attribute buffer %s: %d floats, size=%d (buffer %d, loc %d)",
			//	attrName, len(buffer.data), binding.size, binding.bufferId, location)
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
	// Per-command logging disabled for performance (was causing stutter)
	// log.Printf("[GL] Executing command: %s", cmd)

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
	case "texParameteri", "texParameterf":
		return nil // Handled by painter

	// State operations
	case "clear":
		return b.glClear(canvas, args)
	case "clearColor":
		return b.glClearColor(canvas, args)
	case "clearDepth", "clearStencil":
		return nil // Depth/stencil clear - handled by painter
	case "colorMask":
		return nil // Color mask state - handled implicitly
	case "viewport":
		return b.glViewport(canvas, args)
	case "enable":
		return b.glEnable(canvas, args)
	case "disable":
		return b.glDisable(canvas, args)
	case "depthFunc", "depthMask", "depthRange":
		return nil // Depth operations - handled by painter
	case "stencilFunc", "stencilOp", "stencilMask":
		return nil // Stencil operations - handled by painter
	case "frontFace":
		return nil // Front face - handled by painter
	case "cullFace":
		return b.glCullFace(canvas, args)
	case "blendFunc":
		return b.glBlendFunc(canvas, args)
	case "blendFuncSeparate", "blendEquation", "blendEquationSeparate", "blendColor":
		return nil // Advanced blending - handled by painter
	case "polygonOffset", "lineWidth":
		return nil // Polygon/line state - handled by painter
	case "pixelStorei":
		return nil // Pixel storage - handled by painter
	case "hint":
		return nil // Hints - ignored

	// Drawing operations
	case "drawArrays":
		return b.glDrawArrays(canvas, args)
	case "drawElements":
		return b.glDrawElements(canvas, args)
	case "drawArraysInstanced", "drawElementsInstanced":
		return nil // Instanced drawing - handled by painter

	// Vertex attributes
	case "enableVertexAttribArray", "disableVertexAttribArray":
		return nil // Handled by painter
	case "getAttribLocation":
		return b.glGetAttribLocation(canvas, args)
	case "vertexAttribPointer":
		return b.glVertexAttribPointer(canvas, args)
	case "vertexAttribDivisor":
		return nil // Handled by painter

	// Framebuffer operations
	case "createFramebuffer", "deleteFramebuffer", "bindFramebuffer":
		return nil // Framebuffer - handled by painter
	case "framebufferTexture2D", "framebufferRenderbuffer", "checkFramebufferStatus":
		return nil // Framebuffer attachments - handled by painter

	// Renderbuffer operations
	case "createRenderbuffer", "deleteRenderbuffer", "bindRenderbuffer", "renderbufferStorage":
		return nil // Renderbuffer - handled by painter

	// Vertex array operations
	case "createVertexArray", "deleteVertexArray", "bindVertexArray":
		return nil // VAO - handled by painter

	// 3D texture operations
	case "texImage3D", "texSubImage3D":
		return nil // 3D textures - handled by painter

	// Misc operations
	case "generateMipmap", "scissor", "readPixels":
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

		// Check for USE_COLOR in vertex shader
		if strings.Contains(program.vertexSrc, "#define USE_COLOR") {
			log.Printf("[GL-DEBUG] Program %d: HAS USE_COLOR defined in vertex shader", programId)
		} else if strings.Contains(program.vertexSrc, "USE_COLOR") {
			log.Printf("[GL-DEBUG] Program %d: Uses USE_COLOR but NOT defined (conditional will be false)", programId)
		}
	}

	// Convert and store fragment shader source if available
	if program.fragSrc != "" {
		// Convert GLSL 300 ES to target language
		program.convertedFragSrc = ConvertFragmentShader(program.fragSrc, ShaderGLSL110)

		// Write shader to tmp file for debugging
		_ = writeShaderDebugFile(fmt.Sprintf("/tmp/fragment_shader_%d.glsl", programId), program.fragSrc)
		_ = writeShaderDebugFile(fmt.Sprintf("/tmp/fragment_shader_%d_converted.glsl", programId), program.convertedFragSrc)

		// Check for light defines in the original shader
		hasLightDefines := false
		lines := strings.Split(program.fragSrc, "\n")
		for _, line := range lines {
			if strings.Contains(line, "NUM_DIR_LIGHTS") ||
				strings.Contains(line, "NUM_POINT_LIGHTS") ||
				strings.Contains(line, "NUM_SPOT_LIGHTS") ||
				strings.Contains(line, "DirectionalLight") {
				log.Printf("[GL-DEBUG] Light line: %s", line)
				hasLightDefines = true
			}
		}
		if !hasLightDefines {
			log.Printf("[GL-DEBUG] WARNING: No NUM_DIR_LIGHTS/NUM_POINT_LIGHTS/NUM_SPOT_LIGHTS defines found in shader!")
		}

		log.Printf("[GL-DEBUG] Program %d: Fragment shader CONVERTED (%d bytes)", programId, len(program.convertedFragSrc))
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
		// Update the shader object's sources only if they changed
		if vertSrc != "" && vertSrc != canvas.ShaderObject.VertexSource {
			canvas.ShaderObject.SetVertexSource(vertSrc)
		}
		if fragSrc != "" && fragSrc != canvas.ShaderObject.FragmentSource {
			canvas.ShaderObject.SetSource(fragSrc)
		}
		// Queue useProgram render command only when switching between two real programs
		// (prevProgram > 0 means we're switching FROM an actual program, not from initial state)
		// The initial program is compiled at the top of drawShader; we only need useProgram
		// for mid-frame program switches in multi-material scenes
		if prevProgram > 0 && prevProgram != programId {
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

	// Store the binding: which buffer is bound to this attribute location
	if canvas.currentBuffer > 0 {
		canvas.attribBindings[location] = struct {
			bufferId uint32
			size     int
		}{canvas.currentBuffer, size}
		// log.Printf("[GL] vertexAttribPointer: bound location %d -> buffer %d, size %d", location, canvas.currentBuffer, size)
	}
	// else {
	//	log.Printf("[GL] vertexAttribPointer: no currentBuffer bound!")
	// }

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
		// log.Printf("[GL] bindBuffer: ELEMENT_ARRAY_BUFFER -> buffer %d", uint32(bufferId))
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

	if canvas.elementBuffer > 0 {
		// Index buffer - convert bytes to uint16
		// log.Printf("[GL] bufferData: elementBuffer=%d, data size=%d bytes", canvas.elementBuffer, len(data))
		if buffer, exists := canvas.buffers[canvas.elementBuffer]; exists {
			indexData := make([]uint16, len(data)/2)
			for i := 0; i < len(indexData); i++ {
				offset := i * 2
				indexData[i] = uint16(data[offset]) | (uint16(data[offset+1]) << 8)
			}
			buffer.indexData = indexData
			canvas.indexData = indexData
			canvas.indexDirty = true
			// log.Printf("[GL] bufferData: stored %d indices in canvas.indexData", len(indexData))
		}
		// else {
		//	log.Printf("[GL] WARNING: elementBuffer %d not found in canvas.buffers", canvas.elementBuffer)
		// }
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
	// Similar to bufferData but for partial updates
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

	// Set uniform based on type
	switch cmd {
	case "uniform1fv":
		if len(floats) >= 1 {
			canvas.ShaderObject.SetUniform(name, floats[0])
		}
	case "uniform2fv":
		if len(floats) >= 2 {
			canvas.ShaderObject.SetUniform(name, [2]float32{floats[0], floats[1]})
		}
	case "uniform3fv":
		if len(floats) >= 3 {
			canvas.ShaderObject.SetUniform(name, [3]float32{floats[0], floats[1], floats[2]})
		}
	case "uniform4fv":
		if len(floats) >= 4 {
			canvas.ShaderObject.SetUniform(name, [4]float32{floats[0], floats[1], floats[2], floats[3]})
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

	// Initialize boundTextures map if needed
	if canvas.boundTextures == nil {
		canvas.boundTextures = make(map[uint32]uint32)
	}

	// Bind texture to the active texture unit
	canvas.boundTextures[canvas.activeTextureUnit] = textureId
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

		// Interpret format (GL_RGBA = 6408, GL_RGB = 6407, GL_LUMINANCE = 6409, GL_ALPHA = 6406)
		const (
			GL_ALPHA     = 6406
			GL_RGB       = 6407
			GL_RGBA      = 6408
			GL_LUMINANCE = 6409
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
		default:
			log.Printf("[GL] texImage2D: unknown format %d, treating as RGBA", formatEnum)
			if len(pixelData) >= w*h*4 {
				copy(img.Pix, pixelData[:w*h*4])
			}
		}
	}

	// Store the image in the texture
	texture.image = img
	log.Printf("[GL] texImage2D: stored %dx%d texture in id=%d (unit=%d)", w, h, textureId, canvas.activeTextureUnit)

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
			}
		}
	}

	log.Printf("[GL] texSubImage2D: updated %dx%d region at (%d,%d) in texture %d", w, h, xoffset, yoffset, textureId)

	// Check if any sampler uniform uses this texture's unit and set the texture
	// This handles the case where uniform1i is called before the texture is uploaded
	for samplerName, unit := range canvas.samplerUniforms {
		if canvas.boundTextures[unit] == textureId {
			// This sampler uses the texture we just updated
			if texture, exists := canvas.textures[textureId]; exists && texture.image != nil {
				canvas.ShaderObject.SetTextureUniform(samplerName, texture.image)
				log.Printf("[GL] texSubImage2D: linked sampler %s to texture %d (%dx%d)",
					samplerName, textureId, texture.image.Bounds().Dx(), texture.image.Bounds().Dy())
			}
		}
	}
	return nil
}

func (b *Bridge) glTexStorage2D(canvas *GLCanvas, args map[string]interface{}) error {
	// texStorage2D allocates immutable texture storage
	// We pre-allocate the image.RGBA so texSubImage2D can update it
	w := int(toFloat32(args["width"]))
	h := int(toFloat32(args["height"]))

	// Get the currently bound texture
	if canvas.boundTextures == nil {
		return nil
	}
	textureId := canvas.boundTextures[canvas.activeTextureUnit]
	if textureId == 0 {
		return nil
	}

	texture, exists := canvas.textures[textureId]
	if !exists {
		return nil
	}

	// Allocate the image
	texture.image = image.NewRGBA(image.Rect(0, 0, w, h))
	log.Printf("[GL] texStorage2D: allocated %dx%d texture in id=%d (unit=%d)", w, h, textureId, canvas.activeTextureUnit)
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

func (b *Bridge) glClear(canvas *GLCanvas, args map[string]interface{}) error {
	// Queue clear command
	canvas.ShaderObject.QueueClear()
	return nil
}

func (b *Bridge) glClearColor(canvas *GLCanvas, args map[string]interface{}) error {
	r := float32(toFloat64(args["red"]))
	g := float32(toFloat64(args["green"]))
	blue := float32(toFloat64(args["blue"]))
	a := float32(toFloat64(args["alpha"]))
	canvas.ShaderObject.SetClearColor(r, g, blue, a)
	return nil
}

func (b *Bridge) glViewport(canvas *GLCanvas, args map[string]interface{}) error {
	// Viewport is implicit in canvas size
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
		canvas.ShaderObject.SetAttributeBuffer(attrName, buffer.data, binding.size)
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
	canvas.ShaderObject.QueueDrawElements(mode, count, offset)
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
