#!/usr/bin/env tsyne

/**
 * Particle System Advanced Demo
 *
 * @tsyne-app:name Particles Advanced
 * @tsyne-app:icon chartIcon
 * @tsyne-app:category Animation
 * @tsyne-app:args app,windowWidth,windowHeight
 */

import { app, refreshAllBindings } from 'tsyne';
import { cosyne, clearAllCosyneContexts, ParticleSystem, Emitter } from 'cosyne';

type EmitterType = 'fountain' | 'fireworks' | 'smoke' | 'explosion';

export function buildParticlesAdvancedApp(a: any) {
  const ps = new ParticleSystem();
  ps.setTargetFps(30); // Physics updates at 30fps

  let emitterType: EmitterType = 'fountain';
  let isRunning = false;
  let currentEmitter: Emitter | null = null;
  let win: any = null;
  let renderTimer: ReturnType<typeof setInterval> | null = null;


  const createEmitter = (x: number, y: number): Emitter => {
    let emitter: Emitter;

    switch (emitterType) {
      case 'fountain':
        emitter = new Emitter(x, y, {
          rate: 50,
          life: 2000,
          radius: 4,
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
          radius: 3,
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
          radius: 6,
          color: '#666666',
          velocity: { x: 0, y: -50 },
          acceleration: { x: 0, y: 0 },
          friction: 0.99,
          spreadAngle: 60,
          speedVariation: 0.2,
        });
        emitter.particleAlpha = 0.6;
        break;

      case 'explosion':
        emitter = new Emitter(x, y, {
          rate: 300,
          life: 1000,
          radius: 5,
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

  // Full UI rebuild - buttons stay stable due to .when() pattern
  const rebuildUI = () => {
    if (!win) return;
    clearAllCosyneContexts();
    win.setContent(buildContent);
  };

  const setEmitterType = (type: EmitterType) => {
    emitterType = type;

    // If running, update the emitter
    if (currentEmitter && isRunning) {
      ps.removeEmitter(currentEmitter);
      currentEmitter = createEmitter(250, 250);
      ps.addEmitter(currentEmitter);
    }
    rebuildUI();
  };

  const startRenderLoop = () => {
    if (renderTimer) return;
    // Rebuild UI at 2fps (500ms) to show particle animation
    renderTimer = setInterval(() => {
      if (isRunning) {
        rebuildUI();
      }
    }, 500);
  };

  const stopRenderLoop = () => {
    if (renderTimer) {
      clearInterval(renderTimer);
      renderTimer = null;
    }
  };

  const doStart = async () => {
    if (isRunning) return;

    if (!currentEmitter) {
      currentEmitter = createEmitter(250, 250);
      ps.addEmitter(currentEmitter);
    }
    ps.start();
    isRunning = true;
    startRenderLoop();
    // Rebuild UI to update button visibility
    rebuildUI();
    // Rebuild again after particles have spawned
    setTimeout(() => {
      if (isRunning) rebuildUI();
    }, 200);
  };

  const doStop = async () => {
    if (!isRunning) return;

    ps.stop();
    isRunning = false;
    stopRenderLoop();
    // Rebuild UI to update button visibility
    rebuildUI();
  };

  const buildContent = () => {
    const count = ps.getTotalParticleCount();

    a.vbox(() => {
      a.label('Interactive Particle System', undefined, undefined, undefined, { bold: true });

      // Emitter type controls
      a.hbox(() => {
        a.button('Fountain')
          .onClick(async () => setEmitterType('fountain'))
          .withId('btn-fountain')
          .when(() => emitterType !== 'fountain');
        a.button('Fireworks')
          .onClick(async () => setEmitterType('fireworks'))
          .withId('btn-fireworks')
          .when(() => emitterType !== 'fireworks');
        a.button('Smoke')
          .onClick(async () => setEmitterType('smoke'))
          .withId('btn-smoke')
          .when(() => emitterType !== 'smoke');
        a.button('Explosion')
          .onClick(async () => setEmitterType('explosion'))
          .withId('btn-explosion')
          .when(() => emitterType !== 'explosion');

        a.label(`Type: ${emitterType}`).withId('emitterTypeLabel');
      });

      // Status row - pad count to prevent wobble
      a.hbox(() => {
        a.label(`Particles: ${String(count).padStart(4, ' ')}`).withId('particleCountLabel');
        // Two separate buttons with .when() for declarative visibility
        a.button('Start')
          .onClick(async () => doStart())
          .withId('startBtn')
          .when(() => !isRunning);
        a.button('Stop')
          .onClick(async () => doStop())
          .withId('stopBtn')
          .when(() => isRunning);
      });

      // Canvas
      a.canvasStack(() => {
        cosyne(a, (c) => {
          c.rect(0, 0, 500, 500)
            .fill('#1a1a2e')
            .withId('background');
          ps.render(c);
        });
      });

      a.label('Click "Create at Center" to spawn particles');

      // Action buttons
      a.hbox(() => {
        a.button('Clear')
          .onClick(async () => {
            ps.clear();
            currentEmitter = null;
            doStop();
            rebuildUI();
          })
          .withId('clearBtn');

        a.button('Create at Center')
          .onClick(async () => {
            if (currentEmitter) {
              ps.removeEmitter(currentEmitter);
            }
            currentEmitter = createEmitter(250, 250);
            ps.addEmitter(currentEmitter);
            if (!isRunning) {
              doStart();
            }
          })
          .withId('createCenterBtn');
      });
    });
  };

  a.window({ title: 'Particle System Advanced Demo', width: 900, height: 750 }, (w: any) => {
    win = w;
    win.setContent(buildContent);
    win.show();
  });

  // Don't use ps.subscribe for rendering - use our own timer instead
  // This decouples physics updates from render updates
}

// Auto-run when executed directly
if (require.main === module) {
  const { resolveTransport } = require('../../core/src');
  app(resolveTransport(), { title: 'Particles Advanced Demo' }, buildParticlesAdvancedApp);
}
