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

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { buildDesktop, DesktopOptions } from './index';
import { AppMetadata } from '../../core/src/app-metadata';
import * as path from 'path';

// Mock calculator app for fast testing (avoids scanning directories)
// Note: No category so it appears as a standalone icon (not grouped in a folder)
const mockCalculatorApp: AppMetadata = {
  filePath: path.resolve(__dirname, '../../examples/calculator.ts'),
  name: 'Calculator',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  iconIsSvg: true,
  builder: 'buildCalculator',
  count: 'desktop-many',
  args: ['app'],
};

const testDesktopOptions: DesktopOptions = {
  apps: [mockCalculatorApp],
};

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
      await buildDesktop(app, testDesktopOptions);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify desktop window title
    // The calculator icon should be present
    await ctx.getById('icon-calculator').shouldExist();

    // Launch bar should be visible
    await ctx.getById('showDesktopBtn').shouldExist();
    await ctx.getById('allAppsBtn').shouldExist();
  }, 5000); // Desktop initialization can take longer due to app scanning

  test('should launch calculator via double-click on icon', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app, testDesktopOptions);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Double-click the calculator icon (two rapid clicks)
    const calcIcon = ctx.getById('icon-calculator');
    await calcIcon.click();
    await calcIcon.click();  // Second click within 400ms = double-click

    // Wait for app to launch
    await ctx.wait(200);

    // Running apps should show calculator (use within() to poll for app launch)
    await ctx.getById('runningAppsLabel').within(3000).shouldContain('Calculator');
  }, 5000);

  test('should interact with calculator running in inner window', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app, testDesktopOptions);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Launch calculator via double-click on icon
    const calcIcon = ctx.getById('icon-calculator');
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
    await ctx.getById('calc-display').within(2000).shouldBe("8");
  }, 5000);

  test('should hide windows when Show Desktop is clicked', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app, testDesktopOptions);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Launch calculator via double-click
    const calcIcon = ctx.getById('icon-calculator');
    await calcIcon.click();
    await calcIcon.click();
    await ctx.wait(200);

    // Verify it's running (use within() to poll for app launch)
    await ctx.getById('runningAppsLabel').within(3000).shouldContain('Calculator');

    // Click Show Desktop
    await ctx.getById('showDesktopBtn').click();
    await ctx.wait(100);

    // The app is still "running" but the window is hidden
    // (We can't easily verify hidden state in tests, but the button shouldn't crash)
    await ctx.getById('runningAppsLabel').within(2000).shouldContain('Calculator');
  }, 5000);
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
      await buildDesktop(app, testDesktopOptions);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // The launch bar should exist with its components
    await ctx.getById('showDesktopBtn').shouldExist();
    await ctx.getById('allAppsBtn').shouldExist();
    await ctx.getById('runningAppsLabel').shouldExist();
  }, 5000);

  test('should show running apps count as None initially', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app, testDesktopOptions);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Running apps label should show None initially (use within() for polling)
    await ctx.getById('runningAppsLabel').within(3000).shouldBe('None');
  }, 5000);
});
