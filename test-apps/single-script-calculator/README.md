# Simple Calculator - Monolithic Implementation

This calculator demonstrates the **monolithic approach** where UI and business logic are combined in a single file.

## Architecture

```
calculator.ts (150 lines)
├── Global state variables
├── Business logic functions
├── UI event handlers
└── Jyne UI declaration
```

Everything is in one file with global state.

## PROS ✅

### 1. **Simplicity**
- All code in one place
- Easy to read top-to-bottom
- No abstraction layers
- Beginner-friendly

### 2. **Quick Prototyping**
- Fast to get started
- No architecture decisions needed
- Perfect for demos

### 3. **Low Overhead**
- No class boilerplate
- No file navigation
- Minimal cognitive load

### 4. **Easy to Understand**
- Linear code flow
- Clear cause and effect
- No indirection

## CONS ❌

### 1. **Mixed Concerns**
```typescript
// Business logic mixed with UI
function handleNumber(num: string) {
  // Logic
  const newValue = currentValue === "0" ? num : currentValue + num;

  // UI update (coupled!)
  if (display) {
    display.setText(newValue);
  }
}
```

### 2. **Cannot Unit Test Logic**
```bash
# ❌ Can't do this - logic is not extracted
jest calculator-logic.test.ts

# ✓ Must do this - slow integration tests only
npm run test:calculator-simple
```

### 3. **Slow Test Feedback**
```
Simple Calculator Tests (JyneTest only):
  5 tests in ~3 seconds

  Each test:
  - Spawns bridge process (~500ms)
  - Runs full UI workflow
  - Cannot isolate logic bugs
```

### 4. **Hard to Maintain**
As the app grows:
- Global state becomes unwieldy
- Functions have side effects
- Hard to refactor
- Difficult to debug

### 5. **Cannot Reuse Logic**
```typescript
// ❌ Can't reuse in different UI
// ❌ Can't use in CLI version
// ❌ Can't use in web version
```

## Testing Strategy

**Only JyneTest integration tests possible:**

```typescript
// Every test must:
test('addition', async () => {
  // 1. Spawn bridge process
  const jyneTest = new JyneTest();

  // 2. Build entire UI
  const app = jyneTest.createApp(...);

  // 3. Click buttons
  await ctx.getByExactText("5").click();
  await ctx.getByExactText("+").click();
  await ctx.getByExactText("3").click();
  await ctx.getByExactText("=").click();

  // 4. Verify UI
  await ctx.expect(display).toHaveText("8");

  // 5. Cleanup
  await jyneTest.cleanup();
});
```

**Problems:**
- 5 tests take ~3 seconds
- Cannot test edge cases quickly
- Hard to debug business logic failures
- Must rebuild UI for every test

## When to Use This Approach

### ✅ Good For:

1. **Small Applications**
   - < 500 lines of code
   - Simple requirements
   - Few edge cases

2. **Prototypes**
   - Proof of concept
   - Quick demos
   - Learning examples

3. **Simple Tools**
   - One-off utilities
   - Internal tools
   - Scripts with UI

4. **Educational Examples**
   - Teaching Jyne basics
   - Getting started guides
   - Simple demonstrations

### ❌ Not Good For:

1. **Production Applications**
   - Complex business logic
   - Many edge cases
   - Need for reliability

2. **Team Projects**
   - Multiple developers
   - Long-term maintenance
   - Code reviews needed

3. **Reusable Components**
   - Logic needed elsewhere
   - Multiple UIs
   - Library code

4. **TDD Projects**
   - Test-driven development
   - High test coverage
   - Fast feedback loops

## Comparison with Advanced Calculator

| Aspect | Simple (Monolithic) | Advanced (Decomposed) |
|--------|---------------------|----------------------|
| **Files** | 1 file | 3+ files |
| **Lines of code** | 150 lines | 200+ lines |
| **Complexity** | Low | Medium |
| **Test types** | JyneTest only | Jest + JyneTest |
| **Test count** | 5 tests | 45 tests (34 Jest + 11 JyneTest) |
| **Test speed** | ~3s | ~0.5s (unit) + ~3s (integration) |
| **TDD-friendly** | ❌ No | ✅ Yes |
| **Reusability** | ❌ No | ✅ Yes |
| **Maintainability** | ⚠️ Hard at scale | ✅ Easy |
| **Learning curve** | ✅ Easy | ⚠️ Steeper |
| **Best for** | Demos, prototypes | Production apps |

## Running the Simple Calculator

```bash
# Run the app
npm run run:calculator-simple

# Run tests (JyneTest only)
npm run test:calculator-simple

# Note: No Jest tests available for this version
```

## Migration Path

If your monolithic app grows too complex, refactor to the decomposed pattern:

```typescript
// Before: Monolithic
let currentValue = "0";
function handleNumber(num: string) {
  currentValue = currentValue === "0" ? num : currentValue + num;
  display.setText(currentValue);
}

// After: Decomposed
class CalculatorLogic {
  inputNumber(num: string): string {
    // Pure logic, returns new value
  }
}

class CalculatorUI {
  private logic = new CalculatorLogic();

  handleNumber(num: string) {
    const value = this.logic.inputNumber(num);
    this.display.setText(value);
  }
}
```

Now you can:
- ✓ Unit test logic with Jest
- ✓ Test UI with JyneTest
- ✓ Reuse logic elsewhere
- ✓ Maintain easily

## Summary

The **simple/monolithic approach** is perfect for:
- Learning Jyne
- Quick prototypes
- Small utilities

But for **production applications**, use the **decomposed pattern** (see `calculator-advanced/`) which provides:
- Fast unit tests
- Better maintainability
- Reusable logic
- TDD-friendly development

**Rule of Thumb:**
- < 200 lines: Monolithic is fine
- \> 200 lines: Start decomposing
- Production code: Always decompose
