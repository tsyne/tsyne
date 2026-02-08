#!/bin/bash
set -e

# NOTE: This script injects Go code into the Fyne fork to add GPU shader support.
# The Go source code is stored in fyne-patches/*.go.txt files for easier editing.
# Files:
#   - fyne-patches/shader.go.txt: Core Shader type, constructor, uniforms
#   - fyne-patches/shader_buffers.go.txt: Geometry, textures, attribute buffers
#   - fyne-patches/shader_hoverable.go.txt: HoverableShader + render command queue
#   - fyne-patches/shader_painter.go.txt: drawShader main render function
#   - fyne-patches/shader_painter_compile.go.txt: Shader compilation helpers
#   - fyne-patches/shader_painter_texture.go.txt: Texture conversion helpers
#   - fyne-patches/gl_*_additions.go.txt: GL context method additions
#   - fyne-patches/blend_mode.go.txt: BlendMode type definition
#   - fyne-patches/blend_mode_methods.go.txt: SetBlendMode methods for canvas types

# Configuration
BRIDGE_DIR=$(dirname "$(realpath "$0")")
FORK_DIR="$BRIDGE_DIR/fyne-fork"
PATCHES_DIR="$BRIDGE_DIR/fyne-patches"
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
    sed -i 's|^replace fyne.io/fyne/v2|// SETUP_TEMP: replace fyne.io/fyne/v2|' go.mod
    go get "fyne.io/fyne/v2@$FYNE_VERSION"
    sed -i 's|^// SETUP_TEMP: replace fyne.io/fyne/v2|replace fyne.io/fyne/v2|' go.mod
fi

echo "[setup-fyne-fork] Copying Fyne source from $FYNE_SRC_DIR..."
mkdir -p "$FORK_DIR"
cp -rp "$FYNE_SRC_DIR/"* "$FORK_DIR/"
chmod -R +w "$FORK_DIR"

# 3. Initial go mod tidy
echo "[setup-fyne-fork] Initial tidying of fork..."
cd "$FORK_DIR"
go mod tidy

# 4. Inject Shader canvas primitive (split across 3 files)
echo "[setup-fyne-fork] Injecting Shader canvas primitive..."
cp "$PATCHES_DIR/shader.go.txt" "$FORK_DIR/canvas/shader.go"
cp "$PATCHES_DIR/shader_buffers.go.txt" "$FORK_DIR/canvas/shader_buffers.go"
cp "$PATCHES_DIR/shader_hoverable.go.txt" "$FORK_DIR/canvas/shader_hoverable.go"

# 4b. Inject BlendMode type and methods
echo "[setup-fyne-fork] Injecting BlendMode support..."
cp "$PATCHES_DIR/blend_mode.go.txt" "$FORK_DIR/canvas/blend_mode.go"
cp "$PATCHES_DIR/blend_mode_methods.go.txt" "$FORK_DIR/canvas/blend_mode_methods.go"

# 5. Fix transparent color check in draw.go
echo "[setup-fyne-fork] Patching draw.go to fix transparent color check..."
if [ -f "$FORK_DIR/internal/painter/gl/draw.go" ]; then
    sed -i 's/if rect.FillColor == nil {/if rect.FillColor == nil \&\& rect.StrokeColor == nil {/' "$FORK_DIR/internal/painter/gl/draw.go" 2>/dev/null || true
fi

# 6. Add shader-related methods to GL context interface
echo "[setup-fyne-fork] Adding shader-related methods to GL context..."
sed -i '/Viewport(x, y, width, height int)/a\
\	DrawElements(mode uint32, count int32, typ uint32, offset int)\
\	BufferDataUint16(target uint32, data []uint16, usage uint32)\
\	DepthFunc(fn uint32)\
\	DepthMask(flag bool)\
\	CullFace(mode uint32)\
\	FrontFace(mode uint32)\
\	Uniform1i(uniform Uniform, v int32)\
\	Uniform3f(uniform Uniform, v0, v1, v2 float32)\
\	UniformMatrix3fv(uniform Uniform, transpose bool, value []float32)\
\	UniformMatrix4fv(uniform Uniform, transpose bool, value []float32)\
\	DisableVertexAttribArray(attribute Attribute)\
\	CreateFramebuffer() Framebuffer\
\	DeleteFramebuffer(fb Framebuffer)\
\	BindFramebuffer(target uint32, fb Framebuffer)\
\	FramebufferTexture2D(target, attachment, textarget uint32, texture Texture, level int)\
\	CreateRenderbuffer() Renderbuffer\
\	DeleteRenderbuffer(rb Renderbuffer)\
\	BindRenderbuffer(target uint32, rb Renderbuffer)\
\	RenderbufferStorage(target, internalformat uint32, width, height int)\
\	FramebufferRenderbuffer(target, attachment, rbtarget uint32, rb Renderbuffer)\
\	CheckFramebufferStatus(target uint32) uint32\
\	ColorMask(r, g, b, a bool)\
\	ClearDepthf(depth float32)\
\	DrawBuffers(bufs []uint32)\
\	TexImage2DEmpty(target uint32, level int, internalformat uint32, width, height int, format, typ uint32)' "$FORK_DIR/internal/painter/gl/context.go"

# 6b. Add Framebuffer and Renderbuffer types to gl_core.go and gl_es.go
echo "[setup-fyne-fork] Adding FBO types..."
sed -i '/Uniform int32/a\
\	// Framebuffer represents a GL framebuffer object\
\	Framebuffer uint32\
\	// Renderbuffer represents a GL renderbuffer object\
\	Renderbuffer uint32' "$FORK_DIR/internal/painter/gl/gl_core.go"

sed -i '/Uniform int32/a\
\	// Framebuffer represents a GL framebuffer object\
\	Framebuffer uint32\
\	// Renderbuffer represents a GL renderbuffer object\
\	Renderbuffer uint32' "$FORK_DIR/internal/painter/gl/gl_es.go"

# For gomobile, add Framebuffer/Renderbuffer types (using gl types)
sed -i '/Uniform gl.Uniform/a\
\	// Framebuffer represents a GL framebuffer object\
\	Framebuffer gl.Framebuffer\
\	// Renderbuffer represents a GL renderbuffer object\
\	Renderbuffer gl.Renderbuffer' "$FORK_DIR/internal/painter/gl/gl_gomobile.go"

# 7. Add GL method implementations
echo "[setup-fyne-fork] Adding GL method implementations..."
cat "$PATCHES_DIR/gl_core_additions.go.txt" >> "$FORK_DIR/internal/painter/gl/gl_core.go"

# Add GL constants to gl_core.go
sed -i '/float.*=.*gl\.FLOAT/a\
\	textureCube             = gl.TEXTURE_CUBE_MAP\
\	textureCubeMap          = gl.TEXTURE_CUBE_MAP\
\	textureCubePositiveX    = gl.TEXTURE_CUBE_MAP_POSITIVE_X\
\	textureCubeNegativeX    = gl.TEXTURE_CUBE_MAP_NEGATIVE_X\
\	textureCubePositiveY    = gl.TEXTURE_CUBE_MAP_POSITIVE_Y\
\	textureCubeNegativeY    = gl.TEXTURE_CUBE_MAP_NEGATIVE_Y\
\	textureCubePositiveZ    = gl.TEXTURE_CUBE_MAP_POSITIVE_Z\
\	textureCubeNegativeZ    = gl.TEXTURE_CUBE_MAP_NEGATIVE_Z\
\	colorBufferBit          = gl.COLOR_BUFFER_BIT\
\	depthBufferBit          = gl.DEPTH_BUFFER_BIT\
\	depthTest               = gl.DEPTH_TEST\
\	lequal                  = gl.LEQUAL\
\	cullFace                = gl.CULL_FACE\
\	backFace                = gl.BACK\
\	ccw                     = gl.CCW\
\	rgba                    = gl.RGBA\
\	linear                  = gl.LINEAR\
\	dynamicDraw             = gl.DYNAMIC_DRAW\
\	elementArrayBuffer      = gl.ELEMENT_ARRAY_BUFFER\
\	unsignedShort           = gl.UNSIGNED_SHORT\
\	programPointSize        = gl.VERTEX_PROGRAM_POINT_SIZE\
\	framebuffer             = gl.FRAMEBUFFER\
\	drawFramebuffer         = gl.DRAW_FRAMEBUFFER\
\	readFramebuffer         = gl.READ_FRAMEBUFFER\
\	renderbuffer            = gl.RENDERBUFFER\
\	colorAttachment0        = gl.COLOR_ATTACHMENT0\
\	depthAttachment         = gl.DEPTH_ATTACHMENT\
\	depthComponent    uint32 = 0x1902\
\	depthComponent16  uint32 = 0x81A5\
\	depthComponent24  uint32 = 0x81A6\
\	framebufferComplete     = gl.FRAMEBUFFER_COMPLETE\
\	nearest           int32  = gl.NEAREST\
\	unsignedInt       uint32 = gl.UNSIGNED_INT' "$FORK_DIR/internal/painter/gl/gl_core.go"

cat "$PATCHES_DIR/gl_es_additions.go.txt" >> "$FORK_DIR/internal/painter/gl/gl_es.go"

sed -i '/float.*=.*gl\.FLOAT/a\
\	textureCube             = gl.TEXTURE_CUBE_MAP\
\	textureCubeMap          = gl.TEXTURE_CUBE_MAP\
\	textureCubePositiveX    = gl.TEXTURE_CUBE_MAP_POSITIVE_X\
\	textureCubeNegativeX    = gl.TEXTURE_CUBE_MAP_NEGATIVE_X\
\	textureCubePositiveY    = gl.TEXTURE_CUBE_MAP_POSITIVE_Y\
\	textureCubeNegativeY    = gl.TEXTURE_CUBE_MAP_NEGATIVE_Y\
\	textureCubePositiveZ    = gl.TEXTURE_CUBE_MAP_POSITIVE_Z\
\	textureCubeNegativeZ    = gl.TEXTURE_CUBE_MAP_NEGATIVE_Z\
\	colorBufferBit          = gl.COLOR_BUFFER_BIT\
\	depthBufferBit          = gl.DEPTH_BUFFER_BIT\
\	depthTest               = gl.DEPTH_TEST\
\	lequal                  = gl.LEQUAL\
\	cullFace                = gl.CULL_FACE\
\	backFace                = gl.BACK\
\	ccw                     = gl.CCW\
\	rgba                    = gl.RGBA\
\	linear                  = gl.LINEAR\
\	dynamicDraw             = gl.DYNAMIC_DRAW\
\	elementArrayBuffer      = gl.ELEMENT_ARRAY_BUFFER\
\	unsignedShort           = gl.UNSIGNED_SHORT\
\	programPointSize  uint32 = 0x8642\
\	framebuffer       uint32 = 0x8D40\
\	drawFramebuffer   uint32 = 0x8CA9\
\	readFramebuffer   uint32 = 0x8CA8\
\	renderbuffer      uint32 = 0x8D41\
\	colorAttachment0  uint32 = 0x8CE0\
\	depthAttachment   uint32 = 0x8D00\
\	depthComponent    uint32 = 0x1902\
\	depthComponent16  uint32 = 0x81A5\
\	depthComponent24  uint32 = 0x81A6\
\	framebufferComplete uint32 = 0x8CD5\
\	nearest           int32  = 0x2600\
\	unsignedInt       uint32 = 0x1405' "$FORK_DIR/internal/painter/gl/gl_es.go"

cat "$PATCHES_DIR/gl_gomobile_additions.go.txt" >> "$FORK_DIR/internal/painter/gl/gl_gomobile.go"

sed -i '/float.*=.*gl\.Float/a\
\	textureCube             = gl.TextureCubeMap\
\	textureCubeMap          = gl.TextureCubeMap\
\	textureCubePositiveX    = gl.TextureCubeMapPositiveX\
\	textureCubeNegativeX    = gl.TextureCubeMapNegativeX\
\	textureCubePositiveY    = gl.TextureCubeMapPositiveY\
\	textureCubeNegativeY    = gl.TextureCubeMapNegativeY\
\	textureCubePositiveZ    = gl.TextureCubeMapPositiveZ\
\	textureCubeNegativeZ    = gl.TextureCubeMapNegativeZ\
\	colorBufferBit          = gl.ColorBufferBit\
\	depthBufferBit          = gl.DepthBufferBit\
\	depthTest               = gl.DepthTest\
\	lequal                  = gl.Lequal\
\	cullFace                = gl.CullFace\
\	backFace                = gl.Back\
\	ccw                     = gl.Ccw\
\	rgba                    = gl.RGBA\
\	linear                  = gl.Linear\
\	dynamicDraw             = gl.DynamicDraw\
\	elementArrayBuffer      = gl.ElementArrayBuffer\
\	unsignedShort           = gl.UnsignedShort\
\	programPointSize  uint32 = 0x8642\
\	framebuffer       uint32 = 0x8D40\
\	drawFramebuffer   uint32 = 0x8CA9\
\	readFramebuffer   uint32 = 0x8CA8\
\	renderbuffer      uint32 = 0x8D41\
\	colorAttachment0  uint32 = 0x8CE0\
\	depthAttachment   uint32 = 0x8D00\
\	depthComponent    uint32 = 0x1902\
\	depthComponent16  uint32 = 0x81A5\
\	depthComponent24  uint32 = 0x81A6\
\	framebufferComplete uint32 = 0x8CD5\
\	nearest           int32  = 0x2600\
\	unsignedInt       uint32 = 0x1405' "$FORK_DIR/internal/painter/gl/gl_gomobile.go"

# 8. Inject shader painter (split across 3 files)
echo "[setup-fyne-fork] Injecting shader painter support..."
cp "$PATCHES_DIR/shader_painter.go.txt" "$FORK_DIR/internal/painter/gl/shader_painter.go"
cp "$PATCHES_DIR/shader_painter_compile.go.txt" "$FORK_DIR/internal/painter/gl/shader_painter_compile.go"
cp "$PATCHES_DIR/shader_painter_texture.go.txt" "$FORK_DIR/internal/painter/gl/shader_painter_texture.go"

# 9. Note: painter.go doesn't need additional imports - shader_painter.go has its own

# 10. Add Shader case to draw.go
echo "[setup-fyne-fork] Adding Shader case to draw.go..."
DRAW_FILE="$FORK_DIR/internal/painter/gl/draw.go"
if [ -f "$DRAW_FILE" ]; then
    if ! grep -q '"fyne.io/fyne/v2/canvas"' "$DRAW_FILE"; then
        sed -i 's|"fyne.io/fyne/v2"|"fyne.io/fyne/v2"\n\t"fyne.io/fyne/v2/canvas"|' "$DRAW_FILE"
    fi
    if ! grep -q 'case \*canvas.Shader' "$DRAW_FILE"; then
        sed -i '/case \*canvas\.Text:/i\
\	case *canvas.Shader:\
\		p.drawShader(obj, pos, frame)\
\	case *canvas.HoverableShader:\
\		p.drawShader(obj.Shader, pos, frame)' "$DRAW_FILE"
    fi
fi

# 11. Disable thread safety warnings
echo "[setup-fyne-fork] Disabling thread safety warnings..."
if [ -f "$FORK_DIR/internal/driver/glfw/window.go" ]; then
    sed -i 's/fyne\.LogError(".*thread.*"/\/\/ DISABLED: fyne.LogError("thread warning"/' "$FORK_DIR/internal/driver/glfw/window.go" 2>/dev/null || true
fi
# NOTE: Do NOT set DisableThreadChecks = true — it is incorrect - always solve wrong-thread issues correctly

# 12. Fix Canvas.Capture() alpha on modern Linux compositors
# The default framebuffer may have near-zero alpha on Wayland/newer compositors,
# causing screenshots to appear transparent. Force alpha=255 since Fyne windows are opaque.
echo "[setup-fyne-fork] Patching capture.go for opaque alpha..."
CAPTURE_FILE="$FORK_DIR/internal/painter/gl/capture.go"
if [ -f "$CAPTURE_FILE" ]; then
    sed -i 's/A: c\.pix\[start+3\]/A: 255/' "$CAPTURE_FILE"
fi

# 13. Fix preferences EOF handling (suppress EOF errors from empty/truncated prefs file)
echo "[setup-fyne-fork] Patching app/preferences.go for EOF handling..."
PREFS_FILE="$FORK_DIR/app/preferences.go"
if [ -f "$PREFS_FILE" ]; then
    sed -i 's/if err != nil && err != errEmptyPreferencesStore {/if err != nil \&\& err != errEmptyPreferencesStore \&\& err != io.EOF {/' "$PREFS_FILE"
fi

# 14. Final tidy
echo "[setup-fyne-fork] Final tidying..."
cd "$FORK_DIR"
go mod tidy

echo "[setup-fyne-fork] Done."
