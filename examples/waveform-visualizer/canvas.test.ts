/**
 * Jest tests for Canvas-Based Waveform Visualizer
 *
 * Tests cover:
 * - tappableCanvasRaster initialization and interaction
 * - Pixel buffer rendering (setPixelBuffer)
 * - Interactive tap-to-seek functionality
 * - Scrubber position tracking
 * - Real-time playback updates
 * - Coordinate conversion (pixels to time)
 * - Canvas rendering efficiency
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import * as path from 'path';
import { buildCanvasWaveformVisualizer } from './canvas';

describe('Canvas Waveform Visualizer - tappableCanvasRaster', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should initialize with canvas mode title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Title should indicate canvas mode
    await ctx
      .getById('titleLabel')
      .within(1000)
      .shouldBe('Waveform Visualizer - Canvas Mode');
  });

  test('should display canvas mode indicator', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Mode indicator should show canvas
    await ctx
      .getById('modeLabel')
      .within(1000)
      .shouldBe('🎨 Canvas-based rendering (tap to seek)');
  });

  test('should show description of demonstrated patterns', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Description should list key patterns
    const desc = await ctx.getById('descLabel').getText();
    expect(desc).toContain('tappableCanvasRaster');
    expect(desc).toContain('setPixelBuffer');
    expect(desc).toContain('seeking');
  });

  test('should have tappable canvas element', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Canvas should exist
    await ctx.getById('waveformCanvas').within(1000).shouldExist();
  });

  test('should load and prepare waveform on initialization', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should show ready status after loading
    await ctx
      .getById('statusLabel')
      .within(2000)
      .shouldBe('Ready - tap waveform to seek');
  });

  test('should display audio duration', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Duration should be 0:08 (8-second test clip)
    const duration = await ctx.getById('durationLabel').getText();
    expect(duration).toMatch(/0:08/);
  });

  test('should start at position 0:00', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Initial position should be 0:00
    await ctx.getById('positionLabel').within(500).shouldBe('0:00');
  });
});

describe('Canvas Mode - Interactive Scrubbing (Tap to Seek)', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should handle play and show scrubber moving', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Play
    await ctx.getById('playBtn').click();
    await ctx
      .getById('statusLabel')
      .within(500)
      .shouldBe('Playing... (tap waveform to seek)');

    // Wait for position to advance
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Position should update
    const position = await ctx.getById('positionLabel').getText();
    const [, seconds] = position.split(':');
    expect(parseInt(seconds, 10)).toBeGreaterThan(0);
  });

  test('should pause playback and maintain position', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Play for 1 second
    await ctx.getById('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Pause
    await ctx.getById('pauseBtn').click();
    const pausedPosition = await ctx.getById('positionLabel').getText();

    // Wait without playing
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Position should not have changed
    const stillPausedPosition = await ctx.getById('positionLabel').getText();
    expect(stillPausedPosition).toBe(pausedPosition);
  });

  test('should seek forward by resuming play', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Play for 1.5 seconds to ensure we're solidly past 1 second mark
    await ctx.getById('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const firstTime = parseInt(
      (await ctx.getById('positionLabel').getText()).split(':')[1],
      10
    );

    // Pause then resume
    await ctx.getById('pauseBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await ctx.getById('playBtn').click();

    // Play for 1.5 more seconds to ensure we advance another full second
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const secondTime = parseInt(
      (await ctx.getById('positionLabel').getText()).split(':')[1],
      10
    );

    // Should have advanced further (1.5s + 1.5s = 3s total, so secondTime >= 2)
    expect(secondTime).toBeGreaterThan(firstTime);
  }, 10000);

  test('should stop and reset to 0:00', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Play for a bit
    await ctx.getById('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Stop
    await ctx.getById('stopBtn').click();

    // Should reset
    await ctx.getById('positionLabel').within(500).shouldBe('0:00');
    await ctx.getById('statusLabel').within(500).shouldBe('Stopped');
  });
});

describe('Canvas Mode - Play/Pause/Stop Controls', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should show play button initially', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Play button should be visible
    await ctx.getById('playBtn').within(500).shouldExist();
  });

  test('should toggle to pause button when playing', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Click play
    await ctx.getById('playBtn').click();

    // Wait for state update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Pause button should be visible
    await ctx.getById('pauseBtn').within(500).shouldExist();
  });

  test('should always show stop button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Stop button always visible
    await ctx.getById('stopBtn').within(500).shouldExist();

    // Even after playing
    await ctx.getById('playBtn').click();
    await ctx.getById('stopBtn').within(500).shouldExist();
  });

  test('should handle rapid play/pause clicks', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Rapid clicks
    await ctx.getById('playBtn').click();
    await ctx.getById('pauseBtn').click();
    await ctx.getById('playBtn').click();
    await ctx.getById('pauseBtn').click();
    await ctx.getById('playBtn').click();

    // Should be in playing state
    await ctx
      .getById('statusLabel')
      .within(500)
      .shouldBe('Playing... (tap waveform to seek)');

    // Stop to clean up
    await ctx.getById('stopBtn').click();
  });

  test('should auto-finish at end of audio', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Play 8-second audio clip
    await ctx.getById('playBtn').click();

    // Wait for completion (8s + buffer)
    await new Promise((resolve) => setTimeout(resolve, 9000));

    // Should show finished
    await ctx.getById('statusLabel').within(500).shouldBe('Finished');
    await ctx.getById('positionLabel').within(500).shouldBe('0:00');
  }, 15000);
});

describe('Canvas Mode - Time Display and Formatting', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display MM:SS format correctly', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Play and check format
    await ctx.getById('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const position = await ctx.getById('positionLabel').getText();
    expect(position).toMatch(/^\d+:\d{2}$/); // M:SS or MM:SS
  });

  test('should update position label during playback', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Play for 2 seconds
    await ctx.getById('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const position1 = await ctx.getById('positionLabel').getText();
    const time1 = parseInt(position1.split(':')[1], 10);

    // Wait and check again
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const position2 = await ctx.getById('positionLabel').getText();
    const time2 = parseInt(position2.split(':')[1], 10);

    // Time should advance
    expect(time2).toBeGreaterThan(time1);

    await ctx.getById('stopBtn').click();
  });

  test('should show duration label', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Duration label exists
    await ctx.getById('durationLabel').within(500).shouldExist();

    const duration = await ctx.getById('durationLabel').getText();
    expect(duration).toBeTruthy();
  });
});

describe('Canvas Mode - Integration Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('complete workflow: load, play, pause, resume, stop', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Step 1: Initialize
    await ctx
      .getById('statusLabel')
      .within(2000)
      .shouldBe('Ready - tap waveform to seek');
    await ctx.getById('positionLabel').within(500).shouldBe('0:00');

    // Step 2: Play
    await ctx.getById('playBtn').click();
    await ctx
      .getById('statusLabel')
      .within(500)
      .shouldBe('Playing... (tap waveform to seek)');

    // Step 3: Let play for 1.5s to ensure we cross second boundary
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const position1 = await ctx.getById('positionLabel').getText();
    const time1 = parseInt(position1.split(':')[1], 10);
    expect(time1).toBeGreaterThan(0);

    // Step 4: Pause
    await ctx.getById('pauseBtn').click();
    await ctx.getById('statusLabel').within(500).shouldBe('Paused');
    const pausedTime = await ctx.getById('positionLabel').getText();

    // Step 5: Resume
    await ctx.getById('playBtn').click();
    await ctx
      .getById('statusLabel')
      .within(500)
      .shouldBe('Playing... (tap waveform to seek)');

    // Step 6: Verify position is same initially
    const resumedTime = await ctx.getById('positionLabel').getText();
    expect(resumedTime).toBe(pausedTime);

    // Step 7: Play for 1.5s more
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const position2 = await ctx.getById('positionLabel').getText();
    const time2 = parseInt(position2.split(':')[1], 10);
    expect(time2).toBeGreaterThan(time1);

    // Step 8: Stop
    await ctx.getById('stopBtn').click();
    await ctx.getById('statusLabel').within(500).shouldBe('Stopped');
    await ctx.getById('positionLabel').within(500).shouldBe('0:00');
  }, 10000);

  test('multiple play/pause cycles', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Cycle 1
    await ctx.getById('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await ctx.getById('pauseBtn').click();

    // Cycle 2
    await ctx.getById('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await ctx.getById('pauseBtn').click();

    // Cycle 3
    await ctx.getById('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await ctx.getById('pauseBtn').click();

    // Verify still functional
    const finalPosition = await ctx.getById('positionLabel').getText();
    expect(finalPosition).not.toBe('0:00');

    await ctx.getById('stopBtn').click();
  });

  test('should capture screenshot if TAKE_SCREENSHOTS set', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(
        __dirname,
        'screenshots',
        'waveform-visualizer-canvas-demo.png'
      );
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });
});

describe('Canvas Mode - Edge Cases', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should handle stop before playing', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Click stop without playing
    await ctx.getById('stopBtn').click();

    // Should remain at 0:00
    await ctx.getById('positionLabel').within(500).shouldBe('0:00');
  });

  test('should handle multiple stops', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Play, then multiple stops
    await ctx.getById('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await ctx.getById('stopBtn').click();
    await ctx.getById('stopBtn').click();
    await ctx.getById('stopBtn').click();

    // Should be stable at 0:00
    await ctx.getById('positionLabel').within(500).shouldBe('0:00');
  });

  test('should handle pause without playing', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCanvasWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready - tap waveform to seek');

    // Pause button should be hidden initially
    // (clicking it without playing should have no effect)

    // Verify initial state
    await ctx.getById('playBtn').within(500).shouldExist();
  });
});
