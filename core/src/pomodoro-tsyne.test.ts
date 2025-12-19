/**
 * TsyneTest tests for Pomodoro Timer App
 * Tests UI interactions and includes screenshot capture
 */

import { TsyneTest, TestContext } from './index-test';
import { buildPomodoroApp } from './pomodoro';
import type { App } from './app';

describe('Pomodoro Timer UI', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let testApp: any;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    testApp = await tsyneTest.createApp((app: App) => {
      buildPomodoroApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();
  }, 30000);

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  test('should render initial UI with correct display', async () => {
    // Verify initial display
    const displayText = await ctx.getByID('pomodoroDisplay').getText();
    expect(displayText).toBe('25:00');

    const sessionText = await ctx.getByID('pomodoroSession').getText();
    expect(sessionText).toBe('Focus Session');

    const statusText = await ctx.getByID('pomodoroStatus').getText();
    expect(statusText).toContain('Paused');
    expect(statusText).toContain('0 sessions');

    // Verify title
    const title = await ctx.getByID('pomodoroTitle').getText();
    expect(title).toBe('Pomodoro Timer');
  }, 30000);

  test('should have all control buttons', async () => {
    // Verify start/pause button
    const startButtonText = await ctx.getByID('pomodoroStartBtn').getText();
    expect(startButtonText).toBe('Start');

    // Verify reset button
    const resetButtonText = await ctx.getByID('pomodoroResetBtn').getText();
    expect(resetButtonText).toBe('Reset');

    // Verify skip button
    const skipButtonText = await ctx.getByID('pomodoroSkipBtn').getText();
    expect(skipButtonText).toBe('Skip');
  }, 30000);

  test('should display settings section', async () => {
    // Verify settings title
    const settingsTitle = await ctx.getByID('pomodoroSettingsTitle').getText();
    expect(settingsTitle).toBe('Settings');

    // Verify labels
    const workLabel = await ctx.getByID('pomodoroWorkLabel').getText();
    expect(workLabel).toBe('Work:');

    const breakLabel = await ctx.getByID('pomodoroBreakLabel').getText();
    expect(breakLabel).toBe('Break:');

    const longBreakLabel = await ctx.getByID('pomodoroLongBreakLabel').getText();
    expect(longBreakLabel).toBe('Long Break:');
  }, 30000);

  test('should have settings input fields', async () => {
    // Verify settings inputs exist
    await ctx.getByID('pomodoroWorkInput').within(500).shouldExist();
    await ctx.getByID('pomodoroBreakInput').within(500).shouldExist();
    await ctx.getByID('pomodoroLongBreakInput').within(500).shouldExist();

    // Verify units
    const workUnit = await ctx.getByID('pomodoroWorkUnit').getText();
    expect(workUnit).toBe('min');

    const breakUnit = await ctx.getByID('pomodoroBreakUnit').getText();
    expect(breakUnit).toBe('min');

    const longBreakUnit = await ctx.getByID('pomodoroLongBreakUnit').getText();
    expect(longBreakUnit).toBe('min');
  }, 30000);
});
