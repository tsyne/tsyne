/**
 * TsyneTest for Element App
 *
 * Integration tests for the Element Matrix client UI using TsyneTest framework.
 * Tests messaging, rooms, and user management.
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { buildElementApp } from './index';

describe('Element App UI Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  it('should render app with title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElementApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const title = await ctx.getById('user-label').getText();
    expect(title).toBeDefined();
  });

  it('should display stats', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElementApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const stats = await ctx.getById('stats-label').getText();
    expect(stats).toContain('Rooms');
  });

  it('should show rooms tab by default', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElementApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const title = await ctx.getById('rooms-title').getText();
    expect(title).toContain('Rooms');
  });

  it('should switch to direct messages tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElementApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const dmBtn = await ctx.getByPattern(/Direct Messages/);
    await dmBtn.click();

    const title = await ctx.getById('directs-title').within(1000).getText();
    expect(title).toContain('Direct Messages');
  });

  it('should switch to settings tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElementApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const settingsBtn = await ctx.getByPattern(/Settings/);
    await settingsBtn.click();

    const title = await ctx.getById('settings-title').within(1000).getText();
    expect(title).toContain('Settings');
  });

  it('should have user profile section', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElementApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const userName = await ctx.getById('user-name').getText();
    expect(userName).toBeDefined();
  });

  it('should maintain state when switching tabs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElementApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const initialStats = await ctx.getById('stats-label').getText();

    const dmBtn = await ctx.getByPattern(/Direct Messages/);
    await dmBtn.click();

    const settingsBtn = await ctx.getByPattern(/Settings/);
    await settingsBtn.click();

    const roomsBtn = await ctx.getByPattern(/Rooms/);
    await roomsBtn.click();

    const finalStats = await ctx.getById('stats-label').within(500).getText();
    expect(finalStats).toBe(initialStats);
  });

  it('should capture screenshot of rooms view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElementApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/element-rooms.png');
    }
  });

  it('should capture screenshot of direct messages view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElementApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const dmBtn = await ctx.getByPattern(/Direct Messages/);
    await dmBtn.click();
    await ctx.getById('directs-title').within(1000).shouldExist();

    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/element-directs.png');
    }
  });

  it('should capture screenshot of settings view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildElementApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const settingsBtn = await ctx.getByPattern(/Settings/);
    await settingsBtn.click();
    await ctx.getById('settings-title').within(1000).shouldExist();

    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/element-settings.png');
    }
  });
});
