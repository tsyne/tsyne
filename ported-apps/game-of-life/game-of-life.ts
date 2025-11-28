/**
 * Conway's Game of Life for Tsyne
 *
 * Ported from https://github.com/fyne-io/life
 * Original authors: Fyne.io contributors
 * License: See original repository
 *
 * Conway's Game of Life is a cellular automaton devised by mathematician John Conway.
 * This is a simplified port to demonstrate simulation capabilities in Tsyne.
 * The original implementation uses Fyne's custom canvas widgets for rendering.
 * This version adapts the concepts to work with Tsyne's declarative API.
 */

import { app } from '../../src';
import type { App } from '../../src/app';
import type { Window } from '../../src/window';

/**
 * Board representing the Game of Life grid
 * Based on: board.go
 */
class Board {
  private currentGen: boolean[][];
  private nextGen: boolean[][];
  private generation: number = 0;

  constructor(
    public width: number,
    public height: number
  ) {
    this.currentGen = this.createGrid(width, height);
    this.nextGen = this.createGrid(width, height);
  }

  /**
   * Create a new grid filled with dead cells
   */
  private createGrid(width: number, height: number): boolean[][] {
    const grid: boolean[][] = [];
    for (let y = 0; y < height; y++) {
      grid[y] = [];
      for (let x = 0; x < width; x++) {
        grid[y][x] = false;
      }
    }
    return grid;
  }

  /**
   * Check if a cell at position (x, y) is alive
   * Handles boundary conditions by returning false for out-of-bounds
   */
  private isAlive(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    return this.currentGen[y][x];
  }

  /**
   * Count the number of alive neighbors around a cell
   * Based on: board.go countNeighbours()
   */
  private countNeighbours(x: number, y: number): number {
    let count = 0;

    // Check all 8 neighbors
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue; // Skip the cell itself
        if (this.isAlive(x + dx, y + dy)) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Compute the next generation based on Conway's rules
   * Based on: board.go computeNextGen()
   *
   * Rules:
   * - Any live cell with 2 or 3 live neighbors survives
   * - Any dead cell with exactly 3 live neighbors becomes alive
   * - All other cells die or stay dead
   */
  private computeNextGen(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const neighbors = this.countNeighbours(x, y);
        const alive = this.currentGen[y][x];

        if (alive) {
          // Live cell: survives with 2 or 3 neighbors
          this.nextGen[y][x] = (neighbors === 2 || neighbors === 3);
        } else {
          // Dead cell: becomes alive with exactly 3 neighbors
          this.nextGen[y][x] = (neighbors === 3);
        }
      }
    }
  }

  /**
   * Advance to the next generation
   * Based on: board.go nextGen()
   */
  advance(): void {
    this.computeNextGen();
    // Swap current and next generation
    [this.currentGen, this.nextGen] = [this.nextGen, this.currentGen];
    this.generation++;
  }

  /**
   * Get the current state of a cell
   */
  getCell(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    return this.currentGen[y][x];
  }

  /**
   * Set the state of a cell
   */
  setCell(x: number, y: number, alive: boolean): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    this.currentGen[y][x] = alive;
  }

  /**
   * Toggle a cell's state
   */
  toggleCell(x: number, y: number): void {
    this.setCell(x, y, !this.getCell(x, y));
  }

  /**
   * Clear the board
   */
  clear(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.currentGen[y][x] = false;
      }
    }
    this.generation = 0;
  }

  /**
   * Load a predefined pattern
   * Based on: board.go load()
   * Loads a Gosper Glider Gun pattern
   */
  loadGliderGun(): void {
    this.clear();

    // Gosper Glider Gun pattern
    const pattern = [
      [1, 5], [1, 6], [2, 5], [2, 6],
      [11, 5], [11, 6], [11, 7],
      [12, 4], [12, 8],
      [13, 3], [13, 9],
      [14, 3], [14, 9],
      [15, 6],
      [16, 4], [16, 8],
      [17, 5], [17, 6], [17, 7],
      [18, 6],
      [21, 3], [21, 4], [21, 5],
      [22, 3], [22, 4], [22, 5],
      [23, 2], [23, 6],
      [25, 1], [25, 2], [25, 6], [25, 7],
      [35, 3], [35, 4], [36, 3], [36, 4]
    ];

    pattern.forEach(([x, y]) => {
      this.setCell(x, y, true);
    });
  }

  /**
   * Get current generation number
   */
  getGeneration(): number {
    return this.generation;
  }

  /**
   * Get board dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Get all cells as a string for display
   */
  toString(): string {
    let result = '';
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        result += this.currentGen[y][x] ? '█' : '·';
      }
      result += '\n';
    }
    return result;
  }
}

/**
 * Game controller managing the simulation
 * Based on: game.go
 */
class GameOfLife {
  private board: Board;
  private running: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private updateCallback?: () => void;

  constructor(width: number = 50, height: number = 40) {
    this.board = new Board(width, height);
    this.board.loadGliderGun();
  }

  /**
   * Start the simulation
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    // Run at approximately 6 FPS like the original
    this.intervalId = setInterval(() => {
      this.tick();
    }, 166); // ~6 FPS
  }

  /**
   * Pause the simulation
   */
  pause(): void {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Toggle pause/play
   */
  togglePause(): void {
    if (this.running) {
      this.pause();
    } else {
      this.start();
    }
  }

  /**
   * Advance one generation
   */
  tick(): void {
    this.board.advance();
    if (this.updateCallback) {
      this.updateCallback();
    }
  }

  /**
   * Reset the board
   */
  reset(): void {
    this.pause();
    this.board.clear();
    this.board.loadGliderGun();
    if (this.updateCallback) {
      this.updateCallback();
    }
  }

  /**
   * Clear the board
   */
  clear(): void {
    this.pause();
    this.board.clear();
    if (this.updateCallback) {
      this.updateCallback();
    }
  }

  /**
   * Toggle a cell at position
   */
  toggleCell(x: number, y: number): void {
    this.board.toggleCell(x, y);
    if (this.updateCallback) {
      this.updateCallback();
    }
  }

  /**
   * Set update callback for UI refresh
   */
  setUpdateCallback(callback: () => void): void {
    this.updateCallback = callback;
  }

  /**
   * Get current generation
   */
  getGeneration(): number {
    return this.board.getGeneration();
  }

  /**
   * Get board state as string
   */
  getBoardState(): string {
    return this.board.toString();
  }

  /**
   * Check if game is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get board dimensions
   */
  getDimensions(): { width: number; height: number } {
    return this.board.getDimensions();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.pause();
  }
}

/**
 * Game of Life UI
 */
class GameOfLifeUI {
  private game: GameOfLife;
  private generationLabel: any = null;
  private statusLabel: any = null;
  private boardLabel: any = null;

  constructor(private a: App) {
    this.game = new GameOfLife(50, 40);
    this.game.setUpdateCallback(() => this.updateDisplay());
  }

  buildUI(win: Window): void {
    this.a.vbox(() => {
      // Toolbar
      this.a.toolbar([
        this.a.toolbarAction('Start', () => this.start()),
        this.a.toolbarAction('Pause', () => this.pause()),
        this.a.toolbarAction('Step', () => this.step()),
        this.a.toolbarAction('Reset', () => this.reset()),
        this.a.toolbarAction('Clear', () => this.clear())
      ]);

      // Status
      this.a.hbox(() => {
        this.generationLabel = this.a.label('Generation: 0');
        this.statusLabel = this.a.label('Status: Paused');
      });

      this.a.separator();

      // Board display (simplified text view)
      this.a.scroll(() => {
        this.a.vbox(() => {
          this.a.label('Board (█ = alive, · = dead):');
          this.boardLabel = this.a.label(this.game.getBoardState());
        });
      });

      // Instructions
      this.a.separator();
      this.a.label('Conway\'s Game of Life - Loaded with Gosper Glider Gun');
    });
  }

  private start(): void {
    this.game.start();
    this.updateStatus();
  }

  private pause(): void {
    this.game.pause();
    this.updateStatus();
  }

  private step(): void {
    this.game.tick();
    this.updateDisplay();
  }

  private reset(): void {
    this.game.reset();
    this.updateDisplay();
    this.updateStatus();
  }

  private clear(): void {
    this.game.clear();
    this.updateDisplay();
    this.updateStatus();
  }

  private async updateDisplay(): Promise<void> {
    if (this.generationLabel) {
      await this.generationLabel.setText(`Generation: ${this.game.getGeneration()}`);
    }
    if (this.boardLabel) {
      await this.boardLabel.setText(this.game.getBoardState());
    }
  }

  private async updateStatus(): Promise<void> {
    if (this.statusLabel) {
      const status = this.game.isRunning() ? 'Running' : 'Paused';
      await this.statusLabel.setText(`Status: ${status}`);
    }
  }

  cleanup(): void {
    this.game.destroy();
  }
}

/**
 * Create the Game of Life app
 * Based on: main.go
 */
export function createGameOfLifeApp(a: App): GameOfLifeUI {
  const ui = new GameOfLifeUI(a);

  // Register cleanup callback to stop the game timer before shutdown
  a.registerCleanup(() => ui.cleanup());

  a.window({ title: 'Game of Life', width: 800, height: 600 }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

/**
 * Main application entry point
 */
if (require.main === module) {
  app({ title: 'Game of Life' }, (a: App) => {
    createGameOfLifeApp(a);
  });
}
