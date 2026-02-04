package main

import (
	"encoding/base64"
	"fmt"
	"image"
	"log"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
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
	FyneCanvas   fyne.Canvas      // The Fyne canvas for rendering
	ShaderObject *canvas.Shader   // The underlying Fyne Shader primitive (set up by setup-fyne-fork.sh)
	Container    fyne.CanvasObject // Container to hold the shader in the widget hierarchy

	// GL object tracking (maps JS-side IDs to internal state)
	programs       map[uint32]*shaderProgram
	buffers        map[uint32]*shaderBuffer
	textures       map[uint32]*shaderTexture
	shaders        map[uint32]*shaderSource
	uniformLocs    map[uint32]*uniformInfo
	currentProgram uint32
	currentBuffer  uint32
	elementBuffer  uint32

	// Vertex data accumulation
	vertexData  []float32
	indexData   []uint16
	vertexDirty bool
	indexDirty  bool
}

// shaderProgram represents a compiled shader program
type shaderProgram struct {
	id        uint32
	vertexSrc string
	fragSrc   string
	linked    bool
}

// shaderBuffer represents vertex or index buffer data
type shaderBuffer struct {
	id        uint32
	target    uint32
	data      []float32
	indexData []uint16
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

	// Create a Fyne Shader canvas (provided by setup-fyne-fork.sh)
	// For now, we'll use a minimal fragment shader that clears to black
	minimalShader := `
void main() {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`

	shaderObject := canvas.NewShader(float32(width), float32(height), minimalShader)

	// Wrap the shader in a container so it can be added to Fyne widget hierarchies
	// The container will be added to the window's content
	glContainer := container.NewWithoutLayout(shaderObject)
	glContainer.Resize(fyne.NewSize(float32(width), float32(height)))

	glCanv := &GLCanvas{
		ID:           canvasID,
		Width:        int(width),
		Height:       int(height),
		ShaderObject: shaderObject,
		Container:    glContainer,
		programs:     make(map[uint32]*shaderProgram),
		buffers:      make(map[uint32]*shaderBuffer),
		textures:     make(map[uint32]*shaderTexture),
		shaders:      make(map[uint32]*shaderSource),
		uniformLocs:  make(map[uint32]*uniformInfo),
		vertexData:   make([]float32, 0),
		indexData:    make([]uint16, 0),
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

	// If we've accumulated vertex/index data, push it to the shader
	if canvas.vertexDirty && len(canvas.vertexData) > 0 {
		canvas.ShaderObject.SetVertices(canvas.vertexData, "pos3")
		canvas.vertexDirty = false
	}
	if canvas.indexDirty && len(canvas.indexData) > 0 {
		canvas.ShaderObject.SetIndices(canvas.indexData)
		canvas.indexDirty = false
	}

	// Refresh the shader to trigger rendering
	canvas.ShaderObject.Refresh()

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
	case "texParameteri", "texParameterf":
		return nil // Handled by painter

	// State operations
	case "clear":
		return b.glClear(canvas, args)
	case "clearColor":
		return b.glClearColor(canvas, args)
	case "viewport":
		return b.glViewport(canvas, args)
	case "enable", "disable":
		return nil // State operations handled implicitly

	// Drawing operations
	case "drawArrays":
		return b.glDrawArrays(canvas, args)
	case "drawElements":
		return b.glDrawElements(canvas, args)

	// Vertex attributes
	case "enableVertexAttribArray", "disableVertexAttribArray":
		return nil // Handled by painter
	case "vertexAttribPointer":
		return nil // Handled by painter

	default:
		return fmt.Errorf("unknown GL command: %s", cmd)
	}
}

// ═══════════════════════════════════════════════════════════════
// Shader & Program Operations
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glCreateShader(canvas *GLCanvas, args map[string]interface{}) error {
	shaderId, ok := args["shaderId"].(float64)
	if !ok {
		return fmt.Errorf("missing shaderId")
	}
	shaderType, ok := args["type"].(float64)
	if !ok {
		return fmt.Errorf("missing type")
	}

	canvas.shaders[uint32(shaderId)] = &shaderSource{
		id:  uint32(shaderId),
		typ: uint32(shaderType),
	}
	return nil
}

func (b *Bridge) glDeleteShader(canvas *GLCanvas, args map[string]interface{}) error {
	shaderId, ok := args["shaderId"].(float64)
	if !ok {
		return fmt.Errorf("missing shaderId")
	}
	delete(canvas.shaders, uint32(shaderId))
	return nil
}

func (b *Bridge) glShaderSource(canvas *GLCanvas, args map[string]interface{}) error {
	shaderId, ok := args["shaderId"].(float64)
	if !ok {
		return fmt.Errorf("missing shaderId")
	}
	source, ok := args["source"].(string)
	if !ok {
		return fmt.Errorf("missing source")
	}

	shader, exists := canvas.shaders[uint32(shaderId)]
	if !exists {
		return fmt.Errorf("shader not found: %d", uint32(shaderId))
	}

	shader.source = source
	return nil
}

func (b *Bridge) glCompileShader(canvas *GLCanvas, args map[string]interface{}) error {
	// Shaders are compiled when program is linked
	return nil
}

func (b *Bridge) glCreateProgram(canvas *GLCanvas, args map[string]interface{}) error {
	programId, ok := args["programId"].(float64)
	if !ok {
		return fmt.Errorf("missing programId")
	}

	canvas.programs[uint32(programId)] = &shaderProgram{
		id: uint32(programId),
	}
	return nil
}

func (b *Bridge) glDeleteProgram(canvas *GLCanvas, args map[string]interface{}) error {
	programId, ok := args["programId"].(float64)
	if !ok {
		return fmt.Errorf("missing programId")
	}
	delete(canvas.programs, uint32(programId))
	return nil
}

func (b *Bridge) glAttachShader(canvas *GLCanvas, args map[string]interface{}) error {
	programId, ok := args["programId"].(float64)
	if !ok {
		return fmt.Errorf("missing programId")
	}
	shaderId, ok := args["shaderId"].(float64)
	if !ok {
		return fmt.Errorf("missing shaderId")
	}

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
	programId, ok := args["programId"].(float64)
	if !ok {
		return fmt.Errorf("missing programId")
	}

	program, exists := canvas.programs[uint32(programId)]
	if !exists {
		return fmt.Errorf("program not found: %d", uint32(programId))
	}

	// Use the fragment shader source if available
	if program.fragSrc != "" {
		// Convert GLSL 300 ES to target language
		// For now, use GLSL 110 for desktop. Could detect platform here.
		convertedSource := ConvertShader(program.fragSrc, ShaderGLSL110)
		canvas.ShaderObject.SetSource(convertedSource)

		// Log any required extensions
		extensions := DetectRequiredExtensions(program.fragSrc)
		if len(extensions) > 0 {
			log.Printf("Shader requires extensions: %v", extensions)
		}
	}

	program.linked = true
	return nil
}

func (b *Bridge) glUseProgram(canvas *GLCanvas, args map[string]interface{}) error {
	programId, ok := args["programId"].(float64)
	if !ok {
		return fmt.Errorf("missing programId")
	}

	canvas.currentProgram = uint32(programId)
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Buffer Operations
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glCreateBuffer(canvas *GLCanvas, args map[string]interface{}) error {
	bufferId, ok := args["bufferId"].(float64)
	if !ok {
		return fmt.Errorf("missing bufferId")
	}

	canvas.buffers[uint32(bufferId)] = &shaderBuffer{
		id: uint32(bufferId),
	}
	return nil
}

func (b *Bridge) glDeleteBuffer(canvas *GLCanvas, args map[string]interface{}) error {
	bufferId, ok := args["bufferId"].(float64)
	if !ok {
		return fmt.Errorf("missing bufferId")
	}
	delete(canvas.buffers, uint32(bufferId))
	return nil
}

func (b *Bridge) glBindBuffer(canvas *GLCanvas, args map[string]interface{}) error {
	target, ok := args["target"].(float64)
	if !ok {
		return fmt.Errorf("missing target")
	}
	bufferId, ok := args["bufferId"].(float64)
	if !ok {
		return fmt.Errorf("missing bufferId")
	}

	if uint32(target) == 0x8893 { // ELEMENT_ARRAY_BUFFER
		canvas.elementBuffer = uint32(bufferId)
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

	// Convert bytes to float32 array for vertex data
	floatData := make([]float32, len(data)/4)
	for i := 0; i < len(floatData); i++ {
		// Simple byte interpretation - would need proper unpacking in production
		_ = floatData[i] // placeholder
	}

	if canvas.elementBuffer > 0 {
		// Index buffer
		if buffer, exists := canvas.buffers[canvas.elementBuffer]; exists {
			buffer.indexData = make([]uint16, len(data)/2)
			canvas.indexDirty = true
		}
	} else if canvas.currentBuffer > 0 {
		// Vertex buffer
		if buffer, exists := canvas.buffers[canvas.currentBuffer]; exists {
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
	// Extract values based on command type
	name := fmt.Sprintf("u_uniform_%v", args["locationId"])

	switch cmd {
	case "uniform1f":
		if x, ok := args["x"].(float64); ok {
			canvas.ShaderObject.SetUniform(name, float32(x))
		}
	case "uniform2f":
		if x, ok := args["x"].(float64); ok {
			if y, ok := args["y"].(float64); ok {
				canvas.ShaderObject.SetUniform(name, [2]float32{float32(x), float32(y)})
			}
		}
	case "uniform3f":
		if x, ok := args["x"].(float64); ok {
			if y, ok := args["y"].(float64); ok {
				if z, ok := args["z"].(float64); ok {
					canvas.ShaderObject.SetUniform(name, [3]float32{float32(x), float32(y), float32(z)})
				}
			}
		}
	case "uniform4f":
		if x, ok := args["x"].(float64); ok {
			if y, ok := args["y"].(float64); ok {
				if z, ok := args["z"].(float64); ok {
					if w, ok := args["w"].(float64); ok {
						canvas.ShaderObject.SetUniform(name, [4]float32{float32(x), float32(y), float32(z), float32(w)})
					}
				}
			}
		}
	}
	return nil
}

func (b *Bridge) glUniformInt(canvas *GLCanvas, cmd string, args map[string]interface{}) error {
	// Similar to float uniforms but for integers
	return nil
}

func (b *Bridge) glUniformFloatv(canvas *GLCanvas, cmd string, args map[string]interface{}) error {
	// Handle array uniforms
	return nil
}

func (b *Bridge) glUniformMatrix(canvas *GLCanvas, cmd string, args map[string]interface{}) error {
	// Handle matrix uniforms (2x2, 3x3, 4x4)
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Texture Operations
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glCreateTexture(canvas *GLCanvas, args map[string]interface{}) error {
	textureId, ok := args["textureId"].(float64)
	if !ok {
		return fmt.Errorf("missing textureId")
	}
	canvas.textures[uint32(textureId)] = &shaderTexture{
		id: uint32(textureId),
	}
	return nil
}

func (b *Bridge) glDeleteTexture(canvas *GLCanvas, args map[string]interface{}) error {
	textureId, ok := args["textureId"].(float64)
	if !ok {
		return fmt.Errorf("missing textureId")
	}
	delete(canvas.textures, uint32(textureId))
	return nil
}

func (b *Bridge) glBindTexture(canvas *GLCanvas, args map[string]interface{}) error {
	// Texture binding is implicit in SetTextureUniform
	return nil
}

func (b *Bridge) glActiveTexture(canvas *GLCanvas, args map[string]interface{}) error {
	// Active texture is managed by painter
	return nil
}

func (b *Bridge) glTexImage2D(canvas *GLCanvas, args map[string]interface{}) error {
	// Create a placeholder image for the texture
	// In production, would decode the pixel data
	width, _ := args["width"].(float64)
	height, _ := args["height"].(float64)

	img := image.NewRGBA(image.Rect(0, 0, int(width), int(height)))
	// Fill with black for now
	for i := 0; i < img.Bounds().Dx()*img.Bounds().Dy(); i++ {
		img.Pix[i*4] = 0
		img.Pix[i*4+1] = 0
		img.Pix[i*4+2] = 0
		img.Pix[i*4+3] = 255
	}

	// Could track the texture, but for now we let Fyne handle it
	return nil
}

// ═══════════════════════════════════════════════════════════════
// State Operations
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glClear(canvas *GLCanvas, args map[string]interface{}) error {
	// Clear is implicit - shader runs and outputs color
	return nil
}

func (b *Bridge) glClearColor(canvas *GLCanvas, args map[string]interface{}) error {
	// Set clear color via a uniform if needed
	return nil
}

func (b *Bridge) glViewport(canvas *GLCanvas, args map[string]interface{}) error {
	// Viewport is implicit in canvas size
	return nil
}

// ═══════════════════════════════════════════════════════════════
// Drawing Operations
// ═══════════════════════════════════════════════════════════════

func (b *Bridge) glDrawArrays(canvas *GLCanvas, args map[string]interface{}) error {
	// Drawing happens on Refresh()
	return nil
}

func (b *Bridge) glDrawElements(canvas *GLCanvas, args map[string]interface{}) error {
	// Drawing happens on Refresh()
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
