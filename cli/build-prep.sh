#!/bin/bash
# Prepare embedded resources for tsyne standalone executable
#
# This script downloads Node.js and prepares the tsyne runtime
# for embedding into the Rust binary.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
EMBED_DIR="$SCRIPT_DIR/embed"

NODE_VERSION="22.17.0"
NODE_DIST="node-v${NODE_VERSION}-linux-x64"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_DIST}.tar.gz"

echo "[build-prep] Preparing tsyne standalone executable build..."

# Create embed directory
mkdir -p "$EMBED_DIR"
cd "$EMBED_DIR"

# Download Node.js if not already present
if [ ! -d "$NODE_DIST" ]; then
    echo "[build-prep] Downloading Node.js v${NODE_VERSION}..."
    if [ ! -f "node.tar.gz" ]; then
        curl -L "$NODE_URL" -o node.tar.gz
    fi

    echo "[build-prep] Extracting Node.js..."
    tar -xzf node.tar.gz
    rm node.tar.gz
fi

# Copy tsyne runtime (must be built first)
echo "[build-prep] Copying tsyne runtime..."
mkdir -p runtime/tsyne
cp -r "$PROJECT_ROOT/dist" runtime/tsyne/
cp "$PROJECT_ROOT/package.json" runtime/tsyne/

# Copy node_modules
echo "[build-prep] Copying tsyne dependencies..."
mkdir -p runtime/node_modules
cp -r "$PROJECT_ROOT/node_modules"/* runtime/node_modules/ 2>/dev/null || true

# Copy tsyne-bridge
echo "[build-prep] Copying tsyne-bridge..."
cp "$PROJECT_ROOT/bin/tsyne-bridge" runtime/

echo "[build-prep] Embedded resources ready!"
echo ""
echo "Contents:"
echo "  - Node.js binary: $NODE_DIST/bin/node ($(du -sh "$NODE_DIST" | cut -f1))"
echo "  - Tsyne runtime: runtime/ ($(du -sh runtime | cut -f1))"
echo ""
echo "Ready to build with: cargo build --release"
