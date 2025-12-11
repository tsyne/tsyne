/**
 * TsyneTest UI tests for Clock app
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import { createClockApp } from './clock';
import { MockClockService, MockNotificationService, DesktopAppLifecycle } from './services';

describe('Clock App', () => {
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

  test('should display time on Clock tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createClockApp(app, clock, notifications, lifecycle);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Time display should exist
    await ctx.getByID('time-display').within(500).shouldExist();
  });

  test('should display date on Clock tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createClockApp(app, clock, notifications, lifecycle);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Date display should exist
    await ctx.getByID('date-display').within(500).shouldExist();
  });

  test('should display mocked time', async () => {
    // Set a fixed time: 3:00 PM on Jan 15, 2025
    clock.setTime(new Date(2025, 0, 15, 15, 0, 0));

    const testApp = await tsyneTest.createApp((app) => {
      createClockApp(app, clock, notifications, lifecycle);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify time display shows 3:00 PM (format may vary by locale)
    const timeDisplay = await ctx.getByID('time-display').within(500);
    await timeDisplay.shouldExist();
    const text = await timeDisplay.getText();
    // Should contain "3:00" or "15:00" depending on locale
    expect(text).toMatch(/3:00|15:00/);
  });
});
