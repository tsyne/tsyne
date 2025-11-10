#!/bin/bash
set -e

echo "Building Tsyne bridge for all platforms..."
echo ""

cd bridge

# Create bin directory
mkdir -p ../bin

# Download dependencies first
echo "Downloading Go dependencies..."
go mod download

# Build for macOS (Intel)
echo "Building for macOS (Intel)..."
GOOS=darwin GOARCH=amd64 go build -o ../bin/tsyne-bridge-darwin-amd64

# Build for macOS (Apple Silicon)
echo "Building for macOS (Apple Silicon)..."
GOOS=darwin GOARCH=arm64 go build -o ../bin/tsyne-bridge-darwin-arm64

# Build for Linux (x64)
echo "Building for Linux (x64)..."
GOOS=linux GOARCH=amd64 go build -o ../bin/tsyne-bridge-linux-amd64

# Build for Windows (x64)
echo "Building for Windows (x64)..."
GOOS=windows GOARCH=amd64 go build -o ../bin/tsyne-bridge-windows-amd64.exe

cd ..

echo ""
echo "✓ Built binaries for all platforms:"
ls -lh bin/tsyne-bridge-*
echo ""
echo "Total size:"
du -sh bin/
