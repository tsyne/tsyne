/**
 * Base Enemy class for Yet Another Doom Clone
 */

import { Vector3, urandom } from '../../cosyne/src/math3d';

/** Project vector to XY plane (set z to 0) */
function noz(v: Vector3): Vector3 {
  return new Vector3(v.x, v.y, 0);
}

/** Interface for map - avoids circular dependency with index.ts */
export interface IIGameMap {
  getFloorHeight(pos: Vector3): number;
}

export type EnemyState = 'patrol' | 'attack' | 'dead';
export type EnemyType = 'walking' | 'flying';

/**
 * Base enemy class - shared behavior for all enemy types
 */
export abstract class Enemy {
  position: Vector3;
  theta: number;
  health: number = 10;
  state: EnemyState = 'patrol';
  height: number = 5;
  size: number = 6;
  dead: boolean = false;
  attacking: boolean = false;
  time: number = 0;  // Animation time

  // Subclasses define these
  abstract readonly type: EnemyType;
  abstract readonly speedInv: number;  // Higher = slower
  abstract readonly spinRate: number;  // Turn speed
  abstract readonly grounded: boolean; // Does it follow floor height?

  constructor(position: Vector3, theta: number = 0) {
    this.position = position.clone();
    this.theta = theta;
    this.time = urandom() * 100;  // Random animation phase
  }

  update(dt: number, playerPos: Vector3, map: IGameMap): void {
    if (this.dead) return;

    // Update animation time
    this.time += dt / 160;

    // Simple AI: face player and move toward them if attacking
    const toPlayer = noz(playerPos).sub(noz(this.position));
    const distToPlayer = toPlayer.length();

    // Detect player if close enough
    if (distToPlayer < 100 && !this.attacking) {
      this.attacking = true;
      this.state = 'attack';
    }

    if (this.attacking && distToPlayer > 10) {
      // Move toward player
      const goalAngle = Math.atan2(toPlayer.y, toPlayer.x);

      // Gradually turn toward player
      let angleDiff = goalAngle - this.theta;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.theta += angleDiff * this.spinRate;

      // Move forward
      const speed = dt / this.speedInv;
      const moveDir = new Vector3(Math.cos(this.theta), Math.sin(this.theta), 0);
      const nextPos = this.position.add(moveDir.multiplyScalar(speed));

      // Update position based on whether grounded
      const floorHeight = map.getFloorHeight(nextPos);
      if (this.grounded) {
        if (Math.abs(floorHeight - this.position.z + this.height) < 10) {
          this.position = nextPos;
          this.position.z = floorHeight + this.height;
        }
      } else {
        // Flying enemies hover and follow player z loosely
        this.position = nextPos;
        // Gently move toward player height
        const targetZ = Math.max(floorHeight + 15, playerPos.z - 5);
        this.position.z += (targetZ - this.position.z) * 0.02;
      }
    }

    // Subclass-specific update
    this.updateAnimation(dt, playerPos, map);
  }

  /** Override for animation-specific updates */
  updateAnimation(dt: number, playerPos: Vector3, map: IGameMap): void {}

  takeDamage(amount: number): void {
    this.health -= amount;
    if (this.health <= 0) {
      this.dead = true;
      this.state = 'dead';
    }
  }

  distanceTo(other: { position: Vector3 }): number {
    return this.position.distanceTo(other.position);
  }
}
