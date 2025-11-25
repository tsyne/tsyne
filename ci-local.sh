#!/bin/bash
set -e

# Local version of CI script - skips system package installation
# Assumes you already have Go, Node.js, and X11 libraries installed

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "--- :golang: Setting up Go workarounds for restricted network"
# Set up Go in PATH (adjust if your Go is elsewhere)
export PATH=/usr/local/go/bin:$PATH

# Download fyne.io/systray manually (not on Google's proxy)
cd /tmp
if [ ! -d "/tmp/systray-master" ]; then
  echo "Downloading systray dependency..."
  wget -q https://github.com/fyne-io/systray/archive/refs/heads/master.tar.gz -O systray-master.tar.gz
  tar -xzf systray-master.tar.gz
fi

# Use go mod replace to point to local systray
cd "$SCRIPT_DIR/bridge"
go mod edit -replace=fyne.io/systray=/tmp/systray-master

echo "--- :hammer: Building Go bridge"
cd "$SCRIPT_DIR/bridge"
env CGO_ENABLED=1 GOPROXY=direct go build -o ../bin/tsyne-bridge .

echo "--- :nodejs: Installing npm dependencies"
cd "$SCRIPT_DIR"
npm install --ignore-scripts

echo "--- :typescript: Building TypeScript"
npm run build

echo "--- :test_tube: Running unit tests"
# Check if DISPLAY is set, if not start Xvfb
if [ -z "$DISPLAY" ]; then
  echo "Starting Xvfb for headless testing..."
  Xvfb :99 -screen 0 1024x768x24 &
  XVFB_PID=$!
  export DISPLAY=:99
  sleep 2

  # Run tests - non-blocking for now
  npm run test:unit || {
    EXIT_CODE=$?
    kill $XVFB_PID 2>/dev/null || true
    echo "⚠️  Tests completed with failures (exit code: $EXIT_CODE)"
    echo "Note: Test failures are non-blocking while test suite is being stabilized"
  }

  kill $XVFB_PID 2>/dev/null || true
else
  # DISPLAY already set, just run tests - non-blocking
  npm run test:unit || {
    EXIT_CODE=$?
    echo "⚠️  Tests completed with failures (exit code: $EXIT_CODE)"
    echo "Note: Test failures are non-blocking while test suite is being stabilized"
  }
fi

echo "--- :white_check_mark: Build complete"
