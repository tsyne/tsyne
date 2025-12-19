/**
 * TsyneTest tests for Pomodoro Timer App
 * Tests UI interactions and includes screenshot capture
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import { buildPomodoroApp } from './pomodoro';
import type { App } from '../core/src/app';

describe('Pomodoro Timer UI', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  test('should render initial UI', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      buildPomodoroApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify initial display
    const displayText = await ctx.getByID('pomodoroDisplay').getText();
    expect(displayText).toBe('25:00');

    const sessionText = await ctx.getByID('pomodoroSession').getText();
    expect(sessionText).toBe('Focus Session');

    const statusText = await ctx.getByID('pomodoroStatus').getText();
    expect(statusText).toContain('Paused');
    expect(statusText).toContain('0 sessions');
  });

  test('should toggle start/pause button', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      buildPomodoroApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial state
    let buttonText = await ctx.getByID('pomodoroStartBtn').getText();
    expect(buttonText).toBe('Start');

    // Click start
    await ctx.getByID('pomodoroStartBtn').click();

    // Button should change to Pause
    buttonText = await ctx.getByID('pomodoroStartBtn').within(500).shouldBe('Pause');
    expect(buttonText).toBe('Pause');
  });

  test('should reset timer', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      buildPomodoroApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click reset
    await ctx.getByID('pomodoroResetBtn').click();

    // Display should still show 25:00
    const displayText = await ctx.getByID('pomodoroDisplay').getText();
    expect(displayText).toBe('25:00');

    // Status should show paused
    const statusText = await ctx.getByID('pomodoroStatus').getText();
    expect(statusText).toContain('Paused');
  });

  test('should display settings inputs', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      buildPomodoroApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify settings inputs exist
    await ctx.getByID('pomodoroWorkInput').within(500).shouldExist();
    await ctx.getByID('pomodoroBreakInput').within(500).shouldExist();
    await ctx.getByID('pomodoroLongBreakInput').within(500).shouldExist();

    // Verify labels
    const workLabel = await ctx.getByID('pomodoroWorkLabel').getText();
    expect(workLabel).toBe('Work:');

    const breakLabel = await ctx.getByID('pomodoroBreakLabel').getText();
    expect(breakLabel).toBe('Break:');

    const longBreakLabel = await ctx.getByID('pomodoroLongBreakLabel').getText();
    expect(longBreakLabel).toBe('Long Break:');
  });

  test('should have skip button', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      buildPomodoroApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify skip button exists
    const skipButtonText = await ctx.getByID('pomodoroSkipBtn').getText();
    expect(skipButtonText).toBe('Skip');
  });

  test('should display session title', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      buildPomodoroApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify title
    const title = await ctx.getByID('pomodoroTitle').getText();
    expect(title).toBe('Pomodoro Timer');
  });

  test('should display settings title', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      buildPomodoroApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify settings title
    const settingsTitle = await ctx.getByID('pomodoroSettingsTitle').getText();
    expect(settingsTitle).toBe('Settings');
  });

  test('should take screenshot of initial state', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      buildPomodoroApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Take screenshot if TAKE_SCREENSHOTS env var is set
    if (process.env.TAKE_SCREENSHOTS) {
      const windows = await ctx.getWindows();
      if (windows && windows.length > 0) {
        const mainWindow = windows[0];
        if (mainWindow && mainWindow.screenshot) {
          await mainWindow.screenshot('phone-apps/screenshots/pomodoro-initial.png');
        }
      }
    }

    // Verify app is still running and display is correct
    const displayText = await ctx.getByID('pomodoroDisplay').getText();
    expect(displayText).toBe('25:00');
  });

  test('should verify all UI elements are present', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      buildPomodoroApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check all major UI elements exist
    await ctx.getByID('pomodoroTitle').within(500).shouldExist();
    await ctx.getByID('pomodoroSession').within(500).shouldExist();
    await ctx.getByID('pomodoroDisplay').within(500).shouldExist();
    await ctx.getByID('pomodoroStatus').within(500).shouldExist();
    await ctx.getByID('pomodoroStartBtn').within(500).shouldExist();
    await ctx.getByID('pomodoroResetBtn').within(500).shouldExist();
    await ctx.getByID('pomodoroSkipBtn').within(500).shouldExist();
    await ctx.getByID('pomodoroSettingsTitle').within(500).shouldExist();
    await ctx.getByID('pomodoroWorkLabel').within(500).shouldExist();
    await ctx.getByID('pomodoroBreakLabel').within(500).shouldExist();
    await ctx.getByID('pomodoroLongBreakLabel').within(500).shouldExist();
    await ctx.getByID('pomodoroWorkInput').within(500).shouldExist();
    await ctx.getByID('pomodoroBreakInput').within(500).shouldExist();
    await ctx.getByID('pomodoroLongBreakInput').within(500).shouldExist();
  });
});
