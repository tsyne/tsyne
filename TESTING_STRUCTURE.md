# Hierarchical Testing Structure

Tsyne uses a layered testing approach where each module has its own package.json and test configuration. Tests run in dependency order: Go build → root → designer → examples.

## Test Execution Order

```bash
npm test                    # Runs all layers hierarchically
```

This executes:
1. **Go Bridge Build** - Compiles tsyne-bridge (required by all other tests)
2. **Root Tests** - Core Tsyne library tests
3. **Designer Tests** - Visual designer tool tests
4. **Examples Tests** - Example application tests

## Module Structure

### Root Level (`/`)
- **Package**: `package.json`
- **Tests**: Core library (src/, test/), test-apps/
- **Commands**:
  - `npm run test:root` - Run all root tests (unit + GUI)
  - `npm run test:unit:fast` - Unit tests only (parallel, ~22s)
  - `npm run test:gui` - GUI tests only (serial, slower)

### Designer Submodule (`/designer`)
- **Package**: `designer/package.json`
- **Tests**: Designer tool unit, roundtrip, and E2E tests
- **Commands**:
  - `npm run test:designer` - Run all designer tests
  - `cd designer && npm test` - Run from designer directory
  - `cd designer && npm run test:unit` - Unit tests only
  - `cd designer && npm run test:roundtrip` - Roundtrip tests
  - `cd designer && npm run test:e2e` - E2E tests

### Examples Submodule (`/examples`)
- **Package**: `examples/package.json`
- **Tests**: Example applications (logic + GUI tests)
- **Commands**:
  - `npm run test:examples` - Run all example tests
  - `cd examples && npm test` - Run from examples directory
  - `cd examples && npm run test:logic` - Logic tests only (~3s)
  - `cd examples && npm run test:gui` - GUI tests only (serial)

## Test Categories

### Unit Tests (Fast, Parallel)
- No GUI windows
- Can run in parallel
- Fast feedback (~22s for root, ~3s for examples logic)
- Examples: Logic tests, pure functions, state management

### GUI Tests (Slow, Serial)
- Create Fyne windows
- Must run serially (`maxWorkers: 1`) to avoid display conflicts
- Slower but comprehensive
- Examples: Widget interactions, visual tests, E2E scenarios

## Configuration Files

### Root Level
- `jest.config.js` - Main config (legacy, runs all root code)
- `jest.config.unit.js` - Unit tests only (src/, test/)
- `jest.config.gui.js` - GUI tests only (test-apps/)

### Designer
- `designer/jest.config.js` - Designer-specific configuration

### Examples
- `examples/jest.config.js` - Examples-specific configuration

## Skipped Tests

Tests are skipped for these reasons:

### Designer Integration Tests (Mock Issues)
- `examples/todomvc-designer.test.ts` - Incomplete mocks cause hangs
- `examples/mouse-events-designer.test.ts` - Module mocking issues
- `examples/calculator-designer.test.ts` - Mock incompleteness
- `designer/__tests__/e2e/designer.test.ts` - Requires full designer server

### Browser Feature Tests (Not Implemented)
- Various browser-*.test.ts files - Future features

## Running Tests in CI

```bash
# Full hierarchical test suite
npm test

# Individual layers (for faster feedback)
npm run build:bridge    # 1. Build Go bridge first
npm run test:root       # 2. Test core library
npm run test:designer   # 3. Test designer
npm run test:examples   # 4. Test examples
```

## Dependencies Between Layers

```
Go Bridge (tsyne-bridge)
    ↓
Root (Tsyne core library)
    ↓
├── Designer (uses Tsyne)
└── Examples (uses Tsyne)
```

Each layer depends on the previous one being built/passing before it can run.

## Current Test Status

### ✅ Root Level (PASSING)
- **Unit Tests**: 101 passed, 4 skipped (~22s)
- **GUI Tests**: 2 suites passed (~7s)
- **Total**: All root tests passing
- **Cleanup**: ✅ Windows properly closed via `tsyneTest.cleanup()`

### ✅ Designer
- **Status**: Has own package.json, tests configured
- **Command**: `npm run test:designer`
- **Note**: Separate from root test suite

### ✅ Examples (PASSING)
- **Logic Tests**: ✅ 32 passed (~3s)
- **Basic GUI Tests**: ✅ 6 passed (01-05 examples)
- **Chess Integration**: ✅ 3 passed
- **Chess E2E**: ✅ 5 passed, 6 skipped (require New Game button)
- **Cleanup**: ✅ No lingering processes verified
- **Remaining**: ⚠️ Browser tests (some failures)

## Best Practices

1. **Run unit tests first** - Fast feedback on logic errors
2. **Run GUI tests separately** - Slower, need serial execution
3. **Use submodule isolation** - Each submodule manages own deps
4. **Layer your tests** - Go → Root → Designer → Examples
5. **Parallel where possible** - Unit tests can run in parallel
6. **Serial for GUI** - Fyne windows must run one at a time
