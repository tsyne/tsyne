/**
 * TsyneTest UI tests for Alarms app
 */

import * as path from 'path';
import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createAlarmsApp } from './alarms';
import { MockClockService, MockNotificationService, DesktopAppLifecycle } from '../services';

describe('Alarms App', () => {
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

  test('should display add alarm button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createAlarmsApp(app, clock, notifications, lifecycle);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Add alarm button should exist
    await ctx.getByID('btn-add-alarm').within(500).shouldExist();
  });

  test('should display default alarms from MockClockService', async () => {
    // MockClockService adds default alarms: 07:00 "Wake up" and 08:30 "Meeting"
    const testApp = await tsyneTest.createApp((app) => {
      createAlarmsApp(app, clock, notifications, lifecycle);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify default alarms are displayed (sorted by time)
    await ctx.getByID('alarm-0-time').within(500).shouldBe('07:00');
    await ctx.getByID('alarm-0-label').within(500).shouldBe('Wake up');
    await ctx.getByID('alarm-1-time').within(500).shouldBe('08:30');
    await ctx.getByID('alarm-1-label').within(500).shouldBe('Meeting');
  });

  test('should have toggle and delete buttons for alarms', async () => {
    clock.addAlarm({ time: '07:00', label: 'Morning', enabled: true, days: [] });

    const testApp = await tsyneTest.createApp((app) => {
      createAlarmsApp(app, clock, notifications, lifecycle);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Toggle and delete buttons should exist
    await ctx.getByID('alarm-0-toggle').within(500).shouldExist();
    await ctx.getByID('alarm-0-delete').within(500).shouldExist();
  });

  test('should render alarms UI - screenshot', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createAlarmsApp(app, clock, notifications, lifecycle);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to be fully rendered with default alarms
    await ctx.getByID('btn-add-alarm').within(500).shouldExist();

    // Take screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'alarms.png');
      await tsyneTest.screenshot(screenshotPath);
      console.error(`Screenshot saved: ${screenshotPath}`);
    }
  });
});
