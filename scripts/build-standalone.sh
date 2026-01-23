#!/bin/bash
#
# Build standalone Tsyne executable
#
# Creates a single executable that bundles:
# - Node.js runtime
# - Tsyne TypeScript (core + cosyne)
# - tsyne-bridge (Go/Fyne binary)
#
# Usage:
#   ./scripts/build-standalone.sh              # Build for current platform
#   ./scripts/build-standalone.sh --all        # Build for all platforms
#   ./scripts/build-standalone.sh --linux      # Build for Linux only
#   ./scripts/build-standalone.sh --macos      # Build for macOS only
#   ./scripts/build-standalone.sh --windows    # Build for Windows only
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CORE_DIR="$ROOT_DIR/core"
OUTPUT_DIR="$ROOT_DIR/standalone"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
  echo -e "${BLUE}[tsyne]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[tsyne]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[tsyne]${NC} $1"
}

log_error() {
  echo -e "${RED}[tsyne]${NC} $1"
}

# Parse arguments
BUILD_LINUX=false
BUILD_MACOS=false
BUILD_WINDOWS=false

if [[ $# -eq 0 ]]; then
  # Default: build for current platform
  case "$(uname -s)" in
    Linux*)   BUILD_LINUX=true ;;
    Darwin*)  BUILD_MACOS=true ;;
    MINGW*|MSYS*|CYGWIN*) BUILD_WINDOWS=true ;;
    *)        log_error "Unknown platform: $(uname -s)"; exit 1 ;;
  esac
else
  for arg in "$@"; do
    case $arg in
      --all)
        BUILD_LINUX=true
        BUILD_MACOS=true
        BUILD_WINDOWS=true
        ;;
      --linux)
        BUILD_LINUX=true
        ;;
      --macos)
        BUILD_MACOS=true
        ;;
      --windows)
        BUILD_WINDOWS=true
        ;;
      *)
        log_error "Unknown argument: $arg"
        echo "Usage: $0 [--all|--linux|--macos|--windows]"
        exit 1
        ;;
    esac
  done
fi

log "Building standalone Tsyne executable..."
echo ""

# Step 1: Ensure TypeScript is built
log "Building TypeScript..."
cd "$CORE_DIR"
pnpm run build

# Step 2: Build bridge binaries if needed
log "Checking bridge binaries..."
NEED_BRIDGE_BUILD=false

if $BUILD_LINUX && [[ ! -f "$ROOT_DIR/bin/tsyne-bridge-linux-amd64" ]]; then
  NEED_BRIDGE_BUILD=true
fi
if $BUILD_MACOS && [[ ! -f "$ROOT_DIR/bin/tsyne-bridge-darwin-amd64" ]]; then
  NEED_BRIDGE_BUILD=true
fi
if $BUILD_WINDOWS && [[ ! -f "$ROOT_DIR/bin/tsyne-bridge-windows-amd64.exe" ]]; then
  NEED_BRIDGE_BUILD=true
fi

if $NEED_BRIDGE_BUILD; then
  log "Building bridge binaries..."
  cd "$ROOT_DIR"

  if $BUILD_LINUX && $BUILD_MACOS && $BUILD_WINDOWS; then
    ./scripts/build-all-platforms.sh
  else
    cd bridge
    mkdir -p ../bin
    go mod download

    if $BUILD_LINUX; then
      log "Building bridge for Linux..."
      GOOS=linux GOARCH=amd64 go build -o ../bin/tsyne-bridge-linux-amd64
    fi
    if $BUILD_MACOS; then
      log "Building bridge for macOS (Intel)..."
      GOOS=darwin GOARCH=amd64 go build -o ../bin/tsyne-bridge-darwin-amd64
      log "Building bridge for macOS (Apple Silicon)..."
      GOOS=darwin GOARCH=arm64 go build -o ../bin/tsyne-bridge-darwin-arm64
    fi
    if $BUILD_WINDOWS; then
      log "Building bridge for Windows..."
      GOOS=windows GOARCH=amd64 go build -o ../bin/tsyne-bridge-windows-amd64.exe
    fi

    cd ..
  fi
else
  log "Bridge binaries already exist, skipping build"
fi

# Step 3: Create output directory
mkdir -p "$OUTPUT_DIR"

# Step 4: Build standalone executables with pkg
log "Packaging standalone executables with pkg..."
cd "$CORE_DIR"

# pkg targets: https://github.com/vercel/pkg#targets
# Format: node{version}-{platform}-{arch}
PKG_TARGETS=""

if $BUILD_LINUX; then
  PKG_TARGETS="$PKG_TARGETS,node18-linux-x64"
fi
if $BUILD_MACOS; then
  PKG_TARGETS="$PKG_TARGETS,node18-macos-x64,node18-macos-arm64"
fi
if $BUILD_WINDOWS; then
  PKG_TARGETS="$PKG_TARGETS,node18-win-x64"
fi

# Remove leading comma
PKG_TARGETS="${PKG_TARGETS#,}"

if [[ -z "$PKG_TARGETS" ]]; then
  log_error "No targets specified"
  exit 1
fi

log "Targets: $PKG_TARGETS"

# Run pkg
npx pkg dist/src/cli.js \
  --targets "$PKG_TARGETS" \
  --output "$OUTPUT_DIR/tsyne" \
  --config package.json

# Step 5: Bundle bridge binaries with each executable
log "Bundling bridge binaries..."

bundle_bridge() {
  local exe="$1"
  local bridge="$2"
  local output="$3"

  if [[ -f "$exe" ]] && [[ -f "$bridge" ]]; then
    # Create a directory with both files
    local dir="$OUTPUT_DIR/$(basename "$output" | sed 's/\.[^.]*$//')"
    mkdir -p "$dir"
    cp "$exe" "$dir/"
    cp "$bridge" "$dir/tsyne-bridge"

    # On Unix, make executable
    if [[ ! "$exe" == *.exe ]]; then
      chmod +x "$dir/$(basename "$exe")"
      chmod +x "$dir/tsyne-bridge"
    fi

    log_success "Created: $dir/"
  fi
}

# Bundle for each platform
if $BUILD_LINUX; then
  bundle_bridge \
    "$OUTPUT_DIR/tsyne-linux-x64" \
    "$ROOT_DIR/bin/tsyne-bridge-linux-amd64" \
    "tsyne-linux-x64"
fi

if $BUILD_MACOS; then
  bundle_bridge \
    "$OUTPUT_DIR/tsyne-macos-x64" \
    "$ROOT_DIR/bin/tsyne-bridge-darwin-amd64" \
    "tsyne-macos-x64"
  bundle_bridge \
    "$OUTPUT_DIR/tsyne-macos-arm64" \
    "$ROOT_DIR/bin/tsyne-bridge-darwin-arm64" \
    "tsyne-macos-arm64"
fi

if $BUILD_WINDOWS; then
  bundle_bridge \
    "$OUTPUT_DIR/tsyne-win-x64.exe" \
    "$ROOT_DIR/bin/tsyne-bridge-windows-amd64.exe" \
    "tsyne-win-x64"
fi

# Step 6: Summary
echo ""
log_success "Standalone builds complete!"
echo ""
log "Output directory: $OUTPUT_DIR"
echo ""

if [[ -d "$OUTPUT_DIR" ]]; then
  ls -la "$OUTPUT_DIR"/
  echo ""
  du -sh "$OUTPUT_DIR"/*/
fi

echo ""
log "To run a standalone build:"
log "  cd $OUTPUT_DIR/tsyne-linux-x64"
log "  ./tsyne-linux-x64 your-app.ts"
