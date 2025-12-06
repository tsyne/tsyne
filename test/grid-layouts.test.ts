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

import { TsyneTest, TestContext } from '../src/index-test';
import { buildTabletTop } from '../src/tablet-top';
import { buildPhoneTop } from '../src/phone-top';

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
    const testApp = await tsyneTest.createApp((app) => {
      buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Swipe buttons should exist
    await ctx.getByID('swipeLeft').shouldExist();
    await ctx.getByID('swipeRight').shouldExist();
  });

  test('should show page dots indicator', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // First page dot should exist and be filled
    await ctx.getByID('page-dot-0').shouldExist();
  });

  test('should navigate via swipe right button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildPhoneTop(app);
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
    const testApp = await tsyneTest.createApp((app) => {
      buildPhoneTop(app);
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
});
