/**
 * Particle System: P5-style physics simulation
 */

import { CosyneContext } from './context';

export interface Vector2D {
  x: number;
  y: number;
}

export interface ParticleOptions {
  life?: number;  // Milliseconds
  velocity?: Vector2D;
  acceleration?: Vector2D;
  radius?: number;
  color?: string;
  alpha?: number;
  friction?: number;  // Velocity damping (0-1)
}

/**
 * Single particle
 */
export class Particle {
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  life: number;  // Current life in ms
  maxLife: number;  // Maximum life in ms
  radius: number;
  color: string;
  alpha: number;
  friction: number;  // Velocity damping

  constructor(x: number, y: number, options: ParticleOptions = {}) {
    this.position = { x, y };
    this.velocity = options.velocity ?? { x: 0, y: 0 };
    this.acceleration = options.acceleration ?? { x: 0, y: 0 };
    this.maxLife = options.life ?? 1000;
    this.life = this.maxLife;
    this.radius = options.radius ?? 3;
    this.color = options.color ?? '#4ECDC4';
    this.alpha = options.alpha ?? 1;
    this.friction = options.friction ?? 0.99;
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;  // Convert to seconds

    // Apply acceleration to velocity
    this.velocity.x += this.acceleration.x * dt;
    this.velocity.y += this.acceleration.y * dt;

    // Apply friction
    this.velocity.x *= this.friction;
    this.velocity.y *= this.friction;

    // Apply velocity to position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    // Decrease life
    this.life -= deltaTime;
  }

  isAlive(): boolean {
    return this.life > 0;
  }

  getAlpha(): number {
    return this.alpha * Math.max(0, this.life / this.maxLife);
  }
}

/**
 * Emitter: Creates and manages particles
 */
export interface EmitterOptions extends ParticleOptions {
  rate?: number;  // Particles per second
  spreadAngle?: number;  // Degrees
  speedVariation?: number;  // +/- variation in speed
}

export class Emitter {
  position: Vector2D;
  active: boolean = true;
  rate: number = 10;  // Particles per second
  spreadAngle: number = 360;  // Degrees
  speedVariation: number = 0;
  emitTime: number = 0;

  // Default particle options
  particleLife: number = 1000;
  particleRadius: number = 3;
  particleColor: string = '#4ECDC4';
  particleAlpha: number = 1;
  particleFriction: number = 0.99;
  particleVelocity: Vector2D = { x: 0, y: 0 };
  particleAcceleration: Vector2D = { x: 0, y: 0 };

  particles: Particle[] = [];

  constructor(x: number, y: number, options: EmitterOptions = {}) {
    this.position = { x, y };
    this.rate = options.rate ?? 10;
    this.spreadAngle = options.spreadAngle ?? 360;
    this.speedVariation = options.speedVariation ?? 0;

    this.particleLife = options.life ?? 1000;
    this.particleRadius = options.radius ?? 3;
    this.particleColor = options.color ?? '#4ECDC4';
    this.particleAlpha = options.alpha ?? 1;
    this.particleFriction = options.friction ?? 0.99;
    this.particleVelocity = options.velocity ?? { x: 0, y: 0 };
    this.particleAcceleration = options.acceleration ?? { x: 0, y: 0 };
  }

  update(deltaTime: number): void {
    if (!this.active) return;

    // Emit new particles
    this.emitTime += deltaTime;
    const particlesToEmit = Math.floor((this.emitTime * this.rate) / 1000);
    if (particlesToEmit > 0) {
      for (let i = 0; i < particlesToEmit; i++) {
        this.emit();
      }
      this.emitTime = 0;
    }

    // Update existing particles
    for (const particle of this.particles) {
      particle.update(deltaTime);
    }

    // Remove dead particles
    this.particles = this.particles.filter((p) => p.isAlive());
  }

  private emit(): void {
    // Calculate velocity direction based on base velocity + spread
    const baseSpeed = Math.sqrt(
      this.particleVelocity.x ** 2 + this.particleVelocity.y ** 2
    );

    // Get base angle from velocity (default to up if zero velocity)
    let baseAngle = Math.atan2(this.particleVelocity.y, this.particleVelocity.x);
    if (baseSpeed === 0) {
      baseAngle = -Math.PI / 2; // Default to pointing up
    }

    // Add random spread
    const spreadRad = (this.spreadAngle * Math.PI) / 180;
    const angle = baseAngle + (Math.random() - 0.5) * spreadRad;

    const variatedSpeed = baseSpeed * (1 + (Math.random() - 0.5) * this.speedVariation);

    const velocity = {
      x: Math.cos(angle) * variatedSpeed,
      y: Math.sin(angle) * variatedSpeed,
    };

    const particle = new Particle(this.position.x, this.position.y, {
      velocity,
      acceleration: this.particleAcceleration,
      life: this.particleLife,
      radius: this.particleRadius,
      color: this.particleColor,
      alpha: this.particleAlpha,
      friction: this.particleFriction,
    });

    this.particles.push(particle);
  }

  private getRandomAngle(): number {
    const startAngle = -this.spreadAngle / 2;
    const randomOffset = Math.random() * this.spreadAngle;
    const angle = ((startAngle + randomOffset) * Math.PI) / 180;
    return angle;
  }

  setPosition(x: number, y: number): this {
    this.position = { x, y };
    return this;
  }

  setRate(rate: number): this {
    this.rate = rate;
    return this;
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}

/**
 * Particle system: Manages multiple emitters
 */
export class ParticleSystem {
  private emitters: Emitter[] = [];
  private gravity: Vector2D = { x: 0, y: 0 };
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private lastFrameTime: number = 0;
  private listeners: Array<() => void> = [];
  private targetFps: number = 60;
  private running: boolean = false;

  addEmitter(emitter: Emitter): this {
    this.emitters.push(emitter);
    return this;
  }

  removeEmitter(emitter: Emitter): this {
    this.emitters = this.emitters.filter((e) => e !== emitter);
    return this;
  }

  setGravity(x: number, y: number): this {
    this.gravity = { x, y };
    return this;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = Date.now();
    this.step();
  }

  stop(): void {
    this.running = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  setTargetFps(fps: number): this {
    this.targetFps = fps;
    return this;
  }

  private step = (): void => {
    // Check if we should still be running
    if (!this.running) {
      this.timerId = null;
      return;
    }

    const now = Date.now();
    const deltaTime = Math.max(1, now - this.lastFrameTime);
    this.lastFrameTime = now;

    // Update all emitters
    for (const emitter of this.emitters) {
      // Apply gravity to particles
      emitter.particles.forEach((p) => {
        p.acceleration.x += this.gravity.x;
        p.acceleration.y += this.gravity.y;
      });

      emitter.update(deltaTime);
    }

    this.listeners.forEach((l) => l());

    // Schedule next frame using setTimeout (works in Node.js unlike requestAnimationFrame)
    if (this.running) {
      const frameInterval = 1000 / this.targetFps;
      this.timerId = setTimeout(this.step, frameInterval);
    }
  };

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  render(ctx: CosyneContext): void {
    for (const emitter of this.emitters) {
      for (const particle of emitter.particles) {
        ctx.circle(particle.position.x, particle.position.y, particle.radius)
          .fill(particle.color)
          .setAlpha(particle.getAlpha())
          .withId(`particle-${Math.random()}`);
      }
    }
  }

  getTotalParticleCount(): number {
    return this.emitters.reduce((sum, e) => sum + e.getParticleCount(), 0);
  }

  clear(): this {
    this.stop();
    this.emitters = [];
    return this;
  }
}
