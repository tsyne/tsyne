#!/usr/bin/env npx tsx
/**
 * Cosyne 3D Demo: Solar System
 *
 * Demonstrates:
 * - Multiple spheres with different sizes
 * - Bindings for orbital animation
 * - Materials with different colors
 * - Lighting
 */

import { app, resolveTransport } from '../core/src/index';
import { cosyne3d, refreshAllCosyne3dContexts } from '../cosyne/src/index3d';

// Planet data
interface Planet {
  name: string;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number; // radians per frame
  color: string;
}

const planets: Planet[] = [
  { name: 'Mercury', radius: 0.3, orbitRadius: 4, orbitSpeed: 0.04, color: '#8c8c8c' },
  { name: 'Venus', radius: 0.5, orbitRadius: 6, orbitSpeed: 0.03, color: '#e6c35c' },
  { name: 'Earth', radius: 0.5, orbitRadius: 8, orbitSpeed: 0.02, color: '#6b93d6' },
  { name: 'Mars', radius: 0.4, orbitRadius: 10, orbitSpeed: 0.015, color: '#c1440e' },
  { name: 'Jupiter', radius: 1.2, orbitRadius: 14, orbitSpeed: 0.008, color: '#d8ca9d' },
  { name: 'Saturn', radius: 1.0, orbitRadius: 18, orbitSpeed: 0.006, color: '#f4d59e' },
];

// Animation state
let time = 0;

// Camera state
const cameraState = {
  radius: 36.05, // sqrt(20^2 + 30^2)
  theta: Math.PI / 2,
  phi: Math.acos(20 / 36.05),
  lookAt: [0, 0, 0] as [number, number, number],
};

app(resolveTransport(), { title: 'Cosyne 3D - Solar System' }, (a) => {
  a.window({ title: 'Solar System', width: 800, height: 600 }, (win) => {
    // Helper to update camera position based on spherical coordinates
    const updateCamera = (ctx: any) => {
      const x = cameraState.radius * Math.sin(cameraState.phi) * Math.cos(cameraState.theta);
      const z = cameraState.radius * Math.sin(cameraState.phi) * Math.sin(cameraState.theta);
      const y = cameraState.radius * Math.cos(cameraState.phi);
      
      ctx.setCamera({
        fov: 60,
        position: [x, y, z],
        lookAt: cameraState.lookAt,
      });
    };

    // Create the 3D context
    const scene = cosyne3d(a, (ctx) => {
      updateCamera(ctx);

      // Add lights
      ctx.light({ type: 'ambient', intensity: 0.3 });
      ctx.light({ type: 'point', position: [0, 0, 0], intensity: 1.5, color: '#ffff00' });

      // Create the Sun
      ctx.sphere({
        radius: 2,
        position: [0, 0, 0],
        material: {
          color: '#ffdd00',
          emissive: '#ffaa00',
          shininess: 0,
        },
      }).withId('sun');

      // Create planets with orbital bindings
      for (const planet of planets) {
        ctx.sphere({
          radius: planet.radius,
          material: { color: planet.color, shininess: 30 },
        })
          .withId(planet.name)
          .bindPosition(() => {
            const angle = time * planet.orbitSpeed;
            return [
              Math.cos(angle) * planet.orbitRadius,
              0,
              Math.sin(angle) * planet.orbitRadius,
            ] as [number, number, number];
          });
      }
    }, {
      width: 800,
      height: 600,
      backgroundColor: '#000011',
    });

    // Refresh bindings before first render to set initial planet positions
    refreshAllCosyne3dContexts();

    const renderContent = () => {
      a.max(() => {
        a.canvasStack(() => {
          // Update camera before rendering
          updateCamera(scene);
          scene.render(a);
        });

        // Transparent overlay for camera controls
        a.tappableCanvasRaster(800, 600, {
          onDrag: (x, y, deltaX, deltaY) => {
            const sensitivity = 0.01;
            cameraState.theta -= deltaX * sensitivity;
            cameraState.phi -= deltaY * sensitivity;
            const epsilon = 0.1;
            cameraState.phi = Math.max(epsilon, Math.min(Math.PI - epsilon, cameraState.phi));
            // No need to call refreshAndRender because the animation loop handles it
          },
          onScroll: (dx, dy) => {
            const zoomSpeed = 0.05;
            const factor = 1 + (dy > 0 ? 1 : -1) * zoomSpeed;
            cameraState.radius *= factor;
            cameraState.radius = Math.max(2, Math.min(100, cameraState.radius));
          }
        }).setPixelBuffer(new Uint8Array(800 * 600 * 4));
      });
    };

    win.setContent(renderContent);
    win.show();

    // Animation loop - rebuild content each frame
    let running = true;
    const animate = async () => {
      if (!running) return;
      time += 1;
      refreshAllCosyne3dContexts();
      try {
        await win.setContent(renderContent);
      } catch (err) {
        // Window closed, stop animation
        running = false;
        return;
      }
      setTimeout(animate, 32); // ~30fps to reduce bridge load
    };

    // Start animation after a short delay to ensure window is ready
    setTimeout(animate, 100);
  });
});
