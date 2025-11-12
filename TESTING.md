# Tsyne Testing Guide

## Test Modes

All Tsyne tests support two modes:

### Headless Mode (Default)
- Fast execution
- No window displayed
- Suitable for CI/CD
- Default behavior

### Headed Mode (Visual Debugging)
- Shows actual window
- Visual verification
- Useful for debugging
- Enabled with `TSYNE_HEADED=1`

## Running Tests

### Browser Tests
```bash
# Headless (default)
npm run test:browser

# Headed (visual)
TSYNE_HEADED=1 npm run test:browser

# Single test
TSYNE_TEST_FILTER="/hyperlinks" npm run test:browser

# Headed single test
TSYNE_HEADED=1 TSYNE_TEST_FILTER="/images" npm run test:browser
```

### Calculator Tests

#### Simple Calculator
```bash
# Headless (default)
npx jest examples/calculator.test.ts

# Headed (visual)
TSYNE_HEADED=1 npx jest examples/calculator.test.ts

# Single test
npx jest examples/calculator.test.ts -t "addition"

# Headed single test
TSYNE_HEADED=1 npx jest examples/calculator.test.ts -t "addition"
```

#### Advanced Calculator
```bash
# Headless (default)
npm run test:calculator

# Headed (visual)
TSYNE_HEADED=1 npm run test:calculator

# Single test
npx jest test-apps/calculator-advanced/calculator.test.ts -t "multiplication"

# Headed single test
TSYNE_HEADED=1 npx jest test-apps/calculator-advanced/calculator.test.ts -t "chain"
```

## Test Coverage

### Browser Tests (12 tests)
- `/text-features` - Rich text and formatting
- `/scrolling` - Scrollable containers
- `/hyperlinks` - Hyperlink widgets (3 widgets)
- `/images` - Image loading (HTTP fetching)
- `/table-demo` - Table widgets
- `/list-demo` - List widgets
- `/dynamic-demo` - Dynamic updates (AJAX-like)
- `/post-demo` - Form submission
- `/fyne-widgets` - Accordion, Card, Toolbar, Tabs, RichText, ProgressBar
- `/widget-interactions` - Select, Slider, RadioGroup, MultiLineEntry, PasswordEntry
- `/layout-demo` - Grid, GridWrap, Center, Border, Split, Form, Tree
- `/` - Home page navigation

### Calculator Tests
- **Simple Calculator**: 5 tests (basic operations)
- **Advanced Calculator**: 12 tests (comprehensive coverage)

## Environment Variables

| Variable | Values | Description |
|----------|--------|-------------|
| `TSYNE_HEADED` | `1` | Enable visual debugging mode (shows window) |
| `TSYNE_TEST_FILTER` | `/path` | Run only tests matching path (browser tests only) |

## Examples

### Debug failing browser test visually
```bash
TSYNE_HEADED=1 TSYNE_TEST_FILTER="/table-demo" npm run test:browser
```

### Debug calculator division by zero
```bash
TSYNE_HEADED=1 npx jest examples/calculator.test.ts -t "division by zero"
```

### Run all tests in CI (headless)
```bash
npm run test:browser
npm run test:calculator
npx jest examples/calculator.test.ts
```

## Tips

1. **Use headed mode for debugging** - When a test fails, run it with `TSYNE_HEADED=1` to see what's happening
2. **Filter tests** - Use `TSYNE_TEST_FILTER` or Jest's `-t` flag to run specific tests
3. **Timeouts** - Browser tests have 30-90s timeouts, calculator tests are faster (~2s)
4. **Screenshots** - Failed browser tests automatically save screenshots to `test-failures/`

## Test Results Summary

**Browser Tests:** 11 passing, 1 intermittent (table-demo)
**Calculator Tests:** All passing (17 total)
**Widget Coverage:** 30+ widget types tested
