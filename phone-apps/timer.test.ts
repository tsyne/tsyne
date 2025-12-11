/**
 * TsyneTest UI tests for Timer app
 */

import { TsyneTest, TestContext } from '../src/index-test';
import { createTimerApp } from './timer';
import { MockClockService, MockNotificationService, DesktopAppLifecycle } from './services';

describe('Timer App', () => {
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

  test('should display timer at 00:00:00 initially', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTimerApp(app, clock, notifications, lifecycle);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('timer-display').within(500).shouldBe('00:00:00');
  });

  test('should have quick add buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTimerApp(app, clock, notifications, lifecycle);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('timer-add-1').within(500).shouldExist();
    await ctx.getByID('timer-add-5').within(500).shouldExist();
    await ctx.getByID('timer-add-10').within(500).shouldExist();
  });

  test('should have control buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTimerApp(app, clock, notifications, lifecycle);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('timer-start').within(500).shouldExist();
    await ctx.getByID('timer-stop').within(500).shouldExist();
    await ctx.getByID('timer-reset').within(500).shouldExist();
  });

  test('should add time when quick add buttons clicked', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTimerApp(app, clock, notifications, lifecycle);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click +1m button
    await ctx.getByID('timer-add-1').click();
    await ctx.getByID('timer-display').within(500).shouldBe('00:01:00');

    // Click +5m button
    await ctx.getByID('timer-add-5').click();
    await ctx.getByID('timer-display').within(500).shouldBe('00:06:00');
  });

  test('should reset timer', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTimerApp(app, clock, notifications, lifecycle);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Add some time
    await ctx.getByID('timer-add-5').click();
    await ctx.getByID('timer-display').within(500).shouldBe('00:05:00');

    // Reset
    await ctx.getByID('timer-reset').click();
    await ctx.getByID('timer-display').within(500).shouldBe('00:00:00');
  });
});
