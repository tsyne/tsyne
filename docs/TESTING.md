# TsyneTest - Testing Framework for Tsyne

TsyneTest is a fluent, Playwright-inspired testing framework for Tsyne applications, providing both headed and headless testing modes.

## Quick Start

```typescript
import { TsyneTest } from '../src/index-test';
import { app, window, button, label } from 'tsyne';

const tsyneTest = new TsyneTest({ headed: false });

const testApp = tsyneTest.createApp((app) => {
  window({ title: "Test App" }, () => {
    vbox(() => {
      label("Counter: 0").withId("counter");
      button("Increment", () => { /* ... */ });
    });
  });
});

const ctx = tsyneTest.getContext();
await testApp.run();

// Fluent assertions
await ctx.getByID("counter").shouldBe("Counter: 0");
await ctx.getByExactText("Increment").click();
await ctx.getByID("counter").within(500).shouldBe("Counter: 1");

await tsyneTest.cleanup();
```

## Locators

### Finding Widgets

```typescript
ctx.getByID("submit-btn")       // By widget ID (fastest)
ctx.getByExactText("Submit")    // Exact text match
ctx.getByText("Counter:")       // Partial text match
ctx.getByType("button")         // By widget type
ctx.getByPlaceholder("Email")   // By placeholder text
ctx.getByTestId("login-form")   // By test ID
ctx.getByRole("textbox")        // By accessibility role
ctx.getByLabel("Username")      // By accessibility label
```

### Locator Actions

```typescript
await ctx.getByID("btn").click();           // Click
await ctx.getByID("btn").doubleClick();     // Double-click
await ctx.getByID("btn").rightClick();      // Right-click
await ctx.getByID("input").type("Hello");   // Type text
await ctx.getByID("input").submit();        // Submit entry
await ctx.getByID("slider").setValue(75);   // Set slider value
await ctx.getByID("widget").hover();        // Hover over widget
await ctx.getByID("item").drag(50, 0);      // Drag widget

const text = await ctx.getByID("label").getText();  // Get text
const info = await ctx.getByID("widget").getInfo(); // Get widget info
```

## Fluent Assertions

TsyneTest provides fluent `should*` assertions that read naturally:

### Text Assertions

```typescript
await ctx.getByID("status").shouldBe("Success");
await ctx.getByID("message").shouldContain("welcome");
await ctx.getByID("email").shouldMatch(/^[\w]+@[\w]+\.[\w]+$/);
await ctx.getByID("error").shouldNotBe("Fatal");
```

### State Assertions

```typescript
await ctx.getByID("checkbox").shouldBeChecked();
await ctx.getByID("checkbox").shouldNotBeChecked();
await ctx.getByID("submit").shouldBeEnabled();
await ctx.getByID("submit").shouldBeDisabled();
await ctx.getByID("slider").shouldHaveValue(50);
await ctx.getByID("dropdown").shouldHaveSelected("Option A");
await ctx.getByID("widget").shouldHaveType("button");
```

### Visibility & Existence Assertions

```typescript
await ctx.getByID("modal").shouldBeVisible();
await ctx.getByID("modal").shouldNotBeVisible();
await ctx.getByID("widget").shouldExist();
await ctx.getByID("widget").shouldNotExist();
```

## Polling with within() and without()

Use `within(ms)` to retry assertions until they pass or timeout:

```typescript
// Poll for up to 500ms until text equals "Success"
await ctx.getByID("status").within(500).shouldBe("Success");

// Poll for up to 1000ms until element exists
await ctx.getByID("modal").within(1000).shouldExist();

// Poll for up to 500ms until element is gone
await ctx.getByID("loading").without(500).shouldNotExist();
```

This is essential for testing async UI updates without arbitrary `wait()` calls.

## List Item Assertions

Access specific items in list widgets:

```typescript
// Assert specific list items
await ctx.getByID("playerList").item(0).shouldBe("Alice");
await ctx.getByID("playerList").item(1).shouldContain("Bob");
await ctx.getByID("emails").item(2).shouldMatch(/^[\w]+@/);

// Get item text
const name = await ctx.getByID("playerList").item(0).getText();
```

## Legacy Expect-Style Assertions

The `ctx.expect()` API is still available:

```typescript
await ctx.expect(ctx.getByID("label")).toHaveText("Hello");
await ctx.expect(ctx.getByID("label")).toContainText("ell");
await ctx.expect(ctx.getByID("widget")).toBeVisible();
await ctx.expect(ctx.getByID("widget")).toExist();
await ctx.expect(ctx.getByType("button")).toHaveCount(3);
```

## Test Context Methods

```typescript
// Wait utilities
await ctx.wait(100);                              // Fixed wait
await ctx.waitForCondition(async () => {          // Custom condition
  return await ctx.hasText("Ready");
}, { timeout: 5000, description: "ready state" });

// Page inspection
const widgets = await ctx.getAllWidgets();        // All widgets
const texts = await ctx.getAllText();             // All text values
const hasIt = await ctx.hasText("Success");       // Check for text
await ctx.assertHasText("Welcome");               // Assert text exists

// Data retrieval
const listData = await ctx.getListData("myList"); // List items
const tableData = await ctx.getTableData("myTable"); // Table rows

// Navigation
await ctx.scroll(0, 100);                         // Scroll canvas
await ctx.focusNext();                            // Tab navigation
await ctx.focusPrevious();                        // Shift+Tab

// Screenshots
await ctx.captureScreenshot("/tmp/screenshot.png");
```

## Widget IDs for Testing

Add IDs to widgets for reliable test selectors:

```typescript
// In your app code
button("Submit").withId("submit-btn");
label("Status").withId("status-label");
entry().withId("username-input");

// In your test code
await ctx.getByID("submit-btn").click();
await ctx.getByID("status-label").shouldBe("Success");
```

Using `getByID()` is faster than text-based lookups and more resilient to text changes.

## Complete Example

```typescript
import { TsyneTest } from '../src/index-test';

describe('Counter App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });

    let count = 0;
    const testApp = tsyneTest.createApp(() => {
      window({ title: "Counter" }, () => {
        vbox(() => {
          label(`Count: ${count}`).withId("count");
          hbox(() => {
            button("-").withId("dec").onClick(() => {
              count--;
              ctx.getByID("count").setText(`Count: ${count}`);
            });
            button("+").withId("inc").onClick(() => {
              count++;
              ctx.getByID("count").setText(`Count: ${count}`);
            });
          });
        });
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should start at zero', async () => {
    await ctx.getByID("count").shouldBe("Count: 0");
  });

  test('should increment', async () => {
    await ctx.getByID("inc").click();
    await ctx.getByID("count").within(100).shouldBe("Count: 1");
  });

  test('should decrement', async () => {
    await ctx.getByID("dec").click();
    await ctx.getByID("count").within(100).shouldBe("Count: -1");
  });
});
```

## Test Modes

### Headless Mode (Default)

```typescript
const tsyneTest = new TsyneTest({ headed: false });
```

- Faster execution
- No display required
- Perfect for CI/CD

### Headed Mode

```typescript
const tsyneTest = new TsyneTest({ headed: true });
```

- Visual debugging
- Watch tests execute
- Verify appearance

## Best Practices

### 1. Use IDs for Reliable Selection

```typescript
// Good - fast and resilient
await ctx.getByID("submit-btn").click();

// Less reliable - breaks if text changes
await ctx.getByExactText("Submit").click();
```

### 2. Use within() Instead of wait()

```typescript
// Good - polls until ready
await ctx.getByID("status").within(500).shouldBe("Done");

// Bad - arbitrary wait
await ctx.wait(500);
await ctx.getByID("status").shouldBe("Done");
```

### 3. One Assertion Per Line

```typescript
// Good - clear what failed
await ctx.getByID("name").shouldBe("Alice");
await ctx.getByID("score").shouldBe("100");

// Hard to debug
await ctx.getByID("name").shouldBe("Alice") && await ctx.getByID("score").shouldBe("100");
```

### 4. Always Clean Up

```typescript
afterEach(async () => {
  await tsyneTest.cleanup();
});
```

## Custom Jest Matchers

TsyneTest overrides Jest's built-in matchers with versions that provide accurate stack traces:

- `toBe`, `toContain`, `toMatch`
- `toBeTruthy`, `toBeFalsy`
- `toBeGreaterThan`, `toBeLessThan`

Custom matchers for UI testing:
- `toBeChecked(expected)` - checkbox state
- `toBeEnabled(expected)` - enabled/disabled state
- `toExist(expected)` - widget existence

## CI/CD Integration

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

## See Also

- [Examples](../examples/)
- [Test Apps](../test-apps/)
- [API Reference](API_REFERENCE.md)
