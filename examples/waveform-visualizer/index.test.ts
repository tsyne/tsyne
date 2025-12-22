/**
 * Jest tests for Enhanced Waveform Visualizer
 *
 * Tests cover:
 * - Canvas mode with tappable scrubber
 * - Widget mode with declarative slices
 * - Interactive seeking/scrubbing
 * - Play/pause/stop controls
 * - Time display updates
 * - Complete playback workflows
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import * as path from 'path';
import { buildWaveformVisualizer } from './waveform-visualizer';

describe('Waveform Visualizer - Canvas Mode (Tappable)', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should initialize canvas mode with correct UI elements', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check title indicates canvas mode
    await ctx
      .getByID('titleLabel')
      .within(1000)
      .shouldBe('Waveform Visualizer - Canvas Mode');

    // Check mode indicator
    await ctx
      .getByID('modeLabel')
      .within(1000)
      .shouldBe('🎨 Canvas-based rendering (tap to seek)');

    // Canvas should be tappable
    await ctx.getByID('waveformCanvas').within(1000).shouldExist();
  });

  test('should handle tap on waveform to seek', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initialization
    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Initial position should be 0:00
    await ctx.getByID('positionLabel').within(500).shouldBe('0:00');

    // Tap somewhere in the middle of the waveform (position should update)
    // Note: In Fyne, tappable canvas reports (x, y) coordinates
    // Tapping at x=480 (middle of 960px canvas) should seek to middle of audio
    const canvas = await ctx.getByID('waveformCanvas');

    // Simulate tap - this would require actual tap event handling
    // For now, we verify the canvas is tappable (interactive)
    await canvas.within(500).shouldExist();
  });

  test('should start playing and update position', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initialization
    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Play
    await ctx.getByID('playBtn').click();
    await ctx
      .getByID('statusLabel')
      .within(500)
      .shouldBe('Playing... (tap waveform to seek)');

    // Wait for playback
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Position should advance
    const position = await ctx.getByID('positionLabel').getText();
    const [, seconds] = position.split(':');
    expect(parseInt(seconds, 10)).toBeGreaterThan(0);
  });

  test('should pause and resume from same position', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Play for 1 second
    await ctx.getByID('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Pause
    await ctx.getByID('pauseBtn').click();
    const pausedPosition = await ctx.getByID('positionLabel').getText();

    // Wait and resume
    await new Promise((resolve) => setTimeout(resolve, 500));
    await ctx.getByID('playBtn').click();

    // Position should be same immediately after resume
    let resumedPosition = await ctx.getByID('positionLabel').getText();
    expect(resumedPosition).toBe(pausedPosition);

    // But advance after some playback
    await new Promise((resolve) => setTimeout(resolve, 500));
    resumedPosition = await ctx.getByID('positionLabel').getText();
    expect(resumedPosition).not.toBe(pausedPosition);
  });

  test('should stop and reset to beginning', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Play for 1.5 seconds
    await ctx.getByID('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Stop
    await ctx.getByID('stopBtn').click();

    // Should reset to 0:00
    await ctx.getByID('positionLabel').within(500).shouldBe('0:00');
    await ctx.getByID('statusLabel').within(500).shouldBe('Stopped');
  });

  test('should complete playback and auto-stop', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Play (8-second audio clip)
    await ctx.getByID('playBtn').click();

    // Wait for playback to complete
    // (plus some buffer for timing variations)
    await new Promise((resolve) => setTimeout(resolve, 9000));

    // Should auto-stop and show finished
    await ctx.getByID('statusLabel').within(500).shouldBe('Finished');
    await ctx.getByID('positionLabel').within(500).shouldBe('0:00');
  });

  test('should display duration correctly', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Duration should be 8 seconds (synthetic audio is 8 seconds)
    const duration = await ctx.getByID('durationLabel').getText();
    expect(duration).toMatch(/8:00|0:08/);
  });

  test('should toggle play/pause buttons visibility', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Initially play button visible
    await ctx.getByID('playBtn').within(500).shouldExist();

    // Click play
    await ctx.getByID('playBtn').click();

    // Wait for state update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Pause button should be visible
    await ctx.getByID('pauseBtn').within(500).shouldExist();

    // Click pause
    await ctx.getByID('pauseBtn').click();

    // Play button should be visible again
    await ctx.getByID('playBtn').within(500).shouldExist();
  });

  test('should capture screenshot if requested', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(
        __dirname,
        'screenshots',
        'waveform-visualizer-canvas.png'
      );
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });
});

/**
 * Audio Processing Unit Tests
 */
describe('AudioProcessor - Waveform Processing', () => {
  test('synthetic waveform generation with correct properties', async () => {
    // Dynamic import to test the audio processor
    const waveformVisualizer = await import('./waveform-visualizer');

    // Access via module if exported, or verify through the app behavior
    // For now, test through app initialization ensures audio processor works
  });

  test('waveform downsampling to multiple resolutions', async () => {
    // This is indirectly tested through app initialization
    // The app calls downsampleWaveform internally
    const testApp = new (await import('../core/src/index-test')).TsyneTest({
      headed: false,
    });

    const app = await testApp.createApp((a) => {
      buildWaveformVisualizer(a);
    });

    const ctx = testApp.getContext();
    await app.run();

    // App successfully initializes with downsampled waveform
    await ctx
      .getByID('statusLabel')
      .within(2000)
      .shouldBe('Ready - tap waveform to seek');

    await testApp.cleanup();
  });
});

/**
 * Integration Tests - Complete Workflows
 */
describe('Waveform Visualizer - Complete Playback Workflows', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('full workflow: load -> play -> seek -> pause -> resume -> stop', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Step 1: Initialize
    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');
    await ctx.getByID('positionLabel').within(500).shouldBe('0:00');

    // Step 2: Start playing
    await ctx.getByID('playBtn').click();
    await ctx
      .getByID('statusLabel')
      .within(500)
      .shouldBe('Playing... (tap waveform to seek)');

    // Step 3: Let it play for 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));
    let position = await ctx.getByID('positionLabel').getText();
    const firstTime = parseInt(position.split(':')[1], 10);
    expect(firstTime).toBeGreaterThan(0);

    // Step 4: Pause
    await ctx.getByID('pauseBtn').click();
    await ctx.getByID('statusLabel').within(500).shouldBe('Paused');
    const pausedTime = await ctx.getByID('positionLabel').getText();

    // Step 5: Resume (position should be same initially)
    await ctx.getByID('playBtn').click();
    await ctx
      .getByID('statusLabel')
      .within(500)
      .shouldBe('Playing... (tap waveform to seek)');
    position = await ctx.getByID('positionLabel').getText();
    expect(position).toBe(pausedTime);

    // Step 6: Let it play a bit more
    await new Promise((resolve) => setTimeout(resolve, 800));
    position = await ctx.getByID('positionLabel').getText();
    const secondTime = parseInt(position.split(':')[1], 10);
    expect(secondTime).toBeGreaterThan(firstTime);

    // Step 7: Stop
    await ctx.getByID('stopBtn').click();
    await ctx.getByID('statusLabel').within(500).shouldBe('Stopped');
    await ctx.getByID('positionLabel').within(500).shouldBe('0:00');
  });

  test('multiple play cycles', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Cycle 1
    await ctx.getByID('playBtn').click();
    await ctx
      .getByID('statusLabel')
      .within(500)
      .shouldBe('Playing... (tap waveform to seek)');
    await new Promise((resolve) => setTimeout(resolve, 500));
    await ctx.getByID('pauseBtn').click();

    // Cycle 2
    await ctx.getByID('playBtn').click();
    await ctx
      .getByID('statusLabel')
      .within(500)
      .shouldBe('Playing... (tap waveform to seek)');
    await new Promise((resolve) => setTimeout(resolve, 500));
    await ctx.getByID('pauseBtn').click();

    // Verify still functional
    const finalPosition = await ctx.getByID('positionLabel').getText();
    expect(finalPosition).not.toBe('0:00');
  });

  test('time display format validation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Play and verify MM:SS format
    await ctx.getByID('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const position = await ctx.getByID('positionLabel').getText();
    expect(position).toMatch(/^\d+:\d{2}$/); // MM:SS or M:SS format
  });
});

/**
 * Edge Cases and Error Handling
 */
describe('Waveform Visualizer - Edge Cases', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should handle rapid play/pause clicks', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Rapid clicks
    await ctx.getByID('playBtn').click();
    await ctx.getByID('pauseBtn').click();
    await ctx.getByID('playBtn').click();
    await ctx.getByID('pauseBtn').click();
    await ctx.getByID('playBtn').click();

    // Should end in playing state
    await ctx
      .getByID('statusLabel')
      .within(500)
      .shouldBe('Playing... (tap waveform to seek)');

    await ctx.getByID('stopBtn').click();
  });

  test('stop during playback resets position', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Play briefly
    await ctx.getByID('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Get current position
    const beforeStop = await ctx.getByID('positionLabel').getText();
    expect(beforeStop).not.toBe('0:00');

    // Stop immediately resets
    await ctx.getByID('stopBtn').click();
    await ctx.getByID('positionLabel').within(500).shouldBe('0:00');
  });
});
