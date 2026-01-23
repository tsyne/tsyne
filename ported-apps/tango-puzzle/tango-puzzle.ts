/**
 * Tango Puzzle
 *
 * Binary puzzle with suns and moons. Fill the grid following these rules:
 * - Each cell is either sun or moon
 * - No more than 2 consecutive same symbols in a row/column
 * - Each row and column has equal suns and moons
 *
 * @tsyne-app:name Tango Puzzle
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="none">
 *   <circle cx="8" cy="8" r="5" fill="#F5A623"/>
 *   <path d="M16 4a6 6 0 1 0 0 12 5 5 0 1 1 0-12z" fill="#4A90D9"/>
 *   <circle cx="16" cy="18" r="4" fill="#F5A623"/>
 * </svg>
 * SVG
 * @tsyne-app:category games
 * @tsyne-app:builder createTangoPuzzleApp
 * @tsyne-app:args app,windowWidth,windowHeight
 */

import { app, resolveTransport } from 'tsyne';
import type { App, Window, ColorCell } from 'tsyne';

// ============================================================================
// Types & Constants
// ============================================================================

type CellValue = 'empty' | 'sun' | 'moon';

interface Puzzle {
  size: number;
  givens: Map<number, CellValue>; // position -> fixed value
}

const SUN = '☀';
const MOON = '☽';

// Pre-defined puzzles (size must be even for equal sun/moon count)
const PUZZLES: Puzzle[] = [
  // 4x4 Easy
  {
    size: 4,
    givens: new Map([[0, 'sun'], [5, 'moon'], [10, 'sun'], [15, 'moon']]),
  },
  // 4x4 Medium
  {
    size: 4,
    givens: new Map([[1, 'sun'], [6, 'moon'], [9, 'sun'], [14, 'moon']]),
  },
  // 6x6 Easy
  {
    size: 6,
    givens: new Map([
      [0, 'sun'], [2, 'moon'], [7, 'sun'], [10, 'moon'],
      [21, 'sun'], [25, 'moon'], [33, 'sun'], [35, 'moon'],
    ]),
  },
  // 6x6 Medium
  {
    size: 6,
    givens: new Map([
      [1, 'moon'], [4, 'sun'], [8, 'sun'], [14, 'moon'],
      [19, 'sun'], [23, 'moon'], [28, 'sun'], [34, 'moon'],
    ]),
  },
  // 6x6 Hard
  {
    size: 6,
    givens: new Map([
      [0, 'sun'], [5, 'moon'], [12, 'moon'], [17, 'sun'],
      [24, 'sun'], [29, 'moon'],
    ]),
  },
];

// ============================================================================
// Game Logic
// ============================================================================

export class TangoPuzzleGame {
  private puzzle: Puzzle;
  private board: CellValue[] = [];
  private size = 4;
  private level = 0;
  private undoStack: CellValue[][] = [];
  private onUpdate?: () => void;
  private onWin?: () => void;

  constructor() {
    this.puzzle = PUZZLES[0];
    this.size = this.puzzle.size;
    this.reset();
  }

  reset = (): void => {
    const total = this.size * this.size;
    this.board = Array(total).fill('empty');
    for (const [pos, val] of this.puzzle.givens) {
      this.board[pos] = val;
    }
    this.undoStack = [];
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
  getValue = (pos: number): CellValue => this.board[pos];
  isGiven = (pos: number): boolean => this.puzzle.givens.has(pos);
  canUndo = (): boolean => this.undoStack.length > 0;

  tryClick = (pos: number): void => {
    if (this.isGiven(pos)) return;

    this.undoStack.push([...this.board]);
    const current = this.board[pos];
    // Cycle: empty -> sun -> moon -> empty
    this.board[pos] = current === 'empty' ? 'sun' : current === 'sun' ? 'moon' : 'empty';
    this.onUpdate?.();

    if (this.isWon()) this.onWin?.();
  };

  undo = (): void => {
    const prev = this.undoStack.pop();
    if (prev) {
      this.board = prev;
      this.onUpdate?.();
    }
  };

  // Check if no more than 2 consecutive same values in a line
  private checkNoTriples = (line: CellValue[]): boolean => {
    for (let i = 0; i <= line.length - 3; i++) {
      if (line[i] !== 'empty' && line[i] === line[i + 1] && line[i] === line[i + 2]) {
        return false;
      }
    }
    return true;
  };

  // Check if line has equal suns and moons (when full)
  private checkBalance = (line: CellValue[]): boolean => {
    const suns = line.filter(v => v === 'sun').length;
    const moons = line.filter(v => v === 'moon').length;
    const half = line.length / 2;
    // If not full, just check we haven't exceeded half
    if (line.includes('empty')) {
      return suns <= half && moons <= half;
    }
    return suns === half && moons === half;
  };

  private getRow = (r: number): CellValue[] => {
    const row: CellValue[] = [];
    for (let c = 0; c < this.size; c++) {
      row.push(this.board[r * this.size + c]);
    }
    return row;
  };

  private getCol = (c: number): CellValue[] => {
    const col: CellValue[] = [];
    for (let r = 0; r < this.size; r++) {
      col.push(this.board[r * this.size + c]);
    }
    return col;
  };

  isValid = (): boolean => {
    for (let i = 0; i < this.size; i++) {
      const row = this.getRow(i);
      const col = this.getCol(i);
      if (!this.checkNoTriples(row) || !this.checkNoTriples(col)) return false;
      if (!this.checkBalance(row) || !this.checkBalance(col)) return false;
    }
    return true;
  };

  isFull = (): boolean => !this.board.includes('empty');

  isWon = (): boolean => this.isFull() && this.isValid();

  getErrors = (): Set<number> => {
    const errors = new Set<number>();

    for (let r = 0; r < this.size; r++) {
      const row = this.getRow(r);
      // Check triples in row
      for (let c = 0; c <= this.size - 3; c++) {
        if (row[c] !== 'empty' && row[c] === row[c + 1] && row[c] === row[c + 2]) {
          errors.add(r * this.size + c);
          errors.add(r * this.size + c + 1);
          errors.add(r * this.size + c + 2);
        }
      }
      // Check balance exceeded
      const suns = row.filter(v => v === 'sun').length;
      const moons = row.filter(v => v === 'moon').length;
      if (suns > this.size / 2 || moons > this.size / 2) {
        for (let c = 0; c < this.size; c++) {
          errors.add(r * this.size + c);
        }
      }
    }

    for (let c = 0; c < this.size; c++) {
      const col = this.getCol(c);
      // Check triples in col
      for (let r = 0; r <= this.size - 3; r++) {
        if (col[r] !== 'empty' && col[r] === col[r + 1] && col[r] === col[r + 2]) {
          errors.add(r * this.size + c);
          errors.add((r + 1) * this.size + c);
          errors.add((r + 2) * this.size + c);
        }
      }
      // Check balance exceeded
      const suns = col.filter(v => v === 'sun').length;
      const moons = col.filter(v => v === 'moon').length;
      if (suns > this.size / 2 || moons > this.size / 2) {
        for (let r = 0; r < this.size; r++) {
          errors.add(r * this.size + c);
        }
      }
    }

    return errors;
  };

  setOnUpdate = (cb: () => void): void => { this.onUpdate = cb; };
  setOnWin = (cb: () => void): void => { this.onWin = cb; };
}

// ============================================================================
// UI
// ============================================================================

export class TangoPuzzleUI {
  private game = new TangoPuzzleGame();
  private cells: ColorCell[] = [];
  private statusLabel: any = null;
  private levelLabel: any = null;
  private a: App;
  private win: Window | null = null;

  constructor(a: App) {
    this.a = a;
    this.game.setOnUpdate(() => this.updateDisplay());
    this.game.setOnWin(() => this.handleWin());
  }

  setupWindow = (win: Window): void => {
    this.win = win;
    win.setMainMenu([{
      label: 'Game',
      items: [
        { label: 'Reset', onSelected: () => this.game.reset() },
        { label: 'Undo', onSelected: () => this.game.undo() },
        { label: '', isSeparator: true },
        { label: 'Previous Level', onSelected: () => { this.game.prevLevel(); this.rebuildUI(); } },
        { label: 'Next Level', onSelected: () => { this.game.nextLevel(); this.rebuildUI(); } },
        { label: '', isSeparator: true },
        { label: 'Exit', onSelected: () => process.exit(0) },
      ],
    }]);
  };

  buildContent = (): void => {
    this.rebuildGrid();
  };

  private rebuildGrid = (): void => {
    this.cells = [];
    const size = this.game.getSize();

    this.a.vbox(() => {
      this.a.hbox(() => {
        this.a.button('Reset').onClick(() => this.game.reset()).withId('resetBtn');
        this.a.button('Undo').onClick(() => this.game.undo()).withId('undoBtn');
        this.a.button('◀').onClick(() => { this.game.prevLevel(); this.rebuildUI(); }).withId('prevBtn');
        this.levelLabel = this.a.label(`Level ${this.game.getLevel() + 1}/${this.game.getLevelCount()}`).withId('levelLabel');
        this.a.button('▶').onClick(() => { this.game.nextLevel(); this.rebuildUI(); }).withId('nextBtn');
      });

      this.a.separator();

      this.a.grid(size, () => {
        const total = size * size;
        for (let i = 0; i < total; i++) {
          const cell = this.a.colorCell({
            width: 55, height: 55,
            text: '',
            fillColor: '#F5F5F0',
            textColor: '#333333',
            borderColor: '#DDDDDD',
            borderWidth: 1,
            centerText: true,
            onClick: () => this.game.tryClick(i),
          }).withId(`cell-${i}`);
          this.cells[i] = cell;
        }
      }, { cellSize: 55, spacing: 3 });

      this.a.separator();
      this.statusLabel = this.a.label('Fill with suns and moons').withId('statusLabel');
    });
  };

  private rebuildUI = async (): Promise<void> => {
    await this.updateDisplay();
    if (this.levelLabel) {
      await this.levelLabel.setText(`Level ${this.game.getLevel() + 1}/${this.game.getLevelCount()}`);
    }
  };

  private updateDisplay = async (): Promise<void> => {
    const size = this.game.getSize();
    const total = size * size;
    const errors = this.game.getErrors();

    for (let i = 0; i < total; i++) {
      const cell = this.cells[i];
      if (!cell) continue;

      const value = this.game.getValue(i);
      const isGiven = this.game.isGiven(i);
      const hasError = errors.has(i);

      let text = '';
      let fillColor = '#F5F5F0';
      let textColor = '#333333';

      if (value === 'sun') {
        text = SUN;
        fillColor = hasError ? '#FFCCCC' : (isGiven ? '#FFF3E0' : '#FFFDE7');
        textColor = '#F5A623';
      } else if (value === 'moon') {
        text = MOON;
        fillColor = hasError ? '#FFCCCC' : (isGiven ? '#E3F2FD' : '#F0F8FF');
        textColor = '#4A90D9';
      }

      await cell.setText(text);
      await cell.setFillColor(fillColor);
      await cell.setTextColor(textColor);
    }

    let status: string;
    if (this.game.isWon()) {
      status = 'Solved!';
    } else if (errors.size > 0) {
      status = 'Rule violation detected';
    } else {
      const filled = total - this.game.getSize() * this.game.getSize() +
        Array.from({ length: total }, (_, i) => this.game.getValue(i)).filter(v => v !== 'empty').length;
      status = `${filled}/${total} cells filled`;
    }
    await this.statusLabel?.setText(status);
  };

  private handleWin = async (): Promise<void> => {
    if (this.win) {
      const level = this.game.getLevel();
      const isLast = level >= this.game.getLevelCount() - 1;
      const msg = isLast
        ? 'You completed all levels!'
        : 'Puzzle solved! Try the next level.';
      await this.win.showInfo('Congratulations!', msg);
    }
  };

  initialize = async (): Promise<void> => { await this.updateDisplay(); };
}

// ============================================================================
// App Factory
// ============================================================================

export function createTangoPuzzleApp(a: App, windowWidth?: number, windowHeight?: number): TangoPuzzleUI {
  const ui = new TangoPuzzleUI(a);
  const isEmbedded = windowWidth !== undefined && windowHeight !== undefined;

  if (isEmbedded) {
    ui.buildContent();
    setTimeout(() => ui.initialize(), 0);
  } else {
    a.window({ title: 'Tango Puzzle', width: 420, height: 480 }, (win: Window) => {
      ui.setupWindow(win);
      win.setContent(() => ui.buildContent());
      win.show();
      setTimeout(() => ui.initialize(), 0);
    });
  }

  return ui;
}

export const PUZZLE_COUNT = PUZZLES.length;

// ============================================================================
// Standalone Entry Point
// ============================================================================

if (require.main === module) {
  app(resolveTransport(), { title: 'Tango Puzzle' }, async (a: App) => {
    const ui = createTangoPuzzleApp(a);
    await a.run();
    await ui.initialize();
  });
}
