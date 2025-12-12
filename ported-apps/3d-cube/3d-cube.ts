/**
 * 3D Rubik's Cube
 *
 * A faithful port of Qt3DCube from https://github.com/EricStudley/Qt3DCube
 * Original author: Eric Studley
 * License: See original repository
 *
 * An interactive 3D Rubik's Cube with rotation, shuffle, and solve functionality.
 * Rendered using isometric projection on a 2D canvas.
 *
 * @tsyne-app:name 3D Cube
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
 *   <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="#228B22" stroke="#333"/>
 *   <path d="M12 2L22 7v10" fill="#FF4500" stroke="#333"/>
 *   <path d="M12 22V12L2 7" fill="#FFD700" stroke="#333"/>
 *   <path d="M12 12L22 7" stroke="#333"/>
 *   <path d="M12 12v10" stroke="#333"/>
 * </svg>
 * SVG
 * @tsyne-app:category games
 * @tsyne-app:builder create3DCubeApp
 * @tsyne-app:args app
 */

import { app } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { Label } from '../../core/src/widgets/display';
import type { TappableCanvasRaster } from '../../core/src/widgets/canvas';

// ============================================================================
// Constants
// ============================================================================

const CANVAS_SIZE = 400;
const CUBE_SIZE = 120;  // Size of entire cube
const CELL_SIZE = CUBE_SIZE / 3;  // Size of each cell

// Sides of the cube
enum Side {
  Up = 0,    // White (top)
  Front = 1, // Green (front)
  Right = 2, // Red (right)
  Back = 3,  // Blue (back)
  Left = 4,  // Orange (left)
  Down = 5,  // Yellow (bottom)
}

// Colors for each side (standard Rubik's cube colors)
const SIDE_COLORS: Record<Side, { r: number; g: number; b: number }> = {
  [Side.Up]: { r: 255, g: 255, b: 255 },    // White
  [Side.Front]: { r: 0, g: 155, b: 72 },    // Green
  [Side.Right]: { r: 183, g: 18, b: 52 },   // Red
  [Side.Back]: { r: 0, g: 70, b: 173 },     // Blue
  [Side.Left]: { r: 255, g: 88, b: 0 },     // Orange
  [Side.Down]: { r: 255, g: 213, b: 0 },    // Yellow
};

// Isometric projection angles
const ISO_ANGLE = Math.PI / 6;  // 30 degrees
const COS_ISO = Math.cos(ISO_ANGLE);
const SIN_ISO = Math.sin(ISO_ANGLE);

// ============================================================================
// Types
// ============================================================================

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Point2D {
  x: number;
  y: number;
}

interface CubeCommand {
  side: Side;
  clockwise: boolean;
}

// ============================================================================
// Rubik's Cube Logic
// ============================================================================

export class RubiksCube {
  // Each face is a 3x3 grid of colors (stored as Side enum values)
  private faces: Record<Side, Side[][]>;
  private moveHistory: CubeCommand[] = [];
  private onUpdate?: () => void;

  constructor() {
    this.faces = {} as Record<Side, Side[][]>;
    this.reset();
  }

  /**
   * Reset cube to solved state
   */
  reset(): void {
    for (let side = 0; side <= 5; side++) {
      this.faces[side as Side] = [];
      for (let row = 0; row < 3; row++) {
        this.faces[side as Side][row] = [];
        for (let col = 0; col < 3; col++) {
          this.faces[side as Side][row][col] = side as Side;
        }
      }
    }
    this.moveHistory = [];
    this.onUpdate?.();
  }

  /**
   * Get the color at a specific position on a face
   */
  getColor(side: Side, row: number, col: number): Side {
    return this.faces[side][row][col];
  }

  /**
   * Rotate a face 90 degrees clockwise
   */
  private rotateFaceClockwise(side: Side): void {
    const face = this.faces[side];
    const newFace: Side[][] = [[], [], []];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        newFace[col][2 - row] = face[row][col];
      }
    }

    this.faces[side] = newFace;
  }

  /**
   * Rotate a face 90 degrees counter-clockwise
   */
  private rotateFaceCounterClockwise(side: Side): void {
    const face = this.faces[side];
    const newFace: Side[][] = [[], [], []];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        newFace[2 - col][row] = face[row][col];
      }
    }

    this.faces[side] = newFace;
  }

  /**
   * Rotate a side of the cube
   */
  rotateSide(side: Side, clockwise: boolean): void {
    // Rotate the face itself
    if (clockwise) {
      this.rotateFaceClockwise(side);
    } else {
      this.rotateFaceCounterClockwise(side);
    }

    // Rotate the adjacent edges
    this.rotateAdjacentEdges(side, clockwise);

    this.moveHistory.push({ side, clockwise });
    this.onUpdate?.();
  }

  /**
   * Rotate the edges adjacent to a face
   */
  private rotateAdjacentEdges(side: Side, clockwise: boolean): void {
    const temp: Side[] = [];

    switch (side) {
      case Side.Up:
        // Adjacent: Front(top), Right(top), Back(top), Left(top)
        if (clockwise) {
          temp[0] = this.faces[Side.Front][0][0];
          temp[1] = this.faces[Side.Front][0][1];
          temp[2] = this.faces[Side.Front][0][2];
          this.faces[Side.Front][0][0] = this.faces[Side.Right][0][0];
          this.faces[Side.Front][0][1] = this.faces[Side.Right][0][1];
          this.faces[Side.Front][0][2] = this.faces[Side.Right][0][2];
          this.faces[Side.Right][0][0] = this.faces[Side.Back][0][0];
          this.faces[Side.Right][0][1] = this.faces[Side.Back][0][1];
          this.faces[Side.Right][0][2] = this.faces[Side.Back][0][2];
          this.faces[Side.Back][0][0] = this.faces[Side.Left][0][0];
          this.faces[Side.Back][0][1] = this.faces[Side.Left][0][1];
          this.faces[Side.Back][0][2] = this.faces[Side.Left][0][2];
          this.faces[Side.Left][0][0] = temp[0];
          this.faces[Side.Left][0][1] = temp[1];
          this.faces[Side.Left][0][2] = temp[2];
        } else {
          temp[0] = this.faces[Side.Front][0][0];
          temp[1] = this.faces[Side.Front][0][1];
          temp[2] = this.faces[Side.Front][0][2];
          this.faces[Side.Front][0][0] = this.faces[Side.Left][0][0];
          this.faces[Side.Front][0][1] = this.faces[Side.Left][0][1];
          this.faces[Side.Front][0][2] = this.faces[Side.Left][0][2];
          this.faces[Side.Left][0][0] = this.faces[Side.Back][0][0];
          this.faces[Side.Left][0][1] = this.faces[Side.Back][0][1];
          this.faces[Side.Left][0][2] = this.faces[Side.Back][0][2];
          this.faces[Side.Back][0][0] = this.faces[Side.Right][0][0];
          this.faces[Side.Back][0][1] = this.faces[Side.Right][0][1];
          this.faces[Side.Back][0][2] = this.faces[Side.Right][0][2];
          this.faces[Side.Right][0][0] = temp[0];
          this.faces[Side.Right][0][1] = temp[1];
          this.faces[Side.Right][0][2] = temp[2];
        }
        break;

      case Side.Down:
        // Adjacent: Front(bottom), Left(bottom), Back(bottom), Right(bottom)
        if (clockwise) {
          temp[0] = this.faces[Side.Front][2][0];
          temp[1] = this.faces[Side.Front][2][1];
          temp[2] = this.faces[Side.Front][2][2];
          this.faces[Side.Front][2][0] = this.faces[Side.Left][2][0];
          this.faces[Side.Front][2][1] = this.faces[Side.Left][2][1];
          this.faces[Side.Front][2][2] = this.faces[Side.Left][2][2];
          this.faces[Side.Left][2][0] = this.faces[Side.Back][2][0];
          this.faces[Side.Left][2][1] = this.faces[Side.Back][2][1];
          this.faces[Side.Left][2][2] = this.faces[Side.Back][2][2];
          this.faces[Side.Back][2][0] = this.faces[Side.Right][2][0];
          this.faces[Side.Back][2][1] = this.faces[Side.Right][2][1];
          this.faces[Side.Back][2][2] = this.faces[Side.Right][2][2];
          this.faces[Side.Right][2][0] = temp[0];
          this.faces[Side.Right][2][1] = temp[1];
          this.faces[Side.Right][2][2] = temp[2];
        } else {
          temp[0] = this.faces[Side.Front][2][0];
          temp[1] = this.faces[Side.Front][2][1];
          temp[2] = this.faces[Side.Front][2][2];
          this.faces[Side.Front][2][0] = this.faces[Side.Right][2][0];
          this.faces[Side.Front][2][1] = this.faces[Side.Right][2][1];
          this.faces[Side.Front][2][2] = this.faces[Side.Right][2][2];
          this.faces[Side.Right][2][0] = this.faces[Side.Back][2][0];
          this.faces[Side.Right][2][1] = this.faces[Side.Back][2][1];
          this.faces[Side.Right][2][2] = this.faces[Side.Back][2][2];
          this.faces[Side.Back][2][0] = this.faces[Side.Left][2][0];
          this.faces[Side.Back][2][1] = this.faces[Side.Left][2][1];
          this.faces[Side.Back][2][2] = this.faces[Side.Left][2][2];
          this.faces[Side.Left][2][0] = temp[0];
          this.faces[Side.Left][2][1] = temp[1];
          this.faces[Side.Left][2][2] = temp[2];
        }
        break;

      case Side.Front:
        // Adjacent: Up(bottom), Right(left), Down(top), Left(right)
        if (clockwise) {
          temp[0] = this.faces[Side.Up][2][0];
          temp[1] = this.faces[Side.Up][2][1];
          temp[2] = this.faces[Side.Up][2][2];
          this.faces[Side.Up][2][0] = this.faces[Side.Left][2][2];
          this.faces[Side.Up][2][1] = this.faces[Side.Left][1][2];
          this.faces[Side.Up][2][2] = this.faces[Side.Left][0][2];
          this.faces[Side.Left][0][2] = this.faces[Side.Down][0][0];
          this.faces[Side.Left][1][2] = this.faces[Side.Down][0][1];
          this.faces[Side.Left][2][2] = this.faces[Side.Down][0][2];
          this.faces[Side.Down][0][0] = this.faces[Side.Right][2][0];
          this.faces[Side.Down][0][1] = this.faces[Side.Right][1][0];
          this.faces[Side.Down][0][2] = this.faces[Side.Right][0][0];
          this.faces[Side.Right][0][0] = temp[0];
          this.faces[Side.Right][1][0] = temp[1];
          this.faces[Side.Right][2][0] = temp[2];
        } else {
          temp[0] = this.faces[Side.Up][2][0];
          temp[1] = this.faces[Side.Up][2][1];
          temp[2] = this.faces[Side.Up][2][2];
          this.faces[Side.Up][2][0] = this.faces[Side.Right][0][0];
          this.faces[Side.Up][2][1] = this.faces[Side.Right][1][0];
          this.faces[Side.Up][2][2] = this.faces[Side.Right][2][0];
          this.faces[Side.Right][0][0] = this.faces[Side.Down][0][2];
          this.faces[Side.Right][1][0] = this.faces[Side.Down][0][1];
          this.faces[Side.Right][2][0] = this.faces[Side.Down][0][0];
          this.faces[Side.Down][0][0] = this.faces[Side.Left][0][2];
          this.faces[Side.Down][0][1] = this.faces[Side.Left][1][2];
          this.faces[Side.Down][0][2] = this.faces[Side.Left][2][2];
          this.faces[Side.Left][0][2] = temp[2];
          this.faces[Side.Left][1][2] = temp[1];
          this.faces[Side.Left][2][2] = temp[0];
        }
        break;

      case Side.Back:
        // Adjacent: Up(top), Left(left), Down(bottom), Right(right)
        if (clockwise) {
          temp[0] = this.faces[Side.Up][0][0];
          temp[1] = this.faces[Side.Up][0][1];
          temp[2] = this.faces[Side.Up][0][2];
          this.faces[Side.Up][0][0] = this.faces[Side.Right][0][2];
          this.faces[Side.Up][0][1] = this.faces[Side.Right][1][2];
          this.faces[Side.Up][0][2] = this.faces[Side.Right][2][2];
          this.faces[Side.Right][0][2] = this.faces[Side.Down][2][2];
          this.faces[Side.Right][1][2] = this.faces[Side.Down][2][1];
          this.faces[Side.Right][2][2] = this.faces[Side.Down][2][0];
          this.faces[Side.Down][2][0] = this.faces[Side.Left][0][0];
          this.faces[Side.Down][2][1] = this.faces[Side.Left][1][0];
          this.faces[Side.Down][2][2] = this.faces[Side.Left][2][0];
          this.faces[Side.Left][0][0] = temp[2];
          this.faces[Side.Left][1][0] = temp[1];
          this.faces[Side.Left][2][0] = temp[0];
        } else {
          temp[0] = this.faces[Side.Up][0][0];
          temp[1] = this.faces[Side.Up][0][1];
          temp[2] = this.faces[Side.Up][0][2];
          this.faces[Side.Up][0][0] = this.faces[Side.Left][2][0];
          this.faces[Side.Up][0][1] = this.faces[Side.Left][1][0];
          this.faces[Side.Up][0][2] = this.faces[Side.Left][0][0];
          this.faces[Side.Left][0][0] = this.faces[Side.Down][2][0];
          this.faces[Side.Left][1][0] = this.faces[Side.Down][2][1];
          this.faces[Side.Left][2][0] = this.faces[Side.Down][2][2];
          this.faces[Side.Down][2][0] = this.faces[Side.Right][2][2];
          this.faces[Side.Down][2][1] = this.faces[Side.Right][1][2];
          this.faces[Side.Down][2][2] = this.faces[Side.Right][0][2];
          this.faces[Side.Right][0][2] = temp[0];
          this.faces[Side.Right][1][2] = temp[1];
          this.faces[Side.Right][2][2] = temp[2];
        }
        break;

      case Side.Right:
        // Adjacent: Up(right), Back(left), Down(right), Front(right)
        if (clockwise) {
          temp[0] = this.faces[Side.Up][0][2];
          temp[1] = this.faces[Side.Up][1][2];
          temp[2] = this.faces[Side.Up][2][2];
          this.faces[Side.Up][0][2] = this.faces[Side.Front][0][2];
          this.faces[Side.Up][1][2] = this.faces[Side.Front][1][2];
          this.faces[Side.Up][2][2] = this.faces[Side.Front][2][2];
          this.faces[Side.Front][0][2] = this.faces[Side.Down][0][2];
          this.faces[Side.Front][1][2] = this.faces[Side.Down][1][2];
          this.faces[Side.Front][2][2] = this.faces[Side.Down][2][2];
          this.faces[Side.Down][0][2] = this.faces[Side.Back][2][0];
          this.faces[Side.Down][1][2] = this.faces[Side.Back][1][0];
          this.faces[Side.Down][2][2] = this.faces[Side.Back][0][0];
          this.faces[Side.Back][0][0] = temp[2];
          this.faces[Side.Back][1][0] = temp[1];
          this.faces[Side.Back][2][0] = temp[0];
        } else {
          temp[0] = this.faces[Side.Up][0][2];
          temp[1] = this.faces[Side.Up][1][2];
          temp[2] = this.faces[Side.Up][2][2];
          this.faces[Side.Up][0][2] = this.faces[Side.Back][2][0];
          this.faces[Side.Up][1][2] = this.faces[Side.Back][1][0];
          this.faces[Side.Up][2][2] = this.faces[Side.Back][0][0];
          this.faces[Side.Back][0][0] = this.faces[Side.Down][2][2];
          this.faces[Side.Back][1][0] = this.faces[Side.Down][1][2];
          this.faces[Side.Back][2][0] = this.faces[Side.Down][0][2];
          this.faces[Side.Down][0][2] = this.faces[Side.Front][0][2];
          this.faces[Side.Down][1][2] = this.faces[Side.Front][1][2];
          this.faces[Side.Down][2][2] = this.faces[Side.Front][2][2];
          this.faces[Side.Front][0][2] = temp[0];
          this.faces[Side.Front][1][2] = temp[1];
          this.faces[Side.Front][2][2] = temp[2];
        }
        break;

      case Side.Left:
        // Adjacent: Up(left), Front(left), Down(left), Back(right)
        if (clockwise) {
          temp[0] = this.faces[Side.Up][0][0];
          temp[1] = this.faces[Side.Up][1][0];
          temp[2] = this.faces[Side.Up][2][0];
          this.faces[Side.Up][0][0] = this.faces[Side.Back][2][2];
          this.faces[Side.Up][1][0] = this.faces[Side.Back][1][2];
          this.faces[Side.Up][2][0] = this.faces[Side.Back][0][2];
          this.faces[Side.Back][0][2] = this.faces[Side.Down][2][0];
          this.faces[Side.Back][1][2] = this.faces[Side.Down][1][0];
          this.faces[Side.Back][2][2] = this.faces[Side.Down][0][0];
          this.faces[Side.Down][0][0] = this.faces[Side.Front][0][0];
          this.faces[Side.Down][1][0] = this.faces[Side.Front][1][0];
          this.faces[Side.Down][2][0] = this.faces[Side.Front][2][0];
          this.faces[Side.Front][0][0] = temp[0];
          this.faces[Side.Front][1][0] = temp[1];
          this.faces[Side.Front][2][0] = temp[2];
        } else {
          temp[0] = this.faces[Side.Up][0][0];
          temp[1] = this.faces[Side.Up][1][0];
          temp[2] = this.faces[Side.Up][2][0];
          this.faces[Side.Up][0][0] = this.faces[Side.Front][0][0];
          this.faces[Side.Up][1][0] = this.faces[Side.Front][1][0];
          this.faces[Side.Up][2][0] = this.faces[Side.Front][2][0];
          this.faces[Side.Front][0][0] = this.faces[Side.Down][0][0];
          this.faces[Side.Front][1][0] = this.faces[Side.Down][1][0];
          this.faces[Side.Front][2][0] = this.faces[Side.Down][2][0];
          this.faces[Side.Down][0][0] = this.faces[Side.Back][2][2];
          this.faces[Side.Down][1][0] = this.faces[Side.Back][1][2];
          this.faces[Side.Down][2][0] = this.faces[Side.Back][0][2];
          this.faces[Side.Back][0][2] = temp[2];
          this.faces[Side.Back][1][2] = temp[1];
          this.faces[Side.Back][2][2] = temp[0];
        }
        break;
    }
  }

  /**
   * Shuffle the cube with random moves
   */
  shuffle(moves: number = 20): void {
    this.moveHistory = [];
    for (let i = 0; i < moves; i++) {
      const side = Math.floor(Math.random() * 6) as Side;
      const clockwise = Math.random() > 0.5;
      this.rotateSide(side, clockwise);
    }
  }

  /**
   * Solve the cube by reversing all moves
   */
  solve(): CubeCommand[] {
    const solution: CubeCommand[] = [];
    while (this.moveHistory.length > 0) {
      const move = this.moveHistory.pop()!;
      solution.push({ side: move.side, clockwise: !move.clockwise });
    }
    return solution;
  }

  /**
   * Check if cube is solved
   */
  isSolved(): boolean {
    for (let side = 0; side <= 5; side++) {
      const expectedColor = side as Side;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (this.faces[side as Side][row][col] !== expectedColor) {
            return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * Get all faces (for rendering)
   */
  getFaces(): Record<Side, Side[][]> {
    return this.faces;
  }

  /**
   * Get move count
   */
  getMoveCount(): number {
    return this.moveHistory.length;
  }

  setOnUpdate(callback: () => void): void {
    this.onUpdate = callback;
  }
}

// ============================================================================
// UI Class
// ============================================================================

export class CubeUI {
  private cube: RubiksCube;
  private a: App;
  private win: Window | null = null;
  private canvas: TappableCanvasRaster | null = null;
  private statusLabel: Label | null = null;
  private moveLabel: Label | null = null;
  private solving: boolean = false;
  private solutionQueue: CubeCommand[] = [];
  private solveInterval: NodeJS.Timeout | null = null;

  constructor(a: App) {
    this.a = a;
    this.cube = new RubiksCube();
    this.cube.setOnUpdate(() => this.render());
  }

  setupWindow(win: Window): void {
    this.win = win;
    win.setMainMenu([
      {
        label: 'Cube',
        items: [
          { label: 'Reset', onSelected: () => this.resetCube() },
          { label: 'Shuffle', onSelected: () => this.shuffleCube() },
          { label: 'Solve', onSelected: () => this.solveCube() },
          { label: '', isSeparator: true },
          { label: 'Exit', onSelected: () => process.exit(0) },
        ],
      },
      {
        label: 'Rotate',
        items: [
          { label: 'Up (clockwise)', onSelected: () => this.cube.rotateSide(Side.Up, true) },
          { label: 'Up (counter)', onSelected: () => this.cube.rotateSide(Side.Up, false) },
          { label: 'Front (clockwise)', onSelected: () => this.cube.rotateSide(Side.Front, true) },
          { label: 'Front (counter)', onSelected: () => this.cube.rotateSide(Side.Front, false) },
          { label: 'Right (clockwise)', onSelected: () => this.cube.rotateSide(Side.Right, true) },
          { label: 'Right (counter)', onSelected: () => this.cube.rotateSide(Side.Right, false) },
        ],
      },
      {
        label: 'Help',
        items: [
          { label: 'Controls', onSelected: () => this.showControls() },
          { label: 'About', onSelected: () => this.showAbout() },
        ],
      },
    ]);
  }

  buildContent(): void {
    this.a.vbox(() => {
      // Control buttons
      this.a.hbox(() => {
        this.a.button('Reset').onClick(() => this.resetCube()).withId('resetBtn');
        this.a.button('Shuffle').onClick(() => this.shuffleCube()).withId('shuffleBtn');
        this.a.button('Solve').onClick(() => this.solveCube()).withId('solveBtn');
      });

      // Status display
      this.a.hbox(() => {
        this.a.label('Moves: ');
        this.moveLabel = this.a.label('0').withId('moveLabel');
        this.a.label(' | Status: ');
        this.statusLabel = this.a.label('Solved').withId('statusLabel');
      });

      this.a.separator();

      // Rotation buttons
      this.a.label('Rotate (click face letter):');
      this.a.hbox(() => {
        this.a.button('U').onClick(() => this.cube.rotateSide(Side.Up, true)).withId('rotateU');
        this.a.button('U\'').onClick(() => this.cube.rotateSide(Side.Up, false)).withId('rotateUi');
        this.a.button('F').onClick(() => this.cube.rotateSide(Side.Front, true)).withId('rotateF');
        this.a.button('F\'').onClick(() => this.cube.rotateSide(Side.Front, false)).withId('rotateFi');
        this.a.button('R').onClick(() => this.cube.rotateSide(Side.Right, true)).withId('rotateR');
        this.a.button('R\'').onClick(() => this.cube.rotateSide(Side.Right, false)).withId('rotateRi');
      });
      this.a.hbox(() => {
        this.a.button('D').onClick(() => this.cube.rotateSide(Side.Down, true)).withId('rotateD');
        this.a.button('D\'').onClick(() => this.cube.rotateSide(Side.Down, false)).withId('rotateDi');
        this.a.button('B').onClick(() => this.cube.rotateSide(Side.Back, true)).withId('rotateB');
        this.a.button('B\'').onClick(() => this.cube.rotateSide(Side.Back, false)).withId('rotateBi');
        this.a.button('L').onClick(() => this.cube.rotateSide(Side.Left, true)).withId('rotateL');
        this.a.button('L\'').onClick(() => this.cube.rotateSide(Side.Left, false)).withId('rotateLi');
      });

      this.a.separator();

      // Cube canvas
      this.canvas = this.a.tappableCanvasRaster(CANVAS_SIZE, CANVAS_SIZE, {
        onTap: (x, y) => this.handleTap(x, y),
      });
    });
  }

  private handleTap(x: number, y: number): void {
    // Simple tap handling - could be expanded to detect which face was clicked
    // For now, just log the position
  }

  private resetCube(): void {
    this.stopSolving();
    this.cube.reset();
  }

  private shuffleCube(): void {
    this.stopSolving();
    this.cube.shuffle(20);
  }

  private solveCube(): void {
    if (this.solving) return;

    this.solutionQueue = this.cube.solve();
    if (this.solutionQueue.length === 0) return;

    this.solving = true;
    this.solveInterval = setInterval(() => {
      if (this.solutionQueue.length > 0) {
        const move = this.solutionQueue.shift()!;
        this.cube.rotateSide(move.side, move.clockwise);
      } else {
        this.stopSolving();
      }
    }, 200);
  }

  private stopSolving(): void {
    if (this.solveInterval) {
      clearInterval(this.solveInterval);
      this.solveInterval = null;
    }
    this.solving = false;
    this.solutionQueue = [];
  }

  /**
   * Project 3D point to 2D using isometric projection
   */
  private project(p: Point3D): Point2D {
    // Isometric projection
    const x = (p.x - p.z) * COS_ISO;
    const y = p.y - (p.x + p.z) * SIN_ISO;

    // Center on canvas
    return {
      x: CANVAS_SIZE / 2 + x,
      y: CANVAS_SIZE / 2 - y,
    };
  }

  /**
   * Draw a filled quadrilateral
   */
  private fillQuad(
    pixels: Array<{ x: number; y: number; r: number; g: number; b: number; a: number }>,
    points: Point2D[],
    color: { r: number; g: number; b: number }
  ): void {
    // Find bounding box
    let minX = Math.floor(Math.min(...points.map(p => p.x)));
    let maxX = Math.ceil(Math.max(...points.map(p => p.x)));
    let minY = Math.floor(Math.min(...points.map(p => p.y)));
    let maxY = Math.ceil(Math.max(...points.map(p => p.y)));

    minX = Math.max(0, minX);
    maxX = Math.min(CANVAS_SIZE - 1, maxX);
    minY = Math.max(0, minY);
    maxY = Math.min(CANVAS_SIZE - 1, maxY);

    // Scan line fill
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (this.pointInPolygon({ x, y }, points)) {
          const idx = pixels.findIndex(p => p.x === x && p.y === y);
          if (idx >= 0) {
            pixels[idx] = { x, y, ...color, a: 255 };
          }
        }
      }
    }
  }

  /**
   * Check if point is inside polygon
   */
  private pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  /**
   * Draw a line
   */
  private drawLine(
    pixels: Array<{ x: number; y: number; r: number; g: number; b: number; a: number }>,
    p1: Point2D, p2: Point2D,
    color: { r: number; g: number; b: number }
  ): void {
    const dx = Math.abs(p2.x - p1.x);
    const dy = Math.abs(p2.y - p1.y);
    const sx = p1.x < p2.x ? 1 : -1;
    const sy = p1.y < p2.y ? 1 : -1;
    let err = dx - dy;

    let x = Math.round(p1.x);
    let y = Math.round(p1.y);
    const x2 = Math.round(p2.x);
    const y2 = Math.round(p2.y);

    while (true) {
      if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
        const idx = pixels.findIndex(p => p.x === x && p.y === y);
        if (idx >= 0) {
          pixels[idx] = { x, y, ...color, a: 255 };
        }
      }

      if (x === x2 && y === y2) break;

      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }

  private async render(): Promise<void> {
    if (!this.canvas) return;

    const pixels: Array<{ x: number; y: number; r: number; g: number; b: number; a: number }> = [];

    // Background (dark gray)
    for (let y = 0; y < CANVAS_SIZE; y++) {
      for (let x = 0; x < CANVAS_SIZE; x++) {
        pixels.push({ x, y, r: 30, g: 30, b: 30, a: 255 });
      }
    }

    const faces = this.cube.getFaces();

    // Draw three visible faces: Up, Front, Right (isometric view)
    // Draw in order from back to front for correct overlap

    // Draw Up face (top)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const color = SIDE_COLORS[faces[Side.Up][row][col]];
        const x0 = (col - 1) * CELL_SIZE;
        const z0 = (row - 1) * CELL_SIZE;
        const y0 = CUBE_SIZE / 2;

        const points = [
          this.project({ x: x0, y: y0, z: z0 }),
          this.project({ x: x0 + CELL_SIZE - 2, y: y0, z: z0 }),
          this.project({ x: x0 + CELL_SIZE - 2, y: y0, z: z0 + CELL_SIZE - 2 }),
          this.project({ x: x0, y: y0, z: z0 + CELL_SIZE - 2 }),
        ];
        this.fillQuad(pixels, points, color);
        // Draw border
        for (let i = 0; i < 4; i++) {
          this.drawLine(pixels, points[i], points[(i + 1) % 4], { r: 0, g: 0, b: 0 });
        }
      }
    }

    // Draw Front face
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const color = SIDE_COLORS[faces[Side.Front][row][col]];
        const x0 = (col - 1) * CELL_SIZE;
        const y0 = (1 - row) * CELL_SIZE;
        const z0 = CUBE_SIZE / 2;

        const points = [
          this.project({ x: x0, y: y0, z: z0 }),
          this.project({ x: x0 + CELL_SIZE - 2, y: y0, z: z0 }),
          this.project({ x: x0 + CELL_SIZE - 2, y: y0 - CELL_SIZE + 2, z: z0 }),
          this.project({ x: x0, y: y0 - CELL_SIZE + 2, z: z0 }),
        ];
        this.fillQuad(pixels, points, color);
        for (let i = 0; i < 4; i++) {
          this.drawLine(pixels, points[i], points[(i + 1) % 4], { r: 0, g: 0, b: 0 });
        }
      }
    }

    // Draw Right face
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const color = SIDE_COLORS[faces[Side.Right][row][col]];
        const x0 = CUBE_SIZE / 2;
        const y0 = (1 - row) * CELL_SIZE;
        const z0 = (1 - col) * CELL_SIZE;

        const points = [
          this.project({ x: x0, y: y0, z: z0 }),
          this.project({ x: x0, y: y0, z: z0 - CELL_SIZE + 2 }),
          this.project({ x: x0, y: y0 - CELL_SIZE + 2, z: z0 - CELL_SIZE + 2 }),
          this.project({ x: x0, y: y0 - CELL_SIZE + 2, z: z0 }),
        ];
        this.fillQuad(pixels, points, color);
        for (let i = 0; i < 4; i++) {
          this.drawLine(pixels, points[i], points[(i + 1) % 4], { r: 0, g: 0, b: 0 });
        }
      }
    }

    await this.canvas.setPixels(pixels);

    // Update labels
    if (this.moveLabel) await this.moveLabel.setText(String(this.cube.getMoveCount()));
    if (this.statusLabel) {
      const status = this.cube.isSolved() ? 'Solved!' : (this.solving ? 'Solving...' : 'Scrambled');
      await this.statusLabel.setText(status);
    }
  }

  private async showControls(): Promise<void> {
    if (!this.win) return;
    await this.win.showInfo('Controls',
      'Rubik\'s Cube Controls:\n\n' +
      'U/U\' - Rotate Up face (clockwise/counter)\n' +
      'D/D\' - Rotate Down face\n' +
      'F/F\' - Rotate Front face\n' +
      'B/B\' - Rotate Back face\n' +
      'R/R\' - Rotate Right face\n' +
      'L/L\' - Rotate Left face\n\n' +
      'Shuffle - Randomize the cube\n' +
      'Solve - Reverse all moves to solve\n' +
      'Reset - Return to solved state'
    );
  }

  private async showAbout(): Promise<void> {
    if (!this.win) return;
    await this.win.showInfo('About 3D Cube',
      '3D Cube v1.0.0\n\n' +
      'A port of Qt3DCube from:\n' +
      'github.com/EricStudley/Qt3DCube\n\n' +
      'Original author: Eric Studley\n' +
      'License: See original repository\n\n' +
      'Ported to Tsyne framework\n' +
      'with isometric 3D rendering'
    );
  }

  async initialize(): Promise<void> {
    await this.render();
  }

  cleanup(): void {
    this.stopSolving();
  }
}

// ============================================================================
// App Factory
// ============================================================================

export function create3DCubeApp(a: App): CubeUI {
  const ui = new CubeUI(a);

  a.registerCleanup(() => ui.cleanup());

  a.window({ title: '3D Cube', width: 450, height: 600 }, (win: Window) => {
    ui.setupWindow(win);
    win.setContent(() => ui.buildContent());
    win.show();
  });

  return ui;
}

// Export for testing
export { Side, SIDE_COLORS, CANVAS_SIZE, CUBE_SIZE };

// Standalone entry point
if (require.main === module) {
  app({ title: '3D Cube' }, async (a: App) => {
    const ui = create3DCubeApp(a);
    await a.run();
    await ui.initialize();
  });
}
