/**
 * Slider Puzzle Integration Tests (CosyneTest)
 *
 * Tests interactions with the Cosyne canvas tiles and verifies
 * UI outcomes via the status label and game state.
 */

import { CosyneTest } from 'cosyne';
import { createSliderPuzzleApp, SliderPuzzleUI, BLANK } from './slider-puzzle';

describe('Slider Puzzle UI', () => {
  let cosyneTest: CosyneTest;

  beforeEach(async () => {
    cosyneTest = new CosyneTest({ headed: false });
  });

  afterEach(async () => {
    await cosyneTest.cleanup();
  });

  function createApp(): Promise<{ ui: SliderPuzzleUI }> {
    let ui!: SliderPuzzleUI;
    return cosyneTest.createApp((app) => {
      ui = createSliderPuzzleApp(app);
    }).then(async (testApp) => {
      const ctx = cosyneTest.getContext();
      await testApp.run();
      await ui.initialize();
      return { ui };
    });
  }

  // ---- Widget-level tests ----

  test('shows SOLVED! status on launch', async () => {
    await createApp();
    const ctx = cosyneTest.getContext();
    await ctx.getById('statusLabel').within(500).shouldBe('SOLVED!');
  }, 15000);

  test('scramble button clears solved status', async () => {
    await createApp();
    const ctx = cosyneTest.getContext();
    await ctx.getById('scrambleBtn').click();
    await ctx.getById('statusLabel').within(500).shouldBe(' ');
  }, 15000);

  test('solve button restores SOLVED! after scramble', async () => {
    await createApp();
    const ctx = cosyneTest.getContext();
    await ctx.getById('scrambleBtn').click();
    await ctx.getById('solveBtn').click();
    await ctx.getById('statusLabel').within(500).shouldBe('SOLVED!');
  }, 15000);

  // ---- Tile interaction tests (via game object) ----

  test('moving a tile breaks solved state', async () => {
    const { ui } = await createApp();
    const puzzle = ui.getPuzzle();
    const ctx = cosyneTest.getContext();

    // Board starts solved
    expect(puzzle.isSolved()).toBe(true);

    // Move tile 23 (left of blank at 24)
    puzzle.tryMove(23);

    expect(puzzle.isSolved()).toBe(false);
    await ctx.getById('statusLabel').within(500).shouldBe(' ');
  }, 15000);

  test('undoing a move restores solved state', async () => {
    const { ui } = await createApp();
    const puzzle = ui.getPuzzle();
    const ctx = cosyneTest.getContext();

    puzzle.tryMove(23); // blank moves to 23
    expect(puzzle.isSolved()).toBe(false);

    puzzle.tryMove(24); // blank moves back to 24
    expect(puzzle.isSolved()).toBe(true);
    await ctx.getById('statusLabel').within(500).shouldBe('SOLVED!');
  }, 15000);

  test('invalid move does not change board', async () => {
    const { ui } = await createApp();
    const puzzle = ui.getPuzzle();

    const boardBefore = [...puzzle.getBoard()];
    const moved = puzzle.tryMove(0); // not adjacent to blank

    expect(moved).toBe(false);
    expect([...puzzle.getBoard()]).toEqual(boardBefore);
  }, 15000);

  test('multi-step move sequence', async () => {
    const { ui } = await createApp();
    const puzzle = ui.getPuzzle();

    // Move blank from 24 → 23 → 22 → 17
    expect(puzzle.tryMove(23)).toBe(true);
    expect(puzzle.tryMove(22)).toBe(true);
    expect(puzzle.tryMove(17)).toBe(true);

    // Blank should now be at position 17
    expect(puzzle.getValue(17)).toBe(BLANK);
    expect(puzzle.isSolved()).toBe(false);
  }, 15000);

  test('scramble then solve resets board completely', async () => {
    const { ui } = await createApp();
    const puzzle = ui.getPuzzle();
    const ctx = cosyneTest.getContext();

    puzzle.scramble();
    expect(puzzle.isSolved()).toBe(false);
    await ctx.getById('statusLabel').within(500).shouldBe(' ');

    puzzle.solve();
    expect(puzzle.isSolved()).toBe(true);
    await ctx.getById('statusLabel').within(500).shouldBe('SOLVED!');

    // Verify every tile is in correct position
    const board = puzzle.getBoard();
    for (let i = 0; i < board.length; i++) {
      expect(board[i]).toBe(i);
    }
  }, 15000);

  test('scrambled board preserves all tile values', async () => {
    const { ui } = await createApp();
    const puzzle = ui.getPuzzle();

    puzzle.scramble();
    const board = [...puzzle.getBoard()].sort((a, b) => a - b);
    for (let i = 0; i < board.length; i++) {
      expect(board[i]).toBe(i);
    }
  }, 15000);

  test('tile labels update after moves', async () => {
    const { ui } = await createApp();
    const puzzle = ui.getPuzzle();

    // Tile at index 23 has value 23 = 'X', blank at 24
    expect(puzzle.getLabel(puzzle.getValue(23))).toBe('X');
    expect(puzzle.getLabel(puzzle.getValue(24))).toBe('');

    // After moving tile 23, it swaps with blank
    puzzle.tryMove(23);
    expect(puzzle.getLabel(puzzle.getValue(23))).toBe(''); // now blank
    expect(puzzle.getLabel(puzzle.getValue(24))).toBe('X'); // tile moved here
  }, 15000);

  test('reverse a 3-move sequence to restore solved', async () => {
    const { ui } = await createApp();
    const puzzle = ui.getPuzzle();
    const ctx = cosyneTest.getContext();

    // Forward
    puzzle.tryMove(23); // blank: 24→23
    puzzle.tryMove(22); // blank: 23→22
    puzzle.tryMove(17); // blank: 22→17

    expect(puzzle.isSolved()).toBe(false);

    // Reverse
    puzzle.tryMove(22); // blank: 17→22
    puzzle.tryMove(23); // blank: 22→23
    puzzle.tryMove(24); // blank: 23→24

    expect(puzzle.isSolved()).toBe(true);
    await ctx.getById('statusLabel').within(500).shouldBe('SOLVED!');
  }, 15000);
});
