/**
 * 3D Rubik's Cube - Cosyne Edition
 *
 * A terse, elegant implementation using Cosyne 2D with intuitive swipe gestures.
 * Isometric projection rendered with declarative polygons.
 *
 * @tsyne-app:name 3D Cube
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24">
 *   <polygon points="2,7 2,17 12,22 12,12" fill="#228B22" stroke="#333" stroke-width="1"/>
 *   <polygon points="22,7 12,12 12,22 22,17" fill="#DC143C" stroke="#333" stroke-width="1"/>
 *   <polygon points="12,2 2,7 12,12 22,7" fill="#FFD700" stroke="#333" stroke-width="1"/>
 * </svg>
 * SVG
 * @tsyne-app:category games
 * @tsyne-app:builder create3DCubeApp
 * @tsyne-app:args app,windowWidth,windowHeight
 */

import { app, resolveTransport } from 'tsyne';
import type { App, Window, Label } from 'tsyne';
import { cosyne, refreshAllCosyneContexts, enableEventHandling, CosyneContext } from '../../cosyne/src/index';
import {
  RubiksCube,
  GestureController,
  Side,
  COLORS,
  Point,
  CellId,
  project,
  computeSwipeDirection,
} from './cube';

// Re-export for convenience
export { RubiksCube, GestureController, Side, COLORS } from './cube';

// ═══════════════════════════════════════════════════════════════════════════
// CubeRenderer - Declarative Cosyne Rendering
// ═══════════════════════════════════════════════════════════════════════════

export class CubeRenderer {
  private ctx: CosyneContext | null = null;
  private dragStart: Point | null = null;
  private dragCurrent: Point | null = null;
  private dragCell: CellId | null = null;

  constructor(
    private cube: RubiksCube,
    private gestures: GestureController,
    private canvasSize: number,
  ) {}

  build(a: App): void {
    const HALF = this.canvasSize / 4;
    const CELL = HALF * 2 / 3;
    const cx = this.canvasSize / 2;
    const cy = this.canvasSize / 2;

    a.canvasStack(() => {
      this.ctx = cosyne(a, (c) => {
        // Background
        c.rect(0, 0, this.canvasSize, this.canvasSize, { fillColor: '#1e1e1e' });

        // UP FACE (top)
        for (const row of [0, 1, 2]) {
          for (const col of [0, 1, 2]) {
            const x0 = col * CELL - HALF;
            const z0 = row * CELL - HALF;
            this.renderCell(c, Side.Up, row, col, [
              project(x0, HALF, z0, cx, cy),
              project(x0 + CELL, HALF, z0, cx, cy),
              project(x0 + CELL, HALF, z0 + CELL, cx, cy),
              project(x0, HALF, z0 + CELL, cx, cy),
            ]);
          }
        }
        this.renderGridLines(c, 'up', HALF, CELL, cx, cy);

        // FRONT FACE
        for (const row of [0, 1, 2]) {
          for (const col of [0, 1, 2]) {
            const x0 = col * CELL - HALF;
            const y0 = HALF - row * CELL;
            this.renderCell(c, Side.Front, row, col, [
              project(x0, y0, HALF, cx, cy),
              project(x0 + CELL, y0, HALF, cx, cy),
              project(x0 + CELL, y0 - CELL, HALF, cx, cy),
              project(x0, y0 - CELL, HALF, cx, cy),
            ]);
          }
        }
        this.renderGridLines(c, 'front', HALF, CELL, cx, cy);

        // RIGHT FACE
        for (const row of [0, 1, 2]) {
          for (const col of [0, 1, 2]) {
            const z0 = HALF - col * CELL;
            const y0 = HALF - row * CELL;
            this.renderCell(c, Side.Right, row, col, [
              project(HALF, y0, z0, cx, cy),
              project(HALF, y0, z0 - CELL, cx, cy),
              project(HALF, y0 - CELL, z0 - CELL, cx, cy),
              project(HALF, y0 - CELL, z0, cx, cy),
            ]);
          }
        }
        this.renderGridLines(c, 'right', HALF, CELL, cx, cy);
      });

      enableEventHandling(this.ctx!, a, {
        width: this.canvasSize,
        height: this.canvasSize,
      });
    });
  }

  private renderCell(c: CosyneContext, face: Side, row: number, col: number, pts: Point[]): void {
    const cellId: CellId = { face, row, col };
    const id = `cell-${face}-${row}-${col}`;

    const centerX = pts.reduce((sum, p) => sum + p.x, 0) / 4;
    const centerY = pts.reduce((sum, p) => sum + p.y, 0) / 4;
    const vertices = pts.map(p => ({ x: p.x - centerX, y: p.y - centerY }));

    c.polygon(centerX, centerY, vertices, { strokeColor: '#000', strokeWidth: 1 })
      .withId(id)
      .bindFill(() => COLORS[this.cube.getColor(face, row, col)])
      .onDragStart((e) => {
        this.dragStart = { x: e.x, y: e.y };
        this.dragCurrent = { x: e.x, y: e.y };
        this.dragCell = cellId;
      })
      .onDrag((e) => {
        this.dragCurrent = { x: e.x, y: e.y };
      })
      .onDragEnd(() => {
        if (this.dragStart && this.dragCurrent && this.dragCell) {
          const dx = this.dragCurrent.x - this.dragStart.x;
          const dy = this.dragCurrent.y - this.dragStart.y;
          const dir = computeSwipeDirection(dx, dy);
          if (dir) {
            this.gestures.handleSwipe(this.dragCell, dir);
          }
        }
        this.dragStart = null;
        this.dragCurrent = null;
        this.dragCell = null;
      });
  }

  private renderGridLines(c: CosyneContext, face: string, HALF: number, CELL: number, cx: number, cy: number): void {
    for (let i = 0; i <= 3; i++) {
      if (face === 'up') {
        const pos = i * CELL - HALF;
        const p1 = project(-HALF, HALF, pos, cx, cy);
        const p2 = project(HALF, HALF, pos, cx, cy);
        c.line(p1.x, p1.y, p2.x, p2.y, { strokeColor: '#000', strokeWidth: 2 }).passthrough();
        const p3 = project(pos, HALF, -HALF, cx, cy);
        const p4 = project(pos, HALF, HALF, cx, cy);
        c.line(p3.x, p3.y, p4.x, p4.y, { strokeColor: '#000', strokeWidth: 2 }).passthrough();
      } else if (face === 'front') {
        const yPos = HALF - i * CELL;
        const p1 = project(-HALF, yPos, HALF, cx, cy);
        const p2 = project(HALF, yPos, HALF, cx, cy);
        c.line(p1.x, p1.y, p2.x, p2.y, { strokeColor: '#000', strokeWidth: 2 }).passthrough();
        const xPos = i * CELL - HALF;
        const p3 = project(xPos, HALF, HALF, cx, cy);
        const p4 = project(xPos, -HALF, HALF, cx, cy);
        c.line(p3.x, p3.y, p4.x, p4.y, { strokeColor: '#000', strokeWidth: 2 }).passthrough();
      } else if (face === 'right') {
        const yPos = HALF - i * CELL;
        const p1 = project(HALF, yPos, HALF, cx, cy);
        const p2 = project(HALF, yPos, -HALF, cx, cy);
        c.line(p1.x, p1.y, p2.x, p2.y, { strokeColor: '#000', strokeWidth: 2 }).passthrough();
        const zPos = HALF - i * CELL;
        const p3 = project(HALF, HALF, zPos, cx, cy);
        const p4 = project(HALF, -HALF, zPos, cx, cy);
        c.line(p3.x, p3.y, p4.x, p4.y, { strokeColor: '#000', strokeWidth: 2 }).passthrough();
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// App Factory
// ═══════════════════════════════════════════════════════════════════════════

export function create3DCubeApp(a: App, windowWidth?: number, windowHeight?: number): { cube: RubiksCube } {
  const cube = new RubiksCube();
  const gestures = new GestureController(cube);

  const width = windowWidth ?? 400;
  const height = windowHeight ?? 550;
  const canvasSize = Math.min(width - 20, height - 150);

  const renderer = new CubeRenderer(cube, gestures, canvasSize);

  cube.subscribe(() => refreshAllCosyneContexts());

  let moveLabel: Label | null = null;
  let statusLabel: Label | null = null;

  const updateLabels = async () => {
    if (moveLabel) await moveLabel.setText(String(cube.getMoveCount()));
    if (statusLabel) await statusLabel.setText(cube.isSolved() ? 'Solved!' : 'Scrambled');
  };

  cube.subscribe(updateLabels);

  a.window({ title: '3D Cube', width, height }, (win: Window) => {
    win.setContent(() => {
      a.vbox(() => {
        a.hbox(() => {
          a.button('Reset').onClick(() => cube.reset()).withId('resetBtn');
          a.button('Shuffle').onClick(() => cube.shuffle()).withId('shuffleBtn');
          a.button('Solve').onClick(() => cube.solve()).withId('solveBtn');
        });

        a.hbox(() => {
          a.label('Moves: ');
          moveLabel = a.label('0').withId('moveLabel');
          a.label(' | ');
          statusLabel = a.label('Solved!').withId('statusLabel');
        });

        a.separator();
        a.label('Swipe on cells to rotate rows/columns').withId('instructions');

        a.center(() => {
          renderer.build(a);
        });
      });
    });
    win.show();
  });

  return { cube };
}

// ═══════════════════════════════════════════════════════════════════════════
// Standalone Entry Point
// ═══════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  app(resolveTransport(), { title: '3D Cube' }, async (a: App) => {
    create3DCubeApp(a);
    await a.run();
  });
}
