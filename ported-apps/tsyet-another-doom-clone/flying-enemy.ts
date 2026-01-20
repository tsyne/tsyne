/**
 * Flying Enemy - Small winged creature that floats
 * Based on original doom clone's FlyingEnemy class
 */

import { Vector3, urandom } from '../../cosyne/src/math3d';
import { Enemy, EnemyType, IGameMap } from './enemy';

export class FlyingEnemy extends Enemy {
  readonly type: EnemyType = 'flying';
  readonly speedInv = 20;   // Faster than walking
  readonly spinRate = 0.1;
  readonly grounded = false;

  // Flying enemies are darker gray
  readonly bodyColor: [number, number, number] = [80, 80, 80];
  readonly wingColor: [number, number, number] = [60, 60, 60];
  readonly eyeColor: [number, number, number] = [255, 0, 0];

  // Wing flap phase
  wingPhase: number = 0;
  heightOffset: number;

  constructor(position: Vector3, theta: number = 0) {
    super(position, theta);
    this.height = 8;
    this.size = 6;
    this.health = 5;  // Weaker but faster
    this.heightOffset = urandom() * 5;  // Random hover height variation
  }

  updateAnimation(dt: number, playerPos: Vector3, map: IGameMap): void {
    // Update wing flap and vertical bobbing
    this.wingPhase = this.time * 8;  // Faster wing flapping

    // Vertical bobbing motion
    const bobAmount = Math.sin(this.time / 5) * 2 + Math.sin(this.time);
    this.position.z += bobAmount * dt * 0.01;
  }
}
