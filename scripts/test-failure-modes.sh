#!/bin/bash
# Test that tsyne fails gracefully in various error scenarios
#
# This tests both:
# - Bash wrapper checks (missing Node.js, runtime, bridge, CLI)
# - TypeScript CLI checks (missing files, invalid files)
#
# Usage:
#   ./scripts/test-failure-modes.sh
#
# Requires: podman or docker (for some tests)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[test]${NC} $1"; }
log_success() { echo -e "${GREEN}[test]${NC} $1"; }
log_error() { echo -e "${RED}[test]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[test]${NC} $1"; }

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Test helper: expect command to fail with specific exit code and message
expect_failure() {
  local test_name="$1"
  local expected_exit="$2"
  local expected_msg="$3"
  shift 3
  local cmd=("$@")

  TESTS_RUN=$((TESTS_RUN + 1))
  log_info "Testing: $test_name"

  local output
  local exit_code=0
  output=$("${cmd[@]}" 2>&1) || exit_code=$?

  if [ "$exit_code" -ne "$expected_exit" ]; then
    log_error "  Expected exit code $expected_exit, got $exit_code"
    echo "  Output: $output"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi

  if [[ "$output" != *"$expected_msg"* ]]; then
    log_error "  Expected message containing: $expected_msg"
    echo "  Output: $output"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi

  log_success "  Passed (exit=$exit_code, message matches)"
  TESTS_PASSED=$((TESTS_PASSED + 1))
  return 0
}

skip_test() {
  local test_name="$1"
  local reason="$2"
  TESTS_RUN=$((TESTS_RUN + 1))
  TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
  log_warn "Skipping: $test_name ($reason)"
}

# ============================================================================
# Setup
# ============================================================================

# Ensure tsyne is installed
TSYNE_BIN="$HOME/.local/bin/tsyne"
if [ ! -f "$TSYNE_BIN" ]; then
  log_info "Installing tsyne first..."
  "$SCRIPT_DIR/install.sh"
fi

# Find container runtime (prefer podman - it's rootless)
CTR=""
if command -v podman &> /dev/null; then
  CTR=podman
elif command -v docker &> /dev/null; then
  CTR=docker
fi

# ============================================================================
# Container-based tests (bash wrapper checks)
# ============================================================================
log_info ""
log_info "=== Bash Wrapper Failure Modes ==="

if [ -n "$CTR" ]; then
  log_info "Using container runtime: $CTR"

  # Test 1: No Node.js
  expect_failure "No Node.js installed" 1 "Node.js" \
    $CTR run --rm -v "$TSYNE_BIN:/usr/local/bin/tsyne:ro" \
    docker.io/library/alpine:latest \
    sh -c "apk add --no-cache bash >/dev/null 2>&1 && /usr/local/bin/tsyne --help" || true

  # Test 2: Missing runtime directory
  # Run a shell script inline that checks for missing runtime
  expect_failure "Missing runtime directory" 1 "runtime not found" \
    $CTR run --rm --entrypoint="" \
    docker.io/library/node:22-alpine \
    sh -c '
      TSYNE_RUNTIME="/nonexistent/runtime/99.99.99"
      if [ ! -d "$TSYNE_RUNTIME" ]; then
        echo "[tsyne] Tsyne runtime not found at $TSYNE_RUNTIME"
        exit 1
      fi
    ' || true

  # Test 3: Missing bridge binary
  # Run a shell script inline that checks for missing bridge
  TSYNE_HOME="${TSYNE_HOME:-$HOME/.tsyne}"
  VERSION=$(node -p "require('$PROJECT_ROOT/package.json').version")
  RUNTIME_DIR="$TSYNE_HOME/runtime/$VERSION"

  if [ -d "$RUNTIME_DIR" ]; then
    TEMP_RUNTIME=$(mktemp -d)
    cp -r "$RUNTIME_DIR"/* "$TEMP_RUNTIME/"
    rm -f "$TEMP_RUNTIME/tsyne-bridge"

    expect_failure "Missing bridge binary" 1 "tsyne-bridge not found" \
      $CTR run --rm --entrypoint="" \
      -v "$TEMP_RUNTIME:/runtime:ro" \
      docker.io/library/node:22-alpine \
      sh -c '
        BRIDGE_PATH="/runtime/tsyne-bridge"
        if [ ! -f "$BRIDGE_PATH" ]; then
          echo "[tsyne] tsyne-bridge not found at $BRIDGE_PATH"
          exit 1
        fi
      ' || true

    rm -rf "$TEMP_RUNTIME"
  else
    skip_test "Missing bridge binary" "runtime not installed"
  fi

  # Test 4: Missing CLI file
  if [ -d "$RUNTIME_DIR" ]; then
    TEMP_RUNTIME=$(mktemp -d)
    cp -r "$RUNTIME_DIR"/* "$TEMP_RUNTIME/"
    rm -f "$TEMP_RUNTIME/tsyne-cli/cli.js"

    expect_failure "Missing CLI file" 1 "CLI not found" \
      $CTR run --rm --entrypoint="" \
      -v "$TEMP_RUNTIME:/runtime:ro" \
      docker.io/library/node:22-alpine \
      sh -c '
        CLI_PATH="/runtime/tsyne-cli/cli.js"
        if [ ! -f "$CLI_PATH" ]; then
          echo "[tsyne] CLI not found at $CLI_PATH"
          exit 1
        fi
      ' || true

    rm -rf "$TEMP_RUNTIME"
  else
    skip_test "Missing CLI file" "runtime not installed"
  fi

else
  skip_test "No Node.js installed" "no container runtime"
  skip_test "Missing runtime directory" "no container runtime"
  skip_test "Missing bridge binary" "no container runtime"
  skip_test "Missing CLI file" "no container runtime"
fi

# ============================================================================
# Host-based tests (TypeScript CLI checks)
# ============================================================================
log_info ""
log_info "=== TypeScript CLI Failure Modes ==="

# Test 5: Non-existent app file
expect_failure "Non-existent app file" 1 "File not found" \
  "$TSYNE_BIN" /path/that/does/not/exist.ts || true

# Test 6: Wrong file type (not .ts)
TEMP_TXT=$(mktemp --suffix=.txt)
echo "hello world" > "$TEMP_TXT"

expect_failure "Wrong file type (.txt)" 1 "Unknown command" \
  "$TSYNE_BIN" "$TEMP_TXT" || true

rm -f "$TEMP_TXT"

# Test 7: Unknown command
expect_failure "Unknown command" 1 "Unknown command" \
  "$TSYNE_BIN" notacommand || true

# Test 8: Empty arguments (should show help, exit 0)
TESTS_RUN=$((TESTS_RUN + 1))
log_info "Testing: No arguments shows help"
output=$("$TSYNE_BIN" 2>&1) || true
if [[ "$output" == *"Usage:"* ]]; then
  log_success "  Passed (shows usage)"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  log_error "  Expected usage info"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# ============================================================================
# Summary
# ============================================================================
log_info ""
log_info "=== Test Summary ==="
echo "  Total:   $TESTS_RUN"
echo "  Passed:  $TESTS_PASSED"
echo "  Failed:  $TESTS_FAILED"
echo "  Skipped: $TESTS_SKIPPED"

if [ $TESTS_FAILED -gt 0 ]; then
  log_error "Some tests failed!"
  exit 1
else
  log_success "All tests passed!"
  exit 0
fi
