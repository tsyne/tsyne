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
 *
 * @tsyne-app:name Lighting Lab
 * @tsyne-app:icon color
 * @tsyne-app:category Demos
 * @tsyne-app:args (a: App) => void
 */

import { app, resolveTransport } from '../core/src/index';
import { cosyne3d, refreshAllCosyne3dContexts } from '../cosyne/src/index3d';
import { Materials } from '../cosyne/src/material';
import { PointLight } from '../cosyne/src/light';

// Lab state
const labState = {
  material: 'gold' as 'gold' | 'plastic' | 'matte',
  lightColor: '#ffffff',
  lightOrbitSpeed: 0.02,
  lightAngle: 0,
  lightHeight: 5,
  lightOrbitRadius: 8,
};

// Camera state
const cameraState = {
  radius: 20,
  theta: Math.PI / 4, // Azimuth
  phi: Math.PI / 3, // Elevation (angle from Y axis)
  lookAt: [0, 0, 0] as [number, number, number],
};

// Helper to get light position
function getLightPosition(): [number, number, number] {
  return [
    Math.sin(labState.lightAngle) * labState.lightOrbitRadius,
    labState.lightHeight,
    Math.cos(labState.lightAngle) * labState.lightOrbitRadius,
  ];
}

// Helper to get material based on state
function getMaterialProperties() {
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

export function buildLightingLabApp(a: any) {
  a.window({ title: 'Lighting Lab', width: 900, height: 650 }, (win: any) => {
    // Keep reference to the point light for updating
    let pointLight: PointLight | null = null;

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
      width: 650,
      height: 550,
      backgroundColor: '#0a0a12',
    });

    // Refresh and render function
    const refreshAndRender = () => {
      // Update point light position and color
      if (pointLight) {
        const pos = getLightPosition();
        pointLight.setPosition(pos[0], pos[1], pos[2]);
        pointLight.color = labState.lightColor;
      }
      refreshAllCosyne3dContexts();
      win.setContent(renderContent);
    };

    // Content builder
    const renderContent = () => {
      a.hbox(() => {
        // Main 3D view
        a.max(() => {
          a.canvasStack(() => {
            scene.render(a);
          });

          // Transparent overlay for mouse events
          a.tappableCanvasRaster(650, 550, {
            onDrag: (x: any, y: any, deltaX: any, deltaY: any) => {
              // Orbit controls
              const sensitivity = 0.01;
              cameraState.theta -= deltaX * sensitivity;
              cameraState.phi -= deltaY * sensitivity;

              // Clamp phi to avoid flipping
              const epsilon = 0.1;
              cameraState.phi = Math.max(epsilon, Math.min(Math.PI - epsilon, cameraState.phi));

              refreshAndRender();
            },
            onScroll: (dx: any, dy: any) => {
              // Zoom controls
              const zoomSpeed = 0.05;
              const factor = 1 + (dy > 0 ? 1 : -1) * zoomSpeed;

              cameraState.radius *= factor;
              cameraState.radius = Math.max(5, Math.min(50, cameraState.radius));

              refreshAndRender();
            }
          }).setPixelBuffer(new Uint8Array(650 * 550 * 4));
        });

        // Control sidebar
        a.vbox(() => {
          a.label('Lighting Lab').withId('title');
          a.separator();

          // Material selection
          a.label('Material:');
          a.button('Gold').onClick(() => {
            labState.material = 'gold';
            refreshAndRender();
          }).withId('btn-gold');
          a.button('Plastic').onClick(() => {
            labState.material = 'plastic';
            refreshAndRender();
          }).withId('btn-plastic');
          a.button('Matte').onClick(() => {
            labState.material = 'matte';
            refreshAndRender();
          }).withId('btn-matte');

          a.separator();

          // Light color selection
          a.label('Light Color:');
          a.button('White').onClick(() => {
            labState.lightColor = '#ffffff';
            refreshAndRender();
          }).withId('btn-white');
          a.button('Warm').onClick(() => {
            labState.lightColor = '#ffcc77';
            refreshAndRender();
          }).withId('btn-warm');
          a.button('Cool').onClick(() => {
            labState.lightColor = '#77aaff';
            refreshAndRender();
          }).withId('btn-cool');
          a.button('Red').onClick(() => {
            labState.lightColor = '#ff4444';
            refreshAndRender();
          }).withId('btn-red');
          a.button('Green').onClick(() => {
            labState.lightColor = '#44ff44';
            refreshAndRender();
          }).withId('btn-green');
          a.button('Blue').onClick(() => {
            labState.lightColor = '#4444ff';
            refreshAndRender();
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
            a.button('Low').onClick(() => {
              labState.lightHeight = 3;
              refreshAndRender();
            }).withId('btn-low');
            a.button('Mid').onClick(() => {
              labState.lightHeight = 5;
              refreshAndRender();
            }).withId('btn-mid');
            a.button('High').onClick(() => {
              labState.lightHeight = 8;
              refreshAndRender();
            }).withId('btn-high');
          });

          a.separator();

          // Reset button
          a.button('Reset Camera').onClick(() => {
            cameraState.radius = 20;
            cameraState.theta = Math.PI / 4;
            cameraState.phi = Math.PI / 3;
            refreshAndRender();
          }).withId('btn-reset');

          a.spacer();

          a.label('Drag: Rotate view');
          a.label('Scroll: Zoom');
        });
      });
    };

    // Initial render
    refreshAndRender();
    win.show();

    // Animation loop for orbiting light
    let running = true;
    const animate = async () => {
      if (!running) return;

      // Update light angle
      labState.lightAngle += labState.lightOrbitSpeed;

      // Update light position
      if (pointLight) {
        const pos = getLightPosition();
        pointLight.setPosition(pos[0], pos[1], pos[2]);
      }

      // Refresh and render
      refreshAllCosyne3dContexts();
      try {
        await win.setContent(renderContent);
      } catch (err) {
        // Window closed, stop animation
        running = false;
        return;
      }

      setTimeout(animate, 32); // ~30fps
    };

    // Start animation after a short delay
    setTimeout(animate, 100);
  });
}

if (require.main === module) {
  app(resolveTransport(), { title: 'Cosyne 3D - Lighting Lab' }, buildLightingLabApp);
}
