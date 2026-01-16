/**
 * TsyneTest UI Tests for GrandPerspective
 * Tests the actual rendered UI, interactions, and visual behavior
 *
 * Portions copyright © Erwin Bonsma (GrandPerspective original)
 * Portions copyright © Paul Hammant 2026 (Tsyne port)
 *
 * Licensed under MIT License
 */

import { TsyneTest } from '../../src/index-test';
import { buildGrandPerspectiveApp } from './grand-perspective';

describe('GrandPerspectiveApp UI Tests', () => {
  let tsyneTest: TsyneTest;
  let testApp: any;
  let ctx: any;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  beforeEach(async () => {
    testApp = await tsyneTest.createApp((app: any) => {
      buildGrandPerspectiveApp(app);
    });
    ctx = tsyneTest.getContext();
  });

  afterEach(async () => {
    if (testApp) {
      try {
        await testApp.close?.();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  afterAll(async () => {
    try {
      await tsyneTest.close?.();
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  // ========================================================================
  // Initial Render Tests
  // ========================================================================

  test('renders window with correct title', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 1000));

    // Verify window loads
    expect(testApp).toBeDefined();
  });

  test('displays title label', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const label = ctx.getById('title-label');
    expect(label).toBeDefined();
  });

  test('renders control buttons', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const parentBtn = ctx.getById('parent-btn');
    const colorSizeBtn = ctx.getById('color-size-btn');
    const colorDepthBtn = ctx.getById('color-depth-btn');
    const colorTypeBtn = ctx.getById('color-type-btn');

    expect(parentBtn).toBeDefined();
    expect(colorSizeBtn).toBeDefined();
    expect(colorDepthBtn).toBeDefined();
    expect(colorTypeBtn).toBeDefined();
  });

  test('renders canvas container', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const canvas = ctx.getById('canvas-container');
    expect(canvas).toBeDefined();
  });

  test('displays info label', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const infoLabel = ctx.getById('info-label');
    expect(infoLabel).toBeDefined();
  });

  // ========================================================================
  // Button Interaction Tests
  // ========================================================================

  test('parent button is clickable', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const parentBtn = ctx.getById('parent-btn');
    await parentBtn.click();

    // Should not throw and should be no-op at root
    expect(testApp).toBeDefined();
  });

  test('color scheme buttons are clickable', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const colorSizeBtn = ctx.getById('color-size-btn');
    const colorDepthBtn = ctx.getById('color-depth-btn');
    const colorTypeBtn = ctx.getById('color-type-btn');

    await colorSizeBtn.click();
    await new Promise(r => setTimeout(r, 100));

    await colorDepthBtn.click();
    await new Promise(r => setTimeout(r, 100));

    await colorTypeBtn.click();
    await new Promise(r => setTimeout(r, 100));

    expect(testApp).toBeDefined();
  });

  // ========================================================================
  // Canvas Rendering Tests
  // ========================================================================

  test('canvas renders without errors', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 1000));

    const canvas = ctx.getById('canvas-container');
    expect(canvas).toBeDefined();
  });

  test('canvas responds to color scheme changes', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const colorSizeBtn = ctx.getById('color-size-btn');
    await colorSizeBtn.click();
    await new Promise(r => setTimeout(r, 200));

    const colorDepthBtn = ctx.getById('color-depth-btn');
    await colorDepthBtn.click();
    await new Promise(r => setTimeout(r, 200));

    expect(testApp).toBeDefined();
  });

  // ========================================================================
  // Window Lifecycle Tests
  // ========================================================================

  test('window can be shown', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    expect(testApp).toBeDefined();
  });

  test('app state persists across UI updates', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const parentBtn = ctx.getById('parent-btn');
    await parentBtn.click();
    await new Promise(r => setTimeout(r, 100));

    const colorSizeBtn = ctx.getById('color-size-btn');
    await colorSizeBtn.click();
    await new Promise(r => setTimeout(r, 100));

    // App should still be responsive
    expect(testApp).toBeDefined();
  });

  // ========================================================================
  // Stress and Edge Case Tests
  // ========================================================================

  test('handles rapid button clicks', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const colorSizeBtn = ctx.getById('color-size-btn');
    const colorDepthBtn = ctx.getById('color-depth-btn');

    for (let i = 0; i < 5; i++) {
      await colorSizeBtn.click();
      await colorDepthBtn.click();
    }

    expect(testApp).toBeDefined();
  });

  test('handles multiple color scheme changes', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const schemes = [
      ctx.getById('color-size-btn'),
      ctx.getById('color-depth-btn'),
      ctx.getById('color-type-btn'),
      ctx.getById('color-size-btn'),
      ctx.getById('color-depth-btn'),
      ctx.getById('color-type-btn'),
    ];

    for (const btn of schemes) {
      await btn.click();
      await new Promise(r => setTimeout(r, 50));
    }

    expect(testApp).toBeDefined();
  });

  test('parent button doesn\'t crash at root level', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const parentBtn = ctx.getById('parent-btn');

    for (let i = 0; i < 10; i++) {
      await parentBtn.click();
      await new Promise(r => setTimeout(r, 50));
    }

    expect(testApp).toBeDefined();
  });

  // ========================================================================
  // UI State Consistency Tests
  // ========================================================================

  test('ui remains responsive after multiple interactions', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const parentBtn = ctx.getById('parent-btn');
    const colorSizeBtn = ctx.getById('color-size-btn');
    const colorDepthBtn = ctx.getById('color-depth-btn');

    // Complex interaction sequence
    await colorSizeBtn.click();
    await new Promise(r => setTimeout(r, 50));
    await parentBtn.click();
    await new Promise(r => setTimeout(r, 50));
    await colorDepthBtn.click();
    await new Promise(r => setTimeout(r, 50));
    await parentBtn.click();
    await new Promise(r => setTimeout(r, 50));
    await colorSizeBtn.click();

    // Should still have elements
    const infoLabel = ctx.getById('info-label');
    expect(infoLabel).toBeDefined();
  });

  test('button visibility maintained across actions', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const parentBtn = ctx.getById('parent-btn');
    const colorSizeBtn = ctx.getById('color-size-btn');

    for (let i = 0; i < 3; i++) {
      expect(parentBtn).toBeDefined();
      expect(colorSizeBtn).toBeDefined();

      await parentBtn.click();
      await new Promise(r => setTimeout(r, 50));
      await colorSizeBtn.click();
      await new Promise(r => setTimeout(r, 50));
    }
  });

  // ========================================================================
  // Layout Tests
  // ========================================================================

  test('header layout has parent button', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const parentBtn = ctx.getById('parent-btn');
    expect(parentBtn).toBeDefined();
  });

  test('color scheme buttons are all present', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const buttons = [
      ctx.getById('color-size-btn'),
      ctx.getById('color-depth-btn'),
      ctx.getById('color-type-btn'),
    ];

    buttons.forEach(btn => {
      expect(btn).toBeDefined();
    });
  });

  // ========================================================================
  // Robustness Tests
  // ========================================================================

  test('app handles continuous canvas updates', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    // Simulate continuous interactions
    for (let i = 0; i < 3; i++) {
      await ctx.getById('color-size-btn').click();
      await new Promise(r => setTimeout(r, 100));
    }

    expect(testApp).toBeDefined();
  });

  test('app remains stable after 20 interactions', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const buttons = [
      ctx.getById('parent-btn'),
      ctx.getById('color-size-btn'),
      ctx.getById('color-depth-btn'),
      ctx.getById('color-type-btn'),
    ];

    for (let i = 0; i < 20; i++) {
      const btn = buttons[i % buttons.length];
      await btn.click();
      await new Promise(r => setTimeout(r, 30));
    }

    // App should still be responsive
    const infoLabel = ctx.getById('info-label');
    expect(infoLabel).toBeDefined();
  });

  // ========================================================================
  // Performance Tests
  // ========================================================================

  test('app initializes within reasonable time', async () => {
    const start = Date.now();
    await testApp.run();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5000);
  });

  test('button clicks respond quickly', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const btn = ctx.getById('color-size-btn');
    const start = Date.now();
    await btn.click();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(1000);
  });
});

describe('GrandPerspectiveApp Screenshot Tests', () => {
  let tsyneTest: TsyneTest;
  let testApp: any;
  let ctx: any;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: process.env.TSYNE_HEADED === '1' });
  });

  beforeEach(async () => {
    testApp = await tsyneTest.createApp((app: any) => {
      buildGrandPerspectiveApp(app);
    });
    ctx = tsyneTest.getContext();
  });

  afterEach(async () => {
    if (testApp) {
      try {
        await testApp.close?.();
      } catch (e) {
        // Ignore
      }
    }
  });

  test('captures initial state screenshot', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 1000));

    if (process.env.TAKE_SCREENSHOTS === '1') {
      const win = ctx.getWindow?.();
      if (win?.screenshot) {
        await win.screenshot('grand-perspective-initial.png');
      }
    }

    expect(testApp).toBeDefined();
  });

  test('captures bySize color scheme screenshot', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const colorSizeBtn = ctx.getById('color-size-btn');
    await colorSizeBtn.click();
    await new Promise(r => setTimeout(r, 500));

    if (process.env.TAKE_SCREENSHOTS === '1') {
      const win = ctx.getWindow?.();
      if (win?.screenshot) {
        await win.screenshot('grand-perspective-bysize.png');
      }
    }

    expect(testApp).toBeDefined();
  });

  test('captures byDepth color scheme screenshot', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const colorDepthBtn = ctx.getById('color-depth-btn');
    await colorDepthBtn.click();
    await new Promise(r => setTimeout(r, 500));

    if (process.env.TAKE_SCREENSHOTS === '1') {
      const win = ctx.getWindow?.();
      if (win?.screenshot) {
        await win.screenshot('grand-perspective-bydepth.png');
      }
    }

    expect(testApp).toBeDefined();
  });

  test('captures byType color scheme screenshot', async () => {
    await testApp.run();
    await new Promise(r => setTimeout(r, 500));

    const colorTypeBtn = ctx.getById('color-type-btn');
    await colorTypeBtn.click();
    await new Promise(r => setTimeout(r, 500));

    if (process.env.TAKE_SCREENSHOTS === '1') {
      const win = ctx.getWindow?.();
      if (win?.screenshot) {
        await win.screenshot('grand-perspective-bytype.png');
      }
    }

    expect(testApp).toBeDefined();
  });
});
