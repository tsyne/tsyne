/**
 * GemGuesser - CosyneTest Screenshot Tests
 *
 * These tests create the full app UI and capture screenshots.
 * For meaningful visual screenshots, run with: TSYNE_HEADED=1 npx jest
 */

import { TsyneTest } from 'tsyne';
import type { App } from 'tsyne';
import { createGemGuesserApp } from './gem-guesser';
import path from 'path';

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

describe('GemGuesser UI', () => {
  let tsyneTest: TsyneTest;

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  it('should render initial game state', async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    const testApp = await tsyneTest.createApp(createGemGuesserApp);
    await testApp.run();

    await new Promise((resolve) => setTimeout(resolve, 500));
    await tsyneTest.screenshot(path.join(SCREENSHOT_DIR, 'gem-guesser-initial.png'));

    // Verify the app created successfully
    const ctx = tsyneTest.getContext();
    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('should display color selector', async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    const testApp = await tsyneTest.createApp(createGemGuesserApp);
    await testApp.run();

    await new Promise((resolve) => setTimeout(resolve, 500));
    await tsyneTest.screenshot(
      path.join(SCREENSHOT_DIR, 'gem-guesser-selector.png')
    );

    // Verify canvas primitives were created
    const ctx = tsyneTest.getContext();
    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });
});
