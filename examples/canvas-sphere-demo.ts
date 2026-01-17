#!/usr/bin/env npx tsx
/**
 * Canvas Sphere Demo - Phase 1 & Phase 2
 * Phase 1: Pattern types (solid, checkered, stripes, gradient)
 * Phase 2: Multi-axis rotation (X, Y, Z)
 */

import { app } from '../core/src/index';
import { resolveTransport } from '../core/src/index';

app(resolveTransport(), { title: 'Canvas Sphere - All Phases' }, (a) => {
  a.window({ title: 'Canvas Sphere Demo - Phase 1 & 2', width: 900, height: 1200 }, (win) => {
    win.setContent(() => {
      a.scroll(() => {
        a.vbox(() => {
          // Title
          a.label('Canvas Sphere Widget - Phase 1 Patterns').fontSize(18);
          a.separator();

          // Intro
          a.label(
            'Canvas Sphere Widget - Generalized 3D Sphere Primitive'
          ).fontSize(14);
          a.label(
            'Phase 1: Patterns (solid, checkered, stripes, gradient)'
          ).fontSize(12);
          a.label(
            'Phase 2: Multi-axis rotation (X=tilt, Y=spin, Z=roll)'
          ).fontSize(12);
          a.separator();

          // Pattern 1: Solid
          a.label('Pattern 1: Solid Color').fontSize(14);
          a.label('A single uniform color sphere').fontSize(11);
          a.canvasSphere({
            cx: 200,
            cy: 200,
            radius: 80,
            pattern: 'solid',
            solidColor: '#ff6347', // Tomato red
          });
          a.spacer(100);

          // Pattern 2: Checkered (Boing Ball)
          a.label('Pattern 2: Checkered (Amiga Boing Ball)').fontSize(14);
          a.label('Classic alternating pattern - 8x8 grid').fontSize(11);
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
          a.label('Pattern 3: Horizontal Stripes').fontSize(14);
          a.label('Color bands parallel to the equator').fontSize(11);
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
          a.label('Pattern 4: Vertical Stripes').fontSize(14);
          a.label('Color bands parallel to the poles (longitude)').fontSize(11);
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
          a.label('Pattern 5: Gradient (Pole-to-Pole)').fontSize(14);
          a.label(
            'Smooth color interpolation from south pole to north pole'
          ).fontSize(11);
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
          a.label('Pattern 6: Gradient Variant (Temperature Scale)').fontSize(
            14
          );
          a.label('Cold blue to hot red gradient').fontSize(11);
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
          a.label('Pattern 7: Fine-Grain Checkered').fontSize(14);
          a.label('More bands for smaller pattern - 16x16 grid').fontSize(11);
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
          a.label('Pattern 8: Rainbow Horizontal Stripes').fontSize(14);
          a.label('6-color horizontal stripe pattern').fontSize(11);
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
          a.label('Phase 2: Multi-Axis Rotation').fontSize(18);
          a.label('X-axis (tilt), Y-axis (spin), Z-axis (roll)').fontSize(12);
          a.separator();

          // Rotation 1: Y-axis (spin)
          a.label('Rotation 1: Y-Axis (Spin Left/Right)').fontSize(14);
          a.label('Spins around vertical axis by 45 degrees').fontSize(11);
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
          a.label('Rotation 2: X-Axis (Tilt Forward/Back)').fontSize(14);
          a.label('Tilts forward by 30 degrees (left) and backward by 45 degrees (right)').fontSize(11);
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
          a.label('Rotation 3: Z-Axis (Roll)').fontSize(14);
          a.label('Rolls clockwise by 60 degrees (left) and counter-clockwise by 30 degrees (right)').fontSize(11);
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
          a.label('Rotation 4: Combined 3D Rotation (Tumbling Effect)').fontSize(14);
          a.label('All axes rotating together - like a tumbling space object').fontSize(11);
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
          a.label('Real-World Example: Earth with Axial Tilt').fontSize(14);
          a.label('-23.5° tilt (rotationX) + 30° spin (rotationY) = realistic Earth orientation').fontSize(11);
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

          // Summary
          a.separator();
          a.label('Complete Features:').fontSize(14);
          a.label('Phase 1 (✓ Complete):').fontSize(12);
          a.label('  ✓ Solid, checkered, stripes, gradient patterns').fontSize(11);
          a.label('  ✓ Custom colors and band counts').fontSize(11);
          a.label('  ✓ Y-axis rotation (backward compatible)').fontSize(11);
          a.spacer(20);
          a.label('Phase 2 (✓ Complete):').fontSize(12);
          a.label('  ✓ X-axis rotation (tilt/pitch)').fontSize(11);
          a.label('  ✓ Y-axis rotation (spin/yaw)').fontSize(11);
          a.label('  ✓ Z-axis rotation (roll)').fontSize(11);
          a.label('  ✓ Combined 3D rotations').fontSize(11);
          a.label('  ✓ Backward compatible with Phase 1').fontSize(11);
          a.spacer(20);

          a.label('Upcoming Phases:').fontSize(12);
          a.label('Phase 3: Lighting and shading (Lambertian model)').fontSize(11);
          a.label('Phase 4: Texture mapping (equirectangular/cubemap)').fontSize(11);
          a.label('Phase 5: Interactivity (tap events with lat/lon)').fontSize(11);
          a.label('Phase 6: Animation presets (spin, wobble, bounce, pulse)').fontSize(11);
        });
      });
    });

    win.show();
  });
});
