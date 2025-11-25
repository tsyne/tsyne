# Test Failure Analysis

## Fixed ✅

1. **TypeScript compilation errors** (5 files)
   - `ctx.takeScreenshot()` → `tsyneTest.screenshot()`
   - Files: stack-demo, radiogroup-horizontal-demo, entry-cursor-demo, focus-events-demo, list-features-demo

2. **Jest config warning**
   - `coverageThresholds` → `coverageThreshold`

## Remaining Issues

### 1. Designer Tests Failing (0 widgets captured)

**Affected tests:**
- `examples/mouse-events-designer.test.ts` - 24/27 tests failing
- `examples/todomvc-designer.test.ts` - 25/27 tests failing
- Other designer integration tests

**Root cause:** The `loadFileInDesignerMode()` function isn't capturing widgets when loading files that call `app()` directly at module level.

**Possible solutions:**
- Refactor demos to export builder functions instead of calling `app()` directly
- Fix the module mocking in designer tests
- Skip these tests for now (they test designer mode, not core functionality)

### 2. Widget Visibility Failures

**Pattern:** Tests expecting widgets to be visible but getting null

**Examples:**
- Solitaire tests: "should display all game sections" - widgets not found
- Chess integration: "renders correctly" - widgets not found

**Possible causes:**
- Timing issues (widgets not rendered yet)
- Test selectors not matching actual widgets
- Widgets created but not in expected state

### 3. gRPC Tests Failing

**Error:** `TypeError: Cannot read properties of undefined (reading 'checkOptionalUnaryResponseArguments')`

**Affected:** All 5 gRPC mode tests in `test/grpc-mode.test.ts`

**Likely cause:** gRPC client initialization issue or missing dependency in test environment

## Test Statistics

- **Passing:** 81 test suites, 723 tests
- **Failing:** 24 test suites, 121 tests
- **Total:** 105 test suites, 844 tests

## Recommended Next Steps

1. **Quick wins:**
   - Increase timeouts for flaky visibility tests
   - Add wait/retry logic for widget finding

2. **Medium effort:**
   - Fix gRPC test setup
   - Debug widget visibility issues in specific tests

3. **Later:**
   - Refactor designer tests (complex, affects test infrastructure)
   - Consider marking flaky tests as skipped with `.skip()`

## CI Status

Tests are currently **non-blocking** in CI - builds pass even with test failures. This allows incremental fixes without blocking development.
