/**
 * TsyneTest tests for Nomad App
 * Tests timezone UI interactions with city cards
 */

import { TsyneTest, TestContext } from 'tsyne';
import { buildNomadApp } from './nomad';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';

describe('Nomad Timezone Manager UI', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let testApp: any;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Nomad', width: 340, height: 600 }, (win: Window) => {
        buildNomadApp(app, win);
      });
    });
    ctx = tsyneTest.getContext();
    await testApp.run();
  }, 30000);

  afterAll(async () => {
    await tsyneTest.cleanup();
  }, 10000);

  test('should render initial UI with Edinburgh card (default city)', async () => {
    // The app starts with Edinburgh as the default city
    await ctx.getById('nomad-city-edinburgh').within(1000).shouldExist();
    const cityName = await ctx.getById('nomad-city-edinburgh').getText();
    expect(cityName).toBe('EDINBURGH');
  }, 30000);

  test('should display timezone info for Edinburgh', async () => {
    const tzInfo = await ctx.getById('nomad-tz-edinburgh').getText();
    // Should show "UNITED KINGDOM · GMT" or "UNITED KINGDOM · BST" depending on DST
    expect(tzInfo).toMatch(/UNITED KINGDOM/);
  }, 30000);

  test('should have date picker button', async () => {
    await ctx.getById('nomad-date-edinburgh').within(500).shouldExist();
    const dateBtn = await ctx.getById('nomad-date-edinburgh').getText();
    // Should show formatted date like "Mon 15 Jul 2024 ▾"
    expect(dateBtn).toMatch(/\d{2}/); // Contains a date number
  }, 30000);

  test('should have time picker dropdown', async () => {
    await ctx.getById('nomad-time-edinburgh').within(500).shouldExist();
  }, 30000);

  test('should have menu button for removing city', async () => {
    await ctx.getById('nomad-menu-edinburgh').within(500).shouldExist();
    const menuBtn = await ctx.getById('nomad-menu-edinburgh').getText();
    expect(menuBtn).toBe('…');
  }, 30000);

  test('should have add icon', async () => {
    await ctx.getById('nomad-add-icon').within(500).shouldExist();
    const addIcon = await ctx.getById('nomad-add-icon').getText();
    expect(addIcon).toBe('+');
  }, 30000);
});
