/**
 * Player class for Yet Another Doom Clone
 */

import { Vector3 } from 'cosyne';

const ZERO = Vector3.zero();
const Z_DIR = Vector3.forward();

export class Player {
  position: Vector3;
  theta: number = 0;
  theta2: number = 0;  // Vertical look angle
  health: number = 100;
  velocity: Vector3 = ZERO.clone();
  height: number = 5;

  // Camera bob state
  bobPhase: number = 0;        // Current phase in bob cycle (0 to 2*PI)
  bobIntensity: number = 0;    // How much bob to apply (0 = stopped, 1 = full walk)

  constructor(position: Vector3) {
    this.position = position.clone();
  }

  /**
   * Update camera bob based on movement state
   * @param dt Delta time in ms
   * @param isMoving Whether player is currently moving
   */
  updateBob(dt: number, isMoving: boolean): void {
    if (isMoving) {
      // Advance bob phase while moving
      this.bobPhase += dt * 0.008;  // Bob cycle speed

      // Smoothly increase bob intensity
      this.bobIntensity = Math.min(1, this.bobIntensity + dt * 0.005);
    } else {
      // Smoothly decrease bob intensity when stopping
      this.bobIntensity = Math.max(0, this.bobIntensity - dt * 0.003);

      // Smoothly return phase to resting position (0 or PI)
      // This prevents jarring stop in middle of bob cycle
      if (this.bobIntensity > 0.01) {
        const targetPhase = this.bobPhase % Math.PI > Math.PI / 2 ? Math.PI : 0;
        const phaseMod = this.bobPhase % Math.PI;
        const diff = phaseMod - targetPhase;
        this.bobPhase -= diff * dt * 0.003;
      }
    }
  }

  /**
   * Get vertical bob offset for camera
   * Returns how much to offset the view vertically
   */
  getVerticalBob(): number {
    // Vertical bob: cos(phase*2) gives 2 bobs per cycle (up on each step)
    return Math.cos(this.bobPhase * 2) * 2 * this.bobIntensity;
  }

  /**
   * Get camera roll angle (tilt side-to-side)
   * Returns angle in radians
   */
  getCameraRoll(): number {
    // Roll: sin(phase) gives side-to-side tilt
    return Math.sin(this.bobPhase) * 0.02 * this.bobIntensity;
  }

  getForwardVector(): Vector3 {
    // Forward direction based on theta angle
    // Uses cos/sin convention: theta=0 points along +X, theta=PI/2 points along +Y
    return new Vector3(Math.cos(this.theta), Math.sin(this.theta), 0);
  }

  getRightVector(): Vector3 {
    // Right is perpendicular to forward (90 degrees clockwise)
    return new Vector3(Math.cos(this.theta - Math.PI / 2), Math.sin(this.theta - Math.PI / 2), 0);
  }

  getEyePosition(): Vector3 {
    return this.position.add(Z_DIR.multiplyScalar(this.height));
  }
}
