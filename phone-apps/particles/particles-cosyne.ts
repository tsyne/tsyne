/**
 * Particle System - Physics Simulation (Cosyne Version)
 *
 * Demonstrates efficient collection binding with physics updates.
 * Particles emit from center, move with velocity, and fade out.
 * Shows that diffing handles position/alpha changes efficiently.
 *
 * Features:
 * - 50-100 particles with positions bound to physics state
 * - Gravity pulls particles downward
 * - Particles fade out over lifetime
 * - Efficient diffing: positions update every frame
 * - Spawn new particles continuously
 */

import { app, resolveTransport } from 'tsyne';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';
import { cosyne, refreshAllCosyneContexts } from 'cosyne';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifetime: number; // 0-1, where 1 is new
  radius: number;
  color: string;
}

/**
 * Particle system state - manages particles
 */
class ParticleSystemState {
  particles: Particle[] = [];
  nextId: number = 0;
  lastSpawnTime: number = Date.now();

  constructor() {
    // Start with 20 particles
    for (let i = 0; i < 20; i++) {
      this.spawnParticle();
    }
  }

  private spawnParticle() {
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 150;

    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#FF69B4',
    ];

    this.particles.push({
      id: this.nextId++,
      x: 200,
      y: 250,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      lifetime: 1.0,
      radius: 3 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  /**
   * Update particle physics
   */
  updateParticles(deltaTime: number = 0.016) {
    // Spawn new particles every 0.1 seconds
    const now = Date.now();
    if (now - this.lastSpawnTime > 50) {
      this.spawnParticle();
      this.lastSpawnTime = now;
    }

    // Physics simulation
    const gravity = 200; // pixels/second²

    this.particles = this.particles
      .map((p) => {
        // Apply gravity
        const vy = p.vy + gravity * deltaTime;

        // Apply air resistance
        const vx = p.vx * 0.98;

        // Update position
        const x = p.x + vx * deltaTime;
        const y = p.y + vy * deltaTime;

        // Decay lifetime
        const lifetime = p.lifetime - deltaTime * 0.5;

        return {
          ...p,
          x,
          y,
          vx,
          vy,
          lifetime,
        };
      })
      .filter((p) => p.lifetime > 0 && p.y < 500); // Remove dead particles and those off-screen
  }

  /**
   * Get particles for rendering
   */
  getParticles(): Particle[] {
    return this.particles;
  }
}

/**
 * Create the particle system app
 */
export function createParticlesApp(a: App, win: Window) {
  const state = new ParticleSystemState();

  win.setContent(() => {
    a.vbox(() => {
      a.label('Particle System').withId('title');

      // Info
      a.hbox(() => {
        a.label(`Particles: ${state.particles.length}`).withId('count-display');
        a.label('Click to burst').withId('info');
      });

      // Particle canvas
      a.center(() => {
        a.canvasStack(() => {
          cosyne(a, (c) => {
            // Background
            c.rect(0, 0, 400, 400)
              .fill('#1a1a2e')
              .stroke('#16213e', 1)
              .withId('background');

            // Emitter point (center)
            c.circle(200, 250, 5)
              .fill('#ffffff')
              .stroke('#ffff00', 2)
              .withId('emitter');

            // Particle collection
            c.circles()
              .bindTo({
                items: () => state.getParticles(),
                render: (particle: Particle) => {
                  return c
                    .circle(particle.x, particle.y, particle.radius)
                    .fill(particle.color)
                    .bindAlpha(() => particle.lifetime)
                    .withId(`particle-${particle.id}`);
                },
                trackBy: (particle: Particle) => particle.id,
              });
          });
        });
      });

      a.label('Physics: gravity & air resistance').withId('subtitle');
    });
  });

  // Update loop - 60fps simulation
  let lastTime = Date.now();
  const updateInterval = setInterval(() => {
    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000; // seconds
    lastTime = now;

    state.updateParticles(deltaTime);
    refreshAllCosyneContexts();

    // Update count display
    try {
      const countLabel = a.getElementById('count-display');
      if (countLabel && countLabel.setText) {
        countLabel.setText(`Particles: ${state.particles.length}`);
      }
    } catch {
      // Label may not be accessible
    }
  }, 16); // ~60fps

  return () => clearInterval(updateInterval);
}

export async function createParticlesAppWithTransport() {
  const transport = await resolveTransport();
  const a = app(transport);
  const win = a.window({ title: 'Particles' });
  createParticlesApp(a, win);
}

if (require.main === module) {
  createParticlesAppWithTransport().catch(console.error);
}
