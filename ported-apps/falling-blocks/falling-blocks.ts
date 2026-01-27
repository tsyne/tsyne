/**
 * Falling Blocks Game
 *
 * A faithful port of Falling Blocks from https://github.com/SanderKlootwijk/fallingblocks
 * Original author: Sander Klootwijk
 * License: GPL-3.0
 *
 * A Tetris-style falling blocks puzzle game where players stack
 * falling tetromino pieces to complete and clear rows.
 *
 * @tsyne-app:name Falling Blocks
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
 *   <rect x="2" y="14" width="4" height="4" fill="#FF6B6B" stroke="#333"/>
 *   <rect x="6" y="14" width="4" height="4" fill="#FF6B6B" stroke="#333"/>
 *   <rect x="6" y="18" width="4" height="4" fill="#FF6B6B" stroke="#333"/>
 *   <rect x="10" y="18" width="4" height="4" fill="#FF6B6B" stroke="#333"/>
 *   <rect x="14" y="18" width="4" height="4" fill="#4ECDC4" stroke="#333"/>
 *   <rect x="18" y="18" width="4" height="4" fill="#FFE66D" stroke="#333"/>
 *   <rect x="10" y="6" width="4" height="4" fill="#4ECDC4" stroke="#333"/>
 *   <rect x="10" y="10" width="4" height="4" fill="#4ECDC4" stroke="#333"/>
 * </svg>
 * SVG
 * @tsyne-app:category games
 * @tsyne-app:builder createFallingBlocksApp
 * @tsyne-app:args app,window,windowWidth,windowHeight
 */

import { app, resolveTransport  } from 'tsyne';
import type { App, Window, ITsyneWindow, Label, TappableCanvasRaster } from 'tsyne';

// ============================================================================
// Constants
// ============================================================================

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 20;
const CANVAS_WIDTH = BOARD_WIDTH * BLOCK_SIZE;
const CANVAS_HEIGHT = BOARD_HEIGHT * BLOCK_SIZE;

// Tetromino shapes (0-6)
// Each shape is defined as 4 rotation states, each containing 4 block positions
type BlockPosition = { col: number; row: number };
type RotationState = BlockPosition[];
type Shape = RotationState[];

const SHAPES: Shape[] = [
  // 0: I piece (cyan)
  [
    [{ col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 3, row: 1 }],
    [{ col: 2, row: 0 }, { col: 2, row: 1 }, { col: 2, row: 2 }, { col: 2, row: 3 }],
    [{ col: 0, row: 2 }, { col: 1, row: 2 }, { col: 2, row: 2 }, { col: 3, row: 2 }],
    [{ col: 1, row: 0 }, { col: 1, row: 1 }, { col: 1, row: 2 }, { col: 1, row: 3 }],
  ],
  // 1: J piece (blue)
  [
    [{ col: 0, row: 0 }, { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 }],
    [{ col: 1, row: 0 }, { col: 2, row: 0 }, { col: 1, row: 1 }, { col: 1, row: 2 }],
    [{ col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 2, row: 2 }],
    [{ col: 1, row: 0 }, { col: 1, row: 1 }, { col: 0, row: 2 }, { col: 1, row: 2 }],
  ],
  // 2: L piece (orange)
  [
    [{ col: 2, row: 0 }, { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 }],
    [{ col: 1, row: 0 }, { col: 1, row: 1 }, { col: 1, row: 2 }, { col: 2, row: 2 }],
    [{ col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 0, row: 2 }],
    [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 1, row: 1 }, { col: 1, row: 2 }],
  ],
  // 3: O piece (yellow)
  [
    [{ col: 1, row: 0 }, { col: 2, row: 0 }, { col: 1, row: 1 }, { col: 2, row: 1 }],
    [{ col: 1, row: 0 }, { col: 2, row: 0 }, { col: 1, row: 1 }, { col: 2, row: 1 }],
    [{ col: 1, row: 0 }, { col: 2, row: 0 }, { col: 1, row: 1 }, { col: 2, row: 1 }],
    [{ col: 1, row: 0 }, { col: 2, row: 0 }, { col: 1, row: 1 }, { col: 2, row: 1 }],
  ],
  // 4: S piece (green)
  [
    [{ col: 1, row: 0 }, { col: 2, row: 0 }, { col: 0, row: 1 }, { col: 1, row: 1 }],
    [{ col: 1, row: 0 }, { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 2, row: 2 }],
    [{ col: 1, row: 1 }, { col: 2, row: 1 }, { col: 0, row: 2 }, { col: 1, row: 2 }],
    [{ col: 0, row: 0 }, { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 1, row: 2 }],
  ],
  // 5: T piece (purple)
  [
    [{ col: 1, row: 0 }, { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 }],
    [{ col: 1, row: 0 }, { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 1, row: 2 }],
    [{ col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 1, row: 2 }],
    [{ col: 1, row: 0 }, { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 1, row: 2 }],
  ],
  // 6: Z piece (red)
  [
    [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 1, row: 1 }, { col: 2, row: 1 }],
    [{ col: 2, row: 0 }, { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 1, row: 2 }],
    [{ col: 0, row: 1 }, { col: 1, row: 1 }, { col: 1, row: 2 }, { col: 2, row: 2 }],
    [{ col: 1, row: 0 }, { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 0, row: 2 }],
  ],
];

// Colors for each shape
const SHAPE_COLORS: Array<{ r: number; g: number; b: number }> = [
  { r: 0, g: 255, b: 255 },    // I - cyan
  { r: 0, g: 0, b: 255 },      // J - blue
  { r: 255, g: 165, b: 0 },    // L - orange
  { r: 255, g: 255, b: 0 },    // O - yellow
  { r: 0, g: 255, b: 0 },      // S - green
  { r: 128, g: 0, b: 128 },    // T - purple
  { r: 255, g: 0, b: 0 },      // Z - red
];

type GameState = 'ready' | 'playing' | 'paused' | 'gameover';

// ============================================================================
// Game Logic
// ============================================================================

interface Piece {
  shape: number;      // 0-6
  rotation: number;   // 0-3
  col: number;        // Column position
  row: number;        // Row position
}

export class FallingBlocksGame {
  private board: (number | null)[][];  // Board grid, null = empty, number = shape index
  private currentPiece: Piece | null = null;
  private nextPiece: number = 0;
  private gameState: GameState = 'ready';
  private score: number = 0;
  private lines: number = 0;
  private level: number = 1;
  private dropInterval: number = 1000;
  private lastDrop: number = 0;
  private onUpdate?: () => void;
  private onGameEnd?: () => void;

  constructor() {
    this.board = [];
    this.initBoard();
  }

  /**
   * Initialize empty board
   */
  private initBoard(): void {
    this.board = [];
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      this.board[row] = [];
      for (let col = 0; col < BOARD_WIDTH; col++) {
        this.board[row][col] = null;
      }
    }
  }

  /**
   * Start a new game
   */
  startGame(): void {
    this.initBoard();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropInterval = 1000;
    this.nextPiece = Math.floor(Math.random() * 7);
    this.spawnPiece();
    this.gameState = 'playing';
    this.lastDrop = Date.now();
    this.onUpdate?.();
  }

  /**
   * Spawn a new piece at top
   */
  private spawnPiece(): void {
    this.currentPiece = {
      shape: this.nextPiece,
      rotation: 0,
      col: 3,
      row: 0,
    };
    this.nextPiece = Math.floor(Math.random() * 7);

    // Check if spawn position is blocked (game over)
    if (this.checkCollision(this.currentPiece.col, this.currentPiece.row, this.currentPiece.rotation)) {
      this.gameState = 'gameover';
      this.onGameEnd?.();
    }
  }

  /**
   * Check if piece collides at position
   */
  private checkCollision(col: number, row: number, rotation: number): boolean {
    if (!this.currentPiece) return false;

    const blocks = SHAPES[this.currentPiece.shape][rotation];
    for (const block of blocks) {
      const newCol = col + block.col;
      const newRow = row + block.row;

      if (newCol < 0 || newCol >= BOARD_WIDTH || newRow >= BOARD_HEIGHT) {
        return true;
      }
      if (newRow >= 0 && this.board[newRow][newCol] !== null) {
        return true;
      }
    }
    return false;
  }

  /**
   * Move piece left
   */
  moveLeft(): void {
    if (!this.currentPiece || this.gameState !== 'playing') return;
    if (!this.checkCollision(this.currentPiece.col - 1, this.currentPiece.row, this.currentPiece.rotation)) {
      this.currentPiece.col--;
      this.onUpdate?.();
    }
  }

  /**
   * Move piece right
   */
  moveRight(): void {
    if (!this.currentPiece || this.gameState !== 'playing') return;
    if (!this.checkCollision(this.currentPiece.col + 1, this.currentPiece.row, this.currentPiece.rotation)) {
      this.currentPiece.col++;
      this.onUpdate?.();
    }
  }

  /**
   * Rotate piece clockwise
   */
  rotate(): void {
    if (!this.currentPiece || this.gameState !== 'playing') return;
    const newRotation = (this.currentPiece.rotation + 1) % 4;
    if (!this.checkCollision(this.currentPiece.col, this.currentPiece.row, newRotation)) {
      this.currentPiece.rotation = newRotation;
      this.onUpdate?.();
    }
  }

  /**
   * Soft drop (move down faster)
   */
  softDrop(): void {
    if (!this.currentPiece || this.gameState !== 'playing') return;
    if (!this.checkCollision(this.currentPiece.col, this.currentPiece.row + 1, this.currentPiece.rotation)) {
      this.currentPiece.row++;
      this.score += 1;
      this.onUpdate?.();
    }
  }

  /**
   * Hard drop (instant drop)
   */
  hardDrop(): void {
    if (!this.currentPiece || this.gameState !== 'playing') return;
    while (!this.checkCollision(this.currentPiece.col, this.currentPiece.row + 1, this.currentPiece.rotation)) {
      this.currentPiece.row++;
      this.score += 2;
    }
    this.lockPiece();
    this.onUpdate?.();
  }

  /**
   * Lock current piece to board
   */
  private lockPiece(): void {
    if (!this.currentPiece) return;

    const blocks = SHAPES[this.currentPiece.shape][this.currentPiece.rotation];
    for (const block of blocks) {
      const col = this.currentPiece.col + block.col;
      const row = this.currentPiece.row + block.row;
      if (row >= 0 && row < BOARD_HEIGHT && col >= 0 && col < BOARD_WIDTH) {
        this.board[row][col] = this.currentPiece.shape;
      }
    }

    this.clearLines();
    this.spawnPiece();
  }

  /**
   * Clear completed lines
   */
  private clearLines(): void {
    let linesCleared = 0;

    for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
      let complete = true;
      for (let col = 0; col < BOARD_WIDTH; col++) {
        if (this.board[row][col] === null) {
          complete = false;
          break;
        }
      }

      if (complete) {
        // Remove row and add empty row at top
        this.board.splice(row, 1);
        this.board.unshift(new Array(BOARD_WIDTH).fill(null));
        linesCleared++;
        row++; // Check same row again (it's now a different row)
      }
    }

    if (linesCleared > 0) {
      this.lines += linesCleared;
      // Score based on lines cleared at once
      const lineScores = [0, 100, 300, 500, 800];
      this.score += lineScores[linesCleared] * this.level;

      // Level up every 10 lines
      const newLevel = Math.floor(this.lines / 10) + 1;
      if (newLevel > this.level) {
        this.level = newLevel;
        this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
      }
    }
  }

  /**
   * Game tick (called regularly)
   */
  tick(): void {
    if (this.gameState !== 'playing' || !this.currentPiece) return;

    const now = Date.now();
    if (now - this.lastDrop >= this.dropInterval) {
      this.lastDrop = now;

      if (!this.checkCollision(this.currentPiece.col, this.currentPiece.row + 1, this.currentPiece.rotation)) {
        this.currentPiece.row++;
      } else {
        this.lockPiece();
      }
      this.onUpdate?.();
    }
  }

  /**
   * Toggle pause
   */
  togglePause(): void {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
      this.lastDrop = Date.now();
    }
    this.onUpdate?.();
  }

  // Getters
  getBoard(): (number | null)[][] { return this.board; }
  getCurrentPiece(): Piece | null { return this.currentPiece; }
  getNextPiece(): number { return this.nextPiece; }
  getGameState(): GameState { return this.gameState; }
  getScore(): number { return this.score; }
  getLines(): number { return this.lines; }
  getLevel(): number { return this.level; }

  setOnUpdate(callback: () => void): void { this.onUpdate = callback; }
  setOnGameEnd(callback: () => void): void { this.onGameEnd = callback; }
}

// ============================================================================
// UI Class
// ============================================================================

// Preview canvas size (4x4 blocks)
const PREVIEW_SIZE = 4 * BLOCK_SIZE; // 80 pixels

export class FallingBlocksUI {
  private game: FallingBlocksGame;
  private a: App;
  private win: Window | null = null;
  private canvas: TappableCanvasRaster | null = null;
  private nextCanvas: TappableCanvasRaster | null = null;
  private scoreLabel: Label | null = null;
  private linesLabel: Label | null = null;
  private levelLabel: Label | null = null;
  private statusLabel: Label | null = null;
  private gameLoop: NodeJS.Timeout | null = null;

  constructor(a: App) {
    this.a = a;
    this.game = new FallingBlocksGame();
    this.game.setOnUpdate(() => this.render());
    this.game.setOnGameEnd(() => this.handleGameEnd());
  }

  setupWindow(win: Window): void {
    this.win = win;
    win.setMainMenu([
      {
        label: 'Game',
        items: [
          { label: 'New Game', onSelected: () => this.startGame() },
          { label: 'Pause/Resume', onSelected: () => this.game.togglePause() },
          { label: '', isSeparator: true },
          { label: 'Exit', onSelected: () => process.exit(0) },
        ],
      },
      {
        label: 'Help',
        items: [
          { label: 'Controls', onSelected: () => this.showControls() },
          { label: 'About', onSelected: () => this.showAbout() },
        ],
      },
    ]);
  }

  buildContent(): void {
    this.a.vbox(() => {
      // Control buttons
      this.a.hbox(() => {
        this.a.button('New Game').onClick(() => this.startGame()).withId('newGameBtn');
        this.a.button('Pause').onClick(() => this.game.togglePause()).withId('pauseBtn');
      });

      // Status bar
      this.a.hbox(() => {
        this.a.label('Score: ');
        this.scoreLabel = this.a.label('0').withId('scoreLabel');
        this.a.label(' | Lines: ');
        this.linesLabel = this.a.label('0').withId('linesLabel');
        this.a.label(' | Level: ');
        this.levelLabel = this.a.label('1').withId('levelLabel');
      });

      this.a.separator();

      this.statusLabel = this.a.label('Press New Game to start').withId('statusLabel');

      // Game board and next piece preview side by side
      this.a.hbox(() => {
        // Main game board
        this.canvas = this.a.tappableCanvasRaster(CANVAS_WIDTH, CANVAS_HEIGHT, {
          onTap: (x) => this.handleTap(x),
          onKeyDown: (key) => this.handleKeyDown(key),
        });

        // Next piece panel
        this.a.vbox(() => {
          this.a.label('Next:');
          this.nextCanvas = this.a.tappableCanvasRaster(PREVIEW_SIZE, PREVIEW_SIZE, {});
        });
      });

      this.a.separator();

      // Controls
      this.a.hbox(() => {
        this.a.button('Left').onClick(() => this.game.moveLeft()).withId('leftBtn');
        this.a.button('Rotate').onClick(() => this.game.rotate()).withId('rotateBtn');
        this.a.button('Right').onClick(() => this.game.moveRight()).withId('rightBtn');
        this.a.button('Drop').onClick(() => this.game.hardDrop()).withId('dropBtn');
      });

      this.a.label('Arrow keys or WASD to move, Space to drop');
    });
  }

  private handleTap(x: number): void {
    if (this.game.getGameState() !== 'playing') return;
    const third = CANVAS_WIDTH / 3;
    if (x < third) {
      this.game.moveLeft();
    } else if (x > third * 2) {
      this.game.moveRight();
    } else {
      this.game.rotate();
    }
  }

  private handleKeyDown(key: string): void {
    // Handle keyboard controls
    switch (key) {
      case 'Left':
      case 'a':
      case 'A':
        this.game.moveLeft();
        break;
      case 'Right':
      case 'd':
      case 'D':
        this.game.moveRight();
        break;
      case 'Up':
      case 'w':
      case 'W':
        this.game.rotate();
        break;
      case 'Down':
      case 's':
      case 'S':
        this.game.softDrop();
        break;
      case 'Space':
      case ' ':
        this.game.hardDrop();
        break;
      case 'p':
      case 'P':
      case 'Escape':
        this.game.togglePause();
        break;
    }
  }

  private async startGame(): Promise<void> {
    this.game.startGame();
    if (this.statusLabel) await this.statusLabel.setText('Playing...');
    this.startGameLoop();
    await this.render();
    // Request focus so keyboard controls work immediately
    if (this.canvas) await this.canvas.requestFocus();
  }

  private startGameLoop(): void {
    if (this.gameLoop) clearInterval(this.gameLoop);
    this.gameLoop = setInterval(() => {
      this.game.tick();
    }, 50);
  }

  private async render(): Promise<void> {
    if (!this.canvas) return;

    // Use efficient buffer-based rendering (RGBA format)
    const buffer = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT * 4);
    const board = this.game.getBoard();
    const piece = this.game.getCurrentPiece();

    // Background - dark gray
    const bgColor = { r: 40, g: 40, b: 40 };
    for (let i = 0; i < CANVAS_WIDTH * CANVAS_HEIGHT; i++) {
      const offset = i * 4;
      buffer[offset] = bgColor.r;
      buffer[offset + 1] = bgColor.g;
      buffer[offset + 2] = bgColor.b;
      buffer[offset + 3] = 255;
    }

    // Draw grid (locked pieces)
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      for (let col = 0; col < BOARD_WIDTH; col++) {
        const cellValue = board[row][col];
        if (cellValue !== null) {
          this.drawBlockToBuffer(buffer, col, row, SHAPE_COLORS[cellValue]);
        }
      }
    }

    // Draw current piece
    if (piece) {
      const blocks = SHAPES[piece.shape][piece.rotation];
      const color = SHAPE_COLORS[piece.shape];
      for (const block of blocks) {
        const col = piece.col + block.col;
        const row = piece.row + block.row;
        if (row >= 0) {
          this.drawBlockToBuffer(buffer, col, row, color);
        }
      }
    }

    // Update canvas with buffer (much more efficient than setPixels)
    await this.canvas.setPixelBuffer(buffer);

    // Render next piece preview
    await this.renderNextPiece();

    // Update labels
    if (this.scoreLabel) await this.scoreLabel.setText(String(this.game.getScore()));
    if (this.linesLabel) await this.linesLabel.setText(String(this.game.getLines()));
    if (this.levelLabel) await this.levelLabel.setText(String(this.game.getLevel()));

    const state = this.game.getGameState();
    if (this.statusLabel) {
      if (state === 'paused') await this.statusLabel.setText('PAUSED');
      else if (state === 'gameover') await this.statusLabel.setText('GAME OVER');
      else if (state === 'playing') await this.statusLabel.setText('');
    }
  }

  private drawBlockToBuffer(
    buffer: Uint8Array,
    col: number, row: number,
    color: { r: number; g: number; b: number }
  ): void {
    const x0 = col * BLOCK_SIZE;
    const y0 = row * BLOCK_SIZE;

    for (let dy = 0; dy < BLOCK_SIZE; dy++) {
      for (let dx = 0; dx < BLOCK_SIZE; dx++) {
        const px = x0 + dx;
        const py = y0 + dy;
        if (px < 0 || px >= CANVAS_WIDTH || py < 0 || py >= CANVAS_HEIGHT) continue;

        // Border (darker shade)
        const isBorder = dx === 0 || dx === BLOCK_SIZE - 1 || dy === 0 || dy === BLOCK_SIZE - 1;
        const r = isBorder ? Math.floor(color.r * 0.6) : color.r;
        const g = isBorder ? Math.floor(color.g * 0.6) : color.g;
        const b = isBorder ? Math.floor(color.b * 0.6) : color.b;

        // Write directly to buffer (RGBA format, row-major order)
        const offset = (py * CANVAS_WIDTH + px) * 4;
        buffer[offset] = r;
        buffer[offset + 1] = g;
        buffer[offset + 2] = b;
        buffer[offset + 3] = 255;
      }
    }
  }

  /**
   * Render the next piece preview
   */
  private async renderNextPiece(): Promise<void> {
    if (!this.nextCanvas) return;

    const buffer = new Uint8Array(PREVIEW_SIZE * PREVIEW_SIZE * 4);
    const nextShape = this.game.getNextPiece();

    // Background - dark gray
    const bgColor = { r: 40, g: 40, b: 40 };
    for (let i = 0; i < PREVIEW_SIZE * PREVIEW_SIZE; i++) {
      const offset = i * 4;
      buffer[offset] = bgColor.r;
      buffer[offset + 1] = bgColor.g;
      buffer[offset + 2] = bgColor.b;
      buffer[offset + 3] = 255;
    }

    // Draw next piece (use rotation 0, centered in preview)
    const blocks = SHAPES[nextShape][0];
    const color = SHAPE_COLORS[nextShape];

    for (const block of blocks) {
      // Center the piece in the 4x4 preview area
      const px = block.col * BLOCK_SIZE;
      const py = block.row * BLOCK_SIZE;

      // Draw the block
      for (let dy = 0; dy < BLOCK_SIZE; dy++) {
        for (let dx = 0; dx < BLOCK_SIZE; dx++) {
          const x = px + dx;
          const y = py + dy;
          if (x < 0 || x >= PREVIEW_SIZE || y < 0 || y >= PREVIEW_SIZE) continue;

          // Border (darker shade)
          const isBorder = dx === 0 || dx === BLOCK_SIZE - 1 || dy === 0 || dy === BLOCK_SIZE - 1;
          const r = isBorder ? Math.floor(color.r * 0.6) : color.r;
          const g = isBorder ? Math.floor(color.g * 0.6) : color.g;
          const b = isBorder ? Math.floor(color.b * 0.6) : color.b;

          const offset = (y * PREVIEW_SIZE + x) * 4;
          buffer[offset] = r;
          buffer[offset + 1] = g;
          buffer[offset + 2] = b;
          buffer[offset + 3] = 255;
        }
      }
    }

    await this.nextCanvas.setPixelBuffer(buffer);
  }

  private async handleGameEnd(): Promise<void> {
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.win) {
      await this.win.showInfo('Game Over',
        `Final Score: ${this.game.getScore()}\n` +
        `Lines: ${this.game.getLines()}\n` +
        `Level: ${this.game.getLevel()}`
      );
    }
  }

  private async showControls(): Promise<void> {
    if (!this.win) return;
    await this.win.showInfo('Controls',
      'Keyboard:\n' +
      '- Left/Right arrows: Move piece\n' +
      '- Up arrow: Rotate\n' +
      '- Down arrow: Soft drop\n' +
      '- Space: Hard drop\n\n' +
      'Touch/Click:\n' +
      '- Tap left side: Move left\n' +
      '- Tap center: Rotate\n' +
      '- Tap right side: Move right\n' +
      '- Use Drop button for hard drop'
    );
  }

  private async showAbout(): Promise<void> {
    if (!this.win) return;
    await this.win.showInfo('About Falling Blocks',
      'Falling Blocks v1.0.0\n\n' +
      'A port of Falling Blocks from:\n' +
      'github.com/SanderKlootwijk/fallingblocks\n\n' +
      'Original author: Sander Klootwijk\n' +
      'License: GPL-3.0\n\n' +
      'Ported to Tsyne framework'
    );
  }

  async initialize(): Promise<void> {
    await this.render();
  }

  cleanup(): void {
    if (this.gameLoop) clearInterval(this.gameLoop);
  }
}

// ============================================================================
// App Factory
// ============================================================================

export function createFallingBlocksApp(a: App, win?: ITsyneWindow | null, windowWidth?: number, windowHeight?: number): FallingBlocksUI {
  const ui = new FallingBlocksUI(a);
  const isEmbedded = windowWidth !== undefined && windowHeight !== undefined;

  a.registerCleanup(() => ui.cleanup());

  if (win) {
    // PhoneTop/embedded mode with injected window
    ui.setupWindow(win as Window);
    win.setContent(() => ui.buildContent());
    win.show();
    setTimeout(() => ui.initialize(), 0);
  } else if (isEmbedded) {
    // PhoneTop/embedded mode: build content directly without a window
    ui.buildContent();
    setTimeout(() => ui.initialize(), 0);
  } else {
    // Standalone/desktop mode: create a window
    a.window({ title: 'Falling Blocks', width: 350, height: 600 }, (w: Window) => {
      ui.setupWindow(w);
      w.setContent(() => ui.buildContent());
      w.show();
      setTimeout(() => ui.initialize(), 0);
    });
  }

  return ui;
}

// Export for testing
export { SHAPES, SHAPE_COLORS, BOARD_WIDTH, BOARD_HEIGHT };

// Standalone entry point
if (require.main === module) {
  app(resolveTransport(), { title: 'Falling Blocks' }, async (a: App) => {
    const ui = createFallingBlocksApp(a);
    await a.run();
    await ui.initialize();
  });
}
