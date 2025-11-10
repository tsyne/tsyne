# Test Applications

This directory contains example applications demonstrating different architectural patterns and testing strategies for Tsyne.

## Calculators - Two Approaches

We provide **two calculator implementations** to demonstrate different approaches to building and testing Tsyne applications:

### 1. calculator-simple/ - Monolithic Approach

**Philosophy**: All code in one place, simple and straightforward.

```
calculator-simple/
├── calculator.ts           (150 lines - all in one)
├── calculator.test.ts      (5 TsyneTest tests only)
└── README.md
```

**PROS:**
- ✅ Simple and easy to understand
- ✅ Quick to prototype
- ✅ All code in one place
- ✅ Perfect for learning

**CONS:**
- ❌ Cannot unit test logic separately
- ❌ Slow test feedback (~3s per test)
- ❌ Mixed UI and business logic
- ❌ Hard to maintain at scale

**When to use:**
- Small apps (< 200 lines)
- Prototypes and demos
- Learning examples
- Simple utilities

**Run:**
```bash
npm run run:calculator-simple
npm run test:calculator-simple
```

---

### 2. calculator-advanced/ - Decomposed Approach

**Philosophy**: Separated concerns, testable architecture, production-ready.

```
calculator-advanced/
├── calculator-logic.ts         (Pure business logic)
├── calculator-logic.test.ts    (34 Jest unit tests)
├── calculator-ui.ts             (UI presentation)
├── calculator.test.ts           (11 TsyneTest integration tests)
├── TESTING-STRATEGY.md
└── README.md
```

**PROS:**
- ✅ Fast unit tests (~100ms for 34 tests)
- ✅ TDD-friendly development
- ✅ Reusable logic
- ✅ Easy to maintain and debug
- ✅ Comprehensive test coverage

**CONS:**
- ❌ More files and boilerplate
- ❌ Higher learning curve
- ❌ More initial setup

**When to use:**
- Production applications
- Complex business logic
- Team projects
- Long-term maintenance
- TDD workflows

**Run:**
```bash
npm run run:calculator
npm run test:calculator         # Integration tests
npm run test:calculator:logic   # Unit tests
npm test                        # All tests
```

---

## Comparison Table

| Aspect | Simple (Monolithic) | Advanced (Decomposed) |
|--------|---------------------|----------------------|
| **Files** | 1 file | 5+ files |
| **Lines of code** | 150 | 300+ |
| **Test frameworks** | TsyneTest only | Jest + TsyneTest |
| **Test count** | 5 tests | 45 tests (34 + 11) |
| **Test speed** | ~3s total | ~0.5s unit + ~3s integration |
| **TDD iteration** | ~3s | ~100ms |
| **Learning curve** | Easy | Medium |
| **Maintainability** | Hard at scale | Easy |
| **Reusability** | No | Yes |
| **Best for** | Demos, prototypes | Production apps |

## Testing Pyramid

### Simple Calculator (Flat)
```
┌────────────────────────┐
│  TsyneTest Integration  │  5 tests, ~3s
│  (Only option)         │
└────────────────────────┘
```

### Advanced Calculator (Pyramid)
```
        /\
       /UI \          TsyneTest - 11 tests, ~3s
      /______\        (Integration)
     /        \
    /  Logic  \       Jest - 34 tests, ~100ms
   /____________\     (Unit)
```

## Decision Guide

### Choose Simple Calculator Pattern If:
- [ ] App is < 200 lines
- [ ] It's a prototype or demo
- [ ] Quick development is priority
- [ ] You're learning Tsyne
- [ ] Logic is trivial
- [ ] One-time use

### Choose Advanced Calculator Pattern If:
- [ ] App is production-bound
- [ ] Complex business logic
- [ ] Team collaboration
- [ ] Long-term maintenance
- [ ] Need TDD workflow
- [ ] Logic reuse needed
- [ ] High test coverage required

## Quick Start

### Try the Simple Calculator
```bash
# Run it
npm run run:calculator-simple

# Test it
npm run test:calculator-simple

# See: test-apps/calculator-simple/README.md
```

### Try the Advanced Calculator
```bash
# Run it
npm run run:calculator

# Test unit logic (fast!)
npm run test:unit

# Test UI integration
npm run test:integration

# See: test-apps/calculator-advanced/README.md
```

## Learning Path

1. **Start with Simple** (`calculator-simple/`)
   - Learn Tsyne basics
   - Understand UI building
   - See TsyneTest in action

2. **Graduate to Advanced** (`calculator-advanced/`)
   - Learn separation of concerns
   - Master two-tier testing
   - Understand production patterns

3. **Apply to Your Project**
   - Start simple for prototypes
   - Refactor to advanced when needed
   - Follow the migration guide

## Migration Example

### Before (Simple)
```typescript
// calculator.ts
let currentValue = "0";

function handleNumber(num: string) {
  currentValue = num;
  display.setText(currentValue);
}

app(() => {
  button("5", () => handleNumber("5"));
});
```

### After (Advanced)
```typescript
// calculator-logic.ts (testable!)
export class CalculatorLogic {
  inputNumber(num: string): string {
    return this.currentValue = num;
  }
}

// calculator-ui.ts
export class CalculatorUI {
  private logic = new CalculatorLogic();

  handleNumber(num: string) {
    const value = this.logic.inputNumber(num);
    this.display.setText(value);
  }
}

// calculator-logic.test.ts (Jest!)
test('input number', () => {
  const calc = new CalculatorLogic();
  expect(calc.inputNumber('5')).toBe('5');
});
```

## Best Practices

### For Simple Apps
- Keep it under 200 lines
- Use global state sparingly
- Test with TsyneTest only
- Refactor if it grows

### For Advanced Apps
- Separate logic from UI
- Unit test with Jest
- Integration test with TsyneTest
- Follow Model-View-Presenter

### For Both
- Write clear comments
- Document edge cases
- Test error conditions
- Keep README updated

## Summary

Both patterns have their place:

**Simple Calculator**: Perfect for learning, demos, and small utilities
**Advanced Calculator**: Required for production, teams, and complex apps

**Rule of Thumb**: Start simple, refactor to advanced when you feel the pain of monolithic design (usually around 200 lines or when tests get slow).

See individual README files for detailed documentation:
- [calculator-simple/README.md](calculator-simple/README.md)
- [calculator-advanced/README.md](calculator-advanced/README.md)
- [calculator-advanced/TESTING-STRATEGY.md](calculator-advanced/TESTING-STRATEGY.md)
