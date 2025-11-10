# Screenshot Testing in Tsyne

Tsyne supports automatic screenshot capture for debugging test failures in both `TsyneTest` and `TsyneBrowserTest`.

## Automatic Screenshot on Test Failure

When tests fail, screenshots are automatically captured and saved to the `test-failures/` directory with the test name and timestamp:

```
test-failures/should_display_calculator_2025-11-10T21-57-49-390Z.png
```

## Important: Headless vs Headed Mode

### Headless Mode (Default)
By default, tests run in **headless mode** for speed and CI/CD compatibility. However, **screenshots in headless mode will be blank/grey** because Fyne's test harness doesn't render actual pixels.

```typescript
// Headless mode (default) - screenshots will be blank
const test = new TsyneTest();
// Screenshot will be grey/blank
```

### Headed Mode (For Visual Screenshots)
To capture actual visual screenshots showing rendered UI, run tests in **headed mode**:

```typescript
// Headed mode - screenshots will show actual rendered content
const test = new TsyneTest({ headed: true });
// Screenshot will show real UI content!
```

## Usage Examples

### TsyneTest with Screenshots

```typescript
import { TsyneTest } from 'tsyne';

// For visual screenshots during development/debugging
const test = new TsyneTest({ headed: true });

await test.createApp((app) => {
  app.window({ title: 'My App' }, (win) => {
    app.label('Hello World');
  });
});

// Manual screenshot
await test.screenshot('./my-screenshot.png');

// Automatic on test failure
const ctx = test.getContext();
const label = await ctx.getByText('Nonexistent');
// Test fails → screenshot automatically saved
```

### TsyneBrowserTest with Screenshots

```typescript
import { TsyneBrowserTest } from 'tsyne';

// For visual browser screenshots
const test = new TsyneBrowserTest({ headed: true });

await test.createBrowser('/home');
// ... test navigation ...

// Manual screenshot
await test.screenshot('./browser-state.png');

// Automatic on failure
```

## When to Use Each Mode

### Headless Mode (Default)
- ✅ Fast execution
- ✅ CI/CD pipelines
- ✅ Automated test suites
- ❌ Screenshots are blank/grey

### Headed Mode
- ✅ Visual screenshots
- ✅ Debugging test failures
- ✅ Manual test runs
- ❌ Slower (renders actual windows)
- ❌ Requires display/X11

## CI/CD Recommendations

For CI/CD pipelines, you have two options:

### Option 1: Headless with Structure Dumps
Run tests in headless mode and use widget tree dumps for debugging instead of screenshots.

### Option 2: Headed with Virtual Display
Use Xvfb or similar virtual display to run tests in headed mode on CI:

```bash
# GitHub Actions example
- name: Run tests with screenshots
  run: |
    xvfb-run -a npm test
```

## Screenshot File Format

Screenshots are saved as PNG files with the following naming convention:
```
test-failures/{sanitized_test_name}_{ISO_timestamp}.png
```

Example:
```
test-failures/should_handle_navigation_correctly_2025-11-10T21-57-49-390Z.png
```

## Troubleshooting

### "Screenshot is blank/grey"
You're running in headless mode. Use `headed: true` for visual screenshots.

### "No windows available to screenshot"
Ensure you've created and shown at least one window before taking a screenshot.

### "Screenshot saved but I can't find it"
Screenshots are saved relative to the current working directory in `./test-failures/`.

## Examples

See `test-screenshot-headed.ts` for a complete working example of screenshot capture in headed mode.
