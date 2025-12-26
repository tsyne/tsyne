#!/bin/bash
# Run Phonetop with Tauri frontend
#
# This script starts the Node.js backend (phonetop.ts with web-renderer mode)
# and the Tauri window to display the UI.
#
# Usage: ./run-phonetop.sh [--appimage|--dev]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TSYNE_ROOT="$(dirname "$SCRIPT_DIR")"

MODE="${1:-dev}"

cleanup() {
    echo "[Phonetop] Shutting down..."
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "=== Phonetop Tauri ==="
echo "Mode: $MODE"
echo ""

# Start backend (Node.js with web-renderer bridge)
echo "[1/2] Starting Node.js backend..."
cd "$TSYNE_ROOT"
TSYNE_BRIDGE_MODE=web-renderer npx tsx phone-apps/phonetop.ts &
BACKEND_PID=$!

# Wait for WebSocket server to be ready
sleep 3

if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "[ERROR] Backend failed to start"
    exit 1
fi

echo "[1/2] Backend started (PID: $BACKEND_PID)"

# Start frontend
echo "[2/2] Starting Tauri frontend..."
cd "$SCRIPT_DIR"

case "$MODE" in
    --appimage)
        ./src-tauri/target/release/bundle/appimage/Phonetop_1.0.0_amd64.AppImage &
        FRONTEND_PID=$!
        ;;
    --dev|*)
        npx tauri dev &
        FRONTEND_PID=$!
        ;;
esac

echo "[2/2] Frontend started (PID: $FRONTEND_PID)"
echo ""
echo "Phonetop is running. Press Ctrl+C to stop."
echo "Backend WebSocket: ws://localhost:9876"
echo ""

# Wait for either process to exit
wait $BACKEND_PID $FRONTEND_PID
cleanup
