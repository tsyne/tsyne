/**
 * Minefield (Minesweeper) Game
 *
 * Ported from ChrysaLisp: https://github.com/vygr/ChrysaLisp/blob/master/apps/minefield/
 * Original authors: ChrysaLisp contributors
 * License: See original repository
 *
 * Classic Minesweeper game with three difficulty levels.
 *
 * @tsyne-app:name Minefield
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
 * @tsyne-app:category games
 * @tsyne-app:builder createMinefieldApp
 */

import { app } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { Button } from '../../core/src/widgets/inputs';
import type { Label } from '../../core/src/widgets/display';

// Difficulty settings: [width, height, mines]
export const BEGINNER_SETTINGS = { width: 8, height: 8, mines: 10 };
export const INTERMEDIATE_SETTINGS = { width: 16, height: 16, mines: 40 };
export const EXPERT_SETTINGS = { width: 30, height: 16, mines: 99 };

// Cell states in the display map
// 'b' = unrevealed button
// 'f' = flagged
// 'r' = revealed
type CellDisplay = 'b' | 'f' | 'r';

// Board values: 0-8 = adjacent mine count, 9 = mine
const MINE = 9;

/**
 * Get adjacent cell indices for a given position
 */
function getAdjacentIndices(index: number, width: number, height: number): number[] {
  const x = index % width;
  const y = Math.floor(index / width);
  const adjacent: number[] = [];

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        adjacent.push(ny * width + nx);
      }
    }
  }

  return adjacent;
}

/**
 * Generate mine positions, avoiding the first click and its neighbors
 */
function generateMines(
  totalCells: number,
  mineCount: number,
  safeCell: number,
  width: number,
  height: number
): number[] {
  const mines: Set<number> = new Set();
  const safeZone = new Set([safeCell, ...getAdjacentIndices(safeCell, width, height)]);

  while (mines.size < mineCount) {
    const pos = Math.floor(Math.random() * totalCells);
    if (!safeZone.has(pos) && !mines.has(pos)) {
      mines.add(pos);
    }
  }

  return Array.from(mines);
}

/**
 * Create a new game board
 * Returns: [board values, display map, adjacency list]
 */
function createGame(
  width: number,
  height: number,
  mineCount: number,
  firstClick: number
): { board: number[]; display: CellDisplay[]; adjacent: number[][] } {
  const totalCells = width * height;
  const board: number[] = new Array(totalCells).fill(0);
  const display: CellDisplay[] = new Array(totalCells).fill('b');
  const adjacent: number[][] = [];

  // Build adjacency list
  for (let i = 0; i < totalCells; i++) {
    adjacent.push(getAdjacentIndices(i, width, height));
  }

  // Place mines
  const mines = generateMines(totalCells, mineCount, firstClick, width, height);
  for (const pos of mines) {
    board[pos] = MINE;
  }

  // Calculate adjacent mine counts
  for (let i = 0; i < totalCells; i++) {
    if (board[i] !== MINE) {
      let count = 0;
      for (const adj of adjacent[i]) {
        if (board[adj] === MINE) count++;
      }
      board[i] = count;
    }
  }

  return { board, display, adjacent };
}

/**
 * Color for cell values
 */
function getValueColor(value: number): string {
  const colors = [
    'transparent', // 0 - no color
    '#0000FF',     // 1 - blue
    '#006600',     // 2 - green
    '#FF0000',     // 3 - red
    '#800080',     // 4 - magenta/purple
    '#000000',     // 5 - black
    '#700000',     // 6 - dark red
    '#808080',     // 7 - grey
    '#02BBDD',     // 8 - cyan
  ];
  return colors[value] || '#000000';
}

/**
 * MinefieldGame class - manages game state
 */
export class MinefieldGame {
  private board: number[] = [];
  private display: CellDisplay[] = [];
  private adjacent: number[][] = [];
  private width: number = 8;
  private height: number = 8;
  private mineCount: number = 10;
  private firstClick: boolean = true;
  private gameOver: boolean = false;
  private won: boolean = false;

  setDifficulty(width: number, height: number, mines: number): void {
    this.width = width;
    this.height = height;
    this.mineCount = mines;
    this.reset();
  }

  reset(): void {
    this.board = [];
    this.display = new Array(this.width * this.height).fill('b');
    this.adjacent = [];
    this.firstClick = true;
    this.gameOver = false;
    this.won = false;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getTotalCells(): number {
    return this.width * this.height;
  }

  getCellDisplay(index: number): CellDisplay {
    return this.display[index] || 'b';
  }

  getCellValue(index: number): number {
    return this.board[index] || 0;
  }

  isGameOver(): boolean {
    return this.gameOver;
  }

  hasWon(): boolean {
    return this.won;
  }

  /**
   * Handle left click on a cell
   * Returns true if the display needs to be updated
   */
  leftClick(index: number): boolean {
    if (this.gameOver) return false;

    // First click initializes the board
    if (this.firstClick) {
      const result = createGame(this.width, this.height, this.mineCount, index);
      this.board = result.board;
      this.display = result.display;
      this.adjacent = result.adjacent;
      this.firstClick = false;
    }

    const cellDisplay = this.display[index];

    // Can't click on flagged or already revealed cells
    if (cellDisplay === 'f' || cellDisplay === 'r') {
      return false;
    }

    const value = this.board[index];

    if (value === MINE) {
      // Hit a mine - game over
      this.display[index] = 'r';
      this.gameOver = true;
      this.won = false;
      // Reveal all mines
      for (let i = 0; i < this.board.length; i++) {
        if (this.board[i] === MINE) {
          this.display[i] = 'r';
        }
      }
      return true;
    }

    if (value === 0) {
      // Blank cell - reveal recursively
      this.revealBlank(index);
    } else {
      // Number cell - just reveal it
      this.display[index] = 'r';
    }

    this.checkWin();
    return true;
  }

  /**
   * Handle right click on a cell (toggle flag)
   * Returns true if the display needs to be updated
   */
  rightClick(index: number): boolean {
    if (this.gameOver || this.firstClick) return false;

    const cellDisplay = this.display[index];

    if (cellDisplay === 'b') {
      this.display[index] = 'f';
      this.checkWin();
      return true;
    } else if (cellDisplay === 'f') {
      this.display[index] = 'b';
      return true;
    }

    return false;
  }

  /**
   * Reveal blank cells recursively (flood fill)
   */
  private revealBlank(startIndex: number): void {
    const work: number[] = [startIndex];

    while (work.length > 0) {
      const cell = work.pop()!;
      if (this.display[cell] === 'r') continue;

      this.display[cell] = 'r';

      for (const adj of this.adjacent[cell]) {
        if (this.display[adj] !== 'r') {
          if (this.board[adj] === 0) {
            work.push(adj);
          } else if (this.board[adj] < MINE) {
            this.display[adj] = 'r';
          }
        }
      }
    }
  }

  /**
   * Check if the player has won
   */
  private checkWin(): void {
    // Count unrevealed non-mine cells
    let unrevealed = 0;
    for (let i = 0; i < this.board.length; i++) {
      if (this.display[i] !== 'r' && this.board[i] !== MINE) {
        unrevealed++;
      }
    }

    if (unrevealed === 0) {
      this.gameOver = true;
      this.won = true;
    }
  }

  /**
   * Get flag count
   */
  getFlagCount(): number {
    return this.display.filter(d => d === 'f').length;
  }

  /**
   * Get remaining mines (mine count - flags)
   */
  getRemainingMines(): number {
    return this.mineCount - this.getFlagCount();
  }
}

/**
 * Minefield UI class
 */
export class MinefieldUI {
  private game: MinefieldGame;
  private a: App;
  private win: Window | null = null;
  private statusLabel: Label | null = null;
  private mineCountLabel: Label | null = null;
  private cellButtons: Button[] = [];
  private currentDifficulty: 'beginner' | 'intermediate' | 'expert' = 'beginner';

  constructor(a: App) {
    this.a = a;
    this.game = new MinefieldGame();
  }

  private startNewGame(difficulty: 'beginner' | 'intermediate' | 'expert'): void {
    this.currentDifficulty = difficulty;
    const settings = difficulty === 'beginner' ? BEGINNER_SETTINGS :
                     difficulty === 'intermediate' ? INTERMEDIATE_SETTINGS :
                     EXPERT_SETTINGS;
    this.game.setDifficulty(settings.width, settings.height, settings.mines);
    this.refreshUI();
  }

  private refreshUI(): void {
    if (this.win) {
      this.win.setContent(() => this.buildUI(this.win!));
    }
  }

  private updateStatus(): void {
    if (this.statusLabel) {
      if (this.game.isGameOver()) {
        this.statusLabel.setText(this.game.hasWon() ? 'You Won!' : 'Game Over!');
      } else {
        this.statusLabel.setText('Playing');
      }
    }
    if (this.mineCountLabel) {
      this.mineCountLabel.setText(`Mines: ${this.game.getRemainingMines()}`);
    }
  }

  private handleCellClick(index: number, isRightClick: boolean): void {
    let changed: boolean;
    if (isRightClick) {
      changed = this.game.rightClick(index);
    } else {
      changed = this.game.leftClick(index);
    }

    if (changed) {
      this.refreshUI();
    }
  }

  buildUI(win: Window): void {
    this.win = win;
    this.cellButtons = [];

    this.a.vbox(() => {
      // Difficulty buttons
      this.a.hbox(() => {
        this.a.button('Beginner').onClick(() => this.startNewGame('beginner')).withId('beginnerBtn');
        this.a.button('Intermediate').onClick(() => this.startNewGame('intermediate')).withId('intermediateBtn');
        this.a.button('Expert').onClick(() => this.startNewGame('expert')).withId('expertBtn');
      });

      // Status bar
      this.a.hbox(() => {
        this.statusLabel = this.a.label(
          this.game.isGameOver()
            ? (this.game.hasWon() ? 'You Won!' : 'Game Over!')
            : 'Playing'
        ).withId('statusLabel');
        this.a.spacer();
        this.mineCountLabel = this.a.label(`Mines: ${this.game.getRemainingMines()}`).withId('mineCountLabel');
      });

      this.a.separator();

      // Game board
      this.a.scroll(() => {
        this.a.grid(this.game.getWidth(), () => {
          for (let i = 0; i < this.game.getTotalCells(); i++) {
            const cellDisplay = this.game.getCellDisplay(i);
            const cellValue = this.game.getCellValue(i);
            const index = i; // Capture for closure

            if (cellDisplay === 'b') {
              // Unrevealed cell - show button
              const btn = this.a.button('').withId(`cell-${i}`);
              btn.onClick(() => this.handleCellClick(index, false));
              this.cellButtons.push(btn);
            } else if (cellDisplay === 'f') {
              // Flagged cell
              const btn = this.a.button('F').withId(`cell-${i}`);
              btn.onClick(() => this.handleCellClick(index, true));
              this.cellButtons.push(btn);
            } else {
              // Revealed cell
              if (cellValue === MINE) {
                this.a.label('X', 'mine-cell').withId(`cell-${i}`);
              } else if (cellValue === 0) {
                this.a.label(' ').withId(`cell-${i}`);
              } else {
                this.a.label(`${cellValue}`).withId(`cell-${i}`);
              }
            }
          }
        }, { spacing: 0 });
      });

      this.a.separator();

      // Flag mode toggle and new game
      this.a.hbox(() => {
        this.a.button('New Game').onClick(() => this.startNewGame(this.currentDifficulty)).withId('newGameBtn');
        this.a.label('Tip: Click F cells to unflag');
      });
    });
  }
}

/**
 * Create the Minefield app
 */
export function createMinefieldApp(a: App): MinefieldUI {
  const ui = new MinefieldUI(a);

  a.window({ title: 'Minefield', width: 500, height: 600 }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

// Export game class for testing
export { MinefieldGame as Game };

/**
 * Main application entry point
 */
if (require.main === module) {
  app({ title: 'Minefield' }, async (a: App) => {
    createMinefieldApp(a);
    await a.run();
  });
}
