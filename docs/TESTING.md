# TsyneTest - Testing Framework for Tsyne

TsyneTest is a Playwright-like testing framework for Tsyne applications, providing both headed and headless testing modes.

## Quick Start

```typescript
// For development/examples in the tsyne repo:
import { TsyneTest } from '../src/index-test';
// For published package usage:
// import { TsyneTest } from 'tsyne/dist/src/index-test';

import { app, window, button, label } from 'tsyne';

// Create a test
const tsyneTest = new TsyneTest({ headed: false });

// Build your app
const testApp = tsyneTest.createApp((app) => {
  window({ title: "Test App" }, () => {
    vbox(() => {
      label("Counter: 0");
      button("Increment", () => { /* ... */ });
    });
  });
});

// Get test context
const ctx = tsyneTest.getContext();

// Run the app
await testApp.run();

// Interact with the UI
await ctx.getByExactText("Increment").click();

// Make assertions
const counter = ctx.getByText("Counter:");
await ctx.expect(counter).toContainText("Counter: 1");

// Clean up
await tsyneTest.cleanup();
```

## Installation

TsyneTest is included with Tsyne. Import from the test entry point:

```typescript
// For development/examples in the tsyne repo:
import { TsyneTest, TestContext } from '../src/index-test';

// For published package usage:
import { TsyneTest, TestContext } from 'tsyne/dist/src/index-test';
```

## Core Concepts

### Test Modes

#### Headless Mode (Default)

Tests run without displaying UI, using Fyne's test driver:

```typescript
const tsyneTest = new TsyneTest({ headed: false });
```

**Benefits:**
- Faster execution
- No screen real estate required
- Perfect for CI/CD
- Deterministic test results

#### Headed Mode

Tests run with visible UI windows:

```typescript
const tsyneTest = new TsyneTest({ headed: true });
```

**Benefits:**
- Visual debugging
- Watch tests execute
- Verify visual appearance
- Demo test capabilities

### Test Context

The `TestContext` is your main interface for interacting with the UI:

```typescript
const ctx = tsyneTest.getContext();
```

## Locators

Locators find widgets in your application using various selectors.

### By Exact Text

Find widgets with exact text match:

```typescript
const button = ctx.getByExactText("Submit");
await button.click();
```

### By Partial Text

Find widgets containing text:

```typescript
const label = ctx.getByText("Counter:");
const text = await label.getText();
```

### By Type

Find widgets by their type:

```typescript
const allButtons = ctx.getByType("button");
const allLabels = ctx.getByType("label");
const allEntries = ctx.getByType("entry");
```

## Locator Actions

### click()

Click a button:

```typescript
await ctx.getByExactText("Submit").click();
```

### type(text)

Type text into an entry field:

```typescript
await ctx.getByType("entry").type("Hello, World!");
```

### getText()

Get the text content of a widget:

```typescript
const text = await ctx.getByExactText("Result").getText();
console.log(text); // "Result"
```

### getInfo()

Get detailed information about a widget:

```typescript
const info = await ctx.getByType("entry").getInfo();
console.log(info);
// {
//   id: "entry_1",
//   type: "entry",
//   text: "Hello",
//   placeholder: "Enter text..."
// }
```

### waitFor(timeout?)

Wait for a widget to appear:

```typescript
await ctx.getByText("Loading...").waitFor(5000);
```

## Assertions

The `expect()` function creates assertion helpers.

### toHaveText(text)

Assert exact text match:

```typescript
await ctx.expect(ctx.getByType("label")).toHaveText("Counter: 5");
```

### toContainText(text)

Assert partial text match:

```typescript
await ctx.expect(ctx.getByType("label")).toContainText("Counter:");
```

### toBeVisible()

Assert widget exists and can be found:

```typescript
await ctx.expect(ctx.getByExactText("Submit")).toBeVisible();
```

### toExist()

Assert widget exists (at least one match):

```typescript
await ctx.expect(ctx.getByType("button")).toExist();
```

### toHaveCount(count)

Assert specific number of matching widgets:

```typescript
await ctx.expect(ctx.getByType("button")).toHaveCount(5);
```

## Helper Methods

### wait(ms)

Pause execution for a specified time:

```typescript
await ctx.wait(100); // Wait 100ms
```

### getAllWidgets()

Get information about all widgets in the application:

```typescript
const widgets = await ctx.getAllWidgets();
widgets.forEach(w => {
  console.log(`${w.type}: ${w.text}`);
});
```

## Complete Example

Here's a complete test for a counter application:

```typescript
import { TsyneTest } from '../src/index-test';
import { app, window, vbox, hbox, button, label } from 'tsyne';

async function testCounter() {
  const tsyneTest = new TsyneTest({ headed: false });

  let countLabel: any;
  let count = 0;

  const testApp = tsyneTest.createApp((app) => {
    window({ title: "Counter" }, () => {
      vbox(() => {
        countLabel = label("Count: 0");

        hbox(() => {
          button("-", () => {
            count--;
            countLabel.setText(`Count: ${count}`);
          });

          button("Reset", () => {
            count = 0;
            countLabel.setText(`Count: ${count}`);
          });

          button("+", () => {
            count++;
            countLabel.setText(`Count: ${count}`);
          });
        });
      });
    });
  });

  const ctx = tsyneTest.getContext();
  await testApp.run();

  // Test initial state
  await ctx.expect(ctx.getByText("Count:")).toHaveText("Count: 0");

  // Test increment
  await ctx.getByExactText("+").click();
  await ctx.wait(50);
  await ctx.expect(ctx.getByText("Count:")).toHaveText("Count: 1");

  // Test increment again
  await ctx.getByExactText("+").click();
  await ctx.wait(50);
  await ctx.expect(ctx.getByText("Count:")).toHaveText("Count: 2");

  // Test decrement
  await ctx.getByExactText("-").click();
  await ctx.wait(50);
  await ctx.expect(ctx.getByText("Count:")).toHaveText("Count: 1");

  // Test reset
  await ctx.getByExactText("Reset").click();
  await ctx.wait(50);
  await ctx.expect(ctx.getByText("Count:")).toHaveText("Count: 0");

  // Verify all buttons exist
  await ctx.expect(ctx.getByExactText("+")).toBeVisible();
  await ctx.expect(ctx.getByExactText("-")).toBeVisible();
  await ctx.expect(ctx.getByExactText("Reset")).toBeVisible();

  await tsyneTest.cleanup();
  console.log("✓ Counter test passed");
}

testCounter().catch(console.error);
```

## Test Organization

### describe() and test()

Organize tests into suites using Tsyne's test utilities:

```typescript
import { describe, test } from '../src/index-test';

describe('Calculator Tests', () => {
  test('should add numbers', async (ctx) => {
    // ... test implementation ...
  });

  test('should subtract numbers', async (ctx) => {
    // ... test implementation ...
  });
});
```

### beforeEach() and afterEach()

Set up and tear down for each test using Jest lifecycle hooks:

```typescript
// Note: beforeEach and afterEach are Jest functions, not Tsyne exports
import { TsyneTest, TestContext } from '../src/index-test';

let tsyneTest: TsyneTest;
let ctx: TestContext;

beforeEach(() => {
  tsyneTest = new TsyneTest({ headed: false });
});

afterEach(async () => {
  await tsyneTest.cleanup();
});
```

## Best Practices

### 1. Use Small Waits After Interactions

Allow time for state updates to complete:

```typescript
await ctx.getByExactText("Submit").click();
await ctx.wait(50); // Small wait
await ctx.expect(ctx.getByText("Success")).toBeVisible();
```

### 2. Use Exact Text for Unique Elements

```typescript
// Good
await ctx.getByExactText("Submit").click();

// Less precise
await ctx.getByText("Sub").click(); // Might match "Subtitle"
```

### 3. Test One Behavior Per Test

```typescript
// Good
test('should add numbers', async () => { /* ... */ });
test('should handle division by zero', async () => { /* ... */ });

// Bad
test('should do all math operations', async () => {
  // Too much in one test
});
```

### 4. Always Clean Up

```typescript
try {
  await runTest();
} finally {
  await tsyneTest.cleanup();
}
```

### 5. Use Headed Mode for Debugging

When a test fails, run it in headed mode to see what's happening:

```typescript
const tsyneTest = new TsyneTest({ headed: true });
```

## CI/CD Integration

TsyneTest works great in CI/CD pipelines:

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - uses: actions/setup-go@v4
        with:
          go-version: 1.21

      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y libgl1-mesa-dev xorg-dev

      - name: Build
        run: npm run build

      - name: Run tests
        run: npm test
```

## Debugging Tests

### Enable Headed Mode

```typescript
const tsyneTest = new TsyneTest({ headed: true });
```

### Add Longer Waits

```typescript
await ctx.wait(1000); // Wait 1 second to observe
```

### Inspect All Widgets

```typescript
const widgets = await ctx.getAllWidgets();
console.log('All widgets:', widgets);
```

### Get Widget Info

```typescript
const info = await ctx.getByText("Submit").getInfo();
console.log('Widget info:', info);
```

## Advanced Usage

### Multiple Locators

```typescript
// Find first button
const firstButton = await ctx.getByType("button").find();

// Find all buttons
const allButtons = await ctx.getByType("button").findAll();
console.log(`Found ${allButtons.length} buttons`);
```

### Custom Waits

```typescript
// Wait for specific condition
async function waitForText(ctx: TestContext, text: string) {
  const start = Date.now();
  while (Date.now() - start < 5000) {
    try {
      const label = ctx.getByExactText(text);
      await ctx.expect(label).toBeVisible();
      return;
    } catch {
      await ctx.wait(100);
    }
  }
  throw new Error(`Timeout waiting for text: ${text}`);
}
```

## Limitations

1. **Text-based selectors**: Currently limited to text and type selectors
2. **No CSS selectors**: Unlike web testing, no CSS-style selectors
3. **No screenshot support**: Visual regression testing not yet supported
4. **Single window**: Multi-window testing not fully supported

## Future Enhancements

Planned features for TsyneTest:

- Screenshot capture and comparison
- Video recording of test runs
- Network request mocking
- Custom widget selectors
- Multi-window support
- Accessibility testing helpers
- Performance profiling
- Test report generation

## Examples

See the `test-apps/` directory for complete examples:

- **Calculator**: Comprehensive calculator with full test coverage
- More examples coming soon!

## Getting Help

- Check the [examples](test-apps/)
- Read the [main documentation](README.md)
- Open an issue on GitHub
