# Building Tsyne: Complete Guide

This document describes how to build, test, and package the Tsyne monorepo. Tsyne is a TypeScript → Go bridge for building native GUI applications with Fyne.io.

## Quick Start

### Prerequisites

- **Node.js** 16+ (18+ recommended)
- **Go** 1.21+
- **npm** 10+
- **System libraries** (Linux):
  ```bash
  sudo apt-get install libgl1-mesa-dev xorg-dev libxrandr-dev
  ```
- **macOS**: Xcode Command Line Tools
- **Windows**: MinGW-w64 (for CGO)

### Fastest Build

```bash
# Compile only (30-60 seconds)
./build-all-recursive.sh --skip-tests
```

### Full Build + Tests

```bash
# Complete build with all tests (8-10 minutes)
./build-all-recursive.sh
```

---

## Build Methods

### Method 1: Automated Recursive Build (Recommended)

The `build-all-recursive.sh` script automates the entire build pipeline with proper dependency ordering.

#### Usage

```bash
# Basic (compile + test)
./build-all-recursive.sh

# Compile only
./build-all-recursive.sh --skip-tests

# Verbose output (show all command execution)
./build-all-recursive.sh --verbose

# Continue on errors (collect all failures)
./build-all-recursive.sh --no-stop

# Combine options
./build-all-recursive.sh --verbose --no-stop --skip-tests
```

#### What It Does

1. **Phase 1: Root Compilation**
   - npm install → dependencies + Go bridge
   - TypeScript compilation (tsc)
   - Go bridge binary build

2. **Phase 2: Root Tests**
   - 8 core unit tests
   - Solitaire logic tests (32+ validations)
   - Example app tests
   - Calculator app tests
   - Integration tests

3. **Phase 3: Designer Component**
   - Designer npm install
   - Designer TypeScript compilation
   - Designer unit tests
   - Designer E2E tests

4. **Phase 4: Packaging**
   - Create standalone executables (pkg)

#### Output

- **Console**: Color-coded real-time output
- **Log**: `build-all-recursive.log` (full details)
- **Artifacts**:
  - `dist/` - Compiled TypeScript + type definitions
  - `bin/tsyne-bridge` - Go bridge executable
  - `designer/dist/` - Designer compiled
  - `pkg/` - Packaged executables (optional)

#### Documentation

- See **BUILD-ALL-RECURSIVE.md** for comprehensive reference
- See **BUILD-RECURSIVE-QUICKSTART.md** for quick scenarios

---

### Method 2: Manual Step-by-Step Build

If you prefer granular control or need to rebuild individual components:

#### Step 1: Install Dependencies

```bash
npm install
```

This triggers `postinstall.js` which:
- Detects your platform
- Copies prebuilt Go bridge binary (if available), OR
- Builds Go bridge from source (requires Go 1.21+)

#### Step 2: Compile TypeScript

```bash
npm run build:ts
```

or simply:

```bash
npm run build
```

**Output**: `dist/` directory with:
- Compiled `.js` files
- TypeScript definition files (`.d.ts`)
- Source maps (optional)

**Configuration**: `tsconfig.json`
- Target: ES2020
- Module: CommonJS
- Strict mode enabled
- Declaration files enabled

#### Step 3: Build Go Bridge (if not done in postinstall)

```bash
npm run build:bridge
```

**Output**: `bin/tsyne-bridge` (38-40 MB executable)

**Requirements**: Go 1.21+ in PATH

**Troubleshooting**:
```bash
# Check Go version
go version

# Build with direct proxy (bypasses Google's module proxy)
cd bridge && env GOPROXY=direct go build -o ../bin/tsyne-bridge && cd ..
```

#### Step 4: Run Tests

```bash
# All tests (unit + integration)
npm test

# Unit tests only
npm run test:unit

# Integration tests only (requires build first)
npm run test:integration

# Specific test suite
npx jest examples/01-hello-world.test.ts --runInBand

# With headed GUI (requires display)
TSYNE_HEADED=1 npm test
```

#### Step 5: Build Designer (Optional)

```bash
cd designer
npm install
npm run build
npm run test:unit
npm run test:e2e
cd ..
```

#### Step 6: Create Distributable Packages (Optional)

```bash
npm run build:pkg
```

**Output**: `pkg/` directory with:
- `tsyne-browser-linux` - Standalone Linux executable
- Other platform binaries (if cross-compiled)

**Requires**:
- `pkg` tool (installed via npm)
- Compiled `dist/` directory
- Go bridge binary `bin/tsyne-bridge`

---

### Method 3: Build All Platforms (Cross-Platform)

To create binaries for macOS (Intel + ARM), Linux x64, and Windows x64:

```bash
npm run build:bridge:all
```

**Output**: `bin/` directory with:
- `tsyne-bridge-darwin-amd64` (macOS Intel)
- `tsyne-bridge-darwin-arm64` (macOS Apple Silicon)
- `tsyne-bridge-linux-amd64` (Linux x64)
- `tsyne-bridge-windows-amd64.exe` (Windows x64)

**Requirements**:
- Go 1.21+ installed
- Ability to cross-compile (may require CGO setup)

---

## Build Artifacts

After a successful build, you'll have:

### Root Artifacts

| Path | Contents | Size | Purpose |
|------|----------|------|---------|
| `dist/` | Compiled TypeScript + `.d.ts` | ~5-10 MB | Main library |
| `bin/tsyne-bridge` | Go bridge executable | 38-40 MB | IPC for GUI |
| `dist/cli/tsynebrowser.js` | CLI tool source | Small | Command-line interface |

### Designer Artifacts

| Path | Contents | Size | Purpose |
|------|----------|------|---------|
| `designer/dist/` | Designer compiled | ~2-3 MB | Design tool library |

### Optional Packaging

| Path | Contents | Size | Purpose |
|------|----------|------|---------|
| `pkg/tsyne-browser-linux` | Standalone executable | ~50+ MB | Distribution binary |
| `pkg/tsyne-bridge` | Bundled bridge | ~40 MB | Included in pkg |

---

## Test Configuration

### Jest Configuration

**Main test suite** (`jest.config.js`):
- Preset: `ts-jest` (TypeScript support)
- Environment: Custom `jest-environment-tsyne.js`
- Test paths:
  - `test-apps/**/*.test.ts`
  - `src/**/*.test.ts`
  - `examples/**/*.test.ts`

**Designer tests** (`designer/jest.config.js`):
- Environment: Node.js
- Test paths: `designer/__tests__/**/*.test.ts`

### Test Suites

#### Unit Tests (8 files)

Located in `src/__tests__/`:
- `button.test.ts` - Button widget tests
- `entry.test.ts` - Text entry tests
- `image.test.ts` - Image widget tests
- `label.test.ts` - Label widget tests
- `label_textstyle.test.ts` - Text style tests
- `label_wrapping.test.ts` - Text wrapping tests
- `password_entry.test.ts` - Password input tests
- `window-content-replacement.test.ts` - Window content tests

**Run**: `npm run test:unit`

#### Integration Tests

- **Calculator**: `test-apps/calculator-advanced/`
  - `calculator.test.ts` - Full app integration
  - `calculator-logic.test.ts` - Business logic
  - Run: `npm run test:integration:calculator`

- **Single Script Calculator**: `examples/calculator.test.ts`
  - Run: `npm run test:integration:single-script-calculator`

- **Web Features**: `examples/web-features.test.ts`
  - Node.js-based browser tests
  - Run: `npm run test:integration:browser`

- **Widget Interactions**: `examples/widget-interactions.test.js`
  - Interactive widget tests
  - Run: `npm run test:integration:widgets`

#### Example Tests (66+ files)

Located in `examples/`:
- `01-hello-world.test.ts` through `21-quiz-app.test.ts`
- Solitaire suite (6 files)
- Chess suite (3 files)
- Browser suite (10+ files)
- Specialized tests (terminal, SVG, image viewer, etc.)

**Included in**: `npm test`

#### Designer Tests (5 files)

Located in `designer/__tests__/`:
- **Unit tests** (`designer/__tests__/unit/`):
  - `metadata.test.ts`
  - `property-editing.test.ts`
  - `preview-layout.test.ts`
  - `stack-trace-parser.test.ts`
- **E2E tests** (`designer/__tests__/e2e/`):
  - `designer.test.ts`

**Run**:
```bash
cd designer
npm run test:unit    # Unit only
npm run test:e2e     # E2E only
npm test             # Both
```

### Running Specific Tests

```bash
# Single test file
npx jest examples/01-hello-world.test.ts --runInBand

# Test matching pattern
npm run test:unit -- --testNamePattern="button"

# With headed GUI
TSYNE_HEADED=1 npx jest examples/01-hello-world.test.ts

# Take screenshots
TAKE_SCREENSHOTS=1 TSYNE_HEADED=1 npx jest examples/solitaire/solitaire.test.ts

# Watch mode
npx jest --watch
```

---

## Environment Variables

| Variable | Values | Purpose |
|----------|--------|---------|
| `TSYNE_HEADED` | `0` or `1` | Show GUI during tests (requires display) |
| `TAKE_SCREENSHOTS` | `0` or `1` | Capture screenshots during test runs |
| `GOPROXY` | `direct` | Bypass Google's module proxy for Go builds |

### Example Usage

```bash
# Run tests with visible GUI
TSYNE_HEADED=1 npm test

# Take screenshots of solitaire
TAKE_SCREENSHOTS=1 TSYNE_HEADED=1 npm run test:screenshots:solitaire

# Build bridge with direct proxy
GOPROXY=direct npm run build:bridge
```

---

## CI/CD Integration

### GitHub Actions Example

See `.github/workflows/ci.yml` for the complete configuration. Key steps:

```yaml
- name: Setup Go
  uses: actions/setup-go@v4
  with:
    go-version: 1.21

- name: Setup Node
  uses: actions/setup-node@v3
  with:
    node-version: 18

- name: Install system dependencies
  run: |
    sudo apt-get update
    sudo apt-get install -y libgl1-mesa-dev xorg-dev

- name: Run recursive build
  run: ./build-all-recursive.sh --no-stop --verbose
```

### Local CI Simulation

```bash
# Full test with detailed logging
./build-all-recursive.sh --no-stop --verbose | tee ci-build.log

# Check exit code
echo "Exit code: $?"

# Parse for failures
grep "✗" ci-build.log
```

---

## Troubleshooting

### npm install fails

```
Error: ERESOLVE unable to resolve dependency tree
```

**Solution**:
```bash
npm install --legacy-peer-deps
```

### Go bridge won't build

```
Error: go: command not found
```

**Solution**: Install Go 1.21+
```bash
# Download from https://golang.org/dl/
# Or on Linux:
apt-get install golang-go

# Verify
go version
```

### Build fails with "fyne.io/systray 503 Service Unavailable"

**Solution**: Use direct Go proxy
```bash
env GOPROXY=direct npm run build:bridge
```

### Tests timeout

```
Error: Exceeded timeout of 60000 ms
```

**Solutions**:
1. Run with `--skip-tests` first to verify compilation
2. Run single test files with `--runInBand`:
   ```bash
   npx jest examples/01-hello-world.test.ts --runInBand
   ```
3. Increase system resources (RAM, CPU)
4. Check for background processes consuming resources

### TypeScript compilation errors in examples

```
Error: TS2554 - Expected 1-2 arguments, but got 3
```

**Reason**: Example files may have outdated API usage

**Solution**: Update example to match current widget signatures in `src/widgets.ts`

### Bridge binary not created

**Possible causes**:
1. Go not installed
2. System libraries missing (Linux: libgl1-mesa-dev, xorg-dev)
3. CGO issues on Windows

**Verify Go installation**:
```bash
go version
go env
```

**Install system libs (Linux)**:
```bash
sudo apt-get install libgl1-mesa-dev xorg-dev libxrandr-dev
```

---

## Advanced Topics

### Monorepo Structure

Tsyne is organized as a monorepo with:
- **Root** (`/`) - Main library and tests
- **Designer** (`/designer/`) - Visual design tool (subproject)
- **Bridge** (`/bridge/`) - Go IPC implementation

Each component has its own build process but shares dependencies.

### Build Order Dependencies

```
npm install
├── postinstall.js (copies or builds bridge)
└── node_modules/

TypeScript compilation
├── Requires: node_modules/
└── Outputs: dist/

Go bridge compilation
├── Requires: Go 1.21+, system libs
└── Outputs: bin/tsyne-bridge

Tests
├── Require: dist/, bin/tsyne-bridge
└── May output: test artifacts, screenshots
```

### Custom Build Steps

To add custom build steps, edit `build-all-recursive.sh`:

```bash
build_my_step() {
    log_header SECTION "My Custom Step"
    execute_step "My step" "npm run my:command" "working/directory"
}

main() {
    # ... existing phases ...
    build_my_step  # Add your step
    # ...
}
```

### Incremental Builds

After the first build, incremental changes:

```bash
# TypeScript only (no Go rebuild)
npm run build:ts

# Tests only (uses cached dist/ and bridge)
npm test examples/01-hello-world.test.ts --runInBand

# Designer only
cd designer && npm run build
```

---

## Platform-Specific Notes

### macOS

- **Intel**: `tsyne-bridge-darwin-amd64`
- **Apple Silicon**: `tsyne-bridge-darwin-arm64`
- Xcode Command Line Tools required
- CGO usually works out-of-the-box

### Linux

System packages required:
```bash
# Ubuntu/Debian
sudo apt-get install libgl1-mesa-dev xorg-dev libxrandr-dev

# RHEL/CentOS
sudo yum install mesa-libGL-devel libX11-devel libXrandr-devel
```

### Windows

- MinGW-w64 required for CGO
- Go must be in PATH
- Binary: `tsyne-bridge-windows-amd64.exe`

---

## Performance Tips

1. **Use `--skip-tests`** for quick compilation verification
2. **Run tests individually** rather than full suite for faster feedback
3. **Cache artifacts** between runs (node_modules, dist, bin)
4. **Use `--runInBand`** to avoid race conditions in tests
5. **Parallel CI jobs** for independent build phases

---

## Related Documentation

- **LLM.md** - Project overview and philosophy
- **BUILD-ALL-RECURSIVE.md** - Comprehensive script reference
- **BUILD-RECURSIVE-QUICKSTART.md** - Quick scenarios
- **docs/ARCHITECTURE.md** - Internal architecture
- **docs/TESTING.md** - Testing framework guide
- **.github/workflows/ci.yml** - Continuous integration config
- **jest.config.js** - Jest configuration
- **package.json** - npm scripts and dependencies

---

## Common Commands Reference

```bash
# Quick compile
./build-all-recursive.sh --skip-tests

# Full build with tests
./build-all-recursive.sh

# Specific test
npx jest examples/01-hello-world.test.ts --runInBand

# Watch mode
npx jest --watch

# Type checking
npx tsc --noEmit

# Build designer
cd designer && npm run build

# Clean build artifacts
rm -rf dist/ bin/ designer/dist/ pkg/

# View build log
tail -f build-all-recursive.log
```

---

## Getting Help

1. **Check the logs**: `build-all-recursive.log` contains full details
2. **Run with verbose**: `./build-all-recursive.sh --verbose`
3. **Test individually**: `npx jest <file> --runInBand --verbose`
4. **Check prerequisites**: Go version, Node version, system packages
5. **Review related docs**: LLM.md, docs/ARCHITECTURE.md

---

**Last Updated**: 2025-11-17
**Maintained by**: Tsyne Project Contributors
