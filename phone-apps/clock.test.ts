/**
 * TsyneTest UI tests for Clock app
 */

import { TsyneTest, TestContext } from '../src/index-test';
import { createClockApp } from './clock';
import { MockClockService, MockNotificationService } from './services';

describe('Clock App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let clock: MockClockService;
  let notifications: MockNotificationService;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    clock = new MockClockService();
    notifications = new MockNotificationService();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display time on Clock tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createClockApp(app, clock, notifications);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Time display should exist
    await ctx.getByID('time-display').within(500).shouldExist();
  });

  test('should display date on Clock tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createClockApp(app, clock, notifications);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Date display should exist
    await ctx.getByID('date-display').within(500).shouldExist();
  });

  test('should have all four tabs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createClockApp(app, clock, notifications);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Tab labels should exist
    await ctx.getByText('Clock').within(500).shouldExist();
    await ctx.getByText('Alarms').within(500).shouldExist();
    await ctx.getByText('Timer').within(500).shouldExist();
    await ctx.getByText('Stopwatch').within(500).shouldExist();
  });
});
