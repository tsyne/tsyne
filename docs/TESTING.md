# Tsyne Testing Guide

## Test Modes

All Tsyne GUI tests support two modes:

### Headless Mode (Default)
- Fast execution
- No window displayed
- Suitable for CI/CD

### Headed Mode (Visual Debugging)
- Shows actual window
- Useful for debugging failing tests
- Enabled with `TSYNE_HEADED=1`

## Hierarchical Test Structure

Tsyne uses a layered testing approach where each module has its own package.json and test configuration. Tests run in dependency order: Go build → core → designer → examples.

### Test Execution Order

```bash
pnpm test                    # Runs all layers hierarchically
```

This executes:
1. **Go Bridge Build** - Compiles tsyne-bridge (required by all other tests)
2. **Core Tests** - Core Tsyne library tests
3. **Designer Tests** - Visual designer tool tests
4. **Examples Tests** - Example application tests

### Module Structure

#### Core (`/core`)
- **Package**: `core/package.json`
- **Tests**: Core library unit and GUI tests
- **Commands**:
  - `pnpm run test` - Run all tests
  - `pnpm run test:unit:fast` - Unit tests only (parallel)
  - `pnpm run test:gui` - GUI tests only (serial, slower)

#### Designer Submodule (`/designer`)
- **Package**: `designer/package.json`
- **Tests**: Designer tool unit, roundtrip, and E2E tests
- **Commands**:
  - `cd designer && pnpm test` - Run from designer directory
  - `cd designer && pnpm run test:unit` - Unit tests only
  - `cd designer && pnpm run test:roundtrip` - Roundtrip tests
  - `cd designer && pnpm run test:e2e` - E2E tests

#### Examples Submodule (`/examples`)
- **Package**: `examples/package.json`
- **Tests**: Example applications (logic + GUI tests)
- **Commands**:
  - `cd examples && pnpm test` - Run from examples directory
  - `cd examples && pnpm run test:logic` - Logic tests only
  - `cd examples && pnpm run test:gui` - GUI tests only (serial)

### Dependencies Between Layers

```
Go Bridge (tsyne-bridge)
    ↓
Core (Tsyne core library)
    ↓
├── Designer (uses Tsyne)
└── Examples (uses Tsyne)
```

Each layer depends on the previous one being built/passing before it can run.

## Test Categories

### Unit Tests (Fast, Parallel)
- No GUI windows
- Can run in parallel
- Fast feedback
- Examples: Logic tests, pure functions, state management

### GUI Tests (Slow, Serial)
- Create Fyne windows
- Must run serially (`maxWorkers: 1`) to avoid display conflicts
- Slower but comprehensive
- Examples: Widget interactions, visual tests, E2E scenarios

## Configuration Files

### Core
- `jest.config.js` - Main config
- `jest.config.unit.js` - Unit tests only
- `jest.config.gui.js` - GUI tests only

### Designer
- `designer/jest.config.js` - Designer-specific configuration

### Examples
- `examples/jest.config.js` - Examples-specific configuration

## Environment Variables

| Variable | Values | Description |
|----------|--------|-------------|
| `TSYNE_HEADED` | `1` | Enable visual debugging mode (shows window) |

## Running Tests

### Full Test Suite
```bash
pnpm test
```

### Individual Layers
```bash
pnpm run build:bridge    # 1. Build Go bridge first
cd core && pnpm test     # 2. Test core library
cd designer && pnpm test # 3. Test designer
cd examples && pnpm test # 4. Test examples
```

### Running Specific Tests
```bash
# Run a specific test file
npx jest path/to/test.ts

# Run tests matching a pattern
npx jest -t "pattern"

# Run with visual debugging
TSYNE_HEADED=1 npx jest path/to/test.ts
```

## Debugging Tips

1. **Use headed mode for debugging** - When a test fails, run it with `TSYNE_HEADED=1` to see what's happening
2. **Run unit tests first** - Fast feedback on logic errors
3. **Run GUI tests separately** - Slower, need serial execution
4. **Use Jest's `-t` flag** - Run specific tests by name pattern

## Best Practices

1. **Layer your tests** - Go → Core → Designer → Examples
2. **Parallel where possible** - Unit tests can run in parallel
3. **Serial for GUI** - Fyne windows must run one at a time
4. **Use submodule isolation** - Each submodule manages own deps
