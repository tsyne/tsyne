/**
 * TsyneTest tests for Nomad App
 * Tests timezone UI interactions
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import { buildNomadApp } from './nomad';
import type { App } from '../core/src/app';
import type { Window } from '../core/src/window';

describe('Nomad Timezone Manager UI', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let testApp: any;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Nomad', width: 600, height: 800 }, (win: Window) => {
        buildNomadApp(app, win);
      });
    });
    ctx = tsyneTest.getContext();
    await testApp.run();
  }, 30000);

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  test('should render initial UI with title', async () => {
    // Verify title
    const title = await ctx.getByID('nomadTitle').getText();
    expect(title).toBe('Nomad - Time Zone Manager');
  }, 30000);

  test('should display add location section', async () => {
    // Verify add location label
    const addLabel = await ctx.getByID('nomadAddLabel').getText();
    expect(addLabel).toBe('Add Location');

    // Verify common location buttons exist
    await ctx.getByID('nomad-add-utc').within(500).shouldExist();
    await ctx.getByID('nomad-add-london').within(500).shouldExist();
    await ctx.getByID('nomad-add-tokyo').within(500).shouldExist();
  }, 30000);

  test('should display sorting and format buttons', async () => {
    // Verify sort button
    const sortBtn = await ctx.getByID('nomadSortBtn').getText();
    expect(sortBtn).toMatch(/Sort by/);

    // Verify format button
    const formatBtn = await ctx.getByID('nomadFormatBtn').getText();
    expect(formatBtn).toMatch(/Hour/);
  }, 30000);

  test('should display times section header', async () => {
    // Verify times label
    const timesLabel = await ctx.getByID('nomadTimesLabel').getText();
    expect(timesLabel).toBe('Current Times');
  }, 30000);

  test('should show placeholder when no locations added', async () => {
    // Verify placeholder text
    const placeholder = await ctx.getByID('nomadPlaceholder').getText();
    expect(placeholder).toBe('Add a location to see times');
  }, 30000);

  test('should have all required UI elements', async () => {
    // Check all main UI elements exist
    await ctx.getByID('nomadTitle').within(500).shouldExist();
    await ctx.getByID('nomadAddLabel').within(500).shouldExist();
    await ctx.getByID('nomadSortBtn').within(500).shouldExist();
    await ctx.getByID('nomadFormatBtn').within(500).shouldExist();
    await ctx.getByID('nomadTimesLabel').within(500).shouldExist();
    await ctx.getByID('nomadPlaceholder').within(500).shouldExist();
  }, 30000);
});
