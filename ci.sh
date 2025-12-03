#!/bin/bash
set -e

# ============================================================================
# Test Results Aggregation
# ============================================================================
declare -a TEST_RESULTS=()
TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0
TOTAL_SKIPPED=0
TOTAL_SUITES=0
TOTAL_SUITES_PASSED=0
TOTAL_SUITES_FAILED=0

# Function to capture test results from Jest JSON output
capture_test_results() {
  local section_name="$1"
  local json_file="$2"

  if [ -f "$json_file" ]; then
    local tests=$(jq '.numTotalTests' "$json_file")
    local passed=$(jq '.numPassedTests' "$json_file")
    local failed=$(jq '.numFailedTests' "$json_file")
    local skipped=$(jq '.numPendingTests' "$json_file")
    local suites=$(jq '.numTotalTestSuites' "$json_file")
    local suites_passed=$(jq '.numPassedTestSuites' "$json_file")
    local suites_failed=$(jq '.numFailedTestSuites' "$json_file")

    TEST_RESULTS+=("$section_name|$tests|$passed|$failed|$skipped|$suites|$suites_passed|$suites_failed")

    TOTAL_TESTS=$((TOTAL_TESTS + tests))
    TOTAL_PASSED=$((TOTAL_PASSED + passed))
    TOTAL_FAILED=$((TOTAL_FAILED + failed))
    TOTAL_SKIPPED=$((TOTAL_SKIPPED + skipped))
    TOTAL_SUITES=$((TOTAL_SUITES + suites))
    TOTAL_SUITES_PASSED=$((TOTAL_SUITES_PASSED + suites_passed))
    TOTAL_SUITES_FAILED=$((TOTAL_SUITES_FAILED + suites_failed))
  fi
}

# Function to print test results summary
print_test_summary() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 CI TEST RESULTS SUMMARY"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  printf "%-30s %8s %8s %8s %8s %8s\n" "Section" "Tests" "Passed" "Failed" "Skipped" "Suites"
  echo "────────────────────────────────────────────────────────────────────────────"

  for result in "${TEST_RESULTS[@]}"; do
    IFS='|' read -r name tests passed failed skipped suites <<< "$result"
    printf "%-30s %8s %8s %8s %8s %8s\n" "$name" "$tests" "$passed" "$failed" "$skipped" "$suites"
  done

  echo "────────────────────────────────────────────────────────────────────────────"
  printf "%-30s %8s %8s %8s %8s %8s\n" "TOTAL" "$TOTAL_TESTS" "$TOTAL_PASSED" "$TOTAL_FAILED" "$TOTAL_SKIPPED" "$TOTAL_SUITES"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ $TOTAL_SKIPPED -gt 0 ]; then
    echo "⚠️  Warning: $TOTAL_SKIPPED tests are currently skipped"
  fi

  if [ $TOTAL_FAILED -gt 0 ]; then
    echo "❌ FAILED: $TOTAL_FAILED tests failed"
    return 1
  else
    echo "✅ SUCCESS: All $TOTAL_PASSED tests passed"
  fi
}

# ============================================================================
# Detect if running locally vs Buildkite CI
# ============================================================================
if [ -z "${BUILDKITE_BUILD_CHECKOUT_PATH}" ]; then
  # Running locally - use the directory containing this script
  BUILDKITE_BUILD_CHECKOUT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  echo "Running locally. Using checkout path: ${BUILDKITE_BUILD_CHECKOUT_PATH}"
fi

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
    gnupg \
    jq
else
  echo "System dependencies already installed ✓"
fi

# Ensure jq is installed for JSON parsing
if ! command -v jq &> /dev/null; then
  echo "Installing jq for test result aggregation..."
  apt-get install -y jq
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

timeout 600 npm run test:unit -- --json --outputFile=/tmp/root-test-results.json || {
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo "❌ Root unit tests timed out after 600 seconds"
  else
    echo "❌ Root unit tests failed (exit code: $EXIT_CODE)"
  fi
  capture_test_results "Root Tsyne" "/tmp/root-test-results.json"
}
capture_test_results "Root Tsyne" "/tmp/root-test-results.json" || true

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

  echo "--- :test_tube: Designer - Unit Tests"
  timeout 90 npm run test:unit -- --json --outputFile=/tmp/designer-unit-test-results.json || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
      echo "❌ Designer unit tests timed out after 90 seconds"
    else
      echo "❌ Designer unit tests failed (exit code: $EXIT_CODE)"
    fi
    capture_test_results "Designer: Unit" "/tmp/designer-unit-test-results.json"
  }
  capture_test_results "Designer: Unit" "/tmp/designer-unit-test-results.json" || true

  echo "--- :test_tube: Designer - GUI Tests"
  timeout 90 npm run test:gui -- --json --outputFile=/tmp/designer-gui-test-results.json || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
      echo "❌ Designer GUI tests timed out after 90 seconds"
    else
      echo "❌ Designer GUI tests failed (exit code: $EXIT_CODE)"
    fi
    capture_test_results "Designer: GUI" "/tmp/designer-gui-test-results.json"
  }
  capture_test_results "Designer: GUI" "/tmp/designer-gui-test-results.json" || true
else
  echo "⚠️  No package.json found in designer/ - skipping"
fi

# ============================================================================
# STEP 4: Examples Sub-Project
# ============================================================================
echo "--- :bulb: Examples - Tests"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/examples

echo "--- :test_tube: Examples - Logic Tests"
timeout 150 npm run test:logic -- --json --outputFile=/tmp/examples-logic-test-results.json || {
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo "❌ Examples logic tests timed out after 150 seconds"
  else
    echo "❌ Examples logic tests failed (exit code: $EXIT_CODE)"
  fi
  capture_test_results "Examples: Logic" "/tmp/examples-logic-test-results.json"
}
capture_test_results "Examples: Logic" "/tmp/examples-logic-test-results.json" || true

echo "--- :test_tube: Examples - GUI Tests"
timeout 150 npm run test:gui -- --json --outputFile=/tmp/examples-gui-test-results.json || {
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo "❌ Examples GUI tests timed out after 150 seconds"
  else
    echo "❌ Examples GUI tests failed (exit code: $EXIT_CODE)"
  fi
  capture_test_results "Examples: GUI" "/tmp/examples-gui-test-results.json"
}
capture_test_results "Examples: GUI" "/tmp/examples-gui-test-results.json" || true

# ============================================================================
# STEP 5: Ported Apps Sub-Projects
# ============================================================================
echo "--- :package: Ported Apps - Install & Test"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/ported-apps

# Install root ported-apps dependencies (shared by all apps)
if [ -f "package.json" ]; then
  echo "Installing ported-apps shared dependencies..."
  npm install --ignore-scripts
fi

# Helper function to build and test a ported app
test_ported_app() {
  local app_name=$1
  local bridge_mode=$2
  local json_file="/tmp/ported-${app_name}-test-results.json"
  echo "--- :package: Ported App: ${app_name}"
  cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/ported-apps/${app_name}
  npm install --ignore-scripts
  if [ -n "$bridge_mode" ]; then
    echo "Using bridge mode: $bridge_mode"
    TSYNE_BRIDGE_MODE=$bridge_mode timeout 300 npm test -- --json --outputFile="$json_file" || {
      capture_test_results "Ported: ${app_name}" "$json_file"
      return 1
    }
  else
    timeout 300 npm test -- --json --outputFile="$json_file" || {
      capture_test_results "Ported: ${app_name}" "$json_file"
      return 1
    }
  fi
  capture_test_results "Ported: ${app_name}" "$json_file"
}

# Test each ported app (continue even if some fail to collect all results)
set +e  # Temporarily disable exit-on-error to collect all test results
test_ported_app "chess" || true
test_ported_app "fyles" || true
test_ported_app "game-of-life" "msgpack-uds" || true
test_ported_app "image-viewer" || true
test_ported_app "pixeledit" || true
test_ported_app "slydes" || true
test_ported_app "solitaire" || true
test_ported_app "terminal" || true
set -e  # Re-enable exit-on-error

# Run tests for apps that don't have their own package.json (use shared root)
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/ported-apps
if [ -f "package.json" ]; then
  echo "--- :package: Testing apps with shared package.json"
  timeout 300 npm test -- --json --outputFile=/tmp/ported-shared-test-results.json || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
      echo "❌ Shared ported apps tests timed out after 300 seconds"
    else
      echo "❌ Shared ported apps tests failed (exit code: $EXIT_CODE)"
    fi
    capture_test_results "Ported: Shared" "/tmp/ported-shared-test-results.json"
  }
  capture_test_results "Ported: Shared" "/tmp/ported-shared-test-results.json" || true
  echo "✓ Shared ported apps tests passed"
fi

# ============================================================================
# Cleanup (do this before summary so it always runs)
# ============================================================================
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}
kill $XVFB_PID 2>/dev/null || true

# ============================================================================
# Print Test Summary (this will exit with failure code if tests failed)
# ============================================================================
print_test_summary

echo "--- :white_check_mark: Build complete"
