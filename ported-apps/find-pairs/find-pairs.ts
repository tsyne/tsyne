/**
 * Find Pairs
 *
 * Memory matching game. Find all matching pairs on a 10x5 grid.
 *
 * Port of ChrysaLisp pairs app by Chris Hinsley
 * Original: https://github.com/vygr/ChrysaLisp/blob/master/apps/pairs/app.lisp
 * License: GPL-2.0
 *
 * @tsyne-app:name Find Pairs
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="none">
 *   <rect x="2" y="2" width="9" height="9" rx="1" fill="#888" stroke="#333" stroke-width="0.5"/>
 *   <rect x="13" y="2" width="9" height="9" rx="1" fill="#4a4" stroke="#333" stroke-width="0.5"/>
 *   <rect x="2" y="13" width="9" height="9" rx="1" fill="#4a4" stroke="#333" stroke-width="0.5"/>
 *   <rect x="13" y="13" width="9" height="9" rx="1" fill="#888" stroke="#333" stroke-width="0.5"/>
 *   <text x="6.5" y="9" font-size="6" fill="#FFF" text-anchor="middle" font-weight="bold">A</text>
 *   <text x="6.5" y="20" font-size="6" fill="#FFF" text-anchor="middle" font-weight="bold">A</text>
 * </svg>
 * SVG
 * @tsyne-app:category games
 * @tsyne-app:builder createFindPairsApp
 * @tsyne-app:args app,windowWidth,windowHeight
 */

import { app, resolveTransport } from 'tsyne';
import type { App, Window, ColorCell } from 'tsyne';

// ============================================================================
// Constants
// ============================================================================

const GRID_W = 10;
const GRID_H = 5;
const TILE_COUNT = GRID_W * GRID_H;
const PAIR_COUNT = TILE_COUNT / 2;
const CHAR_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXY';
const MATCH_SCORE = 10;
const MISMATCH_PENALTY = 1;
const REVEAL_DELAY = 1000;

type TileState = 'hidden' | 'revealed' | 'matched';

// ============================================================================
// Game Logic
// ============================================================================

export class FindPairsGame {
  private values: string[] = [];
  private states: TileState[] = [];
  private score = 0;
  private firstPick: number | null = null;
  private locked = false;
  private onUpdate?: () => void;
  private onWin?: () => void;

  constructor() { this.scramble(); }

  private shuffle = <T>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  scramble = (): void => {
    const chars = this.shuffle([...CHAR_POOL]).slice(0, PAIR_COUNT);
    this.values = this.shuffle([...chars, ...chars]);
    this.states = Array(TILE_COUNT).fill('hidden');
    this.score = 0;
    this.firstPick = null;
    this.locked = false;
    this.onUpdate?.();
  };

  getState = (i: number): TileState => this.states[i];
  getValue = (i: number): string => this.values[i];
  getScore = (): number => this.score;
  isLocked = (): boolean => this.locked;

  isWon = (): boolean => this.states.every(s => s === 'matched');

  tryClick = (index: number): void => {
    if (this.locked || this.states[index] !== 'hidden') return;

    if (this.firstPick === null) {
      this.firstPick = index;
      this.states[index] = 'revealed';
      this.onUpdate?.();
    } else {
      this.states[index] = 'revealed';
      this.onUpdate?.();

      const v1 = this.values[this.firstPick];
      const v2 = this.values[index];

      if (v1 === v2) {
        this.states[this.firstPick] = 'matched';
        this.states[index] = 'matched';
        this.score += MATCH_SCORE;
        this.firstPick = null;
        this.onUpdate?.();
        if (this.isWon()) this.onWin?.();
      } else {
        this.score -= MISMATCH_PENALTY;
        this.locked = true;
        this.onUpdate?.();
        setTimeout(() => {
          this.states[this.firstPick!] = 'hidden';
          this.states[index] = 'hidden';
          this.firstPick = null;
          this.locked = false;
          this.onUpdate?.();
        }, REVEAL_DELAY);
      }
    }
  };

  peek = (): void => {
    this.states = this.states.map(() => 'matched');
    this.onUpdate?.();
  };

  setOnUpdate = (cb: () => void): void => { this.onUpdate = cb; };
  setOnWin = (cb: () => void): void => { this.onWin = cb; };
}

// ============================================================================
// UI
// ============================================================================

export class FindPairsUI {
  private game = new FindPairsGame();
  private cells: ColorCell[] = [];
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
        { label: 'New Game', onSelected: () => this.game.scramble() },
        { label: 'Peek', onSelected: () => this.game.peek() },
        { label: '', isSeparator: true },
        { label: 'Exit', onSelected: () => process.exit(0) },
      ],
    }]);
  };

  buildContent = (): void => {
    this.a.vbox(() => {
      this.a.hbox(() => {
        this.a.button('New Game').onClick(() => this.game.scramble()).withId('newGameBtn');
        this.a.button('Peek').onClick(() => this.game.peek()).withId('peekBtn');
      });

      this.a.separator();

      this.a.grid(GRID_W, () => {
        for (let i = 0; i < TILE_COUNT; i++) {
          const cell = this.a.colorCell({
            width: 50, height: 50,
            text: '',
            fillColor: '#666666',
            textColor: '#FFFFFF',
            borderColor: '#333333',
            borderWidth: 1,
            centerText: true,
            onClick: () => this.game.tryClick(i),
          }).withId(`tile-${i}`);
          this.cells.push(cell);
        }
      }, { cellSize: 50, spacing: 2 });

      this.a.separator();
      this.statusLabel = this.a.label('Score: 0').withId('statusLabel');
    });
  };

  private updateDisplay = async (): Promise<void> => {
    for (let i = 0; i < TILE_COUNT; i++) {
      const state = this.game.getState(i);
      const value = this.game.getValue(i);
      const cell = this.cells[i];
      if (!cell) continue;

      if (state === 'hidden') {
        await cell.setText('');
        await cell.setFillColor('#666666');
      } else if (state === 'revealed') {
        await cell.setText(value);
        await cell.setFillColor('#FFFFFF');
        await cell.setTextColor('#000000');
      } else {
        await cell.setText(value);
        await cell.setFillColor('#44AA44');
        await cell.setTextColor('#FFFFFF');
      }
    }

    const score = this.game.getScore();
    const status = this.game.isWon() ? `WINNER! Score: ${score}` : `Score: ${score}`;
    await this.statusLabel?.setText(status);
  };

  private handleWin = async (): Promise<void> => {
    if (this.win) {
      await this.win.showInfo('Congratulations!', `You found all pairs!\n\nFinal Score: ${this.game.getScore()}`);
    }
  };

  initialize = async (): Promise<void> => { await this.updateDisplay(); };
}

// ============================================================================
// App Factory
// ============================================================================

export function createFindPairsApp(a: App, windowWidth?: number, windowHeight?: number): FindPairsUI {
  const ui = new FindPairsUI(a);
  const isEmbedded = windowWidth !== undefined && windowHeight !== undefined;

  if (isEmbedded) {
    ui.buildContent();
    setTimeout(() => ui.initialize(), 0);
  } else {
    a.window({ title: 'Find Pairs', width: 560, height: 380 }, (win: Window) => {
      ui.setupWindow(win);
      win.setContent(() => ui.buildContent());
      win.show();
      setTimeout(() => ui.initialize(), 0);
    });
  }

  return ui;
}

export { GRID_W, GRID_H, TILE_COUNT, PAIR_COUNT, MATCH_SCORE, MISMATCH_PENALTY };

// ============================================================================
// Standalone Entry Point
// ============================================================================

if (require.main === module) {
  app(resolveTransport(), { title: 'Find Pairs' }, async (a: App) => {
    const ui = createFindPairsApp(a);
    await a.run();
    await ui.initialize();
  });
}
