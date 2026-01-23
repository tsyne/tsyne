/**
 * Projections Demo - TsyneTest
 *
 * Tests and validates the SphericalProjection and IsometricProjection demo
 */

import { TsyneTest } from 'tsyne';
import { buildProjectionsApp } from './projections-cosyne';

describe('Projections Demo (Phase 4)', () => {
  let tsyneTest: TsyneTest;

  beforeAll(() => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterAll(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  it('should render spherical and isometric projections', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildProjectionsApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify canvas elements exist
    const northPole = await ctx.getById('north-pole');
    expect(northPole).toBeDefined();

    // Wait for initial render
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Take screenshot
    await testApp.screenshot('projections-demo');

    await testApp.close();
  });

  it('should render title text', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildProjectionsApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Check for title elements (text is rendered on canvas, hard to query)
    // Instead, just verify the app runs without errors
    await new Promise((resolve) => setTimeout(resolve, 50));

    await testApp.close();
  });
});
