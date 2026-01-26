#!/bin/bash
# Build tsyne-bridge for aarch64 in pmbootstrap chroot
# This uses qemu emulation and takes ~15 minutes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PMOS_DIR="$(dirname "$SCRIPT_DIR")"
TSYNE_ROOT="$(dirname "$PMOS_DIR")"
PMBOOTSTRAP="$PMOS_DIR/pmbootstrap/pmbootstrap.py"
WORK_DIR="$PMOS_DIR/work"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get device from pmbootstrap config
DEVICE=$($PMBOOTSTRAP config device)
CHROOT_PATH="$WORK_DIR/chroot_rootfs_$DEVICE"

echo -e "${GREEN}Building tsyne-bridge for aarch64...${NC}"
echo "Device: $DEVICE"
echo "Chroot: $CHROOT_PATH"

# Create directories in chroot
sudo mkdir -p "$CHROOT_PATH/home/paul/tsyne/bridge"
sudo mkdir -p "$CHROOT_PATH/home/paul/tsyne/bin"

# Copy bridge source
echo -e "${YELLOW}Copying bridge source to chroot...${NC}"
sudo cp -r "$TSYNE_ROOT/core/bridge/"* "$CHROOT_PATH/home/paul/tsyne/bridge/"

# Fix ownership (pmbootstrap uses uid 10000)
sudo chown -R 10000:10000 "$CHROOT_PATH/home/paul/tsyne"

# Build in chroot
echo -e "${YELLOW}Building bridge (this takes ~15 minutes via qemu)...${NC}"
$PMBOOTSTRAP chroot -r -- sh -c 'cd /home/paul/tsyne/bridge && CGO_ENABLED=1 go build -o /home/paul/tsyne/bin/tsyne-bridge .'

echo -e "${GREEN}Build complete!${NC}"
file "$CHROOT_PATH/home/paul/tsyne/bin/tsyne-bridge"

echo ""
echo "Now run: ./scripts/sync-to-device.sh --bridge-only"
