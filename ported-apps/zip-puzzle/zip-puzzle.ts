/**
 * Zip Puzzle
 *
 * Connect numbered dots in order while filling every cell.
 * Draw a path from 1→2→3→... visiting each cell exactly once.
 *
 * @tsyne-app:name Zip Puzzle
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="none">
 *   <rect x="2" y="2" width="20" height="20" rx="2" fill="#f0f0f0" stroke="#ccc"/>
 *   <circle cx="6" cy="6" r="3" fill="#222"/>
 *   <text x="6" y="8" font-size="5" fill="#fff" text-anchor="middle">1</text>
 *   <circle cx="18" cy="18" r="3" fill="#222"/>
 *   <text x="18" y="20" font-size="5" fill="#fff" text-anchor="middle">2</text>
 *   <path d="M6 6 L6 18 L18 18" stroke="#4c4" stroke-width="3" fill="none" stroke-linecap="round"/>
 * </svg>
 * SVG
 * @tsyne-app:category games
 * @tsyne-app:builder createZipPuzzleApp
 * @tsyne-app:args app,windowWidth,windowHeight
 */

import { app, resolveTransport } from 'tsyne';
import type { App, Window, ColorCell } from 'tsyne';

// ============================================================================
// Types & Constants
// ============================================================================

interface Puzzle {
  size: number;
  waypoints: Map<number, number>; // position -> waypoint number (1, 2, 3...)
}

const PUZZLES: Puzzle[] = [
  // 5x5 Easy
  {
    size: 5,
    waypoints: new Map([[0, 1], [4, 2], [24, 3]]),
  },
  // 5x5 Medium
  {
    size: 5,
    waypoints: new Map([[0, 1], [2, 2], [12, 3], [22, 4], [24, 5]]),
  },
  // 6x6 Medium
  {
    size: 6,
    waypoints: new Map([[0, 1], [5, 2], [17, 3], [30, 4], [35, 5]]),
  },
  // 6x6 Hard
  {
    size: 6,
    waypoints: new Map([[0, 1], [3, 2], [14, 3], [21, 4], [32, 5], [35, 6]]),
  },
  // 7x7 Hard
  {
    size: 7,
    waypoints: new Map([[0, 1], [6, 2], [24, 3], [42, 4], [48, 5]]),
  },
];

// ============================================================================
// Game Logic
// ============================================================================

export class ZipPuzzleGame {
  private puzzle: Puzzle;
  private path: number[] = [];
  private size = 5;
  private level = 0;
  private onUpdate?: () => void;
  private onWin?: () => void;

  constructor() {
    this.puzzle = PUZZLES[0];
    this.size = this.puzzle.size;
    this.reset();
  }

  private getMaxWaypoint = (): number => Math.max(...this.puzzle.waypoints.values());

  reset = (): void => {
    this.path = [];
    // Find starting position (waypoint 1)
    for (const [pos, num] of this.puzzle.waypoints) {
      if (num === 1) {
        this.path = [pos];
        break;
      }
    }
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
  getPath = (): readonly number[] => this.path;
  getWaypoint = (pos: number): number | undefined => this.puzzle.waypoints.get(pos);

  isInPath = (pos: number): boolean => this.path.includes(pos);
  getPathIndex = (pos: number): number => this.path.indexOf(pos);
  isHead = (pos: number): boolean => this.path.length > 0 && this.path[this.path.length - 1] === pos;

  private toXY = (pos: number): [number, number] => [pos % this.size, Math.floor(pos / this.size)];

  private isAdjacent = (a: number, b: number): boolean => {
    const [x1, y1] = this.toXY(a);
    const [x2, y2] = this.toXY(b);
    return (Math.abs(x1 - x2) + Math.abs(y1 - y2)) === 1;
  };

  private getNextRequiredWaypoint = (): number => {
    let maxHit = 0;
    for (const pos of this.path) {
      const wp = this.puzzle.waypoints.get(pos);
      if (wp && wp > maxHit) maxHit = wp;
    }
    return maxHit + 1;
  };

  tryClick = (pos: number): void => {
    if (this.path.length === 0) return;

    const head = this.path[this.path.length - 1];

    // Click on head = undo last move
    if (pos === head && this.path.length > 1) {
      this.path.pop();
      this.onUpdate?.();
      return;
    }

    // Click on previous cell in path = undo back to there
    const idx = this.path.indexOf(pos);
    if (idx >= 0 && idx < this.path.length - 1) {
      this.path = this.path.slice(0, idx + 1);
      this.onUpdate?.();
      return;
    }

    // Try to extend path
    if (!this.isAdjacent(head, pos)) return;
    if (this.path.includes(pos)) return;

    // Check waypoint constraint
    const wp = this.puzzle.waypoints.get(pos);
    const nextRequired = this.getNextRequiredWaypoint();

    // If this cell has a waypoint, it must be the next required one
    if (wp && wp !== nextRequired) return;

    // If we need to hit a waypoint next, we can only go to non-waypoint cells
    // or the correct waypoint
    // (This allows free movement between waypoints)

    this.path.push(pos);
    this.onUpdate?.();

    if (this.isWon()) this.onWin?.();
  };

  isWon = (): boolean => {
    const totalCells = this.size * this.size;
    if (this.path.length !== totalCells) return false;

    // Check all waypoints were hit
    const maxWp = this.getMaxWaypoint();
    let lastWpPos = -1;
    for (let wp = 1; wp <= maxWp; wp++) {
      let found = false;
      for (const [pos, num] of this.puzzle.waypoints) {
        if (num === wp) {
          const idx = this.path.indexOf(pos);
          if (idx === -1 || idx <= lastWpPos) return false;
          lastWpPos = idx;
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  };

  setOnUpdate = (cb: () => void): void => { this.onUpdate = cb; };
  setOnWin = (cb: () => void): void => { this.onWin = cb; };
}

// ============================================================================
// UI
// ============================================================================

export class ZipPuzzleUI {
  private game = new ZipPuzzleGame();
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
        { label: 'Previous Level', onSelected: () => this.game.prevLevel() },
        { label: 'Next Level', onSelected: () => this.game.nextLevel() },
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
        this.a.button('◀').onClick(() => { this.game.prevLevel(); this.rebuildUI(); }).withId('prevBtn');
        this.levelLabel = this.a.label(`Level ${this.game.getLevel() + 1}/${this.game.getLevelCount()}`).withId('levelLabel');
        this.a.button('▶').onClick(() => { this.game.nextLevel(); this.rebuildUI(); }).withId('nextBtn');
      });

      this.a.separator();

      this.a.grid(size, () => {
        const totalCells = size * size;
        for (let i = 0; i < totalCells; i++) {
          const wp = this.game.getWaypoint(i);
          const cell = this.a.colorCell({
            width: 50, height: 50,
            text: wp ? String(wp) : '',
            fillColor: '#F0F0F0',
            textColor: wp ? '#FFFFFF' : '#333333',
            borderColor: '#CCCCCC',
            borderWidth: 1,
            centerText: true,
            onClick: () => this.game.tryClick(i),
          }).withId(`cell-${i}`);
          this.cells[i] = cell;
        }
      }, { cellSize: 50, spacing: 2 });

      this.a.separator();
      this.statusLabel = this.a.label('Connect the dots in order').withId('statusLabel');
    });
  };

  private rebuildUI = async (): Promise<void> => {
    // For level changes, we need to rebuild - but in Tsyne we update existing cells
    await this.updateDisplay();
    if (this.levelLabel) {
      await this.levelLabel.setText(`Level ${this.game.getLevel() + 1}/${this.game.getLevelCount()}`);
    }
  };

  private updateDisplay = async (): Promise<void> => {
    const size = this.game.getSize();
    const totalCells = size * size;

    for (let i = 0; i < totalCells; i++) {
      const cell = this.cells[i];
      if (!cell) continue;

      const wp = this.game.getWaypoint(i);
      const inPath = this.game.isInPath(i);
      const isHead = this.game.isHead(i);

      let fillColor = '#F0F0F0';
      let textColor = '#333333';
      let text = '';

      if (wp) {
        text = String(wp);
        if (inPath) {
          fillColor = '#228B22'; // Dark green for visited waypoint
          textColor = '#FFFFFF';
        } else {
          fillColor = '#333333'; // Black circle for unvisited waypoint
          textColor = '#FFFFFF';
        }
      } else if (inPath) {
        fillColor = isHead ? '#90EE90' : '#98FB98'; // Lighter green for path
        textColor = '#333333';
      }

      await cell.setText(text);
      await cell.setFillColor(fillColor);
      await cell.setTextColor(textColor);
    }

    const pathLen = this.game.getPath().length;
    const total = size * size;
    const status = this.game.isWon()
      ? 'Solved!'
      : `${pathLen}/${total} cells`;
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

export function createZipPuzzleApp(a: App, windowWidth?: number, windowHeight?: number): ZipPuzzleUI {
  const ui = new ZipPuzzleUI(a);
  const isEmbedded = windowWidth !== undefined && windowHeight !== undefined;

  if (isEmbedded) {
    ui.buildContent();
    setTimeout(() => ui.initialize(), 0);
  } else {
    a.window({ title: 'Zip Puzzle', width: 400, height: 450 }, (win: Window) => {
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
  app(resolveTransport(), { title: 'Zip Puzzle' }, async (a: App) => {
    const ui = createZipPuzzleApp(a);
    await a.run();
    await ui.initialize();
  });
}
