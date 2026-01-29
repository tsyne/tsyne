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

# 5. Inject renderhook package
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

# 8. Patch painter.go
echo "[setup-fyne-fork] Patching painter.go..."
cd "$BRIDGE_DIR"
# Ensure bridge go.mod is consistent with the new fork state before running tools
go mod tidy
go run tools/patch-fyne/main.go \
    -file "$FORK_DIR/internal/painter/gl/painter.go" \
    -out "$FORK_DIR/internal/painter/gl/painter.go"

# 9. Tidy everything
echo "[setup-fyne-fork] Final tidying..."
cd "$FORK_DIR"
go mod tidy
cd "$BRIDGE_DIR"
go mod tidy

echo "[setup-fyne-fork] Done."
