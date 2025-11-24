# Browser Testing with TsyneBrowserTest

**TsyneBrowserTest** is a Playwright-inspired testing framework specifically designed for testing Tsyne Browser pages. It provides automatic test server setup, Selenium/Playwright-like interaction APIs, and flexible integration with any assertion library or test runner.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Playwright-Inspired Features](#playwright-inspired-features)
  - [Locators (Finding Widgets)](#locators-finding-widgets)
  - [Actions (Interacting with Widgets)](#actions-interacting-with-widgets)
  - [Expectations (Built-in Assertions)](#expectations-built-in-assertions)
- [Browser-Specific Features](#browser-specific-features)
  - [Navigation](#navigation)
  - [URL Assertions](#url-assertions)
- [Assertion Libraries](#assertion-libraries)
- [Test Runners](#test-runners)
- [Complete Examples](#complete-examples)
- [Comparison to Playwright/Selenium](#comparison-to-playwrightselenium)
- [API Reference](#api-reference)

## Overview

TsyneBrowserTest combines the best of both worlds:

1. **Automatic Test Server**: No need to run a separate HTTP server - TsyneBrowserTest starts one automatically on a random port
2. **Playwright-Style API**: Familiar locators, actions, and expectations for finding and interacting with widgets
3. **Browser Navigation**: Built-in helpers for navigating, going back/forward, and reloading pages
4. **Flexible**: Works with any assertion library (Jest, Chai, assert) and any test runner (Jest, Mocha, Vitest, plain Node.js)

```typescript
import { browserTest } from 'tsyne';

await browserTest(
  'should navigate between pages',
  [
    { path: '/', code: `/* home page code */` },
    { path: '/about', code: `/* about page code */` }
  ],
  async (bt) => {
    await bt.createBrowser('/');
    const ctx = bt.getContext();

    // Playwright-style locators and actions
    const aboutButton = await ctx.findWidget({ text: 'Go to About' });
    await ctx.clickWidget(aboutButton.id);

    // Browser-specific assertions
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/about');
  }
);
```

## Quick Start

### Installation

TsyneBrowserTest is included with Tsyne. See **[INSTALLATION.md](INSTALLATION.md)** for complete installation instructions.

```bash
# npm package (coming soon)
npm install tsyne  # Not yet published to npm

# OR use standalone installer
./scripts/install.sh
```

### Basic Test

```typescript
import { browserTest } from 'tsyne';

async function main() {
  await browserTest(
    'should load home page',
    [
      {
        path: '/',
        code: `
          const { vbox, label } = tsyne;
          vbox(() => {
            label('Welcome to Home Page');
          });
        `
      }
    ],
    async (bt) => {
      await bt.createBrowser('/');
      const ctx = bt.getContext();

      // Find widget
      const welcomeLabel = await ctx.findWidget({ text: 'Welcome to Home Page' });
      if (!welcomeLabel) {
        throw new Error('Welcome label not found');
      }

      console.log('✓ Test passed!');
    }
  );
}

main().catch(console.error);
```

Run the test:

```bash
npm run build
node my-browser-test.js
```

## Playwright-Inspired Features

TsyneBrowserTest uses **TestContext** (from TsyneTest) which provides Playwright-style APIs for finding and interacting with widgets.

### Locators (Finding Widgets)

Find widgets using familiar Playwright-inspired methods:

```typescript
const ctx = bt.getContext();

// Find by exact text match
const submitButton = ctx.getByExactText('Submit');

// Find by partial text match
const welcomeLabel = ctx.getByText('Welcome');

// Find by widget type
const allButtons = ctx.getByType('button');
const allEntries = ctx.getByType('entry');
const allLabels = ctx.getByType('label');

// Lower-level search with criteria
const widget = await ctx.findWidget({ text: 'Submit' });
const button = await ctx.findWidget({ type: 'button' });
const specificWidget = await ctx.findWidget({ text: 'Go', type: 'button' });
```

**Supported widget types**:
- `button`, `label`, `entry`, `checkbox`, `select`, `slider`, `radiogroup`
- `progressbar`, `hyperlink`, `separator`, `table`, `list`
- `multilineentry`, `passwordentry`, `tree`, `richtext`, `image`

### Actions (Interacting with Widgets)

Interact with widgets using Playwright-style actions:

```typescript
const ctx = bt.getContext();

// Click widgets
const button = await ctx.findWidget({ text: 'Submit' });
await ctx.clickWidget(button.id);

// Type into entry widgets
const nameEntry = ctx.getByType('entry');
await nameEntry.type('John Doe');

// Get text from widgets
const label = ctx.getByExactText('Count: 0');
const text = await label.getText();
console.log(text); // "Count: 0"

// Get widget state
const checkbox = ctx.getByType('checkbox');
const checked = await checkbox.getChecked();
```

**Available actions**:
- **`clickWidget(widgetId)`**: Click a widget
- **`type(text)`**: Type text into entry widgets
- **`getText()`**: Get text from labels, buttons, entries
- **`getChecked()`**: Get checkbox state
- **`getSelected()`**: Get select/radiogroup selection
- **`getValue()`**: Get slider value

### Expectations (Built-in Assertions)

Use Playwright-style expectations for assertions:

```typescript
const ctx = bt.getContext();
const locator = ctx.getByExactText('Welcome');

// Text assertions
await ctx.expect(locator).toHaveText('Welcome to Home Page');
await ctx.expect(locator).toContainText('Welcome');

// Visibility assertions
await ctx.expect(locator).toBeVisible();
await ctx.expect(locator).toExist();

// Negation
await ctx.expect(locator).not.toBeVisible();
```

**Built-in expectations**:
- **`toHaveText(expected)`**: Assert exact text match
- **`toContainText(expected)`**: Assert partial text match
- **`toBeVisible()`**: Assert widget is visible
- **`toExist()`**: Assert widget exists
- **`not`**: Negate any expectation

## Fluent-Selenium Style API

TsyneBrowserTest includes a complete [fluent-selenium](https://github.com/SeleniumHQ/fluent-selenium) inspired API for elegant, expressive test writing. This API provides retry mechanisms, fluent assertions, and method chaining that reads like natural language.

### Overview

Fluent-selenium style methods allow you to write tests that are:
- **Self-documenting**: Read like English sentences
- **Robust**: Automatic retry logic handles timing issues
- **Concise**: Chain methods for compact test code
- **Expressive**: Clear intent without boilerplate

```typescript
// Traditional style
const locator = ctx.getByID("status");
await new Promise(resolve => setTimeout(resolve, 5000));
const text = await locator.getText();
if (text !== "Success") throw new Error("Wrong text");

// Fluent-selenium style
await ctx.getByID("status").within(5000).shouldBe("Success");
```

### Retry with within()

The `within()` method retries element location for a specified period. This is essential for handling delayed UI updates, animations, or async operations.

```typescript
// Wait up to 5 seconds for element to appear and become clickable
await ctx.getByText("Submit").within(5000).click();

// Wait for text to update after async operation
await ctx.getByID("status").within(3000).shouldBe("Complete");

// Combine with type action
await ctx.getByID("search").within(2000).type("query");
```

**How it works:**
- Polls every 100ms for the element
- Returns immediately when element is found
- Throws error if timeout is reached
- Applies to all subsequent actions (click, type, getText, etc.)

**Use cases:**
- Elements that appear after async data loading
- UI updates triggered by user actions
- Animations or transitions
- Delayed rendering

### Wait for Disappearance with without()

The `without()` method waits for an element to disappear from the DOM. Perfect for loading indicators, modals, or temporary messages.

```typescript
// Wait for loading spinner to disappear
await ctx.getByText("Loading...").without(5000);

// Wait for modal to close
await ctx.getByID("modal").without(3000);

// Wait for error message to fade out
await ctx.getByText("Error").without(2000);
```

**How it works:**
- Polls every 100ms checking if element still exists
- Returns immediately when element is not found
- Throws error if element is still visible after timeout

**Use cases:**
- Loading indicators
- Modal dialogs
- Toast notifications
- Temporary status messages

### Fluent Assertions

Fluent assertions allow you to assert text content directly on locators, with automatic retry support. All fluent assertions return the locator for further chaining.

#### shouldBe() - Exact Text Match

```typescript
// Assert exact text (retries automatically if within() was used)
await ctx.getByID("status").shouldBe("Success");

// With retry
await ctx.getByID("counter").within(5000).shouldBe("Count: 10");

// Chain multiple assertions
await ctx.getByID("message")
  .within(3000)
  .shouldBe("Processing complete")
  .then(async (loc) => {
    // Continue with more actions
  });
```

#### shouldContain() - Partial Text Match

```typescript
// Assert text contains substring
await ctx.getByID("message").shouldContain("success");

// With retry for delayed content
await ctx.getByID("result").within(5000).shouldContain("found 10 items");

// Case-sensitive substring matching
await ctx.getByID("error").shouldContain("404");
```

#### shouldMatch() - Regex Pattern Match

```typescript
// Assert text matches regex pattern
await ctx.getByID("email").shouldMatch(/^.+@.+\..+$/);

// Validate numeric formats
await ctx.getByID("price").shouldMatch(/^\$\d+\.\d{2}$/);

// With retry
await ctx.getByID("timestamp").within(3000).shouldMatch(/^\d{4}-\d{2}-\d{2}/);
```

#### shouldNotBe() - Negative Assertion

```typescript
// Assert text does NOT equal value
await ctx.getByID("status").shouldNotBe("Error");

// Verify state changed
await ctx.getByID("status").shouldNotBe("Pending");

// With retry
await ctx.getByID("loading").within(5000).shouldNotBe("Loading...");
```

### Property Assertions

Beyond text, you can assert widget properties like checked state, values, enabled/disabled state, and more:

#### Checkbox State

```typescript
// Assert checkbox is checked
await ctx.getByID("agree").shouldBeChecked();

// Assert checkbox is not checked
await ctx.getByID("agree").shouldNotBeChecked();

// With retry for delayed state changes
await ctx.getByID("terms").within(5000).shouldBeChecked();
```

#### Values (Entry, Slider, Select)

```typescript
// Assert entry has specific text value
await ctx.getByID("username").shouldHaveValue("john_doe");

// Assert slider has specific numeric value
await ctx.getByID("volume").shouldHaveValue(75);

// Assert select has specific selected value
await ctx.getByID("country").shouldHaveValue("US");

// With retry for async updates
await ctx.getByID("result").within(3000).shouldHaveValue("success");
```

#### Selected Text (Select/RadioGroup)

```typescript
// Assert select has specific selected text (display text, not value)
await ctx.getByID("country").shouldHaveSelected("United States");

// Assert radiogroup selection
await ctx.getByID("payment").shouldHaveSelected("Credit Card");
```

#### Enabled/Disabled State

```typescript
// Assert widget is enabled
await ctx.getByText("Submit").shouldBeEnabled();

// Assert widget is disabled
await ctx.getByText("Submit").shouldBeDisabled();

// With retry - wait for button to become enabled
await ctx.getByText("Submit").within(5000).shouldBeEnabled();
```

#### Widget Type

```typescript
// Assert widget has specific type
await ctx.getByID("myWidget").shouldHaveType("button");
await ctx.getByID("input").shouldHaveType("entry");
await ctx.getByID("agree").shouldHaveType("checkbox");
```

#### Visibility (Fluent Style)

```typescript
// Assert widget is visible
await ctx.getByID("modal").shouldBeVisible();

// Assert widget is not visible
await ctx.getByID("modal").shouldNotBeVisible();

// With retry - wait for element to appear
await ctx.getByID("notification").within(3000).shouldBeVisible();
```

### Complete Property Assertion Example

```typescript
import { browserTest } from 'tsyne';

await browserTest(
  'property assertions demo',
  [
    {
      path: '/',
      code: `
        const { vbox, checkbox, slider, button, entry, label } = tsyne;

        const agreeCheckbox = checkbox("I agree");
        agreeCheckbox.id = "agree";

        const volumeSlider = slider(0, 100);
        volumeSlider.id = "volume";
        volumeSlider.value = 50;

        const nameEntry = entry("Your name");
        nameEntry.id = "name";

        const submitButton = button("Submit");
        submitButton.id = "submit";
        submitButton.disable();

        const statusLabel = label("Disabled");
        statusLabel.id = "status";

        vbox(() => {
          agreeCheckbox.onChange(() => {
            if (agreeCheckbox.checked) {
              submitButton.enable();
              statusLabel.setText("Enabled");
            } else {
              submitButton.disable();
              statusLabel.setText("Disabled");
            }
          });
        });
      `
    }
  ],
  async (bt) => {
    await bt.createBrowser('/');
    const ctx = bt.getContext();

    // Check initial states
    await ctx.getByID("agree").shouldNotBeChecked();
    await ctx.getByID("volume").shouldHaveValue(50);
    await ctx.getByID("submit").shouldBeDisabled();
    await ctx.getByID("status").shouldBe("Disabled");

    // Type in entry
    await ctx.getByID("name").type("John");
    await ctx.getByID("name").shouldHaveValue("John");

    // Check the checkbox
    await ctx.getByID("agree").click();
    await ctx.wait(50);

    // Verify state changes
    await ctx.getByID("agree").shouldBeChecked();
    await ctx.getByID("submit").shouldBeEnabled();
    await ctx.getByID("status").shouldBe("Enabled");

    // Verify widget types
    await ctx.getByID("agree").shouldHaveType("checkbox");
    await ctx.getByID("submit").shouldHaveType("button");
    await ctx.getByID("name").shouldHaveType("entry");

    console.log('✓ Property assertions test passed');
  }
);
```

### Complete Fluent Example

Here's a comprehensive example using all fluent-selenium features:

```typescript
import { browserTest } from 'tsyne';

await browserTest(
  'fluent API demonstration',
  [
    {
      path: '/',
      code: `
        const { vbox, button, label } = tsyne;

        const statusLabel = label("Ready");
        statusLabel.id = "status";

        const loadingLabel = label("");
        loadingLabel.id = "loading";

        vbox(() => {
          button("Process Data", () => {
            loadingLabel.setText("Loading...");
            statusLabel.setText("Processing");

            setTimeout(() => {
              loadingLabel.setText("");
              statusLabel.setText("Complete: 10 items processed");
            }, 2000);
          });
        });
      `
    }
  ],
  async (bt) => {
    await bt.createBrowser('/');
    const ctx = bt.getContext();

    // Initial state check
    await ctx.getByID("status").shouldBe("Ready");

    // Click button to start processing
    await ctx.getByText("Process Data").click();

    // Wait for loading indicator to appear
    await ctx.getByID("loading").within(1000).shouldBe("Loading...");

    // Wait for loading to disappear (up to 5 seconds)
    await ctx.getByID("loading").without(5000);

    // Verify final status with multiple assertion styles
    await ctx.getByID("status").within(1000).shouldContain("Complete");
    await ctx.getByID("status").shouldMatch(/\d+ items processed/);
    await ctx.getByID("status").shouldNotBe("Ready");

    console.log('✓ Fluent API test passed');
  }
);
```

### Enhanced Expect Assertions

In addition to fluent assertions, TestContext provides enhanced `expect()` methods for traditional assertion style:

```typescript
const ctx = bt.getContext();
const locator = ctx.getByID("status");

// Positive assertions
await ctx.expect(locator).toHaveText("Success");
await ctx.expect(locator).toContainText("Success");
await ctx.expect(locator).toMatchText(/^Success/);
await ctx.expect(locator).toBeVisible();
await ctx.expect(locator).toExist();

// Negative assertions
await ctx.expect(locator).toNotHaveText("Error");
await ctx.expect(locator).toNotContainText("fail");
await ctx.expect(locator).toNotMatchText(/^Error/);
await ctx.expect(locator).toNotBeVisible();
await ctx.expect(locator).toNotExist();

// Count assertions
await ctx.expect(ctx.getByType("button")).toHaveCount(3);
await ctx.expect(ctx.getByType("button")).toHaveCountGreaterThan(2);
await ctx.expect(ctx.getByType("button")).toHaveCountLessThan(10);
```

### Navigation Waiting

Use `waitForNavigation()` after clicks that trigger page navigation:

```typescript
// Traditional approach - manual delay
await ctx.getByText("Next Page").click();
await new Promise(resolve => setTimeout(resolve, 200));
bt.assertUrl('/next');

// Fluent approach - semantic waiting
await ctx.getByText("Next Page").click();
await bt.waitForNavigation();
bt.assertUrl('/next');

// With custom timeout
await ctx.getByText("Slow Page").click();
await bt.waitForNavigation(10000); // Wait up to 10 seconds
```

### Fluent vs Traditional Style

Both styles are supported - choose based on your preference and team conventions:

**Fluent Style** (fluent-selenium inspired):
```typescript
// Concise, reads like English
await ctx.getByID("status").within(5000).shouldBe("Success");
await ctx.getByText("Loading...").without(3000);
await ctx.getByID("email").shouldMatch(/^.+@.+$/);
```

**Traditional Style** (Playwright/Jest inspired):
```typescript
// More explicit, familiar to Playwright users
await ctx.expect(ctx.getByID("status")).toHaveText("Success");
await ctx.expect(ctx.getByText("Loading...")).toNotBeVisible();
await ctx.expect(ctx.getByID("email")).toMatchText(/^.+@.+$/);
```

**When to use each:**
- **Fluent**: Quick tests, chaining actions, expressive intent
- **Traditional**: Complex assertions, external assertion libraries, team preference

### Best Practices

#### 1. Use within() for Delayed Content

```typescript
// ✓ Good - handles async updates
await ctx.getByID("status").within(5000).shouldBe("Complete");

// ✗ Bad - may fail on slow machines
await ctx.getByID("status").shouldBe("Complete");
```

#### 2. Use without() for Loading States

```typescript
// ✓ Good - waits for loading to finish
await ctx.getByText("Loading...").without(5000);
await ctx.getByID("results").shouldContain("10 items");

// ✗ Bad - may check results while still loading
await new Promise(resolve => setTimeout(resolve, 2000));
await ctx.getByID("results").shouldContain("10 items");
```

#### 3. Chain Fluent Methods

```typescript
// ✓ Good - concise and readable
await ctx.getByID("status")
  .within(5000)
  .shouldContain("Complete")
  .then(async () => {
    await bt.waitForNavigation();
  });

// ✗ Verbose - multiple statements
const locator = ctx.getByID("status").within(5000);
await locator.shouldContain("Complete");
await bt.waitForNavigation();
```

#### 4. Use Appropriate Timeouts

```typescript
// ✓ Good - reasonable timeouts for operations
await ctx.getByText("Submit").within(3000).click();    // 3s for form
await ctx.getByID("loading").without(10000);           // 10s for API call
await ctx.getByID("result").within(2000).shouldBe("OK"); // 2s for update

// ✗ Bad - too short or too long
await ctx.getByText("Submit").within(100).click();     // Too short
await ctx.getByID("loading").without(60000);           // Too long
```

### Implementation Note

The fluent-selenium API uses **busy-wait loops** internally (polling every 100ms). While this approach is not recommended for production web-scale code, it's perfectly appropriate for testing on the same machine or over a trusted network. The implementation prioritizes:

1. **Test reliability**: Automatic retry handles timing issues
2. **Expressiveness**: Clear, readable test code
3. **Simplicity**: Easy to understand and maintain
4. **Familiarity**: Matches fluent-selenium patterns

This is the same approach used by fluent-selenium and is standard practice in UI testing frameworks.

### Complete API Reference

**Locator Methods (Text Assertions):**
- `within(timeout)` - Set retry timeout for subsequent actions
- `without(timeout)` - Wait for element to disappear
- `shouldBe(expected)` - Assert exact text match
- `shouldContain(expected)` - Assert partial text match
- `shouldMatch(pattern)` - Assert regex match
- `shouldNotBe(expected)` - Assert text does not match

**Locator Methods (Property Assertions):**
- `shouldBeChecked()` - Assert checkbox is checked
- `shouldNotBeChecked()` - Assert checkbox is not checked
- `shouldHaveValue(value)` - Assert widget value (entry, slider, select)
- `shouldHaveSelected(text)` - Assert selected text (select, radiogroup)
- `shouldBeEnabled()` - Assert widget is enabled
- `shouldBeDisabled()` - Assert widget is disabled
- `shouldHaveType(type)` - Assert widget type
- `shouldBeVisible()` - Assert widget is visible
- `shouldNotBeVisible()` - Assert widget is not visible

**Expect Methods:**
- `toMatchText(pattern)` - Assert text matches regex
- `toNotHaveText(text)` - Assert text does not equal
- `toNotContainText(text)` - Assert text does not contain
- `toNotMatchText(pattern)` - Assert text does not match regex
- `toNotBeVisible()` - Assert element is not visible
- `toNotExist()` - Assert element does not exist
- `toHaveCountGreaterThan(count)` - Assert count comparison
- `toHaveCountLessThan(count)` - Assert count comparison

**Browser Methods:**
- `waitForNavigation(timeout?)` - Wait for page navigation to complete

### Examples

See **[examples/fluent-api.test.ts](../examples/fluent-api.test.ts)** for comprehensive examples demonstrating text assertions and **[examples/fluent-properties.test.ts](../examples/fluent-properties.test.ts)** for property assertion examples.

## Browser-Specific Features

### Navigation

TsyneBrowserTest provides browser navigation helpers:

```typescript
const bt = new TsyneBrowserTest();

// Navigate to a path
await bt.navigate('/about');

// Go back in history
await bt.back();

// Go forward in history
await bt.forward();

// Reload current page
await bt.reload();

// Note: Add small delay after navigation for UI to update
await new Promise(resolve => setTimeout(resolve, 200));
```

**Navigation Example**:

```typescript
await browserTest(
  'should navigate back and forward',
  [
    { path: '/', code: `/* home page */` },
    { path: '/about', code: `/* about page */` }
  ],
  async (bt) => {
    await bt.createBrowser('/');

    // Navigate forward
    await bt.navigate('/about');
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/about');

    // Navigate back
    await bt.back();
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/');

    // Navigate forward again
    await bt.forward();
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/about');
  }
);
```

### URL Assertions

Assert and retrieve current URL:

```typescript
// Assert current URL (throws on mismatch)
bt.assertUrl('/about');
bt.assertUrl('/products/123');

// Get current URL for custom assertions
const url = bt.getCurrentUrl();
console.log(url); // "/about"

// Use with any assertion library
expect(bt.getCurrentUrl()).toBe('/about');
assert.strictEqual(bt.getCurrentUrl(), '/about');
```

## Assertion Libraries

TsyneBrowserTest is **assertion-library agnostic** - use any library you prefer:

### 1. Built-in Assertions

```typescript
// Browser assertions
bt.assertUrl('/about');  // Throws on mismatch

// TestContext expectations (Playwright-style)
await ctx.expect(locator).toHaveText('Welcome');
await ctx.expect(locator).toBeVisible();
```

### 2. Jest

```typescript
import { browserTest } from 'tsyne';

await browserTest('test', pages, async (bt) => {
  await bt.createBrowser('/');
  const ctx = bt.getContext();

  // Jest assertions
  expect(bt.getCurrentUrl()).toBe('/');

  const label = await ctx.findWidget({ text: 'Welcome' });
  expect(label).toBeTruthy();

  const text = await ctx.getByExactText('Welcome').getText();
  expect(text).toContain('Welcome');
});
```

### 3. Chai

```typescript
import { expect } from 'chai';
import { browserTest } from 'tsyne';

await browserTest('test', pages, async (bt) => {
  await bt.createBrowser('/');
  const ctx = bt.getContext();

  // Chai assertions
  expect(bt.getCurrentUrl()).to.equal('/');

  const label = await ctx.findWidget({ text: 'Welcome' });
  expect(label).to.exist;

  const text = await ctx.getByExactText('Welcome').getText();
  expect(text).to.include('Welcome');
});
```

### 4. Node.js Assert

```typescript
import assert from 'assert';
import { browserTest } from 'tsyne';

await browserTest('test', pages, async (bt) => {
  await bt.createBrowser('/');
  const ctx = bt.getContext();

  // Node.js assertions
  assert.strictEqual(bt.getCurrentUrl(), '/');

  const label = await ctx.findWidget({ text: 'Welcome' });
  assert(label, 'Label not found');

  const text = await ctx.getByExactText('Welcome').getText();
  assert(text.includes('Welcome'), 'Text does not contain Welcome');
});
```

### 5. Custom Error Throwing

```typescript
await browserTest('test', pages, async (bt) => {
  await bt.createBrowser('/');
  const ctx = bt.getContext();

  // Just throw errors
  if (bt.getCurrentUrl() !== '/') {
    throw new Error('Wrong URL!');
  }

  const label = await ctx.findWidget({ text: 'Welcome' });
  if (!label) {
    throw new Error('Welcome label not found');
  }
});
```

## Test Runners

TsyneBrowserTest is **test-runner agnostic** - works with any runner:

### 1. Jest

```typescript
// browser.test.ts
import { browserTest } from 'tsyne';

const homePage = {
  path: '/',
  code: `
    const { vbox, label, button } = tsyne;
    vbox(() => {
      label('Home Page');
      button('Go to About', () => {
        browserContext.changePage('/about');
      });
    });
  `
};

const aboutPage = {
  path: '/about',
  code: `
    const { vbox, label } = tsyne;
    vbox(() => {
      label('About Page');
    });
  `
};

describe('Browser Tests', () => {
  test('should load home page', async () => {
    await browserTest(
      'home page test',
      [homePage],
      async (bt) => {
        await bt.createBrowser('/');
        expect(bt.getCurrentUrl()).toBe('/');

        const ctx = bt.getContext();
        const label = await ctx.findWidget({ text: 'Home Page' });
        expect(label).toBeTruthy();
      }
    );
  });

  test('should navigate between pages', async () => {
    await browserTest(
      'navigation test',
      [homePage, aboutPage],
      async (bt) => {
        await bt.createBrowser('/');
        const ctx = bt.getContext();

        // Click navigation button
        const aboutButton = await ctx.findWidget({ text: 'Go to About' });
        await ctx.clickWidget(aboutButton.id);

        await new Promise(resolve => setTimeout(resolve, 200));
        expect(bt.getCurrentUrl()).toBe('/about');
      }
    );
  });
});
```

**Run with Jest**:
```bash
npm install --save-dev jest @types/jest
npx jest browser.test.ts
```

### 2. Mocha

```typescript
// browser.test.ts
import { browserTest } from 'tsyne';
import { expect } from 'chai';

const pages = [
  { path: '/', code: `/* home page */` },
  { path: '/about', code: `/* about page */` }
];

describe('Browser Tests', function() {
  this.timeout(10000); // Browser tests need more time

  it('should load home page', async () => {
    await browserTest(
      'home page test',
      [pages[0]],
      async (bt) => {
        await bt.createBrowser('/');
        expect(bt.getCurrentUrl()).to.equal('/');
      }
    );
  });

  it('should navigate between pages', async () => {
    await browserTest(
      'navigation test',
      pages,
      async (bt) => {
        await bt.createBrowser('/');
        await bt.navigate('/about');
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(bt.getCurrentUrl()).to.equal('/about');
      }
    );
  });
});
```

**Run with Mocha**:
```bash
npm install --save-dev mocha chai @types/mocha @types/chai
npx mocha browser.test.ts
```

### 3. Vitest

```typescript
// browser.test.ts
import { describe, test, expect } from 'vitest';
import { browserTest } from 'tsyne';

const pages = [
  { path: '/', code: `/* home page */` },
  { path: '/about', code: `/* about page */` }
];

describe('Browser Tests', () => {
  test('should load home page', async () => {
    await browserTest(
      'home page test',
      [pages[0]],
      async (bt) => {
        await bt.createBrowser('/');
        expect(bt.getCurrentUrl()).toBe('/');
      }
    );
  });

  test('should navigate between pages', async () => {
    await browserTest(
      'navigation test',
      pages,
      async (bt) => {
        await bt.createBrowser('/');
        await bt.navigate('/about');
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(bt.getCurrentUrl()).toBe('/about');
      }
    );
  });
});
```

**Run with Vitest**:
```bash
npm install --save-dev vitest
npx vitest browser.test.ts
```

### 4. Plain Node.js (No Test Runner)

```typescript
// browser.test.ts
import { browserTest } from 'tsyne';

async function main() {
  console.log('Running browser tests...\n');

  // Test 1
  await browserTest(
    'should load home page',
    [{ path: '/', code: `/* home page */` }],
    async (bt) => {
      await bt.createBrowser('/');
      if (bt.getCurrentUrl() !== '/') {
        throw new Error('Wrong URL!');
      }
      console.log('✓ Test 1 passed');
    }
  );

  // Test 2
  await browserTest(
    'should navigate between pages',
    [
      { path: '/', code: `/* home page */` },
      { path: '/about', code: `/* about page */` }
    ],
    async (bt) => {
      await bt.createBrowser('/');
      await bt.navigate('/about');
      await new Promise(resolve => setTimeout(resolve, 200));
      if (bt.getCurrentUrl() !== '/about') {
        throw new Error('Navigation failed!');
      }
      console.log('✓ Test 2 passed');
    }
  );

  console.log('\nAll tests passed!');
}

main().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
```

**Run with Node.js**:
```bash
npm run build
node browser.test.js
```

## Complete Examples

### Example 1: Form Submission Flow

```typescript
import { browserTest } from 'tsyne';

await browserTest(
  'should submit form and navigate to confirmation',
  [
    {
      path: '/',
      code: `
        const { vbox, label, entry, button } = tsyne;
        let nameEntry, emailEntry;

        vbox(() => {
          label('Registration Form');
          label('Name:');
          nameEntry = entry('Your name');
          label('Email:');
          emailEntry = entry('your@email.com');
          button('Submit', () => {
            browserContext.changePage('/thanks');
          });
        });
      `
    },
    {
      path: '/thanks',
      code: `
        const { vbox, label } = tsyne;
        vbox(() => {
          label('Thank you for registering!');
        });
      `
    }
  ],
  async (bt) => {
    await bt.createBrowser('/');
    const ctx = bt.getContext();

    // Verify form page loaded
    bt.assertUrl('/');
    const formLabel = await ctx.findWidget({ text: 'Registration Form' });
    if (!formLabel) {
      throw new Error('Form page not loaded');
    }

    // Fill form (note: actual typing not supported yet, but we can test navigation)
    const submitButton = await ctx.findWidget({ text: 'Submit' });
    await ctx.clickWidget(submitButton.id);

    // Wait for navigation
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify navigation to confirmation page
    bt.assertUrl('/thanks');
    const thanksLabel = await ctx.findWidget({ text: 'Thank you for registering!' });
    if (!thanksLabel) {
      throw new Error('Confirmation page not loaded');
    }

    console.log('✓ Form submission flow test passed');
  }
);
```

### Example 2: Multi-Page Navigation

```typescript
import { browserTest } from 'tsyne';

const pages = [
  {
    path: '/',
    code: `
      const { vbox, label, button } = tsyne;
      vbox(() => {
        label('Home Page');
        button('Products', () => browserContext.changePage('/products'));
        button('About', () => browserContext.changePage('/about'));
      });
    `
  },
  {
    path: '/products',
    code: `
      const { vbox, label, button } = tsyne;
      vbox(() => {
        label('Products Page');
        button('Home', () => browserContext.changePage('/'));
      });
    `
  },
  {
    path: '/about',
    code: `
      const { vbox, label, button } = tsyne;
      vbox(() => {
        label('About Page');
        button('Home', () => browserContext.changePage('/'));
      });
    `
  }
];

await browserTest(
  'should navigate through multiple pages',
  pages,
  async (bt) => {
    await bt.createBrowser('/');
    const ctx = bt.getContext();

    // Start on home
    bt.assertUrl('/');
    let label = await ctx.findWidget({ text: 'Home Page' });
    if (!label) throw new Error('Home page not loaded');

    // Go to products
    let button = await ctx.findWidget({ text: 'Products' });
    await ctx.clickWidget(button.id);
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/products');

    // Go back to home
    button = await ctx.findWidget({ text: 'Home' });
    await ctx.clickWidget(button.id);
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/');

    // Go to about
    button = await ctx.findWidget({ text: 'About' });
    await ctx.clickWidget(button.id);
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/about');

    // Use browser back button
    await bt.back();
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/');

    // Use browser forward button
    await bt.forward();
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/about');

    console.log('✓ Multi-page navigation test passed');
  }
);
```

### Example 3: Reload and State

```typescript
import { browserTest } from 'tsyne';

await browserTest(
  'should update timestamp on reload',
  [
    {
      path: '/',
      code: `
        const { vbox, label } = tsyne;
        vbox(() => {
          label('Current Time: ' + new Date().toISOString());
        });
      `
    }
  ],
  async (bt) => {
    await bt.createBrowser('/');
    const ctx = bt.getContext();

    // Get initial timestamp
    const label1 = await ctx.findWidget({ text: /Current Time:/ });
    const time1 = await ctx.getByText('Current Time:').getText();

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Reload page
    await bt.reload();
    await new Promise(resolve => setTimeout(resolve, 200));

    // Get new timestamp
    const time2 = await ctx.getByText('Current Time:').getText();

    // Timestamps should be different
    if (time1 === time2) {
      throw new Error('Timestamp did not update after reload');
    }

    console.log('✓ Reload test passed');
    console.log(`  Before: ${time1}`);
    console.log(`  After:  ${time2}`);
  }
);
```

## Comparison to Playwright/Selenium

TsyneBrowserTest provides similar functionality to Playwright/Selenium, but for Tsyne Browser pages instead of web browsers:

| Feature | Playwright/Selenium | TsyneBrowserTest |
|---------|-------------------|-----------------|
| **Target** | Web browsers (Chrome, Firefox, Safari) | Tsyne Browser (desktop app) |
| **Page Format** | HTML/CSS/JavaScript | TypeScript (Tsyne API) |
| **Locators** | CSS selectors, XPath, text | Widget text/type matching |
| **Actions** | Click, type, hover, drag, etc. | Click, type, widget methods |
| **Navigation** | `page.goto()`, `page.goBack()` | `navigate()`, `back()`, `forward()` |
| **Assertions** | Built-in `expect()` | Built-in `expect()` + any library |
| **Test Server** | External (you provide) | Built-in (automatic) |
| **Test Runner** | Built-in (Playwright Test) | Any (Jest, Mocha, Vitest, etc.) |
| **Headless Mode** | Yes | Yes (via TsyneTest options) |
| **Screenshots** | Yes | No (not yet implemented) |
| **Network Intercept** | Yes | No (not applicable) |

### API Similarities

**Playwright**:
```typescript
// Playwright
await page.goto('http://localhost:3000/');
const button = page.getByText('Submit');
await button.click();
await expect(page).toHaveURL('/thanks');
```

**TsyneBrowserTest**:
```typescript
// TsyneBrowserTest
await bt.navigate('/');
const button = await ctx.findWidget({ text: 'Submit' });
await ctx.clickWidget(button.id);
bt.assertUrl('/thanks');
```

## API Reference

### Helper Function

#### `browserTest(name, pages, testFn, options?)`

Quick helper for running browser tests.

**Parameters:**
- **`name`** (string): Test name/description
- **`pages`** (TestPage[]): Array of test pages
  - `path`: URL path (e.g., '/', '/about')
  - `code`: TypeScript code for the page
- **`testFn`** (function): Test function receiving TsyneBrowserTest instance
- **`options`** (BrowserTestOptions, optional):
  - `port`: Server port (default: random)
  - `headed`: Show browser UI (default: false)

**Returns:** `Promise<void>`

**Example:**
```typescript
await browserTest(
  'my test',
  [{ path: '/', code: '...' }],
  async (bt) => {
    await bt.createBrowser('/');
    bt.assertUrl('/');
  },
  { headed: false }
);
```

### TsyneBrowserTest Class

#### Constructor

```typescript
new TsyneBrowserTest(options?: BrowserTestOptions)
```

**Options:**
- `port`: Server port (default: random)
- `headed`: Show browser UI (default: false)

#### Methods

##### `addPages(pages: TestPage[])`

Add test pages to be served by the test server.

**Parameters:**
- `pages`: Array of `{ path: string, code: string }` objects

**Example:**
```typescript
const bt = new TsyneBrowserTest();
bt.addPages([
  { path: '/', code: '/* home page */' },
  { path: '/about', code: '/* about page */' }
]);
```

##### `createBrowser(initialPath?: string, options?: BrowserOptions)`

Start the test server and create the browser.

**Parameters:**
- `initialPath`: Initial URL path (default: '/')
- `options`: Browser options (title, width, height)

**Returns:** `Promise<Browser>`

**Example:**
```typescript
await bt.createBrowser('/', {
  title: 'Test Browser',
  width: 900,
  height: 700
});
```

##### `navigate(path: string)`

Navigate to a path.

**Parameters:**
- `path`: URL path to navigate to

**Returns:** `Promise<void>`

**Example:**
```typescript
await bt.navigate('/about');
await new Promise(resolve => setTimeout(resolve, 200));
```

##### `back()`

Navigate back in history.

**Returns:** `Promise<void>`

**Example:**
```typescript
await bt.back();
await new Promise(resolve => setTimeout(resolve, 200));
```

##### `forward()`

Navigate forward in history.

**Returns:** `Promise<void>`

**Example:**
```typescript
await bt.forward();
await new Promise(resolve => setTimeout(resolve, 200));
```

##### `reload()`

Reload the current page.

**Returns:** `Promise<void>`

**Example:**
```typescript
await bt.reload();
await new Promise(resolve => setTimeout(resolve, 200));
```

##### `assertUrl(expected: string)`

Assert the current URL matches the expected path.

**Parameters:**
- `expected`: Expected URL path

**Throws:** Error if URL doesn't match

**Example:**
```typescript
bt.assertUrl('/about');
bt.assertUrl('/products/123');
```

##### `getCurrentUrl()`

Get the current URL path.

**Returns:** `string`

**Example:**
```typescript
const url = bt.getCurrentUrl();
console.log(url); // "/about"
```

##### `getContext()`

Get the TestContext for widget interaction.

**Returns:** `TestContext`

**Example:**
```typescript
const ctx = bt.getContext();
const button = await ctx.findWidget({ text: 'Submit' });
```

##### `cleanup()`

Stop the test server and quit the browser.

**Returns:** `Promise<void>`

**Example:**
```typescript
await bt.cleanup();
```

### TestContext (from TsyneTest)

The TestContext provides Playwright-style APIs for finding and interacting with widgets.

#### Locators

- **`getByExactText(text)`**: Find by exact text match
- **`getByText(text)`**: Find by partial text match
- **`getByType(type)`**: Find by widget type

#### Methods

- **`findWidget(criteria)`**: Find widget by criteria
- **`clickWidget(widgetId)`**: Click a widget
- **`expect(locator)`**: Create expectation for assertions

#### Expectations

- **`toHaveText(expected)`**: Assert exact text
- **`toContainText(expected)`**: Assert partial text
- **`toBeVisible()`**: Assert widget is visible
- **`toExist()`**: Assert widget exists
- **`not`**: Negate expectation

### Types

#### TestPage

```typescript
interface TestPage {
  path: string;   // URL path (e.g., '/', '/about')
  code: string;   // TypeScript page code
}
```

#### BrowserTestOptions

```typescript
interface BrowserTestOptions {
  port?: number;    // Server port (default: random)
  headed?: boolean; // Show browser UI (default: false)
}
```

## Best Practices

### 1. Always add delays after navigation

```typescript
// ✓ Good
await bt.navigate('/about');
await new Promise(resolve => setTimeout(resolve, 200));
bt.assertUrl('/about');

// ✗ Bad
await bt.navigate('/about');
bt.assertUrl('/about'); // May fail - UI hasn't updated yet
```

### 2. Use descriptive test names

```typescript
// ✓ Good
await browserTest('should submit form and show confirmation', pages, ...);

// ✗ Bad
await browserTest('test 1', pages, ...);
```

### 3. Clean up resources

```typescript
// ✓ Good - using browserTest helper (cleanup automatic)
await browserTest('test', pages, async (bt) => { ... });

// ✓ Good - manual cleanup
const bt = new TsyneBrowserTest();
try {
  await bt.createBrowser('/');
  // ... test code
} finally {
  await bt.cleanup();
}
```

### 4. Use built-in expectations when possible

```typescript
// ✓ Good - uses built-in expectations
await ctx.expect(locator).toHaveText('Welcome');

// ✓ Also good - uses external assertion library
const text = await locator.getText();
expect(text).toBe('Welcome');
```

### 5. Keep page code focused

```typescript
// ✓ Good - simple, focused page
{
  path: '/',
  code: `
    const { vbox, label, button } = tsyne;
    vbox(() => {
      label('Home');
      button('About', () => browserContext.changePage('/about'));
    });
  `
}

// ✗ Bad - complex logic in page code
{
  path: '/',
  code: `
    const { vbox, label, button } = tsyne;
    // 100 lines of complex business logic...
    vbox(() => { ... });
  `
}
```

## Troubleshooting

### Tests timing out

Add delays after navigation:
```typescript
await bt.navigate('/about');
await new Promise(resolve => setTimeout(resolve, 200)); // Add this
bt.assertUrl('/about');
```

### Widget not found

Use broader text matching:
```typescript
// ✗ May fail if text has extra whitespace
const widget = await ctx.findWidget({ text: 'Submit Form' });

// ✓ Use partial match
const widget = await ctx.findWidget({ text: 'Submit' });
```

### Server port conflicts

Let TsyneBrowserTest choose a random port:
```typescript
// ✓ Good - random port
const bt = new TsyneBrowserTest();

// ✗ Bad - hardcoded port may conflict
const bt = new TsyneBrowserTest({ port: 3000 });
```

## Further Reading

- **[examples/browser.test.ts](examples/browser.test.ts)** - Comprehensive browser test examples
- **[TESTING.md](TESTING.md)** - TsyneTest documentation (for non-browser apps)
- **[TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)** - Complete testing checklist
- **[README.md](README.md)** - Main Tsyne documentation

## License

MIT License - see [LICENSE](LICENSE) file for details
