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

    win.setContent(() => {
      a.vbox(() => {
        a.canvas(800, 500, () => {
          // Placeholder for 3D rendering
          a.canvasRect({ x: 0, y: 0, width: 800, height: 500, color: '#1a1a2e' });
          a.canvasText({
            x: 400,
            y: 250,
            text: 'Interactive Cubes Demo (3D rendering requires Go bridge)',
            color: '#ffffff',
            align: 'center',
          });
        });

        a.separator();

        // Status bar
        a.hbox(() => {
          a.label(selectedCube
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
          });
        });
      });
    });
  });
});
