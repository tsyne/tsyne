/**
 * Screenshot generation for waveform visualizer modes
 * Run with: TAKE_SCREENSHOTS=1 npm test -- examples/waveform-visualizer/screenshots.test.ts
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import * as path from 'path';
import * as fs from 'fs';
import { buildCanvasWaveformVisualizer } from './canvas';
import { buildWidgetWaveformVisualizer } from './widget';

describe('Waveform Visualizer - Screenshot Generation', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('capture canvas mode screenshot', async () => {
    if (process.env.TAKE_SCREENSHOTS !== '1') {
      console.log('⊘ Skipping screenshot (set TAKE_SCREENSHOTS=1)');
      return;
    }

    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for waveform to load
    await ctx
      .getByID('statusLabel')
      .within(2000)
      .shouldBe('Ready - tap waveform to seek');

    // Play to show scrubber movement
    await ctx.getByID('playBtn').click();
    await ctx
      .getByID('statusLabel')
      .within(500)
      .shouldBe('Playing... (tap waveform to seek)');

    // Wait for scrubber to advance
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Create screenshots directory if needed
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // Take screenshot
    const screenshotPath = path.join(screenshotDir, 'canvas-mode.png');
    await tsyneTest.screenshot(screenshotPath);
    console.log(`✓ Canvas mode screenshot: ${screenshotPath}`);

    // Verify file exists and has content
    const stats = fs.statSync(screenshotPath);
    expect(stats.size).toBeGreaterThan(1000); // Should be at least 1KB
  });

  test('capture widget mode screenshot', async () => {
    if (process.env.TAKE_SCREENSHOTS !== '1') {
      console.log('⊘ Skipping screenshot (set TAKE_SCREENSHOTS=1)');
      return;
    }

    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for waveform to load
    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready to play');

    // Play to show slice progression
    await ctx.getByID('playBtn').click();
    await ctx.getByID('statusLabel').within(500).shouldBe('Playing...');

    // Wait for playback to progress
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Create screenshots directory if needed
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // Take screenshot
    const screenshotPath = path.join(screenshotDir, 'widget-mode.png');
    await tsyneTest.screenshot(screenshotPath);
    console.log(`✓ Widget mode screenshot: ${screenshotPath}`);

    // Verify file exists and has content
    const stats = fs.statSync(screenshotPath);
    expect(stats.size).toBeGreaterThan(1000); // Should be at least 1KB
  });
});
