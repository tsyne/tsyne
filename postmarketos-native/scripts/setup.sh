#!/bin/bash
# Setup postmarketOS development environment
# Run this once after cloning the repo

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PMOS_DIR="$(dirname "$SCRIPT_DIR")"
PMBOOTSTRAP_DIR="$PMOS_DIR/pmbootstrap"
WORK_DIR="$PMOS_DIR/work"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Setting up postmarketOS development environment...${NC}"

# Clone pmbootstrap if not present
if [ ! -d "$PMBOOTSTRAP_DIR" ]; then
    echo -e "${YELLOW}Cloning pmbootstrap...${NC}"
    git clone --depth 1 https://gitlab.postmarketos.org/postmarketOS/pmbootstrap.git "$PMBOOTSTRAP_DIR"
else
    echo -e "${GREEN}pmbootstrap already present${NC}"
fi

# Create work directory
mkdir -p "$WORK_DIR"

# Check if pmbootstrap is initialized
if [ ! -f "$HOME/.config/pmbootstrap.cfg" ]; then
    echo -e "${YELLOW}Running pmbootstrap init...${NC}"
    echo ""
    echo "Recommended settings for Pixel 3a XL:"
    echo "  Channel: edge"
    echo "  Device: google-bonito"
    echo "  Username: paul"
    echo "  UI: none (we use i3)"
    echo ""
    cd "$PMBOOTSTRAP_DIR"
    ./pmbootstrap.py init
else
    echo -e "${GREEN}pmbootstrap already initialized${NC}"
    echo "Config: $HOME/.config/pmbootstrap.cfg"
fi

# Set work directory
cd "$PMBOOTSTRAP_DIR"
./pmbootstrap.py config work "$WORK_DIR"

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Install chroot packages:  ./scripts/install-chroot-packages.sh"
echo "  2. Build bridge:             ./scripts/build-bridge.sh"
echo "  3. Flash device:             ./scripts/flash-device.sh"
echo "  4. Sync and run:             ./scripts/sync-to-device.sh"
