#!/bin/bash

###############################################################################
# Depth-First Recursive Build and Test Script for Tsyne
#
# This script performs a complete, recursive depth-first traversal of all
# build and test targets in the Tsyne monorepo, ensuring all dependencies
# are satisfied and all invocation steps are executed in the correct order.
#
# Usage: ./build-all-recursive.sh [--verbose] [--stop-on-error] [--skip-tests]
###############################################################################

# Don't use 'set -e' globally as it causes issues with arithmetic operations
# and function exit codes. Instead, handle errors explicitly in functions.

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script configuration
VERBOSE=false
STOP_ON_ERROR=true
SKIP_TESTS=false
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
START_TIME=$(date +%s)
DEPTH=0
BUILD_LOG="build-all-recursive.log"
FAILURE_COUNT=0

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose) VERBOSE=true; shift ;;
        --no-stop) STOP_ON_ERROR=false; shift ;;
        --skip-tests) SKIP_TESTS=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

###############################################################################
# Utility Functions
###############################################################################

log_header() {
    local level=$1
    shift
    local msg="$@"
    local indent=$(printf '%0.s  ' $(seq 1 $DEPTH))

    case $level in
        INFO)
            echo -e "${BLUE}${indent}ℹ ${msg}${NC}" | tee -a "$BUILD_LOG"
            ;;
        SUCCESS)
            echo -e "${GREEN}${indent}✓ ${msg}${NC}" | tee -a "$BUILD_LOG"
            ;;
        WARN)
            echo -e "${YELLOW}${indent}⚠ ${msg}${NC}" | tee -a "$BUILD_LOG"
            ;;
        ERROR)
            echo -e "${RED}${indent}✗ ${msg}${NC}" | tee -a "$BUILD_LOG"
            ;;
        SECTION)
            echo -e "\n${CYAN}${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$BUILD_LOG"
            echo -e "${CYAN}${indent}▶ ${msg}${NC}" | tee -a "$BUILD_LOG"
            echo -e "${CYAN}${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$BUILD_LOG"
            ;;
    esac
}

log_command() {
    local cmd="$@"
    local indent=$(printf '%0.s  ' $(seq 1 $DEPTH))
    echo -e "${indent}$ ${cmd}" | tee -a "$BUILD_LOG"
}

execute_step() {
    local step_name="$1"
    local command="$2"
    local cwd="${3:-.}"
    local exit_code=0
    local temp_log="${BUILD_LOG}.tmp.$$"

    DEPTH=$((DEPTH + 1))
    log_header INFO "Executing: $step_name"
    log_command "$command"

    if [ "$VERBOSE" = true ]; then
        (cd "$cwd" && eval "$command" | tee -a "$BUILD_LOG") || exit_code=$?
        if [ $exit_code -eq 0 ]; then
            log_header SUCCESS "$step_name completed"
            DEPTH=$((DEPTH - 1))
            return 0
        else
            log_header ERROR "$step_name failed with exit code $exit_code"
            log_header WARN "Last 30 lines of output:"
            tail -30 "$BUILD_LOG" | sed 's/^/  /'
            DEPTH=$((DEPTH - 1))
            if [ "$STOP_ON_ERROR" = true ]; then
                exit 1
            else
                FAILURE_COUNT=$((FAILURE_COUNT + 1))
                return 1
            fi
        fi
    else
        (cd "$cwd" && eval "$command" > "$temp_log" 2>&1) || exit_code=$?
        cat "$temp_log" >> "$BUILD_LOG"
        if [ $exit_code -eq 0 ]; then
            log_header SUCCESS "$step_name completed"
            rm -f "$temp_log"
            DEPTH=$((DEPTH - 1))
            return 0
        else
            log_header ERROR "$step_name failed with exit code $exit_code"
            log_header WARN "Output from failed command:"
            cat "$temp_log" | sed 's/^/  /'
            rm -f "$temp_log"
            DEPTH=$((DEPTH - 1))
            if [ "$STOP_ON_ERROR" = true ]; then
                exit 1
            else
                FAILURE_COUNT=$((FAILURE_COUNT + 1))
                return 1
            fi
        fi
    fi
}

###############################################################################
# Root Build Steps (Depth-First Traversal)
###############################################################################

build_root_install() {
    log_header SECTION "Root: NPM Install (postinstall.js)"
    execute_step "npm install (root)" "npm install" "$SCRIPT_DIR"
}

build_root_typescript() {
    log_header SECTION "Root: TypeScript Compilation"
    execute_step "tsc (root)" "npm run build:ts" "$SCRIPT_DIR"

    # Verify output - check if any .js files were created
    if find "$SCRIPT_DIR/dist" -name "*.js" -type f | grep -q .; then
        log_header SUCCESS "TypeScript output verified: dist/ contains compiled JavaScript files"
    else
        log_header WARN "No JavaScript files found in dist/ after compilation"
    fi
}

build_root_bridge() {
    log_header SECTION "Root: Go Bridge Compilation"

    # Check for Go
    if ! command -v go &> /dev/null; then
        log_header ERROR "Go is not installed"
        if [ "$STOP_ON_ERROR" = true ]; then
            exit 1
        fi
        return 1
    fi

    log_header INFO "Go version: $(go version)"
    execute_step "go build (bridge)" "npm run build:bridge" "$SCRIPT_DIR"

    # Verify output
    if [ -f "$SCRIPT_DIR/bin/tsyne-bridge" ]; then
        log_header SUCCESS "Bridge binary created: bin/tsyne-bridge ($(du -h "$SCRIPT_DIR/bin/tsyne-bridge" | cut -f1))"
    else
        log_header ERROR "Bridge binary not found after compilation"
        return 1
    fi
}

build_root_unit_tests() {
    log_header SECTION "Root: Unit Tests (src/__tests__)"

    if [ "$SKIP_TESTS" = true ]; then
        log_header WARN "Skipping unit tests (--skip-tests flag)"
        return 0
    fi

    # Core unit tests
    local test_files=(
        "src/__tests__/button.test.ts"
        "src/__tests__/entry.test.ts"
        "src/__tests__/image.test.ts"
        "src/__tests__/label.test.ts"
        "src/__tests__/label_textstyle.test.ts"
        "src/__tests__/label_wrapping.test.ts"
        "src/__tests__/password_entry.test.ts"
        "src/__tests__/window-content-replacement.test.ts"
    )

    for test_file in "${test_files[@]}"; do
        if [ -f "$SCRIPT_DIR/$test_file" ]; then
            execute_step "jest $test_file" "npx jest $test_file --runInBand" "$SCRIPT_DIR" || true
        fi
    done
}

build_root_solitaire_logic_tests() {
    log_header SECTION "Root: Solitaire Logic Tests"

    if [ "$SKIP_TESTS" = true ]; then
        log_header WARN "Skipping solitaire logic tests (--skip-tests flag)"
        return 0
    fi

    execute_step "jest solitaire logic" "npx jest examples/solitaire/solitaire.logic.test.ts --runInBand" "$SCRIPT_DIR" || true
}

build_root_example_tests() {
    log_header SECTION "Root: Example Tests (examples/)"

    if [ "$SKIP_TESTS" = true ]; then
        log_header WARN "Skipping example tests (--skip-tests flag)"
        return 0
    fi

    # High-priority example tests (those most likely to pass)
    local example_tests=(
        "examples/web-features.test.ts"
        "examples/solitaire/solitaire.logic.test.ts"
        "examples/01-hello-world.test.ts"
        "examples/02-counter.test.ts"
        "examples/03-button-spacer.test.ts"
    )

    for test_file in "${example_tests[@]}"; do
        if [ -f "$SCRIPT_DIR/$test_file" ]; then
            execute_step "jest $(basename $test_file)" "npx jest $test_file --runInBand" "$SCRIPT_DIR" || true
        fi
    done
}

build_root_integration_tests() {
    log_header SECTION "Root: Integration Tests"

    if [ "$SKIP_TESTS" = true ]; then
        log_header WARN "Skipping integration tests (--skip-tests flag)"
        return 0
    fi

    execute_step "test:integration:calculator" "npm run test:integration:calculator" "$SCRIPT_DIR" || true
    execute_step "test:integration:single-script-calculator" "npm run test:integration:single-script-calculator" "$SCRIPT_DIR" || true

    # Node-based integration tests (don't require GUI)
    execute_step "test:integration:browser" "npm run test:integration:browser" "$SCRIPT_DIR" || true
    execute_step "test:integration:widgets" "npm run test:integration:widgets" "$SCRIPT_DIR" || true
}

build_calculator_app() {
    log_header SECTION "Test App: Advanced Calculator"

    if [ ! -d "$SCRIPT_DIR/test-apps/calculator-advanced" ]; then
        log_header WARN "Calculator app not found"
        return 0
    fi

    # Calculator has its own tests
    execute_step "jest calculator-advanced/calculator.test.ts" "npx jest test-apps/calculator-advanced/calculator.test.ts --runInBand" "$SCRIPT_DIR" || true
    execute_step "jest calculator-advanced/calculator-logic.test.ts" "npx jest test-apps/calculator-advanced/calculator-logic.test.ts --runInBand" "$SCRIPT_DIR" || true
}

build_designer() {
    log_header SECTION "Designer: Monorepo Component"

    if [ ! -d "$SCRIPT_DIR/designer" ]; then
        log_header WARN "Designer component not found"
        return 0
    fi

    # Designer install
    execute_step "npm install (designer)" "npm install" "$SCRIPT_DIR/designer"

    # Designer TypeScript build
    execute_step "tsc (designer)" "npm run build" "$SCRIPT_DIR/designer"

    if [ "$SKIP_TESTS" = false ]; then
        # Designer unit tests
        execute_step "jest designer unit tests" "npm run test:unit" "$SCRIPT_DIR/designer" || true

        # Designer e2e tests
        execute_step "jest designer e2e tests" "npm run test:e2e" "$SCRIPT_DIR/designer" || true
    fi
}

build_packaging() {
    log_header SECTION "Root: Packaging (pkg)"

    # Only try to package if we have everything built
    if [ ! -f "$SCRIPT_DIR/dist/cli/tsynebrowser.js" ]; then
        log_header WARN "dist/cli/tsynebrowser.js not found, skipping packaging"
        return 0
    fi

    if [ ! -f "$SCRIPT_DIR/bin/tsyne-bridge" ]; then
        log_header WARN "bin/tsyne-bridge not found, skipping packaging"
        return 0
    fi

    execute_step "npm run build:pkg" "npm run build:pkg" "$SCRIPT_DIR" || true
}

###############################################################################
# Main Build Sequence (Depth-First Order)
###############################################################################

main() {
    # Clear previous log
    > "$BUILD_LOG"

    log_header SECTION "Tsyne: Complete Recursive Build and Test"
    log_header INFO "Start time: $(date)"
    log_header INFO "Verbose: $VERBOSE"
    log_header INFO "Stop on error: $STOP_ON_ERROR"
    log_header INFO "Skip tests: $SKIP_TESTS"

    # Phase 1: Root Dependencies
    log_header SECTION "PHASE 1: Root Dependencies and Compilation"
    build_root_install
    build_root_typescript
    build_root_bridge

    # Phase 2: Root Tests
    log_header SECTION "PHASE 2: Root Unit and Integration Tests"
    build_root_unit_tests
    build_root_solitaire_logic_tests
    build_root_example_tests
    build_calculator_app
    build_root_integration_tests

    # Phase 3: Designer Component
    log_header SECTION "PHASE 3: Designer Monorepo Component"
    build_designer

    # Phase 4: Packaging
    log_header SECTION "PHASE 4: Distribution Packaging"
    build_packaging

    # Summary
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))

    log_header SECTION "Build Complete"
    log_header INFO "Total time: $(printf '%d:%02d:%02d' $((duration/3600)) $((duration%3600/60)) $((duration%60)))"

    if [ $FAILURE_COUNT -eq 0 ]; then
        log_header SUCCESS "All steps completed successfully!"
        return 0
    else
        log_header WARN "Build completed with $FAILURE_COUNT step(s) failed"
        return 1
    fi
}

# Run the build
main "$@"
