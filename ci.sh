#!/bin/bash
set -e

# ============================================================================
# OS Detection
# ============================================================================
OS_TYPE="$(uname -s)"
ARCH_TYPE="$(uname -m)"

case "$OS_TYPE" in
  Linux*)  OS="linux" ;;
  Darwin*) OS="macos" ;;
  *)       echo "Unsupported OS: $OS_TYPE"; exit 1 ;;
esac

case "$ARCH_TYPE" in
  x86_64)  ARCH="amd64" ;;
  arm64)   ARCH="arm64" ;;
  aarch64) ARCH="arm64" ;;
  *)       echo "Unsupported architecture: $ARCH_TYPE"; exit 1 ;;
esac

echo "Detected OS: $OS, Architecture: $ARCH"

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

# Wait time tracking file (cleared at start, aggregated at end)
WAIT_TIME_FILE="/tmp/tsyne-wait-times.json"

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

# Function to print aggregated wait time summary from all test runs
print_wait_time_summary() {
  local output_file="$1"
  local wait_file="$WAIT_TIME_FILE"

  if [ ! -f "$wait_file" ]; then
    return 0
  fi

  # Aggregate wait times using jq
  local total_wait_ms=$(jq '[.[].totalWaitMs] | add // 0' "$wait_file")
  local total_calls=$(jq '[.[].totalCalls] | add // 0' "$wait_file")

  if [ "$total_calls" -eq 0 ]; then
    return 0
  fi

  local total_wait_s=$(echo "scale=2; $total_wait_ms / 1000" | bc)

  # Helper function to output to both console and file
  wait_output() {
    echo "$1"
    echo "$1" >> "$output_file"
  }

  wait_output ""
  wait_output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  wait_output "⏱️  ctx.wait() TIME SUMMARY"
  wait_output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  wait_output "Total wait time: ${total_wait_ms}ms (${total_wait_s}s)"
  wait_output "Total ctx.wait() calls: ${total_calls}"
  wait_output "────────────────────────────────────────────────────────────────────────────"
  wait_output "Top 10 tests by wait time:"
  wait_output "────────────────────────────────────────────────────────────────────────────"

  # Get top 10 tests by wait time across all runs
  jq -r '
    [.[].summaries[]] |
    group_by(.testName) |
    map({
      testName: .[0].testName,
      totalWaitMs: (map(.totalWaitMs) | add),
      waitCount: (map(.waitCount) | add)
    }) |
    sort_by(-.totalWaitMs) |
    .[0:10] |
    .[] |
    "  \(.testName)|    └─ \(.totalWaitMs)ms (\(.waitCount) calls)"
  ' "$wait_file" | while IFS='|' read -r test_line detail_line; do
    wait_output "$test_line"
    wait_output "$detail_line"
  done

  wait_output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Function to print test results summary
print_test_summary() {
  local output_file="${BUILDKITE_BUILD_CHECKOUT_PATH}/.CI_TEST_RESULTS_SUMMARY.txt"

  # Helper function to output to both console and file
  output_line() {
    echo "$1"
    echo "$1" >> "$output_file"
  }

  # Clear the file
  > "$output_file"

  output_line ""
  output_line "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  output_line "📊 CI TEST RESULTS SUMMARY"
  output_line "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  printf "%-30s %8s %8s %8s %8s %8s\n" "Section" "Tests" "Passed" "Failed" "Skipped" "Suites" | tee -a "$output_file"
  output_line "────────────────────────────────────────────────────────────────────────────"

  for result in "${TEST_RESULTS[@]}"; do
    IFS='|' read -r name tests passed failed skipped suites <<< "$result"
    printf "%-30s %8s %8s %8s %8s %8s\n" "$name" "$tests" "$passed" "$failed" "$skipped" "$suites" | tee -a "$output_file"
  done

  output_line "────────────────────────────────────────────────────────────────────────────"
  printf "%-30s %8s %8s %8s %8s %8s\n" "TOTAL" "$TOTAL_TESTS" "$TOTAL_PASSED" "$TOTAL_FAILED" "$TOTAL_SKIPPED" "$TOTAL_SUITES" | tee -a "$output_file"
  output_line "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ $TOTAL_SKIPPED -gt 0 ]; then
    output_line "⚠️  Warning: $TOTAL_SKIPPED tests are currently skipped"
  fi

  # Print wait time summary
  print_wait_time_summary "$output_file"

  if [ $TOTAL_FAILED -gt 0 ]; then
    output_line "❌ FAILED: $TOTAL_FAILED tests failed"
    output_line ""
    output_line "Summary written to: .CI_TEST_RESULTS_SUMMARY.txt"
    return 1
  else
    output_line "✅ SUCCESS: All $TOTAL_PASSED tests passed"
    output_line ""
    output_line "Summary written to: .CI_TEST_RESULTS_SUMMARY.txt"
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
if [ "$OS" = "linux" ]; then
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
elif [ "$OS" = "macos" ]; then
  # macOS: Check for Homebrew and install dependencies if needed
  if ! command -v brew &> /dev/null; then
    echo "Homebrew not found. Please install Homebrew first: https://brew.sh"
    exit 1
  fi

  # Check for jq
  if ! command -v jq &> /dev/null; then
    echo "Installing jq for test result aggregation..."
    brew install jq
  fi

  # Xcode command line tools provide most build dependencies
  if ! xcode-select -p &> /dev/null; then
    echo "Xcode Command Line Tools not found. Installing..."
    xcode-select --install
    echo "Please re-run this script after Xcode Command Line Tools installation completes."
    exit 1
  fi

  echo "System dependencies available ✓"
fi

# Clear wait time tracking file from previous runs
rm -f "$WAIT_TIME_FILE"

# ============================================================================
# Portable timeout command (macOS doesn't have GNU timeout by default)
# ============================================================================
if [ "$OS" = "macos" ]; then
  if command -v gtimeout &> /dev/null; then
    # Use GNU timeout from coreutils if available
    timeout() { gtimeout "$@"; }
  else
    # Fallback: install coreutils or use perl-based timeout
    if ! command -v gtimeout &> /dev/null; then
      echo "Installing GNU coreutils for timeout command..."
      brew install coreutils
    fi
    timeout() { gtimeout "$@"; }
  fi
fi

# ============================================================================
# Install Node.js 24.x if not already present
# ============================================================================
if ! command -v node &> /dev/null; then
  echo "--- :nodejs: Installing Node.js 24.x"
  if [ "$OS" = "linux" ]; then
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
    apt-get install -y nodejs
  elif [ "$OS" = "macos" ]; then
    brew install node@24 || brew install node
    brew link --overwrite node@24 2>/dev/null || true
  fi
fi
node --version

# ============================================================================
# Require pnpm
# ============================================================================
echo "--- :package: Setting up pnpm"
if command -v pnpm &> /dev/null; then
  echo "pnpm already available ✓"
elif [ "$(id -u)" -eq 0 ]; then
  # Running as root (CI environment) - use corepack
  echo "Enabling pnpm via corepack..."
  corepack enable
  corepack prepare pnpm@latest --activate
else
  echo "ERROR: pnpm is required but not installed."
  echo "Install with: npm install -g pnpm"
  exit 1
fi
pnpm --version

# ============================================================================
# Install Go 1.24.x if not already present
# ============================================================================
if ! command -v go &> /dev/null && [ ! -d "/usr/local/go" ]; then
  echo "--- :golang: Installing Go 1.24.10"
  GO_VERSION=1.24.10
  if [ "$OS" = "linux" ]; then
    GO_ARCHIVE="go${GO_VERSION}.linux-${ARCH}.tar.gz"
    wget -q "https://go.dev/dl/${GO_ARCHIVE}"
    tar -C /usr/local -xzf "${GO_ARCHIVE}"
    rm "${GO_ARCHIVE}"
  elif [ "$OS" = "macos" ]; then
    GO_ARCHIVE="go${GO_VERSION}.darwin-${ARCH}.tar.gz"
    curl -fsSLO "https://go.dev/dl/${GO_ARCHIVE}"
    sudo tar -C /usr/local -xzf "${GO_ARCHIVE}"
    rm "${GO_ARCHIVE}"
  fi
fi

# Set up Go path - check both /usr/local/go and Homebrew locations
if [ -d "/usr/local/go" ]; then
  export PATH=/usr/local/go/bin:$PATH
  GO_CMD=/usr/local/go/bin/go
elif command -v go &> /dev/null; then
  GO_CMD=go
else
  echo "Go not found. Please install Go 1.24+"
  exit 1
fi
$GO_CMD version

# ============================================================================
# STEP 0: Clone/Update Fyne with embedded driver patch
# ============================================================================
echo "--- :package: Updating Fyne fork"

# Fyne fork is co-located at ../fyne (go.mod uses replace => ../../../fyne)
FYNE_DIR="${BUILDKITE_BUILD_CHECKOUT_PATH}/../fyne"

if [ -d "$FYNE_DIR" ]; then
  echo "Pulling latest from Fyne fork..."
  cd "$FYNE_DIR" && git pull --ff-only
  echo "Fyne updated ✓"
else
  echo "ERROR: Fyne fork not found at $FYNE_DIR"
  echo "Clone it with: git clone <your-fyne-fork> $FYNE_DIR"
  exit 1
fi

# ============================================================================
# STEP 1: Go Bridge Build
# ============================================================================
echo "--- :golang: Building Go bridge"

# Build bridge - GOPROXY=direct fetches from VCS repos directly (bypasses Google's proxy)
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/core/bridge
env CGO_ENABLED=1 GOPROXY=direct $GO_CMD build -o ../bin/tsyne-bridge .

echo "Building Go shared library for FFI..."
if [ "$OS" = "linux" ]; then
  env CGO_ENABLED=1 GOPROXY=direct $GO_CMD build -buildmode=c-shared -o ../bin/libtsyne.so .
elif [ "$OS" = "macos" ]; then
  env CGO_ENABLED=1 GOPROXY=direct $GO_CMD build -buildmode=c-shared -o ../bin/libtsyne.dylib .
fi

# ============================================================================
# STEP 2: Core (Tsyne Core Library)
# ============================================================================
echo "--- :nodejs: Core - Install & Build"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/core
pnpm install --ignore-scripts
pnpm run build

echo "--- :test_tube: Core - Unit Tests"
# Check if headed mode is requested
if [ "${TSYNE_HEADED}" = "1" ]; then
  echo "Running in HEADED mode (using existing DISPLAY: ${DISPLAY:-:0})"
  export TSYNE_HEADED=1
  # Use existing DISPLAY or default to :0 (Linux only)
  if [ "$OS" = "linux" ]; then
    export DISPLAY=${DISPLAY:-:0}
  fi
else
  echo "Running in HEADLESS mode"
  if [ "$OS" = "linux" ]; then
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
  elif [ "$OS" = "macos" ]; then
    # macOS doesn't need Xvfb - Fyne can render headlessly
    echo "macOS: No Xvfb needed ✓"
  fi
fi

timeout 600 pnpm run test:unit --json --outputFile=/tmp/core-test-results.json || {
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo "❌ Core unit tests timed out after 600 seconds"
  else
    echo "❌ Core unit tests failed (exit code: $EXIT_CODE)"
  fi
}
capture_test_results "Core" "/tmp/core-test-results.json" || true

# ============================================================================
# STEP 2.5: Cosyne - Declarative Canvas Library
# ============================================================================
echo "--- :art: Cosyne - Install & Build"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/cosyne
pnpm install --ignore-scripts
pnpm run build || {
  echo "❌ Cosyne build failed"
  exit 1
}

echo "--- :test_tube: Cosyne - Unit Tests"
timeout 120 pnpm run test --json --outputFile=/tmp/cosyne-test-results.json || {
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo "❌ Cosyne tests timed out after 120 seconds"
  else
    echo "❌ Cosyne tests failed (exit code: $EXIT_CODE)"
  fi
}
capture_test_results "Cosyne" "/tmp/cosyne-test-results.json" || true

# ============================================================================
# STEP 3: Designer Sub-Project
# ============================================================================
echo "--- :art: Designer - Install & Build"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/designer
if [ -f "package.json" ]; then
  pnpm install --ignore-scripts
  pnpm run build || {
    echo "❌ Designer build failed"
    exit 1
  }

  echo "--- :test_tube: Designer - Unit Tests"
  timeout 90 pnpm run test:unit --json --outputFile=/tmp/designer-unit-test-results.json || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
      echo "❌ Designer unit tests timed out after 90 seconds"
    else
      echo "❌ Designer unit tests failed (exit code: $EXIT_CODE)"
    fi
  }
  capture_test_results "Designer: Unit" "/tmp/designer-unit-test-results.json" || true

  echo "--- :test_tube: Designer - GUI Tests"
  timeout 90 pnpm run test:gui --json --outputFile=/tmp/designer-gui-test-results.json || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
      echo "❌ Designer GUI tests timed out after 90 seconds"
    else
      echo "❌ Designer GUI tests failed (exit code: $EXIT_CODE)"
    fi
  }
  capture_test_results "Designer: GUI" "/tmp/designer-gui-test-results.json" || true
else
  echo "⚠️  No package.json found in designer/ - skipping"
fi

# ============================================================================
# STEP 4: Examples Sub-Project
# ============================================================================
echo "--- :bulb: Examples - Install & Tests"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/examples
pnpm install --ignore-scripts

echo "--- :test_tube: Examples - Logic Tests"
timeout 150 pnpm run test:logic --json --outputFile=/tmp/examples-logic-test-results.json || {
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo "❌ Examples logic tests timed out after 150 seconds"
  else
    echo "❌ Examples logic tests failed (exit code: $EXIT_CODE)"
  fi
}
capture_test_results "Examples: Logic" "/tmp/examples-logic-test-results.json" || true

echo "--- :test_tube: Examples - GUI Tests"
timeout 150 pnpm run test:gui --json --outputFile=/tmp/examples-gui-test-results.json || {
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo "❌ Examples GUI tests timed out after 150 seconds"
  else
    echo "❌ Examples GUI tests failed (exit code: $EXIT_CODE)"
  fi
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
  pnpm install --ignore-scripts
fi

# Helper function to build and test a ported app
test_ported_app() {
  local app_name=$1
  local bridge_mode=$2
  local json_file="/tmp/ported-${app_name}-test-results.json"
  echo "--- :package: Ported App: ${app_name}"
  cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/ported-apps/${app_name}
  pnpm install --ignore-scripts
  if [ -n "$bridge_mode" ]; then
    echo "Using bridge mode: $bridge_mode"
    TSYNE_BRIDGE_MODE=$bridge_mode timeout 300 pnpm test --json --outputFile="$json_file" || {
      capture_test_results "Ported: ${app_name}" "$json_file"
      return 1
    }
  else
    timeout 300 pnpm test --json --outputFile="$json_file" || {
      capture_test_results "Ported: ${app_name}" "$json_file"
      return 1
    }
  fi
  capture_test_results "Ported: ${app_name}" "$json_file"
}

# Test each ported app (continue even if some fail to collect all results)
set +e  # Temporarily disable exit-on-error to collect all test results

# Mobile/Web App Ports (7 apps: 314 Jest tests, 3,963 lines)
test_ported_app "sample-food-truck" || true
test_ported_app "expense-tracker" || true
test_ported_app "nextcloud" || true
test_ported_app "duckduckgo" || true
test_ported_app "wikipedia" || true
test_ported_app "element" || true
test_ported_app "ebooks" || true

# Game/Utility Ports
test_ported_app "3d-cube" || true
test_ported_app "boing" || true
test_ported_app "calcudoku" || true
test_ported_app "chess" || true
test_ported_app "falling-blocks" || true
test_ported_app "falling-letters" || true
test_ported_app "find-pairs" || true
test_ported_app "fyles" || true
test_ported_app "game-of-life" "msgpack-uds" || true
test_ported_app "image-viewer" || true
test_ported_app "mahjongg" || true
test_ported_app "peg-solitaire" || true
test_ported_app "pixeledit" || true
test_ported_app "prime-grid-visualizer" || true
test_ported_app "slydes" || true
test_ported_app "solitaire" || true
test_ported_app "slider-puzzle" || true
test_ported_app "sudoku" || true
test_ported_app "tango-puzzle" || true
test_ported_app "terminal" || true
test_ported_app "zip-puzzle" || true

set -e  # Re-enable exit-on-error

# ============================================================================
# STEP 6: Phone Apps Sub-Projects
# ============================================================================
echo "--- :iphone: Phone Apps - Install & Test"

# Helper function to build and test a phone app
test_phone_app() {
  local app_name=$1
  local json_file="/tmp/phone-${app_name}-test-results.json"
  local app_dir="${BUILDKITE_BUILD_CHECKOUT_PATH}/phone-apps/${app_name}"

  if [ ! -f "${app_dir}/package.json" ]; then
    echo "⚠️  ${app_name}: No package.json - skipping"
    return 0
  fi

  echo "--- :iphone: Phone App: ${app_name}"
  cd "${app_dir}"
  pnpm install --ignore-scripts
  timeout 300 pnpm test --json --outputFile="$json_file" || {
    capture_test_results "Phone: ${app_name}" "$json_file"
    return 1
  }
  capture_test_results "Phone: ${app_name}" "$json_file"
}

# Test each phone app (continue even if some fail to collect all results)
set +e  # Temporarily disable exit-on-error to collect all test results
test_phone_app "3d-clock" || true
test_phone_app "3d-draggable-chess" || true
test_phone_app "3d-lighting-lab" || true
test_phone_app "3d-robot-arm" || true
test_phone_app "animated-spinner" || true
test_phone_app "gauge-dashboard" || true
test_phone_app "heatmap-demo" || true
test_phone_app "alarms" || true
test_phone_app "audio-recorder" || true
test_phone_app "burning-ship" || true
test_phone_app "calendar" || true
test_phone_app "camera" || true
test_phone_app "clock" || true
test_phone_app "contacts" || true
test_phone_app "dialer" || true
test_phone_app "eliza" || true
test_phone_app "eyes" || true
test_phone_app "hexview" || true
test_phone_app "julia-set" || true
test_phone_app "mandelbrot" || true
test_phone_app "minefield" || true
test_phone_app "music-player" || true
test_phone_app "newton-fractal" || true
test_phone_app "notes" || true
test_phone_app "pixyne" || true
test_phone_app "signal" || true
test_phone_app "snowflake" || true
test_phone_app "sonic3" || true
test_phone_app "sshterm" || true
test_phone_app "stopwatch" || true
test_phone_app "telegram" || true
test_phone_app "timer" || true
test_phone_app "tricorn" || true
test_phone_app "weather" || true
set -e  # Re-enable exit-on-error

# ============================================================================
# STEP 7: Larger Apps Sub-Projects
# ============================================================================
echo "--- :rocket: Larger Apps - Install & Test"

# Helper function to build and test a larger app
test_larger_app() {
  local app_name=$1
  local json_file="/tmp/larger-${app_name}-test-results.json"
  local app_dir="${BUILDKITE_BUILD_CHECKOUT_PATH}/larger-apps/${app_name}"

  if [ ! -f "${app_dir}/package.json" ]; then
    echo "⚠️  ${app_name}: No package.json - skipping"
    return 0
  fi

  echo "--- :rocket: Larger App: ${app_name}"
  cd "${app_dir}"
  pnpm install --ignore-scripts
  timeout 300 pnpm test --json --outputFile="$json_file" || {
    capture_test_results "Larger: ${app_name}" "$json_file"
    return 1
  }
  capture_test_results "Larger: ${app_name}" "$json_file"
}

# Test each larger app (continue even if some fail to collect all results)
set +e  # Temporarily disable exit-on-error to collect all test results
test_larger_app "literate-programming" || true
test_larger_app "realtime-paris-density-simulation" || true
set -e  # Re-enable exit-on-error

# ============================================================================
# STEP 8: Test Apps (Logic + GUI Tests)
# ============================================================================
echo "--- :test_tube: Test Apps - Tests"

# Helper function to test a test-app with logic tests (pure JS, no GUI)
test_test_app_logic() {
  local app_name=$1
  local json_file="/tmp/test-app-${app_name}-logic-test-results.json"
  local app_dir="${BUILDKITE_BUILD_CHECKOUT_PATH}/test-apps/${app_name}"

  if [ ! -d "${app_dir}" ]; then
    echo "⚠️  ${app_name}: Directory not found - skipping"
    return 0
  fi

  echo "--- :test_tube: Test App: ${app_name} (Logic)"
  cd "${BUILDKITE_BUILD_CHECKOUT_PATH}/core"

  # Run pure logic tests using roots override to include test-apps directory
  timeout 60 npx jest --roots="${app_dir}" --testMatch='**/*-logic.test.ts' \
    --json --outputFile="$json_file" || {
    capture_test_results "TestApp: ${app_name} Logic" "$json_file"
    return 1
  }
  capture_test_results "TestApp: ${app_name} Logic" "$json_file"
}

# Helper function to test a test-app with GUI tests (requires Tsyne bridge)
test_test_app_gui() {
  local app_name=$1
  local json_file="/tmp/test-app-${app_name}-gui-test-results.json"
  local app_dir="${BUILDKITE_BUILD_CHECKOUT_PATH}/test-apps/${app_name}"

  if [ ! -d "${app_dir}" ]; then
    echo "⚠️  ${app_name}: Directory not found - skipping"
    return 0
  fi

  # Check if calculator.test.ts exists (GUI test)
  if [ ! -f "${app_dir}/calculator.test.ts" ]; then
    echo "⚠️  ${app_name}: No GUI test found - skipping"
    return 0
  fi

  echo "--- :test_tube: Test App: ${app_name} (GUI)"
  cd "${BUILDKITE_BUILD_CHECKOUT_PATH}/core"

  # Run GUI tests using roots override
  timeout 120 npx jest --roots="${app_dir}" --testMatch='**/calculator.test.ts' \
    --json --outputFile="$json_file" || {
    capture_test_results "TestApp: ${app_name} GUI" "$json_file"
    return 1
  }
  capture_test_results "TestApp: ${app_name} GUI" "$json_file"
}

# Test each test-app (continue even if some fail to collect all results)
set +e  # Temporarily disable exit-on-error to collect all test results
test_test_app_logic "calculator-advanced" || true
test_test_app_gui "calculator-advanced" || true
set -e  # Re-enable exit-on-error

# ============================================================================
# STEP 9: Android Native Build (optional - requires Android SDK)
# ============================================================================
echo "--- :android: Android Native - Build"

# Check for Android SDK
if [ -n "$ANDROID_HOME" ] && [ -d "$ANDROID_HOME" ]; then
  cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/android-native

  # Create local.properties if it doesn't exist
  if [ ! -f "local.properties" ]; then
    echo "sdk.dir=$ANDROID_HOME" > local.properties
    echo "ndk.dir=$ANDROID_HOME/ndk/26.1.10909125" >> local.properties
  fi

  echo "Building Android native app..."
  ./gradlew assembleDebug --no-daemon 2>&1 || {
    echo "⚠️  Android build failed (non-fatal)"
  }

  if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    echo "✅ Android APK built successfully"
    ls -la app/build/outputs/apk/debug/app-debug.apk
  fi
else
  echo "⚠️  Android SDK not found (ANDROID_HOME not set) - skipping Android build"
fi

# ============================================================================
# Cleanup (do this before summary so it always runs)
# ============================================================================
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}
# Only kill Xvfb if we started it (Linux headless mode only)
if [ "$OS" = "linux" ] && [ -n "${XVFB_PID}" ]; then
  kill $XVFB_PID 2>/dev/null || true
fi

# ============================================================================
# Print Test Summary (this will exit with failure code if tests failed)
# ============================================================================
print_test_summary

echo "--- :white_check_mark: Build complete"
