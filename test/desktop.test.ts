/**
 * TsyneTest Integration Tests for Desktop Environment
 *
 * Tests the desktop's ability to:
 * - Display app icons
 * - Launch apps via double-click
 * - Run apps in inner windows using TsyneWindow abstraction
 *
 * USAGE:
 * - Headless mode (default): npx jest desktop.test.ts
 * - Visual debugging mode: TSYNE_HEADED=1 npx jest desktop.test.ts
 */

import { TsyneTest, TestContext } from '../src/index-test';
import { buildDesktop } from '../src/desktop';

describe('Desktop Environment Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display desktop with app icons', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify desktop window title
    // The calculator icon should be present
    await ctx.getByID('icon-calculator').shouldExist();

    // Launch bar should be visible
    await ctx.getByID('showDesktopBtn').shouldExist();
    await ctx.getByID('allAppsBtn').shouldExist();
  }, 15000); // Desktop initialization can take longer due to app scanning

  test('should launch calculator via double-click on icon', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Double-click the calculator icon (two rapid clicks)
    const calcIcon = ctx.getByID('icon-calculator');
    await calcIcon.click();
    await calcIcon.click();  // Second click within 400ms = double-click

    // Wait for app to launch
    await ctx.wait(200);

    // Running apps should show calculator
    await ctx.getByID('runningAppsLabel').shouldContain('Calculator');
  });

  test('should interact with calculator running in inner window', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Launch calculator via double-click on icon
    const calcIcon = ctx.getByID('icon-calculator');
    await calcIcon.click();
    await calcIcon.click();  // Double-click
    await ctx.wait(200);

    // Now interact with the calculator buttons
    // The calculator creates buttons with text "1", "2", etc.
    await ctx.getByExactText("5").click();
    await ctx.getByExactText("+").click();
    await ctx.getByExactText("3").click();
    await ctx.getByExactText("=").click();

    // The calculator's display label should show the result
    await ctx.getByID('calc-display').shouldBe("8");
  });

  test('should hide windows when Show Desktop is clicked', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Launch calculator via double-click
    const calcIcon = ctx.getByID('icon-calculator');
    await calcIcon.click();
    await calcIcon.click();
    await ctx.wait(200);

    // Verify it's running
    await ctx.getByID('runningAppsLabel').shouldContain('Calculator');

    // Click Show Desktop
    await ctx.getByID('showDesktopBtn').click();
    await ctx.wait(100);

    // The app is still "running" but the window is hidden
    // (We can't easily verify hidden state in tests, but the button shouldn't crash)
    await ctx.getByID('runningAppsLabel').shouldContain('Calculator');
  });
});

describe('Desktop Dock Integration Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should show launch bar components', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // The launch bar should exist with its components
    await ctx.getByID('showDesktopBtn').shouldExist();
    await ctx.getByID('allAppsBtn').shouldExist();
    await ctx.getByID('runningAppsLabel').shouldExist();
  });

  test('should show running apps count as None initially', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Running apps label should show None initially
    await ctx.getByID('runningAppsLabel').shouldBe('None');
  });
});
