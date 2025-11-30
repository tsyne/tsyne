#!/bin/bash
set -e

echo "--- :package: Checking system dependencies"
# Check if system dependencies are already installed (e.g., in Docker image)
if ! dpkg -l | grep -q libgl1-mesa-dev; then
  echo "System dependencies not found, installing..."
  apt-get update -qq
  apt-get install -y \
    build-essential \
    gcc \
    pkg-config \
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
    curl \
    gnupg
else
  echo "System dependencies already installed ✓"
fi

# ============================================================================
# Install Node.js 24.x if not already present
# ============================================================================
if ! command -v node &> /dev/null; then
  echo "--- :nodejs: Installing Node.js 24.x"
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
node --version
npm --version

# ============================================================================
# Install Go 1.24.x if not already present
# ============================================================================
if [ ! -d "/usr/local/go" ]; then
  echo "--- :golang: Installing Go 1.24.10"
  GO_VERSION=1.24.10
  wget -q https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz
  tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz
  rm go${GO_VERSION}.linux-amd64.tar.gz
fi
export PATH=/usr/local/go/bin:$PATH
/usr/local/go/bin/go version

# ============================================================================
# STEP 1: Go Bridge Build
# ============================================================================
echo "--- :golang: Building Go bridge"

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
env CGO_ENABLED=1 GOPROXY=direct /usr/local/go/bin/go build -o ../bin/tsyne-bridge .

# ============================================================================
# STEP 2: Root Tsyne (Core Library)
# ============================================================================
echo "--- :nodejs: Root Tsyne - Install & Build"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}
npm install --ignore-scripts
npm run build

echo "--- :test_tube: Root Tsyne - Unit Tests"
# Start Xvfb for headless GUI testing (if not already running)
if ! pgrep -x Xvfb > /dev/null; then
  echo "Starting Xvfb..."
  Xvfb :99 -screen 0 1024x768x24 &
  XVFB_PID=$!
  export DISPLAY=:99
  sleep 2
else
  echo "Xvfb already running ✓"
  export DISPLAY=:99
fi

timeout 180 npm run test:unit || {
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo "❌ Root unit tests timed out after 180 seconds"
  else
    echo "❌ Root unit tests failed (exit code: $EXIT_CODE)"
  fi
  exit 1
}

# ============================================================================
# STEP 3: Designer Sub-Project
# ============================================================================
echo "--- :art: Designer - Install & Build"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/designer
if [ -f "package.json" ]; then
  npm install --ignore-scripts
  npm run build || {
    echo "❌ Designer build failed"
    exit 1
  }

  echo "--- :test_tube: Designer - Tests"
  timeout 180 npm test || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
      echo "❌ Designer tests timed out after 180 seconds"
    else
      echo "❌ Designer tests failed (exit code: $EXIT_CODE)"
    fi
    exit 1
  }
else
  echo "⚠️  No package.json found in designer/ - skipping"
fi

# ============================================================================
# STEP 4: Examples Sub-Project
# ============================================================================
echo "--- :bulb: Examples - Tests"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}
# Examples use root node_modules, just run tests
timeout 300 npm run test:examples || {
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo "❌ Examples tests timed out after 300 seconds"
  else
    echo "❌ Examples tests failed (exit code: $EXIT_CODE)"
  fi
  exit 1
}

# ============================================================================
# STEP 5: Ported Apps Sub-Projects (recurse into each subdirectory)
# ============================================================================
echo "--- :package: Ported Apps - Tests"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/ported-apps

# First install root ported-apps dependencies if package.json exists
if [ -f "package.json" ]; then
  echo "Installing ported-apps root dependencies..."
  npm install --ignore-scripts
fi

# Recurse into each subdirectory that has a package.json
for app_dir in */; do
  app_name="${app_dir%/}"
  if [ -f "${app_dir}package.json" ]; then
    echo "--- :package: Ported App: ${app_name}"
    cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/ported-apps/${app_name}
    npm install --ignore-scripts
    timeout 300 npm test || {
      EXIT_CODE=$?
      if [ $EXIT_CODE -eq 124 ]; then
        echo "❌ ${app_name} tests timed out after 300 seconds"
      else
        echo "❌ ${app_name} tests failed (exit code: $EXIT_CODE)"
      fi
      exit 1
    }
    echo "✓ ${app_name} tests passed"
  else
    echo "⚠️  No package.json in ${app_name}/ - skipping"
  fi
done

# ============================================================================
# Cleanup
# ============================================================================
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}
kill $XVFB_PID 2>/dev/null || true

echo "--- :white_check_mark: Build complete"
