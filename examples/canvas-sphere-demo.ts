#!/usr/bin/env npx tsx
/**
 * Canvas Sphere Demo - Phases 1, 2, 3, & 4
 * Phase 1: Pattern types (solid, checkered, stripes, gradient)
 * Phase 2: Multi-axis rotation (X, Y, Z)
 * Phase 3: Lighting and shading (Lambertian model)
 * Phase 4: Texture mapping (equirectangular)
 */

import { app } from '../core/src/index';
import { resolveTransport } from '../core/src/index';

app(resolveTransport(), { title: 'Canvas Sphere - All Phases' }, (a) => {
  a.window({ title: 'Canvas Sphere Demo - All Phases', width: 900, height: 1600 }, (win) => {
    win.setContent(() => {
      a.scroll(() => {
        a.vbox(() => {
          // Title
          a.label('Canvas Sphere Widget - Phase 1 Patterns');
          a.separator();

          // Intro
          a.label('Canvas Sphere Widget - Generalized 3D Sphere Primitive');
          a.label('Phase 1: Patterns (solid, checkered, stripes, gradient)');
          a.label('Phase 2: Multi-axis rotation (X=tilt, Y=spin, Z=roll)');
          a.separator();

          // Pattern 1: Solid
          a.label('Pattern 1: Solid Color');
          a.label('A single uniform color sphere');
          a.canvasSphere({
            cx: 200,
            cy: 200,
            radius: 80,
            pattern: 'solid',
            solidColor: '#ff6347', // Tomato red
          });
          a.spacer(100);

          // Pattern 2: Checkered (Boing Ball)
          a.label('Pattern 2: Checkered (Amiga Boing Ball)');
          a.label('Classic alternating pattern - 8x8 grid');
          a.canvasSphere({
            cx: 200,
            cy: 200,
            radius: 80,
            pattern: 'checkered',
            latBands: 8,
            lonSegments: 8,
            checkeredColor1: '#cc0000',
            checkeredColor2: '#ffffff',
          });
          a.spacer(100);

          // Pattern 3: Horizontal Stripes
          a.label('Pattern 3: Horizontal Stripes');
          a.label('Color bands parallel to the equator');
          a.canvasSphere({
            cx: 200,
            cy: 200,
            radius: 80,
            pattern: 'stripes',
            stripeColors: ['#ff0000', '#00ff00', '#0000ff'],
            stripeDirection: 'horizontal',
          });
          a.spacer(100);

          // Pattern 4: Vertical Stripes
          a.label('Pattern 4: Vertical Stripes');
          a.label('Color bands parallel to the poles (longitude)');
          a.canvasSphere({
            cx: 200,
            cy: 200,
            radius: 80,
            pattern: 'stripes',
            stripeColors: ['#ff0000', '#ffff00', '#00ff00', '#00ffff'],
            stripeDirection: 'vertical',
          });
          a.spacer(100);

          // Pattern 5: Gradient
          a.label('Pattern 5: Gradient (Pole-to-Pole)');
          a.label(
            'Smooth color interpolation from south pole to north pole'
          );
          a.canvasSphere({
            cx: 200,
            cy: 200,
            radius: 80,
            pattern: 'gradient',
            gradientStart: '#0000ff', // Blue south pole
            gradientEnd: '#ff0000',   // Red north pole
          });
          a.spacer(100);

          // Pattern 6: Temperature Gradient
          a.label('Pattern 6: Gradient Variant (Temperature Scale)');
          a.label('Cold blue to hot red gradient');
          a.canvasSphere({
            cx: 200,
            cy: 200,
            radius: 80,
            pattern: 'gradient',
            gradientStart: '#0000ff', // Cold
            gradientEnd: '#ffff00',   // Hot
          });
          a.spacer(100);

          // Pattern 7: Fine-grain Checkered
          a.label('Pattern 7: Fine-Grain Checkered');
          a.label('More bands for smaller pattern - 16x16 grid');
          a.canvasSphere({
            cx: 200,
            cy: 200,
            radius: 80,
            pattern: 'checkered',
            latBands: 16,
            lonSegments: 16,
            checkeredColor1: '#000000',
            checkeredColor2: '#ffffff',
          });
          a.spacer(100);

          // Pattern 8: Multi-Color Stripes
          a.label('Pattern 8: Rainbow Horizontal Stripes');
          a.label('6-color horizontal stripe pattern');
          a.canvasSphere({
            cx: 200,
            cy: 200,
            radius: 80,
            pattern: 'stripes',
            stripeColors: [
              '#ff0000', // Red
              '#ffff00', // Yellow
              '#00ff00', // Green
              '#00ffff', // Cyan
              '#0000ff', // Blue
              '#ff00ff', // Magenta
            ],
            stripeDirection: 'horizontal',
          });
          a.spacer(100);

          // ==================== PHASE 2: MULTI-AXIS ROTATION ====================
          a.separator();
          a.label('Phase 2: Multi-Axis Rotation');
          a.label('X-axis (tilt), Y-axis (spin), Z-axis (roll)');
          a.separator();

          // Rotation 1: Y-axis (spin)
          a.label('Rotation 1: Y-Axis Rotation');
          a.label('Rotated 45 degrees around vertical axis');
          a.hbox(() => {
            a.canvasSphere({
              cx: 100,
              cy: 100,
              radius: 60,
              pattern: 'checkered',
              latBands: 8,
              lonSegments: 8,
              rotationY: Math.PI / 4,
            });
            a.spacer(30);
            a.canvasSphere({
              cx: 100,
              cy: 100,
              radius: 60,
              pattern: 'stripes',
              stripeColors: ['#ff0000', '#ffff00', '#00ff00'],
              rotationY: -Math.PI / 6,
            });
          });
          a.spacer(100);

          // Rotation 2: X-axis (tilt)
          a.label('Rotation 2: X-Axis Rotation');
          a.label('Tilted forward 30 degrees (left) and backward 45 degrees (right)');
          a.hbox(() => {
            a.canvasSphere({
              cx: 100,
              cy: 100,
              radius: 60,
              pattern: 'gradient',
              gradientStart: '#0000ff',
              gradientEnd: '#ff0000',
              rotationX: Math.PI / 6,
            });
            a.spacer(30);
            a.canvasSphere({
              cx: 100,
              cy: 100,
              radius: 60,
              pattern: 'solid',
              solidColor: '#00ff00',
              rotationX: -Math.PI / 4,
            });
          });
          a.spacer(100);

          // Rotation 3: Z-axis (roll)
          a.label('Rotation 3: Z-Axis Rotation');
          a.label('Rolled 60 degrees clockwise (left) and 30 degrees counter-clockwise (right)');
          a.hbox(() => {
            a.canvasSphere({
              cx: 100,
              cy: 100,
              radius: 60,
              pattern: 'stripes',
              stripeColors: ['#ff00ff', '#00ffff'],
              stripeDirection: 'vertical',
              rotationZ: Math.PI / 3,
            });
            a.spacer(30);
            a.canvasSphere({
              cx: 100,
              cy: 100,
              radius: 60,
              pattern: 'checkered',
              latBands: 8,
              lonSegments: 8,
              checkeredColor1: '#ffaa00',
              checkeredColor2: '#0066ff',
              rotationZ: -Math.PI / 6,
            });
          });
          a.spacer(100);

          // Rotation 4: Combined 3D rotation (tumbling)
          a.label('Rotation 4: Combined 3D Rotation');
          a.label('All three axes rotated - arbitrary 3D orientation');
          a.hbox(() => {
            a.canvasSphere({
              cx: 100,
              cy: 100,
              radius: 60,
              pattern: 'checkered',
              latBands: 8,
              lonSegments: 8,
              checkeredColor1: '#cc0000',
              checkeredColor2: '#ffffff',
              rotationX: Math.PI / 8,
              rotationY: Math.PI / 4,
              rotationZ: Math.PI / 6,
            });
            a.spacer(30);
            a.canvasSphere({
              cx: 100,
              cy: 100,
              radius: 60,
              pattern: 'gradient',
              gradientStart: '#ff0000',
              gradientEnd: '#0000ff',
              rotationX: -Math.PI / 12,
              rotationY: Math.PI / 3,
              rotationZ: -Math.PI / 8,
            });
          });
          a.spacer(100);

          // Earth-like example with axial tilt
          a.label('Real-World Example: Earth with Axial Tilt');
          a.label('-23.5 degree tilt (rotationX) + 30 degree spin (rotationY) = realistic Earth orientation');
          a.canvasSphere({
            cx: 200,
            cy: 150,
            radius: 80,
            pattern: 'stripes',
            stripeColors: ['#0033ff', '#00ff00', '#ff8800'],
            stripeDirection: 'horizontal',
            rotationX: -23.5 * Math.PI / 180,  // Earth's axial tilt
            rotationY: Math.PI / 6,             // Some additional spin
          });
          a.spacer(100);

          // Phase 4: Texture Mapping
          a.separator();
          a.label('Canvas Sphere Widget - Phase 4 Texture Mapping');
          a.label('Texture mapping allows you to apply image textures to spheres');
          a.label('Supports equirectangular (world map) projection');
          a.separator();

          a.label('Phase 4 Example: Textured Sphere');
          a.label('Register a texture resource and apply it to a sphere');
          a.label('The texture wraps around the sphere using equirectangular mapping');
          a.label('Textures are sampled based on lat/lon coordinates');
          a.label('Lighting and shading are applied on top of the texture');

          // Note: Actual texture example would require registering a resource first
          a.label('');
          a.label('To use textures:');
          a.label('1. Register an image resource: await app.resources.registerResource(name, imageData)');
          a.label('2. Create a textured sphere: a.canvasSphere({ texture: { resourceName: name } })');
          a.label('3. Texture format: PNG, JPEG, or GIF');
          a.label('4. Mapping: equirectangular (default) or cubemap (future)');
          a.spacer(100);

          // Summary
          a.separator();
          a.label('Complete Features:');
          a.label('Phase 1 (Complete):');
          a.label('  - Solid, checkered, stripes, gradient patterns');
          a.label('  - Custom colors and band counts');
          a.label('  - Y-axis rotation (backward compatible)');
          a.spacer(20);
          a.label('Phase 2 (Complete):');
          a.label('  - X-axis rotation (tilt/pitch)');
          a.label('  - Y-axis rotation (spin/yaw)');
          a.label('  - Z-axis rotation (roll)');
          a.label('  - Combined 3D rotations');
          a.label('  - Backward compatible with Phase 1');
          a.spacer(20);
          a.label('Phase 3 (Complete):');
          a.label('  - Lambertian shading model');
          a.label('  - Directional lighting from front-right-top');
          a.label('  - Ambient (0.3) + diffuse (0.7) lighting');
          a.label('  - Works with all patterns and textures');
          a.spacer(20);
          a.label('Phase 4 (Complete):');
          a.label('  - Equirectangular texture mapping');
          a.label('  - Image resource registration');
          a.label('  - Texture wrapping around sphere');
          a.label('  - Support for PNG, JPEG, GIF formats');
          a.spacer(20);
          a.label('Phase 5 (Complete):');
          a.label('  - onTap callback with lat/lon coordinates');
          a.label('  - Screen-to-sphere coordinate mapping');
          a.label('  - Works with all patterns and textures');
          a.spacer(20);
          a.label('Phase 6 (Complete):');
          a.label('  - Animation presets: spin, wobble, bounce, pulse');
          a.label('  - Controllable via animate(), stopAnimation()');
          a.label('  - Pause/resume, onComplete callback');
          a.label('  - Configurable speed, axis, amplitude');
          a.spacer(20);

          // ==================== PHASE 6: ANIMATION PRESETS ====================
          a.separator();
          a.label('Phase 6: Animation Presets Demo');
          a.label('Four animation types: spin, wobble, bounce, pulse');
          a.separator();

          // Animation 1: Spin
          a.label('Animation 1: Spin');
          a.label('Continuous rotation around an axis');
          const spinSphere = a.canvasSphere({
            cx: 200,
            cy: 200,
            radius: 80,
            pattern: 'checkered',
            latBands: 8,
            lonSegments: 8,
            checkeredColor1: '#cc0000',
            checkeredColor2: '#ffffff',
          });
          spinSphere.animate({ type: 'spin', speed: 1.0, axis: 'y' });
          a.spacer(100);

          // Animation 2: Wobble
          a.label('Animation 2: Wobble');
          a.label('Oscillating rotation back and forth');
          const wobbleSphere = a.canvasSphere({
            cx: 200,
            cy: 200,
            radius: 80,
            pattern: 'stripes',
            stripeColors: ['#00ff00', '#0000ff', '#ff00ff'],
            stripeDirection: 'horizontal',
          });
          wobbleSphere.animate({ type: 'wobble', speed: 2.0, axis: 'x', amplitude: Math.PI / 6 });
          a.spacer(100);

          // Animation 3: Bounce
          a.label('Animation 3: Bounce');
          a.label('Size oscillation (elastic bounce feel)');
          const bounceSphere = a.canvasSphere({
            cx: 200,
            cy: 200,
            radius: 80,
            pattern: 'gradient',
            gradientStart: '#ff6600',
            gradientEnd: '#ffff00',
          });
          bounceSphere.animate({ type: 'bounce', speed: 2.0, amplitude: 0.15 });
          a.spacer(100);

          // Animation 4: Pulse
          a.label('Animation 4: Pulse');
          a.label('Smooth size oscillation (breathing effect)');
          const pulseSphere = a.canvasSphere({
            cx: 200,
            cy: 200,
            radius: 80,
            pattern: 'solid',
            solidColor: '#ff00ff',
          });
          pulseSphere.animate({ type: 'pulse', speed: 0.5, amplitude: 0.1 });
          a.spacer(100);

          // Multi-axis spin demo
          a.label('Multi-Axis Spin Demo');
          a.label('Three spheres spinning on X, Y, and Z axes');
          a.hbox(() => {
            const spinX = a.canvasSphere({
              cx: 100,
              cy: 100,
              radius: 60,
              pattern: 'checkered',
              checkeredColor1: '#ff0000',
              checkeredColor2: '#ffffff',
            });
            spinX.animate({ type: 'spin', speed: 1.5, axis: 'x' });
            a.spacer(30);

            const spinY = a.canvasSphere({
              cx: 100,
              cy: 100,
              radius: 60,
              pattern: 'checkered',
              checkeredColor1: '#00ff00',
              checkeredColor2: '#ffffff',
            });
            spinY.animate({ type: 'spin', speed: 1.5, axis: 'y' });
            a.spacer(30);

            const spinZ = a.canvasSphere({
              cx: 100,
              cy: 100,
              radius: 60,
              pattern: 'checkered',
              checkeredColor1: '#0000ff',
              checkeredColor2: '#ffffff',
            });
            spinZ.animate({ type: 'spin', speed: 1.5, axis: 'z' });
          });
          a.spacer(100);

          // Summary
          a.separator();
          a.label('All 6 phases complete!');
          a.label('See examples/canvas-sphere-animations.ts for interactive animation controls.');
        });
      });
    });

    win.show();
  });
});
