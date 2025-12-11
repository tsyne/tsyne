/**
 * Minefield Game Tests
 */

import { TsyneTest } from '../../core/src/index-test';
import { createMinefieldApp, MinefieldGame, BEGINNER_SETTINGS, INTERMEDIATE_SETTINGS, EXPERT_SETTINGS } from './minefield';

describe('MinefieldGame Logic', () => {
  let game: MinefieldGame;

  beforeEach(() => {
    game = new MinefieldGame();
  });

  describe('initialization', () => {
    it('should start with default settings', () => {
      expect(game.getWidth()).toBe(8);
      expect(game.getHeight()).toBe(8);
      expect(game.getTotalCells()).toBe(64);
    });

    it('should not be game over initially', () => {
      expect(game.isGameOver()).toBe(false);
      expect(game.hasWon()).toBe(false);
    });

    it('should have all cells unrevealed initially', () => {
      for (let i = 0; i < game.getTotalCells(); i++) {
        expect(game.getCellDisplay(i)).toBe('b');
      }
    });
  });

  describe('setDifficulty', () => {
    it('should set beginner difficulty', () => {
      game.setDifficulty(BEGINNER_SETTINGS.width, BEGINNER_SETTINGS.height, BEGINNER_SETTINGS.mines);
      expect(game.getWidth()).toBe(8);
      expect(game.getHeight()).toBe(8);
      expect(game.getTotalCells()).toBe(64);
    });

    it('should set intermediate difficulty', () => {
      game.setDifficulty(INTERMEDIATE_SETTINGS.width, INTERMEDIATE_SETTINGS.height, INTERMEDIATE_SETTINGS.mines);
      expect(game.getWidth()).toBe(16);
      expect(game.getHeight()).toBe(16);
      expect(game.getTotalCells()).toBe(256);
    });

    it('should set expert difficulty', () => {
      game.setDifficulty(EXPERT_SETTINGS.width, EXPERT_SETTINGS.height, EXPERT_SETTINGS.mines);
      expect(game.getWidth()).toBe(30);
      expect(game.getHeight()).toBe(16);
      expect(game.getTotalCells()).toBe(480);
    });
  });

  describe('first click', () => {
    it('should initialize board on first click', () => {
      // First click should always be safe
      const result = game.leftClick(0);
      expect(result).toBe(true);
      // After first click, cell should be revealed
      expect(game.getCellDisplay(0)).toBe('r');
      // Should not hit a mine on first click
      expect(game.isGameOver()).toBe(false);
    });

    it('should reveal multiple cells if clicking on blank', () => {
      // Click on first cell
      game.leftClick(0);
      // At least one cell should be revealed
      let revealedCount = 0;
      for (let i = 0; i < game.getTotalCells(); i++) {
        if (game.getCellDisplay(i) === 'r') {
          revealedCount++;
        }
      }
      expect(revealedCount).toBeGreaterThan(0);
    });
  });

  describe('flagging', () => {
    it('should not allow flagging before first click', () => {
      const result = game.rightClick(0);
      expect(result).toBe(false);
      expect(game.getCellDisplay(0)).toBe('b');
    });

    it('should allow flagging after first click', () => {
      game.leftClick(0);
      // Find an unrevealed cell
      let unrevealed = -1;
      for (let i = 0; i < game.getTotalCells(); i++) {
        if (game.getCellDisplay(i) === 'b') {
          unrevealed = i;
          break;
        }
      }
      if (unrevealed >= 0) {
        const result = game.rightClick(unrevealed);
        expect(result).toBe(true);
        expect(game.getCellDisplay(unrevealed)).toBe('f');
      }
    });

    it('should unflag a flagged cell', () => {
      game.leftClick(0);
      // Find an unrevealed cell
      let unrevealed = -1;
      for (let i = 0; i < game.getTotalCells(); i++) {
        if (game.getCellDisplay(i) === 'b') {
          unrevealed = i;
          break;
        }
      }
      if (unrevealed >= 0) {
        game.rightClick(unrevealed); // Flag it
        expect(game.getCellDisplay(unrevealed)).toBe('f');
        game.rightClick(unrevealed); // Unflag it
        expect(game.getCellDisplay(unrevealed)).toBe('b');
      }
    });
  });

  describe('mine counting', () => {
    it('should track remaining mines', () => {
      game.leftClick(0);
      const initial = game.getRemainingMines();
      expect(initial).toBe(10); // Beginner has 10 mines

      // Find and flag an unrevealed cell
      for (let i = 0; i < game.getTotalCells(); i++) {
        if (game.getCellDisplay(i) === 'b') {
          game.rightClick(i);
          break;
        }
      }
      expect(game.getRemainingMines()).toBe(9);
    });
  });

  describe('reset', () => {
    it('should reset the game state', () => {
      game.leftClick(0);
      game.reset();

      expect(game.isGameOver()).toBe(false);
      expect(game.hasWon()).toBe(false);
      for (let i = 0; i < game.getTotalCells(); i++) {
        expect(game.getCellDisplay(i)).toBe('b');
      }
    });
  });
});

describe('Minefield UI', () => {
  let tsyneTest: TsyneTest;

  beforeAll(() => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  it('should create the app with difficulty buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMinefieldApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Check difficulty buttons exist
    await ctx.getByID('beginnerBtn').shouldExist();
    await ctx.getByID('intermediateBtn').shouldExist();
    await ctx.getByID('expertBtn').shouldExist();

    // Check status label exists
    await ctx.getByID('statusLabel').shouldExist();
  }, 30000);

  it('should show Playing status initially', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMinefieldApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('statusLabel').within(500).shouldBe('Playing');
  }, 30000);

  it('should have New Game button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMinefieldApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('newGameBtn').shouldExist();
  }, 30000);
});
