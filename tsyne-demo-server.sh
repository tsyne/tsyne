#!/bin/bash

set -e

# Tsyne Demo Server Launcher
# Usage: ./run-demo-server.sh

echo "Tsyne Demo Server Launcher"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

# Check for ts-node
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

# Launch demo server
echo "Starting Tsyne Demo Server..."
echo ""
npx ts-node examples/demo-server.ts
