#!/bin/bash
set -e

# Configuration
BRIDGE_DIR=$(dirname "$(realpath "$0")")
FORK_DIR="$BRIDGE_DIR/fyne-fork"
FYNE_VERSION="v2.7.0"
GOPATH=$(go env GOPATH)
FYNE_SRC_DIR="$GOPATH/pkg/mod/fyne.io/fyne/v2@$FYNE_VERSION"

echo "[setup-fyne-fork] Setting up local Fyne fork in $FORK_DIR..."

# 1. Clean up existing fork
if [ -d "$FORK_DIR" ]; then
    echo "[setup-fyne-fork] Removing existing fork..."
    chmod -R +w "$FORK_DIR"
    rm -rf "$FORK_DIR"
fi

# 2. Copy Fyne source
if [ ! -d "$FYNE_SRC_DIR" ]; then
    echo "[setup-fyne-fork] Fyne source not found at $FYNE_SRC_DIR. Downloading..."
    cd "$BRIDGE_DIR"
    go get "fyne.io/fyne/v2@$FYNE_VERSION"
fi

echo "[setup-fyne-fork] Copying Fyne source from $FYNE_SRC_DIR..."
mkdir -p "$FORK_DIR"
cp -rp "$FYNE_SRC_DIR/"* "$FORK_DIR/"
chmod -R +w "$FORK_DIR"

# 3. The go.mod is already copied from the original Fyne source.
# We just need to tidy it to resolve dependencies.
echo "[setup-fyne-fork] Initial tidying of fork..."
cd "$FORK_DIR"
go mod tidy

# 4. Inject blend mode support into canvas primitives
echo "[setup-fyne-fork] Patching canvas primitives..."

cat > "$FORK_DIR/canvas/blend_mode.go" <<EOF
package canvas

// BlendMode defines how a canvas primitive should be composited with the background.
// Matches OpenGL blend functions.
type BlendMode int

const (
	BlendNormal   BlendMode = iota // Standard alpha compositing
	BlendAdditive                  // GL_ONE, GL_ONE (Lighten)
	BlendMultiply                  // GL_DST_COLOR, GL_ZERO (Darken)
	BlendScreen                    // GL_ONE, GL_ONE_MINUS_SRC_COLOR (Lighten)
)
EOF

# Define patch helper function
patch_primitive() {
    local file="$1"
    local struct="$2"
    
    # 1. Add blendMode field
    # We look for the closing brace of the struct definition.
    # Fyne usually uses a simple struct block.
    sed -i "/type $struct struct {/,/}/ s/}/\tblendMode   BlendMode   \/\/ The blending mode for this $struct\n}/" "$file"
    
    # 2. Add methods
    cat >> "$file" <<EOF

// BlendMode returns the blend mode for this $struct
func (o *$struct) BlendMode() BlendMode {
	return o.blendMode
}

// SetBlendMode sets the blend mode for this $struct
func (o *$struct) SetBlendMode(mode BlendMode) {
	o.blendMode = mode
}
EOF
}

# Apply patches to primitives
patch_primitive "$FORK_DIR/canvas/line.go" "Line"
patch_primitive "$FORK_DIR/canvas/circle.go" "Circle"
patch_primitive "$FORK_DIR/canvas/rectangle.go" "Rectangle"
patch_primitive "$FORK_DIR/canvas/image.go" "Image"
patch_primitive "$FORK_DIR/canvas/raster.go" "Raster"
patch_primitive "$FORK_DIR/canvas/text.go" "Text"

# 5. Inject Shader canvas primitive for GPU-accelerated rendering
echo "[setup-fyne-fork] Injecting Shader canvas primitive..."

cat > "$FORK_DIR/canvas/shader.go" <<'SHADER_EOF'
package canvas

import (
	"fyne.io/fyne/v2"
)

// Shader is a canvas object that renders using a custom GLSL fragment shader.
// This enables GPU-accelerated effects like fractals, ray marching, etc.
type Shader struct {
	baseObject
	size           fyne.Size
	FragmentSource string                 // GLSL fragment shader source code
	Uniforms       map[string]interface{} // Uniform values: float32, [2]float32, [3]float32, [4]float32

	// Internal state managed by the GL painter
	program      uint32
	needsCompile bool
	uniformLocs  map[string]int32
}

// NewShader creates a new shader canvas object with the given dimensions and fragment shader.
// The fragment shader should output to gl_FragColor. Available uniforms:
//   - vec2 u_resolution: canvas size in pixels
//   - float u_time: time in seconds since start
//   - vec2 u_mouse: mouse position (if provided via SetUniform)
// Custom uniforms can be set via SetUniform.
func NewShader(width, height float32, fragmentSrc string) *Shader {
	s := &Shader{
		FragmentSource: fragmentSrc,
		Uniforms:       make(map[string]interface{}),
		needsCompile:   true,
		uniformLocs:    make(map[string]int32),
	}
	s.size = fyne.NewSize(width, height)
	return s
}

// Size returns the current size of the shader canvas
func (s *Shader) Size() fyne.Size {
	return s.size
}

// Refresh causes the shader to be redrawn
func (s *Shader) Refresh() {
	Refresh(s)
}

// MinSize returns the minimum size (same as size for shaders)
func (s *Shader) MinSize() fyne.Size {
	return s.size
}

// Resize changes the shader canvas size
func (s *Shader) Resize(size fyne.Size) {
	s.size = size
	s.Refresh()
}

// SetMinSize sets the shader canvas size
func (s *Shader) SetMinSize(size fyne.Size) {
	s.size = size
}

// SetUniform sets a uniform value. Supported types:
//   - float32 or float64 -> float uniform
//   - [2]float32 or []float32 (len 2) -> vec2 uniform
//   - [3]float32 or []float32 (len 3) -> vec3 uniform
//   - [4]float32 or []float32 (len 4) -> vec4 uniform
//   - int or int32 -> int uniform
func (s *Shader) SetUniform(name string, value interface{}) {
	s.Uniforms[name] = value
	s.Refresh()
}

// SetSource updates the fragment shader source and triggers recompilation
func (s *Shader) SetSource(src string) {
	s.FragmentSource = src
	s.needsCompile = true
	s.Refresh()
}

// Program returns the compiled GL program ID (for painter use)
func (s *Shader) Program() uint32 {
	return s.program
}

// SetProgram sets the compiled GL program ID (for painter use)
func (s *Shader) SetProgram(p uint32) {
	s.program = p
	s.needsCompile = false
}

// NeedsCompile returns whether the shader needs (re)compilation
func (s *Shader) NeedsCompile() bool {
	return s.needsCompile
}

// UniformLocs returns the uniform location cache (for painter use)
func (s *Shader) UniformLocs() map[string]int32 {
	return s.uniformLocs
}

// SetUniformLoc caches a uniform location (for painter use)
func (s *Shader) SetUniformLoc(name string, loc int32) {
	s.uniformLocs[name] = loc
}
SHADER_EOF

# 6. Inject renderhook package
echo "[setup-fyne-fork] Injecting renderhook package..."
mkdir -p "$FORK_DIR/internal/renderhook"

cat > "$FORK_DIR/internal/renderhook/renderhook.go" <<EOF
package renderhook

import (
	"log"
	"sync/atomic"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
)

// BlendModeSupport interface for objects that support custom blend modes.
// Matches the implementation in canvas package primitives.
type BlendModeSupport interface {
	BlendMode() canvas.BlendMode
}

// BlendFuncSetter is the function signature for setting GL blend mode.
// This is set by the painter after GL init to avoid CGO crashes.
type BlendFuncSetter func(sfactor, dfactor uint32)

// blendFunc is the setter function, only set after GL is initialized.
var blendFunc BlendFuncSetter

// debugLogOnce ensures we only log the first few blend mode changes
var debugLogCount int32

// SetBlendFunc sets the blend function implementation.
// Call this after gl.Init() with gl.BlendFunc as the argument.
func SetBlendFunc(fn BlendFuncSetter) {
	log.Printf("[renderhook] SetBlendFunc called - GL blend function now available")
	blendFunc = fn
}

// SetGLReady is called after GL is initialized.
// For backwards compatibility with existing patch code.
func SetGLReady() {
	// The actual readiness is determined by blendFunc being set
}

// Before is called before painting a canvas object.
// Only modifies GL state when blend mode is non-default and GL is ready.
func Before(obj fyne.CanvasObject) {
	// Early exit if blend function not set (GL not initialized)
	if blendFunc == nil {
		return
	}
	b, ok := obj.(BlendModeSupport)
	if !ok {
		return
	}
	mode := b.BlendMode()
	// Only change GL state for non-default blend modes
	switch mode {
	case canvas.BlendAdditive:
		if atomic.AddInt32(&debugLogCount, 1) <= 5 {
			log.Printf("[renderhook] Before: Setting ADDITIVE blend mode for %T", obj)
		}
		blendFunc(0x1, 0x1) // GL_ONE, GL_ONE
	case canvas.BlendMultiply:
		blendFunc(0x0774, 0x0) // GL_DST_COLOR, GL_ZERO
	case canvas.BlendScreen:
		blendFunc(0x1, 0x0301) // GL_ONE, GL_ONE_MINUS_SRC_COLOR
	// BlendNormal (0) - don't touch GL state, use Fyne's default
	}
}

// After is called after painting a canvas object to restore default state.
// Only restores when we actually changed the blend mode.
func After(obj fyne.CanvasObject) {
	// Early exit if blend function not set (GL not initialized)
	if blendFunc == nil {
		return
	}
	b, ok := obj.(BlendModeSupport)
	if !ok {
		return
	}
	mode := b.BlendMode()
	// Only restore if we changed the blend mode
	if mode != canvas.BlendNormal {
		blendFunc(0x0302, 0x0303) // GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA
	}
}
EOF

# 6. Patch GL initialization to set blend function
echo "[setup-fyne-fork] Patching GL initialization..."
# After gl.Enable(gl.BLEND) which confirms GL is working, set the blend function
sed -i '/gl.Enable(gl.BLEND)/a\
\	renderhook.SetBlendFunc(gl.BlendFunc)' "$FORK_DIR/internal/painter/gl/gl_core.go"
# Add import for renderhook
sed -i 's|import (|import (\n\t"fyne.io/fyne/v2/internal/renderhook"|' "$FORK_DIR/internal/painter/gl/gl_core.go"

# Same for gl_es.go (OpenGL ES version)
sed -i '/gl.Enable(gl.BLEND)/a\
\	renderhook.SetBlendFunc(gl.BlendFunc)' "$FORK_DIR/internal/painter/gl/gl_es.go"
sed -i 's|import (|import (\n\t"fyne.io/fyne/v2/internal/renderhook"|' "$FORK_DIR/internal/painter/gl/gl_es.go"

# 7. Patch draw.go to remove hardcoded BlendFunc calls that override our blend mode
echo "[setup-fyne-fork] Patching draw.go to remove BlendFunc overrides..."
# Comment out all the BlendFunc calls in draw.go that reset to default alpha blending
# These lines override our custom blend mode set in renderhook.Before()
sed -i 's/p\.ctx\.BlendFunc(srcAlpha, oneMinusSrcAlpha)/\/\/ PATCHED: removed BlendFunc override/g' "$FORK_DIR/internal/painter/gl/draw.go"
sed -i 's/p\.ctx\.BlendFunc(one, oneMinusSrcAlpha)/\/\/ PATCHED: removed BlendFunc override/g' "$FORK_DIR/internal/painter/gl/draw.go"

# 7b. Fix transparent color check in drawOblong - color.RGBA{0,0,0,0} != color.Transparent (which is Alpha16)
echo "[setup-fyne-fork] Patching draw.go to fix transparent color check..."
# Add helper function to check if a color is transparent by checking alpha
sed -i '/^func (p \*painter) drawOblong/i\
// isTransparent checks if a color is fully transparent (alpha == 0)\
func isTransparent(c color.Color) bool {\
	if c == nil {\
		return true\
	}\
	_, _, _, a := c.RGBA()\
	return a == 0\
}\
' "$FORK_DIR/internal/painter/gl/draw.go"

# Replace the flawed check with our helper function
sed -i 's/if (fill == color.Transparent || fill == nil) && (stroke == color.Transparent || stroke == nil || strokeWidth == 0) {/if isTransparent(fill) \&\& (isTransparent(stroke) || strokeWidth == 0) {/' "$FORK_DIR/internal/painter/gl/draw.go"

# 7c. Extend GL context with missing methods for shader support
echo "[setup-fyne-fork] Adding shader-related methods to GL context..."

# Add missing methods to context.go interface (before the closing brace)
sed -i '/VertexAttribPointerWithOffset/a\
\	Uniform3f(uniform Uniform, v0, v1, v2 float32)\
\	DisableVertexAttribArray(attribute Attribute)\
\	VertexAttribPointer(attribute Attribute, size int, typ uint32, normalized bool, stride int, data []float32)' "$FORK_DIR/internal/painter/gl/context.go"

# Add implementations to gl_core.go (before the final closing brace of the file, after existing methods)
cat >> "$FORK_DIR/internal/painter/gl/gl_core.go" <<'GL_CORE_ADDITIONS'

func (c *coreContext) Uniform3f(uniform Uniform, v0, v1, v2 float32) {
	gl.Uniform3f(int32(uniform), v0, v1, v2)
}

func (c *coreContext) DisableVertexAttribArray(attribute Attribute) {
	gl.DisableVertexAttribArray(uint32(attribute))
}

func (c *coreContext) VertexAttribPointer(attribute Attribute, size int, typ uint32, normalized bool, stride int, data []float32) {
	gl.VertexAttribPointer(uint32(attribute), int32(size), typ, normalized, int32(stride), gl.Ptr(data))
}
GL_CORE_ADDITIONS

# 8. Inject shader painter support
echo "[setup-fyne-fork] Injecting shader painter support..."

cat > "$FORK_DIR/internal/painter/gl/shader_painter.go" <<'SHADER_PAINTER_EOF'
package gl

import (
	"log"
	"strings"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
)

// Default vertex shader for fullscreen quad
// Uses 'vert' attribute to match Fyne's existing pattern
const defaultShaderVertexSrc = `
#version 110
attribute vec2 vert;

void main() {
    gl_Position = vec4(vert, 0.0, 1.0);
}
`

// Fragment shader wrapper that adds standard uniforms
// Note: No precision qualifier - that's OpenGL ES syntax, not desktop OpenGL
const shaderFragmentPrefix = `
#version 110
uniform vec2 u_resolution;
uniform float u_time;
varying vec2 v_texCoord;
`

// shaderStartTime is used to calculate u_time uniform
var shaderStartTime = time.Now()

// shaderVBO is a dedicated vertex buffer for shader rendering
var shaderVBO Buffer
var shaderVBOInit bool

// compileShaderProgram compiles and links a vertex and fragment shader
func (p *painter) compileShaderProgram(vertexSrc, fragmentSrc string) Program {
	// Prepend standard uniforms to fragment shader if it doesn't have a version
	if !strings.HasPrefix(strings.TrimSpace(fragmentSrc), "#version") {
		fragmentSrc = shaderFragmentPrefix + fragmentSrc
	}

	// Compile vertex shader
	vShader := p.ctx.CreateShader(vertexShader)
	p.ctx.ShaderSource(vShader, vertexSrc)
	p.ctx.CompileShader(vShader)
	if p.ctx.GetShaderi(vShader, compileStatus) == 0 {
		logMsg := p.ctx.GetShaderInfoLog(vShader)
		log.Printf("[shader] Vertex shader compile error: %s", logMsg)
		return 0
	}

	// Compile fragment shader
	fShader := p.ctx.CreateShader(fragmentShader)
	p.ctx.ShaderSource(fShader, fragmentSrc)
	p.ctx.CompileShader(fShader)
	if p.ctx.GetShaderi(fShader, compileStatus) == 0 {
		logMsg := p.ctx.GetShaderInfoLog(fShader)
		log.Printf("[shader] Fragment shader compile error: %s", logMsg)
		return 0
	}

	// Link program
	program := p.ctx.CreateProgram()
	p.ctx.AttachShader(program, vShader)
	p.ctx.AttachShader(program, fShader)
	p.ctx.LinkProgram(program)
	if p.ctx.GetProgrami(program, linkStatus) == 0 {
		logMsg := p.ctx.GetProgramInfoLog(program)
		log.Printf("[shader] Program link error: %s", logMsg)
		return 0
	}

	// Note: Individual shaders could be deleted here but Fyne's context doesn't expose DeleteShader.
	// The GL resources are cleaned up when the program is deleted.

	return program
}

// drawShader renders a Shader canvas object
func (p *painter) drawShader(shader *canvas.Shader, pos fyne.Position, frame fyne.Size) {
	if shader.FragmentSource == "" {
		return
	}

	// Compile shader if needed
	if shader.NeedsCompile() || shader.Program() == 0 {
		// Note: Ideally we'd delete the old program here, but Fyne's context doesn't expose DeleteProgram.
		// The old program will leak, but this only happens on shader source changes which is rare.
		prog := p.compileShaderProgram(defaultShaderVertexSrc, shader.FragmentSource)
		if prog == 0 {
			log.Printf("[drawShader] Shader compilation failed!")
			return
		}
		shader.SetProgram(uint32(prog))
		// Clear uniform location cache on recompile
		for k := range shader.UniformLocs() {
			delete(shader.UniformLocs(), k)
		}
	}

	prog := Program(shader.Program())
	if prog == 0 {
		return
	}

	// Save current program
	p.ctx.UseProgram(prog)

	// Get or cache uniform locations
	getUniformLoc := func(name string) Uniform {
		if loc, ok := shader.UniformLocs()[name]; ok {
			return Uniform(loc)
		}
		loc := p.ctx.GetUniformLocation(prog, name)
		shader.SetUniformLoc(name, int32(loc))
		return loc
	}

	// Calculate pixel position for uniforms
	// Note: OpenGL has origin at bottom-left, Fyne has origin at top-left
	pixelX := p.pixScale * pos.X
	// For gl_FragCoord, y=0 is at bottom of window
	// Shader bottom edge in Fyne coords: pos.Y + shader.Size().Height
	// In OpenGL coords: frame.Height - (pos.Y + shader.Size().Height)
	pixelY := p.pixScale * (frame.Height - pos.Y - shader.Size().Height)
	pixelWidth := p.pixScale * shader.Size().Width
	pixelHeight := p.pixScale * shader.Size().Height

	// Set standard uniforms
	resLoc := getUniformLoc("u_resolution")
	if resLoc >= 0 {
		p.ctx.Uniform2f(resLoc, pixelWidth, pixelHeight)
	}

	// Set viewport to the shader's area so gl_FragCoord is relative to it
	// This makes the shader's coordinate system match what it expects
	viewportX := int(pixelX)
	viewportY := int(pixelY)
	viewportW := int(pixelWidth)
	viewportH := int(pixelHeight)
	p.ctx.Viewport(viewportX, viewportY, viewportW, viewportH)

	// With viewport set, u_position should be 0,0 since gl_FragCoord is now relative to viewport
	posLoc := getUniformLoc("u_position")
	if posLoc >= 0 {
		p.ctx.Uniform2f(posLoc, 0, 0)
	}

	timeLoc := getUniformLoc("u_time")
	if timeLoc >= 0 {
		elapsed := float32(time.Since(shaderStartTime).Seconds())
		p.ctx.Uniform1f(timeLoc, elapsed)
	}

	// Set custom uniforms
	for name, val := range shader.Uniforms {
		loc := getUniformLoc(name)
		if loc < 0 {
			continue
		}
		switch v := val.(type) {
		case float32:
			p.ctx.Uniform1f(loc, v)
		case float64:
			p.ctx.Uniform1f(loc, float32(v))
		case int:
			p.ctx.Uniform1f(loc, float32(v))
		case int8:
			p.ctx.Uniform1f(loc, float32(v))
		case int16:
			p.ctx.Uniform1f(loc, float32(v))
		case int32:
			p.ctx.Uniform1f(loc, float32(v))
		case int64:
			p.ctx.Uniform1f(loc, float32(v))
		case uint8:
			p.ctx.Uniform1f(loc, float32(v))
		case [2]float32:
			p.ctx.Uniform2f(loc, v[0], v[1])
		case [3]float32:
			p.ctx.Uniform3f(loc, v[0], v[1], v[2])
		case [4]float32:
			p.ctx.Uniform4f(loc, v[0], v[1], v[2], v[3])
		case []float32:
			switch len(v) {
			case 1:
				p.ctx.Uniform1f(loc, v[0])
			case 2:
				p.ctx.Uniform2f(loc, v[0], v[1])
			case 3:
				p.ctx.Uniform3f(loc, v[0], v[1], v[2])
			case 4:
				p.ctx.Uniform4f(loc, v[0], v[1], v[2], v[3])
			}
		case []interface{}:
			// Handle JSON arrays from bridge
			floats := make([]float32, len(v))
			for i, x := range v {
				switch f := x.(type) {
				case float64:
					floats[i] = float32(f)
				case float32:
					floats[i] = f
				case int:
					floats[i] = float32(f)
				}
			}
			switch len(floats) {
			case 1:
				p.ctx.Uniform1f(loc, floats[0])
			case 2:
				p.ctx.Uniform2f(loc, floats[0], floats[1])
			case 3:
				p.ctx.Uniform3f(loc, floats[0], floats[1], floats[2])
			case 4:
				p.ctx.Uniform4f(loc, floats[0], floats[1], floats[2], floats[3])
			}
		}
	}

	// We no longer need NDC calculations - we'll use viewport to position the shader

	// With custom viewport, draw a fullscreen quad (-1 to 1)
	// The viewport transform will place it correctly
	vertices := []float32{
		-1, -1,  // 0: bottom-left
		 1, -1,  // 1: bottom-right
		-1,  1,  // 2: top-left
		 1,  1,  // 3: top-right
	}

	// Create dedicated shader VBO if needed
	if !shaderVBOInit {
		shaderVBO = p.ctx.CreateBuffer()
		p.ctx.BindBuffer(arrayBuffer, shaderVBO)
		p.ctx.BufferData(arrayBuffer, make([]float32, 8), staticDraw)
		shaderVBOInit = true
	}

	// Update the shader VBO with our vertices
	p.ctx.BindBuffer(arrayBuffer, shaderVBO)
	p.ctx.BufferSubData(arrayBuffer, vertices)
	p.logError()

	// Get attribute location for 'vert' and set up vertex array
	vertAttrib := p.ctx.GetAttribLocation(prog, "vert")
	if vertAttrib >= 0 {
		p.ctx.EnableVertexAttribArray(vertAttrib)
		// 2 floats per vertex (x, y), no stride, no offset
		p.ctx.VertexAttribPointerWithOffset(vertAttrib, 2, float, false, 0, 0)
		p.ctx.DrawArrays(triangleStrip, 0, 4)
		p.logError()
		p.ctx.DisableVertexAttribArray(vertAttrib)
	} else {
		log.Printf("[drawShader] ERROR: vert attribute not found in shader!")
	}

	// Restore original viewport (full frame)
	frameW := int(p.pixScale * frame.Width)
	frameH := int(p.pixScale * frame.Height)
	p.ctx.Viewport(0, 0, frameW, frameH)

	// Restore default program
	p.ctx.UseProgram(p.program.ref)
}
SHADER_PAINTER_EOF

# 9. Patch painter.go to handle Shader
echo "[setup-fyne-fork] Patching painter.go..."
cd "$BRIDGE_DIR"
# Ensure bridge go.mod is consistent with the new fork state before running tools
go mod tidy
go run tools/patch-fyne/main.go \
    -file "$FORK_DIR/internal/painter/gl/painter.go" \
    -out "$FORK_DIR/internal/painter/gl/painter.go"

# 9b. Add Shader case to the type switch in draw.go (drawObject function)
echo "[setup-fyne-fork] Adding Shader case to draw.go..."
# Find the line with "p.drawRaster" and add Shader case after it
sed -i '/p\.drawRaster(obj, pos, frame)/a\
\	case *canvas.Shader:\
\		p.drawShader(obj, pos, frame)' "$FORK_DIR/internal/painter/gl/draw.go"

# 10. Tidy everything
echo "[setup-fyne-fork] Final tidying..."
cd "$FORK_DIR"
go mod tidy
cd "$BRIDGE_DIR"
go mod tidy

echo "[setup-fyne-fork] Done."
