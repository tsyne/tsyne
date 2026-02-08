/**
 * GemGuesser - Fully Declarative Cosyne UI
 *
 * Puzzle game where you guess hidden gem locations using color clues.
 * Portions copyright Wngui 2026, portions copyright Paul Hammant, 2026.
 *
 * Run: npx tsx ported-apps/gem-guesser/src/gem-guesser.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, enableEventHandling, refreshAllCosyneContexts } from 'cosyne';
import type { CosyneContext } from 'cosyne';
import {
  createGameState,
  revealCell,
  selectColor,
  toggleGhostMark,
  calculateRowCounts,
  calculateColumnCounts,
  isSegmentComplete,
  getGemColorHex,
  getGemColorFadedHex,
  getRemainingCount,
  GRID_SIZE,
  COLORS,
  MAX_LIVES,
  type GameState,
  type GemColor,
  type Difficulty,
  type ColorSequence,
} from './game-logic';

// Layout constants
const CELL_SIZE = 50;
const GRID_PX = GRID_SIZE * CELL_SIZE;
const COUNT_AREA_W = 60;
const COUNT_AREA_H = 60;
const SELECTOR_H = 50;
const PADDING = 10;

const CANVAS_W = COUNT_AREA_W + GRID_PX + PADDING;
const CANVAS_H = COUNT_AREA_H + GRID_PX + SELECTOR_H + PADDING * 2;

// Colors
const HIDDEN_COLOR = '#555555';
const EMPTY_COLOR = '#333333';
const BACKGROUND_COLOR = '#1a1a2e';
const SELECTOR_BG = '#2a2a4e';
const SELECTED_BORDER = '#ffffff';
const GHOST_ALPHA_HEX = '66'; // ~40% opacity suffix

class GemGuesserGame {
  private game: GameState;
  private statusLabel: any = null;
  private win: any = null;

  constructor(private a: App) {
    this.game = createGameState('easy');
  }

  setWin(win: any): void {
    this.win = win;
  }

  private getCellFill(index: number): string {
    const cellState = this.game.cellStates[index];
    if (cellState === 'revealed') {
      const color = this.game.grid[index];
      return color ? getGemColorHex(color) : EMPTY_COLOR;
    }
    // Hidden cell - check for ghost mark
    const ghost = this.game.ghostMarks[index];
    if (ghost) {
      return getGemColorHex(ghost) + GHOST_ALPHA_HEX;
    }
    return HIDDEN_COLOR;
  }

  private handleCellClick(index: number): void {
    const { state, result } = revealCell(this.game, index);
    this.game = state;
    refreshAllCosyneContexts();
    this.updateStatus();
  }

  private handleCellRightClick(index: number): void {
    this.game = toggleGhostMark(this.game, index);
    refreshAllCosyneContexts();
  }

  private handleColorSelect(color: GemColor): void {
    this.game = selectColor(this.game, color);
    refreshAllCosyneContexts();
  }

  private newGame(difficulty?: Difficulty): void {
    this.game = createGameState(difficulty || this.game.difficulty);
    if (this.win) {
      this.win.setContent(this.buildUI());
    }
  }

  private updateStatus(): void {
    if (!this.statusLabel) return;
    this.statusLabel.setText(this.getStatusText());
  }

  private getStatusText(): string {
    if (this.game.gameOver) {
      return this.game.won ? 'You found all the gems!' : 'Game Over!';
    }
    const color = this.game.selectedColor || 'none';
    return `Lives: ${this.game.lives}/${MAX_LIVES}  |  Color: ${color}`;
  }

  private buildCountText(
    c: CosyneContext,
    sequences: ColorSequence[],
    x: number,
    y: number,
    vertical: boolean
  ): void {
    let offset = 0;
    for (const seq of sequences) {
      const tx = vertical ? x : x + offset;
      const ty = vertical ? y + offset : y;

      c.text(tx, ty, `${seq.count}`, {
        fontSize: 11,
        fillColor: '#000000', // placeholder, overridden by bindFill
      })
        .bindFill(() => {
          const complete = isSegmentComplete(seq, this.game.cellStates);
          return complete ? getGemColorFadedHex(seq.color) : getGemColorHex(seq.color);
        })
        .passthrough();

      offset += vertical ? 14 : 14;
    }
  }

  private buildGrid(c: CosyneContext): void {
    const gridOffsetX = COUNT_AREA_W;
    const gridOffsetY = COUNT_AREA_H;

    // Lives display (top-left corner, matching original layout)
    c.rect(4, 4, COUNT_AREA_W - 8, COUNT_AREA_H - 8, {
      fillColor: '#2a2a4e',
      cornerRadius: 8,
    });
    c.text(COUNT_AREA_W / 2 - 8, COUNT_AREA_H / 2 - 10, '', {
      fontSize: 18,
      fillColor: '#e74c3c',
    })
      .bindText(() => `${this.game.lives}`)
      .bindFill(() => this.game.lives > 1 ? '#e74c3c' : this.game.lives === 1 ? '#f39c12' : '#666666')
      .passthrough();
    c.text(COUNT_AREA_W / 2 - 16, COUNT_AREA_H / 2 + 8, 'lives', {
      fontSize: 9,
      fillColor: '#888888',
    }).passthrough();

    // Grid background
    c.rect(gridOffsetX, gridOffsetY, GRID_PX, GRID_PX, {
      fillColor: BACKGROUND_COLOR,
    });

    // Cells
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const index = row * GRID_SIZE + col;
        const cx = gridOffsetX + col * CELL_SIZE + 2;
        const cy = gridOffsetY + row * CELL_SIZE + 2;

        c.rect(cx, cy, CELL_SIZE - 4, CELL_SIZE - 4, {
          fillColor: HIDDEN_COLOR,
          cornerRadius: 6,
        })
          .bindFill(() => this.getCellFill(index))
          .onClick(() => this.handleCellClick(index));
      }
    }

    // Column counts (above grid)
    const colCounts = calculateColumnCounts(this.game.grid);
    for (let col = 0; col < GRID_SIZE; col++) {
      const sequences = colCounts[col];
      const x = gridOffsetX + col * CELL_SIZE + CELL_SIZE / 2 - 4;
      this.buildCountText(c, sequences, x, 2, true);
    }

    // Row counts (left of grid, matching original layout)
    const rowCounts = calculateRowCounts(this.game.grid);
    for (let row = 0; row < GRID_SIZE; row++) {
      const sequences = rowCounts[row];
      const y = gridOffsetY + row * CELL_SIZE + CELL_SIZE / 2 - 6;
      // Right-align against the grid edge
      const totalWidth = sequences.length * 14;
      const startX = COUNT_AREA_W - 4 - totalWidth;
      let offset = 0;
      for (const seq of sequences) {
        const tx = startX + offset;
        c.text(tx, y, `${seq.count}`, {
          fontSize: 11,
          fillColor: '#000000',
        })
          .bindFill(() => {
            const complete = isSegmentComplete(seq, this.game.cellStates);
            return complete ? getGemColorFadedHex(seq.color) : getGemColorHex(seq.color);
          })
          .passthrough();
        offset += 14;
      }
    }
  }

  private buildColorSelector(c: CosyneContext): void {
    const selectorY = COUNT_AREA_H + GRID_PX + PADDING;
    const boxSize = 36;
    const gap = 10;
    const totalWidth = COLORS.length * (boxSize + gap) - gap;
    const startX = COUNT_AREA_W + (GRID_PX - totalWidth) / 2;

    for (let i = 0; i < COLORS.length; i++) {
      const color = COLORS[i];
      const bx = startX + i * (boxSize + gap);

      // Color box
      c.rect(bx, selectorY, boxSize, boxSize, {
        fillColor: getGemColorHex(color),
        cornerRadius: 4,
        strokeColor: '#ffffff',
        strokeWidth: 1,
      })
        .bindStroke(() =>
          this.game.selectedColor === color ? SELECTED_BORDER : 'transparent'
        )
        .bindFill(() => {
          const remaining = getRemainingCount(this.game, color);
          return remaining === 0 ? '#444444' : getGemColorHex(color);
        })
        .onClick(() => this.handleColorSelect(color));

      // Remaining count text
      c.text(bx + boxSize / 2 - 4, selectorY + boxSize + 2, '0', {
        fontSize: 11,
        fillColor: '#ffffff',
      })
        .bindText(() => `${getRemainingCount(this.game, color)}`)
        .bindFill(() => {
          const remaining = getRemainingCount(this.game, color);
          return remaining === 0 ? '#666666' : '#ffffff';
        })
        .passthrough();
    }
  }

  buildUI(): () => void {
    return () => {
      this.a.vbox(() => {
        this.a.label('GEM GUESSER');
        this.statusLabel = this.a.label(this.getStatusText());

        // Difficulty buttons
        this.a.hbox(() => {
          this.a.button('Easy', {
            onClick: () => this.newGame('easy'),
          });
          this.a.button('Medium', {
            onClick: () => this.newGame('medium'),
          });
          this.a.button('Hard', {
            onClick: () => this.newGame('hard'),
          });
          this.a.button('New Game', {
            onClick: () => this.newGame(),
          });
        });

        // Main canvas
        this.a.canvasStack(() => {
          const ctx = cosyne(this.a, (c) => {
            // Background
            c.rect(0, 0, CANVAS_W, CANVAS_H, { fillColor: BACKGROUND_COLOR });

            this.buildGrid(c);
            this.buildColorSelector(c);
          });
          enableEventHandling(ctx, this.a, {
            width: CANVAS_W,
            height: CANVAS_H,
          });
        });
      });
    };
  }
}

export function createGemGuesserApp(a: App): void {
  const game = new GemGuesserGame(a);

  a.window(
    {
      title: 'GemGuesser',
      width: CANVAS_W + 40,
      height: CANVAS_H + 140,
    },
    (win: any) => {
      game.setWin(win);
      win.setContent(game.buildUI());
      win.show();
    }
  );
}

// Main entry point
if (require.main === module) {
  const appInstance = app(
    resolveTransport(),
    { title: 'GemGuesser' },
    createGemGuesserApp
  );
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

export { GemGuesserGame };
