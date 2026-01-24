# Building Tsyne

This document describes how to build, test, and package the Tsyne monorepo.

## Quick Start

### Prerequisites

- **Node.js** 18+ and **pnpm**
- **Go** 1.21+
- **System libraries** (Linux):
  ```bash
  sudo apt-get install libgl1-mesa-dev xorg-dev libxrandr-dev
  ```
- **macOS**: Xcode Command Line Tools
- **Windows**: MinGW-w64 (for CGO)

### Build Commands

```bash
# Build only (no tests)
./ci.sh --skip-tests

# Full build + all tests
./ci.sh

# Show all options
./ci.sh --help
```

The `ci.sh` script is the canonical build script for Tsyne. It handles:

1. Go bridge compilation (`pnpm run build:bridge`)
2. TypeScript compilation for all subprojects
3. Running all test suites (core, designer, examples, ported apps, phone apps, launchers, larger apps, test apps)
4. Android build (if SDK available)

---

## Manual Build Steps

For granular control or rebuilding individual components:

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Build Go Bridge

```bash
pnpm run build:bridge
```

**Output**: `bin/tsyne-bridge`

**Important**: Never run `go build` directly in the bridge directory. Always use `pnpm run build:bridge`.

### Step 3: Compile TypeScript

```bash
pnpm run build
```

**Output**: `dist/` directory

### Step 4: Run Tests

```bash
pnpm test
```

Or run specific test suites:

```bash
# Core tests
cd core && pnpm test

# Designer tests
cd designer && pnpm test

# Examples tests
cd examples && pnpm test
```

---

## Build Artifacts

| Path | Contents | Purpose |
|------|----------|---------|
| `dist/` | Compiled TypeScript + `.d.ts` | Main library |
| `bin/tsyne-bridge` | Go bridge executable | IPC for GUI |
| `designer/dist/` | Designer compiled | Design tool |

---

## Environment Variables

| Variable | Values | Purpose |
|----------|--------|---------|
| `TSYNE_HEADED` | `1` | Show GUI during tests (requires display) |
| `TAKE_SCREENSHOTS` | `1` | Capture screenshots during test runs |
| `GOPROXY` | `direct` | Bypass Google's module proxy for Go builds |

---

## Troubleshooting

### Go bridge won't build

```
Error: go: command not found
```

**Solution**: Install Go 1.21+
```bash
go version  # Verify installation
```

### Build fails with "503 Service Unavailable"

**Solution**: Use direct Go proxy
```bash
GOPROXY=direct pnpm run build:bridge
```

### Tests timeout

**Solutions**:
1. Run with `--skip-tests` first to verify compilation
2. Run single test files: `npx jest path/to/test.ts --runInBand`
3. Check system resources

### Missing system libraries (Linux)

```bash
sudo apt-get install libgl1-mesa-dev xorg-dev libxrandr-dev
```

---

## Platform Notes

### macOS
- Xcode Command Line Tools required
- CGO works out-of-the-box

### Linux
```bash
# Ubuntu/Debian
sudo apt-get install libgl1-mesa-dev xorg-dev libxrandr-dev

# RHEL/CentOS
sudo yum install mesa-libGL-devel libX11-devel libXrandr-devel
```

### Windows
- MinGW-w64 required for CGO
- Go must be in PATH

---

## Cross-Platform Builds

To build Go bridge for all platforms:

```bash
pnpm run build:bridge:all
```

**Output**:
- `tsyne-bridge-darwin-amd64` (macOS Intel)
- `tsyne-bridge-darwin-arm64` (macOS Apple Silicon)
- `tsyne-bridge-linux-amd64` (Linux x64)
- `tsyne-bridge-windows-amd64.exe` (Windows x64)

---

## Related Documentation

- [TESTING.md](TESTING.md) - Testing framework guide
- [BUILDKITE_SETUP.md](BUILDKITE_SETUP.md) - CI setup
- [../LLM.md](../LLM.md) - Project overview
