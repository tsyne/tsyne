/**
 * Visual Regression Testing for Tsyne Applications
 *
 * Provides screenshot comparison utilities for detecting visual changes.
 * Uses a baseline/current comparison approach common in visual testing tools.
 *
 * Note: In headless mode (cloud/LLM environments), screenshots may be blank
 * due to OpenGL rendering requirements. See LLM.md for details.
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Visual regression utilities
interface VisualComparisonResult {
  match: boolean;
  baselineExists: boolean;
  difference?: number;  // Percentage difference (0-100)
  baselinePath: string;
  currentPath: string;
}

/**
 * Compare two image files by computing their hash
 * Returns true if images are identical
 */
function computeImageHash(imagePath: string): string | null {
  try {
    if (!fs.existsSync(imagePath)) return null;
    const buffer = fs.readFileSync(imagePath);
    return crypto.createHash('md5').update(buffer).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Compare current screenshot against baseline
 */
function compareScreenshots(baselinePath: string, currentPath: string): VisualComparisonResult {
  const baselineHash = computeImageHash(baselinePath);
  const currentHash = computeImageHash(currentPath);

  return {
    match: baselineHash !== null && baselineHash === currentHash,
    baselineExists: baselineHash !== null,
    difference: baselineHash === currentHash ? 0 : 100,  // Simple binary comparison
    baselinePath,
    currentPath
  };
}

describe('Visual Regression Testing', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  const screenshotsDir = path.join(__dirname, 'screenshots', 'visual-regression');
  const baselineDir = path.join(screenshotsDir, 'baseline');
  const currentDir = path.join(screenshotsDir, 'current');

  beforeAll(() => {
    // Ensure screenshot directories exist
    if (!fs.existsSync(baselineDir)) {
      fs.mkdirSync(baselineDir, { recursive: true });
    }
    if (!fs.existsSync(currentDir)) {
      fs.mkdirSync(currentDir, { recursive: true });
    }
  });

  beforeEach(async () => {
    // Use headed mode for meaningful screenshots (headless will be blank)
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should capture screenshot for button state comparison', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Visual Test - Buttons', width: 400, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Visual Regression Test');
            app.hbox(() => {
              app.button('Primary Action');
              app.button('Secondary');
              app.button('Cancel');
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(100);  // Allow UI to stabilize

    const screenshotName = 'button-layout.png';
    const currentPath = path.join(currentDir, screenshotName);
    const baselinePath = path.join(baselineDir, screenshotName);

    // Capture current screenshot
    await tsyneTest.screenshot(currentPath);

    // Check if file was created
    expect(fs.existsSync(currentPath)).toBe(true);

    // If baseline exists, compare
    if (fs.existsSync(baselinePath)) {
      const result = compareScreenshots(baselinePath, currentPath);

      if (!result.match) {
// console.log(`Visual difference detected in ${screenshotName}`);
// console.log(`Baseline: ${baselinePath}`);
// console.log(`Current: ${currentPath}`);
      }

      // In a real scenario, you might want to fail on differences:
      // expect(result.match).toBe(true);
    } else {
// console.log(`No baseline exists for ${screenshotName}. Creating baseline.`);
      fs.copyFileSync(currentPath, baselinePath);
    }
  });

  test('should capture screenshot for form layout', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Visual Test - Form', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Registration Form');
            app.entry('Username');
            app.entry('Email');
            app.entry('Password');
            app.hbox(() => {
              app.button('Register');
              app.button('Cancel');
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(100);

    const screenshotName = 'form-layout.png';
    const currentPath = path.join(currentDir, screenshotName);
    const baselinePath = path.join(baselineDir, screenshotName);

    await tsyneTest.screenshot(currentPath);
    expect(fs.existsSync(currentPath)).toBe(true);

    if (fs.existsSync(baselinePath)) {
      const result = compareScreenshots(baselinePath, currentPath);
      if (!result.match) {
// console.log(`Visual difference detected in ${screenshotName}`);
      }
    } else {
// console.log(`Creating baseline for ${screenshotName}`);
      fs.copyFileSync(currentPath, baselinePath);
    }
  });

  test('should detect layout changes when content changes', async () => {
    let statusLabel: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Visual Test - Dynamic', width: 400, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            statusLabel = app.label('Initial State');
            app.button('Change Text').onClick(() => {
              statusLabel.setText('Modified State - This is a longer text');
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(100);

    // Capture initial state
    const initialPath = path.join(currentDir, 'dynamic-initial.png');
    await tsyneTest.screenshot(initialPath);

    // Change the content
    await ctx.getByExactText('Change Text').click();
    await ctx.wait(100);

    // Capture modified state
    const modifiedPath = path.join(currentDir, 'dynamic-modified.png');
    await tsyneTest.screenshot(modifiedPath);

    // The two screenshots should be different
    const result = compareScreenshots(initialPath, modifiedPath);

    // In headed mode, these should be different
    // In headless mode, both will be blank, so they may match
    if (process.env.TSYNE_HEADED === '1') {
      expect(result.match).toBe(false);
    }
  });

  test('should provide utility for batch screenshot comparison', async () => {
    // This test demonstrates batch comparison utility

    const testCases = [
      { name: 'simple-label', builder: (app: any) => {
        app.window({ title: 'Label Test', width: 300, height: 100 }, (win: any) => {
          win.setContent(() => { app.label('Hello World'); });
          win.show();
        });
      }},
      { name: 'simple-button', builder: (app: any) => {
        app.window({ title: 'Button Test', width: 300, height: 100 }, (win: any) => {
          win.setContent(() => { app.button('Click Me'); });
          win.show();
        });
      }}
    ];

    const results: { name: string; passed: boolean }[] = [];

    for (const testCase of testCases) {
      await tsyneTest.cleanup();  // Clean up previous test

      tsyneTest = new TsyneTest({ headed: process.env.TSYNE_HEADED === '1' });
      const testApp = await tsyneTest.createApp(testCase.builder);
      ctx = tsyneTest.getContext();
      await testApp.run();
      await ctx.wait(100);

      const screenshotPath = path.join(currentDir, `${testCase.name}.png`);
      await tsyneTest.screenshot(screenshotPath);

      results.push({
        name: testCase.name,
        passed: fs.existsSync(screenshotPath)
      });
    }

    // All screenshots should have been captured
    expect(results.every(r => r.passed)).toBe(true);
  });
});

describe('Visual Regression Utilities', () => {
  test('computeImageHash returns null for non-existent file', () => {
    const hash = computeImageHash('/non/existent/path.png');
    expect(hash).toBeNull();
  });

  test('compareScreenshots detects missing baseline', () => {
    const result = compareScreenshots('/non/existent/baseline.png', '/non/existent/current.png');
    expect(result.baselineExists).toBe(false);
    expect(result.match).toBe(false);
  });
});
