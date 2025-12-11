/**
 * TsyneTest UI tests for Stopwatch app
 */

import { TsyneTest, TestContext } from '../src/index-test';
import { createStopwatchApp } from './stopwatch';
import { MockClockService, MockNotificationService, DesktopAppLifecycle } from './services';

describe('Stopwatch App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let clock: MockClockService;
  let notifications: MockNotificationService;
  let lifecycle: DesktopAppLifecycle;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    clock = new MockClockService();
    notifications = new MockNotificationService();
    lifecycle = new DesktopAppLifecycle();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display stopwatch at 00:00.00 initially', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createStopwatchApp(app, clock, notifications, lifecycle);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('stopwatch-display').within(500).shouldBe('00:00.00');
  });

  test('should have control buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createStopwatchApp(app, clock, notifications, lifecycle);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('stopwatch-startstop').within(500).shouldExist();
    await ctx.getByID('stopwatch-lap').within(500).shouldExist();
    await ctx.getByID('stopwatch-reset').within(500).shouldExist();
  });

  test('should start with Start button label', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createStopwatchApp(app, clock, notifications, lifecycle);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('stopwatch-startstop').within(500).shouldBe('Start');
  });

  test('should change button to Stop when started', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createStopwatchApp(app, clock, notifications, lifecycle);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click start
    await ctx.getByID('stopwatch-startstop').click();
    await ctx.getByID('stopwatch-startstop').within(500).shouldBe('Stop');
  });

  test('should reset stopwatch to zero', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createStopwatchApp(app, clock, notifications, lifecycle);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start the stopwatch
    await ctx.getByID('stopwatch-startstop').click();

    // Wait a bit for time to accumulate
    await ctx.wait(100);

    // Stop it
    await ctx.getByID('stopwatch-startstop').click();

    // Reset
    await ctx.getByID('stopwatch-reset').click();
    await ctx.getByID('stopwatch-display').within(500).shouldBe('00:00.00');
  });
});
