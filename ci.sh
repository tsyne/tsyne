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

# Clear wait time tracking file from previous runs
rm -f "$WAIT_TIME_FILE"

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
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/core/bridge
/usr/local/go/bin/go mod edit -replace=fyne.io/systray=/tmp/systray-master
env CGO_ENABLED=1 GOPROXY=direct /usr/local/go/bin/go build -o ../bin/tsyne-bridge .

echo "Building Go shared library for FFI..."
env CGO_ENABLED=1 GOPROXY=direct /usr/local/go/bin/go build -buildmode=c-shared -o ../bin/libtsyne.so .

# ============================================================================
# STEP 2: Core (Tsyne Core Library)
# ============================================================================
echo "--- :nodejs: Core - Install & Build"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/core
npm install --ignore-scripts
npm run build

echo "--- :test_tube: Core - Unit Tests"
# Check if headed mode is requested
if [ "${TSYNE_HEADED}" = "1" ]; then
  echo "Running in HEADED mode (using existing DISPLAY: ${DISPLAY:-:0})"
  export TSYNE_HEADED=1
  # Use existing DISPLAY or default to :0
  export DISPLAY=${DISPLAY:-:0}
else
  echo "Running in HEADLESS mode (using Xvfb)"
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
fi

timeout 600 npm run test:unit -- --json --outputFile=/tmp/core-test-results.json || {
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo "❌ Core unit tests timed out after 600 seconds"
  else
    echo "❌ Core unit tests failed (exit code: $EXIT_CODE)"
  fi
}
capture_test_results "Core" "/tmp/core-test-results.json" || true

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
  # Clean corrupted node_modules to avoid tar extraction errors
  rm -rf node_modules
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
test_ported_app "3d-cube" || true
test_ported_app "boing" || true
test_ported_app "chess" || true
test_ported_app "falling-blocks" || true
test_ported_app "falling-letters" || true
test_ported_app "fyles" || true
test_ported_app "game-of-life" "msgpack-uds" || true
test_ported_app "image-viewer" || true
test_ported_app "mahjongg" || true
test_ported_app "pixeledit" || true
test_ported_app "prime-grid-visualizer" || true
test_ported_app "slydes" || true
test_ported_app "solitaire" || true
test_ported_app "sudoku" || true
test_ported_app "terminal" || true
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
  # Clean corrupted node_modules to avoid tar extraction errors
  rm -rf node_modules
  npm install --ignore-scripts
  timeout 300 npm test -- --json --outputFile="$json_file" || {
    capture_test_results "Phone: ${app_name}" "$json_file"
    return 1
  }
  capture_test_results "Phone: ${app_name}" "$json_file"
}

# Test each phone app (continue even if some fail to collect all results)
set +e  # Temporarily disable exit-on-error to collect all test results
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
test_phone_app "snowflake" || true
test_phone_app "sonic3" || true
test_phone_app "sshterm" || true
test_phone_app "stopwatch" || true
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
  # Clean corrupted node_modules to avoid tar extraction errors
  rm -rf node_modules
  npm install --ignore-scripts
  timeout 300 npm test -- --json --outputFile="$json_file" || {
    capture_test_results "Larger: ${app_name}" "$json_file"
    return 1
  }
  capture_test_results "Larger: ${app_name}" "$json_file"
}

# Test each larger app (continue even if some fail to collect all results)
set +e  # Temporarily disable exit-on-error to collect all test results
test_larger_app "literate-programming" || true
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
# Cleanup (do this before summary so it always runs)
# ============================================================================
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}
# Only kill Xvfb if we started it (headless mode)
if [ -n "${XVFB_PID}" ]; then
  kill $XVFB_PID 2>/dev/null || true
fi

# ============================================================================
# Print Test Summary (this will exit with failure code if tests failed)
# ============================================================================
print_test_summary

echo "--- :white_check_mark: Build complete"
