#!/bin/bash
# build-3dcube-apk.sh - Build standalone 3D Cube APK for debugging
#
# This builds an APK with just the 3D cube app (no phonetop) to help
# isolate whether the crash is in phonetop navigation or 3D cube itself.
#
set -e
cd "$(dirname "$0")"

echo "=== Building standalone 3D Cube APK ==="

# Step 1: Bundle the 3D cube TypeScript
echo "=== Bundling 3D Cube TypeScript ==="
npx esbuild \
    ../phone-apps/3d-cube-android.ts \
    --bundle --platform=node --target=node18 \
    --outfile=app/src/main/assets/nodejs-project/3dcube-bundle.js \
    --external:@resvg/resvg-js --external:isolated-vm --external:koffi \
    --external:esbuild --external:sharp --external:better-sqlite3 \
    --external:@img/sharp-* --external:*.node --format=cjs

# Step 2: Swap main.js to use 3D cube
echo "=== Setting up main.js for 3D Cube ==="
ASSETS_DIR="app/src/main/assets/nodejs-project"
# Backup original main.js
if [ -f "$ASSETS_DIR/main.js" ] && [ ! -f "$ASSETS_DIR/main-phonetop-backup.js" ]; then
    cp "$ASSETS_DIR/main.js" "$ASSETS_DIR/main-phonetop-backup.js"
fi
# Use 3D cube main
cp "$ASSETS_DIR/main-3dcube.js" "$ASSETS_DIR/main.js"

# Step 3: Build Go bridge (if not already built)
echo "=== Building Go bridge ==="
(cd .. && pnpm run build:bridge 2>&1 | tail -1)
(cd ../core/bridge && make android 2>&1 | grep -E "^✓|error" || true)

# Step 4: Build APK
echo "=== Building APK ==="
./gradlew assembleDebug 2>&1 | tail -3

echo ""
echo "=== APK built: app/build/outputs/apk/debug/app-debug.apk ==="
echo ""
echo "To install: adb install -r app/build/outputs/apk/debug/app-debug.apk"
echo "To restore phonetop: cp $ASSETS_DIR/main-phonetop-backup.js $ASSETS_DIR/main.js"
