#!/usr/bin/env npx tsx
/**
 * Cosyne 3D Demo: 3D Clock
 *
 * Demonstrates:
 * - Continuous animation loops
 * - Time-based rotation bindings
 * - Hierarchy and camera controls
 */

import { app, resolveTransport } from '../../core/src/index';
import { cosyne3d, refreshAllCosyne3dContexts } from '../../cosyne/src/index3d';

// Observable Time Store
const timeState = {
  now: new Date()
};

// Camera State for Orbiting
const cameraState = {
  radius: 20,  // Distance from clock
  theta: Math.PI / 2,  // Looking from +Z direction
  phi: Math.PI / 2,    // At equator level
  lookAt: [0, 0, 0] as [number, number, number],
};

export function buildClockApp(a: any) {
  a.window({ title: '3D Clock', width: 600, height: 600 }, (win: any) => {

    const scene = cosyne3d(a, (ctx) => {
      // Bind camera position
      ctx.setCamera({ fov: 45, lookAt: cameraState.lookAt })
         .bindPosition(() => {
            const x = cameraState.radius * Math.sin(cameraState.phi) * Math.cos(cameraState.theta);
            const z = cameraState.radius * Math.sin(cameraState.phi) * Math.sin(cameraState.theta);
            const y = cameraState.radius * Math.cos(cameraState.phi);
            return [x, y, z];
         });

      // Lighting
      ctx.light({ type: 'ambient', intensity: 0.4 });
      ctx.light({ type: 'directional', direction: [-0.5, -0.5, -1], intensity: 0.8 });

      // Clock Face - wireframe circle (edge only)
      // Draw a ring using thin boxes as line segments
      const clockRadius = 5;
      const ringSegments = 64;
      const lineThickness = 0.05;
      for (let i = 0; i < ringSegments; i++) {
        const angle1 = (i / ringSegments) * Math.PI * 2;
        const angle2 = ((i + 1) / ringSegments) * Math.PI * 2;
        const midAngle = (angle1 + angle2) / 2;

        // Midpoint of segment
        const mx = Math.sin(midAngle) * clockRadius;
        const my = Math.cos(midAngle) * clockRadius;

        // Length of segment (arc approximation)
        const segmentLength = 2 * clockRadius * Math.sin(Math.PI / ringSegments);

        ctx.box({
          size: [lineThickness, segmentLength, lineThickness],
          position: [mx, my, 0.1],
          rotation: [0, 0, -midAngle],  // Rotate to align tangent to circle
        }).setMaterial({ color: '#444444' });
      }

      // Hour Markers (12 boxes)
      for (let i = 0; i < 12; i++) {
         const angle = (i / 12) * Math.PI * 2;
         // 12 o'clock is at Y+, so we use standard sin/cos but swapped/negated?
         // angle 0 = 12 o'clock.
         // x = sin(angle), y = cos(angle). 
         const x = Math.sin(angle) * 4.5;
         const y = Math.cos(angle) * 4.5;
         
         // Markers at z=0.2 (slightly above face)
         ctx.box({ 
             size: [0.2, 0.5, 0.1], 
             position: [x, y, 0.2]
         })
         .setRotation([0, 0, -angle])
         .setMaterial({ color: '#333333' });
      }

      // Center Pin
      ctx.cylinder({ 
          radius: 0.2, 
          height: 0.6, 
          position: [0, 0, 0.3], // Center, sticking out in Z
          rotation: [Math.PI/2, 0, 0]
      }).setMaterial({ color: '#333333' });

      // Hand helper - creates a box that rotates around origin
      const createHand = (width: number, length: number, z: number, color: string, getAngle: () => number) => {
          // The hand pivots at origin. We position the box center at (0, length/2, z)
          // so its base is at the origin, and bind its rotation.
          ctx.box({
              size: [width, length, 0.1]
          })
          .setMaterial({ color })
          // Bind position: hand center is at (0, length/2, z) but rotated around Z
          .bindPosition(() => {
              const angle = getAngle();
              // Hand center offset from origin (before rotation)
              const cx = 0;
              const cy = length / 2;
              // Rotate around Z axis (negative because clockwise)
              const rotatedX = cx * Math.cos(-angle) - cy * Math.sin(-angle);
              const rotatedY = cx * Math.sin(-angle) + cy * Math.cos(-angle);
              return [rotatedX, rotatedY, z];
          })
          // Bind rotation around Z axis
          .bindRotation(() => {
              const angle = getAngle();
              return [0, 0, -angle];
          });
      };

      // Hour Hand
      createHand(0.3, 3, 0.3, '#333333', () => {
          const hrs = timeState.now.getHours() % 12;
          const mins = timeState.now.getMinutes();
          // Fraction of 12 hours
          return ((hrs + mins/60) / 12) * Math.PI * 2;
      });

      // Minute Hand
      createHand(0.2, 4.5, 0.4, '#666666', () => {
          const mins = timeState.now.getMinutes();
          const secs = timeState.now.getSeconds();
          // Fraction of 60 mins
          return ((mins + secs/60) / 60) * Math.PI * 2;
      });

      // Second Hand
      createHand(0.1, 4.8, 0.5, '#cc0000', () => {
          const secs = timeState.now.getSeconds();
          const ms = timeState.now.getMilliseconds();
          // Fraction of 60 seconds (smooth)
          return ((secs + ms/1000) / 60) * Math.PI * 2;
      });

    }, {
      width: 600,
      height: 600,
      backgroundColor: '#b8d4e8',  // Pastel blue
    });

    // Refresh bindings and re-render
    const refreshAndRender = () => {
      refreshAllCosyne3dContexts();
      win.setContent(renderContent);
    };

    // Content builder
    const renderContent = () => {
      a.max(() => {
        a.canvasStack(() => scene.render(a));

        // Transparent overlay for mouse events
        a.tappableCanvasRaster(600, 600, {
            onDrag: (x: any, y: any, deltaX: any, deltaY: any) => {
              const sensitivity = 0.01;
              cameraState.theta -= deltaX * sensitivity;
              cameraState.phi -= deltaY * sensitivity;

              const epsilon = 0.1;
              cameraState.phi = Math.max(epsilon, Math.min(Math.PI - epsilon, cameraState.phi));

              refreshAndRender();
            },
            onScroll: (dx: any, dy: any) => {
              const zoomSpeed = 0.05;
              const factor = 1 + (dy > 0 ? 1 : -1) * zoomSpeed;
              cameraState.radius *= factor;
              cameraState.radius = Math.max(2, Math.min(100, cameraState.radius));

              refreshAndRender();
            }
        }).setPixelBuffer(new Uint8Array(600 * 600 * 4));
      });
    };

    // Initial render
    win.setContent(renderContent);
    win.show();

    // Animation loop (smooth second hand)
    let animationInterval: ReturnType<typeof setInterval> | undefined;
    animationInterval = setInterval(() => {
      timeState.now = new Date();
      refreshAndRender();
    }, 50); // ~20 FPS is enough for smooth second hand

    // Clean up interval when window closes
    win.setCloseIntercept(async () => {
      if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = undefined;
      }
      return true; // Allow close
    });
  });
}

if (require.main === module) {
  app(resolveTransport(), { title: '3D Clock' }, buildClockApp);
}
