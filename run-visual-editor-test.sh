#!/bin/bash

# Run Visual Editor Integration Test

echo "Starting Tsyne Visual Editor test..."
echo ""

# Start the server in the background
cd visual-editor
node server.js &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Run the test
cd ..
node test-visual-editor.js
TEST_RESULT=$?

# Kill the server
kill $SERVER_PID 2>/dev/null

# Exit with test result
exit $TEST_RESULT
