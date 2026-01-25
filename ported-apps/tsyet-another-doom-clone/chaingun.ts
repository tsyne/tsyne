/**
 * Chaingun - 3D gun model for Yet Another Doom Clone
 *
 * The chaingun is made of cylinders using object lathing:
 * - 3 disc segments (main body)
 * - 8 barrel cylinders arranged in a circle
 *
 * It features:
 * - Side-to-side and up-down bobbing while walking
 * - Kickback when shooting
 * - Spinning barrels when firing
 */

import { Vector3 } from 'cosyne';

/**
 * Chaingun state and rendering
 */
export class Chaingun {
  // Position offset from screen center (used for bobbing and recoil)
  offsetX: number = 0;
  offsetY: number = 0;
  offsetZ: number = 0;

  // Recoil state (kicks back when shooting)
  recoilX: number = 0;
  recoilY: number = 0;

  // Barrel rotation angle
  barrelRotation: number = 0;

  // Walk cycle phase (for bobbing)
  walkPhase: number = 0;

  // Is currently firing (for barrel spin)
  firing: boolean = false;

  // Colors
  bodyColor: [number, number, number] = [100, 100, 110];     // Dark metal gray
  barrelColor: [number, number, number] = [70, 70, 80];      // Darker barrel
  highlightColor: [number, number, number] = [140, 140, 150]; // Highlights

  constructor() {}

  /**
   * Update gun state each frame
   * @param dt Delta time in ms
   * @param isMoving Whether the player is moving (for bob)
   * @param isFiring Whether player just fired
   */
  update(dt: number, isMoving: boolean, isFiring: boolean): void {
    // Update walk phase for bobbing effect
    if (isMoving) {
      this.walkPhase += dt * 0.008;
    }

    // Apply recoil when firing
    if (isFiring) {
      this.recoilY = -0.15;  // Kick back
      this.firing = true;
    }

    // Decay recoil back to neutral
    const recoilDecay = 1 - Math.pow(0.9, dt / 16);
    this.recoilY *= (1 - recoilDecay);

    // Spin barrels when firing (or recently fired)
    if (this.firing || Math.abs(this.recoilY) > 0.01) {
      this.barrelRotation += dt * 0.02;
    }

    // Stop firing state after recoil settles
    if (Math.abs(this.recoilY) < 0.005) {
      this.firing = false;
    }

    // Calculate bobbing offsets
    if (isMoving) {
      // Horizontal bob (side to side)
      this.offsetX = Math.sin(this.walkPhase) * 0.03;
      // Vertical bob (up and down - twice as fast)
      this.offsetZ = Math.abs(Math.sin(this.walkPhase * 2)) * 0.02;
    } else {
      // Decay bob when standing still
      this.offsetX *= (1 - recoilDecay);
      this.offsetZ *= (1 - recoilDecay);
    }
  }

  /**
   * Get the current gun position offset (combines bob and recoil)
   * Returns [x, y, z] offset in screen space
   */
  getOffset(): [number, number, number] {
    return [
      this.offsetX,
      this.recoilY,
      this.offsetZ
    ];
  }
}

/**
 * Chaingun geometry for rendering
 * Pre-computed 2D projection of the chaingun model
 */
export interface ChaingunGeometry {
  // Main body discs (3 rings)
  bodyDiscs: Array<{
    x: number;      // Position along gun
    radius: number; // Disc radius
    thickness: number;
  }>;

  // Barrel cylinders (8 barrels in a circle)
  barrels: Array<{
    angle: number;     // Angle around the center
    radius: number;    // Distance from center
    length: number;    // Barrel length
    thickness: number; // Barrel radius
  }>;
}

/**
 * Create the chaingun geometry
 * Based on the original game's lathe cylinders:
 * - 3 body discs at x=2,5,6 with radius 1.8
 * - 8 barrels at radius 1.0 from center, length 8.5
 */
export function createChaingunGeometry(): ChaingunGeometry {
  return {
    bodyDiscs: [
      { x: 2, radius: 1.8, thickness: 0.5 },
      { x: 5, radius: 1.8, thickness: 0.5 },
      { x: 6, radius: 1.8, thickness: 0.5 },
    ],
    barrels: Array.from({ length: 8 }, (_, i) => ({
      angle: (i * Math.PI) / 4,  // 8 barrels evenly spaced
      radius: 1.0,               // Distance from center
      length: 8.5,               // Barrel length
      thickness: 0.5,            // Barrel radius
    })),
  };
}

// Pre-create geometry
export const CHAINGUN_GEOMETRY = createChaingunGeometry();
