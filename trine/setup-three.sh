#!/bin/bash
# Setup script for three.js with Tsyne patch
# Clones three.js and applies the canvas factory patch
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THREE_DIR="$SCRIPT_DIR/../three"
THREE_VERSION="${THREE_VERSION:-dev}"  # Branch/tag to clone (three.js uses 'dev' as main branch)
THREE_TESTED_VERSION="0.182.0"        # Last version verified working with Tsyne

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

# Check version
CLONED_VERSION=$(node -p "require('$THREE_DIR/package.json').version" 2>/dev/null || echo "unknown")
if [ "$CLONED_VERSION" != "$THREE_TESTED_VERSION" ]; then
    echo "WARNING: Cloned three.js version $CLONED_VERSION differs from tested version $THREE_TESTED_VERSION"
    echo "  Patches may not apply cleanly. If issues arise, try: THREE_VERSION=dev ./setup-three.sh"
fi

# Apply patches
echo "Applying Tsyne patch..."
patch -p1 -d "$THREE_DIR" < "$SCRIPT_DIR/patches/utils.js.patch"

echo ""
echo "=== three.js setup complete ==="
echo "Location: $THREE_DIR"
echo "Branch: $THREE_VERSION"
echo "Version: $CLONED_VERSION (tested: $THREE_TESTED_VERSION)"
echo ""
echo "The patch adds a hook in createCanvasElement() that checks for"
echo "globalThis.__tsyneCanvasFactory before creating a browser canvas."
echo ""
echo "Integration code is in trine/integration/ (not copied to three/)"
