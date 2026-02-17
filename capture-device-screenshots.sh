#!/bin/bash
# Capture screenshots from both deployment targets
# Usage: ./capture-device-screenshots.sh [pixel|android|both]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCREENSHOT_DIR="${SCRIPT_DIR}/device-screenshots"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Device configs
PIXEL_IP="${PIXEL_IP:-172.16.42.1}"
PIXEL_USER="${PIXEL_USER:-paul}"
PIXEL_PASS="${PIXEL_PASS:-147147}"

# Debug server ports (for remote control API screenshot)
DEBUG_PORT="${DEBUG_PORT:-9229}"
# Debug server authentication token (must match TSYNE_DEBUG_TOKEN on device)
DEBUG_TOKEN="${TSYNE_DEBUG_TOKEN:-}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

mkdir -p "$SCREENSHOT_DIR"

# Check connectivity
check_pixel() {
    ping -c 1 -W 2 "$PIXEL_IP" &>/dev/null
}

check_android() {
    adb devices 2>/dev/null | grep -q "device$"
}

# Capture via HTTP debug server (works on any platform with PhoneTop running)
# Usage: capture_http <host> <port> <output_file>
capture_http() {
    local host="$1"
    local port="$2"
    local output="$3"

    if [ -z "$DEBUG_TOKEN" ]; then
        echo -e "${RED}TSYNE_DEBUG_TOKEN not set - required for HTTP screenshot${NC}"
        return 1
    fi

    echo "Fetching screenshot from http://${host}:${port}/screenshot..."

    # Get JSON response and extract base64 data using jq
    if ! command -v jq &>/dev/null; then
        echo -e "${RED}jq not installed - required for HTTP screenshot${NC}"
        return 1
    fi

    # Fetch and decode in one pipeline (with auth token)
    curl -s --connect-timeout 5 "http://${host}:${port}/screenshot?token=${DEBUG_TOKEN}" 2>/dev/null \
        | jq -r '.data // empty' \
        | base64 -d > "$output" 2>/dev/null

    # Check if file was created and has content
    if [ -s "$output" ]; then
        echo -e "${GREEN}Saved: ${output}${NC}"
        return 0
    else
        rm -f "$output" 2>/dev/null
        echo -e "${RED}Screenshot capture failed${NC}"
        return 1
    fi
}

# Capture from Pixel 3a XL (postmarketOS)
capture_pixel() {
    echo -e "${GREEN}=== Pixel 3a XL (postmarketOS) ===${NC}"

    if ! check_pixel; then
        echo -e "${RED}Pixel not reachable at $PIXEL_IP${NC}"
        return 1
    fi

    local local_path="${SCREENSHOT_DIR}/pixel-${TIMESTAMP}.png"

    # Method 1: Try HTTP debug server first (cleanest, no dependencies)
    if capture_http "$PIXEL_IP" "$DEBUG_PORT" "$local_path" 2>/dev/null; then
        ln -sf "pixel-${TIMESTAMP}.png" "${SCREENSHOT_DIR}/pixel-latest.png"
        return 0
    fi

    echo "Debug server not available, trying SSH methods..."

    export SSHPASS="$PIXEL_PASS"
    local screenshot_path="/tmp/tsyne-screenshot-${TIMESTAMP}.png"
    local captured=false

    # Method 2: scrot (X11)
    if ! $captured; then
        sshpass -e ssh -o StrictHostKeyChecking=no "${PIXEL_USER}@${PIXEL_IP}" \
            "export DISPLAY=:0 && scrot ${screenshot_path} 2>/dev/null" && captured=true
    fi

    # Method 3: gnome-screenshot
    if ! $captured; then
        sshpass -e ssh -o StrictHostKeyChecking=no "${PIXEL_USER}@${PIXEL_IP}" \
            "export DISPLAY=:0 && gnome-screenshot -f ${screenshot_path} 2>/dev/null" && captured=true
    fi

    # Method 4: maim (X11)
    if ! $captured; then
        sshpass -e ssh -o StrictHostKeyChecking=no "${PIXEL_USER}@${PIXEL_IP}" \
            "export DISPLAY=:0 && maim ${screenshot_path} 2>/dev/null" && captured=true
    fi

    # Method 5: import (ImageMagick)
    if ! $captured; then
        sshpass -e ssh -o StrictHostKeyChecking=no "${PIXEL_USER}@${PIXEL_IP}" \
            "export DISPLAY=:0 && import -window root ${screenshot_path} 2>/dev/null" && captured=true
    fi

    if ! $captured; then
        echo -e "${RED}No screenshot method available${NC}"
        echo -e "${YELLOW}Options:${NC}"
        echo -e "  1. Run PhoneTop with: TSYNE_DEBUG_PORT=9229 npx tsx phone-apps/phonetop.ts"
        echo -e "  2. Install scrot: ssh $PIXEL_USER@$PIXEL_IP 'doas apk add scrot'"
        return 1
    fi

    # Pull screenshot back
    sshpass -e scp -o StrictHostKeyChecking=no \
        "${PIXEL_USER}@${PIXEL_IP}:${screenshot_path}" \
        "$local_path" 2>/dev/null

    if [ -f "$local_path" ]; then
        echo -e "${GREEN}Saved: ${local_path}${NC}"
        ln -sf "pixel-${TIMESTAMP}.png" "${SCREENSHOT_DIR}/pixel-latest.png"
        echo "$local_path"
    else
        echo -e "${RED}Failed to retrieve screenshot${NC}"
        return 1
    fi
}

# Capture from Android (Samsung J5)
capture_android() {
    echo -e "${GREEN}=== Samsung J5 (Android) ===${NC}"

    if ! check_android; then
        echo -e "${RED}No Android device connected via adb${NC}"
        return 1
    fi

    local local_path="${SCREENSHOT_DIR}/android-${TIMESTAMP}.png"

    # Method 1: Try HTTP debug server via adb port forward (captures Fyne window)
    # Set up port forward
    adb forward tcp:${DEBUG_PORT} tcp:${DEBUG_PORT} 2>/dev/null || true
    if capture_http "localhost" "$DEBUG_PORT" "$local_path" 2>/dev/null; then
        ln -sf "android-${TIMESTAMP}.png" "${SCREENSHOT_DIR}/android-latest.png"
        return 0
    fi

    # Method 2: adb screencap (captures entire device screen including Android UI)
    echo "Debug server not available, using adb screencap..."
    local screenshot_path="/sdcard/tsyne-screenshot.png"

    adb shell "screencap -p ${screenshot_path}"
    adb pull "${screenshot_path}" "$local_path" 2>/dev/null

    echo -e "${GREEN}Saved: ${local_path}${NC}"

    # Create symlink for latest
    ln -sf "android-${TIMESTAMP}.png" "${SCREENSHOT_DIR}/android-latest.png"

    # Clean up device
    adb shell "rm ${screenshot_path}" 2>/dev/null || true

    echo "$local_path"
}

# Run app and capture screenshot on Pixel
run_and_capture_pixel() {
    local app_script="${1:-phone-apps/phonetop.ts}"
    local delay="${2:-3}"

    echo -e "${GREEN}=== Running $app_script on Pixel ===${NC}"

    if ! check_pixel; then
        echo -e "${RED}Pixel not reachable${NC}"
        return 1
    fi

    export SSHPASS="$PIXEL_PASS"

    # Sync source first
    echo "Syncing source..."
    "${SCRIPT_DIR}/sync-to-pixel.sh" --src-only 2>/dev/null

    # Kill any existing tsyne-bridge
    sshpass -e ssh -o StrictHostKeyChecking=no "${PIXEL_USER}@${PIXEL_IP}" \
        "pkill -f tsyne-bridge 2>/dev/null || true"

    # Start the app in background
    echo "Starting app (will capture in ${delay}s)..."
    sshpass -e ssh -o StrictHostKeyChecking=no "${PIXEL_USER}@${PIXEL_IP}" "
        cd ~/tsyne
        export DISPLAY=:0
        export XAUTHORITY=\$(find /run/user -name '.mutter-Xwaylandauth*' 2>/dev/null | head -1)
        nohup npx tsx ${app_script} > /tmp/tsyne-app.log 2>&1 &
        echo \$!
    "

    # Wait for app to render
    sleep "$delay"

    # Capture
    capture_pixel

    # Kill the app
    sshpass -e ssh -o StrictHostKeyChecking=no "${PIXEL_USER}@${PIXEL_IP}" \
        "pkill -f tsyne-bridge 2>/dev/null || true"
}

# Show recent logs from Android
show_android_logs() {
    echo -e "${YELLOW}=== Recent Android logs ===${NC}"
    adb logcat -d -t 50 | grep -E "(phonetop|tsyne|Node)" | tail -30
}

# Compare screenshots side by side (requires ImageMagick)
compare_screenshots() {
    local pixel_img="${SCREENSHOT_DIR}/pixel-latest.png"
    local android_img="${SCREENSHOT_DIR}/android-latest.png"
    local compare_img="${SCREENSHOT_DIR}/compare-${TIMESTAMP}.png"

    if [ ! -f "$pixel_img" ] || [ ! -f "$android_img" ]; then
        echo -e "${RED}Need both pixel-latest.png and android-latest.png${NC}"
        return 1
    fi

    if command -v montage &>/dev/null; then
        echo "Creating side-by-side comparison..."
        montage "$pixel_img" "$android_img" -tile 2x1 -geometry +10+10 \
            -title "Pixel 3a XL (pmos) | Samsung J5 (Android)" "$compare_img"
        echo -e "${GREEN}Saved: ${compare_img}${NC}"
        ln -sf "compare-${TIMESTAMP}.png" "${SCREENSHOT_DIR}/compare-latest.png"
    else
        echo -e "${YELLOW}Install ImageMagick for side-by-side comparison${NC}"
    fi
}

usage() {
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  pixel           Capture screenshot from Pixel 3a XL"
    echo "  android         Capture screenshot from Samsung J5"
    echo "  both            Capture from both devices"
    echo "  run <script>    Sync, run script on Pixel, capture screenshot"
    echo "  logs            Show recent Android logs"
    echo "  compare         Create side-by-side comparison"
    echo "  status          Check device connectivity"
    echo ""
    echo "Examples:"
    echo "  $0 both                           # Capture current state"
    echo "  $0 run phone-apps/phonetop.ts     # Deploy, run, capture on Pixel"
    echo "  $0 compare                        # Compare latest screenshots"
}

case "${1:-status}" in
    pixel)
        capture_pixel
        ;;
    android)
        capture_android
        ;;
    both)
        capture_pixel || true
        capture_android || true
        compare_screenshots || true
        ;;
    run)
        run_and_capture_pixel "${2:-phone-apps/phonetop.ts}" "${3:-3}"
        ;;
    logs)
        show_android_logs
        ;;
    compare)
        compare_screenshots
        ;;
    status)
        echo -e "${GREEN}=== Device Status ===${NC}"
        if check_pixel; then
            echo -e "Pixel 3a XL: ${GREEN}ONLINE${NC} ($PIXEL_IP)"
        else
            echo -e "Pixel 3a XL: ${RED}OFFLINE${NC}"
        fi
        if check_android; then
            dev=$(adb devices | grep "device$" | cut -f1)
            echo -e "Android:     ${GREEN}ONLINE${NC} ($dev)"
        else
            echo -e "Android:     ${RED}OFFLINE${NC}"
        fi
        ;;
    -h|--help|help)
        usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        usage
        exit 1
        ;;
esac
