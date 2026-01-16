/**
 * Test for icon-label grid reproduction
 *
 * Takes screenshots to diagnose the vertical detachment issue.
 * Run: TSYNE_HEADED=1 TAKE_SCREENSHOTS=1 npm test examples/icon-label-grid-repro.test.ts
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import { buildIconLabelGridRepro } from './icon-label-grid-repro';
import * as path from 'path';
import * as fs from 'fs';

describe('Icon Label Grid Reproduction', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  const screenshotDir = path.join(__dirname, 'screenshots');

  beforeAll(() => {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('original layout (with spacer at bottom)', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildIconLabelGridRepro(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for rendering
    await ctx.wait(500);

    // Verify we can see the labels
    await ctx.expect(ctx.getByText('Daily Checklist')).toBeVisible();
    await ctx.expect(ctx.getByText('Slydes')).toBeVisible();
    await ctx.expect(ctx.getByText('TodoMVC')).toBeVisible();

    // Take screenshot
    const screenshotPath = path.join(screenshotDir, 'icon-label-grid-original.png');
    await tsyneTest.screenshot(screenshotPath);
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
  });
});
