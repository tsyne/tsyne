#!/bin/bash

set -e

# Tsyne Browser Launcher
# Usage: ./run-browser.sh [url]

URL="${1:-}"

echo "Tsyne Browser Launcher"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

# Check for npx (tsx)
if ! command -v npx &> /dev/null; then
    echo "Error: npx is not available. Please install Node.js 16 or higher."
    exit 1
fi

# Check if dist directory exists (has the project been built?)
if [ ! -d "dist" ]; then
    echo "Building project for first time..."
    npm run build
    echo ""
fi

# Check if bridge binary exists
if [ ! -f "bin/tsyne-bridge" ]; then
    echo "Building Tsyne bridge..."
    npm run build:bridge
    echo ""
fi

# Launch browser
if [ -z "$URL" ]; then
    echo "Starting Tsyne Browser..."
    echo "Enter a URL in the address bar to navigate."
    echo ""
    npx tsx examples/run-browser.ts
else
    echo "Starting Tsyne Browser with URL: $URL"
    echo ""
    npx tsx examples/run-browser.ts "$URL"
fi
