/**
 * HitParticle - Spark/explosion particles for bullet impacts
 * Based on original doom clone's Hit class
 *
 * These are small glowing particles that spray outward when
 * bullets hit walls or enemies, then fade away.
 */

import { Vector3, urandom, urandomVector } from '../../cosyne/src/math3d';
import { IGameMap } from './enemy';

/**
 * A single hit particle (spark)
 * Has physics: velocity, gravity, bouncing
 * Glows and fades over time
 */
export class HitParticle {
  position: Vector3;
  velocity: Vector3;

  // Physics
  gravity: number = 0.002;
  friction: number = 0.98;
  bounciness: number = 0.5;

  // Appearance
  size: number;
  color: [number, number, number];
  brightness: number = 1.0;  // Fades over time

  // State
  dead: boolean = false;
  lifetime: number = 0;
  maxLifetime: number = 800;  // Short-lived sparks

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
  }

  update(dt: number, map: IGameMap): void {
    if (this.dead) return;

    this.lifetime += dt;
    if (this.lifetime > this.maxLifetime) {
      this.dead = true;
      return;
    }

    // Fade brightness over time
    this.brightness = 1.0 - (this.lifetime / this.maxLifetime);

    // Apply gravity
    this.velocity.z -= this.gravity * dt;

    // Apply friction
    const frictionFactor = Math.pow(this.friction, dt / 16);
    this.velocity = this.velocity.multiplyScalar(frictionFactor);

    // Update position
    const movement = this.velocity.multiplyScalar(dt / 16);
    this.position = this.position.add(movement);

    // Floor collision
    const floorHeight = map.getFloorHeight(this.position);
    if (this.position.z < floorHeight + this.size) {
      this.position.z = floorHeight + this.size;
      this.velocity.z = -this.velocity.z * this.bounciness;

      // Die if essentially stopped
      if (this.velocity.length() < 0.02) {
        this.dead = true;
      }
    }
  }
}

/**
 * Create hit particles for a wall impact
 * Orange/yellow sparks that spray from the impact point
 */
export function createWallHitParticles(
  position: Vector3,
  impactNormal: Vector3,
  count: number = 15
): HitParticle[] {
  const particles: HitParticle[] = [];

  for (let i = 0; i < count; i++) {
    // Random color in orange/yellow range
    const hue = Math.random() * 0.15;  // 0 = red, 0.15 = orange/yellow
    const r = 255;
    const g = Math.floor(100 + Math.random() * 155);  // 100-255
    const b = Math.floor(Math.random() * 50);  // 0-50

    // Velocity: mostly along impact normal (bounce back) + random scatter
    const baseVel = impactNormal.multiplyScalar(0.3 + Math.random() * 0.4);
    const randomVel = urandomVector().multiplyScalar(0.3);
    const upwardVel = new Vector3(0, 0, 0.2 + Math.random() * 0.3);
    const velocity = baseVel.add(randomVel).add(upwardVel);

    // Small particles
    const size = 0.3 + Math.random() * 0.4;

    particles.push(new HitParticle(
      position.add(urandomVector().multiplyScalar(1)),  // Slight position scatter
      velocity,
      size,
      [r, g, b]
    ));
  }

  return particles;
}

/**
 * Create hit particles for an enemy impact
 * Red/orange blood-like sparks
 */
export function createEnemyHitParticles(
  position: Vector3,
  impactDirection: Vector3,
  count: number = 20
): HitParticle[] {
  const particles: HitParticle[] = [];

  for (let i = 0; i < count; i++) {
    // Red/orange colors for enemy hits
    const r = 200 + Math.floor(Math.random() * 55);
    const g = Math.floor(Math.random() * 100);
    const b = Math.floor(Math.random() * 30);

    // Velocity: spray in impact direction + random scatter
    const baseVel = impactDirection.multiplyScalar(0.2 + Math.random() * 0.3);
    const randomVel = urandomVector().multiplyScalar(0.4);
    const upwardVel = new Vector3(0, 0, 0.3 + Math.random() * 0.5);
    const velocity = baseVel.add(randomVel).add(upwardVel);

    // Slightly larger particles for enemies
    const size = 0.4 + Math.random() * 0.5;

    particles.push(new HitParticle(
      position.add(urandomVector().multiplyScalar(2)),  // More scatter
      velocity,
      size,
      [r, g, b]
    ));
  }

  return particles;
}

/**
 * Light flash effect at impact point
 * Temporary bright spot that fades quickly
 */
export class LightFlash {
  position: Vector3;
  intensity: number = 1.0;
  color: [number, number, number];
  radius: number;
  dead: boolean = false;
  lifetime: number = 0;
  maxLifetime: number = 100;  // Very short flash

  constructor(
    position: Vector3,
    color: [number, number, number] = [255, 200, 100],
    radius: number = 30
  ) {
    this.position = position.clone();
    this.color = color;
    this.radius = radius;
  }

  update(dt: number): void {
    if (this.dead) return;

    this.lifetime += dt;
    if (this.lifetime > this.maxLifetime) {
      this.dead = true;
      return;
    }

    // Fade intensity quickly
    this.intensity = 1.0 - (this.lifetime / this.maxLifetime);
  }
}
