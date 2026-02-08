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

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { cosyne, enableEventHandling, refreshAllCosyneContexts } from 'cosyne';
import type { CosyneContext } from 'cosyne';

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

// Layout
const TILE_SIZE = 52;
const TILE_GAP = 3;
const TILE_RADIUS = 6;
const CANVAS_PAD = 8;
const GRID_PX_W = GRID_W * (TILE_SIZE + TILE_GAP) - TILE_GAP;
const GRID_PX_H = GRID_H * (TILE_SIZE + TILE_GAP) - TILE_GAP;
const CANVAS_W = GRID_PX_W + CANVAS_PAD * 2;
const CANVAS_H = GRID_PX_H + CANVAS_PAD * 2;

// Colors
const BG_COLOR = '#1a1a2e';
const HIDDEN_COLOR = '#555566';
const REVEALED_COLOR = '#ffffff';
const MATCHED_COLOR = '#338833';
const HIDDEN_TEXT_COLOR = '#aaaaaa';
const REVEALED_TEXT_COLOR = '#000000';
const MATCHED_TEXT_COLOR = '#ffffff';

// ============================================================================
// Game Logic
// ============================================================================

export class FindPairsGame {
  private values: string[] = [];
  private states: TileState[] = [];
  private score = 0;
  private firstPick: number | null = null;
  private locked = false;
  private mismatchTimer: ReturnType<typeof setTimeout> | null = null;
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
    this.clearTimer();
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
        this.mismatchTimer = setTimeout(() => {
          this.mismatchTimer = null;
          this.hideMismatched();
        }, REVEAL_DELAY);
      }
    }
  };

  /** For testing: immediately resolve the mismatch timer */
  flushMismatchTimer = (): void => {
    if (this.mismatchTimer !== null) {
      this.clearTimer();
      this.hideMismatched();
    }
  };

  private hideMismatched = (): void => {
    for (let i = 0; i < TILE_COUNT; i++) {
      if (this.states[i] === 'revealed') this.states[i] = 'hidden';
    }
    this.firstPick = null;
    this.locked = false;
    this.onUpdate?.();
  };

  private clearTimer = (): void => {
    if (this.mismatchTimer !== null) {
      clearTimeout(this.mismatchTimer);
      this.mismatchTimer = null;
    }
  };

  peek = (): void => {
    this.clearTimer();
    this.states = this.states.map(() => 'matched');
    this.firstPick = null;
    this.locked = false;
    this.onUpdate?.();
  };

  cleanup = (): void => { this.clearTimer(); };

  setOnUpdate = (cb: () => void): void => { this.onUpdate = cb; };
  setOnWin = (cb: () => void): void => { this.onWin = cb; };
}

// ============================================================================
// UI (Cosyne canvas)
// ============================================================================

export class FindPairsUI {
  private game = new FindPairsGame();
  private statusLabel: any = null;
  private a: App;
  private win: Window | null = null;

  constructor(a: App) {
    this.a = a;
    this.game.setOnUpdate(() => {
      refreshAllCosyneContexts();
      this.updateStatus();
    });
    this.game.setOnWin(() => this.handleWin());
  }

  getPuzzle(): FindPairsGame { return this.game; }

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

  private tileFill = (i: number): string => {
    const s = this.game.getState(i);
    if (s === 'matched') return MATCHED_COLOR;
    if (s === 'revealed') return REVEALED_COLOR;
    return HIDDEN_COLOR;
  };

  private tileText = (i: number): string => {
    const s = this.game.getState(i);
    if (s === 'hidden') return '?';
    return this.game.getValue(i);
  };

  private tileTextColor = (i: number): string => {
    const s = this.game.getState(i);
    if (s === 'matched') return MATCHED_TEXT_COLOR;
    if (s === 'revealed') return REVEALED_TEXT_COLOR;
    return HIDDEN_TEXT_COLOR;
  };

  private buildGrid(c: CosyneContext): void {
    c.rect(0, 0, CANVAS_W, CANVAS_H, { fillColor: BG_COLOR, cornerRadius: 8 });

    for (let row = 0; row < GRID_H; row++) {
      for (let col = 0; col < GRID_W; col++) {
        const i = row * GRID_W + col;
        const x = CANVAS_PAD + col * (TILE_SIZE + TILE_GAP);
        const y = CANVAS_PAD + row * (TILE_SIZE + TILE_GAP);

        c.rect(x, y, TILE_SIZE, TILE_SIZE, {
          fillColor: HIDDEN_COLOR,
          cornerRadius: TILE_RADIUS,
        })
          .withId(`tile-${i}`)
          .bindFill(() => this.tileFill(i))
          .onClick(() => { this.game.tryClick(i); });

        c.text(x + TILE_SIZE / 2 - 7, y + TILE_SIZE / 2 - 9, '?', {
          fontSize: 20,
          fillColor: HIDDEN_TEXT_COLOR,
        })
          .bindText(() => this.tileText(i))
          .bindFill(() => this.tileTextColor(i))
          .passthrough();
      }
    }
  }

  buildContent = (): void => {
    this.a.vbox(() => {
      this.a.hbox(() => {
        this.a.button('New Game', { onClick: () => this.game.scramble() }).withId('newGameBtn');
        this.a.button('Peek', { onClick: () => this.game.peek() }).withId('peekBtn');
      });

      this.a.separator();

      this.a.canvasStack(() => {
        const ctx = cosyne(this.a, (c) => {
          this.buildGrid(c);
        });
        enableEventHandling(ctx, this.a, { width: CANVAS_W, height: CANVAS_H });
      });

      this.a.separator();
      this.statusLabel = this.a.label('Score: 0').withId('statusLabel');
    });
  };

  private updateStatus = async (): Promise<void> => {
    if (!this.statusLabel) return;
    const score = this.game.getScore();
    if (this.game.isWon()) {
      await this.statusLabel.setText(`WINNER! Score: ${score}`);
    } else {
      await this.statusLabel.setText(`Score: ${score}`);
    }
  };

  private handleWin = async (): Promise<void> => {
    if (this.win) {
      await this.win.showInfo('Congratulations!', `You found all pairs!\n\nFinal Score: ${this.game.getScore()}`);
    }
  };

  initialize = async (): Promise<void> => {
    refreshAllCosyneContexts();
    await this.updateStatus();
  };

  cleanup(): void {
    this.game.cleanup();
  }
}

// ============================================================================
// App Factory
// ============================================================================

export function createFindPairsApp(a: App, windowWidth?: number, windowHeight?: number): FindPairsUI {
  const ui = new FindPairsUI(a);
  a.registerCleanup(() => ui.cleanup());

  a.window({ title: 'Find Pairs', width: windowWidth ?? 600, height: windowHeight ?? 400 }, (win: Window) => {
    ui.setupWindow(win);
    win.setContent(() => ui.buildContent());
    win.show();
    setTimeout(() => ui.initialize(), 0);
  });

  return ui;
}

export { GRID_W, GRID_H, TILE_COUNT, PAIR_COUNT, MATCH_SCORE, MISMATCH_PENALTY };

// ============================================================================
// Standalone Entry Point
// ============================================================================

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Find Pairs' }, async (a: App) => {
    const ui = createFindPairsApp(a);
    appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
    await a.run();
    await ui.initialize();
  });
}
