# Troubleshooting Guide

## Cloud/LLM Environment Setup (Restricted Network Access)

**Problem:** Working in containerized/cloud environments (e.g., Claude Code, Codespaces) where network access is restricted and you can't access `storage.googleapis.com`, `fyne.io`, or other dependency hosts.

**Complete Solution:**

```bash
# Step 1: Install system dependencies first
apt-get update -qq
apt-get install -y libgl1-mesa-dev xorg-dev libxrandr-dev

# Step 2: Download fyne.io/systray manually (it's not on Google's proxy)
cd /tmp
wget -q https://github.com/fyne-io/systray/archive/refs/heads/master.tar.gz -O systray-master.tar.gz
tar -xzf systray-master.tar.gz

# Step 3: Use go mod replace to point to local systray
cd /home/user/tsyne/bridge
go mod edit -replace=fyne.io/systray=/tmp/systray-master

# Step 4: Build bridge with GOPROXY=direct
env GOPROXY=direct go build -o ../bin/tsyne-bridge .

# Step 5: Install npm dependencies without running postinstall (it will try to rebuild)
cd /home/user/tsyne
npm install --ignore-scripts

# Step 6: Now you can run tests
npx jest examples/solitaire/draw-regression.test.ts --runInBand
```

**What this fixes:**
- Bypasses `storage.googleapis.com` (Google's Go module proxy)
- Bypasses `fyne.io/systray` direct fetch (503 errors)
- Installs required X11/OpenGL headers for Fyne
- Skips npm postinstall script that would fail without network
- Allows running tests in restricted environments

**System packages required:**
- `libgl1-mesa-dev` - OpenGL development headers
- `xorg-dev` - X11 development libraries (metapackage)
- `libxrandr-dev` - X11 RandR extension (screen resolution/rotation)

## Can't Access storage.googleapis.com for Fyne Dependencies

**Problem:** Go tries to fetch Fyne v2.7.0 from `https://storage.googleapis.com/proxy-golang-org-prod` and fails with DNS or connection errors.

**Solution:** Fetch directly from GitHub tag download instead of using Google's proxy:

```bash
# Use GOPROXY=direct to bypass Google's proxy
cd bridge
env GOPROXY=direct go build -o ../bin/tsyne-bridge .
```

**If you get C library errors** (X11, OpenGL headers missing):

```bash
# Install required development libraries (Ubuntu/Debian)
apt-get update
apt-get install -y libgl1-mesa-dev xorg-dev libxrandr-dev

# Then rebuild
cd bridge
env GOPROXY=direct go build -o ../bin/tsyne-bridge .
```

**Note:** If you still get `fyne.io/systray: 503 Service Unavailable` errors, use the Cloud/LLM Environment Setup above.

**Why GOPROXY=direct works:**
- Tells Go to fetch modules directly from their source repositories (GitHub)
- Bypasses Google's module proxy entirely
- Uses the version tags directly from `fyne.io/fyne/v2@v2.7.0` → GitHub release

**Alternative:** Set globally in environment:
```bash
export GOPROXY=direct
go build -o ../bin/tsyne-bridge .
```

## Bridge Won't Start

**Problem:** The Go bridge process fails to start or exits immediately.

**Common causes:**
1. Bridge binary not built - run `cd bridge && go build -o ../bin/tsyne-bridge .`
2. Missing X11 display - ensure `DISPLAY` environment variable is set
3. Missing system libraries - install with `apt-get install libgl1-mesa-dev xorg-dev`

**Debugging:**
```bash
# Run bridge directly to see error messages
./bin/tsyne-bridge
```

## Tests Hang or Timeout

**Problem:** Tests run but never complete, or timeout after long waits.

**Common causes:**
1. Headed mode waiting for display - use `TSYNE_HEADED=0` or ensure X11 is available
2. Bridge deadlock - check `bridge/main.go` for concurrent access issues
3. Unclosed resources - ensure windows are closed in test cleanup

**Solution:**
```bash
# Run tests in headless mode
TSYNE_HEADED=0 npm test

# Run with verbose output
DEBUG=tsyne:* npm test
```

## Stale Compiled JavaScript

**Problem:** TypeScript changes don't seem to take effect.

**Cause:** `.js` files exist in `src/` directory, and Node.js loads these instead of compiling `.ts` files.

**Solution:**
```bash
# Clean up stale compiled files
rm -f src/*.js src/*.d.ts src/**/*.js src/**/*.d.ts 2>/dev/null
```

See [Development Workflow](../LLM.md#development-workflow) for more details on why this happens.
