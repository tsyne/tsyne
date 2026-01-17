#!/usr/bin/env tsyne

/**
 * Particle System Advanced Demo
 *
 * @tsyne-app:name Particles Advanced
 * @tsyne-app:icon chartIcon
 * @tsyne-app:category Animation
 * @tsyne-app:args (a: any) => void
 */

import { app } from '../../core/src/index';
import { cosyne, refreshAllCosyneContexts, enableEventHandling } from '../../cosyne/src/index';
import { ParticleSystem, Emitter } from '../../cosyne/src/particle-system';

type EmitterType = 'fountain' | 'fireworks' | 'smoke' | 'explosion';

class ParticlesAdvancedStore {
  private changeListeners: Array<() => void> = [];
  public emitterType: EmitterType = 'fountain';
  public isRunning: boolean = false;
  public particleCount: number = 0;
  public mouseX: number = 250;
  public mouseY: number = 250;

  subscribe(listener: () => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange() {
    this.changeListeners.forEach((l) => l());
  }

  setEmitterType(type: EmitterType) {
    this.emitterType = type;
    this.notifyChange();
  }

  setRunning(running: boolean) {
    this.isRunning = running;
    this.notifyChange();
  }

  setParticleCount(count: number) {
    this.particleCount = count;
    this.notifyChange();
  }

  setMousePosition(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }
}

export function buildParticlesAdvancedApp(a: any) {
  const store = new ParticlesAdvancedStore();
  const ps = new ParticleSystem();
  let currentEmitter: Emitter | null = null;

  let particleCountLabel: any;
  let emitterTypeLabel: any;

  const createEmitter = (x: number, y: number): Emitter => {
    let emitter: Emitter;

    switch (store.emitterType) {
      case 'fountain':
        emitter = new Emitter(x, y, {
          rate: 50,
          life: 2000,
          radius: 3,
          color: '#4ECDC4',
          velocity: { x: 0, y: -100 },
          acceleration: { x: 0, y: 200 },
          friction: 0.98,
          spreadAngle: 45,
          speedVariation: 0.3,
        });
        break;

      case 'fireworks':
        emitter = new Emitter(x, y, {
          rate: 200,
          life: 1500,
          radius: 2,
          color: '#FF6B6B',
          velocity: { x: 0, y: 0 },
          acceleration: { x: 0, y: 100 },
          friction: 0.95,
          spreadAngle: 360,
          speedVariation: 0.5,
        });
        break;

      case 'smoke':
        emitter = new Emitter(x, y, {
          rate: 30,
          life: 3000,
          radius: 5,
          color: '#999999',
          velocity: { x: 0, y: -50 },
          acceleration: { x: 0, y: 0 },
          friction: 0.99,
          spreadAngle: 60,
          speedVariation: 0.2,
        });
        emitter.particleAlpha = 0.5;
        break;

      case 'explosion':
        emitter = new Emitter(x, y, {
          rate: 300,
          life: 1000,
          radius: 4,
          color: '#FFA500',
          velocity: { x: 0, y: 0 },
          acceleration: { x: 0, y: 50 },
          friction: 0.92,
          spreadAngle: 360,
          speedVariation: 0.8,
        });
        break;
    }

    return emitter;
  };

  a.window({ title: 'Particle System Advanced Demo', width: 900, height: 750 }, (win: any) => {
    win.setContent(() => {
      a.vbox(() => {
        // Title and info
        a.label('Interactive Particle System', undefined, undefined, undefined, { bold: true });

        // Controls
        a.hbox(() => {
          a.button('Fountain')
            .onClick(async () => store.setEmitterType('fountain'))
            .withId('btn-fountain')
            .when(() => store.emitterType !== 'fountain');
          a.button('Fireworks')
            .onClick(async () => store.setEmitterType('fireworks'))
            .withId('btn-fireworks')
            .when(() => store.emitterType !== 'fireworks');
          a.button('Smoke')
            .onClick(async () => store.setEmitterType('smoke'))
            .withId('btn-smoke')
            .when(() => store.emitterType !== 'smoke');
          a.button('Explosion')
            .onClick(async () => store.setEmitterType('explosion'))
            .withId('btn-explosion')
            .when(() => store.emitterType !== 'explosion');

          emitterTypeLabel = a.label(`Type: ${store.emitterType}`).withId('emitterTypeLabel');
        });

        // Status
        a.hbox(() => {
          particleCountLabel = a.label(`Particles: 0`).withId('particleCountLabel');
          a.button(store.isRunning ? 'Stop' : 'Start')
            .onClick(async () => {
              if (store.isRunning) {
                ps.stop();
                store.setRunning(false);
              } else {
                ps.start();
                store.setRunning(true);
              }
            })
            .withId('toggleBtn');
        });

        // Canvas
        a.canvasStack(() => {
          const ctx = cosyne(a, (c) => {
            // Draw background
            c.rect(0, 0, 500, 500)
              .fill('#f5f5f5')
              .withId('background');

            // Draw particle system
            ps.render(c);

            // Instructions
            c.text(10, 520, 'Click to create particles')
              .fill('#666666')
              .withId('instructions');
          });

          // Enable event handling for mouse clicks
          enableEventHandling(ctx, a, { width: 500, height: 550 });

          // Get the event router to add custom handler
          const handleCanvasClick = (x: number, y: number) => {
            if (!store.isRunning) {
              ps.start();
              store.setRunning(true);
            }

            // Remove old emitter if any
            if (currentEmitter) {
              ps.removeEmitter(currentEmitter);
            }

            // Create new emitter at click location
            currentEmitter = createEmitter(x, y);
            ps.addEmitter(currentEmitter);

            store.setMousePosition(x, y);
          };

          // Simple click handler - would be better with proper event binding
          // For now, we'll trigger from a button
        });

        // Action buttons
        a.hbox(() => {
          a.button('Clear')
            .onClick(async () => {
              ps.clear();
              currentEmitter = null;
              store.setRunning(false);
              store.setParticleCount(0);
              await refreshAllCosyneContexts();
            })
            .withId('clearBtn');

          a.button('Create at Center')
            .onClick(async () => {
              if (!store.isRunning) {
                ps.start();
                store.setRunning(true);
              }
              if (currentEmitter) {
                ps.removeEmitter(currentEmitter);
              }
              currentEmitter = createEmitter(250, 250);
              ps.addEmitter(currentEmitter);
              await refreshAllCosyneContexts();
            })
            .withId('createCenterBtn');
        });
      });
    });
    win.show();
  });

  // Update on particle system changes
  ps.subscribe(async () => {
    const count = ps.getTotalParticleCount();
    store.setParticleCount(count);
    particleCountLabel?.setText?.(`Particles: ${count}`);
    await refreshAllCosyneContexts();
  });

  // Subscribe to store changes
  store.subscribe(async () => {
    emitterTypeLabel?.setText?.(`Type: ${store.emitterType}`);
  });
}

// Auto-run when executed directly
if (require.main === module) {
  const { resolveTransport } = require('../../core/src');
  app(resolveTransport(), { title: 'Particles Advanced Demo' }, buildParticlesAdvancedApp);
}
