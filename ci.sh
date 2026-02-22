#!/bin/bash
set -e

# Kill entire process group on Ctrl-C or SIGTERM (prevents orphaned children)
trap 'echo ""; echo "Interrupted — killing child processes..."; kill 0; exit 130' INT TERM

# ============================================================================
# Command Line Options
# ============================================================================
SKIP_TESTS=false
VERBOSE=false
QUICK_MODE=false
UNIT_ONLY=false
BUILD_BRIDGE_ONLY=false
TARGET=""

# Track timing for sections
declare -A SECTION_TIMES
declare -A SECTION_DURATIONS

time_section() {
  local name="$1"
  local start_time=$(date +%s%N)
  SECTION_TIMES[$name]=$start_time
}

report_section_time() {
  local name="$1"
  local start_time=${SECTION_TIMES[$name]:-0}
  if [ "$start_time" -gt 0 ]; then
    local end_time=$(date +%s%N)
    local elapsed_ms=$(( (end_time - start_time) / 1000000 ))
    local elapsed_s=$(echo "scale=2; $elapsed_ms / 1000" | bc)
    echo "⏱️  ${name}: ${elapsed_s}s"
  fi
}

# should_run checks if a given section should execute based on TARGET.
# If TARGET is empty, everything runs. Otherwise only the matching section runs.
should_run() {
  local section="$1"
  [ -z "$TARGET" ] || [ "$TARGET" = "$section" ]
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-tests|--no-tests)
      SKIP_TESTS=true
      shift
      ;;
    --quick|-q)
      QUICK_MODE=true
      echo "Quick mode enabled - skipping heavy tests"
      shift
      ;;
    --unit-only|-u)
      UNIT_ONLY=true
      echo "Unit tests only - skipping ported/phone apps"
      shift
      ;;
    --bridge-only)
      BUILD_BRIDGE_ONLY=true
      echo "Building bridge only"
      shift
      ;;
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [TARGET] [OPTIONS]"
      echo ""
      echo "Targets (optional — blank runs everything):"
      echo "  cleanup        Kill orphaned processes from previous runs"
      echo "  bridge         Go bridge build only"
      echo "  summary        Aggregate and print test results from all steps"
      echo "  core           Core build + unit tests"
      echo "  cosyne         Cosyne build + tests (assumes core already built)"
      echo "  trine          Three.js setup + tests"
      echo "  designer       Designer build + tests"
      echo "  examples       Examples tests"
      echo "  ported-apps    Ported app tests"
      echo "  phone-apps     Phone app tests"
      echo "  launchers      Desktop/PhoneTop launcher tests"
      echo "  larger-apps    Larger app tests"
      echo "  test-apps      Test apps (calculator-advanced)"
      echo "  android        Android native build"
      echo ""
      echo "Options:"
      echo "  --skip-tests, --no-tests  Skip all test execution (build only)"
      echo "  --quick, -q               Quick mode: skip heavy ported app tests"
      echo "  --unit-only, -u           Run only core/cosyne unit tests"
      echo "  --bridge-only             Build Go bridge only, then exit"
      echo "  --verbose, -v             Show verbose output"
      echo "  --help, -h                Show this help message"
      exit 0
      ;;
    -*)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
    *)
      # Positional argument = target
      TARGET="$1"
      shift
      ;;
  esac
done

# Validate target if specified
if [ -n "$TARGET" ]; then
  case "$TARGET" in
    cleanup|bridge|core|cosyne|trine|designer|examples|ported-apps|phone-apps|launchers|larger-apps|test-apps|android|summary)
      echo "Target: $TARGET"
      ;;
    *)
      echo "Unknown target: $TARGET"
      echo "Use --help to see available targets"
      exit 1
      ;;
  esac
fi

echo ""
echo "Mode summary:"
[ -n "$TARGET" ] && echo "  ✓ Target: $TARGET" || echo "  ✓ Target: all"
[ "$SKIP_TESTS" = true ] && echo "  ✓ Tests SKIPPED" || echo "  ✓ Tests ENABLED"
[ "$QUICK_MODE" = true ] && echo "  ✓ Quick mode (fewer tests)"
[ "$UNIT_ONLY" = true ] && echo "  ✓ Unit tests only"
[ "$BUILD_BRIDGE_ONLY" = true ] && echo "  ✓ Bridge build only"
echo ""

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
TOTAL_DURATION=0

# Wait time tracking file (cleared at start, aggregated at end)
WAIT_TIME_FILE="/tmp/tsyne-wait-times.json"

# Format seconds as human-readable duration
format_duration() {
  local secs=$1
  if [ "$secs" -ge 60 ]; then
    echo "$((secs / 60))m$((secs % 60))s"
  else
    echo "${secs}s"
  fi
}

# Wall-clock timestamp banner for lost-time analysis
# Usage: log_ts "▶ Section Name" or log_ts "◀ Section Name" "42s"
log_ts() {
  local msg="$1"
  local extra="$2"
  local ts=$(date '+%H:%M:%S')
  if [ -n "$extra" ]; then
    echo "⏱  [$ts] $msg ($extra)"
  else
    echo "⏱  [$ts] $msg"
  fi
}

CI_START_TIME=$(date +%s)
log_ts "▶ CI run started"

# Function to capture test results from Jest JSON output
capture_test_results() {
  local section_name="$1"
  local json_file="$2"
  local duration=${SECTION_DURATIONS[$section_name]:-""}

  # Format duration
  local duration_str=""
  if [ -n "$duration" ] && [ "$duration" -gt 0 ] 2>/dev/null; then
    TOTAL_DURATION=$((TOTAL_DURATION + duration))
    duration_str=$(format_duration "$duration")
  fi

  if [ -f "$json_file" ]; then
    local tests=$(jq '.numTotalTests' "$json_file")
    local passed=$(jq '.numPassedTests' "$json_file")
    local failed=$(jq '.numFailedTests' "$json_file")
    local skipped=$(jq '.numPendingTests' "$json_file")
    local suites=$(jq '.numTotalTestSuites' "$json_file")
    local suites_passed=$(jq '.numPassedTestSuites' "$json_file")
    local suites_failed=$(jq '.numFailedTestSuites' "$json_file")

    TEST_RESULTS+=("$section_name|$tests|$passed|$failed|$skipped|$duration_str|$suites|$suites_passed|$suites_failed")

    TOTAL_TESTS=$((TOTAL_TESTS + tests))
    TOTAL_PASSED=$((TOTAL_PASSED + passed))
    TOTAL_FAILED=$((TOTAL_FAILED + failed))
    TOTAL_SKIPPED=$((TOTAL_SKIPPED + skipped))
    TOTAL_SUITES=$((TOTAL_SUITES + suites))
    TOTAL_SUITES_PASSED=$((TOTAL_SUITES_PASSED + suites_passed))
    TOTAL_SUITES_FAILED=$((TOTAL_SUITES_FAILED + suites_failed))
  elif [ -n "$duration_str" ]; then
    # No JSON output (e.g., timeout killed process) — still show duration
    TEST_RESULTS+=("$section_name|0|0|0|0|$duration_str|0|0|0")
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
  printf "%-30s %8s %8s %8s %8s %9s %8s\n" "Section" "Tests" "Passed" "Failed" "Skipped" "Duration" "Suites" | tee -a "$output_file"
  output_line "─────────────────────────────────────────────────────────────────────────────────────"

  for result in "${TEST_RESULTS[@]}"; do
    IFS='|' read -r name tests passed failed skipped duration suites <<< "$result"
    printf "%-30s %8s %8s %8s %8s %9s %8s\n" "$name" "$tests" "$passed" "$failed" "$skipped" "$duration" "$suites" | tee -a "$output_file"
  done

  output_line "─────────────────────────────────────────────────────────────────────────────────────"
  local total_duration_str=""
  if [ $TOTAL_DURATION -gt 0 ]; then
    total_duration_str=$(format_duration "$TOTAL_DURATION")
  fi
  printf "%-30s %8s %8s %8s %8s %9s %8s\n" "TOTAL" "$TOTAL_TESTS" "$TOTAL_PASSED" "$TOTAL_FAILED" "$TOTAL_SKIPPED" "$total_duration_str" "$TOTAL_SUITES" | tee -a "$output_file"
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
# Cleanup: kill orphaned processes from previous CI runs
# ============================================================================
if [ "$TARGET" = "cleanup" ]; then
  echo "--- :broom: Cleanup orphaned processes"
  log_ts "▶ Cleanup"
  KILLED=0
  # Kill orphaned tsyne-bridge processes (left behind by tests that didn't clean up)
  if pkill -f "tsyne-bridge --mode=" 2>/dev/null; then
    KILLED=$((KILLED + 1))
    echo "Killed orphaned tsyne-bridge processes"
  fi
  # Kill orphaned jest-worker processes
  if pkill -f "jest-worker" 2>/dev/null; then
    KILLED=$((KILLED + 1))
    echo "Killed orphaned jest-worker processes"
  fi
  if [ $KILLED -eq 0 ]; then
    echo "No orphaned processes found"
  fi
  log_ts "◀ Cleanup"
fi

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
# STEP 1: Go Bridge Build
# ============================================================================
if should_run bridge; then
echo "--- :golang: Building Go bridge"
log_ts "▶ Go Bridge Build"
time_section "Go Bridge Build"

# Build bridge - setup-fyne-fork.sh creates a patched Fyne fork in fyne-fork/
# (go.mod uses replace fyne.io/fyne/v2 => ./fyne-fork)
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/core/bridge
./setup-fyne-fork.sh
env GOPROXY=direct $GO_CMD mod tidy
env CGO_ENABLED=1 GOPROXY=direct $GO_CMD build -o ../bin/tsyne-bridge .

echo "Building Go shared library for FFI..."
# Brief pause to let CGO/gcc processes from the bridge build fully exit,
# avoiding "fork/exec: resource temporarily unavailable" on constrained CI agents.
sleep 2
if [ "$OS" = "linux" ]; then
  env CGO_ENABLED=1 GOPROXY=direct $GO_CMD build -buildmode=c-shared -o ../bin/libtsyne.so .
elif [ "$OS" = "macos" ]; then
  env CGO_ENABLED=1 GOPROXY=direct $GO_CMD build -buildmode=c-shared -o ../bin/libtsyne.dylib .
fi

report_section_time "Go Bridge Build"
log_ts "◀ Go Bridge Build"

# Exit early if only building bridge
if [ "$BUILD_BRIDGE_ONLY" = true ]; then
  echo "--- :white_check_mark: Bridge build complete (--bridge-only mode)"
  exit 0
fi
fi # should_run bridge

# ============================================================================
# STEP 1.5: Install root dependencies
# ============================================================================
# Always run pnpm install — it's fast when node_modules exists and every
# JS target needs it. Skip only for bridge/cleanup/android which don't.
if [ -z "$TARGET" ] || ! echo "bridge cleanup android" | grep -qw "$TARGET"; then
echo "--- :nodejs: Installing root dependencies"
log_ts "▶ pnpm install"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}
pnpm install --ignore-scripts
log_ts "◀ pnpm install"
fi

# ============================================================================
# STEP 1.6: Test tsyne install and failure modes (full run only)
# ============================================================================
if [ -z "$TARGET" ]; then
echo "--- :package: Testing tsyne install"
log_ts "▶ tsyne install test"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}
./scripts/install.sh

# Test failure modes
echo "Testing tsyne failure modes..."
./scripts/test-failure-modes.sh || {
  echo "⚠️  Failure mode tests failed (non-fatal)"
}
log_ts "◀ tsyne install test"
fi # no TARGET (full run only)

# ============================================================================
# STEP 2: Core (Tsyne Core Library)
# ============================================================================
if should_run core; then
echo "--- :nodejs: Core - Build"
log_ts "▶ Core Build"
time_section "Core Build"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/core
pnpm run build
report_section_time "Core Build"
log_ts "◀ Core Build"

if [ "$SKIP_TESTS" = false ]; then
  echo "--- :test_tube: Core - Unit Tests"
  log_ts "▶ Core Tests"
  time_section "Core Tests"
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

  _ts=$(date +%s)
  timeout 600 pnpm run test:unit --json --outputFile=/tmp/core-test-results.json || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
      echo "❌ Core unit tests timed out after 600 seconds"
    else
      echo "❌ Core unit tests failed (exit code: $EXIT_CODE)"
    fi
  }
  _elapsed=$(( $(date +%s) - _ts ))
  SECTION_DURATIONS["Core"]=$_elapsed
  capture_test_results "Core" "/tmp/core-test-results.json" || true
  report_section_time "Core Tests"
  log_ts "◀ Core Tests" "$(format_duration $_elapsed)"
fi
fi # should_run core

# ============================================================================
# STEP 2.5: Cosyne - Declarative Canvas Library
# ============================================================================
if should_run cosyne; then
echo "--- :art: Cosyne - Build"
log_ts "▶ Cosyne Build"
time_section "Cosyne Build"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/cosyne
pnpm run build || {
  echo "❌ Cosyne build failed"
  exit 1
}
report_section_time "Cosyne Build"
log_ts "◀ Cosyne Build"

if [ "$SKIP_TESTS" = false ]; then
  echo "--- :test_tube: Cosyne - Unit Tests"
  log_ts "▶ Cosyne Tests"
  time_section "Cosyne Tests"
  _ts=$(date +%s)
  timeout 120 pnpm run test --json --outputFile=/tmp/cosyne-test-results.json || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
      echo "❌ Cosyne tests timed out after 120 seconds"
    else
      echo "❌ Cosyne tests failed (exit code: $EXIT_CODE)"
    fi
  }
  _elapsed=$(( $(date +%s) - _ts ))
  SECTION_DURATIONS["Cosyne"]=$_elapsed
  capture_test_results "Cosyne" "/tmp/cosyne-test-results.json" || true
  report_section_time "Cosyne Tests"
  log_ts "◀ Cosyne Tests" "$(format_duration $_elapsed)"
fi
fi # should_run cosyne

# ============================================================================
# STEP 2.6: Tsyne-Three - Three.js Integration
# ============================================================================
if should_run trine; then
if [ "$UNIT_ONLY" = true ]; then
  echo "⏭️  Trine - Skipping (--unit-only mode)"
else
  echo "--- :three: Trine - Setup & Test"
  log_ts "▶ Trine Setup"
  time_section "Trine Setup"
  cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/trine

  # Setup three.js (clone and apply patch)
  echo "Setting up three.js..."
  ./setup-three.sh
  report_section_time "Trine Setup"
  log_ts "◀ Trine Setup"

  if [ "$SKIP_TESTS" = false ]; then
    echo "--- :test_tube: Trine - Tests"
    log_ts "▶ Trine Tests"
    time_section "Trine Tests"
    # 228 test files each launch a bridge — run serialized with forceExit so
    # partial results are written even if we hit the timeout.
    _ts=$(date +%s)
    timeout 120 npx jest --maxWorkers=1 --forceExit \
      --json --outputFile=/tmp/trine-test-results.json || {
      EXIT_CODE=$?
      if [ $EXIT_CODE -eq 124 ]; then
        echo "❌ Trine tests timed out after 120 seconds"
      else
        echo "❌ Trine tests failed (exit code: $EXIT_CODE)"
      fi
    }
    _elapsed=$(( $(date +%s) - _ts ))
    SECTION_DURATIONS["Trine"]=$_elapsed
    capture_test_results "Trine" "/tmp/trine-test-results.json" || true
    report_section_time "Trine Tests"
    log_ts "◀ Trine Tests" "$(format_duration $_elapsed)"
  fi
fi
fi # should_run trine

# ============================================================================
# STEP 3: Designer Sub-Project
# ============================================================================
if should_run designer; then
if [ "$UNIT_ONLY" = true ]; then
  echo "⏭️  Designer - Skipping (--unit-only mode)"
else
  echo "--- :art: Designer - Build"
  log_ts "▶ Designer Build"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/designer
if [ -f "package.json" ]; then
  pnpm run build || {
    echo "❌ Designer build failed"
    exit 1
  }
  log_ts "◀ Designer Build"

  if [ "$SKIP_TESTS" = false ]; then
    echo "--- :test_tube: Designer - Unit Tests"
    log_ts "▶ Designer Unit Tests"
    _ts=$(date +%s)
    timeout 90 pnpm run test:unit --json --outputFile=/tmp/designer-unit-test-results.json || {
      EXIT_CODE=$?
      if [ $EXIT_CODE -eq 124 ]; then
        echo "❌ Designer unit tests timed out after 90 seconds"
      else
        echo "❌ Designer unit tests failed (exit code: $EXIT_CODE)"
      fi
    }
    _elapsed=$(( $(date +%s) - _ts ))
    SECTION_DURATIONS["Designer: Unit"]=$_elapsed
    capture_test_results "Designer: Unit" "/tmp/designer-unit-test-results.json" || true
    log_ts "◀ Designer Unit Tests" "$(format_duration $_elapsed)"

    echo "--- :test_tube: Designer - GUI Tests"
    log_ts "▶ Designer GUI Tests"
    _ts=$(date +%s)
    timeout 90 pnpm run test:gui --json --outputFile=/tmp/designer-gui-test-results.json || {
      EXIT_CODE=$?
      if [ $EXIT_CODE -eq 124 ]; then
        echo "❌ Designer GUI tests timed out after 90 seconds"
      else
        echo "❌ Designer GUI tests failed (exit code: $EXIT_CODE)"
      fi
    }
    _elapsed=$(( $(date +%s) - _ts ))
    SECTION_DURATIONS["Designer: GUI"]=$_elapsed
    capture_test_results "Designer: GUI" "/tmp/designer-gui-test-results.json" || true
    log_ts "◀ Designer GUI Tests" "$(format_duration $_elapsed)"
  fi
else
  echo "⚠️  No package.json found in designer/ - skipping"
fi
fi
fi # should_run designer

# ============================================================================
# STEP 4: Examples Sub-Project
# ============================================================================
if should_run examples; then
if [ "$UNIT_ONLY" = true ]; then
  echo "⏭️  Examples - Skipping (--unit-only mode)"
else
  echo "--- :bulb: Examples - Tests"
cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/examples

if [ "$SKIP_TESTS" = false ]; then
  echo "--- :test_tube: Examples - Logic Tests"
  log_ts "▶ Examples Logic Tests"
  _ts=$(date +%s)
  timeout 150 pnpm run test:logic --json --outputFile=/tmp/examples-logic-test-results.json || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
      echo "❌ Examples logic tests timed out after 150 seconds"
    else
      echo "❌ Examples logic tests failed (exit code: $EXIT_CODE)"
    fi
  }
  _elapsed=$(( $(date +%s) - _ts ))
  SECTION_DURATIONS["Examples: Logic"]=$_elapsed
  capture_test_results "Examples: Logic" "/tmp/examples-logic-test-results.json" || true
  log_ts "◀ Examples Logic Tests" "$(format_duration $_elapsed)"

  echo "--- :test_tube: Examples - GUI Tests"
  log_ts "▶ Examples GUI Tests"
  _ts=$(date +%s)
  timeout 60 npx jest --maxWorkers=1 --forceExit \
    --json --outputFile=/tmp/examples-gui-test-results.json || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
      echo "❌ Examples GUI tests timed out after 60 seconds"
    else
      echo "❌ Examples GUI tests failed (exit code: $EXIT_CODE)"
    fi
  }
  _elapsed=$(( $(date +%s) - _ts ))
  SECTION_DURATIONS["Examples: GUI"]=$_elapsed
  capture_test_results "Examples: GUI" "/tmp/examples-gui-test-results.json" || true
  log_ts "◀ Examples GUI Tests" "$(format_duration $_elapsed)"
fi
fi
fi # should_run examples

# ============================================================================
# STEP 5: Ported Apps Sub-Projects
# ============================================================================
if should_run ported-apps; then
if [ "$SKIP_TESTS" = false ] && [ "$UNIT_ONLY" = false ] && [ "$QUICK_MODE" = false ]; then
  echo "--- :package: Ported Apps - Test"
elif [ "$UNIT_ONLY" = true ] || [ "$QUICK_MODE" = true ]; then
  echo "⏭️  Ported Apps - Skipping ($([ "$UNIT_ONLY" = true ] && echo '--unit-only' || echo '--quick') mode)"
fi

if [ "$SKIP_TESTS" = false ] && [ "$UNIT_ONLY" = false ] && [ "$QUICK_MODE" = false ]; then
  cd ${BUILDKITE_BUILD_CHECKOUT_PATH}/ported-apps

  # Helper function to build and test a ported app
  test_ported_app() {
    local app_name=$1
    local bridge_mode=$2
    local json_file="/tmp/ported-${app_name}-test-results.json"
    local app_dir="${BUILDKITE_BUILD_CHECKOUT_PATH}/ported-apps/${app_name}"

    if [ ! -f "${app_dir}/package.json" ]; then
      echo "⚠️  ${app_name}: No package.json - skipping"
      return 0
    fi

    echo "--- :package: Ported App: ${app_name}"
    log_ts "▶ Ported: ${app_name}"
    cd "${app_dir}"
    local _ts=$(date +%s)
    local _exit=0
    if [ -n "$bridge_mode" ]; then
      echo "Using bridge mode: $bridge_mode"
      TSYNE_BRIDGE_MODE=$bridge_mode timeout 180 pnpm test --forceExit --maxWorkers=1 --json --outputFile="$json_file" || _exit=$?
    else
      timeout 180 pnpm test --forceExit --maxWorkers=1 --json --outputFile="$json_file" || _exit=$?
    fi
    local _elapsed=$(( $(date +%s) - _ts ))
    SECTION_DURATIONS["Ported: ${app_name}"]=$_elapsed
    capture_test_results "Ported: ${app_name}" "$json_file"
    log_ts "◀ Ported: ${app_name}" "$(format_duration $_elapsed)"
    return $_exit
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

  # New demo ports (3 apps)
  test_ported_app "alteredqualia-cars" || true
  test_ported_app "colordodge-kaleidoscope" || true
  test_ported_app "script-schmiede-fractals" || true

  # Game/Utility Ports
  test_ported_app "3d-cube" || true
  test_ported_app "boing" || true
  test_ported_app "calcudoku" || true
  test_ported_app "chess" || true
  test_ported_app "connect4" || true
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
  test_ported_app "svg-tetris" || true
  test_ported_app "tango-puzzle" || true
  test_ported_app "terminal" || true
  test_ported_app "trajans-column" || true
  test_ported_app "tumbling-cube" || true
  test_ported_app "zip-puzzle" || true

  set -e  # Re-enable exit-on-error
fi
fi # should_run ported-apps

# ============================================================================
# STEP 6: Phone Apps Sub-Projects
# ============================================================================
if should_run phone-apps; then
if [ "$SKIP_TESTS" = false ] && [ "$UNIT_ONLY" = false ] && [ "$QUICK_MODE" = false ]; then
  echo "--- :iphone: Phone Apps - Test"
elif [ "$UNIT_ONLY" = true ] || [ "$QUICK_MODE" = true ]; then
  echo "⏭️  Phone Apps - Skipping ($([ "$UNIT_ONLY" = true ] && echo '--unit-only' || echo '--quick') mode)"
fi

if [ "$SKIP_TESTS" = false ] && [ "$UNIT_ONLY" = false ] && [ "$QUICK_MODE" = false ]; then

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
    log_ts "▶ Phone: ${app_name}"
    cd "${app_dir}"
    local _ts=$(date +%s)
    local _exit=0
    timeout 180 pnpm test --forceExit --maxWorkers=1 --json --outputFile="$json_file" || _exit=$?
    local _elapsed=$(( $(date +%s) - _ts ))
    SECTION_DURATIONS["Phone: ${app_name}"]=$_elapsed
    capture_test_results "Phone: ${app_name}" "$json_file"
    log_ts "◀ Phone: ${app_name}" "$(format_duration $_elapsed)"
    return $_exit
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
fi
fi # should_run phone-apps

# ============================================================================
# STEP 6.5: Launchers (Desktop, PhoneTop)
# ============================================================================
if should_run launchers; then
if [ "$SKIP_TESTS" = false ] && [ "$UNIT_ONLY" = false ] && [ "$QUICK_MODE" = false ]; then
  echo "--- :computer: Launchers - Test"
elif [ "$UNIT_ONLY" = true ] || [ "$QUICK_MODE" = true ]; then
  echo "⏭️  Launchers - Skipping ($([ "$UNIT_ONLY" = true ] && echo '--unit-only' || echo '--quick') mode)"
fi

if [ "$SKIP_TESTS" = false ] && [ "$UNIT_ONLY" = false ] && [ "$QUICK_MODE" = false ]; then

  # Helper function to build and test a launcher
  test_launcher() {
    local launcher_name=$1
    local json_file="/tmp/launcher-${launcher_name}-test-results.json"
    local launcher_dir="${BUILDKITE_BUILD_CHECKOUT_PATH}/launchers/${launcher_name}"

    if [ ! -f "${launcher_dir}/jest.config.js" ]; then
      echo "⚠️  ${launcher_name}: No jest.config.js - skipping tests"
      return 0
    fi

    echo "--- :computer: Launcher: ${launcher_name}"
    log_ts "▶ Launcher: ${launcher_name}"
    cd "${launcher_dir}"
    local _ts=$(date +%s)
    local _exit=0
    timeout 180 npx jest --forceExit --maxWorkers=1 --json --outputFile="$json_file" || _exit=$?
    local _elapsed=$(( $(date +%s) - _ts ))
    SECTION_DURATIONS["Launcher: ${launcher_name}"]=$_elapsed
    capture_test_results "Launcher: ${launcher_name}" "$json_file"
    log_ts "◀ Launcher: ${launcher_name}" "$(format_duration $_elapsed)"
    return $_exit
  }

  # Test each launcher (continue even if some fail to collect all results)
  set +e  # Temporarily disable exit-on-error to collect all test results
  test_launcher "desktop" || true
  test_launcher "phonetop" || true
  set -e  # Re-enable exit-on-error
fi
fi # should_run launchers

# ============================================================================
# STEP 7: Larger Apps Sub-Projects
# ============================================================================
if should_run larger-apps; then
if [ "$SKIP_TESTS" = false ] && [ "$UNIT_ONLY" = false ] && [ "$QUICK_MODE" = false ]; then
  echo "--- :rocket: Larger Apps - Test"
elif [ "$UNIT_ONLY" = true ] || [ "$QUICK_MODE" = true ]; then
  echo "⏭️  Larger Apps - Skipping ($([ "$UNIT_ONLY" = true ] && echo '--unit-only' || echo '--quick') mode)"
fi

if [ "$SKIP_TESTS" = false ] && [ "$UNIT_ONLY" = false ] && [ "$QUICK_MODE" = false ]; then

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
    log_ts "▶ Larger: ${app_name}"
    cd "${app_dir}"
    local _ts=$(date +%s)
    local _exit=0
    timeout 180 pnpm test --forceExit --maxWorkers=1 --json --outputFile="$json_file" || _exit=$?
    local _elapsed=$(( $(date +%s) - _ts ))
    SECTION_DURATIONS["Larger: ${app_name}"]=$_elapsed
    capture_test_results "Larger: ${app_name}" "$json_file"
    log_ts "◀ Larger: ${app_name}" "$(format_duration $_elapsed)"
    return $_exit
  }

  # Test each larger app (continue even if some fail to collect all results)
  set +e  # Temporarily disable exit-on-error to collect all test results
  test_larger_app "literate-programming" || true
  test_larger_app "realtime-paris-density-simulation" || true
  set -e  # Re-enable exit-on-error
fi
fi # should_run larger-apps

# ============================================================================
# STEP 8: Test Apps (Logic + GUI Tests)
# ============================================================================
if should_run test-apps; then
if [ "$SKIP_TESTS" = false ]; then
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
    log_ts "▶ TestApp: ${app_name} Logic"
    cd "${BUILDKITE_BUILD_CHECKOUT_PATH}/core"

    # Run pure logic tests using roots override to include test-apps directory
    local _ts=$(date +%s)
    local _exit=0
    timeout 60 npx jest --roots="${app_dir}" --testMatch='**/*-logic.test.ts' \
      --json --outputFile="$json_file" || _exit=$?
    local _elapsed=$(( $(date +%s) - _ts ))
    SECTION_DURATIONS["TestApp: ${app_name} Logic"]=$_elapsed
    capture_test_results "TestApp: ${app_name} Logic" "$json_file"
    log_ts "◀ TestApp: ${app_name} Logic" "$(format_duration $_elapsed)"
    return $_exit
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
    log_ts "▶ TestApp: ${app_name} GUI"
    cd "${BUILDKITE_BUILD_CHECKOUT_PATH}/core"

    # Run GUI tests using roots override
    local _ts=$(date +%s)
    local _exit=0
    timeout 120 npx jest --roots="${app_dir}" --testMatch='**/calculator.test.ts' \
      --json --outputFile="$json_file" || _exit=$?
    local _elapsed=$(( $(date +%s) - _ts ))
    SECTION_DURATIONS["TestApp: ${app_name} GUI"]=$_elapsed
    capture_test_results "TestApp: ${app_name} GUI" "$json_file"
    log_ts "◀ TestApp: ${app_name} GUI" "$(format_duration $_elapsed)"
    return $_exit
  }

  # Test each test-app (continue even if some fail to collect all results)
  set +e  # Temporarily disable exit-on-error to collect all test results
  test_test_app_logic "calculator-advanced" || true
  test_test_app_gui "calculator-advanced" || true
  set -e  # Re-enable exit-on-error
fi
fi # should_run test-apps

# ============================================================================
# STEP 9: Android Native Build (optional - requires Android SDK)
# ============================================================================
if should_run android; then
echo "--- :android: Android Native - Build"
log_ts "▶ Android Build"

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
log_ts "◀ Android Build"
fi # should_run android

# ============================================================================
# Summary: Aggregate all /tmp/*-test-results.json into a results table
# ============================================================================
if should_run summary; then
  echo "--- :bar_chart: Test Results Summary"
  log_ts "▶ Summary"

  # Re-read all JSON result files and feed them into the existing aggregation
  for json_file in /tmp/*-test-results.json; do
    [ -f "$json_file" ] || continue
    basename=$(basename "$json_file" -test-results.json)

    # Map filename back to section name
    case "$basename" in
      core)                      section="Core" ;;
      cosyne)                    section="Cosyne" ;;
      trine)                     section="Trine" ;;
      designer-unit)             section="Designer: Unit" ;;
      designer-gui)              section="Designer: GUI" ;;
      examples-logic)            section="Examples: Logic" ;;
      examples-gui)              section="Examples: GUI" ;;
      test-app-*-logic)          section="TestApp: ${basename#test-app-}"; section="${section%-logic} Logic" ;;
      test-app-*-gui)            section="TestApp: ${basename#test-app-}"; section="${section%-gui} GUI" ;;
      ported-*)                  section="Ported: ${basename#ported-}" ;;
      phone-*)                   section="Phone: ${basename#phone-}" ;;
      launcher-*)                section="Launcher: ${basename#launcher-}" ;;
      larger-*)                  section="Larger: ${basename#larger-}" ;;
      *)                         section="$basename" ;;
    esac

    capture_test_results "$section" "$json_file"
  done

  print_test_summary
  log_ts "◀ Summary"
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
# Print Test Summary (full-run mode only — for sub-target builds, use "summary")
# ============================================================================
if [ -z "$TARGET" ] && [ "$SKIP_TESTS" = false ]; then
  print_test_summary
fi

log_ts "◀ CI run finished" "$(format_duration $(( $(date +%s) - CI_START_TIME )))"
echo "--- :white_check_mark: Build complete"
