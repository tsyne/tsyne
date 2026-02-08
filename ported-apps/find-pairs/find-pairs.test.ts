/**
 * Find Pairs Integration Tests (CosyneTest)
 *
 * Tests interactions with the Cosyne canvas tiles and verifies
 * UI outcomes via the status label and game state.
 */

import { CosyneTest } from 'cosyne';
import { createFindPairsApp, FindPairsUI, FindPairsGame, MATCH_SCORE, MISMATCH_PENALTY, TILE_COUNT } from './find-pairs';

describe('Find Pairs UI', () => {
  let cosyneTest: CosyneTest;

  beforeEach(async () => {
    cosyneTest = new CosyneTest({ headed: false });
  });

  afterEach(async () => {
    await cosyneTest.cleanup();
  });

  function createApp(): Promise<{ ui: FindPairsUI }> {
    let ui!: FindPairsUI;
    return cosyneTest.createApp((app) => {
      ui = createFindPairsApp(app);
    }).then(async (testApp) => {
      await testApp.run();
      await ui.initialize();
      return { ui };
    });
  }

  // ---- Widget-level tests ----

  test('shows initial score', async () => {
    await createApp();
    const ctx = cosyneTest.getContext();
    await ctx.getById('statusLabel').within(500).shouldBe('Score: 0');
  }, 15000);

  test('buttons exist', async () => {
    await createApp();
    const ctx = cosyneTest.getContext();
    await ctx.getById('newGameBtn').within(500).shouldExist();
    await ctx.getById('peekBtn').within(500).shouldExist();
  }, 15000);

  test('new game resets score', async () => {
    const { ui } = await createApp();
    const game = ui.getPuzzle();
    const ctx = cosyneTest.getContext();

    // Make a match to get some score
    const pair = findPair(game);
    game.tryClick(pair[0]);
    game.tryClick(pair[1]);
    expect(game.getScore()).toBe(MATCH_SCORE);

    await ctx.getById('newGameBtn').click();
    await ctx.getById('statusLabel').within(500).shouldBe('Score: 0');
  }, 15000);

  test('peek shows WINNER!', async () => {
    await createApp();
    const ctx = cosyneTest.getContext();
    await ctx.getById('peekBtn').click();
    await ctx.getById('statusLabel').within(500).shouldBe('WINNER! Score: 0');
  }, 15000);

  // ---- Game interaction tests ----

  test('matching a pair awards points', async () => {
    const { ui } = await createApp();
    const game = ui.getPuzzle();
    const ctx = cosyneTest.getContext();

    const pair = findPair(game);
    game.tryClick(pair[0]);
    game.tryClick(pair[1]);

    expect(game.getState(pair[0])).toBe('matched');
    expect(game.getState(pair[1])).toBe('matched');
    await ctx.getById('statusLabel').within(500).shouldBe(`Score: ${MATCH_SCORE}`);
  }, 15000);

  test('mismatching penalizes and hides after flush', async () => {
    const { ui } = await createApp();
    const game = ui.getPuzzle();
    const ctx = cosyneTest.getContext();

    const mismatch = findMismatch(game);
    game.tryClick(mismatch[0]);
    game.tryClick(mismatch[1]);

    expect(game.isLocked()).toBe(true);
    await ctx.getById('statusLabel').within(500).shouldBe(`Score: -${MISMATCH_PENALTY}`);

    game.flushMismatchTimer();
    expect(game.getState(mismatch[0])).toBe('hidden');
    expect(game.getState(mismatch[1])).toBe('hidden');
    expect(game.isLocked()).toBe(false);
  }, 15000);

  test('winning shows WINNER! status', async () => {
    const { ui } = await createApp();
    const game = ui.getPuzzle();
    const ctx = cosyneTest.getContext();

    matchAll(game);
    expect(game.isWon()).toBe(true);

    const expectedScore = (TILE_COUNT / 2) * MATCH_SCORE;
    await ctx.getById('statusLabel').within(500).shouldBe(`WINNER! Score: ${expectedScore}`);
  }, 15000);

  test('scramble after winning resets everything', async () => {
    const { ui } = await createApp();
    const game = ui.getPuzzle();
    const ctx = cosyneTest.getContext();

    matchAll(game);
    expect(game.isWon()).toBe(true);

    game.scramble();
    expect(game.isWon()).toBe(false);
    expect(game.getScore()).toBe(0);
    await ctx.getById('statusLabel').within(500).shouldBe('Score: 0');
  }, 15000);

  test('multiple matches accumulate score', async () => {
    const { ui } = await createApp();
    const game = ui.getPuzzle();
    const ctx = cosyneTest.getContext();

    const pair1 = findPair(game);
    game.tryClick(pair1[0]);
    game.tryClick(pair1[1]);

    const pair2 = findPair(game);
    game.tryClick(pair2[0]);
    game.tryClick(pair2[1]);

    expect(game.getScore()).toBe(MATCH_SCORE * 2);
    await ctx.getById('statusLabel').within(500).shouldBe(`Score: ${MATCH_SCORE * 2}`);
  }, 15000);

  test('mixed matches and mismatches track score correctly', async () => {
    const { ui } = await createApp();
    const game = ui.getPuzzle();
    const ctx = cosyneTest.getContext();

    // Mismatch first
    const mismatch = findMismatch(game);
    game.tryClick(mismatch[0]);
    game.tryClick(mismatch[1]);
    game.flushMismatchTimer();

    // Then match
    const pair = findPair(game);
    game.tryClick(pair[0]);
    game.tryClick(pair[1]);

    const expected = MATCH_SCORE - MISMATCH_PENALTY;
    await ctx.getById('statusLabel').within(500).shouldBe(`Score: ${expected}`);
  }, 15000);
});

// ============================================================================
// Test helpers
// ============================================================================

function findPair(game: FindPairsGame): [number, number] {
  for (let i = 0; i < TILE_COUNT; i++) {
    if (game.getState(i) !== 'hidden') continue;
    for (let j = i + 1; j < TILE_COUNT; j++) {
      if (game.getState(j) !== 'hidden') continue;
      if (game.getValue(i) === game.getValue(j)) return [i, j];
    }
  }
  throw new Error('No matching pair found');
}

function findMismatch(game: FindPairsGame): [number, number] {
  for (let i = 0; i < TILE_COUNT; i++) {
    if (game.getState(i) !== 'hidden') continue;
    for (let j = i + 1; j < TILE_COUNT; j++) {
      if (game.getState(j) !== 'hidden') continue;
      if (game.getValue(i) !== game.getValue(j)) return [i, j];
    }
  }
  throw new Error('No mismatching pair found');
}

function matchAll(game: FindPairsGame): void {
  const matched = new Set<number>();
  for (let i = 0; i < TILE_COUNT; i++) {
    if (matched.has(i)) continue;
    for (let j = i + 1; j < TILE_COUNT; j++) {
      if (matched.has(j)) continue;
      if (game.getValue(i) === game.getValue(j)) {
        game.tryClick(i);
        game.tryClick(j);
        matched.add(i);
        matched.add(j);
        break;
      }
    }
  }
}
