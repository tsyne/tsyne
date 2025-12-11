/**
 * TsyneTest UI tests for Settings app
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import { createSettingsApp } from './settings';
import { MockSettingsService } from './services';

describe('Settings App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let settings: MockSettingsService;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    settings = new MockSettingsService();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display Settings title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSettingsApp(app, settings);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByText('Settings').within(500).shouldExist();
  });

  test('should display Network section', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSettingsApp(app, settings);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByText('Network').within(500).shouldExist();
    await ctx.getByText('Wi-Fi').within(500).shouldExist();
    await ctx.getByText('Bluetooth').within(500).shouldExist();
  });

  test('should have Wi-Fi toggle', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSettingsApp(app, settings);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('toggle-wifi').within(500).shouldExist();
  });

  test('should have Bluetooth toggle', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSettingsApp(app, settings);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('toggle-bluetooth').within(500).shouldExist();
  });

  test('should display Display section', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSettingsApp(app, settings);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByText('Display').within(500).shouldExist();
    await ctx.getByText('Theme').within(500).shouldExist();
    await ctx.getByText('Brightness').within(500).shouldExist();
  });

  test('should have theme selector', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSettingsApp(app, settings);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('select-theme').within(500).shouldExist();
  });

  test('should have brightness slider', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSettingsApp(app, settings);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('slider-brightness').within(500).shouldExist();
  });

  test('should display brightness value', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSettingsApp(app, settings);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Default brightness is 80%
    await ctx.getByID('brightness-value').within(500).shouldBe('80%');
  });

  test('should display Sound section', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSettingsApp(app, settings);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByText('Sound').within(500).shouldExist();
    await ctx.getByText('Volume').within(500).shouldExist();
  });

  test('should have volume slider', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSettingsApp(app, settings);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('slider-volume').within(500).shouldExist();
  });

  test('should display volume value', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSettingsApp(app, settings);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Default volume is 70%
    await ctx.getByID('volume-value').within(500).shouldBe('70%');
  });

  test('should display About section', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSettingsApp(app, settings);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByText('About').within(500).shouldExist();
    await ctx.getByText('Tsyne Phone v1.0').within(500).shouldExist();
  });
});
