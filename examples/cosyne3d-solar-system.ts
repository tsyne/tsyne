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

app(resolveTransport(), { title: 'Cosyne 3D - Solar System' }, (a) => {
  a.window({ title: 'Solar System', width: 800, height: 600 }, (win) => {
    // Create the 3D context
    const scene = cosyne3d(a, (ctx) => {
      // Configure camera
      ctx.setCamera({
        fov: 60,
        position: [0, 20, 30],
        lookAt: [0, 0, 0],
      });

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

        // Add orbit ring (using a plane rotated 90 degrees would be ideal,
        // but for simplicity we'll skip this in the demo)
      }
    }, {
      width: 800,
      height: 600,
      backgroundColor: '#000011',
    });

    win.setContent(() => {
      a.canvas(800, 600, () => {
        // The scene would render here via the Go bridge
        // For now, just show a placeholder
        a.canvasRect({ x: 0, y: 0, width: 800, height: 600, color: '#000011' });
        a.canvasText({
          x: 400,
          y: 300,
          text: 'Solar System Demo (3D rendering requires Go bridge)',
          color: '#ffffff',
          align: 'center',
        });
      });
    });

    // Animation loop
    const animate = () => {
      time += 1;
      refreshAllCosyne3dContexts();
      setTimeout(animate, 16); // ~60fps
    };
    animate();
  });
});
