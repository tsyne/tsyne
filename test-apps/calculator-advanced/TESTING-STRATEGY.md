# Calculator Testing Strategy

This calculator demonstrates a **two-tier testing approach** similar to Java testing patterns:

## Testing Pyramid

```
        /\
       /  \
      / UI \          TsyneTest (Integration)
     /______\         - Full UI interaction tests
    /        \        - Headed/headless modes
   /  Logic  \       Jest (Unit)
  /____________\      - Pure business logic tests
                      - Fast, no dependencies
```

## 1. Unit Tests (Jest) - Pure Business Logic

**File**: `calculator-logic.test.ts`
**Runner**: Jest (no UI needed)
**Speed**: ⚡ Very fast (~100ms for all tests)

Tests the `CalculatorLogic` class in complete isolation:

```typescript
import { CalculatorLogic } from './calculator-logic';

describe('CalculatorLogic', () => {
  test('should add two numbers', () => {
    const calc = new CalculatorLogic();
    calc.inputNumber('5');
    calc.inputOperator('+');
    calc.inputNumber('3');
    expect(calc.calculate()).toBe('8');
  });
});
```

**What's tested:**
- Number input logic
- Decimal handling
- All arithmetic operations
- Chain operations
- Edge cases (division by zero, floating point)
- State management
- Clear function

**Run:**
```bash
npm run test:unit
# or
jest calculator-logic.test.ts
```

**Benefits:**
- ✓ No UI dependencies
- ✓ Extremely fast
- ✓ Easy to debug
- ✓ 100% code coverage possible
- ✓ Runs in CI/CD easily
- ✓ Test-driven development friendly

## 2. Integration Tests (TsyneTest) - UI Layer

**File**: `calculator.test.ts`
**Runner**: TsyneTest (requires bridge)
**Speed**: 🐌 Slower (~2-5s for all tests)

Tests the full UI integration:

```typescript
import { TsyneTest } from '../../src/index-test';
import { CalculatorUI } from './calculator-ui';

async function testAddition() {
  const tsyneTest = new TsyneTest({ headed: false });
  const testApp = tsyneTest.createApp((app) => {
    const calc = new CalculatorUI(app);
    calc.build();
  });
  const ctx = tsyneTest.getContext();
  await testApp.run();

  // Click buttons
  await ctx.getByExactText("5").click();
  await ctx.getByExactText("+").click();
  await ctx.getByExactText("3").click();
  await ctx.getByExactText("=").click();

  // Verify display
  const display = ctx.getByType("label");
  await ctx.expect(display).toHaveText("8");
}
```

**What's tested:**
- Button click handling
- Display updates
- Widget visibility
- Event propagation
- UI state synchronization
- Complete user workflows

**Run:**
```bash
npm run test:integration
# or
npm run test:calculator
```

**Benefits:**
- ✓ Tests real user interactions
- ✓ Catches UI-specific bugs
- ✓ End-to-end validation
- ✓ Headed mode for debugging

## Architecture: Separation of Concerns

### calculator-logic.ts (Model)
Pure business logic, no UI dependencies:

```typescript
export class CalculatorLogic {
  inputNumber(num: string): string { ... }
  inputOperator(op: string): string { ... }
  calculate(): string { ... }
  clear(): string { ... }
}
```

**Testable with:** Jest ✓

### calculator-ui.ts (View/Presenter)
UI presentation layer:

```typescript
export class CalculatorUI {
  private logic: CalculatorLogic;

  build() {
    // Create Tsyne widgets
    button("5", () => this.handleNumberClick("5"));
  }

  private handleNumberClick(num: string) {
    const display = this.logic.inputNumber(num);
    this.updateDisplay(display);
  }
}
```

**Testable with:** TsyneTest ✓

## When to Use Each

### Use Jest for:
- ✓ Business logic validation
- ✓ Algorithms and calculations
- ✓ State management
- ✓ Data transformations
- ✓ Edge case handling
- ✓ TDD/rapid iteration

### Use TsyneTest for:
- ✓ UI interaction flows
- ✓ Widget behavior
- ✓ Layout and display
- ✓ Event handling
- ✓ Integration scenarios
- ✓ Visual debugging

## Coverage Comparison

### Jest Unit Tests
```
CalculatorLogic
  ✓ Initial State (2 tests)
  ✓ Number Input (5 tests)
  ✓ Decimal Input (4 tests)
  ✓ Addition (3 tests)
  ✓ Subtraction (2 tests)
  ✓ Multiplication (3 tests)
  ✓ Division (4 tests)
  ✓ Chain Operations (2 tests)
  ✓ Clear Function (3 tests)
  ✓ Edge Cases (6 tests)

Total: 34 tests in ~100ms
```

### TsyneTest Integration Tests
```
Calculator UI
  ✓ Display initial value
  ✓ Button clicks
  ✓ All operations work end-to-end
  ✓ UI updates correctly

Total: 11 tests in ~3s
```

## Running Both

```bash
# All tests
npm test

# Just unit tests (fast)
npm run test:unit

# Just integration tests
npm run test:integration

# Watch mode for TDD
jest --watch calculator-logic.test.ts
```

## CI/CD Pipeline

```yaml
test:
  steps:
    # Fast feedback - unit tests first
    - name: Unit Tests
      run: npm run test:unit

    # Then integration tests
    - name: Integration Tests
      run: npm run test:integration
```

## Best Practices

### 1. Keep Logic Separate
```typescript
// ✓ Good - logic separate
class CalculatorLogic {
  calculate() { /* pure logic */ }
}

// ✗ Bad - logic mixed with UI
class Calculator {
  calculate() {
    this.display.setText(...); // UI dependency
  }
}
```

### 2. Test Business Logic with Jest
```typescript
// ✓ Fast, isolated unit test
test('division by zero', () => {
  const calc = new CalculatorLogic();
  expect(calc.execute('5 ÷ 0 =')).toBe('Error');
});
```

### 3. Test UI Integration with TsyneTest
```typescript
// ✓ Full UI workflow test
await ctx.getByExactText("5").click();
await ctx.getByExactText("÷").click();
await ctx.getByExactText("0").click();
await ctx.expect(display).toHaveText("Error");
```

### 4. Use Jest for TDD
```typescript
// Write test first
test('should multiply decimals', () => {
  const calc = new CalculatorLogic();
  expect(calc.execute('2.5 × 4 =')).toBe('10');
});

// Then implement
class CalculatorLogic {
  // ... implementation
}
```

### 5. Use TsyneTest for UI Verification
```typescript
// After logic works, verify UI integration
test('calculator buttons work', async () => {
  // Click buttons, verify display updates
});
```

## Analogy to Java Testing

This is similar to Java Swing testing:

| Java | Tsyne | Purpose |
|------|------|---------|
| JUnit | Jest | Unit test business logic |
| Marathon/Abbot | TsyneTest | UI integration testing |
| Model class | CalculatorLogic | Pure business logic |
| JPanel/View | CalculatorUI | UI presentation |

## Summary

**Two-tier approach:**
1. **Jest** - Fast unit tests for business logic (34 tests, ~100ms)
2. **TsyneTest** - Integration tests for UI (11 tests, ~3s)

**Result:**
- Fast feedback loop (Jest)
- Complete coverage (Jest + TsyneTest)
- Easy debugging (separated concerns)
- Maintainable codebase (single responsibility)

This is the recommended pattern for all Tsyne applications!
