/**
 * Peg Solitaire
 *
 * English Cross peg solitaire. Jump pegs to remove them, aim for one peg in center.
 *
 * Port of ChrysaLisp solitaire app by Chris Hinsley
 * Original: https://github.com/vygr/ChrysaLisp/blob/master/apps/solitaire/app.lisp
 * License: GPL-2.0
 *
 * @tsyne-app:name Peg Solitaire
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="none">
 *   <circle cx="12" cy="6" r="3" fill="#666"/>
 *   <circle cx="6" cy="12" r="3" fill="#888"/>
 *   <circle cx="12" cy="12" r="3" fill="#444" stroke="#ff0" stroke-width="1"/>
 *   <circle cx="18" cy="12" r="3" fill="#888"/>
 *   <circle cx="12" cy="18" r="3" fill="#888"/>
 * </svg>
 * SVG
 * @tsyne-app:category games
 * @tsyne-app:builder createPegSolitaireApp
 * @tsyne-app:args app
 */

import { app, resolveTransport } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { ColorCell } from '../../core/src/widgets/display';

// ============================================================================
// Constants
// ============================================================================

const GRID_SIZE = 7;
const TILE_COUNT = GRID_SIZE * GRID_SIZE;
const CENTER = 24; // 3 + 3*7

type CellState = 'invalid' | 'empty' | 'peg';

// ============================================================================
// Game Logic
// ============================================================================

export class PegSolitaireGame {
  private board: CellState[] = [];
  private selected: number | null = null;
  private undoStack: { selected: number | null; board: CellState[] }[] = [];
  private onUpdate?: () => void;
  private onWin?: () => void;

  constructor() { this.reset(); }

  private isValidPos = (i: number): boolean => {
    const x = i % GRID_SIZE, y = Math.floor(i / GRID_SIZE);
    return (x >= 2 && x <= 4) || (y >= 2 && y <= 4);
  };

  reset = (): void => {
    this.board = Array.from({ length: TILE_COUNT }, (_, i) =>
      this.isValidPos(i) ? 'peg' : 'invalid'
    );
    this.board[CENTER] = 'empty';
    this.selected = null;
    this.undoStack = [];
    this.onUpdate?.();
  };

  getState = (i: number): CellState => this.board[i];
  getSelected = (): number | null => this.selected;
  canUndo = (): boolean => this.undoStack.length > 0;

  getPegsLeft = (): number => this.board.filter(s => s === 'peg').length;

  isWon = (): boolean => this.getPegsLeft() === 1;
  isPerfect = (): boolean => this.isWon() && this.board[CENTER] === 'peg';

  hasValidMoves = (): boolean => {
    for (let i = 0; i < TILE_COUNT; i++) {
      if (this.board[i] !== 'peg') continue;
      const dirs = [[-2, 0], [2, 0], [0, -2], [0, 2]];
      const x = i % GRID_SIZE, y = Math.floor(i / GRID_SIZE);
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        const to = nx + ny * GRID_SIZE;
        const mid = (x + dx / 2) + (y + dy / 2) * GRID_SIZE;
        if (this.board[to] === 'empty' && this.board[mid] === 'peg') return true;
      }
    }
    return false;
  };

  isGameOver = (): boolean => this.isWon() || !this.hasValidMoves();

  tryClick = (index: number): void => {
    if (this.isGameOver()) return;
    const state = this.board[index];

    if (state === 'peg') {
      this.selected = this.selected === index ? null : index;
      this.onUpdate?.();
    } else if (state === 'empty' && this.selected !== null) {
      this.tryMove(index);
    }
  };

  private tryMove = (toIdx: number): void => {
    const fromIdx = this.selected!;
    const x1 = fromIdx % GRID_SIZE, y1 = Math.floor(fromIdx / GRID_SIZE);
    const x2 = toIdx % GRID_SIZE, y2 = Math.floor(toIdx / GRID_SIZE);
    const dx = x2 - x1, dy = y2 - y1;

    const validJump = (Math.abs(dx) === 2 && dy === 0) || (Math.abs(dy) === 2 && dx === 0);
    if (!validJump) {
      this.selected = null;
      this.onUpdate?.();
      return;
    }

    const midIdx = (x1 + dx / 2) + (y1 + dy / 2) * GRID_SIZE;
    if (this.board[toIdx] !== 'empty' || this.board[midIdx] !== 'peg') {
      this.selected = null;
      this.onUpdate?.();
      return;
    }

    this.undoStack.push({ selected: this.selected, board: [...this.board] });
    this.board[fromIdx] = 'empty';
    this.board[midIdx] = 'empty';
    this.board[toIdx] = 'peg';
    this.selected = null;
    this.onUpdate?.();

    if (this.isWon()) this.onWin?.();
  };

  undo = (): void => {
    const state = this.undoStack.pop();
    if (state) {
      this.board = state.board;
      this.selected = state.selected;
      this.onUpdate?.();
    }
  };

  setOnUpdate = (cb: () => void): void => { this.onUpdate = cb; };
  setOnWin = (cb: () => void): void => { this.onWin = cb; };
}

// ============================================================================
// UI
// ============================================================================

export class PegSolitaireUI {
  private game = new PegSolitaireGame();
  private cells: (ColorCell | null)[] = [];
  private statusLabel: any = null;
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
        { label: 'New Game', onSelected: () => this.game.reset() },
        { label: 'Undo', onSelected: () => this.game.undo() },
        { label: '', isSeparator: true },
        { label: 'Exit', onSelected: () => process.exit(0) },
      ],
    }]);
  };

  private isValidPos = (i: number): boolean => {
    const x = i % GRID_SIZE, y = Math.floor(i / GRID_SIZE);
    return (x >= 2 && x <= 4) || (y >= 2 && y <= 4);
  };

  buildContent = (): void => {
    this.a.vbox(() => {
      this.a.hbox(() => {
        this.a.button('New Game').onClick(() => this.game.reset()).withId('resetBtn');
        this.a.button('Undo').onClick(() => this.game.undo()).withId('undoBtn');
      });

      this.a.separator();

      this.a.grid(GRID_SIZE, () => {
        for (let i = 0; i < TILE_COUNT; i++) {
          if (this.isValidPos(i)) {
            const cell = this.a.colorCell({
              width: 45, height: 45,
              text: 'O',
              fillColor: '#666666',
              textColor: '#FFFFFF',
              borderColor: '#333333',
              borderWidth: 1,
              centerText: true,
              onClick: () => this.game.tryClick(i),
            }).withId(`cell-${i}`);
            this.cells[i] = cell;
          } else {
            this.a.colorCell({
              width: 45, height: 45,
              text: '',
              fillColor: '#333333',
              textColor: '#333333',
              borderColor: '#333333',
              borderWidth: 0,
              centerText: true,
            });
            this.cells[i] = null;
          }
        }
      }, { cellSize: 45, spacing: 2 });

      this.a.separator();
      this.statusLabel = this.a.label('Pegs: 32').withId('statusLabel');
    });
  };

  private updateDisplay = async (): Promise<void> => {
    const selected = this.game.getSelected();

    for (let i = 0; i < TILE_COUNT; i++) {
      const cell = this.cells[i];
      if (!cell) continue;

      const state = this.game.getState(i);
      if (state === 'empty') {
        await cell.setText('');
        await cell.setFillColor('#444444');
      } else if (state === 'peg') {
        await cell.setText('O');
        if (i === selected) {
          await cell.setFillColor('#CCCC00');
          await cell.setTextColor('#000000');
        } else {
          await cell.setFillColor('#666666');
          await cell.setTextColor('#FFFFFF');
        }
      }
    }

    const pegs = this.game.getPegsLeft();
    let status: string;
    if (this.game.isPerfect()) {
      status = 'Perfect! (Center)';
    } else if (this.game.isWon()) {
      status = 'You Win!';
    } else if (this.game.isGameOver()) {
      status = `Game Over - Pegs: ${pegs}`;
    } else {
      status = `Pegs: ${pegs}`;
    }
    await this.statusLabel?.setText(status);
  };

  private handleWin = async (): Promise<void> => {
    if (this.win) {
      const msg = this.game.isPerfect()
        ? 'Perfect game! You finished with one peg in the center!'
        : 'You finished with one peg remaining!';
      await this.win.showInfo('Congratulations!', msg);
    }
  };

  initialize = async (): Promise<void> => { await this.updateDisplay(); };
}

// ============================================================================
// App Factory
// ============================================================================

export function createPegSolitaireApp(a: App): PegSolitaireUI {
  const ui = new PegSolitaireUI(a);

  a.window({ title: 'Peg Solitaire', width: 380, height: 430 }, (win: Window) => {
    ui.setupWindow(win);
    win.setContent(() => ui.buildContent());
    win.show();
    setTimeout(() => ui.initialize(), 0);
  });

  return ui;
}

export { GRID_SIZE, TILE_COUNT, CENTER };

// ============================================================================
// Standalone Entry Point
// ============================================================================

if (require.main === module) {
  app(resolveTransport(), { title: 'Peg Solitaire' }, async (a: App) => {
    const ui = createPegSolitaireApp(a);
    await a.run();
    await ui.initialize();
  });
}
