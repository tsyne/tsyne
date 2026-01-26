#!/bin/bash
# Flash postmarketOS to device
# Device must be in fastboot mode (Power + Volume Down)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PMOS_DIR="$(dirname "$SCRIPT_DIR")"
PMBOOTSTRAP="$PMOS_DIR/pmbootstrap/pmbootstrap.py"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== PostmarketOS Flash Script ===${NC}"

# Check pmbootstrap exists
if [ ! -f "$PMBOOTSTRAP" ]; then
    echo -e "${RED}Error: pmbootstrap not found at $PMBOOTSTRAP${NC}"
    echo "Run setup.sh first"
    exit 1
fi

# Check if device is in fastboot mode
echo -e "${YELLOW}Checking for device in fastboot mode...${NC}"
if ! fastboot devices | grep -q .; then
    echo -e "${RED}No device found in fastboot mode!${NC}"
    echo ""
    echo "To enter fastboot mode:"
    echo "  1. Power off the device"
    echo "  2. Hold Power + Volume Down until fastboot appears"
    echo "  3. Connect USB cable"
    echo ""
    exit 1
fi

echo -e "${GREEN}Device found!${NC}"
fastboot devices

# Device password (override with DEVICE_PASS env var)
DEVICE_PASS="${DEVICE_PASS:-147147}"

# Build the image
echo -e "${YELLOW}Building postmarketOS image...${NC}"
"$PMBOOTSTRAP" install --password "$DEVICE_PASS"

# Flash to device
echo -e "${YELLOW}Flashing to device...${NC}"
"$PMBOOTSTRAP" flasher flash_rootfs
"$PMBOOTSTRAP" flasher flash_kernel

echo ""
echo -e "${GREEN}=== Flash Complete ===${NC}"
echo ""
echo "The device should now boot into postmarketOS."
echo "First boot may take a minute."
echo ""
echo "After boot:"
echo "  - Connect USB for networking (IP: 172.16.42.1)"
echo "  - SSH: ssh paul@172.16.42.1 (password: 147147)"
echo ""
echo "To sync and run PhoneTop:"
echo "  ./scripts/sync-to-device.sh"
echo "  ./scripts/run-phonetop.sh"
