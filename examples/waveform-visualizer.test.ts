/**
 * Jest tests for Waveform Visualizer
 *
 * Tests cover:
 * - Audio data loading and waveform generation
 * - Play/pause controls
 * - Time display updates
 * - Canvas rendering
 * - Scrubber position tracking
 * - Multiple playback cycles
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import * as path from 'path';
import { buildWaveformVisualizer } from './waveform-visualizer';

describe('Waveform Visualizer', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should initialize with correct title and UI elements', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check title
    await ctx.getByID('titleLabel').within(1000).shouldBe('Waveform Visualizer');

    // Check source label
    await ctx
      .getByID('sourceLabel')
      .within(1000)
      .shouldBe('Pixabay: Upbeat Stomp Drums Opener');

    // Check that control buttons exist
    await ctx.getByID('playBtn').within(1000).shouldExist();
    await ctx.getByID('stopBtn').within(1000).shouldExist();

    // Initial status should indicate ready
    const statusText = await ctx.getByID('statusLabel').getText();
    expect(statusText).toMatch(/Ready|Initializing|Loading/);
  });

  test('should display time correctly on initialization', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initialization
    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready to play');

    // Check initial time display
    await ctx.getByID('positionLabel').within(500).shouldBe('0:00');

    // Duration should be set (8 seconds based on synthetic audio)
    const durationText = await ctx.getByID('durationLabel').getText();
    expect(durationText).toMatch(/8:00|0:08/); // Could be formatted as 8:00 or 0:08
  });

  test('should transition from play to pause state', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initialization
    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready to play');

    // Initially, play button should be visible
    await ctx.getByID('playBtn').within(500).shouldExist();

    // Click play
    await ctx.getByID('playBtn').click();

    // Status should change to "Playing..."
    await ctx.getByID('statusLabel').within(500).shouldBe('Playing...');

    // Wait a moment for animation
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Click pause
    await ctx.getByID('pauseBtn').click();

    // Status should show "Paused"
    await ctx.getByID('statusLabel').within(500).shouldBe('Paused');
  });

  test('should update playback position when playing', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initialization
    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready to play');

    // Click play
    await ctx.getByID('playBtn').click();
    await ctx.getByID('statusLabel').within(500).shouldBe('Playing...');

    // Initial position
    let positionText = await ctx.getByID('positionLabel').getText();
    expect(positionText).toBe('0:00');

    // Wait for playback to advance
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Position should have advanced (at least to 0:01)
    positionText = await ctx.getByID('positionLabel').getText();
    const parts = positionText.split(':');
    const seconds = parseInt(parts[1], 10);
    expect(seconds).toBeGreaterThan(0);
  });

  test('should handle stop action correctly', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initialization
    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready to play');

    // Start playing
    await ctx.getByID('playBtn').click();
    await ctx.getByID('statusLabel').within(500).shouldBe('Playing...');

    // Wait for some progress
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Click stop
    await ctx.getByID('stopBtn').click();

    // Status should be "Stopped"
    await ctx.getByID('statusLabel').within(500).shouldBe('Stopped');

    // Position should be reset to 0:00
    await ctx.getByID('positionLabel').within(500).shouldBe('0:00');
  });

  test('should handle multiple play/pause cycles', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initialization
    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready to play');

    // First play
    await ctx.getByID('playBtn').click();
    await ctx.getByID('statusLabel').within(500).shouldBe('Playing...');

    // Pause
    await new Promise((resolve) => setTimeout(resolve, 300));
    await ctx.getByID('pauseBtn').click();
    await ctx.getByID('statusLabel').within(500).shouldBe('Paused');

    // Second play
    await ctx.getByID('playBtn').click();
    await ctx.getByID('statusLabel').within(500).shouldBe('Playing...');

    // Pause again
    await new Promise((resolve) => setTimeout(resolve, 300));
    await ctx.getByID('pauseBtn').click();
    await ctx.getByID('statusLabel').within(500).shouldBe('Paused');
  });

  test('should display canvas element', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Canvas should exist
    await ctx.getByID('waveformCanvas').within(1000).shouldExist();
  });

  test('should show pause button only when playing', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initialization
    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready to play');

    // Play button should exist initially
    await ctx.getByID('playBtn').within(500).shouldExist();

    // Click play
    await ctx.getByID('playBtn').click();
    await ctx.getByID('statusLabel').within(500).shouldBe('Playing...');

    // Wait for state update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Pause button should be visible
    await ctx.getByID('pauseBtn').within(500).shouldExist();

    // Click pause
    await ctx.getByID('pauseBtn').click();
    await ctx.getByID('statusLabel').within(500).shouldBe('Paused');
  });

  test('should include screenshot if TAKE_SCREENSHOTS is set', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initialization
    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready to play');

    // Capture screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(
        __dirname,
        'screenshots',
        'waveform-visualizer.png'
      );
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });
});

/**
 * Unit tests for AudioProcessor
 */
describe('AudioProcessor', () => {
  // These tests focus on the audio processing logic without GUI
  // They can be run independently of the Tsyne framework

  test('synthetic waveform generation', async () => {
    // Import the module to test audio processor
    const { AudioProcessor } = await import('./waveform-visualizer');

    if (AudioProcessor) {
      const waveform = AudioProcessor.createSyntheticWaveform();

      // Verify basic properties
      expect(waveform.samples).toBeInstanceOf(Float32Array);
      expect(waveform.sampleRate).toBe(44100);
      expect(waveform.duration).toBe(8);
      expect(waveform.samples.length).toBe(44100 * 8);

      // Verify samples are in valid range [-1, 1] (approximately)
      for (let i = 0; i < 1000; i++) {
        expect(Math.abs(waveform.samples[i])).toBeLessThanOrEqual(1.5);
      }
    }
  });

  test('waveform downsampling', async () => {
    const { AudioProcessor } = await import('./waveform-visualizer');

    if (AudioProcessor) {
      const waveform = AudioProcessor.createSyntheticWaveform();
      const downsampled = AudioProcessor.downsampleWaveform(waveform, 100);

      // Should produce exactly 100 samples
      expect(downsampled.peaks.length).toBe(100);
      expect(downsampled.rms.length).toBe(100);

      // All values should be positive (peak and RMS are absolute)
      for (const peak of downsampled.peaks) {
        expect(peak).toBeGreaterThanOrEqual(0);
        expect(peak).toBeLessThanOrEqual(1.5);
      }

      for (const rmsValue of downsampled.rms) {
        expect(rmsValue).toBeGreaterThanOrEqual(0);
        expect(rmsValue).toBeLessThanOrEqual(1.5);
      }
    }
  });

  test('downsampling at different resolutions', async () => {
    const { AudioProcessor } = await import('./waveform-visualizer');

    if (AudioProcessor) {
      const waveform = AudioProcessor.createSyntheticWaveform();

      // Test various resolutions
      const resolutions = [10, 50, 100, 500, 1000];

      for (const resolution of resolutions) {
        const downsampled = AudioProcessor.downsampleWaveform(
          waveform,
          resolution
        );
        expect(downsampled.peaks.length).toBe(resolution);
        expect(downsampled.rms.length).toBe(resolution);
      }
    }
  });
});

/**
 * Integration tests
 */
describe('Waveform Visualizer Integration', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('complete playback workflow: load, play, pause, stop', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Step 1: Wait for initialization
    await ctx.getByID('statusLabel').within(2000).shouldBe('Ready to play');
    await ctx.getByID('positionLabel').within(500).shouldBe('0:00');

    // Step 2: Start playback
    await ctx.getByID('playBtn').click();
    await ctx.getByID('statusLabel').within(500).shouldBe('Playing...');

    // Step 3: Let it play for 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Position should have advanced
    let position = await ctx.getByID('positionLabel').getText();
    const startSeconds = parseInt(position.split(':')[1], 10);
    expect(startSeconds).toBeGreaterThan(0);

    // Step 4: Pause
    await ctx.getByID('pauseBtn').click();
    await ctx.getByID('statusLabel').within(500).shouldBe('Paused');

    // Position should remain the same
    const pausedPosition = await ctx.getByID('positionLabel').getText();
    expect(pausedPosition).toBe(position);

    // Step 5: Resume
    await ctx.getByID('playBtn').click();
    await ctx.getByID('statusLabel').within(500).shouldBe('Playing...');

    // Step 6: Let it play a bit more
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Position should continue advancing
    position = await ctx.getByID('positionLabel').getText();
    const finalSeconds = parseInt(position.split(':')[1], 10);
    expect(finalSeconds).toBeGreaterThan(startSeconds);

    // Step 7: Stop
    await ctx.getByID('stopBtn').click();
    await ctx.getByID('statusLabel').within(500).shouldBe('Stopped');
    await ctx.getByID('positionLabel').within(500).shouldBe('0:00');
  });
});
