#!/bin/bash
# simulate-android.sh - Run PhoneTop with Android-like configuration on desktop
#
# This simulates the Android environment by:
# 1. Using msgpack-uds transport (same as Android)
# 2. Running the same phonetop-bundle.js that's deployed to Android
# 3. Using the same configuration flow (bridge-config.json)
#
# Usage: ./scripts/simulate-android.sh

set -e
cd "$(dirname "$0")/.."

SOCKET_DIR="${TMPDIR:-/tmp}"
BUNDLE_PATH="android-native/app/src/main/assets/nodejs-project/phonetop-bundle.js"

echo "=== Android Simulation Mode ==="
echo "Bundle: $BUNDLE_PATH"
echo ""

# Check bundle exists
if [ ! -f "$BUNDLE_PATH" ]; then
    echo "ERROR: Bundle not found at $BUNDLE_PATH"
    echo "Run: npx esbuild ./launchers/phonetop/phonetop-android.ts --bundle ..."
    exit 1
fi

# Start the bridge in background with msgpack-uds mode
echo "Starting tsyne-bridge..."
export TSYNE_SOCKET_DIR="$SOCKET_DIR"
./core/bin/tsyne-bridge -mode msgpack-uds &
BRIDGE_PID=$!
echo "Bridge PID: $BRIDGE_PID"

# Give bridge time to create socket
sleep 2

# Find the socket path (format: tsyne-{PID}.sock)
SOCKET_PATH="$SOCKET_DIR/tsyne-${BRIDGE_PID}.sock"
echo "Socket path: $SOCKET_PATH"

# Check socket exists
if [ ! -S "$SOCKET_PATH" ]; then
    echo "ERROR: Bridge didn't create socket at $SOCKET_PATH"
    ls -la "$SOCKET_DIR"/tsyne*.sock 2>/dev/null || echo "No tsyne sockets found"
    kill $BRIDGE_PID 2>/dev/null
    exit 1
fi
echo "Socket created successfully"

# Set environment variables for Node.js (matching Android)
export TSYNE_BRIDGE_MODE="msgpack-uds"
export TSYNE_SOCKET_PATH="$SOCKET_PATH"
export TSYNE_DEBUG_TOKEN="tsyne-dev-token-sim"
export TSYNE_DEBUG_PORT="9230"

# Cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $BRIDGE_PID 2>/dev/null
    rm -f "$SOCKET_PATH"
}
trap cleanup EXIT

# Run the bundle with Node.js (simulating nodejs-mobile)
echo ""
echo "=== Starting PhoneTop (Android bundle) ==="
echo "Node version: $(node --version)"
echo ""

# Create a runner script that mimics Android's main.js
node -e "
const path = require('path');

// Set environment (already set via shell, but be explicit)
process.env.TSYNE_BRIDGE_MODE = 'msgpack-uds';
process.env.TSYNE_SOCKET_PATH = '$SOCKET_PATH';
process.env.TSYNE_DEBUG_TOKEN = 'tsyne-dev-token-sim';

console.log('[Sim] Loading phonetop bundle...');
const phonetop = require('./$BUNDLE_PATH');

console.log('[Sim] Bundle exports:', Object.keys(phonetop));

if (phonetop.app && phonetop.buildPhoneTopAndroid) {
    console.log('[Sim] Starting PhoneTop with static apps (Android mode)...');
    phonetop.app('msgpack-uds', { title: 'PhoneTop (Android Sim)' }, async (a) => {
        console.log('[Sim] App instance created, building UI...');
        await phonetop.buildPhoneTopAndroid(a, {
            baseDirectory: __dirname,
            debugPort: 9230,
            fullScreen: false,  // Use windowed mode on desktop for easier testing
            iconScale: 1.0      // Normal scale on desktop
        });
        console.log('[Sim] PhoneTop UI built!');
    });
} else {
    console.error('[Sim] Bundle missing required exports');
    process.exit(1);
}
"

echo "PhoneTop exited"
