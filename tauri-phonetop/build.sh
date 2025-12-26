#!/bin/bash
# Build Tauri Phonetop distribution for Linux x86_64
#
# This script:
# 1. Installs dependencies
# 2. Builds the Tauri app
# 3. Outputs the distribution to src-tauri/target/release/bundle

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Building Tauri Phonetop ==="
echo "Date: $(date)"
echo ""

# Install npm dependencies
echo "[1/4] Installing npm dependencies..."
npm install

# Install Tauri dependencies if needed
echo "[2/4] Installing ws in core (if needed)..."
cd ../core
npm install ws @types/ws 2>/dev/null || true
cd "$SCRIPT_DIR"

# Update Tauri config for production
echo "[3/4] Updating Tauri config..."
cat > src-tauri/tauri.conf.json << 'EOF'
{
  "$schema": "../node_modules/@tauri-apps/cli/config.schema.json",
  "productName": "Phonetop",
  "version": "1.0.0",
  "identifier": "com.tsyne.phonetop",
  "build": {
    "frontendDist": "../dist",
    "beforeBuildCommand": "",
    "beforeDevCommand": ""
  },
  "app": {
    "windows": [
      {
        "title": "Phonetop",
        "width": 400,
        "height": 800,
        "resizable": true,
        "fullscreen": false,
        "decorations": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": ["deb", "appimage"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "resources": [
      "../dist/*"
    ],
    "linux": {
      "appId": "com.tsyne.phonetop"
    }
  }
}
EOF

# Build Tauri
echo "[4/4] Building Tauri app..."
npx tauri build

echo ""
echo "=== Build Complete ==="
echo "Output files:"
ls -la src-tauri/target/release/bundle/*/ 2>/dev/null || echo "Check src-tauri/target/release/"
