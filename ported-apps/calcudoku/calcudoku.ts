/**
 * Calcudoku (KenKen)
 *
 * Fill the grid with 1-N where N is grid size.
 * Each row/column has each number exactly once.
 * Cages show a target and operation - cells must produce the target.
 *
 * @tsyne-app:name Calcudoku
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="none">
 *   <rect x="2" y="2" width="20" height="20" rx="1" fill="#fff" stroke="#333"/>
 *   <line x1="2" y1="12" x2="22" y2="12" stroke="#333"/>
 *   <line x1="12" y1="2" x2="12" y2="22" stroke="#333"/>
 *   <text x="5" y="9" font-size="5" fill="#333">6+</text>
 *   <text x="15" y="9" font-size="6" fill="#666">3</text>
 *   <text x="5" y="19" font-size="6" fill="#666">1</text>
 *   <text x="14" y="18" font-size="5" fill="#333">2−</text>
 * </svg>
 * SVG
 * @tsyne-app:category games
 * @tsyne-app:builder createCalcudokuApp
 * @tsyne-app:args app,windowWidth,windowHeight
 */

import { app, resolveTransport } from 'tsyne';
import type { App, Window, ColorCell } from 'tsyne';

// ============================================================================
// Types & Constants
// ============================================================================

type Op = '+' | '-' | '×' | '÷' | '=';

interface Cage {
  cells: number[];
  target: number;
  op: Op;
}

interface Puzzle {
  size: number;
  cages: Cage[];
}

// Pre-verified solvable puzzles with their solutions
// Grid positions: row * size + col
const PUZZLES: Puzzle[] = [
  // 3x3 Easy - Solution: [1,3,2, 3,2,1, 2,1,3]
  {
    size: 3,
    cages: [
      { cells: [0, 1], target: 4, op: '+' },      // 1+3=4
      { cells: [2], target: 2, op: '=' },          // 2
      { cells: [3, 4], target: 5, op: '+' },       // 3+2=5
      { cells: [5, 8], target: 4, op: '+' },       // 1+3=4
      { cells: [6, 7], target: 3, op: '+' },       // 2+1=3
    ],
  },
  // 4x4 Easy - Solution: [1,2,3,4, 2,1,4,3, 3,4,1,2, 4,3,2,1]
  {
    size: 4,
    cages: [
      { cells: [0, 1], target: 3, op: '+' },       // 1+2=3
      { cells: [2, 3], target: 7, op: '+' },       // 3+4=7
      { cells: [4, 5], target: 3, op: '+' },       // 2+1=3
      { cells: [6, 7], target: 7, op: '+' },       // 4+3=7
      { cells: [8, 9], target: 7, op: '+' },       // 3+4=7
      { cells: [10, 11], target: 3, op: '+' },     // 1+2=3
      { cells: [12, 13], target: 7, op: '+' },     // 4+3=7
      { cells: [14, 15], target: 3, op: '+' },     // 2+1=3
    ],
  },
  // 4x4 Medium - Solution: [1,2,3,4, 3,4,1,2, 4,3,2,1, 2,1,4,3]
  {
    size: 4,
    cages: [
      { cells: [0, 4], target: 4, op: '+' },       // 1+3=4
      { cells: [1, 2], target: 6, op: '×' },       // 2×3=6
      { cells: [3, 7], target: 6, op: '+' },       // 4+2=6
      { cells: [5, 6, 9], target: 8, op: '+' },    // 4+1+3=8
      { cells: [8, 12], target: 6, op: '+' },      // 4+2=6
      { cells: [10, 11], target: 3, op: '+' },     // 2+1=3
      { cells: [13, 14, 15], target: 8, op: '+' }, // 1+4+3=8
    ],
  },
  // 5x5 Medium - Solution: [1,2,3,4,5, 2,3,4,5,1, 3,4,5,1,2, 4,5,1,2,3, 5,1,2,3,4]
  {
    size: 5,
    cages: [
      { cells: [0, 1], target: 3, op: '+' },       // 1+2=3
      { cells: [2, 3], target: 7, op: '+' },       // 3+4=7
      { cells: [4], target: 5, op: '=' },          // 5
      { cells: [5, 6], target: 5, op: '+' },       // 2+3=5
      { cells: [7, 8], target: 9, op: '+' },       // 4+5=9
      { cells: [9], target: 1, op: '=' },          // 1
      { cells: [10, 11], target: 7, op: '+' },     // 3+4=7
      { cells: [12, 13], target: 6, op: '+' },     // 5+1=6
      { cells: [14], target: 2, op: '=' },         // 2
      { cells: [15, 16], target: 9, op: '+' },     // 4+5=9
      { cells: [17, 18], target: 3, op: '+' },     // 1+2=3
      { cells: [19], target: 3, op: '=' },         // 3
      { cells: [20, 21], target: 6, op: '+' },     // 5+1=6
      { cells: [22, 23], target: 5, op: '+' },     // 2+3=5
      { cells: [24], target: 4, op: '=' },         // 4
    ],
  },
  // 5x5 Hard - Solution: [1,2,3,4,5, 3,4,5,1,2, 5,1,2,3,4, 2,3,4,5,1, 4,5,1,2,3]
  {
    size: 5,
    cages: [
      { cells: [0, 5, 10], target: 9, op: '+' },   // 1+3+5=9
      { cells: [1, 2], target: 6, op: '×' },       // 2×3=6
      { cells: [3, 4, 9], target: 11, op: '+' },   // 4+5+2=11
      { cells: [6, 7, 8], target: 20, op: '×' },   // 4×5×1=20
      { cells: [11, 16], target: 4, op: '+' },     // 1+3=4
      { cells: [12, 13], target: 5, op: '+' },     // 2+3=5
      { cells: [14, 19], target: 5, op: '+' },     // 4+1=5
      { cells: [15, 20], target: 6, op: '+' },     // 2+4=6
      { cells: [17, 18], target: 9, op: '+' },     // 4+5=9
      { cells: [21, 22], target: 6, op: '+' },     // 5+1=6
      { cells: [23, 24], target: 5, op: '+' },     // 2+3=5
    ],
  },
];

// ============================================================================
// Game Logic
// ============================================================================

export class CalcudokuGame {
  private puzzle: Puzzle;
  private board: number[] = [];
  private size = 3;
  private level = 0;
  private selected: number | null = null;
  private onUpdate?: () => void;
  private onWin?: () => void;

  constructor() {
    this.puzzle = PUZZLES[0];
    this.size = this.puzzle.size;
    this.reset();
  }

  reset = (): void => {
    this.board = Array(this.size * this.size).fill(0);
    this.selected = null;
    this.onUpdate?.();
  };

  setLevel = (level: number): void => {
    this.level = Math.max(0, Math.min(level, PUZZLES.length - 1));
    this.puzzle = PUZZLES[this.level];
    this.size = this.puzzle.size;
    this.reset();
  };

  nextLevel = (): void => this.setLevel(this.level + 1);
  prevLevel = (): void => this.setLevel(this.level - 1);

  getLevel = (): number => this.level;
  getLevelCount = (): number => PUZZLES.length;
  getSize = (): number => this.size;
  getValue = (pos: number): number => this.board[pos];
  getSelected = (): number | null => this.selected;
  getCages = (): readonly Cage[] => this.puzzle.cages;

  getCageForCell = (pos: number): Cage | undefined =>
    this.puzzle.cages.find(c => c.cells.includes(pos));

  isCageTopLeft = (pos: number): boolean => {
    const cage = this.getCageForCell(pos);
    return cage ? cage.cells[0] === pos : false;
  };

  selectCell = (pos: number): void => {
    this.selected = this.selected === pos ? null : pos;
    this.onUpdate?.();
  };

  setValue = (value: number): void => {
    if (this.selected === null) return;
    this.board[this.selected] = value;
    this.onUpdate?.();
    if (this.isWon()) this.onWin?.();
  };

  clearCell = (): void => {
    if (this.selected === null) return;
    this.board[this.selected] = 0;
    this.onUpdate?.();
  };

  private getRow = (r: number): number[] =>
    Array.from({ length: this.size }, (_, c) => this.board[r * this.size + c]);

  private getCol = (c: number): number[] =>
    Array.from({ length: this.size }, (_, r) => this.board[r * this.size + c]);

  private checkCage = (cage: Cage): boolean => {
    const vals = cage.cells.map(i => this.board[i]);
    if (vals.includes(0)) return true; // Incomplete, not wrong

    if (cage.op === '=') return vals[0] === cage.target;

    if (cage.op === '+') return vals.reduce((a, b) => a + b, 0) === cage.target;

    if (cage.op === '×') return vals.reduce((a, b) => a * b, 1) === cage.target;

    if (cage.op === '-') {
      const sorted = [...vals].sort((a, b) => b - a);
      return sorted[0] - sorted.slice(1).reduce((a, b) => a + b, 0) === cage.target;
    }

    if (cage.op === '÷') {
      const sorted = [...vals].sort((a, b) => b - a);
      let result = sorted[0];
      for (let i = 1; i < sorted.length; i++) result /= sorted[i];
      return result === cage.target;
    }

    return false;
  };

  private checkRowCol = (): boolean => {
    for (let i = 0; i < this.size; i++) {
      const row = this.getRow(i).filter(v => v > 0);
      const col = this.getCol(i).filter(v => v > 0);
      if (new Set(row).size !== row.length) return false;
      if (new Set(col).size !== col.length) return false;
    }
    return true;
  };

  isValid = (): boolean => {
    if (!this.checkRowCol()) return false;
    return this.puzzle.cages.every(c => this.checkCage(c));
  };

  isFull = (): boolean => !this.board.includes(0);

  isWon = (): boolean => this.isFull() && this.isValid();

  getErrors = (): Set<number> => {
    const errors = new Set<number>();

    // Check rows and columns for duplicates
    for (let i = 0; i < this.size; i++) {
      const row = this.getRow(i);
      const col = this.getCol(i);
      const rowSeen = new Map<number, number[]>();
      const colSeen = new Map<number, number[]>();

      row.forEach((v, c) => {
        if (v > 0) {
          if (!rowSeen.has(v)) rowSeen.set(v, []);
          rowSeen.get(v)!.push(i * this.size + c);
        }
      });

      col.forEach((v, r) => {
        if (v > 0) {
          if (!colSeen.has(v)) colSeen.set(v, []);
          colSeen.get(v)!.push(r * this.size + i);
        }
      });

      rowSeen.forEach(positions => {
        if (positions.length > 1) positions.forEach(p => errors.add(p));
      });

      colSeen.forEach(positions => {
        if (positions.length > 1) positions.forEach(p => errors.add(p));
      });
    }

    // Check cages
    for (const cage of this.puzzle.cages) {
      if (!this.checkCage(cage) && cage.cells.every(i => this.board[i] > 0)) {
        cage.cells.forEach(i => errors.add(i));
      }
    }

    return errors;
  };

  setOnUpdate = (cb: () => void): void => { this.onUpdate = cb; };
  setOnWin = (cb: () => void): void => { this.onWin = cb; };

  // Solver using backtracking
  solve = (): number[] | null => {
    const board = Array(this.size * this.size).fill(0);
    if (this.solveRecursive(board, 0)) return board;
    return null;
  };

  private solveRecursive = (board: number[], pos: number): boolean => {
    if (pos >= board.length) return true;

    const row = Math.floor(pos / this.size);
    const col = pos % this.size;

    for (let num = 1; num <= this.size; num++) {
      if (this.canPlace(board, pos, num, row, col)) {
        board[pos] = num;
        if (this.solveRecursive(board, pos + 1)) return true;
        board[pos] = 0;
      }
    }
    return false;
  };

  private canPlace = (board: number[], pos: number, num: number, row: number, col: number): boolean => {
    // Check row
    for (let c = 0; c < this.size; c++) {
      if (board[row * this.size + c] === num) return false;
    }
    // Check column
    for (let r = 0; r < this.size; r++) {
      if (board[r * this.size + col] === num) return false;
    }
    // Check cage constraint
    const cage = this.getCageForCell(pos);
    if (cage) {
      const vals = cage.cells.map(i => i === pos ? num : board[i]);
      const filled = vals.filter(v => v > 0);
      if (filled.length === cage.cells.length) {
        if (!this.checkCageValues(cage, vals)) return false;
      }
    }
    return true;
  };

  private checkCageValues = (cage: Cage, vals: number[]): boolean => {
    if (cage.op === '=') return vals[0] === cage.target;
    if (cage.op === '+') return vals.reduce((a, b) => a + b, 0) === cage.target;
    if (cage.op === '×') return vals.reduce((a, b) => a * b, 1) === cage.target;
    if (cage.op === '-') {
      const sorted = [...vals].sort((a, b) => b - a);
      return sorted[0] - sorted.slice(1).reduce((a, b) => a + b, 0) === cage.target;
    }
    if (cage.op === '÷') {
      const sorted = [...vals].sort((a, b) => b - a);
      let result = sorted[0];
      for (let i = 1; i < sorted.length; i++) result /= sorted[i];
      return result === cage.target;
    }
    return false;
  };

  // Set cell directly (for animated solving)
  setCell = (pos: number, value: number): void => {
    this.board[pos] = value;
    this.onUpdate?.();
  };
}

// ============================================================================
// UI
// ============================================================================

export class CalcudokuUI {
  private game = new CalcudokuGame();
  private cells: ColorCell[] = [];
  private statusLabel: any = null;
  private levelLabel: any = null;
  private a: App;
  private win: Window | null = null;
  private solving = false;

  constructor(a: App) {
    this.a = a;
    this.game.setOnUpdate(() => this.updateDisplay());
    this.game.setOnWin(() => this.handleWin());
  }

  visibleSolve = async (): Promise<void> => {
    if (this.solving) return;
    this.solving = true;
    this.game.reset();

    const solution = this.game.solve();
    if (!solution) {
      this.solving = false;
      return;
    }

    for (let i = 0; i < solution.length; i++) {
      this.game.setCell(i, solution[i]);
      await new Promise(r => setTimeout(r, 150));
    }
    this.solving = false;
  };

  setupWindow = (win: Window): void => {
    this.win = win;
    win.setMainMenu([{
      label: 'Game',
      items: [
        { label: 'Reset', onSelected: () => this.game.reset() },
        { label: '', isSeparator: true },
        { label: 'Previous Level', onSelected: () => { this.game.prevLevel(); this.updateDisplay(); } },
        { label: 'Next Level', onSelected: () => { this.game.nextLevel(); this.updateDisplay(); } },
        { label: '', isSeparator: true },
        { label: 'Exit', onSelected: () => process.exit(0) },
      ],
    }]);
  };

  buildContent = (): void => {
    this.cells = [];
    const size = this.game.getSize();

    this.a.vbox(() => {
      this.a.hbox(() => {
        this.a.button('Reset').onClick(() => this.game.reset()).withId('resetBtn');
        this.a.button('Solve').onClick(() => this.visibleSolve()).withId('solveBtn');
        this.a.button('◀').onClick(() => { this.game.prevLevel(); this.updateDisplay(); }).withId('prevBtn');
        this.levelLabel = this.a.label(`Level ${this.game.getLevel() + 1}/${this.game.getLevelCount()}`).withId('levelLabel');
        this.a.button('▶').onClick(() => { this.game.nextLevel(); this.updateDisplay(); }).withId('nextBtn');
      });

      this.a.separator();

      this.a.grid(size, () => {
        const total = size * size;
        for (let i = 0; i < total; i++) {
          const cage = this.game.getCageForCell(i);
          const isTopLeft = this.game.isCageTopLeft(i);
          const label = isTopLeft && cage ? `${cage.target}${cage.op}` : '';

          const cell = this.a.colorCell({
            width: 55, height: 55,
            text: label,
            fillColor: '#FFFFFF',
            textColor: '#666666',
            borderColor: '#333333',
            borderWidth: 2,
            centerText: false,
            onClick: () => this.game.selectCell(i),
          }).withId(`cell-${i}`);
          this.cells[i] = cell;
        }
      }, { cellSize: 55, spacing: 1 });

      this.a.separator();

      // Number buttons
      this.a.hbox(() => {
        for (let n = 1; n <= this.game.getSize(); n++) {
          this.a.button(String(n)).onClick(() => this.game.setValue(n)).withId(`numBtn${n}`);
        }
        this.a.button('C').onClick(() => this.game.clearCell()).withId('clearBtn');
      });

      this.a.separator();
      this.statusLabel = this.a.label('Select a cell, enter 1-' + this.game.getSize()).withId('statusLabel');
    });
  };

  private updateDisplay = async (): Promise<void> => {
    const size = this.game.getSize();
    const total = size * size;
    const errors = this.game.getErrors();
    const selected = this.game.getSelected();

    for (let i = 0; i < total; i++) {
      const cell = this.cells[i];
      if (!cell) continue;

      const value = this.game.getValue(i);
      const cage = this.game.getCageForCell(i);
      const isTopLeft = this.game.isCageTopLeft(i);
      const hasError = errors.has(i);

      let text = '';
      if (isTopLeft && cage) {
        text = `${cage.target}${cage.op}`;
        if (value > 0) text += `\n${value}`;
      } else if (value > 0) {
        text = String(value);
      }

      let fillColor = '#FFFFFF';
      if (i === selected) {
        fillColor = '#E3F2FD';
      } else if (hasError) {
        fillColor = '#FFEBEE';
      }

      await cell.setText(text);
      await cell.setFillColor(fillColor);
    }

    if (this.levelLabel) {
      await this.levelLabel.setText(`Level ${this.game.getLevel() + 1}/${this.game.getLevelCount()}`);
    }

    let status: string;
    if (this.game.isWon()) {
      status = 'Solved!';
    } else {
      const filled = this.game.getSize() * this.game.getSize() -
        Array.from({ length: total }, (_, i) => this.game.getValue(i)).filter(v => v === 0).length;
      status = `${filled}/${total} cells`;
    }
    await this.statusLabel?.setText(status);
  };

  private handleWin = async (): Promise<void> => {
    if (this.win) {
      const level = this.game.getLevel();
      const isLast = level >= this.game.getLevelCount() - 1;
      await this.win.showInfo('Congratulations!',
        isLast ? 'You completed all levels!' : 'Puzzle solved! Try the next level.');
    }
  };

  initialize = async (): Promise<void> => { await this.updateDisplay(); };
}

// ============================================================================
// App Factory
// ============================================================================

export function createCalcudokuApp(a: App, windowWidth?: number, windowHeight?: number): CalcudokuUI {
  const ui = new CalcudokuUI(a);

  // Always create a window - PhoneTop intercepts this to create a StackPaneAdapter
  a.window({ title: 'Calcudoku', width: 400, height: 480 }, (win: Window) => {
    ui.setupWindow(win);
    win.setContent(() => ui.buildContent());
    win.show();
    setTimeout(() => ui.initialize(), 0);
  });

  return ui;
}

export const PUZZLE_COUNT = PUZZLES.length;

// ============================================================================
// Standalone Entry Point
// ============================================================================

if (require.main === module) {
  app(resolveTransport(), { title: 'Calcudoku' }, async (a: App) => {
    const ui = createCalcudokuApp(a);
    await a.run();
    await ui.initialize();
  });
}
