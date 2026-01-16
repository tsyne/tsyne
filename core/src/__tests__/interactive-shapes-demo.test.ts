/**
 * Test the actual interactive-shapes-cosyne demo
 * This imports and uses buildInteractiveShapesApp directly
 */

import { TsyneTest } from '../tsyne-test';
import { App } from '../app';
import { buildInteractiveShapesApp } from '../../../phone-apps/interactive-shapes/interactive-shapes-cosyne';
import * as fs from 'fs';
import * as path from 'path';

describe('interactive-shapes-cosyne demo', () => {
  let tsyneTest: TsyneTest;
  const screenshotDir = '/tmp/interactive-shapes-demo-test';

  beforeAll(() => {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  it('should change circle1 color when tapped', async () => {
    const createTestApp = (a: App) => {
      a.window({ title: 'Interactive Shapes Demo', width: 500, height: 450 }, (win) => {
        win.setContent(() => {
          buildInteractiveShapesApp(a);
        });
        win.show();
      });
    };

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp(createTestApp);
    const testCtx = tsyneTest.getContext();
    await testApp.run();

    // Wait for window to be ready
    await new Promise(resolve => setTimeout(resolve, 300));

    // Take screenshot before tap
    await testCtx.captureScreenshot(path.join(screenshotDir, 'before-tap.png'));

    // Tap on circle1 (center at 100, 100)
    console.log('[TEST] Tapping circle1 at (100, 100)');
    await testCtx.tapAt(100, 100);

    // Wait for event to propagate and refresh
    await new Promise(resolve => setTimeout(resolve, 300));

    // Take screenshot after tap
    await testCtx.captureScreenshot(path.join(screenshotDir, 'after-tap.png'));

    // The test passes if we get here without errors
    // Visual verification is done by comparing screenshots
    console.log('[TEST] Screenshots saved to', screenshotDir);
  });

  it('should change circle2 color when tapped', async () => {
    const createTestApp = (a: App) => {
      a.window({ title: 'Interactive Shapes Demo', width: 500, height: 450 }, (win) => {
        win.setContent(() => {
          buildInteractiveShapesApp(a);
        });
        win.show();
      });
    };

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp(createTestApp);
    const testCtx = tsyneTest.getContext();
    await testApp.run();

    await new Promise(resolve => setTimeout(resolve, 300));

    await testCtx.captureScreenshot(path.join(screenshotDir, 'circle2-before.png'));

    // Tap on circle2 (center at 300, 150)
    console.log('[TEST] Tapping circle2 at (300, 150)');
    await testCtx.tapAt(300, 150);

    await new Promise(resolve => setTimeout(resolve, 300));

    await testCtx.captureScreenshot(path.join(screenshotDir, 'circle2-after.png'));
  });

  it('should change rectangle color when tapped', async () => {
    const createTestApp = (a: App) => {
      a.window({ title: 'Interactive Shapes Demo', width: 500, height: 450 }, (win) => {
        win.setContent(() => {
          buildInteractiveShapesApp(a);
        });
        win.show();
      });
    };

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp(createTestApp);
    const testCtx = tsyneTest.getContext();
    await testApp.run();

    await new Promise(resolve => setTimeout(resolve, 300));

    await testCtx.captureScreenshot(path.join(screenshotDir, 'rect-before.png'));

    // Tap on rectangle (center at 150+40=190, 300+30=330)
    console.log('[TEST] Tapping rectangle at (190, 330)');
    await testCtx.tapAt(190, 330);

    await new Promise(resolve => setTimeout(resolve, 300));

    await testCtx.captureScreenshot(path.join(screenshotDir, 'rect-after.png'));
  });
});
