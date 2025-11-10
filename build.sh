#!/bin/bash

set -e

echo "Building Jyne..."
echo ""

# Find Go binary
GO_BINARY=""
for go_path in "go" "/usr/local/go/bin/go" "/usr/bin/go" "$HOME/go/bin/go"; do
    if command -v "$go_path" &> /dev/null; then
        GO_BINARY="$go_path"
        break
    fi
done

# Check for Go
if [ -z "$GO_BINARY" ]; then
    echo "Error: Go is not installed. Please install Go 1.21 or higher."
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

# Create directories
mkdir -p bin
mkdir -p dist

echo "Step 1: Installing Node.js dependencies..."
npm install

echo ""
echo "Step 2: Building Go bridge..."
cd bridge
$GO_BINARY mod download
$GO_BINARY build -v -o ../bin/jyne-bridge
cd ..

echo ""
echo "Step 3: Building TypeScript library..."
npm run build

echo ""
echo "Build complete!"
echo ""
echo "To run an example:"
echo "  node examples/hello.js"
echo ""
echo "To run the calculator:"
echo "  node examples/calculator.js"
