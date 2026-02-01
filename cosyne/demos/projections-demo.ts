#!/usr/bin/env npx tsx
/**
 * Projections Demo
 *
 * Demonstrates 2D-to-3D projection systems including isometric,
 * spherical, and perspective projections.
 *
 * Run: npx tsx cosyne/demos/projections-demo.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, CosyneContext, enableEventHandling, refreshAllCosyneContexts } from 'cosyne';

const WIDTH = 600;
const HEIGHT = 500;

interface DemoState {
  projectionType: 'isometric' | 'spherical' | 'perspective';
  rotation: number;
}

function createProjectionsDemo(a: App): void {
  const state: DemoState = {
    projectionType: 'isometric',
    rotation: 0,
  };

  function isometricProject(x: number, y: number, z: number): [number, number] {
    const angle = Math.PI / 6; // 30 degrees
    const px = (x - y) * Math.cos(angle);
    const py = z + (x + y) * Math.sin(angle);
    return [WIDTH / 2 + px, HEIGHT / 2 - py];
  }

  function sphericalProject(x: number, y: number, z: number): [number, number] {
    const r = Math.sqrt(x * x + y * y + z * z);
    const theta = Math.atan2(y, x) + state.rotation;
    const phi = Math.acos(z / r);

    const u = theta / Math.PI;
    const v = phi / Math.PI;

    return [WIDTH / 2 + u * 150, HEIGHT / 2 + v * 150];
  }

  function perspectiveProject(x: number, y: number, z: number): [number, number] {
    const distance = 500;
    const scale = distance / (distance + z * 50);
    return [
      WIDTH / 2 + x * scale * 100,
      HEIGHT / 2 + y * scale * 100,
    ];
  }

  let animationFrame: any = null;

  a.window(
    { title: 'Projections Demo', width: WIDTH + 40, height: HEIGHT + 200 },
    (win: any) => {
      win.setContent(() => {
        a.vbox(() => {
          a.label('2D-to-3D Projection Systems');

          a.hbox(() => {
            a.label('Projection:');
            a.button('Isometric').onClick(() => {
              state.projectionType = 'isometric';
              refreshAllCosyneContexts();
            });
            a.button('Spherical').onClick(() => {
              state.projectionType = 'spherical';
              refreshAllCosyneContexts();
            });
            a.button('Perspective').onClick(() => {
              state.projectionType = 'perspective';
              refreshAllCosyneContexts();
            });
          });

          a.checkbox('Animate', (checked: boolean) => {
            if (checked) {
              const animate = () => {
                state.rotation += 0.02;
                refreshAllCosyneContexts();
                animationFrame = setTimeout(animate, 16);
              };
              animate();
            } else {
              if (animationFrame) clearTimeout(animationFrame);
            }
          });

          a.max(() => {
            const chart = cosyne(a, (ctx: CosyneContext) => {
              ctx.rectangle({
                size: [WIDTH, HEIGHT],
                position: [0, 0],
              })
                .setFill('#f5f5f5');

              const project = {
                isometric: isometricProject,
                spherical: sphericalProject,
                perspective: perspectiveProject,
              }[state.projectionType];

              // Draw cube
              const vertices: [number, number, number][] = [
                [-1, -1, -1],
                [1, -1, -1],
                [1, 1, -1],
                [-1, 1, -1],
                [-1, -1, 1],
                [1, -1, 1],
                [1, 1, 1],
                [-1, 1, 1],
              ];

              const edges: [number, number][] = [
                [0, 1],
                [1, 2],
                [2, 3],
                [3, 0],
                [4, 5],
                [5, 6],
                [6, 7],
                [7, 4],
                [0, 4],
                [1, 5],
                [2, 6],
                [3, 7],
              ];

              // Draw edges
              edges.forEach((edge, idx) => {
                const [v1, v2] = edge;
                const [x1, y1, z1] = vertices[v1];
                const [x2, y2, z2] = vertices[v2];
                const [px1, py1] = project(x1, y1, z1);
                const [px2, py2] = project(x2, y2, z2);

                ctx.line([px1, py1], [px2, py2])
                  .setStroke('#333', 2)
                  .withId(`edge-${idx}`);
              });

              // Draw vertices
              vertices.forEach((v, idx) => {
                const [px, py] = project(v[0], v[1], v[2]);
                ctx.circle({ center: [px, py], radius: 4 })
                  .setFill('#ff6b6b')
                  .withId(`vertex-${idx}`);
              });

              ctx.text(state.projectionType.charAt(0).toUpperCase() + state.projectionType.slice(1), {
                x: WIDTH / 2,
                y: HEIGHT - 20,
                textAlign: 'center',
                fontSize: 14,
                fill: '#666',
              });
            });

            enableEventHandling(chart);
          });
        });
      });

      win.setCloseIntercept(async () => {
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
    { title: 'Projections Demo' },
    createProjectionsDemo
  );
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
