#!/usr/bin/env npx tsx
/**
 * Effects Demo
 *
 * Demonstrates visual effects including drop shadows, glow effects,
 * text shadows, text strokes, and combined effects.
 *
 * Run: npx tsx cosyne/demos/effects-demo.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, CosyneContext, enableEventHandling, refreshAllCosyneContexts } from 'cosyne';

const WIDTH = 600;
const HEIGHT = 500;

interface DemoState {
  effectType: 'shadow' | 'glow' | 'text-shadow' | 'text-stroke' | 'combined';
}

function createEffectsDemo(a: App): void {
  const state: DemoState = {
    effectType: 'shadow',
  };

  a.window(
    { title: 'Effects Demo', width: WIDTH + 40, height: HEIGHT + 180 },
    (win: any) => {
      win.setContent(() => {
        a.vbox(() => {
          a.label('Visual Effects: Shadows, Glow, Strokes');

          a.hbox(() => {
            a.label('Effect Type:');
            ['Shadow', 'Glow', 'Text Shadow', 'Text Stroke', 'Combined'].forEach((label, idx) => {
              a.button(label).onClick(() => {
                state.effectType = [
                  'shadow',
                  'glow',
                  'text-shadow',
                  'text-stroke',
                  'combined',
                ][idx] as typeof state.effectType;
                refreshAllCosyneContexts();
              });
            });
          });

          a.max(() => {
            const chart = cosyne(a, (ctx: CosyneContext) => {
              ctx.rectangle({
                size: [WIDTH, HEIGHT],
                position: [0, 0],
              })
                .setFill('#f0f0f0');

              switch (state.effectType) {
                case 'shadow':
                  ctx.circle({ center: [WIDTH / 2, HEIGHT / 2], radius: 80 })
                    .setFill('#3498db')
                    .setStroke('#2c3e50', 3)
                    .withId('shadow-circle');
                  // Simulate shadow with offset circle
                  ctx.circle({ center: [WIDTH / 2 + 5, HEIGHT / 2 + 5], radius: 80 })
                    .setFill('rgba(0, 0, 0, 0.2)')
                    .withId('shadow-blur');
                  break;

                case 'glow':
                  ctx.rectangle({
                    size: [200, 100],
                    position: [WIDTH / 2 - 100, HEIGHT / 2 - 50],
                  })
                    .setFill('#e74c3c')
                    .setStroke('#c0392b', 2)
                    .withId('glow-box');
                  // Simulate glow with outer rings
                  ctx.rectangle({
                    size: [220, 120],
                    position: [WIDTH / 2 - 110, HEIGHT / 2 - 60],
                  })
                    .setFill(undefined)
                    .setStroke('rgba(231, 76, 60, 0.4)', 4)
                    .withId('glow-1');
                  ctx.rectangle({
                    size: [240, 140],
                    position: [WIDTH / 2 - 120, HEIGHT / 2 - 70],
                  })
                    .setFill(undefined)
                    .setStroke('rgba(231, 76, 60, 0.2)', 4)
                    .withId('glow-2');
                  break;

                case 'text-shadow':
                  // Shadow text
                  ctx.text('Shadowed Text', {
                    x: WIDTH / 2 + 3,
                    y: HEIGHT / 2 + 3,
                    fontSize: 48,
                    fill: 'rgba(0, 0, 0, 0.3)',
                    textAlign: 'center',
                  })
                    .withId('text-shadow');
                  // Main text
                  ctx.text('Shadowed Text', {
                    x: WIDTH / 2,
                    y: HEIGHT / 2,
                    fontSize: 48,
                    fill: '#2c3e50',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  })
                    .withId('text-main');
                  break;

                case 'text-stroke':
                  // Stroked text (simulated with multiple offset copies)
                  for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const offsetX = Math.cos(angle) * 2;
                    const offsetY = Math.sin(angle) * 2;
                    ctx.text('Stroked', {
                      x: WIDTH / 2 + offsetX,
                      y: HEIGHT / 2 + offsetY,
                      fontSize: 48,
                      fill: '#e74c3c',
                      textAlign: 'center',
                      fontWeight: 'bold',
                    });
                  }
                  // Main text
                  ctx.text('Stroked', {
                    x: WIDTH / 2,
                    y: HEIGHT / 2,
                    fontSize: 48,
                    fill: '#ffffff',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  })
                    .withId('text-stroked');
                  break;

                case 'combined':
                  // Shadow + glow + stroke effect
                  ctx.circle({ center: [WIDTH / 2 + 3, HEIGHT / 2 + 3], radius: 60 })
                    .setFill('rgba(0, 0, 0, 0.2)')
                    .withId('combined-shadow');

                  ctx.circle({ center: [WIDTH / 2, HEIGHT / 2], radius: 65 })
                    .setFill(undefined)
                    .setStroke('rgba(52, 152, 219, 0.3)', 6)
                    .withId('combined-glow');

                  ctx.circle({ center: [WIDTH / 2, HEIGHT / 2], radius: 60 })
                    .setFill('#3498db')
                    .setStroke('#2c3e50', 3)
                    .withId('combined-main');

                  ctx.text('Combined', {
                    x: WIDTH / 2,
                    y: HEIGHT / 2 - 80,
                    fontSize: 32,
                    fill: '#2c3e50',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  })
                    .withId('combined-label');
                  break;
              }
            });

            enableEventHandling(chart);
          });
        });
      });

      win.show();
    }
  );
}

if (require.main === module) {
  const appInstance = app(
    resolveTransport(),
    { title: 'Effects Demo' },
    createEffectsDemo
  );
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
