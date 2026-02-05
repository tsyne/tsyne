#!/bin/bash
# Setup script for three.js with Tsyne patch
# Clones three.js and applies the canvas factory patch
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THREE_DIR="$SCRIPT_DIR/../three"
THREE_VERSION="${THREE_VERSION:-dev}"  # Can override with env var

echo "=== Setting up three.js ($THREE_VERSION) with Tsyne patch ==="

# Clean existing
if [ -d "$THREE_DIR" ]; then
    echo "Removing existing three/ directory..."
    rm -rf "$THREE_DIR"
fi

# Clone three.js (shallow clone for speed)
echo "Cloning three.js $THREE_VERSION..."
git clone --depth=1 --branch "$THREE_VERSION" \
    https://github.com/mrdoob/three.js.git "$THREE_DIR"

# Remove .git to avoid nested repo issues
rm -rf "$THREE_DIR/.git"

# Apply patches
echo "Applying Tsyne patch..."
patch -p1 -d "$THREE_DIR" < "$SCRIPT_DIR/patches/utils.js.patch"

echo ""
echo "=== three.js setup complete ==="
echo "Location: $THREE_DIR"
echo "Version: $THREE_VERSION"
echo ""
echo "The patch adds a hook in createCanvasElement() that checks for"
echo "globalThis.__tsyneCanvasFactory before creating a browser canvas."
echo ""
echo "Integration code is in tsyne-three/integration/ (not copied to three/)"
