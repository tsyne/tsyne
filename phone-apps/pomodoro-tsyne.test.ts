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
    const displayText = await ctx.getById('pomodoroDisplay').getText();
    expect(displayText).toBe('25:00');

    const sessionText = await ctx.getById('pomodoroSession').getText();
    expect(sessionText).toBe('Focus Session');

    const statusText = await ctx.getById('pomodoroStatus').getText();
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
    let buttonText = await ctx.getById('pomodoroStartBtn').getText();
    expect(buttonText).toBe('Start');

    // Click start
    await ctx.getById('pomodoroStartBtn').click();

    // Button should change to Pause
    buttonText = await ctx.getById('pomodoroStartBtn').within(500).shouldBe('Pause');
    expect(buttonText).toBe('Pause');
  });

  test('should reset timer', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      buildPomodoroApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click reset
    await ctx.getById('pomodoroResetBtn').click();

    // Display should still show 25:00
    const displayText = await ctx.getById('pomodoroDisplay').getText();
    expect(displayText).toBe('25:00');

    // Status should show paused
    const statusText = await ctx.getById('pomodoroStatus').getText();
    expect(statusText).toContain('Paused');
  });

  test('should display settings inputs', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      buildPomodoroApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify settings inputs exist
    await ctx.getById('pomodoroWorkInput').within(500).shouldExist();
    await ctx.getById('pomodoroBreakInput').within(500).shouldExist();
    await ctx.getById('pomodoroLongBreakInput').within(500).shouldExist();

    // Verify labels
    const workLabel = await ctx.getById('pomodoroWorkLabel').getText();
    expect(workLabel).toBe('Work:');

    const breakLabel = await ctx.getById('pomodoroBreakLabel').getText();
    expect(breakLabel).toBe('Break:');

    const longBreakLabel = await ctx.getById('pomodoroLongBreakLabel').getText();
    expect(longBreakLabel).toBe('Long Break:');
  });

  test('should have skip button', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      buildPomodoroApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify skip button exists
    const skipButtonText = await ctx.getById('pomodoroSkipBtn').getText();
    expect(skipButtonText).toBe('Skip');
  });

  test('should display session title', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      buildPomodoroApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify title
    const title = await ctx.getById('pomodoroTitle').getText();
    expect(title).toBe('Pomodoro Timer');
  });

  test('should display settings title', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      buildPomodoroApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify settings title
    const settingsTitle = await ctx.getById('pomodoroSettingsTitle').getText();
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
    const displayText = await ctx.getById('pomodoroDisplay').getText();
    expect(displayText).toBe('25:00');
  });

  test('should verify all UI elements are present', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      buildPomodoroApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check all major UI elements exist
    await ctx.getById('pomodoroTitle').within(500).shouldExist();
    await ctx.getById('pomodoroSession').within(500).shouldExist();
    await ctx.getById('pomodoroDisplay').within(500).shouldExist();
    await ctx.getById('pomodoroStatus').within(500).shouldExist();
    await ctx.getById('pomodoroStartBtn').within(500).shouldExist();
    await ctx.getById('pomodoroResetBtn').within(500).shouldExist();
    await ctx.getById('pomodoroSkipBtn').within(500).shouldExist();
    await ctx.getById('pomodoroSettingsTitle').within(500).shouldExist();
    await ctx.getById('pomodoroWorkLabel').within(500).shouldExist();
    await ctx.getById('pomodoroBreakLabel').within(500).shouldExist();
    await ctx.getById('pomodoroLongBreakLabel').within(500).shouldExist();
    await ctx.getById('pomodoroWorkInput').within(500).shouldExist();
    await ctx.getById('pomodoroBreakInput').within(500).shouldExist();
    await ctx.getById('pomodoroLongBreakInput').within(500).shouldExist();
  });
});
