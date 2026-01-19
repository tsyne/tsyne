/**
 * Tests for 3D Draggable Chess demo
 */

import { TsyneTest } from '../../core/src/index-test';
import { buildDraggableChessApp } from './index';

describe('3D Draggable Chess', () => {
  let tsyneTest: TsyneTest;

  beforeEach(() => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  it('should create app without errors', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDraggableChessApp(app);
    });

    await testApp.run();
    const ctx = tsyneTest.getContext();

    // Verify status label exists
    await ctx.getById('status-label').shouldExist();

    // Verify snap checkbox exists
    await ctx.getById('snap-checkbox').shouldExist();

    // Verify reset button exists
    await ctx.getById('reset-btn').shouldExist();
  });

  it('should toggle snap-to-grid checkbox', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDraggableChessApp(app);
    });

    await testApp.run();
    const ctx = tsyneTest.getContext();

    // Click snap checkbox to toggle
    await ctx.getById('snap-checkbox').click();

    // Status should update
    await ctx.getById('status-label').within(500).shouldContain('Snap to grid');
  });

  it('should reset board when reset button clicked', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDraggableChessApp(app);
    });

    await testApp.run();
    const ctx = tsyneTest.getContext();

    // Click reset button
    await ctx.getById('reset-btn').click();

    // Status should update
    await ctx.getById('status-label').within(500).shouldContain('Board reset');
  });
});
