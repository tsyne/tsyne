/**
 * Falling Blocks TsyneTest Integration Tests
 *
 * Tests the Falling Blocks game UI using the Tsyne testing framework.
 *
 * Usage:
 *   npm test ported-apps/falling-blocks/falling-blocks.test.ts
 *   TSYNE_HEADED=1 npm test ported-apps/falling-blocks/falling-blocks.test.ts  # Visual debugging
 *   TAKE_SCREENSHOTS=1 npm test ported-apps/falling-blocks/falling-blocks.test.ts  # Capture screenshots
 */

import { TsyneTest, TestContext } from 'tsyne';
import { createFallingBlocksApp, FallingBlocksUI, FallingBlocksGame, SHAPES } from './falling-blocks';
import * as path from 'path';
import * as fs from 'fs';

describe('Falling Blocks Integration Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial game UI with all elements', async () => {
    let ui: FallingBlocksUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingBlocksApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Verify control buttons
    await ctx.getById('newGameBtn').within(500).shouldExist();
    await ctx.getById('pauseBtn').within(500).shouldExist();

    // Verify status elements
    await ctx.getById('scoreLabel').within(500).shouldExist();
    await ctx.getById('linesLabel').within(500).shouldExist();
    await ctx.getById('levelLabel').within(500).shouldExist();
    await ctx.getById('statusLabel').within(500).shouldExist();
  });

  test('should display control buttons', async () => {
    let ui: FallingBlocksUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingBlocksApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Check game control buttons
    await ctx.getById('leftBtn').within(500).shouldExist();
    await ctx.getById('rotateBtn').within(500).shouldExist();
    await ctx.getById('rightBtn').within(500).shouldExist();
    await ctx.getById('dropBtn').within(500).shouldExist();
  });

  test('should have working New Game button', async () => {
    let ui: FallingBlocksUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingBlocksApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Click New Game
    await ctx.getById('newGameBtn').click();

    // Wait for game to start
    await ctx.wait(500);

    // Score should exist
    const score = await ctx.getById('scoreLabel').getText();
    expect(score).toBeDefined();
  });

  test('should have working Pause button', async () => {
    let ui: FallingBlocksUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingBlocksApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Start game first
    await ctx.getById('newGameBtn').click();
    await ctx.wait(200);

    // Click Pause - should not crash
    await ctx.getById('pauseBtn').click();

    // Status should show paused
    const status = await ctx.getById('statusLabel').getText();
    expect(status).toContain('PAUSED');
  });

  test('should update score display', async () => {
    let ui: FallingBlocksUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingBlocksApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Initial score should be 0
    await ctx.getById('scoreLabel').within(100).shouldBe('0');
    await ctx.getById('linesLabel').within(100).shouldBe('0');
    await ctx.getById('levelLabel').within(100).shouldBe('1');
  });

  test('should capture screenshot for documentation', async () => {
    let ui: FallingBlocksUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingBlocksApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Start game and wait for piece
    await ctx.getById('newGameBtn').click();
    await ctx.wait(1000);

    // Capture screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotsDir = path.join(__dirname, 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const screenshotPath = path.join(screenshotsDir, 'falling-blocks-gameplay.png');
      await tsyneTest.screenshot(screenshotPath);
      console.error(`Screenshot saved: ${screenshotPath}`);

      expect(fs.existsSync(screenshotPath)).toBe(true);
    }
  });
});

// ─── Keyboard-Driven Integration Tests ───────────────────────

describe('Falling Blocks — Keyboard', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  /** Helper: create the app, start a game via button click, and stop the loop. */
  async function setup(): Promise<{ ui: FallingBlocksUI; game: FallingBlocksGame }> {
    let ui: FallingBlocksUI = null as any;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingBlocksApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    return { ui: ui!, game: ui!.getGame() };
  }

  /** Start the game and immediately stop the loop for deterministic assertions. */
  async function startAndStopLoop(ui: FallingBlocksUI): Promise<void> {
    await ctx.getById('newGameBtn').click();
    await ctx.wait(100);
    ui.testStopLoop();
  }

  test("'Left' arrow moves piece left", async () => {
    const { ui, game } = await setup();
    await startAndStopLoop(ui);

    const startCol = game.getCurrentPiece()!.col;

    ui.testKeyDown('Left');
    await ctx.wait(50);

    expect(game.getCurrentPiece()!.col).toBe(startCol - 1);
  });

  test("'Right' arrow moves piece right", async () => {
    const { ui, game } = await setup();
    await startAndStopLoop(ui);

    const startCol = game.getCurrentPiece()!.col;

    ui.testKeyDown('Right');
    await ctx.wait(50);

    expect(game.getCurrentPiece()!.col).toBe(startCol + 1);
  });

  test("'Up' arrow rotates the piece", async () => {
    const { ui, game } = await setup();
    await startAndStopLoop(ui);

    const piece = game.getCurrentPiece()!;
    const startRotation = piece.rotation;
    const numRotations = SHAPES[piece.shape].length;

    ui.testKeyDown('Up');
    await ctx.wait(50);

    const expectedRotation = (startRotation + 1) % numRotations;
    expect(game.getCurrentPiece()!.rotation).toBe(expectedRotation);
  });

  test("'Down' arrow soft-drops the piece", async () => {
    const { ui, game } = await setup();
    await startAndStopLoop(ui);

    const startRow = game.getCurrentPiece()!.row;
    const startScore = game.getScore();

    ui.testKeyDown('Down');
    await ctx.wait(50);

    expect(game.getCurrentPiece()!.row).toBe(startRow + 1);
    expect(game.getScore()).toBe(startScore + 1);
  });

  test("'Space' hard-drops the piece", async () => {
    const { ui, game } = await setup();
    await startAndStopLoop(ui);

    const scoreBefore = game.getScore();

    ui.testKeyDown('Space');
    await ctx.wait(50);

    // Hard drop gives 2 points per row dropped; piece was at row 0 so score increases significantly
    expect(game.getScore()).toBeGreaterThan(scoreBefore);
    // Board should have locked blocks
    const board = game.getBoard();
    let hasBlocks = false;
    for (let row = 0; row < 20; row++) {
      for (let col = 0; col < 10; col++) {
        if (board[row][col] !== null) { hasBlocks = true; break; }
      }
      if (hasBlocks) break;
    }
    expect(hasBlocks).toBe(true);
  });

  test("'P' pauses and unpauses", async () => {
    const { ui, game } = await setup();
    await startAndStopLoop(ui);
    expect(game.getGameState()).toBe('playing');

    ui.testKeyDown('P');
    await ctx.wait(50);
    expect(game.getGameState()).toBe('paused');

    ui.testKeyDown('P');
    await ctx.wait(50);
    expect(game.getGameState()).toBe('playing');
  });

  test("'Escape' also pauses", async () => {
    const { ui, game } = await setup();
    await startAndStopLoop(ui);

    ui.testKeyDown('Escape');
    await ctx.wait(50);
    expect(game.getGameState()).toBe('paused');
  });

  test("WASD keys work as alternatives", async () => {
    const { ui, game } = await setup();
    await startAndStopLoop(ui);

    const startCol = game.getCurrentPiece()!.col;
    const startRow = game.getCurrentPiece()!.row;

    // 'a' = left
    ui.testKeyDown('a');
    await ctx.wait(50);
    expect(game.getCurrentPiece()!.col).toBe(startCol - 1);

    // 'd' = right
    ui.testKeyDown('d');
    await ctx.wait(50);
    expect(game.getCurrentPiece()!.col).toBe(startCol);

    // 's' = soft drop
    ui.testKeyDown('s');
    await ctx.wait(50);
    expect(game.getCurrentPiece()!.row).toBe(startRow + 1);

    // 'w' = rotate (just verify no crash, rotation may or may not change depending on piece)
    ui.testKeyDown('w');
    await ctx.wait(50);
    expect(game.getCurrentPiece()!.rotation).toBeGreaterThanOrEqual(0);
  });

  test("keys are ignored when paused", async () => {
    const { ui, game } = await setup();
    await startAndStopLoop(ui);

    // Pause
    ui.testKeyDown('P');
    await ctx.wait(50);
    expect(game.getGameState()).toBe('paused');

    const piece = game.getCurrentPiece()!;
    const col = piece.col;
    const row = piece.row;
    const rotation = piece.rotation;

    // All movement keys should be no-ops
    ui.testKeyDown('Left');
    ui.testKeyDown('Right');
    ui.testKeyDown('Up');
    ui.testKeyDown('Down');
    ui.testKeyDown('Space');
    await ctx.wait(50);

    expect(game.getCurrentPiece()!.col).toBe(col);
    expect(game.getCurrentPiece()!.row).toBe(row);
    expect(game.getCurrentPiece()!.rotation).toBe(rotation);
  });

  test("keys are ignored before game starts", async () => {
    const { ui, game } = await setup();
    // Don't start the game — state is 'ready'
    expect(game.getGameState()).toBe('ready');

    ui.testKeyDown('Left');
    ui.testKeyDown('Right');
    ui.testKeyDown('Up');
    ui.testKeyDown('Down');
    ui.testKeyDown('Space');
    await ctx.wait(50);

    expect(game.getGameState()).toBe('ready');
    expect(game.getCurrentPiece()).toBeNull();
  });
});
