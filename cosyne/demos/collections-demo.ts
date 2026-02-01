#!/usr/bin/env npx tsx
/**
 * Collections Demo
 *
 * Demonstrates efficient rendering of large collections of primitives
 * with dynamic updates and performance optimization.
 *
 * Run: npx tsx cosyne/demos/collections-demo.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, CosyneContext, enableEventHandling, refreshAllCosyneContexts } from 'cosyne';

const WIDTH = 600;
const HEIGHT = 500;

interface DemoState {
  particleCount: number;
  animating: boolean;
  time: number;
}

function createCollectionsDemo(a: App): void {
  const state: DemoState = {
    particleCount: 50,
    animating: true,
    time: 0,
  };

  let animationFrame: any = null;

  a.window(
    { title: 'Collections Demo', width: WIDTH + 40, height: HEIGHT + 180 },
    (win: any) => {
      win.setContent(() => {
        a.vbox(() => {
          a.label(`Rendering ${state.particleCount} Primitives in Collection`);

          a.hbox(() => {
            a.label('Particle Count:');
            a.slider(10, 200, state.particleCount, (val: number) => {
              state.particleCount = Math.floor(val);
              refreshAllCosyneContexts();
            });
          });

          a.checkbox('Animate', (checked: boolean) => {
            state.animating = checked;
            if (state.animating) {
              const animate = () => {
                state.time += 0.02;
                refreshAllCosyneContexts();
                animationFrame = setTimeout(animate, 16);
              };
              animate();
            } else {
              if (animationFrame) clearTimeout(animationFrame);
            }
          }).setChecked(state.animating);

          a.max(() => {
            const chart = cosyne(a, (ctx: CosyneContext) => {
              ctx.rectangle({
                size: [WIDTH, HEIGHT],
                position: [0, 0],
              })
                .setFill('#f0f0f0');

              // Draw collection of circles
              for (let i = 0; i < state.particleCount; i++) {
                const angle = (i / state.particleCount) * Math.PI * 2 + state.time;
                const distance = 50 + 80 * Math.sin(state.time + i * 0.1);
                const x = WIDTH / 2 + Math.cos(angle) * distance;
                const y = HEIGHT / 2 + Math.sin(angle) * distance;

                const hue = ((i / state.particleCount) * 360 + state.time * 50) % 360;
                const color = `hsl(${hue}, 80%, 50%)`;

                ctx.circle({ center: [x, y], radius: 4 })
                  .setFill(color)
                  .withId(`particle-${i}`);
              }
            });

            enableEventHandling(chart);
          });

          a.label(`Efficiently rendering ${state.particleCount} primitives`);
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
    { title: 'Collections Demo' },
    createCollectionsDemo
  );
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
