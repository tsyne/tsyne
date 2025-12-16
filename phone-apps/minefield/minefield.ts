/**
 * Minefield (Minesweeper) Game
 *
 * Ported from ChrysaLisp: https://github.com/vygr/ChrysaLisp/blob/master/apps/minefield/
 * Original authors: ChrysaLisp contributors
 * License: See original repository
 *
 * Classic Minesweeper game with adaptive sizing for phone/tablet/desktop.
 *
 * Copyright (c) 2025 Paul Hammant
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * @tsyne-app:name Minefield
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
 * @tsyne-app:category games
 * @tsyne-app:builder createMinefieldApp
 * @tsyne-app:args app
 * @tsyne-app:count many
 */

import { app } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { Label } from '../../core/src/widgets/display';

// =============================================================================
// Game Configuration
// =============================================================================

/** Difficulty presets: width, height, mines */
export const DIFFICULTY_PRESETS = {
  beginner: { width: 8, height: 8, mines: 10, label: 'Beginner', cellSize: 36 },
  intermediate: { width: 16, height: 16, mines: 40, label: 'Intermediate', cellSize: 28 },
  expert: { width: 24, height: 16, mines: 80, label: 'Expert', cellSize: 24 },
} as const;

export type Difficulty = keyof typeof DIFFICULTY_PRESETS;

// Legacy exports for backward compatibility
export const BEGINNER_SETTINGS = { width: 8, height: 8, mines: 10 };
export const INTERMEDIATE_SETTINGS = { width: 16, height: 16, mines: 40 };
export const EXPERT_SETTINGS = { width: 30, height: 16, mines: 99 };

/** Cell display states */
type CellState = 'hidden' | 'flagged' | 'revealed';

/** Mine value constant */
const MINE = 9;

/** Cell value colors (1-8) */
const VALUE_COLORS: Record<number, string> = {
  1: '#0000FF', // Blue
  2: '#008000', // Green
  3: '#FF0000', // Red
  4: '#000080', // Navy
  5: '#800000', // Maroon
  6: '#008080', // Teal
  7: '#000000', // Black
  8: '#808080', // Gray
};

// =============================================================================
// Game Logic
// =============================================================================

/** Get adjacent cell indices for flood fill */
function getNeighbors(index: number, width: number, height: number): number[] {
  const x = index % width;
  const y = Math.floor(index / width);
  const neighbors: number[] = [];

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        neighbors.push(ny * width + nx);
      }
    }
  }

  return neighbors;
}

/** Place mines avoiding safe zone around first click */
function placeMines(
  totalCells: number,
  mineCount: number,
  safeCell: number,
  width: number,
  height: number
): Set<number> {
  const mines = new Set<number>();
  const safeZone = new Set([safeCell, ...getNeighbors(safeCell, width, height)]);

  while (mines.size < mineCount) {
    const pos = Math.floor(Math.random() * totalCells);
    if (!safeZone.has(pos) && !mines.has(pos)) {
      mines.add(pos);
    }
  }

  return mines;
}

/** Difficulty config type */
type DifficultyConfig = {
  width: number;
  height: number;
  mines: number;
  label: string;
  cellSize: number;
};

/**
 * MinefieldGame - Core game logic
 */
export class MinefieldGame {
  private board: number[] = [];
  private states: CellState[] = [];
  private neighbors: number[][] = [];
  private config: DifficultyConfig = { ...DIFFICULTY_PRESETS.beginner };
  private initialized = false;
  private finished = false;
  private victory = false;

  constructor() {
    this.reset();
  }

  // --- Configuration ---

  setDifficulty(width: number, height: number, mines: number): void {
    // Find matching preset or create custom
    const preset = Object.values(DIFFICULTY_PRESETS).find(
      (p) => p.width === width && p.height === height && p.mines === mines
    );
    this.config = preset ? { ...preset } : { width, height, mines, label: 'Custom', cellSize: 30 };
    this.reset();
  }

  selectDifficulty(difficulty: Difficulty): void {
    this.config = { ...DIFFICULTY_PRESETS[difficulty] };
    this.reset();
  }

  reset(): void {
    const totalCells = this.config.width * this.config.height;
    this.board = [];
    this.states = new Array(totalCells).fill('hidden');
    this.neighbors = [];
    this.initialized = false;
    this.finished = false;
    this.victory = false;

    // Pre-compute neighbors for each cell
    for (let i = 0; i < totalCells; i++) {
      this.neighbors.push(getNeighbors(i, this.config.width, this.config.height));
    }
  }

  // --- Accessors ---

  getWidth(): number {
    return this.config.width;
  }

  getHeight(): number {
    return this.config.height;
  }

  getTotalCells(): number {
    return this.config.width * this.config.height;
  }

  getCellSize(): number {
    return this.config.cellSize;
  }

  getCellDisplay(index: number): 'b' | 'f' | 'r' {
    // Legacy compatibility mapping
    const state = this.states[index];
    return state === 'hidden' ? 'b' : state === 'flagged' ? 'f' : 'r';
  }

  getCellState(index: number): CellState {
    return this.states[index] || 'hidden';
  }

  getCellValue(index: number): number {
    return this.board[index] ?? 0;
  }

  isGameOver(): boolean {
    return this.finished;
  }

  hasWon(): boolean {
    return this.victory;
  }

  getRemainingMines(): number {
    const flagCount = this.states.filter((s) => s === 'flagged').length;
    return this.config.mines - flagCount;
  }

  getFlagCount(): number {
    return this.states.filter((s) => s === 'flagged').length;
  }

  // --- Actions ---

  /** Handle left click - reveal cell */
  leftClick(index: number): boolean {
    if (this.finished) return false;

    // Initialize board on first click (guarantees safe start)
    if (!this.initialized) {
      this.initializeBoard(index);
    }

    const state = this.states[index];
    if (state !== 'hidden') return false;

    const value = this.board[index];

    if (value === MINE) {
      // Hit a mine - game over
      this.states[index] = 'revealed';
      this.finished = true;
      this.victory = false;
      // Reveal all mines
      for (let i = 0; i < this.board.length; i++) {
        if (this.board[i] === MINE) {
          this.states[i] = 'revealed';
        }
      }
      return true;
    }

    if (value === 0) {
      // Blank cell - flood fill
      this.floodReveal(index);
    } else {
      this.states[index] = 'revealed';
    }

    this.checkVictory();
    return true;
  }

  /** Handle right click - toggle flag */
  rightClick(index: number): boolean {
    if (this.finished || !this.initialized) return false;

    const state = this.states[index];

    if (state === 'hidden') {
      this.states[index] = 'flagged';
      this.checkVictory();
      return true;
    } else if (state === 'flagged') {
      this.states[index] = 'hidden';
      return true;
    }

    return false;
  }

  // --- Internal ---

  private initializeBoard(safeCell: number): void {
    const totalCells = this.getTotalCells();
    this.board = new Array(totalCells).fill(0);

    // Place mines
    const mines = placeMines(
      totalCells,
      this.config.mines,
      safeCell,
      this.config.width,
      this.config.height
    );

    for (const pos of mines) {
      this.board[pos] = MINE;
    }

    // Calculate adjacent counts
    for (let i = 0; i < totalCells; i++) {
      if (this.board[i] !== MINE) {
        let count = 0;
        for (const n of this.neighbors[i]) {
          if (this.board[n] === MINE) count++;
        }
        this.board[i] = count;
      }
    }

    this.initialized = true;
  }

  private floodReveal(start: number): void {
    const queue = [start];
    const visited = new Set<number>();

    while (queue.length > 0) {
      const cell = queue.pop()!;
      if (visited.has(cell)) continue;
      visited.add(cell);

      this.states[cell] = 'revealed';

      // If blank, continue flood fill
      if (this.board[cell] === 0) {
        for (const n of this.neighbors[cell]) {
          if (!visited.has(n) && this.states[n] === 'hidden') {
            queue.push(n);
          }
        }
      }
    }
  }

  private checkVictory(): void {
    // Win if all non-mine cells are revealed
    for (let i = 0; i < this.board.length; i++) {
      if (this.board[i] !== MINE && this.states[i] !== 'revealed') {
        return;
      }
    }
    this.finished = true;
    this.victory = true;
  }
}

// =============================================================================
// UI Layer - Pseudo-Declarative Cell Bindings
// =============================================================================

/** Cell visual configuration */
interface CellConfig {
  index: number;
  state: CellState;
  value: number;
  size: number;
}

/** Get cell display text */
function getCellText(config: CellConfig): string {
  if (config.state === 'hidden') return '';
  if (config.state === 'flagged') return '\u2691'; // Flag emoji
  if (config.value === MINE) return '\u2739'; // Mine/bomb
  if (config.value === 0) return '';
  return String(config.value);
}

/** Get cell text color */
function getCellTextColor(config: CellConfig): string {
  if (config.state === 'flagged') return '#FF0000';
  if (config.state === 'revealed' && config.value === MINE) return '#000000';
  return VALUE_COLORS[config.value] || '#000000';
}

/**
 * MinefieldUI - Adaptive game interface
 */
export class MinefieldUI {
  private game: MinefieldGame;
  private a: App;
  private window: Window | null = null;
  private statusLabel: Label | null = null;
  private minesLabel: Label | null = null;
  private currentDifficulty: Difficulty = 'beginner';

  constructor(a: App) {
    this.a = a;
    this.game = new MinefieldGame();
  }

  // --- Public API ---

  getGame(): MinefieldGame {
    return this.game;
  }

  selectDifficulty(difficulty: Difficulty): void {
    this.currentDifficulty = difficulty;
    this.game.selectDifficulty(difficulty);
    this.refresh();
  }

  newGame(): void {
    this.game.reset();
    this.refresh();
  }

  // --- UI Updates ---

  private refresh(): void {
    if (this.window) {
      this.window.setContent(() => this.buildContent());
    }
  }

  private updateStatus(): void {
    if (this.statusLabel) {
      const status = this.game.isGameOver()
        ? this.game.hasWon()
          ? '\u2605 Victory!'
          : '\u2620 Game Over'
        : 'Click to play';
      this.statusLabel.setText(status);
    }
    if (this.minesLabel) {
      this.minesLabel.setText(`\u2691 ${this.game.getRemainingMines()}`);
    }
  }

  private handleCellClick(index: number, rightClick: boolean): void {
    const changed = rightClick ? this.game.rightClick(index) : this.game.leftClick(index);
    if (changed) {
      this.refresh();
    }
  }

  // --- Declarative Cell Rendering ---

  private renderCell(index: number): void {
    const config: CellConfig = {
      index,
      state: this.game.getCellState(index),
      value: this.game.getCellValue(index),
      size: this.game.getCellSize(),
    };

    const text = getCellText(config);
    const color = getCellTextColor(config);

    if (config.state === 'hidden') {
      // Hidden cell - clickable button
      this.a
        .button('')
        .onClick(() => this.handleCellClick(index, false))
        .withId(`cell-${index}`);
    } else if (config.state === 'flagged') {
      // Flagged cell - click to unflag
      this.a
        .button(text)
        .onClick(() => this.handleCellClick(index, true))
        .withId(`cell-${index}`);
    } else {
      // Revealed cell - static label
      if (config.value === MINE) {
        this.a.label('\u2739', undefined, 'center').withId(`cell-${index}`);
      } else if (config.value === 0) {
        this.a.label(' ', undefined, 'center').withId(`cell-${index}`);
      } else {
        this.a.label(text, undefined, 'center').withId(`cell-${index}`);
      }
    }
  }

  // --- Layout ---

  private buildContent(): void {
    const preset = DIFFICULTY_PRESETS[this.currentDifficulty];

    this.a.vbox(() => {
      // Toolbar - difficulty selection
      this.a.hbox(() => {
        for (const [key, config] of Object.entries(DIFFICULTY_PRESETS)) {
          const isActive = key === this.currentDifficulty;
          this.a
            .button(isActive ? `[${config.label}]` : config.label)
            .onClick(() => this.selectDifficulty(key as Difficulty))
            .withId(`${key}Btn`);
        }
      });

      // Status bar
      this.a.hbox(() => {
        this.statusLabel = this.a
          .label(
            this.game.isGameOver()
              ? this.game.hasWon()
                ? '\u2605 Victory!'
                : '\u2620 Game Over'
              : 'Click to play'
          )
          .withId('statusLabel');
        this.a.spacer();
        this.minesLabel = this.a.label(`\u2691 ${this.game.getRemainingMines()}`).withId('mineCountLabel');
      });

      this.a.separator();

      // Game board in scroll container for larger boards
      this.a.scroll(() => {
        this.a.grid(this.game.getWidth(), () => {
          for (let i = 0; i < this.game.getTotalCells(); i++) {
            this.renderCell(i);
          }
        });
      }).withMinSize(
        Math.min(preset.width * preset.cellSize, 600),
        Math.min(preset.height * preset.cellSize, 500)
      );

      this.a.separator();

      // Bottom controls
      this.a.hbox(() => {
        this.a.button('New Game').onClick(() => this.newGame()).withId('newGameBtn');
        this.a.spacer();
        this.a.label('Long-press to flag', undefined, undefined, undefined, { italic: true });
      });
    });
  }

  // --- Window Creation ---

  build(): void {
    // Calculate adaptive window size based on difficulty
    const preset = DIFFICULTY_PRESETS[this.currentDifficulty];
    const width = Math.max(350, Math.min(preset.width * preset.cellSize + 50, 800));
    const height = Math.max(400, Math.min(preset.height * preset.cellSize + 150, 700));

    this.a.window({ title: 'Minefield', width, height }, (win) => {
      this.window = win;
      win.setContent(() => this.buildContent());
      win.show();
    });
  }
}

// =============================================================================
// App Entry Point
// =============================================================================

/**
 * Create the Minefield app
 */
export function createMinefieldApp(a: App): MinefieldUI {
  const ui = new MinefieldUI(a);
  ui.build();
  return ui;
}

// Export for backward compatibility
export { MinefieldGame as Game };

// Standalone execution
if (require.main === module) {
  app({ title: 'Minefield' }, async (a: App) => {
    createMinefieldApp(a);
    await a.run();
  });
}
