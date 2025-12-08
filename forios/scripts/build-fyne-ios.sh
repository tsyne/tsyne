#!/bin/bash
# Build Fyne bridge for iOS
# REQUIRES: macOS with Xcode

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FORIOS_DIR="$(dirname "$SCRIPT_DIR")"
TSYNE_ROOT="$(dirname "$FORIOS_DIR")"

echo "=== Build Fyne for iOS ==="

# Check we're on macOS
if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "Error: This script requires macOS with Xcode"
    echo "Current platform: $(uname -s)"
    exit 1
fi

# Check for Xcode
if ! command -v xcodebuild &> /dev/null; then
    echo "Error: Xcode not found. Please install Xcode from the App Store."
    exit 1
fi

# Check for fyne CLI
if ! command -v fyne &> /dev/null; then
    echo "Installing fyne CLI..."
    go install fyne.io/fyne/v2/cmd/fyne@latest
fi

# Check for Go
if ! command -v go &> /dev/null; then
    echo "Error: Go not found. Please install Go 1.21+"
    exit 1
fi

echo ""
echo "Building Fyne bridge for iOS..."
echo ""

cd "$TSYNE_ROOT/bridge"

# Build for iOS (arm64)
# Note: This creates a .framework that can be embedded in an iOS app
CGO_ENABLED=1 \
GOOS=ios \
GOARCH=arm64 \
CC="$(xcrun -sdk iphoneos -find clang)" \
CGO_CFLAGS="-isysroot $(xcrun -sdk iphoneos --show-sdk-path) -arch arm64 -miphoneos-version-min=11.0" \
CGO_LDFLAGS="-isysroot $(xcrun -sdk iphoneos --show-sdk-path) -arch arm64 -miphoneos-version-min=11.0" \
go build -buildmode=c-archive -o "$FORIOS_DIR/ios-project/tsyne-bridge.a" .

echo ""
echo "Build complete: $FORIOS_DIR/ios-project/tsyne-bridge.a"
echo ""
echo "Next: Run ./forios/scripts/create-ios-project.sh"
