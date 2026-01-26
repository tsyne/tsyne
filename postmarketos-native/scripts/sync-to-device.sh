#!/bin/bash
# Sync Tsyne source and bridge to postmarketOS device
# Usage: ./sync-to-device.sh [--bridge-only | --src-only]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PMOS_DIR="$(dirname "$SCRIPT_DIR")"
TSYNE_ROOT="$(dirname "$PMOS_DIR")"
PMBOOTSTRAP="$PMOS_DIR/pmbootstrap/pmbootstrap.py"
WORK_DIR="$PMOS_DIR/work"

# Device settings (override with environment variables)
DEVICE_IP="${DEVICE_IP:-172.16.42.1}"
DEVICE_USER="${DEVICE_USER:-paul}"
DEVICE_PASS="${DEVICE_PASS:-147147}"
REMOTE_DIR="/home/paul/tsyne"

# Get device from pmbootstrap config
DEVICE=$($PMBOOTSTRAP config device 2>/dev/null || echo "google-bonito")
CHROOT_PATH="$WORK_DIR/chroot_rootfs_$DEVICE"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

export SSHPASS="$DEVICE_PASS"
export RSYNC_RSH="sshpass -e ssh -o StrictHostKeyChecking=no"

sync_src() {
    echo -e "${GREEN}Syncing TypeScript source...${NC}"
    sshpass -e rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude 'dist' \
        --exclude '.git' \
        "$TSYNE_ROOT/core/src/" \
        "${DEVICE_USER}@${DEVICE_IP}:${REMOTE_DIR}/src/"

    sshpass -e rsync -avz \
        "$TSYNE_ROOT/core/package.json" \
        "$TSYNE_ROOT/core/tsconfig.json" \
        "${DEVICE_USER}@${DEVICE_IP}:${REMOTE_DIR}/"

    echo -e "${GREEN}Syncing examples...${NC}"
    sshpass -e rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '*.test.ts' \
        "$TSYNE_ROOT/examples/" \
        "${DEVICE_USER}@${DEVICE_IP}:${REMOTE_DIR}/examples/"

    echo -e "${GREEN}Syncing phone-apps...${NC}"
    sshpass -e rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '*.test.ts' \
        "$TSYNE_ROOT/phone-apps/" \
        "${DEVICE_USER}@${DEVICE_IP}:${REMOTE_DIR}/phone-apps/"

    echo -e "${GREEN}Syncing launchers...${NC}"
    sshpass -e rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '*.test.ts' \
        "$TSYNE_ROOT/launchers/" \
        "${DEVICE_USER}@${DEVICE_IP}:${REMOTE_DIR}/launchers/"

    echo -e "${GREEN}Syncing ported-apps...${NC}"
    sshpass -e rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '*.test.ts' \
        "$TSYNE_ROOT/ported-apps/" \
        "${DEVICE_USER}@${DEVICE_IP}:${REMOTE_DIR}/ported-apps/"

    # Ensure tsyne symlink exists in node_modules
    sshpass -e ssh -o StrictHostKeyChecking=no "${DEVICE_USER}@${DEVICE_IP}" \
        "mkdir -p ~/tsyne/core ~/tsyne/node_modules && \
         ln -sf ../src ~/tsyne/core/src 2>/dev/null || true && \
         ln -sf .. ~/tsyne/node_modules/tsyne 2>/dev/null || true"
}

sync_bridge() {
    echo -e "${GREEN}Syncing aarch64 bridge binary...${NC}"
    if [ -f "$CHROOT_PATH/home/paul/tsyne/bin/tsyne-bridge" ]; then
        sshpass -e rsync -avz \
            "$CHROOT_PATH/home/paul/tsyne/bin/tsyne-bridge" \
            "${DEVICE_USER}@${DEVICE_IP}:${REMOTE_DIR}/bin/"
    else
        echo -e "${YELLOW}Warning: Bridge binary not found at $CHROOT_PATH/home/paul/tsyne/bin/tsyne-bridge${NC}"
        echo "Run ./scripts/build-bridge.sh first"
    fi
}

sync_wasm_deps() {
    echo -e "${GREEN}Syncing WASM dependencies (resvg-wasm for SVG icon rendering)...${NC}"

    # Create node_modules/@resvg directory on device
    sshpass -e ssh -o StrictHostKeyChecking=no "${DEVICE_USER}@${DEVICE_IP}" \
        "mkdir -p ~/tsyne/node_modules/@resvg"

    # Sync resvg-wasm package (needed for SVG to PNG conversion)
    if [ -d "$TSYNE_ROOT/node_modules/@resvg/resvg-wasm" ]; then
        sshpass -e rsync -avz \
            "$TSYNE_ROOT/node_modules/@resvg/resvg-wasm/" \
            "${DEVICE_USER}@${DEVICE_IP}:${REMOTE_DIR}/node_modules/@resvg/resvg-wasm/"
    else
        echo -e "${YELLOW}Warning: @resvg/resvg-wasm not found locally${NC}"
        echo "Run 'pnpm install' first"
    fi
}

sync_bundle() {
    echo -e "${GREEN}Syncing phonetop bundle...${NC}"
    # Bundle is pre-built - tsx doesn't work on device due to broken symlinks
    if [ -f "$PMOS_DIR/phonetop.bundle.js" ]; then
        sshpass -e rsync -avz \
            "$PMOS_DIR/phonetop.bundle.js" \
            "${DEVICE_USER}@${DEVICE_IP}:${REMOTE_DIR}/"
    else
        echo -e "${YELLOW}Warning: phonetop.bundle.js not found${NC}"
        echo "Build it with: npx esbuild ./phone-apps/phonetop.ts --bundle --platform=node --target=node18 --outfile=postmarketos-native/phonetop.bundle.js --external:@resvg/resvg-js --external:isolated-vm --external:koffi --external:esbuild --external:sharp --external:better-sqlite3 --external:@img/sharp-* --external:*.node --format=cjs"
    fi
}

case "$1" in
    --bridge-only)
        sync_bridge
        ;;
    --src-only)
        sync_src
        ;;
    --wasm-only)
        sync_wasm_deps
        ;;
    --bundle-only)
        sync_bundle
        ;;
    *)
        sync_bundle
        sync_bridge
        sync_wasm_deps
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"
echo ""
echo "SSH to device:  sshpass -p '$DEVICE_PASS' ssh ${DEVICE_USER}@${DEVICE_IP}"
echo "Start PhoneTop: ./scripts/run-phonetop.sh"
