# Build-All-Recursive: Complete Build and Test Orchestration

## Overview

`build-all-recursive.sh` is a comprehensive, depth-first build orchestration script that ensures all compile and test invocation steps in the Tsyne monorepo are executed in the correct dependency order.

This script automates the entire build pipeline from initial installation through packaging and distribution, making it ideal for:
- **Continuous Integration/CD pipelines**
- **Release engineering**
- **Validation of complete project builds**
- **Monorepo dependency management**
- **Local development verification**

## Quick Start

```bash
# Basic usage (stops on first error)
./build-all-recursive.sh

# Verbose output (see all command outputs)
./build-all-recursive.sh --verbose

# Continue on errors (don't stop)
./build-all-recursive.sh --no-stop

# Skip all tests (compile only)
./build-all-recursive.sh --skip-tests

# Combine options
./build-all-recursive.sh --verbose --no-stop --skip-tests
```

## Build Phases (Depth-First Traversal)

### Phase 1: Root Dependencies and Compilation

#### Step 1.1: NPM Install (Root)
```
npm install
→ Triggers postinstall.js
  ├── Option A: Copy prebuilt bin/tsyne-bridge-* binary
  └── Option B: Build Go bridge from source (if no prebuilt available)
```

**Purpose:** Install all Node.js dependencies and prepare Go bridge binary.

**Outputs:**
- `node_modules/` directory with all dependencies
- Prebuilt or compiled `bin/tsyne-bridge` executable

**Dependencies:** Node.js 16+, Go 1.21+ (only if building bridge from source)

---

#### Step 1.2: TypeScript Compilation (Root)
```
npm run build:ts
→ npx tsc (using tsconfig.json)
```

**Purpose:** Compile TypeScript source to JavaScript and generate type definitions.

**Outputs:**
- `dist/` directory with compiled JavaScript
- `dist/**/*.d.ts` type definition files
- `dist/index.js` main entry point
- `dist/cli/tsynebrowser.js` CLI tool

**Dependencies:**
- Phase 1.1 (npm install must complete)
- TypeScript (installed via npm)

**Configuration:** `tsconfig.json`
- Target: ES2020
- Module: CommonJS
- Output: dist/
- Declaration files: Yes
- Strict mode: Yes

---

#### Step 1.3: Go Bridge Compilation
```
npm run build:bridge
→ cd bridge && go build -o ../bin/tsyne-bridge
```

**Purpose:** Compile Go bridge that provides JSON-RPC IPC for Fyne GUI toolkit.

**Outputs:**
- `bin/tsyne-bridge` executable (38-40 MB)

**Dependencies:**
- Phase 1.1 (npm install)
- Go 1.21+ installed and in PATH
- System libraries: libgl1-mesa-dev, xorg-dev (Linux)

**Important:** The bridge binary is critical for all GUI tests. Without it, integration and widget tests will timeout.

---

### Phase 2: Root Unit and Integration Tests

These tests verify the compiled artifacts work correctly.

#### Step 2.1: Unit Tests (src/__tests__/)

Runs 8 core unit tests in sequence:

```
Tests executed:
├── src/__tests__/button.test.ts
├── src/__tests__/entry.test.ts
├── src/__tests__/image.test.ts
├── src/__tests__/label.test.ts
├── src/__tests__/label_textstyle.test.ts
├── src/__tests__/label_wrapping.test.ts
├── src/__tests__/password_entry.test.ts
└── src/__tests__/window-content-replacement.test.ts
```

**Configuration:** `jest.config.js` (root)
- Preset: ts-jest
- Environment: jest-environment-tsyne.js (custom)
- Run mode: `--runInBand` (sequential, prevents race conditions)

**Dependencies:**
- Phase 1.2 (TypeScript compilation)
- Phase 1.3 (Go bridge)
- Jest (installed via npm)

**Skip with:** `--skip-tests` flag

---

#### Step 2.2: Solitaire Logic Tests

Comprehensive Solitaire game rules validation tests:

```
Test suite: examples/solitaire/solitaire.logic.test.ts
├── Foundation (Build) Moves
├── Tableau Stack Moves
├── Draw Pile Mechanics
├── Stack to Stack Moves
├── Multi-Card Stack Moves
├── Stack to Foundation Moves
├── Foundation to Stack Moves
├── Win Condition
└── Edge Cases
```

**Status:** ✓ Passing (pure logic, no GUI)

**Dependencies:**
- Phase 1.2 (TypeScript)
- Jest

---

#### Step 2.3: Example Tests (High Priority)

Priority subset of example integration tests:

```
Tests executed (in order):
├── examples/web-features.test.ts
├── examples/solitaire/solitaire.logic.test.ts
├── examples/01-hello-world.test.ts
├── examples/02-counter.test.ts
└── examples/03-button-spacer.test.ts
```

**Dependencies:**
- Phase 1.2 (TypeScript)
- Phase 1.3 (Go bridge)
- TsyneTest framework

**Note:** Full test suite has 66+ example tests; this step runs high-confidence subset.

---

#### Step 2.4: Test App Tests (Advanced Calculator)

Tests for the calculator advanced test application:

```
Tests executed:
├── test-apps/calculator-advanced/calculator.test.ts
└── test-apps/calculator-advanced/calculator-logic.test.ts
```

**Dependencies:**
- Phase 1.2 (TypeScript)
- Phase 1.3 (Go bridge)

---

#### Step 2.5: Integration Tests

Broader integration test suite:

```
Tests executed:
├── test:integration:calculator (GUI-based, skipped if headless fails)
├── test:integration:single-script-calculator
├── test:integration:browser (Node.js-based, no GUI needed)
└── test:integration:widgets (Node.js-based, no GUI needed)
```

**Dependencies:**
- Phase 1.2 (TypeScript)
- Phase 1.3 (Go bridge)

---

### Phase 3: Designer Monorepo Component

Builds and tests the designer subproject (visual design tool for Tsyne).

#### Step 3.1: Designer NPM Install
```
npm install (in designer/)
```

#### Step 3.2: Designer TypeScript Compilation
```
npm run build (in designer/)
→ tsc (using designer/tsconfig.json)
```

**Outputs:**
- `designer/dist/` with compiled JavaScript and type definitions

#### Step 3.3: Designer Unit Tests
```
npm run test:unit (in designer/)
→ Jest tests from designer/__tests__/unit/
```

**Tests:**
- metadata.test.ts
- property-editing.test.ts
- preview-layout.test.ts
- stack-trace-parser.test.ts

#### Step 3.4: Designer E2E Tests
```
npm run test:e2e (in designer/)
→ Jest tests from designer/__tests__/e2e/
```

**Tests:**
- designer.test.ts (end-to-end browser tests)

---

### Phase 4: Distribution Packaging

Creates distributable packages for end users.

#### Step 4.1: Package Creation
```
npm run build:pkg
→ pkg (Node.js packaging tool)
  └── Creates standalone executables for Linux/macOS/Windows
```

**Outputs:**
- `pkg/tsyne-browser-linux` (standalone CLI tool)
- `pkg/tsyne-bridge` (bundled Go bridge)

**Prerequisites:**
- Phase 1.2 (dist/ must exist)
- Phase 1.3 (bin/tsyne-bridge must exist)

---

## Execution Flow Diagram

```
START
  │
  ├─→ PHASE 1: Root Setup
  │   ├─→ Step 1.1: npm install (root)
  │   ├─→ Step 1.2: npm run build:ts
  │   └─→ Step 1.3: npm run build:bridge
  │
  ├─→ PHASE 2: Root Tests
  │   ├─→ Step 2.1: Unit tests (8 files)
  │   ├─→ Step 2.2: Solitaire logic tests
  │   ├─→ Step 2.3: Example tests (5 priority tests)
  │   ├─→ Step 2.4: Calculator app tests
  │   └─→ Step 2.5: Integration tests (4 suites)
  │
  ├─→ PHASE 3: Designer Component
  │   ├─→ Step 3.1: npm install (designer/)
  │   ├─→ Step 3.2: npm run build (designer/)
  │   ├─→ Step 3.3: Designer unit tests
  │   └─→ Step 3.4: Designer e2e tests
  │
  ├─→ PHASE 4: Packaging
  │   └─→ Step 4.1: npm run build:pkg
  │
  └─→ COMPLETE
      ├─→ Print summary
      ├─→ Show total time
      └─→ Report failures (if any)
```

## Command-Line Options

### `--verbose`
Enable verbose output. Shows full command output and all test results.

```bash
./build-all-recursive.sh --verbose
```

Without verbose, only final results are shown.

### `--no-stop`
Continue executing subsequent steps even if one step fails. Useful for:
- Identifying all failing tests in one run
- CI/CD pipelines that need comprehensive reports
- Skipping early steps without halting the build

```bash
./build-all-recursive.sh --no-stop
```

Default behavior (`--stop-on-error`): Exit immediately on first failure.

### `--skip-tests`
Skip all test execution phases. Useful for:
- Quick compile-only verification
- Building artifacts without waiting for full test suite
- Development workflows where tests are run separately

```bash
./build-all-recursive.sh --skip-tests
```

Skips:
- Phase 2 (all root tests)
- Designer unit and e2e tests (Phase 3.3 and 3.4)

Still runs:
- Phase 1 (build)
- Phase 3.1-3.2 (designer build)
- Phase 4 (packaging)

## Output and Logging

### Console Output

Real-time, color-coded output:
- 🔵 **INFO** (blue) - Informational messages
- 🟢 **SUCCESS** (green) - Step completed successfully
- 🟡 **WARN** (yellow) - Warnings and skipped tests
- 🔴 **ERROR** (red) - Failures and errors
- 🔷 **SECTION** (cyan) - Phase/section headers

Example:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ PHASE 1: Root Dependencies and Compilation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Executing: npm install (root)
  $ npm install
✓ npm install (root) completed
```

### Log File

All output is also saved to `build-all-recursive.log`:

```bash
tail -f build-all-recursive.log  # Follow in real-time
cat build-all-recursive.log      # View entire log
```

Useful for:
- Post-build analysis
- CI/CD artifact collection
- Debugging failed builds
- Historical records

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All steps completed successfully |
| `1` | One or more steps failed (with `--stop-on-error`, exits at first failure) |

With `--no-stop`, returns `1` if any steps failed, allowing subsequent analysis.

## Common Scenarios

### Scenario 1: Complete Clean Build

```bash
# Remove all build artifacts first
rm -rf dist/ bin/ node_modules/ designer/dist/ designer/node_modules/

# Full rebuild
./build-all-recursive.sh
```

### Scenario 2: Quick Validation (No Tests)

```bash
./build-all-recursive.sh --skip-tests
```

Completes in ~30-60 seconds. Useful for:
- Validating compilation
- Checking bridge binary
- Pre-commit hooks

### Scenario 3: Verbose Debugging

```bash
./build-all-recursive.sh --verbose | tee my-build.log
```

Captures all output (console + file) for debugging failed steps.

### Scenario 4: CI/CD Pipeline

```bash
# Collect all errors without stopping
./build-all-recursive.sh --no-stop --verbose | tee ci-build.log
BUILD_EXIT=$?

# Parse log for reporting
grep "✗" ci-build.log > failures.txt

exit $BUILD_EXIT
```

### Scenario 5: Designer-Only Build

Edit script or manually run:
```bash
cd designer
npm install
npm run build
npm run test:unit
npm run test:e2e
```

### Scenario 6: Root-Only Build

```bash
# Comment out Phase 3 (designer) and Phase 4 (packaging)
./build-all-recursive.sh
```

Or modify script to add `--skip-designer` option.

## Customization

### Adding New Build Steps

To add a new step, follow this pattern:

```bash
build_my_custom_step() {
    log_header SECTION "My Custom Step"
    execute_step "Step description" "command to run" "optional/working/directory"
}
```

Then call it in `main()`:

```bash
main() {
    # ... existing phases ...
    build_my_custom_step
    # ...
}
```

### Modifying Execution Order

Reorder function calls in `main()` to change build sequence. The script respects dependencies, so verify no circular dependencies exist.

### Adding Conditional Steps

```bash
if [ "$SOME_FLAG" = true ]; then
    build_conditional_step
fi
```

## Troubleshooting

### Build fails at "npm install"

```
Error: npm ERR! code ERESOLVE
```

**Solution:**
```bash
npm install --legacy-peer-deps
```

Then run the script again.

### Go bridge fails to build

```
Error: go: command not found
```

**Solution:**
```bash
# Install Go 1.21+
curl -L https://golang.org/dl/go1.21.0.linux-amd64.tar.gz | tar -xz
export PATH=$PATH:$PWD/go/bin
./build-all-recursive.sh
```

### Tests timeout

```
Error: Exceeded timeout of 60000 ms for a test
```

**Solution:**
- Run with fewer parallel tests: Already using `--runInBand` (sequential)
- Skip GUI tests: Use `--skip-tests` and run selectively
- Allocate more system resources (RAM, CPU)
- Check system load: `top` or `htop`

### TypeScript compilation errors

```
Error: TS2551: Property 'X' does not exist
```

**Solution:**
- Update example files to match current widget API
- Check `src/widgets.ts` for current method signatures
- Run: `npm run build:ts` separately to debug

## Performance Tips

### Skip unnecessary phases

```bash
# Compile only (no tests) - ~30s
./build-all-recursive.sh --skip-tests

# Example tests only - restore test-specific artifacts first
npm run build && npm run build:bridge
npx jest examples/*.test.ts --runInBand
```

### Parallel execution (for CI/CD)

Split into independent jobs:
```yaml
# Job 1: Root build
./build-all-recursive.sh --skip-tests

# Job 2: Root tests (parallel)
npm test

# Job 3: Designer tests (parallel)
cd designer && npm test

# Job 4: Packaging (after jobs 1-3)
npm run build:pkg
```

### Cache intermediate artifacts

```bash
# First run - full build
./build-all-recursive.sh

# Subsequent runs with cached artifacts
npm run test:unit  # Fast, uses cached dist/ and bin/
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Full Build and Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - uses: actions/setup-go@v4
        with:
          go-version: 1.21

      - name: Install system dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y libgl1-mesa-dev xorg-dev

      - name: Run recursive build
        run: ./build-all-recursive.sh --no-stop --verbose

      - name: Upload logs
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: build-logs
          path: build-all-recursive.log
```

## See Also

- `LLM.md` - High-level project documentation
- `build.sh` - Original sequential build script
- `scripts/build-all-platforms.sh` - Cross-platform bridge builder
- `.github/workflows/ci.yml` - GitHub Actions CI configuration
- `jest.config.js` - Jest test configuration
- `package.json` - npm scripts and dependencies
- `bridge/main.go` - Go bridge source code

## License

Same as Tsyne project (MIT)

---

**Last Updated:** 2025-11-17
**Created by:** Claude Code
**Maintenance:** For questions or issues, refer to the main Tsyne repository
