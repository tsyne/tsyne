# Calculator Test Application

This is a fully testable calculator application built with Tsyne and tested with TsyneTest.

## Features

- Basic arithmetic operations (+, -, ×, ÷)
- Decimal number support
- Clear function
- Chain operations
- Division by zero error handling
- Clean, testable code architecture

## Running the Calculator

```bash
# From the root directory
npm run run:calculator

# Or directly with node
npm run build
node test-apps/calculator/calculator.js
```

## Running Tests

```bash
# Run in headless mode (default)
npm run test:calculator

# Run in headed mode (shows UI during tests)
npm run test:calculator:headed
```

## Test Coverage

The calculator has comprehensive test coverage including:

1. **Initialization Tests**
   - Initial display shows "0"
   - All buttons are visible and accessible

2. **Input Tests**
   - Single digit input
   - Multiple digit input
   - Decimal number input

3. **Operation Tests**
   - Addition (5 + 3 = 8)
   - Subtraction (9 - 4 = 5)
   - Multiplication (6 × 7 = 42)
   - Division (8 ÷ 2 = 4)

4. **Edge Cases**
   - Division by zero (displays "Error")
   - Chain operations (2 + 3 + 4 = 9)

5. **UI Tests**
   - Clear button functionality
   - Display updates correctly
   - All buttons are responsive

## Code Architecture

The calculator follows best practices for testable Tsyne applications:

### Separation of Concerns

```typescript
export class Calculator {
  private display: any;
  private currentValue = "0";
  private operator: string | null = null;
  private previousValue = "0";
  private shouldResetDisplay = false;

  constructor(private tsyneApp: App) {}

  build(): void {
    // UI construction
  }

  private handleNumber(num: string) {
    // Pure business logic
  }
}
```

### Testability Features

1. **Widget References**: Keep references to widgets for programmatic access
2. **Pure Functions**: Business logic is separated from UI updates
3. **State Management**: All state is managed through class properties
4. **Declarative UI**: UI structure is easy to inspect and test

## Test Examples

### Basic Test

```typescript
async function testAddition() {
  const tsyneTest = new TsyneTest({ headed: false });
  const testApp = tsyneTest.createApp((app) => {
    const calc = new Calculator(app);
    calc.build();
  });
  const ctx = tsyneTest.getContext();
  await testApp.run();

  // Perform: 5 + 3 = 8
  await ctx.getByExactText("5").click();
  await ctx.getByExactText("+").click();
  await ctx.getByExactText("3").click();
  await ctx.getByExactText("=").click();

  // Verify result
  const display = ctx.getByType("label");
  await ctx.expect(display).toHaveText("8");

  await tsyneTest.cleanup();
}
```

### Selector Types

TsyneTest supports multiple selector types:

- **By Exact Text**: `ctx.getByExactText("+")`
- **By Partial Text**: `ctx.getByText("Cal")`
- **By Type**: `ctx.getByType("button")`

### Assertions

Available assertions:

- `toHaveText(text)` - Exact text match
- `toContainText(text)` - Partial text match
- `toBeVisible()` - Widget exists and is found
- `toExist()` - Widget exists in the tree
- `toHaveCount(n)` - Number of matching widgets

## Headed vs Headless Mode

### Headless Mode (Default)

- Runs tests without showing UI
- Faster execution
- Ideal for CI/CD pipelines
- Uses Fyne's test driver

```typescript
const tsyneTest = new TsyneTest({ headed: false });
```

### Headed Mode

- Shows UI during test execution
- Useful for debugging
- Visual verification of tests
- Real Fyne window

```typescript
const tsyneTest = new TsyneTest({ headed: true });
```

## Best Practices

1. **Keep State Simple**: Use class properties to track state
2. **Update Display Immediately**: Don't cache display values
3. **Test Edge Cases**: Include error conditions (division by zero)
4. **Use Descriptive Tests**: Each test should verify one behavior
5. **Add Waits**: Small delays ensure state updates are complete
6. **Clean Up**: Always call `cleanup()` in test teardown

## CI/CD Integration

The tests can be easily integrated into CI/CD pipelines:

```yaml
# .github/workflows/test.yml
- name: Run Calculator Tests
  run: npm run test:calculator
```

## Extending the Calculator

To add new features:

1. Add the UI element in `build()`
2. Implement the business logic method
3. Wire up the event handler
4. Add tests for the new functionality

Example - Adding square root:

```typescript
// In build()
button("√", () => this.handleSquareRoot());

// Business logic
private handleSquareRoot() {
  const current = parseFloat(this.currentValue);
  if (current < 0) {
    this.updateDisplay("Error");
  } else {
    this.updateDisplay(Math.sqrt(current).toString());
  }
}

// Test
async function testSquareRoot() {
  // ... test setup ...
  await ctx.getByExactText("9").click();
  await ctx.getByExactText("√").click();
  await ctx.expect(display).toHaveText("3");
}
```
