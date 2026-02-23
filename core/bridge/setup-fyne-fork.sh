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
\	TexImage2DEmpty(target uint32, level int, internalformat uint32, width, height int, format, typ uint32)\
\	VertexAttrib1f(index uint32, x float32)\
\	VertexAttrib2f(index uint32, x, y float32)\
\	VertexAttrib3f(index uint32, x, y, z float32)\
\	VertexAttrib4f(index uint32, x, y, z, w float32)\
\	BlendFuncSeparate(srcRGB, dstRGB, srcAlpha, dstAlpha uint32)\
\	BlendEquation(mode uint32)\
\	BlendEquationSeparate(modeRGB, modeAlpha uint32)\
\	PolygonOffset(factor, units float32)\
\	LineWidth(width float32)\
\	DrawArraysInstanced(mode uint32, first, count, instancecount int32)\
\	DrawElementsInstanced(mode uint32, count int32, typ uint32, offset int, instancecount int32)\
\	VertexAttribDivisor(index uint32, divisor uint32)\
\	StencilFunc(xfunc uint32, ref int32, mask uint32)\
\	StencilOp(sfail, dpfail, dppass uint32)\
\	StencilMask(mask uint32)\
\	StencilFuncSeparate(face, xfunc uint32, ref int32, mask uint32)\
\	StencilOpSeparate(face, sfail, dpfail, dppass uint32)\
\	StencilMaskSeparate(face, mask uint32)\
\	ClearStencil(s int32)\
\	GenVertexArray() uint32\
\	BindVertexArray(vao uint32)\
\	DeleteVertexArray(vao uint32)\
\	GetVertexAttribi(index uint32, pname uint32) int32\
\	GenerateMipmap(target uint32)' "$FORK_DIR/internal/painter/gl/context.go"

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
\	isGLESBackend           = false\
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
\	isGLESBackend            = true\
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
\	isGLESBackend            = true\
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

# 11b. Fix goroutine.go stack trace to show useful caller info
# The vanilla logStackTop checks for "/fyne/" but our fork path is "/fyne-fork/",
# so it breaks at the first frame and shows goroutine.go itself instead of the real caller.
echo "[setup-fyne-fork] Fixing goroutine stack trace..."
cp "$PATCHES_DIR/goroutine_stacktrace.go.txt" "$FORK_DIR/internal/async/goroutine.go"

# 12. Fix Canvas.Capture() alpha on modern Linux compositors
# The default framebuffer may have near-zero alpha on Wayland/newer compositors,
# causing screenshots to appear transparent. Force alpha=255 since Fyne windows are opaque.
echo "[setup-fyne-fork] Patching capture.go for opaque alpha..."
CAPTURE_FILE="$FORK_DIR/internal/painter/gl/capture.go"
if [ -f "$CAPTURE_FILE" ]; then
    sed -i 's/A: c\.pix\[start+3\]/A: 255/' "$CAPTURE_FILE"
    # Remove ReadBuffer(front) — on Xwayland the compositor consumes the front buffer,
    # causing a checkerboard pattern. Default read buffer (GL_BACK) works correctly.
    sed -i '/p\.ctx\.ReadBuffer(front)/d' "$CAPTURE_FILE"
    sed -i '/p\.ctx\.ReadBuffer(backFace)/d' "$CAPTURE_FILE"
fi

# 13. Disable all file-based preferences and settings
# Fyne watches settings.json + preferences.json via fsnotify, and the system theme via
# D-Bus. None of this is needed — tsyne controls everything programmatically. The watchers
# waste FDs (causing "too many open files" in test suites) and the typed-nil watcher stored
# in an `any` field causes a nil-pointer panic on shutdown.
# Strategy: no-op watchSettings/stopWatching, no-op preferences load/save/watch,
# strip the save-triggering change listener from newPreferences().
echo "[setup-fyne-fork] Disabling file-based preferences and settings..."

# 13a. No-op watchSettings() and stopWatching() — kills fsnotify + theme watching
SETTINGS_DESKTOP="$FORK_DIR/app/settings_desktop.go"
if [ -f "$SETTINGS_DESKTOP" ]; then
    sed -i '/^func (s \*settings) watchSettings()/,/^}/ c\
func (s *settings) watchSettings() {\
}' "$SETTINGS_DESKTOP"
    sed -i '/^func (s \*settings) stopWatching()/,/^}/ c\
func (s *settings) stopWatching() {\
}' "$SETTINGS_DESKTOP"
fi

# 13b. No-op settings load() — don't read settings.json, but keep setupTheme()
#      Also remove loadFromFile() (now dead code) and its unused imports.
SETTINGS_FILE="$FORK_DIR/app/settings_file.go"
if [ -f "$SETTINGS_FILE" ]; then
    cat > "$SETTINGS_FILE" << 'GOEOF'
//go:build !wasm && !test_web_driver && !tamago && !noos && !tinygo

package app

func (s *settings) load() {
	s.setupTheme()
}
GOEOF
fi

# 13c. No-op preferences watch(), save(), load()
PREFS_FILE="$FORK_DIR/app/preferences.go"
if [ -f "$PREFS_FILE" ]; then
    # No-op save() — keep in-memory data, just don't write to disk
    sed -i '/^func (p \*preferences) save() error/,/^}/ c\
func (p *preferences) save() error {\
\treturn nil\
}' "$PREFS_FILE"
    # No-op load() — don't read from disk
    sed -i '/^func (p \*preferences) load()/,/^}/ c\
func (p *preferences) load() {\
}' "$PREFS_FILE"
    # Strip the change listener and watch() call from newPreferences() —
    # replace everything after "p.needsSaveBeforeExit = true" up to the final "return p"
    # with just "return p"
    sed -i '/p\.needsSaveBeforeExit = true/,/p\.watch()/{
        /p\.needsSaveBeforeExit/d
        /p\.watch()/!d
        s/p\.watch()//
    }' "$PREFS_FILE"
fi
PREFS_OTHER="$FORK_DIR/app/preferences_other.go"
if [ -f "$PREFS_OTHER" ]; then
    sed -i '/^func (p \*preferences) watch()/,/^}/ c\
func (p *preferences) watch() {\
}' "$PREFS_OTHER"
fi

# 14b. Add Move(Position) to Window interface and implementations
echo "[setup-fyne-fork] Adding Window.Move(Position) support..."
WINDOW_IFACE="$FORK_DIR/window.go"
if [ -f "$WINDOW_IFACE" ]; then
    sed -i '/CenterOnScreen()/a\\n\t// Move positions the window at the specified coordinates.\n\tMove(Position)' "$WINDOW_IFACE"
fi
# GLFW desktop — real implementation via viewport.SetPos
WINDOW_DESKTOP="$FORK_DIR/internal/driver/glfw/window_desktop.go"
if [ -f "$WINDOW_DESKTOP" ]; then
    sed -i '/^func (w \*window) CenterOnScreen/i\
func (w *window) Move(pos fyne.Position) {\
\tif build.IsWayland {\
\t\treturn\
\t}\
\tw.runOnMainWhenCreated(func() {\
\t\tw.viewport.SetPos(int(pos.X), int(pos.Y))\
\t})\
}\
' "$WINDOW_DESKTOP"
fi
# No-op stubs for other Window implementations
for STUB_FILE in \
    "$FORK_DIR/internal/driver/glfw/window_wasm.go" \
    "$FORK_DIR/internal/driver/mobile/window.go" \
    "$FORK_DIR/test/window.go" \
    "$FORK_DIR/internal/driver/embedded/window.go"; do
    if [ -f "$STUB_FILE" ]; then
        sed -i '/CenterOnScreen/,/^}/{ /^}/a\
func (w *window) Move(pos fyne.Position) {}
        }' "$STUB_FILE" 2>/dev/null || true
    fi
done
# The embedded driver uses noosWindow not window
if [ -f "$FORK_DIR/internal/driver/embedded/window.go" ]; then
    sed -i 's/func (w \*window) Move(pos fyne.Position)/func (w *noosWindow) Move(pos fyne.Position)/' "$FORK_DIR/internal/driver/embedded/window.go" 2>/dev/null || true
fi
# The wasm file also has wrapInner type
if [ -f "$FORK_DIR/internal/driver/glfw/window_wasm.go" ]; then
    # Add stub for wrapInner too
    echo 'func (w *wrapInner) Move(pos fyne.Position) {}' >> "$FORK_DIR/internal/driver/glfw/window_wasm.go"
fi

# 15b. Fix Clip.MinSize() to delegate to Content instead of hardcoded (1,1)
# Without this, a Clip inside a VBox only gets 1px of height allocated.
CLIP_FILE="$FORK_DIR/container/clip.go"
if [ -f "$CLIP_FILE" ]; then
    sed -i '/^\/\/ MinSize for a Clip/,/^}/ c\
// MinSize returns the Content'\''s MinSize so that parent layouts (e.g. VBox)\
// allocate the correct space for the clipped region.\
func (c *Clip) MinSize() fyne.Size {\
\tc.ExtendBaseWidget(c)\
\tif c.Content != nil {\
\t\treturn c.Content.MinSize()\
\t}\
\treturn fyne.NewSize(1, 1)\
}' "$CLIP_FILE"
fi

# 16. Embedded driver compatibility (Android, PostmarketOS, future iOS)
# See fyne-patches/embedded-driver-compat.diff for original diff reference.
# - app_embedded.go: NewEmbedded() constructor + embeddedClipboard (new file)
# - driver.go: SetMainGoroutine() so Fyne's goroutine checker accepts the embedded run loop
# - touchscreen.go: Increase tapSecondaryDelay for slower touchscreens
echo "[setup-fyne-fork] Adding embedded driver compatibility..."
cp "$PATCHES_DIR/app_embedded.go.txt" "$FORK_DIR/app/app_embedded.go"

EMBEDDED_DRIVER="$FORK_DIR/internal/driver/embedded/driver.go"
if [ -f "$EMBEDDED_DRIVER" ]; then
    sed -i '/^func (n \*noosDriver) doRun() {/a\
\tasync.SetMainGoroutine()' "$EMBEDDED_DRIVER"
    # Nil-window guard: skip events when no windows exist yet (needed for Android
    # where touch events can arrive before the first window is created)
    sed -i '/w := n\.wins\[n\.current\]\.(\*noosWindow)/i\
\t\t\tif len(n.wins) == 0 || n.current >= len(n.wins) {\
\t\t\t\tcontinue // no windows yet, ignore event\
\t\t\t}\
' "$EMBEDDED_DRIVER"
fi

TOUCHSCREEN="$FORK_DIR/internal/driver/embedded/touchscreen.go"
if [ -f "$TOUCHSCREEN" ]; then
    sed -i 's/tapSecondaryDelay   = 300 \* time\.Millisecond/tapSecondaryDelay   = 2000 * time.Millisecond/' "$TOUCHSCREEN"
fi

# 17. Final tidy
echo "[setup-fyne-fork] Final tidying..."
cd "$FORK_DIR"
go mod tidy

echo "[setup-fyne-fork] Done."
