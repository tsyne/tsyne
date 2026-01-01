/**
 * Slider Puzzle
 *
 * 5x5 sliding tile puzzle. Click a tile adjacent to the blank to swap.
 *
 * Port of ChrysaLisp slider app by Chris Hinsley
 * Original: https://github.com/vygr/ChrysaLisp/blob/master/apps/slider/app.lisp
 * License: GPL-2.0
 *
 * @tsyne-app:name Slider Puzzle
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="none">
 *   <rect x="2" y="2" width="9" height="9" rx="1" fill="#4488CC" stroke="#333" stroke-width="0.5"/>
 *   <rect x="13" y="2" width="9" height="9" rx="1" fill="#4488CC" stroke="#333" stroke-width="0.5"/>
 *   <rect x="2" y="13" width="9" height="9" rx="1" fill="#4488CC" stroke="#333" stroke-width="0.5"/>
 *   <rect x="13" y="13" width="9" height="9" rx="1" fill="#666" stroke="#333" stroke-width="0.5"/>
 *   <text x="6.5" y="9" font-size="6" fill="#FFF" text-anchor="middle" font-weight="bold">A</text>
 *   <text x="17.5" y="9" font-size="6" fill="#FFF" text-anchor="middle" font-weight="bold">B</text>
 *   <text x="6.5" y="20" font-size="6" fill="#FFF" text-anchor="middle" font-weight="bold">C</text>
 * </svg>
 * SVG
 * @tsyne-app:category games
 * @tsyne-app:builder createSliderPuzzleApp
 * @tsyne-app:args app
 */

import { app, resolveTransport } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { ColorCell } from '../../core/src/widgets/display';

// ============================================================================
// Constants
// ============================================================================

const GRID_W = 5;
const GRID_H = 5;
const TILE_COUNT = GRID_W * GRID_H;
const BLANK = TILE_COUNT - 1;

// ============================================================================
// Game Logic
// ============================================================================

export class SliderPuzzle {
  private board: number[];
  private onUpdate?: () => void;

  constructor() {
    this.board = this.solvedBoard();
  }

  private solvedBoard = (): number[] => [...Array(TILE_COUNT).keys()];

  getBoard = (): readonly number[] => this.board;
  getValue = (i: number): number => this.board[i];
  getLabel = (v: number): string => v === BLANK ? '' : String.fromCharCode(65 + v);
  isSolved = (): boolean => this.board.every((v, i) => v === i);

  private blankIndex = (): number => this.board.indexOf(BLANK);

  private toXY = (i: number): [number, number] => [i % GRID_W, Math.floor(i / GRID_W)];

  private manhattan = (i1: number, i2: number): number => {
    const [x1, y1] = this.toXY(i1);
    const [x2, y2] = this.toXY(i2);
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  };

  private swap = (i1: number, i2: number): void => {
    [this.board[i1], this.board[i2]] = [this.board[i2], this.board[i1]];
  };

  private neighbors = (i: number): number[] => {
    const [x, y] = this.toXY(i);
    const n: number[] = [];
    if (x > 0) n.push(i - 1);
    if (x < GRID_W - 1) n.push(i + 1);
    if (y > 0) n.push(i - GRID_W);
    if (y < GRID_H - 1) n.push(i + GRID_W);
    return n;
  };

  tryMove = (index: number): boolean => {
    const blank = this.blankIndex();
    if (this.manhattan(index, blank) !== 1) return false;
    this.swap(index, blank);
    this.onUpdate?.();
    return true;
  };

  scramble = (moves = 400): void => {
    this.board = this.solvedBoard();
    let prev = -1;
    for (let i = 0; i < moves; i++) {
      const blank = this.blankIndex();
      const candidates = this.neighbors(blank).filter(n => n !== prev);
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      prev = blank;
      this.swap(blank, pick);
    }
    this.onUpdate?.();
  };

  solve = (): void => {
    this.board = this.solvedBoard();
    this.onUpdate?.();
  };

  setOnUpdate = (cb: () => void): void => { this.onUpdate = cb; };
}

// ============================================================================
// UI
// ============================================================================

export class SliderPuzzleUI {
  private puzzle = new SliderPuzzle();
  private cells: ColorCell[] = [];
  private statusLabel: any = null;
  private a: App;
  private win: Window | null = null;

  constructor(a: App) {
    this.a = a;
    this.puzzle.setOnUpdate(() => this.updateDisplay());
  }

  setupWindow = (win: Window): void => {
    this.win = win;
    win.setMainMenu([
      {
        label: 'Game',
        items: [
          { label: 'Scramble', onSelected: () => this.puzzle.scramble() },
          { label: 'Solve', onSelected: () => this.puzzle.solve() },
          { label: '', isSeparator: true },
          { label: 'Exit', onSelected: () => process.exit(0) },
        ],
      },
    ]);
  };

  buildContent = (): void => {
    this.a.vbox(() => {
      this.a.hbox(() => {
        this.a.button('Scramble').onClick(() => this.puzzle.scramble()).withId('scrambleBtn');
        this.a.button('Solve').onClick(() => this.puzzle.solve()).withId('solveBtn');
      });

      this.a.separator();

      this.a.grid(GRID_W, () => {
        for (let i = 0; i < TILE_COUNT; i++) {
          const v = this.puzzle.getValue(i);
          const cell = this.a.colorCell({
            width: 60, height: 60,
            text: this.puzzle.getLabel(v),
            fillColor: v === BLANK ? '#666666' : '#4488CC',
            textColor: '#FFFFFF',
            borderColor: '#333333',
            borderWidth: 2,
            centerText: true,
            onClick: () => this.puzzle.tryMove(i),
          }).withId(`tile-${i}`);
          this.cells.push(cell);
        }
      }, { cellSize: 60, spacing: 2 });

      this.a.separator();
      this.statusLabel = this.a.label(' ').withId('statusLabel');
    });
  };

  private updateDisplay = async (): Promise<void> => {
    for (let i = 0; i < TILE_COUNT; i++) {
      const v = this.puzzle.getValue(i);
      await this.cells[i]?.setText(this.puzzle.getLabel(v));
      await this.cells[i]?.setFillColor(v === BLANK ? '#666666' : '#4488CC');
    }
    if (this.statusLabel) {
      await this.statusLabel.setText(this.puzzle.isSolved() ? 'SOLVED!' : ' ');
    }
  };

  initialize = async (): Promise<void> => { await this.updateDisplay(); };
}

// ============================================================================
// App Factory
// ============================================================================

export function createSliderPuzzleApp(a: App): SliderPuzzleUI {
  const ui = new SliderPuzzleUI(a);

  a.window({ title: 'Slider Puzzle', width: 380, height: 450 }, (win: Window) => {
    ui.setupWindow(win);
    win.setContent(() => ui.buildContent());
    win.show();
    setTimeout(() => ui.initialize(), 0);
  });

  return ui;
}

// Export constants for testing
export { GRID_W, GRID_H, TILE_COUNT, BLANK };

// ============================================================================
// Standalone Entry Point
// ============================================================================

if (require.main === module) {
  app(resolveTransport(), { title: 'Slider Puzzle' }, async (a: App) => {
    const ui = createSliderPuzzleApp(a);
    await a.run();
    await ui.initialize();
  });
}
