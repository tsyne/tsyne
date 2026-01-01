/**
 * Peg Solitaire Integration Tests
 */

import { TsyneTest } from '../../core/src/index-test';
import { createPegSolitaireApp } from './peg-solitaire';

describe('Peg Solitaire UI', () => {
  let tsyneTest: TsyneTest;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('app launches with board rendered', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPegSolitaireApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Center cell should exist
    await ctx.getById('cell-24').within(500).shouldExist();
  }, 15000);

  test('control buttons exist', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPegSolitaireApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('resetBtn').within(500).shouldExist();
    await ctx.getById('undoBtn').within(500).shouldExist();
    await ctx.getById('statusLabel').within(500).shouldExist();
  }, 15000);

  test('initial status shows 32 pegs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPegSolitaireApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(500).shouldBe('Pegs: 32');
  }, 15000);

  test('clicking cell works', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPegSolitaireApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('cell-10').click();
    // Selection should work (no error = success)
    await ctx.getById('cell-10').shouldExist();
  }, 15000);

  test('making a move decreases peg count', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPegSolitaireApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Jump from 10 over 17 to center (24)
    await ctx.getById('cell-10').click();
    await ctx.getById('cell-24').click();

    await ctx.getById('statusLabel').within(500).shouldBe('Pegs: 31');
  }, 15000);

  test('reset restores initial state', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPegSolitaireApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Make a move
    await ctx.getById('cell-10').click();
    await ctx.getById('cell-24').click();
    await ctx.getById('statusLabel').within(500).shouldBe('Pegs: 31');

    // Reset
    await ctx.getById('resetBtn').click();
    await ctx.getById('statusLabel').within(500).shouldBe('Pegs: 32');
  }, 15000);

  test('undo restores previous state', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPegSolitaireApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Make a move
    await ctx.getById('cell-10').click();
    await ctx.getById('cell-24').click();
    await ctx.getById('statusLabel').within(500).shouldBe('Pegs: 31');

    // Undo
    await ctx.getById('undoBtn').click();
    await ctx.getById('statusLabel').within(500).shouldBe('Pegs: 32');
  }, 15000);
});
