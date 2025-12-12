/**
 * Prime Grid Visualizer TsyneTest Integration Tests
 *
 * Test suite for the Prime Grid Visualizer demonstrating:
 * - Prime number calculation using Sieve of Eratosthenes
 * - Grid rendering and visualization
 * - User interactions and parameter input
 * - Statistics calculation
 * - Screenshot export functionality
 *
 * Usage:
 *   npm test ported-apps/prime-grid-visualizer/prime-grid-visualizer.test.ts
 *   TSYNE_HEADED=1 npm test ported-apps/prime-grid-visualizer/prime-grid-visualizer.test.ts
 *   TAKE_SCREENSHOTS=1 npm test ported-apps/prime-grid-visualizer/prime-grid-visualizer.test.ts
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createPrimeGridApp } from './prime-grid-visualizer';
import * as path from 'path';

describe('Prime Grid Visualizer Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial UI with default parameters', async () => {
    const testApp = await tsyneTest.createApp((app, win) => {
      createPrimeGridApp(app, win);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify title
    await ctx.getByText('Prime Grid Visualizer').within(500).shouldExist();

    // Verify control labels
    await ctx.getByID('labelMaxN').within(500).shouldExist();
    await ctx.getByID('labelColumns').within(500).shouldExist();
    await ctx.getByID('labelCellSize').within(500).shouldExist();

    // Verify input fields with default values
    await ctx.getByID('inputMaxN').within(500).shouldBe('100');
    await ctx.getByID('inputColumns').within(500).shouldBe('10');
    await ctx.getByID('inputCellSize').within(500).shouldBe('20');

    // Verify buttons
    await ctx.getByID('btnGenerate').within(500).shouldExist();
    await ctx.getByID('btnExport').within(500).shouldExist();

    // Verify statistics label
    await ctx.getByID('statsLabel').within(500).shouldExist();
  });

  test('should generate grid with default parameters (100 numbers, 10 columns)', async () => {
    const testApp = await tsyneTest.createApp((app, win) => {
      createPrimeGridApp(app, win);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial grid generation
    await ctx.wait(500);

    // Click Generate button
    await ctx.getByID('btnGenerate').click();

    // Wait for generation to complete
    await ctx.wait(500);

    // Verify statistics are displayed
    // For n=100, there should be 25 primes (up to 97)
    const statsText = await ctx.getByID('statsLabel').within(1000).getText();
    expect(statsText).toContain('Primes:');
    expect(statsText).toContain('Composites:');
    expect(statsText).toContain('prime');

    // Canvas should exist
    await ctx.getByID('gridRaster').within(500).shouldExist();
  });

  test('should calculate primes correctly for small numbers', async () => {
    const testApp = await tsyneTest.createApp((app, win) => {
      createPrimeGridApp(app, win);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Set n to 20 (primes: 2,3,5,7,11,13,17,19 = 8 primes)
    await ctx.getByID('inputMaxN').clear();
    await ctx.getByID('inputMaxN').type('20');

    // Set columns to 5 for easy visualization
    await ctx.getByID('inputColumns').clear();
    await ctx.getByID('inputColumns').type('5');

    // Generate
    await ctx.getByID('btnGenerate').click();

    // Wait for generation
    await ctx.wait(500);

    // Verify statistics
    const statsText = await ctx.getByID('statsLabel').within(1000).getText();

    // Should have 8 primes (2,3,5,7,11,13,17,19)
    expect(statsText).toContain('Primes: 8');
    // Should have 11 composites (4,6,8,9,10,12,14,15,16,18,20)
    expect(statsText).toContain('Composites: 11');
  });

  test('should update parameters and regenerate grid', async () => {
    const testApp = await tsyneTest.createApp((app, win) => {
      createPrimeGridApp(app, win);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial generation
    await ctx.getByID('btnGenerate').click();
    await ctx.wait(300);

    // Get initial stats
    let statsText = await ctx.getByID('statsLabel').within(500).getText();
    const initialStats = statsText;

    // Change parameters
    await ctx.getByID('inputMaxN').clear();
    await ctx.getByID('inputMaxN').type('50');

    await ctx.getByID('inputColumns').clear();
    await ctx.getByID('inputColumns').type('7');

    // Regenerate
    await ctx.getByID('btnGenerate').click();
    await ctx.wait(300);

    // Stats should have changed
    statsText = await ctx.getByID('statsLabel').within(500).getText();
    expect(statsText).not.toEqual(initialStats);

    // For n=50, there are 15 primes (2,3,5,7,11,13,17,19,23,29,31,37,41,43,47)
    expect(statsText).toContain('Primes: 15');
  });

  test('should handle edge case of very small n', async () => {
    const testApp = await tsyneTest.createApp((app, win) => {
      createPrimeGridApp(app, win);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Set n to 2 (minimum valid)
    await ctx.getByID('inputMaxN').clear();
    await ctx.getByID('inputMaxN').type('2');

    await ctx.getByID('btnGenerate').click();
    await ctx.wait(300);

    // Should have exactly 1 prime (2)
    const statsText = await ctx.getByID('statsLabel').within(500).getText();
    expect(statsText).toContain('Primes: 1');
  });

  test('should maintain percentage calculation accuracy', async () => {
    const testApp = await tsyneTest.createApp((app, win) => {
      createPrimeGridApp(app, win);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Set n to 10
    await ctx.getByID('inputMaxN').clear();
    await ctx.getByID('inputMaxN').type('10');

    await ctx.getByID('btnGenerate').click();
    await ctx.wait(300);

    // Primes up to 10: 2,3,5,7 = 4 primes
    // Percentage: 4/10 = 40%
    const statsText = await ctx.getByID('statsLabel').within(500).getText();
    expect(statsText).toContain('40.0%');
  });

  test('should render legend with color indicators', async () => {
    const testApp = await tsyneTest.createApp((app, win) => {
      createPrimeGridApp(app, win);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Look for legend text
    await ctx.getByText('Legend:').within(500).shouldExist();
    await ctx.getByText('Prime').within(500).shouldExist();
    await ctx.getByText('Composite').within(500).shouldExist();
    await ctx.getByText('One').within(500).shouldExist();
  });

  test('should validate input parameters', async () => {
    const testApp = await tsyneTest.createApp((app, win) => {
      createPrimeGridApp(app, win);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Try setting invalid values (too small)
    await ctx.getByID('inputCellSize').clear();
    await ctx.getByID('inputCellSize').type('2'); // Less than minimum of 5

    await ctx.getByID('inputColumns').clear();
    await ctx.getByID('inputColumns').type('0'); // Less than minimum of 1

    await ctx.getByID('btnGenerate').click();
    await ctx.wait(300);

    // App should handle gracefully without crashing
    await ctx.getByID('statsLabel').within(500).shouldExist();
  });

  test('should handle medium-sized grids efficiently', async () => {
    const testApp = await tsyneTest.createApp((app, win) => {
      createPrimeGridApp(app, win);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Set n to 500
    await ctx.getByID('inputMaxN').clear();
    await ctx.getByID('inputMaxN').type('500');

    await ctx.getByID('inputColumns').clear();
    await ctx.getByID('inputColumns').type('20');

    const startTime = Date.now();
    await ctx.getByID('btnGenerate').click();
    await ctx.wait(1000);
    const endTime = Date.now();

    // Should complete in reasonable time (< 3 seconds)
    expect(endTime - startTime).toBeLessThan(3000);

    // Should have statistics (95 primes up to 500)
    const statsText = await ctx.getByID('statsLabel').within(500).getText();
    expect(statsText).toContain('Primes:');
  });

  test('should display initial grid on app load', async () => {
    const testApp = await tsyneTest.createApp((app, win) => {
      createPrimeGridApp(app, win);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial grid generation (should happen automatically)
    await ctx.wait(500);

    // Grid should be visible
    await ctx.getByID('gridRaster').within(500).shouldExist();

    // Statistics should show default primes
    const statsText = await ctx.getByID('statsLabel').within(500).getText();
    expect(statsText).not.toContain('Ready to generate');
  });

  test('should capture screenshot for documentation', async () => {
    if (process.env.TAKE_SCREENSHOTS !== '1') {
      console.log('⏭️  Skipping screenshot test (set TAKE_SCREENSHOTS=1 to run)');
      return;
    }

    const testApp = await tsyneTest.createApp((app, win) => {
      createPrimeGridApp(app, win);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to render
    await ctx.wait(500);

    // Generate a nice visualization
    await ctx.getByID('inputMaxN').clear();
    await ctx.getByID('inputMaxN').type('200');

    await ctx.getByID('inputColumns').clear();
    await ctx.getByID('inputColumns').type('14');

    await ctx.getByID('btnGenerate').click();
    await ctx.wait(800);

    // Capture screenshot
    const screenshotPath = path.join(
      __dirname,
      '../screenshots',
      'prime-grid-visualizer.png'
    );
    await tsyneTest.screenshot(screenshotPath);
    console.error(`📸 Screenshot saved: ${screenshotPath}`);
  });
});
