#!/bin/bash
# pixel-iterate.sh - Quick iteration cycle for Pixel 3a XL (postmarketOS) development
#
# This script performs a complete sync-deploy-test cycle:
#   1. Sync TypeScript source to Pixel via rsync/SSH
#   2. Kill any existing PhoneTop/bridge processes
#   3. Start PhoneTop with debug server enabled
#   4. Capture screenshot via HTTP debug server
#
# Unlike J5 (Android), Pixel runs TypeScript directly via tsx (no bundling needed)
#
# Prerequisites:
#   - Pixel connected via USB networking (172.16.42.1)
#   - SSH access configured (sshpass for automation)
#   - Node.js/npm installed on Pixel
#
# Output:
#   - device-screenshots/pixel-latest.png
#
# Usage:
#   ./pixel-iterate.sh
#
set -e
cd "$(dirname "$0")"

# Pixel connection config (via USB networking)
PIXEL_IP="${PIXEL_IP:-172.16.42.1}"
PIXEL_USER="${PIXEL_USER:-paul}"
PIXEL_PASS="${PIXEL_PASS:-147147}"
DEBUG_PORT="${DEBUG_PORT:-9229}"
DEBUG_TOKEN="${TSYNE_DEBUG_TOKEN:-tsyne-dev-token-pixel}"

export SSHPASS="$PIXEL_PASS"

# Helper for SSH commands
pixel_ssh() {
    sshpass -e ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 "${PIXEL_USER}@${PIXEL_IP}" "$@"
}

# Step 1: Sync source to Pixel
# Uses rsync over SSH - only transfers changed files
# Excludes node_modules, build artifacts, and git
echo "=== Syncing source to Pixel ==="
sshpass -e rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'android-native' \
    --exclude 'device-screenshots' \
    --exclude '*.log' \
    --exclude 'dist' \
    --exclude 'bin' \
    -e "ssh -o StrictHostKeyChecking=no" \
    ./ "${PIXEL_USER}@${PIXEL_IP}:~/tsyne/" 2>&1 | tail -3

# Step 2: Kill existing processes
# Stop any running PhoneTop or bridge processes for clean state
# Kill screen session and any node processes
echo "=== Stopping existing processes ==="
pixel_ssh "screen -S phonetop -X quit 2>/dev/null; killall tsyne-bridge 2>/dev/null; killall node 2>/dev/null; true"
sleep 1

# Step 3: Start PhoneTop with debug server
# Runs in background with DISPLAY set for Wayland/X11
# Debug server enables HTTP screenshot capture
# Note: ssh -f puts SSH itself in background after command starts
echo "=== Starting PhoneTop ==="
sshpass -e ssh -f -o StrictHostKeyChecking=no "${PIXEL_USER}@${PIXEL_IP}" \
    "cd ~/tsyne && DISPLAY=:0 TSYNE_DEBUG_PORT=${DEBUG_PORT} TSYNE_DEBUG_TOKEN=${DEBUG_TOKEN} npx tsx phone-apps/phonetop.ts > /tmp/phonetop.log 2>&1"
echo "Started on Pixel"

# Step 4: Wait for app to initialize
# Pixel needs time for: npm resolution, tsx compilation, bridge init, UI render
echo "Waiting for app to initialize..."
sleep 10

# Step 5: Capture screenshot via HTTP debug server
# Direct HTTP request to Pixel IP (no port forwarding needed)
echo "=== Capturing screenshot ==="
export TSYNE_DEBUG_TOKEN="$DEBUG_TOKEN"
./capture-device-screenshots.sh pixel 2>&1 | grep -E "Saved|failed"

echo "=== Done: device-screenshots/pixel-latest.png ==="
