#!/bin/bash
# Install required packages in pmbootstrap chroot

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PMOS_DIR="$(dirname "$SCRIPT_DIR")"
PMBOOTSTRAP="$PMOS_DIR/pmbootstrap/pmbootstrap.py"

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}Installing i3wm and X11 dependencies...${NC}"
$PMBOOTSTRAP chroot -r -- apk add \
    i3wm i3status dmenu xterm \
    xorg-server xinit xhost \
    xf86-input-evdev evtest

echo -e "${GREEN}Installing Node.js and development tools...${NC}"
$PMBOOTSTRAP chroot -r -- apk add \
    nodejs npm \
    go mesa-dev libxrandr-dev libxcursor-dev libxinerama-dev \
    libxi-dev libxxf86vm-dev wayland-dev glfw-dev

echo -e "${GREEN}Done! Packages installed in chroot.${NC}"
