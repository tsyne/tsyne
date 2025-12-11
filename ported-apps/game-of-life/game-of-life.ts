// @tsyne-app:name Game of Life
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="6" height="6" fill="currentColor"/><rect x="9" y="9" width="6" height="6" fill="currentColor"/><rect x="15" y="3" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><rect x="15" y="15" width="6" height="6" fill="currentColor"/></svg>
// @tsyne-app:category games
// @tsyne-app:builder createGameOfLifeApp

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
 *
 * Tsyne API features demonstrated:
 * - Main menu with File, View, Help operations
 * - File dialogs for pattern save/load
 * - Preferences for simulation speed
 * - Confirm dialogs for destructive operations
 * - About dialog
 * - Close intercept for running simulations
 */

import { app } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import * as fs from 'fs';

// Constants for preferences
const PREF_SPEED = 'life_speed';
const PREF_GRID_WIDTH = 'life_grid_width';
const PREF_GRID_HEIGHT = 'life_grid_height';
const DEFAULT_SPEED = 166;  // ms per generation (~6 FPS)
const MIN_SPEED = 10;       // 10ms = 100 gen/s max
const MAX_SPEED = 1000;

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
   * Get current generation board data
   */
  getCurrentGen(): boolean[][] {
    return this.currentGen;
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

  /**
   * Export pattern to RLE format (Run Length Encoded)
   * RLE is a common format for Game of Life patterns
   */
  toRLE(): string {
    const lines: string[] = [];
    lines.push(`#N Tsyne Game of Life Pattern`);
    lines.push(`#C Exported from Tsyne`);
    lines.push(`x = ${this.width}, y = ${this.height}, rule = B3/S23`);

    // Find bounding box of live cells
    let minX = this.width, maxX = 0, minY = this.height, maxY = 0;
    let hasLiveCells = false;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.currentGen[y][x]) {
          hasLiveCells = true;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (!hasLiveCells) {
      lines.push('!');
      return lines.join('\n');
    }

    // Encode the pattern
    let rle = '';
    for (let y = minY; y <= maxY; y++) {
      let runCount = 0;
      let lastState = false;

      for (let x = minX; x <= maxX; x++) {
        const state = this.currentGen[y][x];

        if (x === minX) {
          lastState = state;
          runCount = 1;
        } else if (state === lastState) {
          runCount++;
        } else {
          // Output the run
          const char = lastState ? 'o' : 'b';
          rle += runCount > 1 ? `${runCount}${char}` : char;
          lastState = state;
          runCount = 1;
        }
      }

      // Output final run of this row (only if live cells)
      if (lastState) {
        const char = 'o';
        rle += runCount > 1 ? `${runCount}${char}` : char;
      }

      // End of row ($ for intermediate rows, ! for last row)
      rle += y < maxY ? '$' : '!';
    }

    lines.push(rle);
    return lines.join('\n');
  }

  /**
   * Import pattern from RLE format
   */
  fromRLE(rle: string): void {
    this.clear();

    const lines = rle.split('\n');
    let patternData = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || trimmed.startsWith('x')) {
        continue; // Skip comments and header
      }
      patternData += trimmed;
    }

    // Parse the RLE data
    let x = 0;
    let y = 0;
    let runCount = '';

    for (const char of patternData) {
      if (char >= '0' && char <= '9') {
        runCount += char;
      } else if (char === 'b') {
        // Dead cells
        const count = runCount ? parseInt(runCount) : 1;
        x += count;
        runCount = '';
      } else if (char === 'o') {
        // Live cells
        const count = runCount ? parseInt(runCount) : 1;
        for (let i = 0; i < count; i++) {
          if (x < this.width && y < this.height) {
            this.setCell(x, y, true);
          }
          x++;
        }
        runCount = '';
      } else if (char === '$') {
        // End of row
        const count = runCount ? parseInt(runCount) : 1;
        y += count;
        x = 0;
        runCount = '';
      } else if (char === '!') {
        // End of pattern
        break;
      }
    }
  }

  /**
   * Load a predefined Blinker pattern
   */
  loadBlinker(): void {
    this.clear();
    const centerX = Math.floor(this.width / 2);
    const centerY = Math.floor(this.height / 2);
    this.setCell(centerX - 1, centerY, true);
    this.setCell(centerX, centerY, true);
    this.setCell(centerX + 1, centerY, true);
  }

  /**
   * Load a predefined Glider pattern
   */
  loadGlider(): void {
    this.clear();
    const pattern = [
      [1, 0], [2, 1], [0, 2], [1, 2], [2, 2]
    ];
    const offsetX = Math.floor(this.width / 4);
    const offsetY = Math.floor(this.height / 4);
    pattern.forEach(([x, y]) => {
      this.setCell(x + offsetX, y + offsetY, true);
    });
  }

  /**
   * Load a predefined Pulsar pattern
   */
  loadPulsar(): void {
    this.clear();
    const centerX = Math.floor(this.width / 2);
    const centerY = Math.floor(this.height / 2);

    // Pulsar is a period-3 oscillator
    const offsets = [
      [-6,-4],[-6,-3],[-6,-2],[-6,2],[-6,3],[-6,4],
      [-4,-6],[-3,-6],[-2,-6],[-4,-1],[-3,-1],[-2,-1],
      [-4,1],[-3,1],[-2,1],[-4,6],[-3,6],[-2,6],
      [-1,-4],[-1,-3],[-1,-2],[-1,2],[-1,3],[-1,4],
      [1,-4],[1,-3],[1,-2],[1,2],[1,3],[1,4],
      [2,-6],[3,-6],[4,-6],[2,-1],[3,-1],[4,-1],
      [2,1],[3,1],[4,1],[2,6],[3,6],[4,6],
      [6,-4],[6,-3],[6,-2],[6,2],[6,3],[6,4]
    ];

    offsets.forEach(([dx, dy]) => {
      const x = centerX + dx;
      const y = centerY + dy;
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        this.setCell(x, y, true);
      }
    });
  }

  /**
   * Randomize the board
   */
  randomize(density: number = 0.3): void {
    this.clear();
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (Math.random() < density) {
          this.setCell(x, y, true);
        }
      }
    }
    this.generation = 0;
  }

  /**
   * Count live cells
   */
  getLiveCellCount(): number {
    let count = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.currentGen[y][x]) count++;
      }
    }
    return count;
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
  private speed: number = DEFAULT_SPEED;

  constructor(width: number = 20, height: number = 20) {
    this.board = new Board(width, height);
    this.board.loadGliderGun();
  }

  /**
   * Start the simulation
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    this.intervalId = setInterval(() => {
      this.tick();
    }, this.speed);
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
   * Set simulation speed (ms per generation)
   */
  setSpeed(speedMs: number): void {
    this.speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speedMs));
    if (this.running) {
      // Restart with new speed
      this.pause();
      this.start();
    }
  }

  /**
   * Get current speed
   */
  getSpeed(): number {
    return this.speed;
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
   * Reset the board to Gosper Glider Gun
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
   * Get raw board data for canvas rendering
   */
  getBoardData(): boolean[][] {
    return this.board.getCurrentGen();
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
   * Get live cell count
   */
  getLiveCellCount(): number {
    return this.board.getLiveCellCount();
  }

  /**
   * Export pattern to RLE format
   */
  exportRLE(): string {
    return this.board.toRLE();
  }

  /**
   * Import pattern from RLE format
   */
  importRLE(rle: string): void {
    this.pause();
    this.board.fromRLE(rle);
    if (this.updateCallback) {
      this.updateCallback();
    }
  }

  /**
   * Load predefined patterns
   */
  loadPattern(name: string): void {
    this.pause();
    switch (name) {
      case 'glider':
        this.board.loadGlider();
        break;
      case 'blinker':
        this.board.loadBlinker();
        break;
      case 'pulsar':
        this.board.loadPulsar();
        break;
      case 'glider-gun':
        this.board.loadGliderGun();
        break;
      case 'random':
        this.board.randomize();
        break;
      default:
        this.board.loadGliderGun();
    }
    if (this.updateCallback) {
      this.updateCallback();
    }
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
  private a: App;
  private win: Window | null = null;
  private generationLabel: any = null;
  private statusLabel: any = null;
  private cellCountLabel: any = null;
  private speedLabel: any = null;
  private boardCanvas: any = null;
  private cellSize: number = 10;
  private currentFilePath: string | null = null;
  private lastBoardState: boolean[][] | null = null;

  constructor(a: App) {
    this.a = a;
    this.game = new GameOfLife(50, 40);
    this.game.setUpdateCallback(() => this.updateDisplay());
  }

  /**
   * Load preferences
   */
  private async loadPreferences(): Promise<void> {
    try {
      const speed = await this.a.getPreferenceInt(PREF_SPEED, DEFAULT_SPEED);
      // Handle undefined/null return value (bug in getPreferenceInt)
      const actualSpeed = (speed !== undefined && speed !== null && !isNaN(speed)) ? speed : DEFAULT_SPEED;
      this.game.setSpeed(actualSpeed);
    } catch (e) {
      console.warn('Failed to load preferences:', e);
    }
  }

  /**
   * Save preferences
   */
  private async savePreferences(): Promise<void> {
    try {
      await this.a.setPreference(PREF_SPEED, this.game.getSpeed().toString());
    } catch (e) {
      console.warn('Failed to save preferences:', e);
    }
  }

  /**
   * Build main menu
   */
  private buildMainMenu(win: Window): void {
    win.setMainMenu([
      {
        label: 'File',
        items: [
          { label: 'Open Pattern...', onSelected: () => this.openPattern() },
          { label: 'Save Pattern...', onSelected: () => this.savePattern() },
          { label: '', isSeparator: true },
          { label: 'Exit', onSelected: () => this.exitWithConfirm() }
        ]
      },
      {
        label: 'Patterns',
        items: [
          { label: 'Gosper Glider Gun', onSelected: () => this.loadPattern('glider-gun') },
          { label: 'Glider', onSelected: () => this.loadPattern('glider') },
          { label: 'Blinker', onSelected: () => this.loadPattern('blinker') },
          { label: 'Pulsar', onSelected: () => this.loadPattern('pulsar') },
          { label: '', isSeparator: true },
          { label: 'Random', onSelected: () => this.loadPattern('random') },
          { label: 'Clear', onSelected: () => this.clearWithConfirm() }
        ]
      },
      {
        label: 'Simulation',
        items: [
          { label: 'Start', onSelected: () => this.start() },
          { label: 'Pause', onSelected: () => this.pause() },
          { label: 'Step', onSelected: () => this.step() },
          { label: '', isSeparator: true },
          { label: 'Faster', onSelected: () => this.changeSpeed(-50) },
          { label: 'Slower', onSelected: () => this.changeSpeed(50) },
          { label: 'Reset Speed', onSelected: () => this.resetSpeed() }
        ]
      },
      {
        label: 'Help',
        items: [
          { label: 'About', onSelected: () => this.showAbout() }
        ]
      }
    ]);
  }

  setupWindowSync(win: Window): void {
    this.win = win;
    this.buildMainMenu(win);

    // Set close intercept
    win.setCloseIntercept(async () => {
      if (this.game.isRunning()) {
        const confirmed = await win.showConfirm('Exit', 'Simulation is running. Are you sure you want to exit?');
        if (confirmed) {
          await this.savePreferences();
          this.game.destroy();
        }
        return confirmed;
      }
      await this.savePreferences();
      return true;
    });

    // Load preferences asynchronously after window is set up
    this.loadPreferences().catch(err => {
      console.error('Failed to load preferences:', err);
    });
  }

  /**
   * Initialize the display after widgets are created and registered
   * This renders the initial board state (Glider Gun pattern)
   */
  async initialize(): Promise<void> {
    await this.updateDisplay();
  }

  buildContent(): void {
    this.a.vbox(() => {
      // Control buttons (using hbox instead of toolbar since toolbar doesn't render labels)
      this.a.hbox(() => {
        this.a.button('Start').onClick(() => this.start()).withId('startBtn');
        this.a.button('Pause').onClick(() => this.pause()).withId('pauseBtn');
        this.a.button('Step').onClick(() => { this.step(); }).withId('stepBtn');
        this.a.button('Reset').onClick(() => { this.reset(); }).withId('resetBtn');
        this.a.button('Clear').onClick(() => this.clearWithConfirm()).withId('clearBtn');
      });

      // Status bar
      this.a.hbox(() => {
        this.a.label('Generation: ');
        this.generationLabel = this.a.label('0').withId('generationNum');
        this.a.label(' | ');
        this.a.label('Status: ');
        this.statusLabel = this.a.label('Paused').withId('statusText');
        this.a.label(' | ');
        this.cellCountLabel = this.a.label('Cells: 0');
        this.a.label(' | ');
        const speed = this.game.getSpeed();
        const fps = Math.round(1000 / speed);
        this.speedLabel = this.a.label(`Speed: ${fps} gen/s`);
      });

      this.a.separator();

      // Speed control
      this.a.hbox(() => {
        this.a.label('Speed:');
        this.a.button('<<').onClick(() => this.changeSpeed(100));
        this.a.button('<').onClick(() => this.changeSpeed(25));
        this.a.button('⟲').onClick(() => this.resetSpeed());
        this.a.button('>').onClick(() => this.changeSpeed(-25));
        this.a.button('>>').onClick(() => this.changeSpeed(-100));
      });

      this.a.separator();

      // Board display (canvas raster - each cell is scaled up)
      this.a.label('Game of Life Board:');
      const dims = this.game.getDimensions();
      const cellSize = 14; // Each cell is 14x14 pixels
      this.cellSize = cellSize;
      this.boardCanvas = this.a.canvasRaster(dims.width * cellSize, dims.height * cellSize);

      // Instructions
      this.a.separator();
      this.a.label('Conway\'s Game of Life - Use menus for patterns and file operations');
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

  private async step(): Promise<void> {
    this.game.tick();
    await this.updateDisplay();
  }

  private async reset(): Promise<void> {
    this.game.reset();
    await this.updateDisplay();
    await this.updateStatus();
  }

  private async clearWithConfirm(): Promise<void> {
    if (!this.win) {
      this.game.clear();
      return;
    }

    const liveCells = this.game.getLiveCellCount();
    if (liveCells > 0) {
      const confirmed = await this.win.showConfirm('Clear Board', `Are you sure you want to clear ${liveCells} live cells?`);
      if (!confirmed) return;
    }

    this.game.clear();
    this.updateDisplay();
    this.updateStatus();
  }

  private loadPattern(name: string): void {
    this.game.loadPattern(name);
    this.updateDisplay();
    this.updateStatus();
  }

  private changeSpeed(delta: number): void {
    const newSpeed = this.game.getSpeed() + delta;
    this.game.setSpeed(newSpeed);
    this.updateSpeedLabel();
    this.savePreferences();
  }

  private resetSpeed(): void {
    this.game.setSpeed(DEFAULT_SPEED);
    this.updateSpeedLabel();
    this.savePreferences();
  }

  private async updateSpeedLabel(): Promise<void> {
    if (this.speedLabel) {
      const genPerSec = Math.round(1000 / this.game.getSpeed());
      await this.speedLabel.setText(`Speed: ${genPerSec} gen/s`);
    }
  }

  private async openPattern(): Promise<void> {
    if (!this.win) return;

    const filePath = await this.win.showFileOpen();
    if (!filePath) return;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      this.game.importRLE(content);
      this.currentFilePath = filePath;
      await this.win.showInfo('Pattern Loaded', `Loaded pattern from ${filePath}`);
      this.updateDisplay();
    } catch (e) {
      await this.win.showError('Error', `Failed to load pattern: ${e}`);
    }
  }

  private async savePattern(): Promise<void> {
    if (!this.win) return;

    const defaultName = this.currentFilePath || 'pattern.rle';
    const filePath = await this.win.showFileSave(defaultName);
    if (!filePath) return;

    try {
      const content = this.game.exportRLE();
      fs.writeFileSync(filePath, content, 'utf-8');
      this.currentFilePath = filePath;
      await this.win.showInfo('Pattern Saved', `Saved pattern to ${filePath}`);
    } catch (e) {
      await this.win.showError('Error', `Failed to save pattern: ${e}`);
    }
  }

  private async exitWithConfirm(): Promise<void> {
    if (!this.win) {
      process.exit(0);
      return;
    }

    if (this.game.isRunning()) {
      const confirmed = await this.win.showConfirm('Exit', 'Simulation is running. Are you sure you want to exit?');
      if (!confirmed) return;
    }

    await this.savePreferences();
    this.game.destroy();
    process.exit(0);
  }

  private async showAbout(): Promise<void> {
    if (!this.win) return;

    await this.win.showInfo(
      'About Game of Life',
      'Conway\'s Game of Life v1.0.0\n\n' +
      'A cellular automaton devised by mathematician John Conway.\n\n' +
      'Ported from github.com/fyne-io/life\n' +
      'Original authors: Fyne.io contributors\n\n' +
      'Rules:\n' +
      '• Any live cell with 2 or 3 live neighbors survives\n' +
      '• Any dead cell with exactly 3 live neighbors becomes alive\n' +
      '• All other cells die or stay dead\n\n' +
      'Features:\n' +
      '• Pattern save/load (RLE format)\n' +
      '• Predefined patterns\n' +
      '• Adjustable speed'
    );
  }

  private async renderBoard(): Promise<void> {
    if (!this.boardCanvas) return;

    const dims = this.game.getDimensions();
    const pixels: Array<{x: number; y: number; r: number; g: number; b: number; a: number}> = [];

    // Get board data directly
    const board = this.game.getBoardData();

    // Only send pixels for changed cells
    for (let cellY = 0; cellY < dims.height; cellY++) {
      for (let cellX = 0; cellX < dims.width; cellX++) {
        const alive = board[cellY][cellX];

        // Skip if cell hasn't changed (optimization)
        if (this.lastBoardState &&
            this.lastBoardState[cellY] &&
            this.lastBoardState[cellY][cellX] === alive) {
          continue;
        }

        const r = alive ? 255 : 0;
        const g = alive ? 255 : 0;
        const b = alive ? 255 : 0;

        // Fill a cellSize x cellSize block for this cell
        for (let py = 0; py < this.cellSize; py++) {
          for (let px = 0; px < this.cellSize; px++) {
            pixels.push({
              x: cellX * this.cellSize + px,
              y: cellY * this.cellSize + py,
              r, g, b, a: 255
            });
          }
        }
      }
    }

    // Update last board state
    this.lastBoardState = board.map(row => [...row]);

    if (pixels.length > 0) {
      // Batch updates to avoid exceeding 10MB protocol limit
      // Each pixel is ~50 bytes JSON, so 50,000 pixels ≈ 2.5MB per batch
      const BATCH_SIZE = 50000;

      if (pixels.length <= BATCH_SIZE) {
        // Small update - send directly
        await this.boardCanvas.setPixels(pixels);
      } else {
        // Large update - send in batches sequentially
        for (let i = 0; i < pixels.length; i += BATCH_SIZE) {
          const batch = pixels.slice(i, i + BATCH_SIZE);
          await this.boardCanvas.setPixels(batch);
        }
      }
    }
  }

  private async updateDisplay(): Promise<void> {
    if (this.generationLabel) {
      await this.generationLabel.setText(`${this.game.getGeneration()}`);
    }
    if (this.cellCountLabel) {
      await this.cellCountLabel.setText(`Cells: ${this.game.getLiveCellCount()}`);
    }

    await this.renderBoard();
  }

  private async updateStatus(): Promise<void> {
    if (this.statusLabel) {
      const status = this.game.isRunning() ? 'Running' : 'Paused';
      await this.statusLabel.setText(`${status}`);
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

  a.window({ title: 'Game of Life', width: 900, height: 700 }, (win: Window) => {
    // Setup window synchronously (preferences load async in background)
    ui.setupWindowSync(win);

    // Set content
    win.setContent(() => {
      ui.buildContent();
    });

    // Note: Don't call win.show() here - let app.run() handle it
    // This ensures waitForPendingRequests() catches all widget registrations
  });

  return ui;
}

// Export classes for testing
export { Board, GameOfLife, GameOfLifeUI };

/**
 * Main application entry point
 */
if (require.main === module) {
  app({ title: 'Game of Life' }, async (a: App) => {
    const ui = createGameOfLifeApp(a);
    await a.run();
    await ui.initialize();
  });
}
