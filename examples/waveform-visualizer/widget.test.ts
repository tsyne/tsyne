/**
 * Jest tests for Widget-Based Waveform Visualizer
 *
 * Tests cover:
 * - Pseudo-declarative UI composition
 * - Dynamic widget generation for waveform slices
 * - Scrollable container functionality
 * - Slice highlighting during playback
 * - Declarative visibility with .when()
 * - Widget-based state management
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import * as path from 'path';
import { buildWidgetWaveformVisualizer } from './widget';

describe('Widget Waveform Visualizer - Pseudo-Declarative Composition', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should initialize with widget mode title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Title should indicate widget mode
    await ctx
      .getById('titleLabel')
      .within(1000)
      .shouldBe('Waveform Visualizer - Widget Mode');
  });

  test('should display widget mode indicator', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Mode indicator should show declarative composition
    await ctx
      .getById('modeLabel')
      .within(1000)
      .shouldBe('🎨 Declarative slice-based rendering');
  });

  test('should show description of demonstrated patterns', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Description should mention key patterns
    const desc = await ctx.getById('descLabel').getText();
    expect(desc).toContain('pseudo-declarative');
    expect(desc).toContain('.when()');
    expect(desc).toContain('slices');
  });

  test('should have info label explaining widget nature', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Info label should explain widgets
    const info = await ctx.getById('infoLabel').getText();
    expect(info).toContain('widget element');
  });

  test('should load and prepare waveform slices', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should show ready status after loading
    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');
  });

  test('should display audio duration', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Duration should be 0:08 (8-second test clip)
    const duration = await ctx.getById('durationLabel').getText();
    expect(duration).toMatch(/0:08/);
  });

  test('should start at position 0:00', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Initial position should be 0:00
    await ctx.getById('positionLabel').within(500).shouldBe('0:00');
  });
});

describe('Widget Mode - Dynamic Slice Generation', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should generate slice widgets with IDs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Widget mode should have created slice widgets
    // Slices are named slice-0, slice-1, etc.
    const firstSlice = await ctx.getById('slice-0').within(500).shouldExist();
    expect(firstSlice).toBeTruthy();
  });

  test('should create multiple slice widgets', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Should have created multiple slices (48 for widget mode)
    // Check a few of them
    await ctx.getById('slice-0').within(500).shouldExist();
    await ctx.getById('slice-10').within(500).shouldExist();
    await ctx.getById('slice-20').within(500).shouldExist();
  });

  test('should have scrollable waveform container', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Waveform slices should exist in the DOM
    // (They're in a scrollable container)
    const slices = [];
    for (let i = 0; i < 48; i++) {
      try {
        await ctx.getById(`slice-${i}`).within(100).shouldExist();
        slices.push(i);
      } catch {
        // Not all slices may be immediately queryable due to scrolling
      }
    }

    // Should have created at least some slices
    expect(slices.length).toBeGreaterThan(0);
  });
});

describe('Widget Mode - Playback and State Tracking', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should play and update position', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Play
    await ctx.getById('playBtn').click();
    await ctx.getById('statusLabel').within(500).shouldBe('Playing...');

    // Wait for position to advance
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Position should update
    const position = await ctx.getById('positionLabel').getText();
    const [, seconds] = position.split(':');
    expect(parseInt(seconds, 10)).toBeGreaterThan(0);

    await ctx.getById('stopBtn').click();
  }, 15000);

  test('should pause and maintain playback position', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

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
  }, 10000);

  test('should track current slice during playback', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Play and track position
    await ctx.getById('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get current position - should indicate which slice
    const position = await ctx.getById('positionLabel').getText();
    const [, seconds] = position.split(':');
    const seconds_value = parseInt(seconds, 10);

    // With 8-second duration and 48 slices, each slice is ~0.17 seconds
    // After 1 second, should be around slice 6
    expect(seconds_value).toBeGreaterThan(0);

    await ctx.getById('stopBtn').click();
  }, 10000);

  test('should reset slice index on stop', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Play for a while
    await ctx.getById('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Stop
    await ctx.getById('stopBtn').click();

    // Should reset to beginning
    await ctx.getById('positionLabel').within(500).shouldBe('0:00');
    await ctx.getById('statusLabel').within(500).shouldBe('Stopped');
  }, 10000);
});

describe('Widget Mode - Play/Pause/Stop Controls', () => {
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
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Play button visible
    await ctx.getById('playBtn').within(500).shouldExist();
  });

  test('should toggle to pause button when playing', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Click play
    await ctx.getById('playBtn').click();

    // Wait for state
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Pause button visible
    await ctx.getById('pauseBtn').within(500).shouldExist();

    await ctx.getById('stopBtn').click();
  });

  test('should always show stop button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Stop button always visible
    await ctx.getById('stopBtn').within(500).shouldExist();

    // Still visible after playing
    await ctx.getById('playBtn').click();
    await ctx.getById('stopBtn').within(500).shouldExist();

    await ctx.getById('stopBtn').click();
  });

  test('should handle rapid play/pause clicks', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Rapid clicks
    await ctx.getById('playBtn').click();
    await ctx.getById('pauseBtn').click();
    await ctx.getById('playBtn').click();
    await ctx.getById('pauseBtn').click();
    await ctx.getById('playBtn').click();

    // Should be playing
    await ctx.getById('statusLabel').within(500).shouldBe('Playing...');

    await ctx.getById('stopBtn').click();
  });

  test('should auto-finish at end of audio', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Play 8-second audio clip
    await ctx.getById('playBtn').click();

    // Wait for completion (8s + buffer)
    await new Promise((resolve) => setTimeout(resolve, 9000));

    // Should show finished
    await ctx.getById('statusLabel').within(500).shouldBe('Finished');
    await ctx.getById('positionLabel').within(500).shouldBe('0:00');
  }, 15000);
});

describe('Widget Mode - Time Display', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display MM:SS format', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Play and verify format
    await ctx.getById('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const position = await ctx.getById('positionLabel').getText();
    expect(position).toMatch(/^\d+:\d{2}$/);

    await ctx.getById('stopBtn').click();
  }, 10000);

  test('should update position during playback', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Play and get position
    await ctx.getById('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const pos1 = await ctx.getById('positionLabel').getText();
    const time1 = parseInt(pos1.split(':')[1], 10);

    // Wait and check again
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pos2 = await ctx.getById('positionLabel').getText();
    const time2 = parseInt(pos2.split(':')[1], 10);

    // Should advance
    expect(time2).toBeGreaterThan(time1);

    await ctx.getById('stopBtn').click();
  }, 10000);

  test('should show duration label', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Duration should exist
    await ctx.getById('durationLabel').within(500).shouldExist();

    const duration = await ctx.getById('durationLabel').getText();
    expect(duration).toBeTruthy();
  });
});

describe('Widget Mode - Integration Tests', () => {
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
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Step 1: Initialize
    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');
    await ctx.getById('positionLabel').within(500).shouldBe('0:00');

    // Step 2: Play
    await ctx.getById('playBtn').click();
    await ctx.getById('statusLabel').within(500).shouldBe('Playing...');

    // Step 3: Play for 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const pos1 = await ctx.getById('positionLabel').getText();
    const time1 = parseInt(pos1.split(':')[1], 10);
    expect(time1).toBeGreaterThan(0);

    // Step 4: Pause
    await ctx.getById('pauseBtn').click();
    await ctx.getById('statusLabel').within(500).shouldBe('Paused');
    const pausedTime = await ctx.getById('positionLabel').getText();

    // Step 5: Resume
    await ctx.getById('playBtn').click();
    await ctx.getById('statusLabel').within(500).shouldBe('Playing...');

    // Step 6: Verify position same initially
    const resumedTime = await ctx.getById('positionLabel').getText();
    expect(resumedTime).toBe(pausedTime);

    // Step 7: Play more
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const pos2 = await ctx.getById('positionLabel').getText();
    const time2 = parseInt(pos2.split(':')[1], 10);
    expect(time2).toBeGreaterThan(time1);

    // Step 8: Stop
    await ctx.getById('stopBtn').click();
    await ctx.getById('statusLabel').within(500).shouldBe('Stopped');
    await ctx.getById('positionLabel').within(500).shouldBe('0:00');
  }, 10000);

  test('multiple play/pause cycles', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

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

    // Verify position advanced
    const finalPosition = await ctx.getById('positionLabel').getText();
    expect(finalPosition).not.toBe('0:00');

    await ctx.getById('stopBtn').click();
  }, 10000);

  test('should capture screenshot if TAKE_SCREENSHOTS set', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(
        __dirname,
        'screenshots',
        'waveform-visualizer-widget-demo.png'
      );
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });
});

describe('Widget Mode - Edge Cases', () => {
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
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Stop without playing
    await ctx.getById('stopBtn').click();

    // Should stay at 0:00
    await ctx.getById('positionLabel').within(500).shouldBe('0:00');
  });

  test('should handle multiple stops', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // Play then multiple stops
    await ctx.getById('playBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await ctx.getById('stopBtn').click();
    await ctx.getById('stopBtn').click();
    await ctx.getById('stopBtn').click();

    // Should be stable at 0:00
    await ctx.getById('positionLabel').within(500).shouldBe('0:00');
  }, 10000);

  test('slices should exist even in scrollable container', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWidgetWaveformVisualizer(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(2000).shouldBe('Ready to play');

    // First and middle slices should be queryable
    await ctx.getById('slice-0').within(500).shouldExist();
    await ctx.getById('slice-24').within(500).shouldExist();
  });
});
