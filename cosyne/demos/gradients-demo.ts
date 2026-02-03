#!/usr/bin/env npx tsx
/**
 * Gradients Demo
 *
 * Demonstrates gradient fills including linear, radial, color stops,
 * alpha blending, and gradient animation transitions.
 *
 * Run: npx tsx cosyne/demos/gradients-demo.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, CosyneContext, enableEventHandling, refreshAllCosyneContexts } from 'cosyne';

const WIDTH = 600;
const HEIGHT = 500;

interface DemoState {
  gradientType: 'linear-h' | 'linear-v' | 'linear-diag' | 'radial';
  colorScheme: 'sunset' | 'ocean' | 'forest' | 'candy';
  animating: boolean;
  animationTime: number;
}

function createGradientsDemo(a: App): void {
  const state: DemoState = {
    gradientType: 'linear-h',
    colorScheme: 'sunset',
    animating: false,
    animationTime: 0,
  };

  const colorSchemes = {
    sunset: ['#ff6b6b', '#feca57', '#ff9ff3', '#ff6348'],
    ocean: ['#0984e3', '#6c5ce7', '#00b894', '#0984e3'],
    forest: ['#27ae60', '#16a085', '#2c3e50', '#27ae60'],
    candy: ['#ff69b4', '#ff1493', '#ffb6c1', '#ffc0cb'],
  };

  function getGradientForType(t: number = 0) {
    const scheme = colorSchemes[state.colorScheme];
    const x = (Math.sin(t) + 1) / 2;

    switch (state.gradientType) {
      case 'linear-h':
        return {
          start: [50, HEIGHT / 2],
          end: [WIDTH - 50, HEIGHT / 2],
          colors: scheme,
        };
      case 'linear-v':
        return {
          start: [WIDTH / 2, 50],
          end: [WIDTH / 2, HEIGHT - 50],
          colors: scheme,
        };
      case 'linear-diag':
        return {
          start: [50, 50],
          end: [WIDTH - 50, HEIGHT - 50],
          colors: scheme,
        };
      case 'radial':
        return {
          center: [WIDTH / 2 + x * 100, HEIGHT / 2],
          colors: scheme,
        };
    }
  }

  let animationFrame: any = null;

  a.window(
    { title: 'Gradients Demo', width: WIDTH + 40, height: HEIGHT + 220 },
    (win: any) => {
      win.setContent(() => {
        a.vbox(() => {
          // Title
          a.label('Gradient Fills & Color Transitions');

          // Gradient type controls
          a.hbox(() => {
            a.label('Gradient Type:');
            a.button('Horizontal', { onClick: () => {
              state.gradientType = 'linear-h';
              refreshAllCosyneContexts();
            } });
            a.button('Vertical', { onClick: () => {
              state.gradientType = 'linear-v';
              refreshAllCosyneContexts();
            } });
            a.button('Diagonal', { onClick: () => {
              state.gradientType = 'linear-diag';
              refreshAllCosyneContexts();
            } });
            a.button('Radial', { onClick: () => {
              state.gradientType = 'radial';
              refreshAllCosyneContexts();
            } });
          });

          // Color scheme controls
          a.hbox(() => {
            a.label('Color Scheme:');
            a.button('Sunset', { onClick: () => {
              state.colorScheme = 'sunset';
              refreshAllCosyneContexts();
            } });
            a.button('Ocean', { onClick: () => {
              state.colorScheme = 'ocean';
              refreshAllCosyneContexts();
            } });
            a.button('Forest', { onClick: () => {
              state.colorScheme = 'forest';
              refreshAllCosyneContexts();
            } });
            a.button('Candy', { onClick: () => {
              state.colorScheme = 'candy';
              refreshAllCosyneContexts();
            } });
          });

          // Animation toggle
          a.checkbox('Animate', (checked: boolean) => {
            state.animating = checked;
            if (state.animating) {
              const animate = () => {
                if (!state.animating) return;
                state.animationTime += 0.05;
                refreshAllCosyneContexts();
                animationFrame = setTimeout(animate, 16);
              };
              animate();
            }
          }).setChecked(state.animating);

          // Canvas area
          a.max(() => {
            const chart = cosyne(a, (ctx: CosyneContext) => {
              const gradInfo = getGradientForType(state.animationTime);

              // Draw multiple gradient shapes
              // Rectangle 1: Full-width gradient
              ctx.rectangle({
                size: [WIDTH - 100, 80],
                position: [50, 50],
              })
                .setFill({
                  type: 'linear',
                  start: [50, 50],
                  end: [WIDTH - 50, 50],
                  colorStops: gradInfo.colors,
                })
                .setStroke('#333', 2)
                .withId('rect-gradient-1');

              // Rectangle 2: Vertical gradient
              ctx.rectangle({
                size: [80, HEIGHT - 200],
                position: [50, 150],
              })
                .setFill({
                  type: 'linear',
                  start: [90, 150],
                  end: [90, HEIGHT - 50],
                  colorStops: gradInfo.colors.reverse(),
                })
                .setStroke('#333', 2)
                .withId('rect-gradient-2');

              // Circle: Radial gradient
              ctx.circle({ center: [WIDTH / 2, HEIGHT / 2], radius: 100 })
                .setFill({
                  type: 'radial',
                  center: [WIDTH / 2, HEIGHT / 2],
                  radius: 100,
                  colorStops: gradInfo.colors,
                })
                .setStroke('#333', 2)
                .withId('circle-gradient');

              // Rectangle 3: Right side gradient
              ctx.rectangle({
                size: [80, HEIGHT - 200],
                position: [WIDTH - 130, 150],
              })
                .setFill({
                  type: 'linear',
                  start: [WIDTH - 90, 150],
                  end: [WIDTH - 90, HEIGHT - 50],
                  colorStops: gradInfo.colors,
                })
                .setStroke('#333', 2)
                .withId('rect-gradient-3');

              // Text label
              ctx.text('Gradients: Linear & Radial', {
                x: WIDTH / 2,
                y: HEIGHT - 30,
                textAlign: 'center',
                fontSize: 14,
                fill: '#333',
              })
                .withId('label');
            });

            enableEventHandling(chart);
          });

          a.label('Shows linear (horizontal, vertical, diagonal) and radial gradients');
        });
      });

      win.setCloseIntercept(async () => {
        state.animating = false;
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
    { title: 'Gradients Demo' },
    createGradientsDemo
  );
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
