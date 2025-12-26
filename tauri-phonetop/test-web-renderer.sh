#!/bin/bash
# Test the web renderer without Tauri
# Opens phonetop in web-renderer mode and the HTML in a browser

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TSYNE_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== Testing Web Renderer ==="
echo "Starting phonetop with TSYNE_BRIDGE_MODE=web-renderer..."

# Start phonetop in background
cd "$TSYNE_ROOT"
TSYNE_BRIDGE_MODE=web-renderer npx tsx phone-apps/phonetop.ts &
PHONETOP_PID=$!

echo "Phonetop PID: $PHONETOP_PID"
echo "Waiting for WebSocket server to start..."
sleep 3

# Open the HTML in a browser
echo "Opening renderer in browser..."
xdg-open "$SCRIPT_DIR/dist/index.html" 2>/dev/null || \
  firefox "$SCRIPT_DIR/dist/index.html" 2>/dev/null || \
  google-chrome "$SCRIPT_DIR/dist/index.html" 2>/dev/null || \
  echo "Please open $SCRIPT_DIR/dist/index.html in a browser"

echo ""
echo "Press Ctrl+C to stop..."

# Wait for Ctrl+C
trap "kill $PHONETOP_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait $PHONETOP_PID
