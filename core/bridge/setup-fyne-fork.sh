#!/bin/bash
set -e

# NOTE: This script embeds Go code into the Fyne fork to add GPU shader support.
# The embedded Go source code is documented in setup-fyne-fork.go-code.txt for readability.
# See that file for:
#   - blend_mode.go: Blend mode type definitions
#   - shader.go: Shader canvas primitive (~430 lines)
#   - renderhook.go: Blend mode state management
#   - shader_painter.go: GPU rendering implementation (~350 lines)

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
    # Temporarily comment out the replace directive so go get works
    # (the fork doesn't exist yet, so the replace would fail)
    sed -i 's|^replace fyne.io/fyne/v2|// SETUP_TEMP: replace fyne.io/fyne/v2|' go.mod
    go get "fyne.io/fyne/v2@$FYNE_VERSION"
    # Restore the replace directive
    sed -i 's|^// SETUP_TEMP: replace fyne.io/fyne/v2|replace fyne.io/fyne/v2|' go.mod
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
	"sync"
	"time"

	"fyne.io/fyne/v2"
)

// Shader is a canvas object that renders using a custom GLSL vertex and fragment shader.
// This enables GPU-accelerated effects like fractals, ray marching, 3D geometry, etc.
type Shader struct {
	baseObject
	size            fyne.Size
	VertexSource    string                 // GLSL vertex shader source code (optional)
	FragmentSource  string                 // GLSL fragment shader source code
	Uniforms        map[string]interface{} // Uniform values: float32, [2]float32, [3]float32, [4]float32
	uniformsMu      sync.RWMutex           // Protects concurrent access to Uniforms map
	Textures        map[string]interface{} // Texture uniforms: image.Image, image.RGBA, etc.
	Cubemaps        map[string][6]interface{} // Cubemap uniforms: [+X, -X, +Y, -Y, +Z, -Z]

	// Vertex buffer data
	Vertices        []float32              // Vertex data (positions, normals, texcoords, etc.)
	Indices         []uint16               // Index buffer (for indexed drawing)
	VertexFormat    string                 // Format descriptor: "pos3", "pos3_norm3", "pos3_norm3_uv2", etc.

	// Time tracking for u_time uniform (only updates on Refresh, not every paint pass)
	startTime       time.Time              // When the shader was created
	cachedTime      float32                // Cached u_time value, only updated on Refresh()

	// Internal state managed by the GL painter
	program         uint32
	needsCompile    bool
	uniformLocs     map[string]int32
	textureUnits    map[string]int    // Mapping of texture uniform names to GL texture units
	textureCache    map[string]uint32 // Cache of GL texture IDs for regular textures
	cubemapUnits    map[string]int    // Mapping of cubemap names to GL texture units
	cubemapCache    map[string]uint32 // Cache of GL cubemap texture IDs
	vbo             uint32                 // Vertex buffer object ID
	ibo             uint32                 // Index buffer object ID
	vertexCount     int                    // Number of vertices for rendering
	indexCount      int                    // Number of indices (if using indexed drawing)
}

// NewShader creates a new shader canvas object with the given dimensions and fragment shader.
// The fragment shader should output to gl_FragColor. Available uniforms:
//   - vec2 u_resolution: canvas size in pixels
//   - float u_time: time in seconds since start
//   - vec2 u_mouse: mouse position (if provided via SetUniform)
// Custom uniforms can be set via SetUniform.
// Texture uniforms can be set via SetTextureUniform.
// Cubemap uniforms can be set via SetCubemapUniform.
// Vertex data can be set via SetVertices and SetIndices.
func NewShader(width, height float32, fragmentSrc string) *Shader {
	now := time.Now()
	s := &Shader{
		VertexSource:   "",
		FragmentSource: fragmentSrc,
		Uniforms:       make(map[string]interface{}),
		Textures:       make(map[string]interface{}),
		Cubemaps:       make(map[string][6]interface{}),
		Vertices:       nil,
		Indices:        nil,
		VertexFormat:   "",
		startTime:      now,
		cachedTime:     0, // Initial u_time is 0
		needsCompile:   true,
		uniformLocs:    make(map[string]int32),
		textureUnits:   make(map[string]int),
		textureCache:   make(map[string]uint32),
		cubemapUnits:   make(map[string]int),
		cubemapCache:   make(map[string]uint32),
		vbo:            0,
		ibo:            0,
		vertexCount:    0,
		indexCount:     0,
	}
	s.size = fyne.NewSize(width, height)
	return s
}

// Size returns the current size of the shader canvas
func (s *Shader) Size() fyne.Size {
	return s.size
}

// Refresh causes the shader to be redrawn and updates the cached u_time value.
// This is the ONLY time u_time changes - it does NOT update on every paint pass.
// This matches Fyne's texture caching behavior where widgets only regenerate on Refresh().
func (s *Shader) Refresh() {
	s.cachedTime = float32(time.Since(s.startTime).Seconds())
	Refresh(s)
}

// CachedTime returns the cached u_time value (only updated on Refresh)
func (s *Shader) CachedTime() float32 {
	return s.cachedTime
}

// StartTime returns when the shader was created
func (s *Shader) StartTime() time.Time {
	return s.startTime
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
	s.uniformsMu.Lock()
	s.Uniforms[name] = value
	s.uniformsMu.Unlock()
	s.Refresh()
}

// GetUniformsCopy returns a thread-safe copy of the uniforms map for iteration.
// Use this in the painter to avoid concurrent map access.
func (s *Shader) GetUniformsCopy() map[string]interface{} {
	s.uniformsMu.RLock()
	defer s.uniformsMu.RUnlock()
	copy := make(map[string]interface{}, len(s.Uniforms))
	for k, v := range s.Uniforms {
		copy[k] = v
	}
	return copy
}

// SetTextureUniform sets a texture uniform value.
// Supported types: image.Image, *image.RGBA, image.Uniform
// The texture will be bound to an available texture unit.
func (s *Shader) SetTextureUniform(name string, value interface{}) {
	s.Textures[name] = value
	s.Refresh()
}

// SetCubemapUniform sets a cubemap uniform value.
// Takes 6 images for the cubemap faces: [+X, -X, +Y, -Y, +Z, -Z]
// The cubemap will be bound to an available texture unit.
func (s *Shader) SetCubemapUniform(name string, faces [6]interface{}) {
	s.Cubemaps[name] = faces
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

// GetTextures returns the texture uniforms map (for painter use)
func (s *Shader) GetTextures() map[string]interface{} {
	return s.Textures
}

// GetTextureUnits returns the texture unit mapping (for painter use)
func (s *Shader) GetTextureUnits() map[string]int {
	return s.textureUnits
}

// SetTextureUnit sets the GL texture unit for a uniform (for painter use)
func (s *Shader) SetTextureUnit(name string, unit int) {
	s.textureUnits[name] = unit
}

// GetTextureCache returns the cached GL texture IDs (for painter use)
func (s *Shader) GetTextureCache() map[string]uint32 {
	return s.textureCache
}

// SetTextureCache sets a cached GL texture ID (for painter use)
func (s *Shader) SetTextureCache(name string, texID uint32) {
	s.textureCache[name] = texID
}

// ClearTextureCache clears the texture cache (called on recompile)
func (s *Shader) ClearTextureCache() {
	for k := range s.textureCache {
		delete(s.textureCache, k)
	}
	for k := range s.textureUnits {
		delete(s.textureUnits, k)
	}
}

// GetCubemaps returns the cubemap uniforms map (for painter use)
func (s *Shader) GetCubemaps() map[string][6]interface{} {
	return s.Cubemaps
}

// GetCubemapUnits returns the cubemap unit mapping (for painter use)
func (s *Shader) GetCubemapUnits() map[string]int {
	return s.cubemapUnits
}

// SetCubemapUnit sets the GL texture unit for a cubemap (for painter use)
func (s *Shader) SetCubemapUnit(name string, unit int) {
	s.cubemapUnits[name] = unit
}

// GetCubemapCache returns the cached GL cubemap IDs (for painter use)
func (s *Shader) GetCubemapCache() map[string]uint32 {
	return s.cubemapCache
}

// SetCubemapCache sets a cached GL cubemap ID (for painter use)
func (s *Shader) SetCubemapCache(name string, texID uint32) {
	s.cubemapCache[name] = texID
}

// ClearCubemapCache clears the cubemap cache (called on recompile)
func (s *Shader) ClearCubemapCache() {
	for k := range s.cubemapCache {
		delete(s.cubemapCache, k)
	}
	for k := range s.cubemapUnits {
		delete(s.cubemapUnits, k)
	}
}

// SetVertices sets the vertex data for the shader.
// format should be one of: "pos2", "pos3", "pos3_norm3", "pos3_norm3_uv2", "pos2_uv2"
// or a custom format string describing the vertex layout.
func (s *Shader) SetVertices(data []float32, format string) {
	s.Vertices = data
	s.VertexFormat = format
	s.vertexCount = len(data) / s.attributeCountForFormat(format)
	s.Refresh()
}

// SetIndices sets the index buffer for indexed drawing (glDrawElements).
func (s *Shader) SetIndices(indices []uint16) {
	s.Indices = indices
	s.indexCount = len(indices)
	s.Refresh()
}

// attributeCountForFormat returns the number of floats per vertex for a given format.
func (s *Shader) attributeCountForFormat(format string) int {
	switch format {
	case "pos2":
		return 2
	case "pos3":
		return 3
	case "pos2_uv2":
		return 4 // 2 pos + 2 uv
	case "pos3_norm3":
		return 6 // 3 pos + 3 norm
	case "pos3_norm3_uv2":
		return 8 // 3 pos + 3 norm + 2 uv
	case "pos3_col4":
		return 7 // 3 pos + 4 color
	default:
		return 0 // Unknown format
	}
}

// GetVertices returns the vertex data.
func (s *Shader) GetVertices() []float32 {
	return s.Vertices
}

// GetIndices returns the index buffer.
func (s *Shader) GetIndices() []uint16 {
	return s.Indices
}

// GetVertexFormat returns the vertex format descriptor.
func (s *Shader) GetVertexFormat() string {
	return s.VertexFormat
}

// GetVertexCount returns the number of vertices.
func (s *Shader) GetVertexCount() int {
	return s.vertexCount
}

// GetIndexCount returns the number of indices.
func (s *Shader) GetIndexCount() int {
	return s.indexCount
}

// SetVBO sets the vertex buffer object ID (for painter use).
func (s *Shader) SetVBO(vbo uint32) {
	s.vbo = vbo
}

// GetVBO returns the vertex buffer object ID.
func (s *Shader) GetVBO() uint32 {
	return s.vbo
}

// SetIBO sets the index buffer object ID (for painter use).
func (s *Shader) SetIBO(ibo uint32) {
	s.ibo = ibo
}

// GetIBO returns the index buffer object ID.
func (s *Shader) GetIBO() uint32 {
	return s.ibo
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

# 7. Add blend mode support to draw functions
echo "[setup-fyne-fork] Adding blend mode support to draw.go..."

# Add helper function after the imports (before const edgeSoftness)
cat > /tmp/blend_helper.go <<'BLEND_HELPER'
// setBlendModeForObject sets the appropriate blend mode for a canvas object.
// If the object has a custom blend mode, use that; otherwise use the default alpha blending.
func (p *painter) setBlendModeForObject(obj fyne.CanvasObject) {
	if blendable, ok := obj.(interface{ BlendMode() canvas.BlendMode }); ok {
		switch blendable.BlendMode() {
		case canvas.BlendAdditive:
			p.ctx.BlendFunc(one, one)
			return
		case canvas.BlendMultiply:
			p.ctx.BlendFunc(dstColor, zero)
			return
		case canvas.BlendScreen:
			p.ctx.BlendFunc(one, oneMinusSrcColor)
			return
		}
	}
	// Default: standard alpha blending
	p.ctx.BlendFunc(srcAlpha, oneMinusSrcAlpha)
}

BLEND_HELPER
sed -i '/^const edgeSoftness/r /tmp/blend_helper.go' "$FORK_DIR/internal/painter/gl/draw.go"

# Add missing GL constants to gl_core.go (one already exists, don't add it)
sed -i '/oneMinusSrcAlpha.*= gl.ONE_MINUS_SRC_ALPHA/a\
\	dstColor              = gl.DST_COLOR\
\	zero                  = gl.ZERO\
\	oneMinusSrcColor      = gl.ONE_MINUS_SRC_COLOR' "$FORK_DIR/internal/painter/gl/gl_core.go"

# Patch drawCircle to use blend mode helper
sed -i '/func (p \*painter) drawCircle/,/^func / {
    s/p\.ctx\.BlendFunc(srcAlpha, oneMinusSrcAlpha)/p.setBlendModeForObject(circle)/
}' "$FORK_DIR/internal/painter/gl/draw.go"

# Patch drawLine to use blend mode helper
sed -i '/func (p \*painter) drawLine/,/^func / {
    s/p\.ctx\.BlendFunc(srcAlpha, oneMinusSrcAlpha)/p.setBlendModeForObject(line)/
}' "$FORK_DIR/internal/painter/gl/draw.go"

# Patch drawOblong (used by drawRectangle) to use blend mode helper
sed -i '/func (p \*painter) drawOblong/,/^func / {
    s/p\.ctx\.BlendFunc(srcAlpha, oneMinusSrcAlpha)/p.setBlendModeForObject(obj)/
}' "$FORK_DIR/internal/painter/gl/draw.go"

# Patch drawPolygon to use blend mode helper
sed -i '/func (p \*painter) drawPolygon/,/^func / {
    s/p\.ctx\.BlendFunc(srcAlpha, oneMinusSrcAlpha)/p.setBlendModeForObject(polygon)/
}' "$FORK_DIR/internal/painter/gl/draw.go"

# Patch drawArc to use blend mode helper
sed -i '/func (p \*painter) drawArc/,/^func / {
    s/p\.ctx\.BlendFunc(srcAlpha, oneMinusSrcAlpha)/p.setBlendModeForObject(arc)/
}' "$FORK_DIR/internal/painter/gl/draw.go"

# Note: drawTextureWithDetails uses BlendFunc(one, oneMinusSrcAlpha) which is different
# We leave that one alone for now as it's for textures/images

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
\	Uniform1i(uniform Uniform, v int32)\
\	DisableVertexAttribArray(attribute Attribute)\
\	VertexAttribPointer(attribute Attribute, size int, typ uint32, normalized bool, stride int, data []float32)\
\	DrawElements(mode uint32, count int32, typ uint32, offset int)' "$FORK_DIR/internal/painter/gl/context.go"

# Add implementations to gl_core.go (before the final closing brace of the file, after existing methods)
cat >> "$FORK_DIR/internal/painter/gl/gl_core.go" <<'GL_CORE_ADDITIONS'

func (c *coreContext) Uniform3f(uniform Uniform, v0, v1, v2 float32) {
	gl.Uniform3f(int32(uniform), v0, v1, v2)
}

func (c *coreContext) Uniform1i(uniform Uniform, v int32) {
	gl.Uniform1i(int32(uniform), v)
}

func (c *coreContext) DisableVertexAttribArray(attribute Attribute) {
	gl.DisableVertexAttribArray(uint32(attribute))
}

func (c *coreContext) VertexAttribPointer(attribute Attribute, size int, typ uint32, normalized bool, stride int, data []float32) {
	gl.VertexAttribPointer(uint32(attribute), int32(size), typ, normalized, int32(stride), gl.Ptr(data))
}

func (c *coreContext) DrawElements(mode uint32, count int32, typ uint32, offset int) {
	gl.DrawElements(mode, count, typ, gl.PtrOffset(offset))
}
GL_CORE_ADDITIONS

# Add missing GL constants for vertex buffers and cubemaps
sed -i '/unsignedByte.*= gl.UNSIGNED_BYTE/a\
\	dynamicDraw           = gl.DYNAMIC_DRAW\
\	elementArrayBuffer    = gl.ELEMENT_ARRAY_BUFFER\
\	unsignedShort         = gl.UNSIGNED_SHORT\
\	linear                = gl.LINEAR\
\	textureCube           = gl.TEXTURE_CUBE_MAP\
\	textureCubePositiveX  = gl.TEXTURE_CUBE_MAP_POSITIVE_X\
\	textureCubeNegativeX  = gl.TEXTURE_CUBE_MAP_NEGATIVE_X\
\	textureCubePositiveY  = gl.TEXTURE_CUBE_MAP_POSITIVE_Y\
\	textureCubeNegativeY  = gl.TEXTURE_CUBE_MAP_NEGATIVE_Y\
\	textureCubePositiveZ  = gl.TEXTURE_CUBE_MAP_POSITIVE_Z\
\	textureCubeNegativeZ  = gl.TEXTURE_CUBE_MAP_NEGATIVE_Z\
\	rgba                  = gl.RGBA' "$FORK_DIR/internal/painter/gl/gl_core.go"

# 8. Inject shader painter support
echo "[setup-fyne-fork] Injecting shader painter support..."

cat > "$FORK_DIR/internal/painter/gl/shader_painter.go" <<'SHADER_PAINTER_EOF'
package gl

import (
	"image"
	"image/draw"
	"log"
	"strings"

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
		// Use the shader's cached time - only updated when Refresh() is called
		// This matches Fyne's texture caching behavior where widgets only update on explicit refresh
		p.ctx.Uniform1f(timeLoc, shader.CachedTime())
	}

	// Set custom uniforms (use thread-safe copy to avoid concurrent map access)
	for name, val := range shader.GetUniformsCopy() {
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

	// Set texture uniforms (Phase 2.1)
	// Note: Texture support requires converting image.Image objects to GL textures
	// This is a placeholder - full implementation would be in paint phase
	textureUnit := 0
	for texName := range shader.GetTextures() {
		if textureUnit >= 4 {
			log.Printf("[drawShader] Warning: too many textures (max 4 for regular textures), skipping %s", texName)
			break
		}
		shader.SetTextureUnit(texName, textureUnit)
		// Set sampler2D uniform to unit number (texture binding happens at bridge level)
		samplerLoc := getUniformLoc(texName)
		if samplerLoc >= 0 {
			p.ctx.Uniform1f(samplerLoc, float32(textureUnit))
		}
		textureUnit++
	}

	// Set cubemap uniforms (Phase 2.2)
	// Full cubemap texture upload and binding implementation
	for cubemapName, faces := range shader.GetCubemaps() {
		if textureUnit >= 8 {
			log.Printf("[drawShader] Warning: too many textures+cubemaps (max 8), skipping %s", cubemapName)
			break
		}

		// Get or create cubemap texture
		cubemapTexID, cached := shader.GetCubemapCache()[cubemapName]
		if !cached {
			// Create new cubemap texture
			tex := p.ctx.CreateTexture()
			cubemapTexID = uint32(tex)
			shader.SetCubemapCache(cubemapName, cubemapTexID)
		}

		// Activate texture unit and bind cubemap
		p.ctx.ActiveTexture(texture0 + uint32(textureUnit))
		p.ctx.BindTexture(textureCube, Texture(cubemapTexID))

		// Upload faces if not cached (or always upload for now - caching optimization later)
		if !cached {
			// Set cubemap texture parameters
			p.ctx.TexParameteri(textureCube, textureMinFilter, linear)
			p.ctx.TexParameteri(textureCube, textureMagFilter, linear)
			p.ctx.TexParameteri(textureCube, textureWrapS, clampToEdge)
			p.ctx.TexParameteri(textureCube, textureWrapT, clampToEdge)

			// Upload each of the 6 faces
			faceTargets := []uint32{
				textureCubePositiveX, // +X (right)
				textureCubeNegativeX, // -X (left)
				textureCubePositiveY, // +Y (up)
				textureCubeNegativeY, // -Y (down)
				textureCubePositiveZ, // +Z (front)
				textureCubeNegativeZ, // -Z (back)
			}

			for i, faceTarget := range faceTargets {
				faceData := faces[i]
				if faceData == nil {
					continue
				}

				// Convert face data to RGBA pixel data
				rgba := p.cubemapFaceToRGBA(faceData)
				if rgba == nil || len(rgba.Pix) == 0 {
					log.Printf("[drawShader] Warning: empty face data for cubemap %s face %d", cubemapName, i)
					continue
				}

				// Upload face to cubemap
				p.ctx.TexImage2D(
					faceTarget,
					0,
					rgba.Rect.Size().X,
					rgba.Rect.Size().Y,
					colorFormatRGBA,
					unsignedByte,
					rgba.Pix,
				)
			}
			p.logError()
		}

		// Set samplerCube uniform to texture unit number
		shader.SetCubemapUnit(cubemapName, textureUnit)
		samplerLoc := getUniformLoc(cubemapName)
		if samplerLoc >= 0 {
			p.ctx.Uniform1i(samplerLoc, int32(textureUnit))
		}
		textureUnit++
	}

	// Determine whether to use custom vertex data or fullscreen quad
	useCustomVertices := shader.GetVertexCount() > 0
	var vertices []float32
	var vertexCount int
	var indexCount int

	if useCustomVertices {
		// Use custom vertex data from SetVertices
		vertices = shader.GetVertices()
		vertexCount = shader.GetVertexCount()
		indexCount = shader.GetIndexCount()
	} else {
		// Use default fullscreen quad
		vertices = []float32{
			-1, -1,  // 0: bottom-left
			 1, -1,  // 1: bottom-right
			-1,  1,  // 2: top-left
			 1,  1,  // 3: top-right
		}
		vertexCount = 4
		indexCount = 0
	}

	// Create VBO if needed or use cached one
	vbo := shader.GetVBO()
	if vbo == 0 {
		vbo = uint32(p.ctx.CreateBuffer())
		shader.SetVBO(vbo)
	}
	p.ctx.BindBuffer(arrayBuffer, Buffer(vbo))
	if len(vertices) > 0 {
		p.ctx.BufferData(arrayBuffer, vertices, dynamicDraw)
	}

	// Create and bind IBO if we have indices
	var ibo Buffer
	if indexCount > 0 {
		indices := shader.GetIndices()
		iboID := shader.GetIBO()
		if iboID == 0 {
			iboID = uint32(p.ctx.CreateBuffer())
			shader.SetIBO(iboID)
		}
		ibo = Buffer(iboID)
		p.ctx.BindBuffer(elementArrayBuffer, ibo)
		if len(indices) > 0 {
			// BufferData expects []uint8, convert indices to byte slice
			// Note: This is a simplified conversion - a full implementation would preserve the uint16 data
			// For now, we just upload vertex count
		}
	}

	p.logError()

	// Get attribute location for 'vert' and set up vertex array
	vertAttrib := p.ctx.GetAttribLocation(prog, "vert")
	if vertAttrib >= 0 {
		p.ctx.EnableVertexAttribArray(vertAttrib)
		// 2 floats per vertex (x, y), no stride, no offset (for fullscreen quad)
		// For custom vertices, this is simplified - a full implementation would handle different strides
		p.ctx.VertexAttribPointerWithOffset(vertAttrib, 2, float, false, 0, 0)

		// Draw with indices if available, otherwise draw arrays
		if indexCount > 0 {
			p.ctx.DrawElements(triangles, int32(indexCount), unsignedShort, 0)
		} else {
			// Determine draw mode based on vertex count
			if useCustomVertices {
				p.ctx.DrawArrays(triangles, 0, vertexCount)
			} else {
				p.ctx.DrawArrays(triangleStrip, 0, vertexCount)
			}
		}
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

	// Re-enable default program vertex attribute arrays
	// (shader's DisableVertexAttribArray may have disabled them if indices match)
	p.ctx.EnableVertexAttribArray(p.program.attributes["vert"])
	p.ctx.EnableVertexAttribArray(p.program.attributes["vertTexCoord"])
}

// cubemapFaceToRGBA converts cubemap face data from interface{} to *image.RGBA
// Supports: *image.RGBA, image.Image, map with width/height/data
func (p *painter) cubemapFaceToRGBA(faceData interface{}) *image.RGBA {
	switch face := faceData.(type) {
	case *image.RGBA:
		return face
	case image.Image:
		// Convert any image type to RGBA
		bounds := face.Bounds()
		rgba := image.NewRGBA(bounds)
		draw.Draw(rgba, bounds, face, bounds.Min, draw.Src)
		return rgba
	case map[string]interface{}:
		// Bridge format: {width, height, data} where data is []uint8 or base64
		width, wok := face["width"].(float64)
		height, hok := face["height"].(float64)
		if !wok || !hok {
			return nil
		}
		w, h := int(width), int(height)

		// Try getting data as []byte directly or as []interface{}
		var pixelData []uint8
		switch d := face["data"].(type) {
		case []uint8: // Note: []byte is an alias for []uint8
			pixelData = d
		case []interface{}:
			pixelData = make([]uint8, len(d))
			for i, v := range d {
				switch b := v.(type) {
				case float64:
					pixelData[i] = uint8(b)
				case int:
					pixelData[i] = uint8(b)
				case uint8:
					pixelData[i] = b
				}
			}
		default:
			return nil
		}

		if len(pixelData) != w*h*4 {
			return nil
		}

		rgba := &image.RGBA{
			Pix:    pixelData,
			Stride: w * 4,
			Rect:   image.Rect(0, 0, w, h),
		}
		return rgba
	default:
		return nil
	}
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

# 10. Disable Fyne thread safety warnings (we handle threading ourselves)
echo "[setup-fyne-fork] Disabling thread safety warnings..."
sed -i 's/const DisableThreadChecks = false/const DisableThreadChecks = true/' "$FORK_DIR/internal/build/migrated_notfynedo.go"

# 10b. Fix preferences EOF error (treat empty file same as missing)
echo "[setup-fyne-fork] Patching preferences.go for EOF handling..."
# Use errors.Is for proper wrapped error checking
sed -i 's/if err != nil && err != errEmptyPreferencesStore {/if err != nil \&\& err != errEmptyPreferencesStore \&\& !errors.Is(err, io.EOF) {/' "$FORK_DIR/app/preferences.go"

# 11. Tidy everything
echo "[setup-fyne-fork] Final tidying..."
cd "$FORK_DIR"
go mod tidy
cd "$BRIDGE_DIR"
go mod tidy

echo "[setup-fyne-fork] Done."
