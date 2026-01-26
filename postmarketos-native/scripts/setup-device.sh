#!/bin/bash
# Apply device configuration after flashing postmarketOS
# Run from your laptop after first boot
# Usage: ./setup-device.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PMOS_DIR="$(dirname "$SCRIPT_DIR")"
DEVICE_CONFIGS="$PMOS_DIR/device-configs/google-bonito"

# Device settings
DEVICE_IP="${DEVICE_IP:-172.16.42.1}"
DEVICE_USER="${DEVICE_USER:-paul}"
DEVICE_PASS="${DEVICE_PASS:-147147}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

export SSHPASS="$DEVICE_PASS"

echo -e "${GREEN}=== PostmarketOS Device Setup ===${NC}"
echo "Device: ${DEVICE_USER}@${DEVICE_IP}"
echo ""

# Check connectivity
echo -e "${YELLOW}Checking device connectivity...${NC}"
if ! sshpass -e ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 "${DEVICE_USER}@${DEVICE_IP}" 'echo ok' >/dev/null 2>&1; then
    echo -e "${RED}Cannot connect to device. Is it booted and connected via USB?${NC}"
    exit 1
fi
echo -e "${GREEN}Connected!${NC}"
echo ""

# Copy config files to device
echo -e "${YELLOW}Copying config files to device...${NC}"
sshpass -e scp -o StrictHostKeyChecking=no \
    "$DEVICE_CONFIGS/touchscreen.conf" \
    "$DEVICE_CONFIGS/autologin.conf" \
    "$DEVICE_CONFIGS/doas-power.conf" \
    "$DEVICE_CONFIGS/xinitrc" \
    "$DEVICE_CONFIGS/i3-config" \
    "$DEVICE_CONFIGS/start-phonetop.sh" \
    "$DEVICE_CONFIGS/profile-snippet.sh" \
    "${DEVICE_USER}@${DEVICE_IP}:/tmp/"

# Apply configs on device (requires doas password)
echo ""
echo -e "${YELLOW}Applying system configs (will prompt for password)...${NC}"
sshpass -e ssh -t -o StrictHostKeyChecking=no "${DEVICE_USER}@${DEVICE_IP}" '
set -e

echo "Installing touchscreen config..."
doas cp /tmp/touchscreen.conf /etc/X11/xorg.conf.d/99-touchscreen.conf

echo "Installing autologin config..."
doas mkdir -p /etc/systemd/system/getty@tty1.service.d/
doas cp /tmp/autologin.conf /etc/systemd/system/getty@tty1.service.d/

echo "Installing power permissions (for PhoneTop Power app)..."
doas sh -c "cat /tmp/doas-power.conf >> /etc/doas.conf"

echo "Installing user configs..."
cp /tmp/xinitrc ~/.xinitrc
chmod +x ~/.xinitrc

mkdir -p ~/.config/i3
cp /tmp/i3-config ~/.config/i3/config

cp /tmp/start-phonetop.sh ~/start-phonetop.sh
chmod +x ~/start-phonetop.sh

# Only append profile snippet if not already present
if ! grep -q "startx" ~/.profile 2>/dev/null; then
    cat /tmp/profile-snippet.sh >> ~/.profile
    echo "Added startx to profile"
else
    echo "Profile already configured"
fi

echo ""
echo "Device setup complete!"
'

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "Next steps:"
echo "  1. Sync Tsyne source: ./scripts/sync-to-device.sh"
echo "  2. Reboot device:     sshpass -p '$DEVICE_PASS' ssh ${DEVICE_USER}@${DEVICE_IP} 'doas reboot'"
echo "  3. PhoneTop will auto-start after reboot"
echo ""
echo "Or start manually: ./scripts/run-phonetop.sh"
