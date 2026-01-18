#!/usr/bin/env npx tsx
/**
 * Cosyne 3D Demo: Interactive Cubes
 *
 * Demonstrates:
 * - Box primitives with click handlers
 * - Hover effects
 * - Dynamic material changes
 * - Ray casting for hit detection
 */

import { app, resolveTransport } from '../core/src/index';
import {
  cosyne3d,
  refreshAllCosyne3dContexts,
  Materials,
  Box3D,
} from '../cosyne/src/index3d';

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
for (let x = -2; x <= 2; x += 2) {
  for (let z = -2; z <= 2; z += 2) {
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

app(resolveTransport(), { title: 'Cosyne 3D - Interactive Cubes' }, (a) => {
  a.window({ title: 'Interactive Cubes', width: 800, height: 600 }, (win) => {
    const scene = cosyne3d(a, (ctx) => {
      // Camera looking down at the grid
      ctx.setCamera({
        fov: 60,
        position: [0, 8, 8],
        lookAt: [0, 0, 0],
      });

      // Lighting
      ctx.light({ type: 'ambient', intensity: 0.4 });
      ctx.light({ type: 'directional', direction: [-1, -1, -1], intensity: 0.8 });

      // Ground plane
      ctx.plane({
        size: 10,
        position: [0, -0.5, 0],
        material: { color: '#333333', shininess: 10 },
      }).withId('ground');

      // Create cubes with interactivity
      for (const cube of cubes) {
        ctx.box({
          size: 1,
          position: [cube.x, 0.5, cube.z],
        })
          .withId(cube.id)
          .bindMaterial(() => {
            if (cube.selected) {
              return { color: '#ffffff', emissive: cube.color, shininess: 100 };
            } else if (cube.hovered) {
              return { color: cube.color, shininess: 80, opacity: 0.9 };
            } else {
              return { color: cube.color, shininess: 50 };
            }
          })
          .bindScale(() => {
            if (cube.selected) return 1.2;
            if (cube.hovered) return 1.1;
            return 1;
          })
          .onClick((hit) => {
            // Toggle selection
            if (selectedCube === cube) {
              cube.selected = false;
              selectedCube = null;
            } else {
              if (selectedCube) selectedCube.selected = false;
              cube.selected = true;
              selectedCube = cube;
            }
            refreshAllCosyne3dContexts();
          })
          .onHover((hit) => {
            cube.hovered = hit !== null;
            refreshAllCosyne3dContexts();
          });
      }
    }, {
      width: 800,
      height: 600,
      backgroundColor: '#1a1a2e',
    });

    // Status label reference for updates
    let statusLabel: any = null;

    // Create interactive canvas with mouse handling
    const canvasWidth = 800;
    const canvasHeight = 500;

    win.setContent(() => {
      a.vbox(() => {
        // Use max() to contain the canvas stack and tappable raster overlay
        a.max(() => {
          // Background and 3D scene rendering
          a.canvasStack(() => {
            scene.render(a);
          });

          // Transparent overlay for capturing mouse events
          const tappable = a.tappableCanvasRaster(canvasWidth, canvasHeight, {
            onTap: async (x, y) => {
              // Use the scene's click handler
              await scene.handleClick(x, y);
              if (statusLabel) {
                statusLabel.setText(selectedCube
                  ? `Selected: ${selectedCube.id} (${selectedCube.color})`
                  : 'Click a cube to select it');
              }
            },
            onMouseMove: (x, y) => {
              // Use the scene's hover handler
              scene.handleMouseMove(x, y);
            },
          });

          // Make the overlay fully transparent so the scene shows through
          tappable.setPixelBuffer(new Uint8Array(canvasWidth * canvasHeight * 4));
        });

        a.separator();

        // Status bar
        a.hbox(() => {
          statusLabel = a.label(selectedCube
            ? `Selected: ${selectedCube.id} (${selectedCube.color})`
            : 'Click a cube to select it');
          a.spacer();
          a.button('Reset', () => {
            for (const cube of cubes) {
              cube.selected = false;
              cube.hovered = false;
            }
            selectedCube = null;
            refreshAllCosyne3dContexts();
            if (statusLabel) {
              statusLabel.setText('Click a cube to select it');
            }
          });
        });
      });
    });
  });
});
