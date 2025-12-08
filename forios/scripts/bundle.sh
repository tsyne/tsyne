#!/bin/bash
# Bundle Tsyne for iOS deployment
# Works on any platform (Chromebook, Linux, Mac)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FORIOS_DIR="$(dirname "$SCRIPT_DIR")"
TSYNE_ROOT="$(dirname "$FORIOS_DIR")"
BUNDLE_DIR="$FORIOS_DIR/bundle"

echo "=== Tsyne iOS Bundler ==="
echo "Tsyne root: $TSYNE_ROOT"
echo "Bundle output: $BUNDLE_DIR"

# Clean previous bundle
echo ""
echo "Cleaning previous bundle..."
rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR/ported-apps"
mkdir -p "$BUNDLE_DIR/examples"

# Check for esbuild
if ! command -v npx &> /dev/null; then
    echo "Error: npx not found. Please install Node.js"
    exit 1
fi

# Compile TypeScript first
echo ""
echo "Compiling TypeScript..."
cd "$TSYNE_ROOT"
npx tsc --outDir "$BUNDLE_DIR/dist" --declaration false || {
    echo "Warning: TypeScript compilation had errors, continuing anyway..."
}

# Bundle the main phonetop entry point
# Externalize native modules that can't be bundled
echo ""
echo "Bundling phonetop with esbuild..."
npx esbuild "$TSYNE_ROOT/src/phonetop.ts" \
    --bundle \
    --platform=node \
    --target=node18 \
    --outfile="$BUNDLE_DIR/phonetop.bundle.js" \
    --external:@resvg/resvg-js \
    --external:isolated-vm \
    --external:@aspect-dev/* \
    --external:better-sqlite3 \
    --external:fsevents \
    --sourcemap \
    --format=cjs

# Also bundle the core tsyne library for apps that import it
echo ""
echo "Bundling tsyne library..."
npx esbuild "$TSYNE_ROOT/src/index.ts" \
    --bundle \
    --platform=node \
    --target=node18 \
    --outfile="$BUNDLE_DIR/tsyne.bundle.js" \
    --external:@resvg/resvg-js \
    --external:isolated-vm \
    --external:@aspect-dev/* \
    --external:better-sqlite3 \
    --external:fsevents \
    --sourcemap \
    --format=cjs

# Copy ported-apps (they're loaded dynamically)
echo ""
echo "Copying ported-apps..."
if [ -d "$TSYNE_ROOT/ported-apps" ]; then
    # Copy each app directory
    for app_dir in "$TSYNE_ROOT/ported-apps"/*/; do
        if [ -d "$app_dir" ]; then
            app_name=$(basename "$app_dir")
            echo "  - $app_name"
            cp -r "$app_dir" "$BUNDLE_DIR/ported-apps/"
        fi
    done
fi

# Copy examples that might be used
echo ""
echo "Copying example apps..."
for ts_file in "$TSYNE_ROOT/examples"/*.ts; do
    if [ -f "$ts_file" ]; then
        basename_file=$(basename "$ts_file")
        echo "  - $basename_file"
        cp "$ts_file" "$BUNDLE_DIR/examples/"
    fi
done

# Create a minimal package.json for nodejs-mobile
echo ""
echo "Creating package.json for nodejs-mobile..."
cat > "$BUNDLE_DIR/package.json" << 'EOF'
{
  "name": "tsyne-phonetop-ios",
  "version": "1.0.0",
  "main": "phonetop.bundle.js",
  "dependencies": {}
}
EOF

# Copy native module dependencies that nodejs-mobile needs
echo ""
echo "Checking for native module dependencies..."

# @resvg/resvg-js is needed for SVG icon rendering
# On iOS, we may need to handle this differently (pre-render SVGs or use alternative)
if [ -d "$TSYNE_ROOT/node_modules/@resvg" ]; then
    echo "  - @resvg/resvg-js (will need iOS-compatible build)"
    mkdir -p "$BUNDLE_DIR/node_modules/@resvg"
    # Note: The actual resvg binary won't work on iOS
    # We'll need to either:
    # 1. Pre-render all SVG icons to PNG at bundle time
    # 2. Use an iOS-native SVG renderer
    # For now, just note this dependency
fi

# Create a launcher script for nodejs-mobile
echo ""
echo "Creating iOS launcher..."
cat > "$BUNDLE_DIR/main.js" << 'EOF'
// Tsyne iOS Launcher
// This is the entry point for nodejs-mobile

const path = require('path');

// Set up module resolution for bundled code
const bundleDir = __dirname;

// Configure the bridge to use UDS mode (Unix Domain Sockets)
// The socket path will be in the iOS app's sandbox
process.env.TSYNE_BRIDGE_MODE = 'msgpack-uds';
process.env.TSYNE_BRIDGE_SOCKET = path.join(bundleDir, '..', 'tsyne-bridge.sock');

// Load and run phonetop
console.log('[iOS] Starting Tsyne phonetop...');
require('./phonetop.bundle.js');
EOF

# Create info file about the bundle
echo ""
echo "Creating bundle info..."
cat > "$BUNDLE_DIR/BUNDLE_INFO.json" << EOF
{
  "bundledAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "platform": "$(uname -s)",
  "nodeVersion": "$(node --version)",
  "tsyneVersion": "0.1.0",
  "contents": {
    "phonetop": "phonetop.bundle.js",
    "library": "tsyne.bundle.js",
    "portedApps": "ported-apps/",
    "examples": "examples/"
  },
  "notes": [
    "SVG icons may need pre-rendering for iOS (resvg not available)",
    "Bridge socket path configured in main.js"
  ]
}
EOF

# Summary
echo ""
echo "=== Bundle Complete ==="
echo ""
echo "Output: $BUNDLE_DIR"
echo ""
ls -la "$BUNDLE_DIR"
echo ""
echo "Ported apps:"
ls -la "$BUNDLE_DIR/ported-apps" 2>/dev/null || echo "  (none)"
echo ""
echo "Next steps:"
echo "  1. Transfer bundle to Mac"
echo "  2. Run: ./forios/scripts/build-fyne-ios.sh"
echo "  3. Run: ./forios/scripts/create-ios-project.sh"
echo "  4. Open Xcode project and deploy"
