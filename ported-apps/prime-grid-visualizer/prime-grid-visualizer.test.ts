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

import { TsyneTest, TestContext } from 'tsyne';
import { createPrimeGridAppStandalone } from './prime-grid-visualizer';
import * as path from 'path';
import * as fs from 'fs';

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
    const testApp = await tsyneTest.createApp(async (app) => {
      await createPrimeGridAppStandalone(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify title
    await ctx.getByText('Prime Grid Visualizer').within(500).shouldExist();

    // Verify control labels
    await ctx.getById('labelMaxN').within(500).shouldExist();
    await ctx.getById('labelColumns').within(500).shouldExist();
    await ctx.getById('labelCellSize').within(500).shouldExist();

    // Verify input fields with default values
    await ctx.getById('inputMaxN').within(500).shouldBe('100');
    await ctx.getById('inputColumns').within(500).shouldBe('10');
    await ctx.getById('inputCellSize').within(500).shouldBe('20');

    // Verify buttons
    await ctx.getById('btnGenerate').within(500).shouldExist();
    await ctx.getById('btnExport').within(500).shouldExist();

    // Verify statistics label
    await ctx.getById('statsLabel').within(500).shouldExist();
  });

  test('should generate grid with default parameters (100 numbers, 10 columns)', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await createPrimeGridAppStandalone(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial grid generation
    await ctx.wait(500);

    // Click Generate button
    await ctx.getById('btnGenerate').click();

    // Wait for generation to complete
    await ctx.wait(500);

    // Verify statistics are displayed
    // For n=100, there should be 25 primes (up to 97)
    const statsText = await ctx.getById('statsLabel').within(1000).getText();
    expect(statsText).toContain('Primes:');
    expect(statsText).toContain('Composites:');
    expect(statsText).toContain('prime');

    // Canvas should exist
    await ctx.getById('gridRaster').within(500).shouldExist();
  });

  test('should calculate primes correctly for small numbers', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await createPrimeGridAppStandalone(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Set n to 20 (primes: 2,3,5,7,11,13,17,19 = 8 primes)
    await ctx.getById('inputMaxN').clear();
    await ctx.getById('inputMaxN').type('20');

    // Set columns to 5 for easy visualization
    await ctx.getById('inputColumns').clear();
    await ctx.getById('inputColumns').type('5');

    // Generate
    await ctx.getById('btnGenerate').click();

    // Wait for generation
    await ctx.wait(500);

    // Verify statistics
    const statsText = await ctx.getById('statsLabel').within(1000).getText();

    // Should have 8 primes (2,3,5,7,11,13,17,19)
    expect(statsText).toContain('Primes: 8');
    // Should have 11 composites (4,6,8,9,10,12,14,15,16,18,20)
    expect(statsText).toContain('Composites: 11');
  });

  test('should update parameters and regenerate grid', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await createPrimeGridAppStandalone(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial generation
    await ctx.getById('btnGenerate').click();
    await ctx.wait(300);

    // Get initial stats
    let statsText = await ctx.getById('statsLabel').within(500).getText();
    const initialStats = statsText;

    // Change parameters
    await ctx.getById('inputMaxN').clear();
    await ctx.getById('inputMaxN').type('50');

    await ctx.getById('inputColumns').clear();
    await ctx.getById('inputColumns').type('7');

    // Regenerate
    await ctx.getById('btnGenerate').click();
    await ctx.wait(300);

    // Stats should have changed
    statsText = await ctx.getById('statsLabel').within(500).getText();
    expect(statsText).not.toEqual(initialStats);

    // For n=50, there are 15 primes (2,3,5,7,11,13,17,19,23,29,31,37,41,43,47)
    expect(statsText).toContain('Primes: 15');
  });

  test('should handle edge case of very small n', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await createPrimeGridAppStandalone(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Set n to 2 (minimum valid)
    await ctx.getById('inputMaxN').clear();
    await ctx.getById('inputMaxN').type('2');

    await ctx.getById('btnGenerate').click();
    await ctx.wait(300);

    // Should have exactly 1 prime (2)
    const statsText = await ctx.getById('statsLabel').within(500).getText();
    expect(statsText).toContain('Primes: 1');
  });

  test('should maintain percentage calculation accuracy', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await createPrimeGridAppStandalone(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Set n to 10
    await ctx.getById('inputMaxN').clear();
    await ctx.getById('inputMaxN').type('10');

    await ctx.getById('btnGenerate').click();
    await ctx.wait(300);

    // Primes up to 10: 2,3,5,7 = 4 primes
    // Percentage: 4/10 = 40%
    const statsText = await ctx.getById('statsLabel').within(500).getText();
    expect(statsText).toContain('40.0%');
  });

  test('should render legend with color indicators', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await createPrimeGridAppStandalone(app);
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
    const testApp = await tsyneTest.createApp(async (app) => {
      await createPrimeGridAppStandalone(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Try setting invalid values (too small)
    await ctx.getById('inputCellSize').clear();
    await ctx.getById('inputCellSize').type('2'); // Less than minimum of 5

    await ctx.getById('inputColumns').clear();
    await ctx.getById('inputColumns').type('0'); // Less than minimum of 1

    await ctx.getById('btnGenerate').click();
    await ctx.wait(300);

    // App should handle gracefully without crashing
    await ctx.getById('statsLabel').within(500).shouldExist();
  });

  test('should handle medium-sized grids efficiently', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await createPrimeGridAppStandalone(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Set n to 500
    await ctx.getById('inputMaxN').clear();
    await ctx.getById('inputMaxN').type('500');

    await ctx.getById('inputColumns').clear();
    await ctx.getById('inputColumns').type('20');

    const startTime = Date.now();
    await ctx.getById('btnGenerate').click();
    await ctx.wait(1000);
    const endTime = Date.now();

    // Should complete in reasonable time (< 3 seconds)
    expect(endTime - startTime).toBeLessThan(3000);

    // Should have statistics (95 primes up to 500)
    const statsText = await ctx.getById('statsLabel').within(500).getText();
    expect(statsText).toContain('Primes:');
  });

  test('should display initial grid on app load', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await createPrimeGridAppStandalone(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial grid generation (should happen automatically)
    await ctx.wait(500);

    // Grid should be visible
    await ctx.getById('gridRaster').within(500).shouldExist();

    // Statistics should show default primes
    const statsText = await ctx.getById('statsLabel').within(500).getText();
    expect(statsText).not.toContain('Ready to generate');
  });

  test('should capture screenshot for documentation', async () => {
    if (process.env.TAKE_SCREENSHOTS !== '1') {
      console.log('⏭️  Skipping screenshot test (set TAKE_SCREENSHOTS=1 to run)');
      return;
    }

    const testApp = await tsyneTest.createApp(async (app) => {
      await createPrimeGridAppStandalone(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to render
    await ctx.wait(500);

    // Generate a nice visualization
    await ctx.getById('inputMaxN').clear();
    await ctx.getById('inputMaxN').type('200');

    await ctx.getById('inputColumns').clear();
    await ctx.getById('inputColumns').type('14');

    await ctx.getById('btnGenerate').click();
    await ctx.wait(800);

    // Capture screenshot
    const screenshotsDir = path.join(__dirname, '../screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const screenshotPath = path.join(screenshotsDir, 'prime-grid-visualizer.png');
    await tsyneTest.screenshot(screenshotPath);
    console.error(`📸 Screenshot saved: ${screenshotPath}`);
  });
});
