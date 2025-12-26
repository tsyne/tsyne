#!/bin/bash
# Package Phonetop for distribution
#
# Creates a tarball with:
# - TypeScript source (core + phone-apps)
# - Go/Fyne bridge binary (for specified arch)
# - Launch script
#
# Usage: ./package-phonetop.sh [x86_64|aarch64]

set -e

ARCH="${1:-x86_64}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VERSION="1.0.0"
DIST_NAME="phonetop-${VERSION}-${ARCH}"
DIST_DIR="${SCRIPT_DIR}/dist/${DIST_NAME}"

echo "=== Packaging Phonetop ==="
echo "Architecture: $ARCH"
echo "Output: ${DIST_DIR}.tar.gz"
echo ""

# Clean and create dist directory
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Copy TypeScript source
echo "[1/4] Copying TypeScript source..."
mkdir -p "$DIST_DIR/core/src"
cp -r core/src/*.ts "$DIST_DIR/core/src/"
cp -r core/src/widgets "$DIST_DIR/core/src/" 2>/dev/null || true
cp core/package.json "$DIST_DIR/core/"
cp core/tsconfig.json "$DIST_DIR/core/"

mkdir -p "$DIST_DIR/phone-apps"
cp phone-apps/phonetop.ts "$DIST_DIR/phone-apps/"
cp phone-apps/package.json "$DIST_DIR/phone-apps/" 2>/dev/null || true

mkdir -p "$DIST_DIR/examples"
cp examples/*.ts "$DIST_DIR/examples/" 2>/dev/null || true

# Copy bridge binary
echo "[2/4] Copying bridge binary..."
mkdir -p "$DIST_DIR/core/bin"
if [ "$ARCH" = "aarch64" ]; then
    CHROOT="/home/paul/pmwork/chroot_rootfs_google-bonito"
    if [ -f "${CHROOT}/home/paul/tsyne/bin/tsyne-bridge" ]; then
        cp "${CHROOT}/home/paul/tsyne/bin/tsyne-bridge" "$DIST_DIR/core/bin/"
    else
        echo "WARNING: aarch64 bridge not found at ${CHROOT}/home/paul/tsyne/bin/tsyne-bridge"
    fi
else
    cp core/bin/tsyne-bridge "$DIST_DIR/core/bin/"
fi
chmod +x "$DIST_DIR/core/bin/tsyne-bridge"

# Create launch script
echo "[3/4] Creating launch script..."
cat > "$DIST_DIR/phonetop" << 'EOF'
#!/bin/bash
# Phonetop launcher
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Set up environment
export FYNE_SCALE="${FYNE_SCALE:-1.0}"
export TSYNE_BRIDGE_PATH="$SCRIPT_DIR/core/bin/tsyne-bridge"

# Run phonetop
exec npx tsx phone-apps/phonetop.ts "$@"
EOF
chmod +x "$DIST_DIR/phonetop"

# Create package.json for the distribution
cat > "$DIST_DIR/package.json" << EOF
{
  "name": "phonetop",
  "version": "${VERSION}",
  "description": "Tsyne Phone Launcher",
  "scripts": {
    "start": "./phonetop"
  },
  "dependencies": {
    "tsx": "^4.0.0"
  }
}
EOF

# Create tarball
echo "[4/4] Creating tarball..."
cd "${SCRIPT_DIR}/dist"
tar -czf "${DIST_NAME}.tar.gz" "${DIST_NAME}"

echo ""
echo "=== Package created ==="
echo "Location: ${SCRIPT_DIR}/dist/${DIST_NAME}.tar.gz"
ls -lh "${SCRIPT_DIR}/dist/${DIST_NAME}.tar.gz"
