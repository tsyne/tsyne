# Screenshot Testing in Tsyne

Tsyne supports automatic screenshot capture for debugging test failures in `TsyneTest`, `TsyneBrowserTest`, and `CosyneTest`.

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

### CosyneTest with Screenshots (Canvas Apps)

For Cosyne canvas applications, use `CosyneTest` which extends `TsyneTest` with the same screenshot API:

```typescript
import { CosyneTest } from 'cosyne';

// For visual canvas screenshots
const test = new CosyneTest({ headed: true });

await test.createApp((app) => {
  // ... build cosyne canvas app ...
});

// Manual screenshot
await test.screenshot('./canvas-state.png');

// Automatic on test failure
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

### "Screenshot is blank even with Xvfb and headed mode"

**This is a known limitation of Fyne's OpenGL rendering.**

Fyne uses OpenGL for rendering, which requires GPU acceleration. Virtual framebuffers like Xvfb provide a software-based X11 display but don't properly support OpenGL rendering. As a result:

- **Tests will pass** - The test logic executes correctly
- **Screenshot files are created** - The capture mechanism works
- **Screenshot content is blank** - OpenGL doesn't render to the software framebuffer

**Evidence:** A properly rendered screenshot is ~7KB with visible UI content. An Xvfb-captured screenshot is ~600 bytes and appears white/blank.

**Solutions:**

1. **Use a real display** - Run tests on a machine with a physical display or GPU:
   ```bash
   TSYNE_HEADED=1 TAKE_SCREENSHOTS=1 npm run test:screenshots
   ```

2. **Use existing screenshots** - The repository contains pre-captured screenshots in `examples/screenshots/` that were taken on a real display. These can be used for documentation.

3. **For LLM/cloud environments** - Tests can verify functionality without visual screenshots. The test assertions validate behavior; screenshots are supplementary.

4. **GPU-accelerated CI** - Some CI providers offer GPU runners (GitHub Actions larger runners, GitLab GPU runners) that can render OpenGL properly.

**Note for LLM assistants:** When working in containerized/cloud environments (Claude Code, Codespaces, etc.), expect blank screenshots even with proper Xvfb setup. This is not a bug - it's a rendering limitation.

### "No windows available to screenshot"
Ensure you've created and shown at least one window before taking a screenshot.

### "Screenshot saved but I can't find it"
Screenshots are saved relative to the current working directory in `./test-failures/`.

## For LLM Assistants: Debugging Visual Issues

When debugging visual problems (e.g., "rectangles are black instead of colored", "elements not appearing"), **use TsyneTest/CosyneTest with screenshots** rather than guessing or asking the user repeatedly.

### Step-by-step approach:

1. **Create a minimal reproduction test** that isolates the issue:
   ```typescript
   import { TsyneTest } from 'tsyne';

   const test = new TsyneTest({ headed: true });
   await test.createApp((app) => {
     // Minimal code to reproduce the issue
   });
   await test.screenshot('/tmp/debug-1-initial.png');
   ```

2. **Use step-by-step screenshots** to narrow down where rendering breaks:
   ```typescript
   // Step 1: Just the background
   await test.screenshot('/tmp/step1-background.png');

   // Step 2: Add first element
   await test.screenshot('/tmp/step2-first-element.png');

   // Step 3: Add the problematic element
   await test.screenshot('/tmp/step3-problem.png');
   ```

3. **Read the screenshots** using the Read tool to see what's actually rendered.

4. **For interactive debugging**, simulate user actions:
   ```typescript
   const ctx = test.getContext();
   await ctx.getById('showBtn').click();
   await test.screenshot('/tmp/after-click.png');
   ```

### Key points:
- **Don't use xdotool** - use TsyneTest's built-in interaction methods
- **Take screenshots at each step** - don't assume what's rendering
- **The user's display works** - if they say something looks wrong, believe them and investigate with screenshots
- **Create isolation tests** - strip away complexity to find the root cause
- **Prefer `.within()` over `ctx.wait()`** - instead of `await ctx.wait(500)`, use `await ctx.getById('x').within(500).shouldBe('value')` which polls intelligently and doesn't lengthen tests long term, more than is needed

## Examples

See `test-screenshot-headed.ts` for a complete working example of screenshot capture in headed mode.
