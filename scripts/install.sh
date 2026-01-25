#!/bin/bash
# Install tsyne to system
#
# Usage:
#   ./scripts/install.sh              # Install to ~/.local/bin (user install)
#   sudo ./scripts/install.sh /usr/local/bin  # Install to /usr/local/bin (system install)
#
# This installs the tsyne CLI and runtime. Requires Node.js on the system.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[install]${NC} $1"; }
log_success() { echo -e "${GREEN}[install]${NC} $1"; }
log_error() { echo -e "${RED}[install]${NC} $1"; }

# Determine install location
INSTALL_DIR="${1:-$HOME/.local/bin}"
TSYNE_HOME="${TSYNE_HOME:-$HOME/.tsyne}"

# Get version from package.json using node (cross-platform)
VERSION=$(node -p "require('$PROJECT_ROOT/package.json').version")
RUNTIME_DIR="$TSYNE_HOME/runtime/$VERSION"

log_info "Installing tsyne v$VERSION"
log_info "  Binary: $INSTALL_DIR/tsyne"
log_info "  Runtime: $RUNTIME_DIR"

# Check prerequisites
if ! command -v node &> /dev/null; then
    log_error "Node.js is required but not found. Please install Node.js first."
    exit 1
fi

# Ensure TypeScript is built
if [ ! -f "$PROJECT_ROOT/core/dist/src/cli.js" ]; then
    log_info "Building TypeScript..."
    (cd "$PROJECT_ROOT" && npm run build:core)
fi

# Ensure bridge is built
BRIDGE_SRC="$PROJECT_ROOT/core/bin/tsyne-bridge"
if [ ! -f "$BRIDGE_SRC" ]; then
    log_info "Building tsyne-bridge..."
    if command -v go &> /dev/null; then
        (cd "$PROJECT_ROOT" && npm run build:bridge)
    else
        log_error "Go is required to build tsyne-bridge but not found."
        exit 1
    fi
fi

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p "$RUNTIME_DIR"

# Install runtime
log_info "Installing runtime to $RUNTIME_DIR..."

# Copy CLI and core modules to tsyne-cli/ for clear stack traces
mkdir -p "$RUNTIME_DIR/tsyne-cli"
cp -r "$PROJECT_ROOT/core/dist/src"/* "$RUNTIME_DIR/tsyne-cli/"
cp "$PROJECT_ROOT/core/package.json" "$RUNTIME_DIR/"

# Copy tsyne-bridge
cp "$BRIDGE_SRC" "$RUNTIME_DIR/tsyne-bridge"

# Copy cosyne
if [ -d "$PROJECT_ROOT/cosyne/dist" ]; then
    mkdir -p "$RUNTIME_DIR/cosyne"
    cp -r "$PROJECT_ROOT/cosyne/dist" "$RUNTIME_DIR/cosyne/"
    cp "$PROJECT_ROOT/cosyne/package.json" "$RUNTIME_DIR/cosyne/"
fi

# Copy node_modules dependencies (dereference symlinks - pnpm uses symlinks that break when copied)
mkdir -p "$RUNTIME_DIR/node_modules"
cp -rL "$PROJECT_ROOT/core/node_modules"/* "$RUNTIME_DIR/node_modules/" 2>/dev/null || true
cp -rL "$PROJECT_ROOT/node_modules"/* "$RUNTIME_DIR/node_modules/" 2>/dev/null || true

# Create the installed tsyne wrapper script
log_info "Installing tsyne to $INSTALL_DIR..."
cat > "$INSTALL_DIR/tsyne" << 'SCRIPT_EOF'
#!/bin/bash
# tsyne - TypeScript native GUI runner
# Installed version - uses runtime from ~/.tsyne/runtime/<version>/
#
# This is a thin wrapper that delegates to the TypeScript CLI.
# All logic is in TypeScript for cross-platform compatibility.

set -e

TSYNE_HOME="${TSYNE_HOME:-$HOME/.tsyne}"
TSYNE_VERSION="__VERSION__"
TSYNE_RUNTIME="$TSYNE_HOME/runtime/$TSYNE_VERSION"

# Colors
RED='\033[0;31m'
NC='\033[0m'

log_error() { echo -e "${RED}[tsyne]${NC} $1"; }

# Check for Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js is required but not found. Please install Node.js first."
    exit 1
fi

# Check runtime exists
if [ ! -d "$TSYNE_RUNTIME" ]; then
    log_error "Tsyne runtime not found at $TSYNE_RUNTIME"
    log_error "Please reinstall tsyne"
    exit 1
fi

# Set up bridge path
BRIDGE_PATH="$TSYNE_RUNTIME/tsyne-bridge"
if [ ! -f "$BRIDGE_PATH" ]; then
    log_error "tsyne-bridge not found at $BRIDGE_PATH"
    exit 1
fi
export TSYNE_BRIDGE_PATH="$BRIDGE_PATH"

# Set up NODE_PATH
EFFECTIVE_NODE_PATH="$TSYNE_RUNTIME:$TSYNE_RUNTIME/node_modules"
if [ -d "$TSYNE_RUNTIME/cosyne" ]; then
    EFFECTIVE_NODE_PATH="$EFFECTIVE_NODE_PATH:$TSYNE_RUNTIME/cosyne"
fi
if [ -n "$NODE_PATH" ]; then
    EFFECTIVE_NODE_PATH="$EFFECTIVE_NODE_PATH:$NODE_PATH"
fi

# Find CLI
CLI_PATH="$TSYNE_RUNTIME/tsyne-cli/cli.js"
if [ ! -f "$CLI_PATH" ]; then
    log_error "CLI not found at $CLI_PATH"
    exit 1
fi

# Run the TypeScript CLI
NODE_PATH="$EFFECTIVE_NODE_PATH" node "$CLI_PATH" "$@"
SCRIPT_EOF

# Replace version placeholder
sed -i "s/__VERSION__/$VERSION/g" "$INSTALL_DIR/tsyne"
chmod +x "$INSTALL_DIR/tsyne"

log_success "Installation complete!"
echo ""
echo "Make sure $INSTALL_DIR is in your PATH:"
echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
echo ""
echo "Then run:"
echo "  tsyne --help"
echo "  tsyne your-app.ts"
