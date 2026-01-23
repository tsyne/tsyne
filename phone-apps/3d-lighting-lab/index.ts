#!/usr/bin/env npx tsx
/**
 * Cosyne 3D Demo: Lighting Lab
 *
 * Demonstrates:
 * - Multiple light types (Ambient, Point)
 * - Material properties (shininess, color, emissive)
 * - Dynamic light animation (orbiting point light)
 * - Material switching (gold, plastic, matte)
 * - Interactive camera controls
 * - High-performance buffer rendering
 *
 * @tsyne-app:name Lighting Lab
 * @tsyne-app:icon color
 * @tsyne-app:category Demos
 * @tsyne-app:args app,windowWidth,windowHeight
 */

import { app, resolveTransport } from 'tsyne';
import { cosyne3d, refreshAllCosyne3dContexts, renderer3d, createRenderTarget, RenderTarget } from '../../cosyne/src/index3d';
import { Materials } from '../../cosyne/src/material';
import { PointLight } from '../../cosyne/src/light';

// Lab state
export const labState = {
  material: 'gold' as 'gold' | 'plastic' | 'matte',
  lightColor: '#ffffff',
  lightOrbitSpeed: 0.02,
  lightAngle: 0,
  lightHeight: 5,
  lightOrbitRadius: 8,
};

// Camera state
export const cameraState = {
  radius: 20,
  theta: Math.PI / 4, // Azimuth
  phi: Math.PI / 3, // Elevation (angle from Y axis)
  lookAt: [0, 0, 0] as [number, number, number],
};

// Helper to get light position
export function getLightPosition(): [number, number, number] {
  return [
    Math.sin(labState.lightAngle) * labState.lightOrbitRadius,
    labState.lightHeight,
    Math.cos(labState.lightAngle) * labState.lightOrbitRadius,
  ];
}

// Helper to get material based on state
export function getMaterialProperties() {
  switch (labState.material) {
    case 'gold':
      return Materials.gold().toProperties();
    case 'plastic':
      return Materials.redPlastic().toProperties();
    case 'matte':
      return Materials.matte('#888888').toProperties();
    default:
      return Materials.gold().toProperties();
  }
}

// Reset state to defaults (useful for testing)
export function resetLabState() {
  labState.material = 'gold';
  labState.lightColor = '#ffffff';
  labState.lightOrbitSpeed = 0.02;
  labState.lightAngle = 0;
  labState.lightHeight = 5;
  labState.lightOrbitRadius = 8;

  cameraState.radius = 20;
  cameraState.theta = Math.PI / 4;
  cameraState.phi = Math.PI / 3;
  cameraState.lookAt = [0, 0, 0];
}

export function buildLightingLabApp(a: any) {
  a.window({ title: 'Lighting Lab', width: 900, height: 650 }, (win: any) => {
    const WIDTH = 650;
    const HEIGHT = 550;

    // Create reusable render target for performance
    const renderTarget: RenderTarget = createRenderTarget(WIDTH, HEIGHT);

    // Keep reference to the point light for updating
    let pointLight: PointLight | null = null;

    // Canvas reference for animation updates
    let canvas: any = null;

    // Create the 3D scene
    const scene = cosyne3d(a, (ctx) => {
      // Configure camera with binding
      ctx.setCamera({
        fov: 60,
        lookAt: cameraState.lookAt,
      }).bindPosition(() => {
        const x = cameraState.radius * Math.sin(cameraState.phi) * Math.cos(cameraState.theta);
        const z = cameraState.radius * Math.sin(cameraState.phi) * Math.sin(cameraState.theta);
        const y = cameraState.radius * Math.cos(cameraState.phi);
        return [x, y, z];
      });

      // 1. Ambient light (low intensity base illumination)
      ctx.light({ type: 'ambient', intensity: 0.25 });

      // 2. Orbiting Point Light (the main light source)
      const light = ctx.light({
        type: 'point',
        position: getLightPosition(),
        intensity: 1.2,
        color: labState.lightColor,
        decay: 1.5,
      });
      pointLight = light as PointLight;

      // 3. Visual marker for the point light (emissive sphere)
      ctx.sphere({
        radius: 0.3,
        position: getLightPosition(),
      })
        .withId('light-marker')
        .bindPosition(() => getLightPosition())
        .setMaterial({
          emissive: labState.lightColor,
          emissiveIntensity: 1.0,
          color: '#222222',
          unlit: true,
        });

      // 4. Central Subject Sphere (shows material and lighting effects)
      ctx.sphere({
        radius: 2,
        position: [0, 2, 0],
      })
        .withId('subject')
        .bindMaterial(() => getMaterialProperties());

      // 5. Ground Plane (to see lighting falloff and give context)
      ctx.plane({
        size: 20,
        position: [0, 0, 0],
        material: { color: '#333344', shininess: 0.3 },
      }).withId('ground');

      // 6. Secondary smaller spheres to show material variety
      ctx.sphere({
        radius: 0.8,
        position: [-4, 0.8, -2],
        material: Materials.silver().toProperties(),
      }).withId('sphere-silver');

      ctx.sphere({
        radius: 0.8,
        position: [4, 0.8, -2],
        material: Materials.bluePlastic().toProperties(),
      }).withId('sphere-plastic');

      ctx.sphere({
        radius: 0.8,
        position: [0, 0.8, -4],
        material: Materials.matte('#664422').toProperties(),
      }).withId('sphere-matte');

    }, {
      width: WIDTH,
      height: HEIGHT,
      backgroundColor: '#0a0a12',
    });

    // Render frame to buffer and update canvas (no widget rebuild!)
    const renderFrame = async () => {
      if (!canvas) return;

      // Update point light position and color
      if (pointLight) {
        const pos = getLightPosition();
        pointLight.setPosition(pos[0], pos[1], pos[2]);
        pointLight.color = labState.lightColor;
      }

      // Update bindings
      scene.refreshBindings();

      // Render to pixel buffer (reusing render target)
      const pixels = renderer3d.renderToBuffer(scene, renderTarget);

      // Update existing canvas (no new widgets created)
      await canvas.setPixelBuffer(pixels);
    };

    // Build content ONCE (not on every frame)
    win.setContent(() => {
      a.hbox(() => {
        // Main 3D view
        a.max(() => {
          // Single TappableCanvasRaster - reused for all frames
          canvas = a.tappableCanvasRaster(WIDTH, HEIGHT, {
            onDrag: async (x: any, y: any, deltaX: any, deltaY: any) => {
              // Orbit controls
              const sensitivity = 0.01;
              cameraState.theta -= deltaX * sensitivity;
              cameraState.phi -= deltaY * sensitivity;

              // Clamp phi to avoid flipping
              const epsilon = 0.1;
              cameraState.phi = Math.max(epsilon, Math.min(Math.PI - epsilon, cameraState.phi));

              await renderFrame();
            },
            onScroll: async (dx: any, dy: any) => {
              // Zoom controls
              const zoomSpeed = 0.05;
              const factor = 1 + (dy > 0 ? 1 : -1) * zoomSpeed;

              cameraState.radius *= factor;
              cameraState.radius = Math.max(5, Math.min(50, cameraState.radius));

              await renderFrame();
            }
          });
        });

        // Control sidebar
        a.vbox(() => {
          a.label('Lighting Lab').withId('title');
          a.separator();

          // Material selection
          a.label('Material:');
          a.button('Gold').onClick(async () => {
            labState.material = 'gold';
            await renderFrame();
          }).withId('btn-gold');
          a.button('Plastic').onClick(async () => {
            labState.material = 'plastic';
            await renderFrame();
          }).withId('btn-plastic');
          a.button('Matte').onClick(async () => {
            labState.material = 'matte';
            await renderFrame();
          }).withId('btn-matte');

          a.separator();

          // Light color selection
          a.label('Light Color:');
          a.button('White').onClick(async () => {
            labState.lightColor = '#ffffff';
            await renderFrame();
          }).withId('btn-white');
          a.button('Warm').onClick(async () => {
            labState.lightColor = '#ffcc77';
            await renderFrame();
          }).withId('btn-warm');
          a.button('Cool').onClick(async () => {
            labState.lightColor = '#77aaff';
            await renderFrame();
          }).withId('btn-cool');
          a.button('Red').onClick(async () => {
            labState.lightColor = '#ff4444';
            await renderFrame();
          }).withId('btn-red');
          a.button('Green').onClick(async () => {
            labState.lightColor = '#44ff44';
            await renderFrame();
          }).withId('btn-green');
          a.button('Blue').onClick(async () => {
            labState.lightColor = '#4444ff';
            await renderFrame();
          }).withId('btn-blue');

          a.separator();

          // Light animation controls
          a.label('Animation:');
          a.hbox(() => {
            a.button('Slow').onClick(() => {
              labState.lightOrbitSpeed = 0.01;
            }).withId('btn-slow');
            a.button('Fast').onClick(() => {
              labState.lightOrbitSpeed = 0.04;
            }).withId('btn-fast');
            a.button('Stop').onClick(() => {
              labState.lightOrbitSpeed = 0;
            }).withId('btn-stop');
          });

          a.separator();

          // Light height control
          a.label('Light Height:');
          a.hbox(() => {
            a.button('Low').onClick(async () => {
              labState.lightHeight = 3;
              await renderFrame();
            }).withId('btn-low');
            a.button('Mid').onClick(async () => {
              labState.lightHeight = 5;
              await renderFrame();
            }).withId('btn-mid');
            a.button('High').onClick(async () => {
              labState.lightHeight = 8;
              await renderFrame();
            }).withId('btn-high');
          });

          a.separator();

          // Reset button
          a.button('Reset Camera').onClick(async () => {
            cameraState.radius = 20;
            cameraState.theta = Math.PI / 4;
            cameraState.phi = Math.PI / 3;
            await renderFrame();
          }).withId('btn-reset');

          a.spacer();

          a.label('Drag: Rotate view');
          a.label('Scroll: Zoom');
        });
      });
    });

    win.show();

    // Initial render after content is set
    setTimeout(() => renderFrame(), 100);

    // Animation loop for orbiting light - only updates buffer, no widget rebuild
    let animationInterval: ReturnType<typeof setInterval> | undefined;
    animationInterval = setInterval(() => {
      // Update light angle
      labState.lightAngle += labState.lightOrbitSpeed;
      renderFrame();
    }, 32); // ~30fps

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
  app(resolveTransport(), { title: 'Cosyne 3D - Lighting Lab' }, buildLightingLabApp);
}
