# Tsyne

**Elegant TypeScript wrapper for Fyne - Build beautiful cross-platform desktop UIs with Node.js**

Tsyne brings the power of [Fyne](https://fyne.io/), a modern Go UI toolkit, to the TypeScript/Node.js ecosystem with an elegant, pseudo-declarative API inspired by Ruby's Shoes DSL and QML.

## Why Tsyne?

- **Elegant Syntax**: Pseudo-declarative, terse UI markup with closures (inspired by Ruby/Groovy DSL patterns)
- **Cross-Platform**: Build native apps for macOS, Windows, and Linux from a single codebase
- **Type-Safe**: Full TypeScript support with complete type definitions
- **Easy Integration**: Simple npm package that's quick to add to any Node.js project
- **Powerful**: Full access to Fyne's rich widget library and layout system
- **Testable**: Built-in testing framework (TsyneTest) with Playwright-like API for headed/headless testing

## Installation

```bash
npm install tsyne
```

**Prerequisites**:
- Node.js 16+
- Go 1.21+ (for building the bridge)

## Quick Start

### TypeScript

```typescript
import { app } from 'tsyne';

app({ title: "Hello Tsyne" }, (app) => {
  app.window({ title: "Hello Tsyne" }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        app.label("Welcome to Tsyne!");
        app.button("Click Me", () => {
          console.log("Button clicked!");
        });
      });
    });
    win.show();
  });
});
```

### JavaScript (CommonJS)

```javascript
const { app } = require('tsyne');

app({ title: "Hello Tsyne" }, (app) => {
  app.window({ title: "Hello Tsyne" }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        app.label("Welcome to Tsyne!");
        app.button("Click Me", () => {
          console.log("Button clicked!");
        });
      });
    });
    win.show();
  });
});
```

### JavaScript (ES Modules)

```javascript
import { app } from 'tsyne';

app({ title: "Hello Tsyne" }, (app) => {
  app.window({ title: "Hello Tsyne" }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        app.label("Welcome to Tsyne!");
        app.button("Click Me", () => {
          console.log("Button clicked!");
        });
      });
    });
    win.show();
  });
});
```

Tsyne works seamlessly with both TypeScript and JavaScript!

## Elegant Syntax

Tsyne's API is designed to be elegant and terse, following the pattern described in [this blog post](https://paulhammant.com/2024/02/14/that-ruby-and-groovy-language-feature) about Ruby/Groovy DSLs. The syntax feels pseudo-declarative while retaining full imperative power:

### Calculator Example

```typescript
// Calculator example demonstrating Tsyne's pseudo-declarative DSL
import { app } from 'tsyne';

let display: any;
let currentValue = "0";
let operator: string | null = null;
let previousValue = "0";

function updateDisplay(value: string) {
  currentValue = value;
  if (display) display.setText(value);
}

function handleNumber(num: string) {
  const newValue = currentValue === "0" ? num : currentValue + num;
  updateDisplay(newValue);
}

function handleOperator(op: string) {
  previousValue = currentValue;
  operator = op;
}

function calculate() {
  if (!operator) return;
  const result = eval(`${parseFloat(previousValue)} ${operator} ${parseFloat(currentValue)}`);
  updateDisplay(isFinite(result) ? result.toString() : "Error");
  operator = null;
}

app({ title: "Calculator" }, (app) => {
  app.window({ title: "Calculator" }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        display = app.label("0");

        app.grid(4, () => {
          [..."789"].forEach(n => app.button(n, () => handleNumber(n)));
          app.button("÷", () => handleOperator("/"));
          [..."456"].forEach(n => app.button(n, () => handleNumber(n)));
          app.button("×", () => handleOperator("*"));
          [..."123"].forEach(n => app.button(n, () => handleNumber(n)));
          app.button("-", () => handleOperator("-"));
          app.button("0", () => handleNumber("0"));
          app.button("=", () => calculate());
          app.button("+", () => handleOperator("+"));
        });
      });
    });
    win.show();
  });
});
```

**See the complete single-script calculator:** **[examples/calculator.ts](examples/calculator.ts)** - Full working calculator in one file (69 substantive lines, monolithic pattern)

### Counter Example

```typescript
import { app } from 'tsyne';

let countLabel: any;
let count = 0;

function updateCounter() {
  countLabel.setText(`Count: ${count}`);
}

app({ title: "Counter" }, (app) => {
  app.window({ title: "Counter" }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        countLabel = app.label("Count: 0");

        app.hbox(() => {
          app.button("-", () => { count--; updateCounter(); });
          app.button("Reset", () => { count = 0; updateCounter(); });
          app.button("+", () => { count++; updateCounter(); });
        });
      });
    });
    win.show();
  });
});
```

## Testing with TsyneTest

Tsyne includes **TsyneTest**, a Playwright-like testing framework for testing your UI applications in headed or headless mode.

### Quick Test Example

```typescript
import { TsyneTest } from 'tsyne/test';

async function testCalculator() {
  // Create test instance (headless by default)
  const tsyneTest = new TsyneTest({ headed: false });

  // Build your app
  const testApp = tsyneTest.createApp((app) => {
    // ... build calculator UI ...
  });

  // Get test context
  const ctx = tsyneTest.getContext();
  await testApp.run();

  // Interact with the UI
  await ctx.getByExactText("5").click();
  await ctx.getByExactText("+").click();
  await ctx.getByExactText("3").click();
  await ctx.getByExactText("=").click();

  // Make assertions
  const display = ctx.getByType("label");
  await ctx.expect(display).toHaveText("8");

  // Clean up
  await tsyneTest.cleanup();
}
```

### Test Modes

**Headless (default)** - Fast, no UI, perfect for CI/CD:
```typescript
const tsyneTest = new TsyneTest({ headed: false });
```

**Headed** - Shows UI during testing, great for debugging:
```typescript
const tsyneTest = new TsyneTest({ headed: true });
```

### Locators and Assertions

```typescript
// Find widgets by text
ctx.getByExactText("Submit")
ctx.getByText("Counter:") // partial match
ctx.getByID("widget-id")   // by ID

// Find by type
ctx.getByType("button")
ctx.getByType("label")
ctx.getByType("entry")

// Actions
await locator.click()
await locator.type("text")
await locator.getText()

// Fluent-Selenium Style API
await ctx.getByText("Submit").within(5000).click()  // Retry for 5 seconds
await ctx.getByText("Loading...").without(3000)     // Wait for disappearance
await ctx.getByID("status").shouldBe("Success")     // Fluent assertion
await ctx.getByID("message").shouldContain("error") // Partial match
await ctx.getByID("email").shouldMatch(/^.+@.+$/)   // Regex match

// Assertions (Traditional style)
await ctx.expect(locator).toHaveText("exact text")
await ctx.expect(locator).toContainText("partial")
await ctx.expect(locator).toBeVisible()
await ctx.expect(locator).toExist()
await ctx.expect(locator).toMatchText(/pattern/)

// Negative assertions
await ctx.expect(locator).toNotHaveText("wrong")
await ctx.expect(locator).toNotBeVisible()
await ctx.expect(locator).toNotExist()
```

### Running Tests

```bash
# Run tests in headless mode
npm test

# Run with visible UI
npm run test:calculator:headed
```

**See [docs/TESTING.md](docs/TESTING.md) for complete documentation and the [calculator test app](test-apps/calculator/) for a comprehensive example.**

## Browser Testing with TsyneBrowserTest

Tsyne includes **TsyneBrowserTest**, a testing framework specifically designed for testing Tsyne Browser pages. It automatically starts a test HTTP server and provides navigation helpers for testing multi-page browser applications.

### Quick Browser Test Example

```typescript
import { browserTest } from 'tsyne';

browserTest(
  'Test /home',  // Use path-based names
  [
    {
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
    },
    {
      path: '/about',
      code: `
        const { vbox, label } = tsyne;
        vbox(() => {
          label('About Page');
        });
      `
    }
  ],
  async (bt) => {
    await bt.createBrowser('/');
    const ctx = bt.getContext();
    bt.assertUrl('/');

    // Verify page content
    const heading = await ctx.findWidget({ text: 'Home Page' });
    if (!heading) {
      throw new Error('Page heading not found');
    }

    // Find and click navigation button
    const aboutButton = await ctx.findWidget({ text: 'Go to About' });
    if (!aboutButton) {
      throw new Error('Navigation button not found');
    }
    await ctx.clickWidget(aboutButton.id);

    // Verify navigation occurred
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/about');

    // Verify About page loaded
    const aboutHeading = await ctx.findWidget({ text: 'About Page' });
    if (!aboutHeading) {
      throw new Error('About page not loaded');
    }
  }
);
```

### TsyneBrowserTest Features

**Automatic Test Server:**
- Starts HTTP server on random port
- Serves test pages defined in test code
- No need for separate server process

**Navigation Helpers:**
```typescript
await bt.navigate('/about');        // Navigate to a path
await bt.back();                    // Go back in history
await bt.forward();                 // Go forward in history
await bt.reload();                  // Reload current page
await bt.waitForNavigation();       // Wait for navigation to complete (after clicks)
```

**Assertions:**
```typescript
bt.assertUrl('/expected-path');  // Assert current URL
const url = bt.getCurrentUrl();  // Get current URL
```

**TestContext Access:**
```typescript
const ctx = bt.getContext();
const widget = await ctx.findWidget({ text: 'Submit' });
await ctx.clickWidget(widget.id);
```

### Complete Test Example

```typescript
import { browserTest, TsyneBrowserTest } from 'tsyne';

// Test 1: Basic page content verification
browserTest(
  'Test /',  // Use path-based test names
  [
    {
      path: '/',
      code: `
        const { vbox, label } = tsyne;
        vbox(() => {
          label('Welcome to Home Page');
          label('This is the main content');
        });
      `
    }
  ],
  async (bt: TsyneBrowserTest) => {
    await bt.createBrowser('/');
    const ctx = bt.getContext();
    bt.assertUrl('/');

    // Verify heading
    const welcomeLabel = await ctx.findWidget({ text: 'Welcome to Home Page' });
    if (!welcomeLabel) {
      throw new Error('Welcome label not found');
    }
    console.log('✓ Page heading found');

    // Verify content
    const content = await ctx.findWidget({ text: 'This is the main content' });
    if (!content) {
      throw new Error('Page content not found');
    }
    console.log('✓ Page content verified');
  }
);

// Test 2: Form submission and navigation
browserTest(
  'Test /form',
  [
    {
      path: '/',
      code: `
        const { vbox, entry, button } = tsyne;
        let nameEntry;
        vbox(() => {
          nameEntry = entry('Enter name');
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
          label('Thank you!');
        });
      `
    }
  ],
  async (bt: TsyneBrowserTest) => {
    await bt.createBrowser('/');
    const ctx = bt.getContext();
    bt.assertUrl('/');

    // Find and verify submit button
    const submitButton = await ctx.findWidget({ text: 'Submit' });
    if (!submitButton) {
      throw new Error('Submit button not found');
    }
    console.log('✓ Submit button found');

    // Click submit and navigate
    await ctx.clickWidget(submitButton.id);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify navigation and content
    bt.assertUrl('/thanks');
    const thanksLabel = await ctx.findWidget({ text: 'Thank you!' });
    if (!thanksLabel) {
      throw new Error('Thanks page not loaded');
    }
    console.log('✓ Navigation successful, thanks page loaded');
  }
);

// Test 3: Back/Forward navigation
browserTest(
  'Test /navigation',
  [
    {
      path: '/',
      code: `const { vbox, label } = tsyne; vbox(() => { label('Home'); });`
    },
    {
      path: '/page2',
      code: `const { vbox, label } = tsyne; vbox(() => { label('Page 2'); });`
    }
  ],
  async (bt: TsyneBrowserTest) => {
    await bt.createBrowser('/');
    const ctx = bt.getContext();
    bt.assertUrl('/');

    // Verify home page
    const homeLabel = await ctx.findWidget({ text: 'Home' });
    if (!homeLabel) {
      throw new Error('Home page not loaded');
    }

    // Navigate to page 2
    await bt.navigate('/page2');
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/page2');

    // Verify page 2 content
    const page2Label = await ctx.findWidget({ text: 'Page 2' });
    if (!page2Label) {
      throw new Error('Page 2 not loaded');
    }

    // Test back navigation
    await bt.back();
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/');

    // Test forward navigation
    await bt.forward();
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/page2');
    console.log('✓ Back/forward navigation works correctly');
  }
);
```

### Running Browser Tests

```bash
# Build the project
npm run build

# Run browser tests (headless by default)
node examples/web-features.test.js

# Run with visible browser windows
TSYNE_HEADED=1 node examples/web-features.test.js
```

**Test Runner Pattern:**
```javascript
const { browserTest, runBrowserTests } = require('tsyne');

// Register tests using browserTest()
browserTest('Test /page1', [...], async (bt) => { ... });
browserTest('Test /page2', [...], async (bt) => { ... });

// Run all registered tests sequentially
(async () => {
  await runBrowserTests();
})();
```

### Helper Function API

**`browserTest(name, pages, testFn, options?)`**

Registers a browser test to run later (tests execute when `runBrowserTests()` is called).

Parameters:
- **`name`**: Test name - use path-based naming like "Test /images" or "Test /home"
- **`pages`**: Array of test pages with `path` and `code` properties
- **`testFn`**: Test function receiving `TsyneBrowserTest` instance
- **`options`**: Optional configuration (port, headed mode)

**`runBrowserTests()`**

Runs all registered browser tests sequentially. Returns `Promise<void>`.

**Best Practices:**
- Use path-based test names: "Test /images" not "should load images page"
- Add multiple assertions per test to verify actual content
- Verify headings, sections, buttons, and specific text present
- Test interactive features (clicks, navigation) not just page loads

### TsyneBrowserTest Class API

**Methods:**
- **`addPages(pages)`**: Add test pages to be served
- **`createBrowser(initialPath?, options?)`**: Start server and create browser
- **`navigate(path)`**: Navigate to a path
- **`back()`**: Navigate back in history
- **`forward()`**: Navigate forward in history
- **`reload()`**: Reload current page
- **`assertUrl(expected)`**: Assert current URL matches expected
- **`getCurrentUrl()`**: Get current URL
- **`getContext()`**: Get TestContext for widget interaction
- **`cleanup()`**: Stop server and quit browser

**Fluent-Selenium Style API:**

TsyneBrowserTest includes a complete fluent-selenium inspired API for elegant test writing:

```typescript
// Retry element location with within()
await ctx.getByText("Submit").within(5000).click();

// Wait for elements to disappear with without()
await ctx.getByID("loading").without(3000);

// Fluent assertions that return locator for chaining
await ctx.getByID("status").shouldBe("Success");
await ctx.getByID("message").shouldContain("error");
await ctx.getByID("email").shouldMatch(/^.+@.+$/);
await ctx.getByID("status").shouldNotBe("Error");

// Wait for navigation after clicks
await ctx.getByText("Next Page").click();
await bt.waitForNavigation();

// Enhanced expect assertions
await ctx.expect(locator).toMatchText(/pattern/);
await ctx.expect(locator).toNotHaveText("wrong");
await ctx.expect(locator).toNotBeVisible();
await ctx.expect(locator).toHaveCountGreaterThan(3);
await ctx.expect(locator).toHaveCountLessThan(10);
```

**See [docs/BROWSER_TESTING.md](docs/BROWSER_TESTING.md) for complete documentation on TsyneBrowserTest, including:**
- Playwright-inspired locators, actions, and expectations
- Fluent-selenium style API (within, without, shouldBe, shouldContain, shouldMatch)
- Integration with Jest, Mocha, Vitest, and other test runners
- Assertion library flexibility (Jest, Chai, assert, etc.)
- Complete API reference and best practices
- **[examples/web-features.test.js](examples/web-features.test.js)**, **[examples/widget-interactions.test.js](examples/widget-interactions.test.js)**, and **[examples/fluent-api.test.ts](examples/fluent-api.test.ts)** for comprehensive examples

## API Reference

### Application

- **`app(options, builder)`**: Create and run an application
  - `options.title`: Application title (optional)
  - `builder`: Function that defines the app structure

### Windows

- **`window(options, builder)`**: Create a window
  - `options.title`: Window title
  - `options.width`: Window width in pixels (optional)
  - `options.height`: Window height in pixels (optional)
  - `options.fixedSize`: Prevent window resizing (optional, default false)
  - `builder`: Function that defines the window content

Window methods:
- **`window.resize(width, height)`**: Resize the window
- **`window.centerOnScreen()`**: Center the window on screen
- **`window.setFullScreen(fullscreen)`**: Enter or exit fullscreen mode
- **`window.setMainMenu(menuDefinition)`**: Set the main menu bar (see Menu Bar section)

### Layouts

- **`vbox(builder)`**: Vertical box layout
- **`hbox(builder)`**: Horizontal box layout
- **`grid(columns, builder)`**: Grid layout with specified number of columns
  - `columns`: Number of columns in the grid
  - `builder`: Function that defines grid children
- **`scroll(builder)`**: Scrollable container for long content
  - `builder`: Function that defines scrollable content (must have exactly one child)
- **`hsplit(leadingBuilder, trailingBuilder, offset?)`**: Horizontal split container with resizable divider
  - `leadingBuilder`: Function that defines left panel content (must have exactly one child)
  - `trailingBuilder`: Function that defines right panel content (must have exactly one child)
  - `offset`: Initial divider position from 0.0 to 1.0 (optional, default 0.5)
- **`vsplit(leadingBuilder, trailingBuilder, offset?)`**: Vertical split container with resizable divider
  - `leadingBuilder`: Function that defines top panel content (must have exactly one child)
  - `trailingBuilder`: Function that defines bottom panel content (must have exactly one child)
  - `offset`: Initial divider position from 0.0 to 1.0 (optional, default 0.5)
- **`tabs(tabDefinitions, location?)`**: Tabbed container for organizing content
  - `tabDefinitions`: Array of {title: string, builder: () => void} objects
  - `location`: Tab bar position - 'top', 'bottom', 'leading', or 'trailing' (optional, default 'top')
- **`center(builder)`**: Center layout - centers content horizontally and vertically
  - `builder`: Function that defines centered content (must have exactly one child)
  - Perfect for dialogs, splash screens, and focused content
- **`border(config)`**: Border layout - positions widgets at edges and center
  - `config`: Object with optional `top`, `bottom`, `left`, `right`, `center` builder functions
  - Each builder function creates exactly one widget for that position
  - Example: `border({ top: () => label('Header'), center: () => vbox(() => { ... }) })`
- **`gridwrap(itemWidth, itemHeight, builder)`**: Grid wrap layout with fixed item sizes
  - `itemWidth`: Fixed width for each item
  - `itemHeight`: Fixed height for each item
  - `builder`: Function that defines grid items
  - Items automatically wrap to next row when horizontal space is exhausted
  - Perfect for image galleries, button grids, icon collections

### Container Widgets

- **`card(title, subtitle, builder)`**: Card container with title, subtitle, and content
  - `title`: Card title text
  - `subtitle`: Card subtitle text
  - `builder`: Function that defines card content (must have exactly one child)
  - Example: `card('Profile', 'User information', () => { vbox(() => { ... }) })`

- **`accordion(items)`**: Accordion widget with collapsible sections
  - `items`: Array of {title: string, builder: () => void} objects
  - Each section can be expanded/collapsed independently
  - Saves vertical space by hiding content until needed
  - Example: `accordion([{ title: 'Section 1', builder: () => { vbox(() => { ... }) } }])`

- **`form(items, onSubmit?, onCancel?)`**: Form widget with labeled fields and buttons
  - `items`: Array of {label: string, widget: any} objects defining form fields
  - `onSubmit`: Optional callback when Submit button is clicked
  - `onCancel`: Optional callback when Cancel button is clicked
  - Automatically creates Submit and Cancel buttons if callbacks provided
  - Example: `form([{ label: 'Name', widget: nameEntry }, { label: 'Email', widget: emailEntry }], () => { ... })`

### Widgets

#### Basic Widgets

- **`button(text, onClick?)`**: Create a button
  - `text`: Button label
  - `onClick`: Click handler (optional)

- **`label(text)`**: Create a label
  - `text`: Label text

- **`entry(placeholder?)`**: Create a text input
  - `placeholder`: Placeholder text (optional)

- **`multilineentry(placeholder?, wrapping?)`**: Create a multi-line text input
  - `placeholder`: Placeholder text (optional)
  - `wrapping`: Text wrapping mode - 'off', 'word', or 'break' (optional, defaults to 'word')
  - Perfect for notes, comments, and longer text input
  - Methods: `setText(text: string)`, `getText(): Promise<string>`

- **`passwordentry(placeholder?)`**: Create a password input (masked text)
  - `placeholder`: Placeholder text (optional)
  - Characters are masked for security
  - Methods: `setText(text: string)`, `getText(): Promise<string>`

#### Input Widgets

- **`checkbox(text, onChanged?)`**: Create a checkbox
  - `text`: Checkbox label
  - `onChanged`: Callback when checked state changes (optional)
  - Methods: `setChecked(checked: boolean)`, `getChecked(): Promise<boolean>`

- **`select(options, onSelected?)`**: Create a dropdown select
  - `options`: Array of string options
  - `onSelected`: Callback when selection changes (optional)
  - Methods: `setSelected(value: string)`, `getSelected(): Promise<string>`

- **`slider(min, max, initialValue?, onChanged?)`**: Create a slider
  - `min`: Minimum value
  - `max`: Maximum value
  - `initialValue`: Starting value (optional)
  - `onChanged`: Callback when value changes (optional)
  - Methods: `setValue(value: number)`, `getValue(): Promise<number>`

- **`radiogroup(options, initialSelected?, onSelected?)`**: Create a radio button group
  - `options`: Array of string options
  - `initialSelected`: Initially selected option (optional)
  - `onSelected`: Callback when selection changes (optional)
  - Methods: `setSelected(value: string)`, `getSelected(): Promise<string>`

#### Display Widgets

- **`progressbar(initialValue?, infinite?)`**: Create a progress bar
  - `initialValue`: Starting progress value 0.0 to 1.0 (optional)
  - `infinite`: Set to true for indeterminate progress (optional)
  - Methods: `setProgress(value: number)`, `getProgress(): Promise<number>`

- **`separator()`**: Create a visual separator line
  - Creates a horizontal line to visually separate sections
  - Improves UI organization and readability

- **`hyperlink(text, url)`**: Create a clickable hyperlink
  - `text`: Link text to display
  - `url`: URL to open when clicked
  - Opens URL in the default browser
  - Example: `hyperlink('Visit GitHub', 'https://github.com')`

#### UI Components

- **`toolbar(items)`**: Create a toolbar with actions
  - `items`: Array of toolbar items with type ('action' | 'separator' | 'spacer'), label, and onAction callback
  - Example: `toolbar([{type: 'action', label: 'Save', onAction: () => save()}, {type: 'separator'}, {type: 'spacer'}])`

#### Data Display Widgets

- **`table(headers, data)`**: Create a table with headers and data rows
  - `headers`: Array of column header strings
  - `data`: 2D array of string data (rows x columns)
  - Methods: `updateData(data: string[][])` - Update table contents
  - Example: `table(['Name', 'Age', 'City'], [['John', '30', 'NYC'], ['Jane', '25', 'LA']])`

- **`list(items, onSelected?)`**: Create a scrollable list
  - `items`: Array of string items to display
  - `onSelected`: Callback when an item is selected (optional) - receives (index: number, item: string)
  - Methods: `updateItems(items: string[])` - Update list contents
  - Example: `list(['Item 1', 'Item 2', 'Item 3'], (index, item) => console.log(item))`

#### Specialized Widgets

- **`tree(rootLabel)`**: Tree widget for hierarchical data
  - `rootLabel`: Label for the root node
  - Displays hierarchical structure with collapsible branches
  - Perfect for file browsers, organizational charts, nested data
  - Example: `tree('Root Node')`

- **`richtext(segments)`**: Rich text widget with formatted text
  - `segments`: Array of text segments with formatting options
  - Each segment can have `bold`, `italic`, `monospace` properties
  - Example: `richtext([{ text: 'Bold text', bold: true }, { text: ' normal ', bold: false }, { text: 'italic', italic: true }])`
  - Great for formatted documents, help text, mixed formatting

- **`image(path, fillMode?)`**: Image widget for displaying images
  - `path`: File path to the image
  - `fillMode`: How to fit the image - 'contain', 'stretch', or 'original' (optional, default 'contain')
  - Supports common image formats (PNG, JPG, GIF, etc.)
  - Example: `image('/path/to/image.png', 'contain')`

### Dialogs

Tsyne provides common dialog methods on the Window class for user interactions:

#### Information and Error Dialogs

- **`window.showInfo(title, message)`**: Show an information dialog
  - `title`: Dialog title
  - `message`: Information message to display
  - Returns: `Promise<void>`

- **`window.showError(title, message)`**: Show an error dialog
  - `title`: Dialog title
  - `message`: Error message to display
  - Returns: `Promise<void>`

#### Confirmation Dialog

- **`window.showConfirm(title, message)`**: Show a confirmation dialog
  - `title`: Dialog title
  - `message`: Confirmation message
  - Returns: `Promise<boolean>` - true if confirmed, false if cancelled

#### File Dialogs

- **`window.showFileOpen()`**: Show a file open dialog
  - Returns: `Promise<string | null>` - selected file path or null if cancelled

- **`window.showFileSave(filename?)`**: Show a file save dialog
  - `filename`: Default filename (optional, defaults to 'untitled.txt')
  - Returns: `Promise<string | null>` - selected file path or null if cancelled

#### Dialog Examples

```typescript
// Information dialog
await win.showInfo('Success', 'File saved successfully!');

// Error dialog
await win.showError('Error', 'Failed to connect to server');

// Confirmation dialog
const confirmed = await win.showConfirm(
  'Delete File',
  'Are you sure you want to delete this file?'
);
if (confirmed) {
  // Delete the file
}

// File open dialog
const filePath = await win.showFileOpen();
if (filePath) {
  console.log('Selected file:', filePath);
}

// File save dialog
const savePath = await win.showFileSave('document.txt');
if (savePath) {
  console.log('Save to:', savePath);
}
```

### Menu Bar

Create application menus using `window.setMainMenu()`:

```typescript
await win.setMainMenu([
  {
    label: 'File',
    items: [
      {
        label: 'New',
        onSelected: () => { /* handle new */ }
      },
      {
        label: 'Open...',
        onSelected: async () => {
          const filePath = await win.showFileOpen();
          // handle open
        }
      },
      {
        isSeparator: true  // Menu separator
      },
      {
        label: 'Exit',
        onSelected: () => { /* handle exit */ }
      }
    ]
  },
  {
    label: 'Edit',
    items: [
      {
        label: 'Cut',
        onSelected: () => { /* handle cut */ }
      },
      {
        label: 'Copy',
        onSelected: () => { /* handle copy */ }
      },
      {
        label: 'Paste',
        onSelected: () => { /* handle paste */ },
        disabled: true  // Optional: disable menu item
      }
    ]
  },
  {
    label: 'View',
    items: [
      {
        label: 'Fullscreen',
        checked: false,  // Optional: checkmark indicator
        onSelected: async () => {
          await win.setFullScreen(true);
        }
      }
    ]
  }
]);
```

Menu item properties:
- **`label`**: Menu item text
- **`onSelected`**: Callback when item is clicked
- **`isSeparator`**: Set to true for separator line (optional)
- **`disabled`**: Disable the menu item (optional)
- **`checked`**: Show checkmark (optional)

### Widget Methods

Common methods supported by most widgets:

- **`setText(text: string)`**: Update widget text (Button, Label, Entry)
- **`getText(): Promise<string>`**: Get widget text (Button, Label, Entry)

Widget-specific methods:

- **Checkbox**: `setChecked(checked: boolean)`, `getChecked(): Promise<boolean>`
- **Select**: `setSelected(value: string)`, `getSelected(): Promise<string>`
- **Slider**: `setValue(value: number)`, `getValue(): Promise<number>`
- **RadioGroup**: `setSelected(value: string)`, `getSelected(): Promise<string>`
- **ProgressBar**: `setProgress(value: number)`, `getProgress(): Promise<number>`

## Theme Support

Tsyne supports light and dark themes that automatically apply to all widgets in your application.

### Setting the Theme

```typescript
import { app, setTheme } from 'tsyne';

app({ title: 'My App' }, () => {
  // Switch to dark theme
  await setTheme('dark');

  // Switch to light theme
  await setTheme('light');

  // Get current theme
  const currentTheme = await getTheme(); // Returns 'dark' or 'light'
});
```

### Using Theme with App Instance

```typescript
const myApp = app({ title: 'My App' }, () => {
  // ... build your UI
});

// Set theme on app instance
await myApp.setTheme('dark');

// Get current theme
const theme = await myApp.getTheme();
```

### Theme Features

- **Automatic widget styling**: All widgets automatically adapt to the selected theme
- **Light theme**: Bright background with dark text, suitable for well-lit environments
- **Dark theme**: Dark background with light text, suitable for low-light environments
- **Runtime switching**: Change themes dynamically without restarting the application
- **Persistent across windows**: Theme applies to all windows in the application

### Example: Theme Switcher

```typescript
import { app } from 'tsyne';

let themeLabel: any;

app({ title: 'Theme Demo' }, (app) => {
  app.window({ title: 'Theme Demo' }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        themeLabel = app.label('Current Theme: Light');

        app.button('Dark Theme', async () => {
          const myApp = (win as any).ctx.bridge;
          await myApp.send('setTheme', { theme: 'dark' });
          themeLabel.setText('Current Theme: Dark');
        });

        app.button('Light Theme', async () => {
          const myApp = (win as any).ctx.bridge;
          await myApp.send('setTheme', { theme: 'light' });
          themeLabel.setText('Current Theme: Light');
        });
      });
    });

    win.show();
  });
});
```

See `examples/theme.ts` for a complete theme demonstration with various widgets.

## Widget Styling System

Tsyne includes a CSS-like styling system inspired by [Swiby](https://github.com/jeanlazarou/swiby), allowing you to separate presentation from structure. Define styles once in a stylesheet module, and they automatically apply to widgets based on their type.

### Quick Start with Styling

The styling system works similarly to CSS - define styles for widget types, and they're automatically applied when widgets are created.

**Without styles** (`examples/form-unstyled.ts`):
```typescript
import { app } from 'tsyne';

app({ title: 'Form Demo' }, (app) => {
  app.window({ title: 'Form Demo' }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        app.label('Registration Form');
        app.button('Submit', () => {});
      });
    });
    win.show();
  });
});
```

**With styles** (`examples/form-styled.ts`):
```typescript
import { app } from 'tsyne';
import './form-styles';  // ← Only difference: import stylesheet!

app({ title: 'Form Demo' }, (app) => {
  app.window({ title: 'Form Demo' }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        app.label('Registration Form');  // Automatically styled!
        app.button('Submit', () => {});  // Automatically styled!
      });
    });
    win.show();
  });
});
```

**Stylesheet** (`examples/form-styles.ts`):
```typescript
import { styles, FontFamily, FontStyle } from 'tsyne';

styles({
  root: {
    font_family: FontFamily.SANS_SERIF,
    font_size: 10
  },
  label: {
    font_style: FontStyle.ITALIC,
    font_size: 12
  },
  button: {
    font_weight: 'bold'
  },
  entry: {
    font_family: FontFamily.MONOSPACE
  }
});
```

### Style Properties

The styling system supports the following properties:

#### Font Properties
- **`font_family`**: Font family - `FontFamily.SANS_SERIF`, `FontFamily.SERIF`, or `FontFamily.MONOSPACE`
- **`font_style`**: Font style - `FontStyle.NORMAL`, `FontStyle.ITALIC`, `FontStyle.BOLD`, or `FontStyle.BOLD_ITALIC`
- **`font_weight`**: Font weight - `'normal'` or `'bold'`
- **`font_size`**: Font size in points (number)

#### Color Properties (limited support)
- **`color`**: Text color - hex number (`0xRRGGBB`) or CSS color string
- **`background_color`**: Background color - hex number or CSS color string

**Note**: Fyne has limitations on per-widget color customization. Font styling works reliably across widgets, but colors require custom themes or custom widget renderers. The styling system accepts color properties for future compatibility.

### Widget Selectors

Styles can be defined for these widget types:

- **`root`**: Base styles applied to all widgets (unless overridden)
- **`button`**: Button widgets
- **`label`**: Label widgets
- **`entry`**: Single-line text input widgets
- **`multilineentry`**: Multi-line text area widgets
- **`passwordentry`**: Password input widgets
- **`checkbox`**: Checkbox widgets
- **`select`**: Dropdown select widgets
- **`slider`**: Slider widgets
- **`radiogroup`**: Radio button groups
- **`progressbar`**: Progress bar widgets
- **`hyperlink`**: Hyperlink widgets
- **`table`**: Table widgets
- **`list`**: List widgets

### Complete Styling Example

Swiby-style approach with separate stylesheet:

**styles.ts** (stylesheet module):
```typescript
import { styles, FontFamily, FontStyle } from 'tsyne';

styles({
  root: {
    font_family: FontFamily.SANS_SERIF,
    font_style: FontStyle.NORMAL,
    font_size: 10
  },
  label: {
    font_style: FontStyle.ITALIC,
    font_size: 12,
    color: 0xAA0000  // Red text
  },
  entry: {
    font_family: FontFamily.MONOSPACE,
    font_size: 12,
    background_color: 0xFFFFC6  // Light yellow background
  },
  button: {
    font_weight: 'bold'
  }
});
```

**main.ts** (application):
```typescript
import { app } from 'tsyne';
import './styles';  // Import stylesheet - styles auto-apply!

app({ title: 'Styled App' }, (app) => {
  app.window({ title: 'Styled App' }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        app.label('Enter your details:');
        app.entry('Name');
        app.entry('Email');
        app.button('Submit', () => {});
      });
    });
    win.show();
  });
});
```

### Style Inheritance

Styles follow a cascading pattern:
1. **Root styles** apply to all widgets
2. **Widget-specific styles** override root styles
3. Later style definitions override earlier ones

```typescript
styles({
  root: {
    font_size: 10,        // All widgets: 10pt
    font_style: FontStyle.NORMAL
  },
  label: {
    font_size: 12,        // Labels: 12pt (overrides root)
    font_style: FontStyle.ITALIC  // Labels: italic (overrides root)
  }
});
```

### API Reference

**`styles(definitions)`**
Define styles for widget types.

```typescript
import { styles, FontStyle } from 'tsyne';

styles({
  label: { font_style: FontStyle.BOLD },
  button: { font_weight: 'bold' }
});
```

**`clearStyles()`**
Clear all defined styles.

```typescript
import { clearStyles } from 'tsyne';

clearStyles();
```

**`getStyleSheet()`**
Get the global stylesheet instance.

```typescript
import { getStyleSheet } from 'tsyne';

const sheet = getStyleSheet();
const labelStyle = sheet?.getComputedStyle('label');
```

### Comparison with Swiby

Tsyne's styling system is inspired by Swiby's elegant stylesheet approach:

**Swiby (Ruby/Swing)**:
```ruby
styles {
  root(
    :font_family => Styles::VERDANA,
    :font_size => 10
  )
  label(
    :font_style => :italic,
    :color => 0xAA0000
  )
}
```

**Tsyne (TypeScript/Fyne)**:
```typescript
styles({
  root: {
    font_family: FontFamily.SANS_SERIF,
    font_size: 10
  },
  label: {
    font_style: FontStyle.ITALIC,
    color: 0xAA0000
  }
});
```

### Limitations

Due to Fyne's architecture:
- **Color customization** is limited for standard widgets (requires custom themes or renderers)
- **Font styles** (bold, italic, monospace) work well across widgets
- **Font families** are limited to sans-serif, serif, and monospace
- **Widget-specific styling** may have platform-specific variations

For advanced color customization, consider using Fyne's theme system (see Theme Support section above).

### Examples

See these examples demonstrating the styling system:
- **`examples/form-unstyled.ts`** - Form without any styling
- **`examples/form-styled.ts`** - Same form with stylesheet applied
- **`examples/form-styles.ts`** - Stylesheet module defining visual styles

Run the examples to see the difference:
```bash
npm run build
node examples/form-unstyled.js   # Without styles
node examples/form-styled.js     # With styles
```

## Context Menus

All Tsyne widgets support right-click context menus, enabling contextual actions based on what the user clicks.

### Usage

Use `widget.setContextMenu()` to add a context menu to any widget:

```typescript
const todoLabel = label('Buy potatoes');

todoLabel.setContextMenu([
  {
    label: 'Mark Complete',
    onSelected: () => {
      console.log('Marked complete!');
    }
  },
  {
    label: 'Edit',
    onSelected: () => {
      console.log('Edit item');
    }
  },
  { isSeparator: true },
  {
    label: 'Delete',
    onSelected: () => {
      console.log('Delete item');
    }
  }
]);
```

### Menu Item Options

```typescript
interface ContextMenuItem {
  label: string;           // Menu item text
  onSelected: () => void;  // Callback when selected
  disabled?: boolean;      // Gray out and disable item
  checked?: boolean;       // Show checkmark
  isSeparator?: boolean;   // Render as separator line
}
```

### Examples

**Todo List with Context Menus:**
```typescript
const items = ['Buy milk', 'Buy potatoes', 'Call dentist'];

items.forEach(item => {
  const itemLabel = label(`☐ ${item}`);

  itemLabel.setContextMenu([
    {
      label: 'Mark Complete',
      onSelected: () => markComplete(item)
    },
    {
      label: 'Edit',
      onSelected: () => editItem(item)
    },
    { isSeparator: true },
    {
      label: 'Delete',
      onSelected: () => deleteItem(item)
    }
  ]);
});
```

**Document Editor with Context Menu:**
```typescript
const textEntry = entry('Document text...');

textEntry.setContextMenu([
  {
    label: 'Cut',
    onSelected: () => clipboard.cut()
  },
  {
    label: 'Copy',
    onSelected: () => clipboard.copy()
  },
  {
    label: 'Paste',
    onSelected: () => clipboard.paste()
  },
  { isSeparator: true },
  {
    label: 'Select All',
    onSelected: () => selectAll()
  }
]);
```

**Dynamic Menu Items:**
```typescript
const label = label('Status: Active');

label.setContextMenu([
  {
    label: 'Enable Feature',
    checked: featureEnabled,
    onSelected: () => toggleFeature()
  },
  {
    label: 'Admin Only',
    disabled: !isAdmin,
    onSelected: () => adminAction()
  }
]);
```

### Demo

See **`examples/pages/context-menu-demo.ts`** for a complete todo list example with context menus.

```bash
npm run build
node examples/server.js
npx tsyne-browser http://localhost:3000/
# Navigate to Context Menu Demo page and right-click on todo items
```

## Browser System

Tsyne includes a Swiby-inspired browser system that loads **Tsyne TypeScript pages** from web servers dynamically, similar to how Mosaic, Firefox, or Chrome load HTML pages. This enables server-side page generation from any language or framework (Spring, Sinatra, Flask, Express, etc.).

**Important:** Tsyne's page grammar is **TypeScript** (not JavaScript or HTML). Pages are TypeScript code that use the Tsyne API.

### Why a Browser?

Unlike HTML+JavaScript which mixes declarative markup with imperative scripts, Tsyne pages are seamless pseudo-declarative TypeScript. The browser:

- **Loads pages from HTTP/HTTPS servers** - Standard GET requests with 200, 302, 404 support
- **Provides navigation functions** - `back()`, `forward()`, `changePage(url)`
- **Server-agnostic** - Any language can serve Tsyne pages (Node.js, Java, Ruby, Python, Go)
- **Pseudo-declarative** - Pages are pure TypeScript using the Tsyne API

### Quick Start

**Run the browser:**
```bash
# With a URL parameter
npx tsyne-browser http://localhost:3000/

# Or any other URL serving Tsyne TypeScript pages
npx tsyne-browser https://example.com/tsyne/index
```

**Create a browser in code:**
```typescript
import { createBrowser } from 'tsyne';

async function main() {
  const browser = await createBrowser('http://localhost:3000/', {
    title: 'Tsyne Browser',
    width: 900,
    height: 700
  });

  await browser.run();
}

main();
```

**Create a server (Node.js filesystem-based example):**
```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, 'pages');

// Map URL to filesystem path (/ → pages/index.ts, /about → pages/about.ts)
function urlToFilePath(url) {
  const cleanUrl = url.split('?')[0].split('#')[0].replace(/^\//, '');
  const filePath = cleanUrl === '' ? 'index.ts' : cleanUrl + '.ts';
  return path.join(PAGES_DIR, filePath);
}

http.createServer((req, res) => {
  const filePath = urlToFilePath(req.url);

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/typescript' });
      res.end(fs.readFileSync(path.join(PAGES_DIR, '404.ts'), 'utf8'));
    } else {
      res.writeHead(200, { 'Content-Type': 'text/typescript' });
      res.end(data);
    }
  });
}).listen(3000);
```

**Example page** (`pages/index.ts`):
```typescript
// Home Page - TypeScript content for Tsyne Browser
const { vbox, label, button } = tsyne;

vbox(() => {
  label('Welcome to Tsyne Browser!');
  label('');
  label('Current URL: ' + browserContext.currentUrl);
  label('');

  button('Go to About', () => {
    browserContext.changePage('/about');
  });
});
```

**Another page** (`pages/about.ts`):
```typescript
// About Page
const { vbox, label, button, separator } = tsyne;

vbox(() => {
  label('About Tsyne Browser');
  separator();
  label('');
  label('Pages are TypeScript code served from the server.');
  label('');

  button('Back', () => {
    browserContext.back();
  });
});
```

### Browser API

#### Browser Class

**Constructor:**
```typescript
new Browser(options?: {
  title?: string;
  width?: number;
  height?: number;
})
```

**Methods:**
- **`changePage(url: string): Promise<void>`** - Navigate to a URL and load the page
- **`back(): Promise<void>`** - Navigate back in history
- **`forward(): Promise<void>`** - Navigate forward in history
- **`reload(): Promise<void>`** - Reload current page
- **`stop(): void`** - Stop loading current page
- **`run(): Promise<void>`** - Start the browser application
- **`getApp(): App`** - Get the underlying App instance

**Browser Chrome:**
The browser window includes:
- **Address bar** - Entry widget showing current URL (editable)
- **← Back button** - Navigate to previous page in history
- **→ Forward button** - Navigate to next page in history
- **⟳ Reload button** - Refresh current page
- **✕ Stop button** - Cancel loading (visible only when loading)
- **Go button** - Navigate to URL in address bar
- **Loading indicator** - "Loading..." text (visible when loading)

**Menu Bar:**
Standard browser menus are provided:
- **File** - Close Window
- **View** - Reload, Stop, View Page Source
- **History** - Back, Forward (disabled when not available)
- **Help** - About Tsyne Browser
- **[Page Menus]** - Custom menus added by pages

**Factory Function:**
```typescript
createBrowser(
  initialUrl?: string,
  options?: {
    title?: string;
    width?: number;
    height?: number;
  }
): Promise<Browser>
```

#### BrowserContext

Every loaded page receives a `browserContext` object with navigation functions:

```typescript
interface BrowserContext {
  back: () => Promise<void>;
  forward: () => Promise<void>;
  changePage: (url: string) => Promise<void>;
  reload: () => Promise<void>;
  stop: () => void;
  addPageMenu: (menuLabel: string, items: PageMenuItem[]) => void;
  currentUrl: string;
  isLoading: boolean;
  browser: Browser;
}
```

**Navigation functions:**
- `back()` - Navigate to previous page
- `forward()` - Navigate to next page
- `changePage(url)` - Navigate to a new URL
- `reload()` - Refresh current page
- `stop()` - Stop loading

**Page Menu API:**
Pages can add custom menus to the browser menu bar:

```typescript
browserContext.addPageMenu('Tools', [
  {
    label: 'Say Hello',
    onSelected: () => { console.log('Hello!'); }
  },
  {
    label: 'Disabled Item',
    onSelected: () => {},
    disabled: true
  },
  {
    label: 'Checked Item',
    checked: true,
    onSelected: () => {}
  }
]);
```

Custom menus appear in the menu bar and are removed when navigating away from the page.

Pages also receive a `tsyne` object with all Tsyne API functions.

### Page Format

**Tsyne pages are TypeScript code** (not HTML or JavaScript) that execute in the browser context. They receive two parameters:

1. **`browserContext`** - Navigation and browser functions
2. **`tsyne`** - All Tsyne API functions (window, vbox, label, button, etc.)

**Example page** (`pages/contact.ts`):
```typescript
// Contact Page - TypeScript content for Tsyne Browser
const { vbox, hbox, label, button, entry } = tsyne;

let nameEntry;
let emailEntry;

vbox(() => {
  label('Contact Us');
  label('');

  label('Name:');
  nameEntry = entry('Your name');
  label('');

  label('Email:');
  emailEntry = entry('your@email.com');
  label('');

  hbox(() => {
    button('Submit', async () => {
      const name = await nameEntry.getText();
      const email = await emailEntry.getText();
      console.log('Submitted:', name, email);

      // Navigate to thank you page
      browserContext.changePage('/thanks');
    });

    button('Cancel', () => {
      browserContext.back();
    });
  });
});
```

### HTTP Support

The browser supports standard HTTP features:

- **GET requests** - Only GET is used (pages are code, not data)
- **Status codes:**
  - `200` - Success, page is rendered
  - `301/302` - Redirects are followed automatically
  - `404` - Can serve custom 404 error pages
- **Content-Type** - Pages should be served as `text/typescript` or `text/plain`
- **Timeouts** - 10 second timeout for requests

### Page File Structure

Pages are stored as `.ts` files with URL mapping:

```
pages/
├── index.ts          # / → Home page
├── about.ts          # /about → About page
├── contact.ts        # /contact → Contact form
├── form.ts           # /form → Form demo
├── thanks.ts         # /thanks → Thank you page
└── 404.ts            # (not found) → Error page
```

For nested URLs, use directories:
```
pages/
├── products/
│   ├── index.ts      # /products → Products listing
│   └── detail.ts     # /products/detail → Product detail
└── admin/
    ├── index.ts      # /admin → Admin dashboard
    └── users.ts      # /admin/users → User management
```

### Server Implementation

Servers can be implemented in any language. The only requirement is to serve TypeScript code that uses the Tsyne API from `.ts` files.

**Node.js/Express:**
```javascript
app.get('/page', (req, res) => {
  res.type('text/typescript');
  res.send('const { vbox, label } = tsyne; ...');
});
```

**Python/Flask:**
```python
@app.route('/page')
def page():
    return '''
        const { vbox, label } = tsyne;
        // ... page code
    ''', 200, {'Content-Type': 'text/typescript'}
```

**Ruby/Sinatra:**
```ruby
get '/page' do
  content_type 'text/typescript'
  <<~TSYNE
    const { vbox, label } = tsyne;
    // ... page code
  TSYNE
end
```

**Java/Spring:**
```java
@GetMapping("/page")
public ResponseEntity<String> page() {
    return ResponseEntity.ok()
        .contentType(MediaType.valueOf("text/typescript"))
        .body("const { vbox, label } = tsyne; ...");
}
```

### Navigation Flow

1. **Browser loads initial URL** via `createBrowser(url)`
2. **Server returns TypeScript code** for the page
3. **Browser executes code** with `browserContext` and `tsyne` parameters
4. **Page builds UI** using Tsyne API
5. **User clicks navigation** button calling `browserContext.changePage(url)`
6. **Process repeats** for new page

History is maintained automatically with back/forward support.

### Examples

**Browser Application:**
- **`cli/tsynebrowser.ts`** - Tsyne Browser executable

**Sample Server:**
- **`examples/server.js`** - Filesystem-based Node.js HTTP server
  - Reads `.ts` files from `pages/` directory
  - Maps URLs to files (/ → index.ts, /about → about.ts)
  - Serves TypeScript code with proper Content-Type
  - Custom 404 handling with 404.ts

**Sample Pages:**
- **`examples/pages/index.ts`** - Home page with navigation
- **`examples/pages/about.ts`** - About page with information
- **`examples/pages/contact.ts`** - Contact form with input fields
- **`examples/pages/form.ts`** - Form demo with various widgets
- **`examples/pages/thanks.ts`** - Thank you confirmation page
- **`examples/pages/404.ts`** - Custom 404 error page

**Run the examples:**
```bash
npm run build

# Terminal 1: Start the sample server
node examples/server.js

# Terminal 2: Run Tsyne Browser with URL parameter
npx tsyne-browser http://localhost:3000/
```

The browser will connect to the specified URL and load the Tsyne TypeScript page. The browser window includes:
- **Address bar** - Shows current URL, type new URLs to navigate
- **Navigation buttons** - Back (←), Forward (→), Reload (⟳)
- **Content area** - Displays the loaded Tsyne page (scrollable)

Click navigation buttons or type URLs to explore different pages served by the server.

### Use Cases

- **Desktop applications with remote pages** - Centrally managed UI served to desktop browsers
- **Dynamic UIs** - Update pages server-side without redeploying desktop apps
- **Multi-language backends** - Use your preferred server language (Java, Ruby, Python, etc.)
- **Content management** - Serve different pages based on user permissions or data
- **Progressive enhancement** - Start with static pages, add server logic later

### Comparison to Web Browsers

| Feature | Web Browsers (HTML) | Tsyne Browser |
|---------|-------------------|--------------|
| **Content Format** | HTML + CSS + JS | **TypeScript** (Tsyne API) |
| **Declarative/Imperative** | Mixed (HTML declarative, JS imperative) | **Seamless pseudo-declarative TypeScript** |
| **Navigation** | `<a>` tags, `window.location` | `browserContext.changePage()` |
| **Back/Forward** | Browser built-in | `browserContext.back/forward()` |
| **Server Language** | Any (serves HTML) | Any (serves TypeScript) |
| **Rendering** | Browser engine (Blink, Gecko) | Tsyne/Fyne (native widgets) |
| **Platform** | Web | Desktop (macOS, Windows, Linux) |

## State Management and Architectural Patterns

Tsyne provides powerful state management utilities and supports multiple architectural patterns (MVC, MVVM, MVP) for building scalable applications.

### State Passing and Two-Way Communication

Tsyne supports:
- **Passing state into components**: Initialize widgets with data from your application
- **Retrieving state back**: Get data from dialogs and forms (dialog pattern)
- **Two-way data binding**: Keep state synchronized with UI automatically
- **Observable state**: React to state changes automatically

### Quick State Management Examples

#### Observable State

```typescript
import { app, ObservableState } from 'tsyne';

const count = new ObservableState(0);
let countLabel: any;

// Subscribe to state changes
count.subscribe((newValue) => {
  countLabel?.setText(`Count: ${newValue}`);
});

app({ title: "State Demo" }, (app) => {
  app.window({ title: "State Demo" }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        countLabel = app.label("Count: 0");
        app.button("Increment", () => count.set(count.get() + 1));
      });
    });
    win.show();
  });
});
```

#### State Store (Centralized State)

```typescript
import { StateStore } from 'tsyne';

interface AppState {
  user: string;
  count: number;
}

const store = new StateStore<AppState>({
  user: 'Guest',
  count: 0
});

// Subscribe to all state changes
store.subscribe(state => {
  console.log('State changed:', state);
  updateUI(state);
});

// Update state
store.set('user', 'John');
store.update(s => ({ ...s, count: s.count + 1 }));
```

#### Dialog State Passing

```typescript
// Pass state into a dialog and get results back
const dialog = new ProfileDialog(currentProfile);
const result = await dialog.show();

if (result.confirmed) {
  store.update(state => ({
    ...state,
    profile: result.data
  }));
}
```

### Architectural Patterns

Tsyne supports standard UI architectural patterns:

| Pattern | Best For | Example |
|---------|----------|---------|
| **MVC** | Traditional desktop apps, Swing-like architecture | [mvc-counter.ts](examples/mvc-counter.ts) |
| **MVVM** | Data-heavy apps with automatic UI sync | [mvvm-todo.ts](examples/mvvm-todo.ts) |
| **MVP** | Maximum testability, swappable views | [mvp-login.ts](examples/mvp-login.ts) |
| **Data Binding** | Form inputs, real-time sync | [data-binding.ts](examples/data-binding.ts) |

#### MVC Example

```typescript
// Model - Business logic
class CounterModel extends Model {
  private count = 0;
  increment() { this.count++; this.notifyChanged(); }
  getCount() { return this.count; }
}

// View - UI presentation
class CounterView {
  createUI(onIncrement: () => void) {
    vbox(() => {
      this.label = label('Count: 0');
      button('Increment', onIncrement);
    });
  }
}

// Controller - Connects Model and View
class CounterController {
  constructor(private model: CounterModel, private view: CounterView) {
    this.model.subscribe(() => this.updateView());
  }
  handleIncrement() { this.model.increment(); }
}
```

#### MVVM Example

```typescript
// ViewModel with observable properties
class TodoViewModel extends ViewModel {
  todos = new ObservableState<TodoItem[]>([]);
  newTodoText = new ObservableState('');

  addTodo() {
    this.model.addTodo(this.newTodoText.get());
    this.newTodoText.set('');
    this.updateFromModel();
  }
}

// View binds to ViewModel
class TodoView {
  constructor(private viewModel: TodoViewModel) {
    // Automatic UI updates when state changes
    this.viewModel.todos.subscribe(() => this.updateUI());
  }
}
```

**See [docs/PATTERNS.md](docs/PATTERNS.md) for complete documentation on all architectural patterns, data binding, and state management.**

### State Management Examples

Check out these comprehensive examples:

- **[data-binding.ts](examples/data-binding.ts)** - Two-way data binding with observable state
- **[mvc-counter.ts](examples/mvc-counter.ts)** - Classic MVC pattern (like Swing)
- **[mvvm-todo.ts](examples/mvvm-todo.ts)** - MVVM pattern with data binding
- **[mvp-login.ts](examples/mvp-login.ts)** - MVP pattern with passive views
- **[dialog-state.ts](examples/dialog-state.ts)** - Dialog state passing pattern

Run the examples:

```bash
npm run build
node examples/data-binding.js
node examples/mvc-counter.js
node examples/mvvm-todo.js
```

## Architecture

Tsyne uses a unique architecture to bridge TypeScript and Go:

```
┌─────────────────────┐
│   Your TypeScript   │
│   Application       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Tsyne Client       │
│   (TypeScript)      │
└──────────┬──────────┘
           │ JSON-RPC via stdio
           ▼
┌─────────────────────┐
│   Tsyne Bridge       │
│   (Go + Fyne)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Native UI         │
│   (macOS/Win/Linux) │
└─────────────────────┘
```

1. **Tsyne Client** (TypeScript): Provides the pseudo-declarative API and spawns the bridge process
2. **Tsyne Bridge** (Go): Manages Fyne widgets and communicates via JSON messages over stdio
3. **Message Protocol**: Bidirectional JSON-RPC for commands and events

## Examples

### Basic Examples

Check out the `examples/` directory:

**Getting Started:**
- `hello.ts` - Simple Hello World
- `counter.ts` - Counter with increment/decrement
- `calculator.ts` - Calculator with number pad
- `form.ts` - Form with text inputs

**Widget Examples:**
- `input-widgets.ts` - MultiLineEntry, PasswordEntry, Separator, and Hyperlink widgets
- `advanced-widgets.ts` - Card, Accordion, Form, and Center layout
- `specialized-widgets.ts` - Tree, RichText, Image, Border, and GridWrap
- `checkbox.ts` - Checkbox with state tracking and callbacks
- `select.ts` - Dropdown select with multiple options
- `slider.ts` - Slider controls for volume, brightness, etc.
- `radiogroup.ts` - Radio button groups for mutually exclusive choices
- `progressbar.ts` - Progress indicators for downloads and loading
- `scroll.ts` - Scrollable container for long content
- `grid.ts` - Grid layout calculator example
- `split.ts` - Resizable horizontal and vertical split containers
- `tabs.ts` - Tabbed interface for organizing content
- `table.ts` - Data tables with headers and sortable rows
- `list.ts` - Scrollable lists with selection callbacks

**Dialog Examples:**
- `dialogs-info.ts` - Information and error dialogs
- `dialogs-confirm.ts` - Confirmation dialogs for critical actions
- `dialogs-file.ts` - File open and save dialogs

**Advanced UI Examples:**
- `window-sizing.ts` - Window sizing, positioning, and fullscreen
- `menu-bar.ts` - Application menu bars with File/Edit/Help menus
- `toolbar.ts` - Toolbars with actions, separators, and spacers
- `theme.ts` - Light and dark theme switching with widget showcase

**Pattern Examples:**
- `data-binding.ts` - Two-way data binding with observable state
- `mvc-counter.ts` - Classic MVC pattern (like Swing)
- `mvvm-todo.ts` - MVVM pattern with data binding
- `mvp-login.ts` - MVP pattern with passive views
- `dialog-state.ts` - Dialog state passing pattern

**Styling Examples:**
- `form-unstyled.ts` - Registration form without custom styling
- `form-styled.ts` - Same form with Swiby-like stylesheet applied
- `form-styles.ts` - Stylesheet module defining visual styles

**Browser Examples:**
- `run-browser.ts` - Example of creating a browser programmatically
- `server.js` - Sample Node.js HTTP server serving multiple Tsyne TypeScript pages
- `web-features.test.js` - Comprehensive browser testing examples
- `widget-interactions.test.js` - Widget interaction testing examples

Run an example:

```bash
npm run build
node examples/calculator.js
node examples/input-widgets.js
node examples/advanced-widgets.js
node examples/specialized-widgets.js
node examples/checkbox.js
node examples/select.js
node examples/slider.js
node examples/radiogroup.js
node examples/progressbar.js
node examples/scroll.js
node examples/grid.js
node examples/split.js
node examples/tabs.js
node examples/dialogs-info.js
node examples/dialogs-confirm.js
node examples/dialogs-file.js
node examples/window-sizing.js
node examples/menu-bar.js
node examples/toolbar.js
node examples/theme.js
node examples/table.js
node examples/list.js
node examples/form-unstyled.js
node examples/form-styled.js
```

### Test Applications - Two Architectural Patterns

We provide **two calculator implementations** demonstrating different approaches:

#### 1. Simple Calculator - Monolithic Pattern

**Best for:** Learning, prototypes, demos < 200 lines

```
test-apps/calculator-simple/
├── calculator.ts (150 lines - all in one file)
├── calculator.test.ts (TsyneTest only)
└── README.md
```

**Features:**
- All code in one place
- Simple and straightforward
- Quick to prototype
- TsyneTest integration tests only

**Trade-offs:**
- Cannot unit test logic separately
- Slower test feedback (~3s)
- Hard to maintain at scale

```bash
npm run run:calculator-simple
npm run test:calculator-simple
```

#### 2. Advanced Calculator - Decomposed Pattern

**Best for:** Production apps, teams, complex logic, TDD

```
test-apps/calculator-advanced/
├── calculator-logic.ts (Pure business logic)
├── calculator-logic.test.ts (34 Jest unit tests)
├── calculator-ui.ts (UI presentation)
├── calculator.test.ts (11 TsyneTest integration tests)
└── README.md + TESTING-STRATEGY.md
```

**Features:**
- Separated business logic and UI
- Fast Jest unit tests (~100ms for 34 tests)
- TDD-friendly development
- Reusable logic (CLI, web, API)
- Comprehensive test coverage (45 tests total)

**Trade-offs:**
- More files and boilerplate
- Higher learning curve

```bash
npm run run:calculator          # Run the app
npm run test:calculator         # Integration tests
npm run test:calculator:logic   # Unit tests (fast!)
npm test                        # All tests
```

**See [test-apps/README.md](test-apps/README.md) for detailed comparison and decision guide.**

## Architecture Patterns

### Monolithic (Simple) vs Decomposed (Advanced)

Tsyne supports two architectural patterns for building applications:

| Pattern | When to Use | Testing Approach |
|---------|-------------|------------------|
| **Monolithic** | Demos, prototypes, < 200 lines | TsyneTest integration tests only |
| **Decomposed** | Production, teams, complex logic | Jest unit tests + TsyneTest integration |

**Monolithic Example:**
```typescript
// All in one file
let count = 0;
let display: any;

function increment() {
  count++;
  display.setText(`Count: ${count}`);  // UI coupled with logic
}

app(() => {
  display = label("Count: 0");
  button("+", increment);
});
```

**Decomposed Example:**
```typescript
// calculator-logic.ts (testable with Jest!)
export class CalculatorLogic {
  private count = 0;

  increment(): number {
    return ++this.count;
  }

  getDisplay(): string {
    return `Count: ${this.count}`;
  }
}

// calculator-ui.ts
import { CalculatorLogic } from './calculator-logic';

export class CalculatorUI {
  private logic = new CalculatorLogic();
  private display: any;

  build() {
    this.display = label(this.logic.getDisplay());
    button("+", () => {
      this.logic.increment();
      this.display.setText(this.logic.getDisplay());
    });
  }
}

// calculator-logic.test.ts (Jest - fast!)
test('increment', () => {
  const calc = new CalculatorLogic();
  expect(calc.increment()).toBe(1);
  expect(calc.getDisplay()).toBe("Count: 1");
});
```

**Benefits of Decomposed Pattern:**
- ✅ Fast unit tests (100ms vs 3s)
- ✅ TDD-friendly
- ✅ Reusable logic
- ✅ Easy to maintain

**See [test-apps/README.md](test-apps/README.md) for complete comparison and migration guide.**

## Design Philosophy

Tsyne follows these design principles:

1. **Pseudo-declarative where possible**: UI structure is defined using nested function calls
2. **Imperative when needed**: Full JavaScript for event handlers and state management
3. **Terse and elegant**: Minimal boilerplate, maximum expressiveness
4. **Type-safe**: Complete TypeScript definitions for IDE support
5. **Easy to use**: Simple npm install, straightforward API

Inspired by:
- [Ruby Shoes DSL](https://paulhammant.com/2024/02/14/that-ruby-and-groovy-language-feature)
- [QML with inline JavaScript](https://doc.qt.io/qt-6/qml-tutorial.html)
- [Pseudo-declarative Swing testing](https://github.com/paul-hammant/swing_component_testing)

## Building from Source

```bash
# Install dependencies
npm install

# Build the Go bridge
npm run build:bridge

# Build the TypeScript library
npm run build

# Run an example
node examples/hello.js
```

## Requirements

- **Node.js**: 16.0.0 or higher
- **Go**: 1.21 or higher (for building the bridge)
- **Platform-specific dependencies**:
  - macOS: Xcode command line tools
  - Linux: X11 development libraries
  - Windows: MinGW-w64 (for CGO)

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Documentation

### Getting Started
- **[docs/QUICKSTART.md](docs/QUICKSTART.md)** - Get started in 5 minutes
- **[README.md](README.md)** - You are here! Main documentation
- **[docs/PROS_AND_CONS.md](docs/PROS_AND_CONS.md)** - Tsyne vs Electron/Tauri comparison and decision guide
- **[docs/LLM.md](docs/LLM.md)** - Quick reference guide for LLMs

### State Management and Patterns
- **[docs/PATTERNS.md](docs/PATTERNS.md)** - Complete guide to architectural patterns (MVC, MVVM, MVP), state management, and data binding
- **[examples/data-binding.ts](examples/data-binding.ts)** - Observable state and computed state examples
- **[examples/mvc-counter.ts](examples/mvc-counter.ts)** - MVC pattern implementation
- **[examples/mvvm-todo.ts](examples/mvvm-todo.ts)** - MVVM pattern with ViewModels
- **[examples/mvp-login.ts](examples/mvp-login.ts)** - MVP pattern with passive views
- **[examples/dialog-state.ts](examples/dialog-state.ts)** - Dialog state passing pattern

### Testing
- **[docs/TESTING.md](docs/TESTING.md)** - Complete guide to TsyneTest testing framework (for apps/components)
- **[docs/BROWSER_TESTING.md](docs/BROWSER_TESTING.md)** - Complete guide to TsyneBrowserTest (for browser pages)
- **[docs/TESTING_CHECKLIST.md](docs/TESTING_CHECKLIST.md)** - Comprehensive testing checklist for browser features
- **[test-apps/README.md](test-apps/README.md)** - Two architectural patterns comparison
- **[test-apps/calculator-simple/README.md](test-apps/calculator-simple/README.md)** - Monolithic pattern
- **[test-apps/calculator-advanced/README.md](test-apps/calculator-advanced/README.md)** - Decomposed pattern
- **[test-apps/calculator-advanced/TESTING-STRATEGY.md](test-apps/calculator-advanced/TESTING-STRATEGY.md)** - Two-tier testing

### Development
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Internal design and architecture
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Guide for contributors
- **[docs/PUBLISHING.md](docs/PUBLISHING.md)** - Publishing to npm with bundled binaries
- **[docs/ROADMAP.md](docs/ROADMAP.md)** - Feature roadmap and TODO list

## Acknowledgments

- [Fyne](https://fyne.io/) - The fantastic Go UI toolkit that powers Tsyne
- Paul Hammant's [blog posts](https://paulhammant.com) on elegant DSL design
- The Ruby/Groovy communities for inspiring declarative UI patterns
- [Playwright](https://playwright.dev/) - Inspiration for TsyneTest's API design
