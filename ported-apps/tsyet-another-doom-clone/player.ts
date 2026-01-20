/**
 * Player class for Yet Another Doom Clone
 */

import { Vector3 } from '../../cosyne/src/math3d';

const ZERO = Vector3.zero();
const Z_DIR = Vector3.forward();

export class Player {
  position: Vector3;
  theta: number = 0;
  theta2: number = 0;  // Vertical look angle
  health: number = 100;
  velocity: Vector3 = ZERO.clone();
  height: number = 5;

  constructor(position: Vector3) {
    this.position = position.clone();
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
