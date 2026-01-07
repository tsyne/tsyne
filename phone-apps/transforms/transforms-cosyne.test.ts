/**
 * Transforms Demo - TsyneTest
 *
 * Tests and validates nested coordinate transformations
 */

import { TsyneTest } from '../../core/src/index-test';
import { buildTransformsApp } from './transforms-cosyne';

describe('Transforms Demo (Phase 5)', () => {
  let tsyneTest: TsyneTest;

  beforeAll(() => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterAll(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  it('should render nested coordinate transforms', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTransformsApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial render
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Take screenshot of initial state
    await testApp.screenshot('transforms-initial');

    await testApp.close();
  });

  it('should show rotating patterns', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTransformsApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for patterns to rotate
    await new Promise((resolve) => setTimeout(resolve, 300));
    await testApp.screenshot('transforms-rotated');

    // Wait more for further rotation
    await new Promise((resolve) => setTimeout(resolve, 500));
    await testApp.screenshot('transforms-more-rotated');

    await testApp.close();
  });

  it('should display all four pattern types', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildTransformsApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for render
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Take comprehensive screenshot showing all patterns
    await testApp.screenshot('transforms-all-patterns');

    await testApp.close();
  });
});
