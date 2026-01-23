/**
 * Minefield Game Tests
 */

import { TsyneTest, TestContext } from 'tsyne';
import {
  createMinefieldApp,
  MinefieldGame,
  BEGINNER_SETTINGS,
  INTERMEDIATE_SETTINGS,
  EXPERT_SETTINGS,
  DIFFICULTY_PRESETS,
} from './minefield';
import type { App } from 'tsyne';
import * as fs from 'fs';
import * as path from 'path';

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

    it('should support new difficulty presets', () => {
      game.selectDifficulty('intermediate');
      expect(game.getWidth()).toBe(DIFFICULTY_PRESETS.intermediate.width);
      expect(game.getHeight()).toBe(DIFFICULTY_PRESETS.intermediate.height);
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

  describe('cell state API', () => {
    it('should provide getCellState for new API', () => {
      expect(game.getCellState(0)).toBe('hidden');
      game.leftClick(0);
      expect(game.getCellState(0)).toBe('revealed');
    });

    it('should provide getCellSize', () => {
      expect(game.getCellSize()).toBe(DIFFICULTY_PRESETS.beginner.cellSize);
    });
  });
});

describe('Minefield UI', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  it('should create the app with difficulty buttons', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      createMinefieldApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Check difficulty buttons exist
    await ctx.getById('beginnerBtn').shouldExist();
    await ctx.getById('intermediateBtn').shouldExist();
    await ctx.getById('expertBtn').shouldExist();

    // Check status label exists
    await ctx.getById('statusLabel').shouldExist();
  }, 30000);

  it('should show Click to play status initially', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      createMinefieldApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    const status = await ctx.getById('statusLabel');
    const text = await status.getText();
    expect(text).toContain('Click to play');
  }, 30000);

  it('should have New Game button', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      createMinefieldApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    await ctx.getById('newGameBtn').shouldExist();
  }, 30000);

  it('should have mine count display', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      createMinefieldApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    const mineLabel = await ctx.getById('mineCountLabel');
    const text = await mineLabel.getText();
    expect(text).toContain('10'); // Beginner has 10 mines
  }, 30000);

  it('should take screenshot of initial state', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      createMinefieldApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    await tsyneTest.screenshot(path.join(screenshotDir, 'minefield-initial.png'));
  }, 30000);

  it('should take screenshot of gameplay in progress', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      createMinefieldApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Click on a few cells to start gameplay
    // Click on center-ish cells for better visual
    await ctx.getById('cell-27').click(); // Row 3, col 3
    await ctx.wait(300);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    await tsyneTest.screenshot(path.join(screenshotDir, 'minefield-gameplay.png'));
  }, 30000);
});
