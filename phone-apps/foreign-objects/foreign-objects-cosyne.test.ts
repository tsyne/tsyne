/**
 * Foreign Objects Demo - TsyneTest
 *
 * Tests and validates embedding Tsyne widgets in Cosyne canvas
 */

import { TsyneTest } from '../../core/src/index-test';
import { buildForeignObjectsApp } from './foreign-objects-cosyne';

describe('Foreign Objects Demo (Phase 5)', () => {
  let tsyneTest: TsyneTest;

  beforeAll(() => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterAll(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  it('should render canvas with embedded Tsyne widgets', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildForeignObjectsApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify control buttons exist
    const btnRed = await ctx.getById('btn-red');
    const btnBlue = await ctx.getById('btn-blue');
    const btnGreen = await ctx.getById('btn-green');

    expect(btnRed).toBeDefined();
    expect(btnBlue).toBeDefined();
    expect(btnGreen).toBeDefined();

    // Take screenshot of initial state
    await testApp.screenshot('foreign-objects-initial');

    await testApp.close();
  });

  it('should update canvas when buttons are clicked', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildForeignObjectsApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Click red button
    await ctx.getById('btn-red').click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await testApp.screenshot('foreign-objects-red');

    // Click blue button
    await ctx.getById('btn-blue').click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await testApp.screenshot('foreign-objects-blue');

    // Click animate button
    await ctx.getById('btn-animate').click();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await testApp.screenshot('foreign-objects-animating');

    await testApp.close();
  });

  it('should handle text input', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildForeignObjectsApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Type in text input
    const input = await ctx.getById('msg-input');
    await input.setText('Hello from Tsyne!');
    await new Promise((resolve) => setTimeout(resolve, 100));
    await testApp.screenshot('foreign-objects-text');

    await testApp.close();
  });

  it('should update circle position with movement buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildForeignObjectsApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Move up multiple times
    await ctx.getById('btn-up').click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await ctx.getById('btn-up').click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await testApp.screenshot('foreign-objects-moved-up');

    // Move down
    await ctx.getById('btn-down').click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await testApp.screenshot('foreign-objects-moved-down');

    // Reset
    await ctx.getById('btn-reset').click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await testApp.screenshot('foreign-objects-reset');

    await testApp.close();
  });
});
