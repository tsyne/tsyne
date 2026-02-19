#!/bin/bash
# Quick-iterate test runner for Pixel 3a
# Usage: ./scripts/pixel-test.sh [rebuild]
#   rebuild - also rebuild arm64 bridge before deploying
set -e

PIXEL_IP=172.16.42.1
PIXEL_USER=paul
PIXEL_PASS=147147
TIMEOUT=15
SSH="sshpass -p $PIXEL_PASS ssh -o StrictHostKeyChecking=no -o ConnectTimeout=3 $PIXEL_USER@$PIXEL_IP"
SCP="sshpass -p $PIXEL_PASS scp -o StrictHostKeyChecking=no"

# Check connectivity
if ! ping -c1 -W1 $PIXEL_IP &>/dev/null; then
  echo "ERROR: Pixel not reachable at $PIXEL_IP"
  exit 1
fi

# Optional: rebuild arm64 bridge
if [[ "$1" == "rebuild" ]]; then
  echo "==> Rebuilding arm64 bridge..."
  sudo rsync -a --delete core/bridge/ /home/paul/pmwork-new/chroot_rootfs_google-bonito/home/paul/tsyne/bridge/
  /home/paul/scm/tsyne/pmbootstrap/pmbootstrap.py -w /home/paul/pmwork-new chroot -r -- \
    sh -c 'cd /home/paul/tsyne/bridge && CGO_ENABLED=1 go build -buildvcs=false -o /home/paul/tsyne/bin/tsyne-bridge .' 2>&1
  echo "==> Deploying binary..."
  $SSH "killall tsyne-bridge 2>/dev/null; killall node 2>/dev/null; rm -f ~/tsyne/bin/tsyne-bridge ~/tsyne/core/bin/tsyne-bridge" 2>/dev/null || true
  $SCP /home/paul/pmwork-new/chroot_rootfs_google-bonito/home/paul/tsyne/bin/tsyne-bridge $PIXEL_USER@$PIXEL_IP:~/tsyne/bin/tsyne-bridge
  $SSH "chmod +x ~/tsyne/bin/tsyne-bridge && mkdir -p ~/tsyne/core/bin && ln -sf ../../bin/tsyne-bridge ~/tsyne/core/bin/tsyne-bridge"
fi

# Sync source (fast, only changed files)
echo "==> Syncing source..."
$SCP scripts/pixel-basic-test.ts $PIXEL_USER@$PIXEL_IP:~/tsyne/scripts/pixel-basic-test.ts 2>/dev/null
$SSH "mkdir -p ~/tsyne/trine/integration" 2>/dev/null || true
$SCP trine/integration/gl-proxy-core.ts trine/integration/gl-proxy-uniforms.ts trine/integration/gl-proxy.ts trine/integration/init.ts $PIXEL_USER@$PIXEL_IP:~/tsyne/trine/integration/ 2>/dev/null

# Kill stale processes
$SSH "killall tsyne-bridge 2>/dev/null; killall node 2>/dev/null" 2>/dev/null || true
sleep 1

# Run test script file (avoids quoting hell)
echo "==> Running test on Pixel (${TIMEOUT}s timeout)..."
$SSH "cd ~/tsyne && mkdir -p /tmp/pixel-debug && DISPLAY=:0 timeout $TIMEOUT npx tsx scripts/pixel-basic-test.ts >/tmp/pixel-debug/stdout.log 2>&1" 2>/dev/null || true

# Pull results
echo "==> Pulling results..."
mkdir -p /tmp/pixel-debug
$SCP "$PIXEL_USER@$PIXEL_IP:/tmp/pixel-debug/*" /tmp/pixel-debug/ 2>/dev/null || true

echo "==> Results in /tmp/pixel-debug/"
echo "--- Bridge output (last 40 lines):"
tail -40 /tmp/pixel-debug/stdout.log 2>/dev/null || echo "(no output)"
echo "--- Screenshot:"
file /tmp/pixel-debug/screenshot.png 2>/dev/null || echo "(no screenshot)"
