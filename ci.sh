#!/bin/bash
set -e

echo "--- :package: Installing system dependencies"
apt-get update -qq
apt-get install -y \
  libgl1-mesa-dev \
  xorg-dev \
  libxrandr-dev \
  libxcursor-dev \
  libxinerama-dev \
  libxi-dev \
  libxxf86vm-dev \
  libglfw3-dev \
  xvfb \
  wget \
  curl

echo "--- :golang: Setting up Go workarounds for restricted network"
# Set up Go in PATH
export PATH=/usr/local/go/bin:$PATH

# Download fyne.io/systray manually (not on Google's proxy)
cd /tmp
if [ ! -d "/tmp/systray-master" ]; then
  echo "Downloading systray dependency..."
  wget -q https://github.com/fyne-io/systray/archive/refs/heads/master.tar.gz -O systray-master.tar.gz
  tar -xzf systray-master.tar.gz
fi

# Use go mod replace to point to local systray
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/bridge
/usr/local/go/bin/go mod edit -replace=fyne.io/systray=/tmp/systray-master

echo "--- :hammer: Building Go bridge"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/bridge
env GOPROXY=direct /usr/local/go/bin/go build -o ../bin/tsyne-bridge .

echo "--- :nodejs: Installing npm dependencies"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}
npm install --ignore-scripts

echo "--- :typescript: Building TypeScript"
npm run build

echo "--- :test_tube: Running unit tests"
# Start Xvfb for headless GUI testing
Xvfb :99 -screen 0 1024x768x24 &
XVFB_PID=$!
export DISPLAY=:99

# Wait for Xvfb to be ready
sleep 2

# Run tests with timeout
timeout 150 npm run test:unit || {
  EXIT_CODE=$?
  kill $XVFB_PID 2>/dev/null || true
  if [ $EXIT_CODE -eq 124 ]; then
    echo "Tests timed out after 150 seconds"
    exit 1
  fi
  exit $EXIT_CODE
}

# Cleanup
kill $XVFB_PID 2>/dev/null || true

echo "--- :white_check_mark: Build complete"
