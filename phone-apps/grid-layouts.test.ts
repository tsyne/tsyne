/**
 * TsyneTest Integration Tests for TabletTop and PhoneTop
 *
 * Tests the grid-based layouts:
 * - TabletTop (4x4 grid with page navigation)
 * - PhoneTop (3x4 grid with swipe-style navigation)
 *
 * USAGE:
 * - Headless mode (default): npx jest grid-layouts.test.ts
 * - Visual debugging mode: TSYNE_HEADED=1 npx jest grid-layouts.test.ts
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import { buildTabletTop } from './tablet-top';
import { buildPhoneTop } from './phonetop';

describe('TabletTop Integration Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display tablet with page navigation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTabletTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Navigation buttons should exist
    await ctx.getByID('prevPage').shouldExist();
    await ctx.getByID('nextPage').shouldExist();
    await ctx.getByID('pageLabel').shouldExist();
  });

  test('should show page 1 of N initially', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTabletTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Page label should show page 1
    await ctx.getByID('pageLabel').shouldContain('Page 1');
  });

  test('should navigate to next page', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTabletTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click next page button
    await ctx.getByID('nextPage').click();
    await ctx.wait(100);

    // Should now show page 2
    await ctx.getByID('pageLabel').shouldContain('Page 2');
  });

  test('should navigate back to previous page', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTabletTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to page 2
    await ctx.getByID('nextPage').click();
    await ctx.wait(100);

    // Go back to page 1
    await ctx.getByID('prevPage').click();
    await ctx.wait(100);

    // Should show page 1
    await ctx.getByID('pageLabel').shouldContain('Page 1');
  });
});

describe('PhoneTop Integration Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display phone with swipe navigation', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Swipe buttons should exist (use within() to poll for initialization)
    await ctx.getByID('swipeLeft').within(3000).shouldExist();
    await ctx.getByID('swipeRight').within(3000).shouldExist();
  }, 15000);

  test('should show page dots indicator', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // First page dot should exist and be filled
    await ctx.getByID('page-dot-0').shouldExist();
  });

  test('should navigate via swipe right button', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Get initial dot state
    const initialDot = ctx.getByID('page-dot-0');
    await initialDot.shouldContain('●');  // Filled dot for current page

    // Swipe right (next page)
    await ctx.getByID('swipeRight').click();
    await ctx.wait(100);

    // First dot should now be empty
    await ctx.getByID('page-dot-0').shouldContain('○');
  });

  test('should navigate via swipe left button', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to page 2
    await ctx.getByID('swipeRight').click();
    await ctx.wait(100);

    // Go back to page 1
    await ctx.getByID('swipeLeft').click();
    await ctx.wait(100);

    // First dot should be filled again
    await ctx.getByID('page-dot-0').shouldContain('●');
  });

  test('should launch app as stack pane with home button', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Find and click the Calculator app icon
    await ctx.getByID('icon-Calculator').click();
    await ctx.wait(200);

    // App should be rendered as stack pane with "← Home" button
    await ctx.getByText('← Home').shouldExist();

    // Calculator content should be visible (the display)
    await ctx.getByID('calc-display').shouldExist();
  });

  test('should return to home when clicking home button', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Launch calculator
    await ctx.getByID('icon-Calculator').click();
    await ctx.wait(200);

    // Click home button
    await ctx.getByText('← Home').click();
    await ctx.wait(100);

    // Should be back at the home screen with page dots
    await ctx.getByID('page-dot-0').shouldExist();
    await ctx.getByID('swipeLeft').shouldExist();
  });

  test('should preserve app state when returning', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Launch calculator (use within() to wait for app icons to render)
    await ctx.getByID('icon-Calculator').within(3000).click();
    await ctx.wait(200);

    // Type a number
    await ctx.getByText('5').click();
    await ctx.wait(100);

    // Verify display shows 5 (use within() to poll for state)
    await ctx.getByID('calc-display').within(2000).shouldContain('5');

    // Go home
    await ctx.getByText('← Home').click();
    await ctx.wait(100);

    // Return to calculator
    await ctx.getByID('icon-Calculator').click();
    await ctx.wait(200);

    // State should be preserved - display should still show 5
    await ctx.getByID('calc-display').within(2000).shouldContain('5');
  }, 15000);

  test('should show quit button and close app when clicked', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Launch calculator
    await ctx.getByID('icon-Calculator').click();
    await ctx.wait(200);

    // Quit button should exist
    await ctx.getByText('✕ Quit').shouldExist();

    // Type a number
    await ctx.getByText('7').click();
    await ctx.wait(100);

    // Click quit
    await ctx.getByText('✕ Quit').click();
    await ctx.wait(100);

    // Should be back at home
    await ctx.getByID('page-dot-0').shouldExist();

    // Launch calculator again - should be fresh (not the same instance)
    await ctx.getByID('icon-Calculator').click();
    await ctx.wait(200);

    // Display should be 0 (fresh start, not 7)
    await ctx.getByID('calc-display').shouldContain('0');
  });

  test('should launch app with resources without error (Chess)', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Chess starts with "C" so it's on page 1 (apps sorted alphabetically)
    // Launch Chess app (uses @tsyne-app:args app,resources)
    await ctx.getByID('icon-Chess').click();

    // Wait for app to render with home button (no resource error thrown)
    await ctx.getByText('← Home').within(3000).shouldExist();

    // Go home
    await ctx.getByText('← Home').click();

    // Return to Chess - resource scope should be restored correctly
    await ctx.getByID('icon-Chess').within(500).click();

    // Should still have home button (didn't crash on resource lookup)
    await ctx.getByText('← Home').within(1000).shouldExist();
  }, 15000);  // Timeout for Chess app with icon rendering
});
