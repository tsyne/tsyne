/**
 * Walking Enemy - Blocky humanoid that walks on the ground
 * Based on original doom clone's Enemy class
 */

import { Vector3 } from 'cosyne';
import { Enemy, EnemyType } from './enemy';

export class WalkingEnemy extends Enemy {
  readonly type: EnemyType = 'walking';
  readonly speedInv = 50;
  readonly spinRate = 0.1;
  readonly grounded = true;

  // Body part colors
  readonly bodyColor: [number, number, number] = [200, 200, 200];  // Gray body
  readonly headColor: [number, number, number] = [200, 50, 50];    // Red head
  readonly eyeColor: [number, number, number] = [255, 0, 0];       // Bright red eyes

  constructor(position: Vector3, theta: number = 0) {
    super(position, theta);
    this.height = 5;
    this.size = 6;
    this.health = 10;
  }
}
