/**
 * BodyPart - A piece of an exploded enemy that bounces with physics
 * Based on original doom clone's BodyPart/PhysicsObject classes
 */

import { Vector3, urandom, urandomVector } from 'cosyne';
import { IGameMap } from './enemy';

/**
 * A body part that flies off when an enemy dies.
 * Has physics: gravity, velocity, bounces off floor and walls.
 */
export class BodyPart {
  position: Vector3;
  velocity: Vector3;

  // Rotation angles for spinning effect
  rotationX: number = 0;
  rotationY: number = 0;
  rotationZ: number = 0;
  spinRateX: number;
  spinRateY: number;
  spinRateZ: number;

  // Physics parameters
  gravity: number = 0.003;
  friction: number = 0.999;
  bounciness: number = 0.8;

  // Appearance
  size: number;
  color: [number, number, number];

  // State
  dead: boolean = false;
  still: boolean = false;  // Stopped moving
  lifetime: number = 0;
  maxLifetime: number = 5000;  // Die after 5 seconds

  constructor(
    position: Vector3,
    velocity: Vector3,
    size: number,
    color: [number, number, number]
  ) {
    this.position = position.clone();
    this.velocity = velocity.clone();
    this.size = size;
    this.color = color;

    // Random spin rates
    this.spinRateX = urandom() * 0.1;
    this.spinRateY = urandom() * 0.1;
    this.spinRateZ = urandom() * 0.1;
  }

  update(dt: number, map: IGameMap): void {
    if (this.dead || this.still) return;

    this.lifetime += dt;
    if (this.lifetime > this.maxLifetime) {
      this.dead = true;
      return;
    }

    // Apply gravity
    this.velocity.z -= this.gravity * dt;

    // Apply friction
    const frictionFactor = Math.pow(this.friction, dt);
    this.velocity = this.velocity.multiplyScalar(frictionFactor);

    // Update position
    const movement = this.velocity.multiplyScalar(dt / 16);
    this.position = this.position.add(movement);

    // Floor collision
    const floorHeight = map.getFloorHeight(this.position);
    if (this.position.z < floorHeight + this.size) {
      this.position.z = floorHeight + this.size;
      this.velocity.z = -this.velocity.z * this.bounciness;
      this.velocity = this.velocity.multiplyScalar(0.8);

      // Check if essentially stopped
      if (this.velocity.length() < 0.05) {
        this.still = true;
      }
    }

    // Update rotation based on velocity
    const speed = this.velocity.length();
    this.rotationX += this.spinRateX * speed * dt * 0.01;
    this.rotationY += this.spinRateY * speed * dt * 0.01;
    this.rotationZ += this.spinRateZ * speed * dt * 0.01;
  }
}

/**
 * Create body parts for a walking enemy explosion
 * Returns array of BodyPart objects representing the exploded pieces
 */
export function createWalkingEnemyBodyParts(
  position: Vector3,
  explosionDirection: Vector3
): BodyPart[] {
  const parts: BodyPart[] = [];

  // Body parts with their relative positions, sizes, and colors
  const partConfigs: Array<{
    offset: Vector3;
    size: number;
    color: [number, number, number];
  }> = [
    // Torso
    { offset: new Vector3(0, 0, 0), size: 2.5, color: [200, 200, 200] },
    // Head
    { offset: new Vector3(0, 0, 3), size: 2, color: [200, 50, 50] },
    // Left leg
    { offset: new Vector3(-1.5, 0, -3), size: 1.5, color: [180, 180, 180] },
    // Right leg
    { offset: new Vector3(1.5, 0, -3), size: 1.5, color: [180, 180, 180] },
    // Left arm
    { offset: new Vector3(-3, 0, 0), size: 1.2, color: [180, 180, 180] },
    // Right arm
    { offset: new Vector3(3, 0, 0), size: 1.2, color: [180, 180, 180] },
  ];

  for (const config of partConfigs) {
    const partPos = position.add(config.offset);

    // Velocity: mix of explosion direction and random scatter
    const baseVel = explosionDirection.multiplyScalar(0.5 + Math.random() * 0.5);
    const randomVel = urandomVector().multiplyScalar(0.5);
    const upwardVel = new Vector3(0, 0, 1 + Math.random() * 2);
    const velocity = baseVel.add(randomVel).add(upwardVel);

    parts.push(new BodyPart(partPos, velocity, config.size, config.color));
  }

  return parts;
}

/**
 * Create body parts for a flying enemy explosion
 * Smaller pieces for the flying enemy
 */
export function createFlyingEnemyBodyParts(
  position: Vector3,
  explosionDirection: Vector3
): BodyPart[] {
  const parts: BodyPart[] = [];

  // Flying enemy parts - body and two wings
  const partConfigs: Array<{
    offset: Vector3;
    size: number;
    color: [number, number, number];
  }> = [
    // Body
    { offset: new Vector3(0, 0, 0), size: 1.5, color: [80, 80, 80] },
    // Left wing piece 1
    { offset: new Vector3(-2, 0, 0), size: 1, color: [60, 60, 60] },
    // Left wing piece 2
    { offset: new Vector3(-3.5, 0, 0), size: 0.8, color: [60, 60, 60] },
    // Right wing piece 1
    { offset: new Vector3(2, 0, 0), size: 1, color: [60, 60, 60] },
    // Right wing piece 2
    { offset: new Vector3(3.5, 0, 0), size: 0.8, color: [60, 60, 60] },
  ];

  for (const config of partConfigs) {
    const partPos = position.add(config.offset);

    // Flying enemies scatter more widely
    const baseVel = explosionDirection.multiplyScalar(0.3 + Math.random() * 0.4);
    const randomVel = urandomVector().multiplyScalar(0.8);
    const upwardVel = new Vector3(0, 0, 0.5 + Math.random() * 1.5);
    const velocity = baseVel.add(randomVel).add(upwardVel);

    parts.push(new BodyPart(partPos, velocity, config.size, config.color));
  }

  return parts;
}
