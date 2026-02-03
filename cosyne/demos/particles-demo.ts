#!/usr/bin/env npx tsx
/**
 * Particles Demo
 *
 * Demonstrates particle system physics simulation with velocity, acceleration,
 * friction, lifespan and fade effects, and multiple emitter patterns.
 *
 * Run: npx tsx cosyne/demos/particles-demo.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, CosyneContext, enableEventHandling, refreshAllCosyneContexts } from 'cosyne';

const WIDTH = 600;
const HEIGHT = 500;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface DemoState {
  particles: Particle[];
  emitterMode: 'burst' | 'continuous' | 'fountain';
  emitterX: number;
  emitterY: number;
  gravity: number;
  friction: number;
  particleCount: number;
}

function createParticlesDemo(a: App): void {
  const state: DemoState = {
    particles: [],
    emitterMode: 'burst',
    emitterX: WIDTH / 2,
    emitterY: HEIGHT / 2,
    gravity: 0.2,
    friction: 0.98,
    particleCount: 0,
  };

  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffd93d', '#95e1d3'];

  function emitBurst(x: number, y: number, count: number = 30) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 3 + Math.random() * 3;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  function emitFountain(x: number, y: number) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 4;
    const speed = 4 + Math.random() * 2;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  function updateParticles() {
    // Emit new particles if continuous
    if (state.emitterMode === 'continuous') {
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 2;
        state.particles.push({
          x: state.emitterX,
          y: state.emitterY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    }

    if (state.emitterMode === 'fountain') {
      emitFountain(state.emitterX, state.emitterY);
    }

    // Update particles
    state.particles = state.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += state.gravity;
      p.vx *= state.friction;
      p.vy *= state.friction;
      p.life -= 1 / 60;

      // Bounce off walls
      if (p.x < 0 || p.x > WIDTH) p.vx *= -0.8;
      if (p.y < 0 || p.y > HEIGHT) p.vy *= -0.8;

      p.x = Math.max(0, Math.min(WIDTH, p.x));
      p.y = Math.max(0, Math.min(HEIGHT, p.y));

      return p.life > 0;
    });

    state.particleCount = state.particles.length;
  }

  let animationFrame: any = null;

  a.window(
    { title: 'Particles Demo', width: WIDTH + 40, height: HEIGHT + 220 },
    (win: any) => {
      win.setContent(() => {
        a.vbox(() => {
          // Title
          a.label('Particle System Physics Simulation');

          // Mode controls
          a.hbox(() => {
            a.label('Emitter Mode:');
            a.button('Burst', { onClick: () => {
              state.emitterMode = 'burst';
              emitBurst(state.emitterX, state.emitterY, 50);
              refreshAllCosyneContexts();
            } });
            a.button('Continuous', { onClick: () => {
              state.emitterMode = 'continuous';
              refreshAllCosyneContexts();
            } });
            a.button('Fountain', { onClick: () => {
              state.emitterMode = 'fountain';
              refreshAllCosyneContexts();
            } });
          });

          // Physics controls
          a.hbox(() => {
            a.label('Gravity:');
            a.slider(0, 1, state.gravity, (val: number) => {
              state.gravity = val;
            })
              .withId('gravity-slider');

            a.spacer();

            a.label('Friction:');
            a.slider(0.9, 1, state.friction, (val: number) => {
              state.friction = val;
            })
              .withId('friction-slider');
          });

          // Particle count
          a.label(`Active Particles: ${state.particleCount}`).withId('particle-count');

          // Canvas area
          a.max(() => {
            const chart = cosyne(a, (ctx: CosyneContext) => {
              // Background
              ctx.rectangle({
                size: [WIDTH, HEIGHT],
                position: [0, 0],
              })
                .setFill('#1a1a2e')
                .withId('bg');

              // Emitter indicator
              ctx.circle({ center: [state.emitterX, state.emitterY], radius: 5 })
                .setFill('#fff')
                .withId('emitter');

              // Draw particles
              state.particles.forEach((p, i) => {
                const alpha = p.life / p.maxLife;
                ctx.circle({ center: [p.x, p.y], radius: 3 })
                  .setFill(p.color)
                  .setOpacity(alpha)
                  .withId(`particle-${i}`);
              });
            });

            enableEventHandling(chart);
          });

          a.label('Click to emit burst | Drag to move emitter');
        });
      });

      // Animation loop
      let isRunning = true;
      const animate = () => {
        if (!isRunning) return;
        updateParticles();
        refreshAllCosyneContexts();
        animationFrame = setTimeout(animate, 16);
      };

      animate();

      win.setCloseIntercept(async () => {
        isRunning = false;
        if (animationFrame) clearTimeout(animationFrame);
        return true;
      });

      win.show();
    }
  );
}

if (require.main === module) {
  const appInstance = app(
    resolveTransport(),
    { title: 'Particles Demo' },
    createParticlesDemo
  );
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
