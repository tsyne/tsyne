#!/bin/bash
# Start PhoneTop on the postmarketOS device

set -e

DEVICE_IP="${DEVICE_IP:-172.16.42.1}"
DEVICE_USER="${DEVICE_USER:-paul}"
DEVICE_PASS="${DEVICE_PASS:-147147}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

export SSHPASS="$DEVICE_PASS"

echo -e "${YELLOW}Killing existing processes...${NC}"
sshpass -e ssh -o StrictHostKeyChecking=no "${DEVICE_USER}@${DEVICE_IP}" \
    'killall node tsyne-bridge 2>/dev/null || true'

sleep 1

echo -e "${GREEN}Starting PhoneTop...${NC}"
# Use pre-built bundle (tsx doesn't work on device - broken symlink to monorepo pnpm)
# Token is randomly generated - will be printed to logs
sshpass -e ssh -o StrictHostKeyChecking=no "${DEVICE_USER}@${DEVICE_IP}" \
    "cd ~/tsyne && \
     DISPLAY=:0 \
     XAUTHORITY=\$(ls -t ~/.serverauth.* 2>/dev/null | head -1) \
     FYNE_SCALE=2.5 \
     nohup node phonetop.bundle.js > ~/phonetop.log 2>&1 &"

sleep 5

echo -e "${GREEN}Fullscreening window...${NC}"
sshpass -e ssh -o StrictHostKeyChecking=no "${DEVICE_USER}@${DEVICE_IP}" \
    'DISPLAY=:0 i3-msg "[title=\"Tsyne Phone\"] focus" && \
     DISPLAY=:0 i3-msg "fullscreen enable"' 2>/dev/null || true

sleep 2

echo ""
echo -e "${GREEN}PhoneTop started!${NC}"
echo ""

# Extract the randomly generated debug token from logs
DEBUG_TOKEN=$(sshpass -e ssh -o StrictHostKeyChecking=no "${DEVICE_USER}@${DEVICE_IP}" \
    "grep -o 'Debug token: [a-f0-9]*' ~/phonetop.log | tail -1 | cut -d' ' -f3")

if [ -n "$DEBUG_TOKEN" ]; then
    echo "Debug API: http://${DEVICE_IP}:9230/?token=${DEBUG_TOKEN}"
else
    echo -e "${YELLOW}Debug token not found in logs yet. Check logs for token.${NC}"
fi
echo "Logs:      sshpass -p '$DEVICE_PASS' ssh ${DEVICE_USER}@${DEVICE_IP} 'tail -f ~/phonetop.log'"
