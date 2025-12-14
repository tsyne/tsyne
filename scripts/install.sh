#!/bin/bash
# Install tsyne shell wrapper to system
#
# Usage:
#   ./scripts/install.sh              # Install to ~/.local/bin (user install)
#   sudo ./scripts/install.sh /usr/local/bin  # Install to /usr/local/bin (system install)
#
# This installs the tsyne shell wrapper, which requires Node.js/npm on the system.
# For a fully self-contained tsyne.exe, see the TODO in docs/TODO.md.

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

# Get version
VERSION=$(grep '"version"' "$PROJECT_ROOT/package.json" | head -1 | grep -oP ':\s*"\K[^"]+')
RUNTIME_DIR="$TSYNE_HOME/runtime/$VERSION"

log_info "Installing tsyne v$VERSION"
log_info "  Binary: $INSTALL_DIR/tsyne"
log_info "  Runtime: $RUNTIME_DIR"

# Check prerequisites
if ! command -v node &> /dev/null; then
    log_error "Node.js is required but not found. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "npm is required but not found. Please install npm first."
    exit 1
fi

# Ensure dist is built
if [ ! -d "$PROJECT_ROOT/dist" ]; then
    log_info "Building TypeScript..."
    (cd "$PROJECT_ROOT" && npm run build:ts)
fi

# Ensure bridge is built
if [ ! -f "$PROJECT_ROOT/bin/tsyne-bridge" ]; then
    log_info "Building tsyne-bridge..."
    if command -v go &> /dev/null; then
        (cd "$PROJECT_ROOT/bridge" && go build -o "$PROJECT_ROOT/bin/tsyne-bridge")
    elif [ -f /usr/local/go/bin/go ]; then
        (cd "$PROJECT_ROOT/bridge" && /usr/local/go/bin/go build -o "$PROJECT_ROOT/bin/tsyne-bridge")
    else
        log_error "Go is required to build tsyne-bridge but not found."
        exit 1
    fi
fi

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p "$RUNTIME_DIR/tsyne"
mkdir -p "$RUNTIME_DIR/node_modules"

# Install runtime
log_info "Installing runtime to $RUNTIME_DIR..."
cp -r "$PROJECT_ROOT/dist" "$RUNTIME_DIR/tsyne/"
cp "$PROJECT_ROOT/package.json" "$RUNTIME_DIR/tsyne/"
cp "$PROJECT_ROOT/bin/tsyne-bridge" "$RUNTIME_DIR/"
cp -r "$PROJECT_ROOT/node_modules"/* "$RUNTIME_DIR/node_modules/" 2>/dev/null || true

# Create the installed tsyne script
log_info "Installing tsyne to $INSTALL_DIR..."
cat > "$INSTALL_DIR/tsyne" << 'SCRIPT_EOF'
#!/bin/bash
# tsyne - TypeScript native GUI runner with embedded dependency support
# Installed version - uses runtime from ~/.tsyne/runtime/<version>/

set -e

TSYNE_HOME="${TSYNE_HOME:-$HOME/.tsyne}"
TSYNE_VERSION="__VERSION__"
TSYNE_RUNTIME="$TSYNE_HOME/runtime/$TSYNE_VERSION"
TSYNE_CACHE="$TSYNE_HOME/packages"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Flags
DRY_RUN=false
UPDATE=false
OFFLINE=false
LIST_CACHE=false
CLEAR_CACHE=false
VERBOSE=false

usage() {
    echo "Usage: $(basename "$0") [options] <app.ts>"
    echo ""
    echo "Tsyne v$TSYNE_VERSION - TypeScript GUI runner with @Grab dependencies"
    echo ""
    echo "Options:"
    echo "  --dry-run     Show what would be installed without doing it"
    echo "  --update      Force update all dependencies"
    echo "  --offline     Run without installing (use cached only)"
    echo "  --list-cache  List all cached packages"
    echo "  --clear-cache Clear the package cache"
    echo "  --verbose     Show detailed output"
    echo "  --version     Show version"
    echo "  --help        Show this help message"
    echo ""
    echo "Example:"
    echo "  $(basename "$0") my-app.ts"
    exit 0
}

log_info() { echo -e "${BLUE}[tsyne]${NC} $1"; }
log_success() { echo -e "${GREEN}[tsyne]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[tsyne]${NC} $1"; }
log_error() { echo -e "${RED}[tsyne]${NC} $1"; }

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true; shift ;;
        --update) UPDATE=true; shift ;;
        --offline) OFFLINE=true; shift ;;
        --list-cache) LIST_CACHE=true; shift ;;
        --clear-cache) CLEAR_CACHE=true; shift ;;
        --verbose|-v) VERBOSE=true; shift ;;
        --version) echo "tsyne v$TSYNE_VERSION"; exit 0 ;;
        --help|-h) usage ;;
        -*) log_error "Unknown option: $1"; usage ;;
        *) SOURCE_FILE="$1"; shift ;;
    esac
done

# Handle cache operations
if [ "$LIST_CACHE" = true ]; then
    if [ -d "$TSYNE_CACHE/node_modules" ]; then
        log_info "Packages in cache ($TSYNE_CACHE):"
        ls -1 "$TSYNE_CACHE/node_modules" 2>/dev/null | grep -v "^\." | while read pkg; do
            if [ -f "$TSYNE_CACHE/node_modules/$pkg/package.json" ]; then
                version=$(grep '"version"' "$TSYNE_CACHE/node_modules/$pkg/package.json" | head -1 | grep -oP ':\s*"\K[^"]+')
                echo "  - $pkg@$version"
            else
                echo "  - $pkg"
            fi
        done
    else
        log_info "Cache is empty"
    fi
    exit 0
fi

if [ "$CLEAR_CACHE" = true ]; then
    log_warn "Clearing cache at $TSYNE_CACHE"
    rm -rf "$TSYNE_CACHE"
    log_success "Cache cleared"
    exit 0
fi

# Require source file
if [ -z "$SOURCE_FILE" ]; then
    log_error "No source file specified"
    usage
fi

if [ ! -f "$SOURCE_FILE" ]; then
    log_error "File not found: $SOURCE_FILE"
    exit 1
fi

# Check runtime exists
if [ ! -d "$TSYNE_RUNTIME/tsyne" ]; then
    log_error "Tsyne runtime not found at $TSYNE_RUNTIME"
    log_error "Please reinstall tsyne"
    exit 1
fi

# Parse @Grab directives
log_info "Parsing @Grab directives from $SOURCE_FILE..."
GRAB_SPECS=$(grep -oP "// @Grab\('\K[^']+(?='\))" "$SOURCE_FILE" 2>/dev/null || true)

if [ -z "$GRAB_SPECS" ]; then
    log_info "No @Grab directives found"
    [ "$DRY_RUN" = true ] && exit 0
else
    readarray -t SPECS <<< "$GRAB_SPECS"
    PACKAGES=()
    VERS=()
    for spec in "${SPECS[@]}"; do
        pkg="${spec%@*}"
        ver="${spec#*@}"
        PACKAGES+=("$pkg")
        VERS+=("$ver")
    done

    log_info "Found ${#PACKAGES[@]} dependencies:"
    for i in "${!PACKAGES[@]}"; do
        echo "  - ${PACKAGES[$i]}@${VERS[$i]}"
    done

    [ "$DRY_RUN" = true ] && { log_info "Dry run - no packages will be installed"; exit 0; }

    if [ "$OFFLINE" = true ]; then
        log_warn "Offline mode - using cached packages only"
    else
        mkdir -p "$TSYNE_CACHE"
        [ ! -f "$TSYNE_CACHE/package.json" ] && (cd "$TSYNE_CACHE" && npm init -y > /dev/null 2>&1)

        for i in "${!PACKAGES[@]}"; do
            pkg="${PACKAGES[$i]}"
            ver="${VERS[$i]}"
            pkg_dir="$TSYNE_CACHE/node_modules/$pkg"

            if [ ! -d "$pkg_dir" ] || [ "$UPDATE" = true ]; then
                log_info "Installing $pkg@$ver..."
                if [ "$VERBOSE" = true ]; then
                    (cd "$TSYNE_CACHE" && npm install "$pkg@$ver")
                else
                    (cd "$TSYNE_CACHE" && npm install "$pkg@$ver" > /dev/null 2>&1)
                fi
                log_success "Installed $pkg@$ver"
            else
                [ "$VERBOSE" = true ] && log_info "Using cached $pkg"
            fi
        done
    fi
fi

# Run
log_info "Starting application..."
echo ""

BRIDGE_PATH="$TSYNE_RUNTIME/tsyne-bridge"
EFFECTIVE_NODE_PATH="$TSYNE_RUNTIME:$TSYNE_RUNTIME/node_modules:$TSYNE_CACHE/node_modules"
[ -n "$NODE_PATH" ] && EFFECTIVE_NODE_PATH="$EFFECTIVE_NODE_PATH:$NODE_PATH"

export TSYNE_BRIDGE_PATH="$BRIDGE_PATH"
NODE_PATH="$EFFECTIVE_NODE_PATH" \
npx tsx "$SOURCE_FILE"
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
echo "  tsyne your-app.ts"
