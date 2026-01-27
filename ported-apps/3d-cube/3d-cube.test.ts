/**
 * 3D Cube TsyneTest Integration Tests
 *
 * Tests the 3D Cube UI using the Tsyne testing framework.
 *
 * Usage:
 *   npm test ported-apps/3d-cube/3d-cube.test.ts
 *   TSYNE_HEADED=1 npm test ported-apps/3d-cube/3d-cube.test.ts  # Visual debugging
 *   TAKE_SCREENSHOTS=1 npm test ported-apps/3d-cube/3d-cube.test.ts  # Capture screenshots
 */

import { TsyneTest, TestContext } from 'tsyne';
import { create3DCubeApp, CubeUI } from './3d-cube';
import * as path from 'path';
import * as fs from 'fs';

describe('3D Cube Integration Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial game UI with all elements', async () => {
    let ui: CubeUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = create3DCubeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Verify control buttons
    await ctx.getById('resetBtn').within(500).shouldExist();
    await ctx.getById('shuffleBtn').within(500).shouldExist();
    await ctx.getById('solveBtn').within(500).shouldExist();

    // Verify status labels
    await ctx.getById('moveLabel').within(500).shouldExist();
    await ctx.getById('statusLabel').within(500).shouldExist();
  });

  test('should display rotation buttons', async () => {
    let ui: CubeUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = create3DCubeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Check rotation buttons
    await ctx.getById('rotateU').within(500).shouldExist();
    await ctx.getById('rotateF').within(500).shouldExist();
    await ctx.getById('rotateR').within(500).shouldExist();
  });

  test('should start with solved status', async () => {
    let ui: CubeUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = create3DCubeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Status should show solved
    await ctx.getById('statusLabel').within(100).shouldBe('Solved!');
    await ctx.getById('moveLabel').within(100).shouldBe('0');
  });

  test('should have working Shuffle button', async () => {
    let ui: CubeUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = create3DCubeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Click Shuffle
    await ctx.getById('shuffleBtn').click();
    await ctx.wait(200);

    // Status should show scrambled
    const status = await ctx.getById('statusLabel').getText();
    expect(status).toBe('Scrambled');
  });

  test('should have working Reset button', async () => {
    let ui: CubeUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = create3DCubeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Shuffle first
    await ctx.getById('shuffleBtn').click();
    await ctx.wait(200);

    // Then reset
    await ctx.getById('resetBtn').click();
    await ctx.wait(100);

    // Should be solved again
    await ctx.getById('statusLabel').within(100).shouldBe('Solved!');
  });

  test('should capture screenshot for documentation', async () => {
    let ui: CubeUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = create3DCubeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Shuffle for interesting view
    await ctx.getById('shuffleBtn').click();
    await ctx.wait(500);

    // Capture screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotsDir = path.join(__dirname, 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const screenshotPath = path.join(screenshotsDir, '3d-cube-scrambled.png');
      await tsyneTest.screenshot(screenshotPath);
      console.error(`Screenshot saved: ${screenshotPath}`);

      expect(fs.existsSync(screenshotPath)).toBe(true);
    }
  });
});
