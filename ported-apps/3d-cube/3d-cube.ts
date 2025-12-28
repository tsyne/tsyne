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
 * <svg viewBox="0 0 24 24">
 *   <polygon points="2,7 2,17 12,22 12,12" fill="#228B22" stroke="#333" stroke-width="1"/>
 *   <polygon points="22,7 12,12 12,22 22,17" fill="#DC143C" stroke="#333" stroke-width="1"/>
 *   <polygon points="12,2 2,7 12,12 22,7" fill="#FFD700" stroke="#333" stroke-width="1"/>
 * </svg>
 * SVG
 * @tsyne-app:category games
 * @tsyne-app:builder create3DCubeApp
 * @tsyne-app:args app
 */

import { app, resolveTransport  } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { Label } from '../../core/src/widgets/display';
import type { TappableCanvasRaster } from '../../core/src/widgets/canvas';

// ============================================================================
// Constants
// ============================================================================

// Default canvas size - will be adjusted based on window size
// Using 280 as default for phone-friendly sizing (fits 540px width with margins)
const DEFAULT_CANVAS_SIZE = 280;
const DEFAULT_CUBE_SIZE = 140;  // Size of entire cube (half of canvas)

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
   * Rotate the middle horizontal slice (E slice - between Up and Down)
   * Direction is as viewed from the Up face (opposite of standard E notation)
   * clockwise=true: Front row 1 → Right row 1 → Back row 1 → Left row 1
   */
  rotateESlice(clockwise: boolean): void {
    const temp: Side[] = [];

    if (clockwise) {
      // Front → Right → Back → Left → Front (clockwise from above)
      temp[0] = this.faces[Side.Front][1][0];
      temp[1] = this.faces[Side.Front][1][1];
      temp[2] = this.faces[Side.Front][1][2];
      this.faces[Side.Front][1][0] = this.faces[Side.Left][1][0];
      this.faces[Side.Front][1][1] = this.faces[Side.Left][1][1];
      this.faces[Side.Front][1][2] = this.faces[Side.Left][1][2];
      this.faces[Side.Left][1][0] = this.faces[Side.Back][1][0];
      this.faces[Side.Left][1][1] = this.faces[Side.Back][1][1];
      this.faces[Side.Left][1][2] = this.faces[Side.Back][1][2];
      this.faces[Side.Back][1][0] = this.faces[Side.Right][1][0];
      this.faces[Side.Back][1][1] = this.faces[Side.Right][1][1];
      this.faces[Side.Back][1][2] = this.faces[Side.Right][1][2];
      this.faces[Side.Right][1][0] = temp[0];
      this.faces[Side.Right][1][1] = temp[1];
      this.faces[Side.Right][1][2] = temp[2];
    } else {
      // Front → Left → Back → Right → Front (counter-clockwise from above)
      temp[0] = this.faces[Side.Front][1][0];
      temp[1] = this.faces[Side.Front][1][1];
      temp[2] = this.faces[Side.Front][1][2];
      this.faces[Side.Front][1][0] = this.faces[Side.Right][1][0];
      this.faces[Side.Front][1][1] = this.faces[Side.Right][1][1];
      this.faces[Side.Front][1][2] = this.faces[Side.Right][1][2];
      this.faces[Side.Right][1][0] = this.faces[Side.Back][1][0];
      this.faces[Side.Right][1][1] = this.faces[Side.Back][1][1];
      this.faces[Side.Right][1][2] = this.faces[Side.Back][1][2];
      this.faces[Side.Back][1][0] = this.faces[Side.Left][1][0];
      this.faces[Side.Back][1][1] = this.faces[Side.Left][1][1];
      this.faces[Side.Back][1][2] = this.faces[Side.Left][1][2];
      this.faces[Side.Left][1][0] = temp[0];
      this.faces[Side.Left][1][1] = temp[1];
      this.faces[Side.Left][1][2] = temp[2];
    }

    this.moveHistory.push({ side: Side.Up, clockwise }); // Track as a move
    this.onUpdate?.();
  }

  /**
   * Rotate the middle standing slice (S slice - between Front and Back)
   * Direction is as viewed from the Front face
   * clockwise=true: Up row 1 → Right col 1 → Down row 1 → Left col 1
   */
  rotateSSlice(clockwise: boolean): void {
    const temp: Side[] = [];

    if (clockwise) {
      // Up row 1 → Right col 1 → Down row 1 → Left col 1 → Up row 1
      temp[0] = this.faces[Side.Up][1][0];
      temp[1] = this.faces[Side.Up][1][1];
      temp[2] = this.faces[Side.Up][1][2];
      // Up row 1 ← Left col 1 (reversed)
      this.faces[Side.Up][1][0] = this.faces[Side.Left][2][1];
      this.faces[Side.Up][1][1] = this.faces[Side.Left][1][1];
      this.faces[Side.Up][1][2] = this.faces[Side.Left][0][1];
      // Left col 1 ← Down row 1
      this.faces[Side.Left][0][1] = this.faces[Side.Down][1][0];
      this.faces[Side.Left][1][1] = this.faces[Side.Down][1][1];
      this.faces[Side.Left][2][1] = this.faces[Side.Down][1][2];
      // Down row 1 ← Right col 1 (reversed)
      this.faces[Side.Down][1][0] = this.faces[Side.Right][2][1];
      this.faces[Side.Down][1][1] = this.faces[Side.Right][1][1];
      this.faces[Side.Down][1][2] = this.faces[Side.Right][0][1];
      // Right col 1 ← Up row 1 (temp)
      this.faces[Side.Right][0][1] = temp[0];
      this.faces[Side.Right][1][1] = temp[1];
      this.faces[Side.Right][2][1] = temp[2];
    } else {
      // Reverse direction
      temp[0] = this.faces[Side.Up][1][0];
      temp[1] = this.faces[Side.Up][1][1];
      temp[2] = this.faces[Side.Up][1][2];
      // Up row 1 ← Right col 1
      this.faces[Side.Up][1][0] = this.faces[Side.Right][0][1];
      this.faces[Side.Up][1][1] = this.faces[Side.Right][1][1];
      this.faces[Side.Up][1][2] = this.faces[Side.Right][2][1];
      // Right col 1 ← Down row 1 (reversed)
      this.faces[Side.Right][0][1] = this.faces[Side.Down][1][2];
      this.faces[Side.Right][1][1] = this.faces[Side.Down][1][1];
      this.faces[Side.Right][2][1] = this.faces[Side.Down][1][0];
      // Down row 1 ← Left col 1
      this.faces[Side.Down][1][0] = this.faces[Side.Left][0][1];
      this.faces[Side.Down][1][1] = this.faces[Side.Left][1][1];
      this.faces[Side.Down][1][2] = this.faces[Side.Left][2][1];
      // Left col 1 ← Up row 1 (temp, reversed)
      this.faces[Side.Left][0][1] = temp[2];
      this.faces[Side.Left][1][1] = temp[1];
      this.faces[Side.Left][2][1] = temp[0];
    }

    this.moveHistory.push({ side: Side.Front, clockwise }); // Track as a move
    this.onUpdate?.();
  }

  /**
   * Rotate the middle vertical slice (M slice - between Left and Right)
   * Direction is as viewed from the Right face
   * clockwise=true: Front col 1 → Up col 1 → Back col 1 → Down col 1
   */
  rotateMSlice(clockwise: boolean): void {
    const temp: Side[] = [];

    if (clockwise) {
      // Front → Up → Back → Down → Front (clockwise from Right)
      temp[0] = this.faces[Side.Front][0][1];
      temp[1] = this.faces[Side.Front][1][1];
      temp[2] = this.faces[Side.Front][2][1];
      this.faces[Side.Front][0][1] = this.faces[Side.Down][0][1];
      this.faces[Side.Front][1][1] = this.faces[Side.Down][1][1];
      this.faces[Side.Front][2][1] = this.faces[Side.Down][2][1];
      this.faces[Side.Down][0][1] = this.faces[Side.Back][2][1];
      this.faces[Side.Down][1][1] = this.faces[Side.Back][1][1];
      this.faces[Side.Down][2][1] = this.faces[Side.Back][0][1];
      this.faces[Side.Back][0][1] = this.faces[Side.Up][2][1];
      this.faces[Side.Back][1][1] = this.faces[Side.Up][1][1];
      this.faces[Side.Back][2][1] = this.faces[Side.Up][0][1];
      this.faces[Side.Up][0][1] = temp[0];
      this.faces[Side.Up][1][1] = temp[1];
      this.faces[Side.Up][2][1] = temp[2];
    } else {
      // Front → Down → Back → Up → Front (counter-clockwise from Right)
      temp[0] = this.faces[Side.Front][0][1];
      temp[1] = this.faces[Side.Front][1][1];
      temp[2] = this.faces[Side.Front][2][1];
      this.faces[Side.Front][0][1] = this.faces[Side.Up][0][1];
      this.faces[Side.Front][1][1] = this.faces[Side.Up][1][1];
      this.faces[Side.Front][2][1] = this.faces[Side.Up][2][1];
      this.faces[Side.Up][0][1] = this.faces[Side.Back][2][1];
      this.faces[Side.Up][1][1] = this.faces[Side.Back][1][1];
      this.faces[Side.Up][2][1] = this.faces[Side.Back][0][1];
      this.faces[Side.Back][0][1] = this.faces[Side.Down][2][1];
      this.faces[Side.Back][1][1] = this.faces[Side.Down][1][1];
      this.faces[Side.Back][2][1] = this.faces[Side.Down][0][1];
      this.faces[Side.Down][0][1] = temp[0];
      this.faces[Side.Down][1][1] = temp[1];
      this.faces[Side.Down][2][1] = temp[2];
    }

    this.moveHistory.push({ side: Side.Right, clockwise }); // Track as a move
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

interface TapSelection {
  face: Side;
  row: number;
  col: number;
}

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
  private selectedCell: TapSelection | null = null;
  private processingTap: boolean = false;
  private rendering: boolean = false;
  private renderPending: boolean = false;
  private showCellLabels: boolean = false;

  // Dynamic sizing - calculated based on window dimensions
  private canvasSize: number = DEFAULT_CANVAS_SIZE;
  private cubeSize: number = DEFAULT_CUBE_SIZE;
  private cellSize: number = DEFAULT_CUBE_SIZE / 3;

  constructor(a: App) {
    this.a = a;
    this.cube = new RubiksCube();
    this.cube.setOnUpdate(() => this.render());
  }

  /**
   * Calculate optimal canvas size based on window dimensions
   * Leaves room for buttons and status (approximately 180px overhead)
   */
  calculateCanvasSize(windowWidth: number, windowHeight: number): void {
    const overhead = 180; // Space for buttons, status, margins
    const availableHeight = windowHeight - overhead;
    const availableWidth = windowWidth - 20; // Small margin

    // Canvas should be square, fit in available space
    const maxSize = Math.min(availableWidth, availableHeight);

    // Clamp to reasonable range (minimum 200, maximum 500)
    this.canvasSize = Math.max(200, Math.min(500, maxSize));

    // Scale cube proportionally
    this.cubeSize = this.canvasSize / 2;
    this.cellSize = this.cubeSize / 3;

    console.log(`[3DCube] Canvas size: ${this.canvasSize}, window: ${windowWidth}x${windowHeight}`);
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
        this.a.button('Labels').onClick(() => this.toggleLabels()).withId('labelsBtn');
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

      // Cube canvas - centered with letterboxing to maintain square aspect ratio
      // The max() fills available space, center() centers the square canvas within it
      this.a.max(() => {
        this.a.center(() => {
          this.canvas = this.a.tappableCanvasRaster(this.canvasSize, this.canvasSize, {
            onTap: (x, y) => this.handleTap(x, y),
          });
        });
      });
    });
  }

  /**
   * Detect which cell was tapped using hit testing
   */
  private detectTappedCell(x: number, y: number): TapSelection | null {
    const HALF = this.cubeSize / 2;
    const PAD = 20;  // Padding for more forgiving hit detection (in 3D space)

    // Check each face's cells (check in reverse draw order - front to back)
    // Right face first (drawn last, so on top)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const z0 = HALF - col * this.cellSize;
        const y0 = HALF - row * this.cellSize;

        const points = [
          this.project({ x: HALF, y: y0 + PAD, z: z0 + PAD }),
          this.project({ x: HALF, y: y0 + PAD, z: z0 - this.cellSize - PAD }),
          this.project({ x: HALF, y: y0 - this.cellSize - PAD, z: z0 - this.cellSize - PAD }),
          this.project({ x: HALF, y: y0 - this.cellSize - PAD, z: z0 + PAD }),
        ];
        if (this.pointInPolygon({ x, y }, points)) {
          return { face: Side.Right, row, col };
        }
      }
    }

    // Front face
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x0 = col * this.cellSize - HALF;
        const y0 = HALF - row * this.cellSize;

        const points = [
          this.project({ x: x0 - PAD, y: y0 + PAD, z: HALF }),
          this.project({ x: x0 + this.cellSize + PAD, y: y0 + PAD, z: HALF }),
          this.project({ x: x0 + this.cellSize + PAD, y: y0 - this.cellSize - PAD, z: HALF }),
          this.project({ x: x0 - PAD, y: y0 - this.cellSize - PAD, z: HALF }),
        ];
        if (this.pointInPolygon({ x, y }, points)) {
          return { face: Side.Front, row, col };
        }
      }
    }

    // Up face (top)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x0 = col * this.cellSize - HALF;
        const z0 = row * this.cellSize - HALF;

        const points = [
          this.project({ x: x0 - PAD, y: HALF, z: z0 - PAD }),
          this.project({ x: x0 + this.cellSize + PAD, y: HALF, z: z0 - PAD }),
          this.project({ x: x0 + this.cellSize + PAD, y: HALF, z: z0 + this.cellSize + PAD }),
          this.project({ x: x0 - PAD, y: HALF, z: z0 + this.cellSize + PAD }),
        ];
        if (this.pointInPolygon({ x, y }, points)) {
          return { face: Side.Up, row, col };
        }
      }
    }

    return null;
  }

  /**
   * Determine rotation based on two tapped cells
   * User expectation: tap a cell, then tap where you want that row/column to move
   *
   * Cube orientation:
   * - Up (white) face on top
   * - Front (green) face facing viewer (lower-left in isometric)
   * - Right (red) face on right side (lower-right in isometric)
   *
   * Edge rotation directions (where the values visually move TO):
   * - Up clockwise: Front row 0 → Left, Right row 0 → Front, Back → Right, Left → Back
   * - Up counter-clockwise: Front row 0 → Right, Left row 0 → Front, Back → Left, Right → Back
   * - Down clockwise: Front row 2 → Right, Left → Front, Back → Left, Right → Back
   * - Down counter-clockwise: Front row 2 → Left, Right → Front, Back → Right, Left → Back
   */
  private determineRotation(from: TapSelection, to: TapSelection): { side: number; clockwise: boolean } | null {
    // Same cell tapped twice - cancel selection
    if (from.face === to.face && from.row === to.row && from.col === to.col) {
      return null;
    }

    // Tapping on the same face - rotate the row or column
    if (from.face === to.face) {
      const dRow = to.row - from.row;
      const dCol = to.col - from.col;

      // Reject diagonal movements - require clear horizontal or vertical intent
      if (dRow !== 0 && dCol !== 0) {
        return null;
      }

      // Determine if movement is horizontal or vertical
      if (Math.abs(dCol) >= Math.abs(dRow)) {
        // Horizontal movement - rotate the row
        // User swipes right = wants cells to move towards Right face
        const movingRight = dCol > 0;

        if (from.face === Side.Front) {
          // Front face: horizontal swipe rotates top/bottom/middle rows
          // Swipe right on row 0 → want Front→Right → Up counter-clockwise (clockwise=false)
          // Swipe right on row 1 → want Front→Right → E slice (clockwise=true means Front→Right)
          // Swipe right on row 2 → want Front→Right → Down clockwise (clockwise=true)
          if (from.row === 0) {
            return { side: Side.Up, clockwise: !movingRight };
          } else if (from.row === 2) {
            return { side: Side.Down, clockwise: movingRight };
          } else {
            // Middle row - use E slice (side: -1 as special marker)
            return { side: -1, clockwise: movingRight };
          }
        } else if (from.face === Side.Up) {
          // Up face: horizontal swipe affects Front/Back/S-slice
          // Row 0 (back) → Back face rotation
          // Row 1 (middle) → S-slice
          // Row 2 (front) → Front face rotation
          if (from.row === 0) {
            return { side: Side.Back, clockwise: !movingRight };
          } else if (from.row === 2) {
            return { side: Side.Front, clockwise: movingRight };
          } else {
            // Middle row - use S slice (side: -3 as special marker)
            return { side: -3, clockwise: movingRight };
          }
        } else if (from.face === Side.Right) {
          // Right face: col 0 is front edge, col 2 is back edge
          // Horizontal swipe (changing col) means front-to-back movement
          // Row 0 → Up rotation
          // Row 1 → E-slice
          // Row 2 → Down rotation
          if (from.row === 0) {
            return { side: Side.Up, clockwise: !movingRight };
          } else if (from.row === 2) {
            return { side: Side.Down, clockwise: movingRight };
          } else {
            // Middle row - use E slice (side: -1 as special marker)
            // On Right face, swipe right (increasing col) = moving towards back = E clockwise
            return { side: -1, clockwise: movingRight };
          }
        } else {
          return { side: Side.Up, clockwise: movingRight };
        }
      } else {
        // Vertical movement - rotate the column
        // User swipes down = wants cells to move down
        const movingDown = dRow > 0;

        if (from.face === Side.Front) {
          // Front face: vertical swipe rotates left/right/middle columns
          // Swipe down on col 0 → want Front→Down → Left counter-clockwise
          // Swipe down on col 1 → want Front→Down → M slice (clockwise=true means Front→Down)
          // Swipe down on col 2 → want Front→Down → Right clockwise
          if (from.col === 0) {
            return { side: Side.Left, clockwise: !movingDown };
          } else if (from.col === 2) {
            return { side: Side.Right, clockwise: movingDown };
          } else {
            // Middle column - use M slice (side: -2 as special marker)
            return { side: -2, clockwise: movingDown };
          }
        } else if (from.face === Side.Up) {
          // Up face: vertical swipe (row change) means front-to-back on top
          // Swipe down (row increases, towards front) → Left or Right rotation
          if (from.col === 0) {
            return { side: Side.Left, clockwise: !movingDown };
          } else if (from.col === 2) {
            return { side: Side.Right, clockwise: movingDown };
          } else {
            return { side: Side.Right, clockwise: movingDown };
          }
        } else if (from.face === Side.Right) {
          // Right face: vertical swipe rotates front/back faces
          // Swipe down on col 0 → Front clockwise (moves Right cells to Down)
          // Swipe down on col 2 → Back counter-clockwise
          if (from.col === 0) {
            return { side: Side.Front, clockwise: movingDown };
          } else if (from.col === 2) {
            return { side: Side.Back, clockwise: !movingDown };
          } else {
            return { side: Side.Front, clockwise: movingDown };
          }
        } else {
          return { side: Side.Right, clockwise: movingDown };
        }
      }
    }

    // Tapping across faces - rotate based on the edge relationship
    // The rotation should move cells from 'from' face towards 'to' face

    // Front to Up: user wants to move cell from front to top (upward)
    if (from.face === Side.Front && to.face === Side.Up) {
      // Need column rotation: Left or Right face
      // Left clockwise: moves Front col 0 down, so counter-clockwise moves it up
      // Right clockwise: moves Front col 2 up
      if (from.col === 0) return { side: Side.Left, clockwise: false };
      if (from.col === 2) return { side: Side.Right, clockwise: true };
      return { side: Side.Right, clockwise: true };
    }

    // Up to Front: user wants to move cell from top to front (downward)
    if (from.face === Side.Up && to.face === Side.Front) {
      // Opposite of Front→Up
      if (from.col === 0) return { side: Side.Left, clockwise: true };
      if (from.col === 2) return { side: Side.Right, clockwise: false };
      return { side: Side.Right, clockwise: false };
    }

    // Front to Right: user wants to move cell from front to right
    if (from.face === Side.Front && to.face === Side.Right) {
      // Need row rotation: Up or Down face
      // Up counter-clockwise: moves Front row 0 to Right (clockwise=false)
      // Down clockwise: moves Front row 2 to Right (clockwise=true)
      if (from.row === 0) return { side: Side.Up, clockwise: false };
      if (from.row === 2) return { side: Side.Down, clockwise: true };
      return { side: Side.Up, clockwise: false };
    }

    // Right to Front: user wants to move cell from right to front
    if (from.face === Side.Right && to.face === Side.Front) {
      // Opposite of Front→Right
      // Up clockwise: moves Right row 0 to Front (clockwise=true)
      // Down counter-clockwise: moves Right row 2 to Front (clockwise=false)
      if (from.row === 0) return { side: Side.Up, clockwise: true };
      if (from.row === 2) return { side: Side.Down, clockwise: false };
      return { side: Side.Up, clockwise: true };
    }

    // Up to Right: user wants to move cell from top to right side
    if (from.face === Side.Up && to.face === Side.Right) {
      // Right face connects to Up face via Right rotation
      // Right counter-clockwise: moves Up col 2 to Front, then need to continue...
      // Actually, this moves cells from Up to Back. For Up→Right we need different logic
      // Front clockwise moves Up's bottom row onto Right
      if (from.row === 2) return { side: Side.Front, clockwise: true };
      return { side: Side.Right, clockwise: false };
    }

    // Right to Up: user wants to move cell from right to top
    if (from.face === Side.Right && to.face === Side.Up) {
      // Opposite direction
      if (from.row === 0) return { side: Side.Front, clockwise: false };
      return { side: Side.Right, clockwise: true };
    }

    // Default: rotate the face that was first tapped
    return { side: from.face, clockwise: true };
  }

  /**
   * Convert internal face/row/col to user-friendly notation
   * U = Up (white), F = Front (green), R = Right (red)
   * Cells numbered 11-33 (row-col, 1-based)
   */
  private cellNotation(sel: TapSelection): string {
    const faceChar = sel.face === Side.Up ? 'U' : sel.face === Side.Front ? 'F' : sel.face === Side.Right ? 'R' : '?';
    return `${faceChar}${sel.row + 1}${sel.col + 1}`;
  }

  private handleTap(x: number, y: number): void {
    if (this.processingTap) {
      console.log(`[TAP] BLOCKED - already processing`);
      return;
    }
    this.processingTap = true;

    try {
      const tapped = this.detectTappedCell(x, y);
      console.log(`[TAP] detected: ${tapped ? this.cellNotation(tapped) : 'none'} (x=${x}, y=${y})`);

      if (!tapped) {
        console.log(`[TAP] clearing selection`);
        this.selectedCell = null;
      } else if (!this.selectedCell) {
        console.log(`[TAP] selected: ${this.cellNotation(tapped)}`);
        this.selectedCell = tapped;
      } else {
        const fromNotation = this.cellNotation(this.selectedCell);
        const toNotation = this.cellNotation(tapped);
        console.log(`[TAP] move: ${fromNotation} → ${toNotation}`);

        const rotation = this.determineRotation(this.selectedCell, tapped);
        const from = this.selectedCell;
        this.selectedCell = null;

        if (rotation) {
          if (rotation.side === -1) {
            // E slice (middle horizontal row)
            const dir = rotation.clockwise ? 'L→R' : 'L←R';
            console.log(`[TAP] exec: E-slice (${dir})`);
            this.cube.rotateESlice(rotation.clockwise);
          } else if (rotation.side === -2) {
            // M slice (middle vertical column)
            const dir = rotation.clockwise ? 'L→down' : 'L→up';
            console.log(`[TAP] exec: M-slice (${dir})`);
            this.cube.rotateMSlice(rotation.clockwise);
          } else if (rotation.side === -3) {
            // S slice (middle standing slice - between Front and Back)
            const dir = rotation.clockwise ? 'T→R' : 'T←R';
            console.log(`[TAP] exec: S-slice (${dir})`);
            this.cube.rotateSSlice(rotation.clockwise);
          } else {
            const sideName = ['U', 'F', 'R', 'B', 'L', 'D'][rotation.side];
            const dir = rotation.clockwise ? '' : "'";
            console.log(`[TAP] exec: ${sideName}${dir}`);
            this.cube.rotateSide(rotation.side as Side, rotation.clockwise);
          }
        } else {
          // No rotation - could be same cell, diagonal movement, or cross-face that's not handled
          const dRow = tapped.row - from.row;
          const dCol = tapped.col - from.col;
          const isDiagonal = from.face === tapped.face && dRow !== 0 && dCol !== 0;
          if (isDiagonal) {
            console.log(`[TAP] rejected: diagonal movement (use horizontal or vertical swipe)`);
          } else {
            console.log(`[TAP] no rotation (same cell or unhandled)`);
          }
        }
      }

      this.render().finally(() => {
        this.processingTap = false;
        console.log(`[TAP] render complete, ready for next tap`);
      });
    } catch (e) {
      console.log(`[TAP] ERROR:`, e);
      this.selectedCell = null;
      this.processingTap = false;
    }
  }

  private toggleLabels(): void {
    this.showCellLabels = !this.showCellLabels;
    this.render();
  }

  private resetCube(): void {
    this.stopSolving();
    this.selectedCell = null;
    this.cube.reset();
  }

  private shuffleCube(): void {
    this.stopSolving();
    this.selectedCell = null;
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
      x: this.canvasSize / 2 + x,
      y: this.canvasSize / 2 - y,
    };
  }

  /**
   * Set a pixel in the buffer
   */
  private setPixel(buffer: Uint8Array, x: number, y: number, r: number, g: number, b: number): void {
    if (x >= 0 && x < this.canvasSize && y >= 0 && y < this.canvasSize) {
      const offset = (y * this.canvasSize + x) * 4;
      buffer[offset] = r;
      buffer[offset + 1] = g;
      buffer[offset + 2] = b;
      buffer[offset + 3] = 255;
    }
  }

  /**
   * Draw a filled quadrilateral
   */
  private fillQuad(
    buffer: Uint8Array,
    points: Point2D[],
    color: { r: number; g: number; b: number }
  ): void {
    // Find bounding box
    let minX = Math.floor(Math.min(...points.map(p => p.x)));
    let maxX = Math.ceil(Math.max(...points.map(p => p.x)));
    let minY = Math.floor(Math.min(...points.map(p => p.y)));
    let maxY = Math.ceil(Math.max(...points.map(p => p.y)));

    minX = Math.max(0, minX);
    maxX = Math.min(this.canvasSize - 1, maxX);
    minY = Math.max(0, minY);
    maxY = Math.min(this.canvasSize - 1, maxY);

    // Scan line fill
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (this.pointInPolygon({ x, y }, points)) {
          this.setPixel(buffer, x, y, color.r, color.g, color.b);
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
   * Simple 3x5 bitmap font for cell labels
   */
  private readonly FONT: Record<string, number[]> = {
    'T': [0b111, 0b010, 0b010, 0b010, 0b010],
    'L': [0b100, 0b100, 0b100, 0b100, 0b111],
    'R': [0b110, 0b101, 0b110, 0b101, 0b101],
    '1': [0b010, 0b110, 0b010, 0b010, 0b111],
    '2': [0b111, 0b001, 0b111, 0b100, 0b111],
    '3': [0b111, 0b001, 0b111, 0b001, 0b111],
  };

  /**
   * Draw a character at position using bitmap font with scale
   */
  private drawChar(
    buffer: Uint8Array,
    char: string,
    x: number,
    y: number,
    color: { r: number; g: number; b: number },
    scale: number = 1
  ): void {
    const bitmap = this.FONT[char];
    if (!bitmap) return;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (bitmap[row] & (0b100 >> col)) {
          // Draw a scale x scale block for each pixel
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              this.setPixel(buffer, x + col * scale + sx, y + row * scale + sy, color.r, color.g, color.b);
            }
          }
        }
      }
    }
  }

  /**
   * Draw a cell label (e.g., "L11") at position
   */
  private drawLabel(
    buffer: Uint8Array,
    label: string,
    centerX: number,
    centerY: number,
    color: { r: number; g: number; b: number }
  ): void {
    const scale = 3;  // 3x scale for readability
    const charWidth = 3 * scale + 1;  // 3 pixels wide * scale + 1 pixel gap
    const charHeight = 5 * scale;
    const startX = Math.round(centerX - (label.length * charWidth) / 2);
    const startY = Math.round(centerY - charHeight / 2);

    for (let i = 0; i < label.length; i++) {
      this.drawChar(buffer, label[i], startX + i * charWidth, startY, color, scale);
    }
  }

  /**
   * Draw a line using simple DDA algorithm (more robust)
   */
  private drawLine(
    buffer: Uint8Array,
    p1: Point2D, p2: Point2D,
    color: { r: number; g: number; b: number }
  ): void {
    if (!p1 || !p2) return;

    const x1 = Math.round(p1.x);
    const y1 = Math.round(p1.y);
    const x2 = Math.round(p2.x);
    const y2 = Math.round(p2.y);

    const dx = x2 - x1;
    const dy = y2 - y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    if (steps === 0) {
      this.setPixel(buffer, x1, y1, color.r, color.g, color.b);
      return;
    }

    const xInc = dx / steps;
    const yInc = dy / steps;

    let x = x1;
    let y = y1;
    for (let i = 0; i <= steps; i++) {
      this.setPixel(buffer, Math.round(x), Math.round(y), color.r, color.g, color.b);
      x += xInc;
      y += yInc;
    }
  }

  private async render(): Promise<void> {
    if (!this.canvas) return;

    // Prevent concurrent renders
    if (this.rendering) {
      this.renderPending = true;
      return;
    }
    this.rendering = true;

    const t0 = Date.now();
    const buffer = new Uint8Array(this.canvasSize * this.canvasSize * 4);

    // Background (dark gray)
    for (let i = 0; i < this.canvasSize * this.canvasSize; i++) {
      const offset = i * 4;
      buffer[offset] = 30;
      buffer[offset + 1] = 30;
      buffer[offset + 2] = 30;
      buffer[offset + 3] = 255;
    }

    const faces = this.cube.getFaces();

    // Draw three visible faces: Up, Front, Right (isometric view)
    // Draw in order from back to front for correct overlap

    // Small overlap to prevent gaps from floating-point precision issues
    const OVERLAP = 2;
    const HALF = this.cubeSize / 2;

    // Draw Up face (top) - at y = +HALF
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const color = SIDE_COLORS[faces[Side.Up][row][col]];
        // Center the cells: col 0,1,2 -> x starts at -60, -20, +20
        const x0 = col * this.cellSize - HALF;
        const z0 = row * this.cellSize - HALF;

        const fillPoints = [
          this.project({ x: x0 - OVERLAP, y: HALF, z: z0 - OVERLAP }),
          this.project({ x: x0 + this.cellSize + OVERLAP, y: HALF, z: z0 - OVERLAP }),
          this.project({ x: x0 + this.cellSize + OVERLAP, y: HALF, z: z0 + this.cellSize + OVERLAP }),
          this.project({ x: x0 - OVERLAP, y: HALF, z: z0 + this.cellSize + OVERLAP }),
        ];
        this.fillQuad(buffer, fillPoints, color);
      }
    }
    // Draw grid lines on top face
    for (let i = 0; i <= 3; i++) {
      const pos = i * this.cellSize - HALF;
      this.drawLine(buffer,
        this.project({ x: -HALF, y: HALF, z: pos }),
        this.project({ x: HALF, y: HALF, z: pos }),
        { r: 0, g: 0, b: 0 });
      this.drawLine(buffer,
        this.project({ x: pos, y: HALF, z: -HALF }),
        this.project({ x: pos, y: HALF, z: HALF }),
        { r: 0, g: 0, b: 0 });
    }

    // Draw Front face - at z = +HALF
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const color = SIDE_COLORS[faces[Side.Front][row][col]];
        const x0 = col * this.cellSize - HALF;
        // row 0 is top (y = +HALF), row 2 is bottom (y = -HALF)
        const y0 = HALF - row * this.cellSize;

        const fillPoints = [
          this.project({ x: x0 - OVERLAP, y: y0 + OVERLAP, z: HALF }),
          this.project({ x: x0 + this.cellSize + OVERLAP, y: y0 + OVERLAP, z: HALF }),
          this.project({ x: x0 + this.cellSize + OVERLAP, y: y0 - this.cellSize - OVERLAP, z: HALF }),
          this.project({ x: x0 - OVERLAP, y: y0 - this.cellSize - OVERLAP, z: HALF }),
        ];
        this.fillQuad(buffer, fillPoints, color);
      }
    }
    // Draw grid lines on front face
    for (let i = 0; i <= 3; i++) {
      const pos = i * this.cellSize - HALF;
      this.drawLine(buffer,
        this.project({ x: -HALF, y: HALF - i * this.cellSize, z: HALF }),
        this.project({ x: HALF, y: HALF - i * this.cellSize, z: HALF }),
        { r: 0, g: 0, b: 0 });
      this.drawLine(buffer,
        this.project({ x: pos, y: HALF, z: HALF }),
        this.project({ x: pos, y: -HALF, z: HALF }),
        { r: 0, g: 0, b: 0 });
    }

    // Draw Right face - at x = +HALF
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const color = SIDE_COLORS[faces[Side.Right][row][col]];
        // col 0 is front (z = +HALF), col 2 is back (z = -HALF)
        const z0 = HALF - col * this.cellSize;
        const y0 = HALF - row * this.cellSize;

        const fillPoints = [
          this.project({ x: HALF, y: y0 + OVERLAP, z: z0 + OVERLAP }),
          this.project({ x: HALF, y: y0 + OVERLAP, z: z0 - this.cellSize - OVERLAP }),
          this.project({ x: HALF, y: y0 - this.cellSize - OVERLAP, z: z0 - this.cellSize - OVERLAP }),
          this.project({ x: HALF, y: y0 - this.cellSize - OVERLAP, z: z0 + OVERLAP }),
        ];
        this.fillQuad(buffer, fillPoints, color);
      }
    }
    // Draw grid lines on right face
    for (let i = 0; i <= 3; i++) {
      this.drawLine(buffer,
        this.project({ x: HALF, y: HALF - i * this.cellSize, z: HALF }),
        this.project({ x: HALF, y: HALF - i * this.cellSize, z: -HALF }),
        { r: 0, g: 0, b: 0 });
      this.drawLine(buffer,
        this.project({ x: HALF, y: HALF, z: HALF - i * this.cellSize }),
        this.project({ x: HALF, y: -HALF, z: HALF - i * this.cellSize }),
        { r: 0, g: 0, b: 0 });
    }

    // Draw cell labels if enabled
    if (this.showCellLabels) {
      const labelColor = { r: 0, g: 0, b: 0 };

      // Labels for Up (T) face
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const x0 = col * this.cellSize - HALF;
          const z0 = row * this.cellSize - HALF;
          const center = this.project({
            x: x0 + this.cellSize / 2,
            y: HALF,
            z: z0 + this.cellSize / 2,
          });
          this.drawLabel(buffer, `T${row + 1}${col + 1}`, center.x, center.y, labelColor);
        }
      }

      // Labels for Front (L) face
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const x0 = col * this.cellSize - HALF;
          const y0 = HALF - row * this.cellSize;
          const center = this.project({
            x: x0 + this.cellSize / 2,
            y: y0 - this.cellSize / 2,
            z: HALF,
          });
          this.drawLabel(buffer, `L${row + 1}${col + 1}`, center.x, center.y, labelColor);
        }
      }

      // Labels for Right (R) face
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const z0 = HALF - col * this.cellSize;
          const y0 = HALF - row * this.cellSize;
          const center = this.project({
            x: HALF,
            y: y0 - this.cellSize / 2,
            z: z0 - this.cellSize / 2,
          });
          this.drawLabel(buffer, `R${row + 1}${col + 1}`, center.x, center.y, labelColor);
        }
      }
    }

    // Highlight selected cell
    if (this.selectedCell) {
      const sel = this.selectedCell;
      const highlightColor = { r: 255, g: 255, b: 0 }; // Yellow highlight
      let points: Point2D[] = [];

      if (sel.face === Side.Up) {
        const x0 = sel.col * this.cellSize - HALF;
        const z0 = sel.row * this.cellSize - HALF;
        points = [
          this.project({ x: x0, y: HALF, z: z0 }),
          this.project({ x: x0 + this.cellSize, y: HALF, z: z0 }),
          this.project({ x: x0 + this.cellSize, y: HALF, z: z0 + this.cellSize }),
          this.project({ x: x0, y: HALF, z: z0 + this.cellSize }),
        ];
      } else if (sel.face === Side.Front) {
        const x0 = sel.col * this.cellSize - HALF;
        const y0 = HALF - sel.row * this.cellSize;
        points = [
          this.project({ x: x0, y: y0, z: HALF }),
          this.project({ x: x0 + this.cellSize, y: y0, z: HALF }),
          this.project({ x: x0 + this.cellSize, y: y0 - this.cellSize, z: HALF }),
          this.project({ x: x0, y: y0 - this.cellSize, z: HALF }),
        ];
      } else if (sel.face === Side.Right) {
        const z0 = HALF - sel.col * this.cellSize;
        const y0 = HALF - sel.row * this.cellSize;
        points = [
          this.project({ x: HALF, y: y0, z: z0 }),
          this.project({ x: HALF, y: y0, z: z0 - this.cellSize }),
          this.project({ x: HALF, y: y0 - this.cellSize, z: z0 - this.cellSize }),
          this.project({ x: HALF, y: y0 - this.cellSize, z: z0 }),
        ];
      }

      // Draw thick highlight border
      if (points.length === 4) {
        for (let i = 0; i < 4; i++) {
          this.drawLine(buffer, points[i], points[(i + 1) % 4], highlightColor);
        }
      }
    }

    const t1 = Date.now();
    await this.canvas.setPixelBuffer(buffer);
    const t2 = Date.now();

    // Update labels
    if (this.moveLabel) await this.moveLabel.setText(String(this.cube.getMoveCount()));
    if (this.statusLabel) {
      const status = this.cube.isSolved() ? 'Solved!' : (this.solving ? 'Solving...' : 'Scrambled');
      await this.statusLabel.setText(status);
    }
    const t3 = Date.now();

    console.log(`[RENDER] draw=${t1-t0}ms, setPixelBuffer=${t2-t1}ms, labels=${t3-t2}ms, total=${t3-t0}ms`);

    this.rendering = false;

    // Handle pending render request
    if (this.renderPending) {
      this.renderPending = false;
      this.render();
    }
  }

  private async showControls(): Promise<void> {
    if (!this.win) return;
    await this.win.showInfo('Controls',
      'Rubik\'s Cube Controls:\n\n' +
      'TAP TO ROTATE:\n' +
      '1. Tap a cell to select it (yellow highlight)\n' +
      '2. Tap another cell to rotate\n' +
      '   - Same face: rotates that face\n' +
      '   - Different face: rotates shared edge\n\n' +
      'BUTTONS:\n' +
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

export function create3DCubeApp(a: App, windowWidth?: number, windowHeight?: number): CubeUI {
  const ui = new CubeUI(a);

  // Use provided dimensions or phone-friendly defaults
  const width = windowWidth ?? 350;
  const height = windowHeight ?? 500;

  // Calculate optimal canvas size for the window
  ui.calculateCanvasSize(width, height);

  a.registerCleanup(() => ui.cleanup());

  a.window({ title: '3D Cube', width, height }, (win: Window) => {
    ui.setupWindow(win);

    // Handle window resize to adjust canvas (if supported)
    win.onResize((newWidth, newHeight) => {
      console.log(`[3DCube] Window resized to ${newWidth}x${newHeight}`);
      ui.calculateCanvasSize(newWidth, newHeight);
      // Note: Would need to recreate canvas for new size, but this at least logs it
    });

    win.setContent(() => ui.buildContent());
    win.show();
    // Trigger initial render after UI is set up (needed for phonetop)
    setTimeout(() => ui.initialize(), 0);
  });

  return ui;
}

// Export for testing
export { Side, SIDE_COLORS, DEFAULT_CANVAS_SIZE, DEFAULT_CUBE_SIZE };

// Standalone entry point
if (require.main === module) {
  const startTime = Date.now();
  console.log(`[STARTUP] beginning at ${(Date.now() / 1000).toFixed(3)}...`);
  app(resolveTransport(), { title: '3D Cube' }, async (a: App) => {
    console.log(`[STARTUP] app callback: ${Date.now() - startTime}ms`);
    const ui = create3DCubeApp(a);
    console.log(`[STARTUP] UI created: ${Date.now() - startTime}ms`);
    await a.run();
    console.log(`[STARTUP] a.run() done: ${Date.now() - startTime}ms`);
    await ui.initialize();
    console.log(`[STARTUP] initialized: ${Date.now() - startTime}ms`);
  });
}
