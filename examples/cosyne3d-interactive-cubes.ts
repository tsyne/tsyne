#!/usr/bin/env npx tsx
/**
 * Cosyne 3D Demo: Interactive Cubes
 *
 * Demonstrates:
 * - Box primitives with click handlers
 * - Hover effects
 * - Dynamic material changes via bindings
 */

import { app, resolveTransport } from '../core/src/index';
import { cosyne3d, refreshAllCosyne3dContexts } from '../cosyne/src/index3d';

// Cube state
interface CubeState {
  id: string;
  x: number;
  z: number;
  selected: boolean;
  hovered: boolean;
  color: string;
}

const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

// Create a 3x3 grid of cubes
const cubes: CubeState[] = [];
let cubeIndex = 0;
for (let x = -4; x <= 4; x += 4) {
  for (let z = -4; z <= 4; z += 4) {
    cubes.push({
      id: `cube-${cubeIndex}`,
      x,
      z,
      selected: false,
      hovered: false,
      color: colors[cubeIndex % colors.length],
    });
    cubeIndex++;
  }
}

let selectedCube: CubeState | null = null;
let statusText = 'Click a cube to select it';

app(resolveTransport(), { title: 'Cosyne 3D - Interactive Cubes' }, (a) => {
  a.window({ title: 'Interactive Cubes', width: 800, height: 600 }, (win) => {
    // Create the 3D scene
    const scene = cosyne3d(a, (ctx) => {
      ctx.setCamera({
        fov: 60,
        position: [8, 6, 10],
        lookAt: [0, 0, 0],
      });

      ctx.light({ type: 'ambient', intensity: 0.5 });
      ctx.light({ type: 'directional', direction: [-0.5, -1, -0.5], intensity: 0.6 });

      // Create cubes with bindings for reactive state
      for (const cube of cubes) {
        ctx.box({
          size: 2,
          position: [cube.x, 0, cube.z],
        })
          .withId(cube.id)
          .bindMaterial(() => {
            if (cube.selected) {
              return { color: '#ffffff', emissive: cube.color, emissiveIntensity: 0.5 };
            } else if (cube.hovered) {
              const r = parseInt(cube.color.slice(1, 3), 16);
              const g = parseInt(cube.color.slice(3, 5), 16);
              const b = parseInt(cube.color.slice(5, 7), 16);
              // Brighten for hover
              const brighten = (c: number) => Math.min(255, c + 40);
              return {
                color: `#${brighten(r).toString(16).padStart(2,'0')}${brighten(g).toString(16).padStart(2,'0')}${brighten(b).toString(16).padStart(2,'0')}`
              };
            } else {
              return { color: cube.color };
            }
          })
          .bindScale(() => {
            if (cube.selected) return 1.3;
            if (cube.hovered) return 1.1;
            return 1;
          })
          .onClick(() => {
            if (selectedCube === cube) {
              cube.selected = false;
              selectedCube = null;
              statusText = 'Click a cube to select it';
            } else {
              if (selectedCube) selectedCube.selected = false;
              cube.selected = true;
              selectedCube = cube;
              statusText = `Selected: ${cube.id} (${cube.color})`;
            }
            refreshAndRender();
          })
          .onHover((hit) => {
            const wasHovered = cube.hovered;
            cube.hovered = hit !== null;
            if (wasHovered !== cube.hovered) {
              refreshAndRender();
            }
          });
      }
    }, {
      width: 800,
      height: 500,
      backgroundColor: '#1a1a2e',
    });

    // Refresh bindings and re-render content
    const refreshAndRender = () => {
      refreshAllCosyne3dContexts();
      win.setContent(renderContent);
    };

    // Content builder
    const renderContent = () => {
      a.vbox(() => {
        // Control bar at top - outside the max container
        a.hbox(() => {
          a.label(statusText);
          a.spacer();
          a.button('Reset').onClick(() => {
            console.log('Reset button clicked');
            for (const cube of cubes) {
              cube.selected = false;
              cube.hovered = false;
            }
            selectedCube = null;
            statusText = 'Click a cube to select it';
            refreshAndRender();
          });
        });

        a.separator();

        a.max(() => {
          a.canvasStack(() => {
            scene.render(a);
          });

          // Transparent overlay for mouse events
          a.tappableCanvasRaster(800, 500, {
            onTap: async (x, y) => {
              await scene.handleClick(x, y);
            },
            onMouseMove: (x, y) => {
              scene.handleMouseMove(x, y);
            },
          }).setPixelBuffer(new Uint8Array(800 * 500 * 4));
        });
      });
    };

    // Initial render
    refreshAllCosyne3dContexts();
    win.setContent(renderContent);
    win.show();
  });
});
