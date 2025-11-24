#!/bin/bash
# Test suite for the tsyne shell wrapper
# Run from project root: ./scripts/tsyne.test.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TSYNE="$SCRIPT_DIR/tsyne"

echo "=== Tsyne Shell Wrapper Tests ==="
echo ""

# Test 1: Help flag
echo "Test 1: --help flag"
$TSYNE --help | grep -q "Usage:" && echo "  PASS: Help shows usage" || { echo "  FAIL: Help didn't show usage"; exit 1; }

# Test 2: Dry run for weather-viewer
echo "Test 2: --dry-run parses @Grab directives"
OUTPUT=$($TSYNE --dry-run "$PROJECT_ROOT/examples/weather-viewer-standalone.ts" 2>&1)
echo "$OUTPUT" | grep -q "axios@" && echo "  PASS: Parsed axios dependency" || { echo "  FAIL: Didn't parse axios"; exit 1; }
echo "$OUTPUT" | grep -q "date-fns@" && echo "  PASS: Parsed date-fns dependency" || { echo "  FAIL: Didn't parse date-fns"; exit 1; }

# Test 3: Dry run for stock-ticker
echo "Test 3: --dry-run parses stock-ticker @Grab directives"
OUTPUT=$($TSYNE --dry-run "$PROJECT_ROOT/examples/stock-ticker-standalone.ts" 2>&1)
echo "$OUTPUT" | grep -q "yahoo-finance2@" && echo "  PASS: Parsed yahoo-finance2 dependency" || { echo "  FAIL: Didn't parse yahoo-finance2"; exit 1; }

# Test 4: List cache (should work even if empty)
echo "Test 4: --list-cache"
$TSYNE --list-cache && echo "  PASS: List cache ran" || { echo "  FAIL: List cache failed"; exit 1; }

# Test 5: Missing file error
echo "Test 5: Error on missing file"
if $TSYNE nonexistent-file.ts 2>&1 | grep -q "not found\|No such"; then
  echo "  PASS: Reports file not found"
else
  echo "  FAIL: Should report file not found"
  exit 1
fi

# Test 6: No source file error
echo "Test 6: Error when no source file provided"
if $TSYNE 2>&1 | grep -q "No source file"; then
  echo "  PASS: Reports no source file"
else
  echo "  FAIL: Should report no source file"
  exit 1
fi

# Test 7: File without @Grab works (dry-run on counter.ts)
echo "Test 7: File without @Grab directives"
OUTPUT=$($TSYNE --dry-run "$PROJECT_ROOT/examples/counter.ts" 2>&1)
echo "$OUTPUT" | grep -q "No @Grab directives found" && echo "  PASS: Handles file without @Grab" || { echo "  FAIL: Should handle file without @Grab"; exit 1; }

# Test 8: Standalone example with 'import from tsyne' starts successfully
echo "Test 8: Standalone example with 'import from tsyne' starts"
OUTPUT=$(timeout 10 $TSYNE "$PROJECT_ROOT/examples/weather-viewer-standalone.ts" 2>&1 || true)
echo "$OUTPUT" | grep -q "tsyne-bridge.*Starting" && echo "  PASS: App with 'import from tsyne' started" || { echo "  FAIL: Should start app with 'import from tsyne'"; echo "$OUTPUT"; exit 1; }

echo ""
echo "=== All tests passed ==="
