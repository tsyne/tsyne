#!/bin/bash
# Rebuild Tsyne bridge for aarch64 in pmbootstrap chroot
# Run this after modifying Go bridge code

set -e

PMBOOTSTRAP="/home/paul/scm/tsyne/pmbootstrap/pmbootstrap.py"
BRIDGE_SRC="/home/paul/scm/tsyne/tsyne/core/bridge"
FYNE_SRC="/home/paul/scm/tsyne/fyne"
CHROOT_PATH="/home/paul/pmwork/chroot_rootfs_google-bonito"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create directories if needed
sudo mkdir -p "${CHROOT_PATH}/home/paul/tsyne/bridge/"
sudo mkdir -p "${CHROOT_PATH}/home/fyne/"

echo -e "${GREEN}Copying bridge source to chroot...${NC}"
sudo cp -r "${BRIDGE_SRC}"/* "${CHROOT_PATH}/home/paul/tsyne/bridge/"

echo -e "${GREEN}Copying fyne source to chroot...${NC}"
sudo rsync -a --delete "${FYNE_SRC}/" "${CHROOT_PATH}/home/fyne/"

echo -e "${GREEN}Building bridge for aarch64 (this may take a while via qemu)...${NC}"
cd /home/paul/scm/tsyne/pmbootstrap
${PMBOOTSTRAP} chroot -r -- sh -c "cd /home/paul/tsyne/bridge && go build -o /home/paul/tsyne/bin/tsyne-bridge ."

echo -e "${GREEN}Build complete!${NC}"
file "${CHROOT_PATH}/home/paul/tsyne/bin/tsyne-bridge"

echo -e "${YELLOW}Now run: ./sync-to-pixel.sh --bridge-only${NC}"
