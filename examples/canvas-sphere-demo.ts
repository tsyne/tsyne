#!/usr/bin/env npx tsx
/**
 * Canvas Sphere Demo - Phase 1
 * Showcases all pattern types: solid, checkered, stripes, gradient
 */

import { app } from '../core/src/index';
import { resolveTransport } from '../core/src/index';

app(resolveTransport(), { title: 'Canvas Sphere - Phase 1 Patterns' }, (a) => {
  a.window({ title: 'Canvas Sphere Demo', width: 900, height: 800 }, (win) => {
    win.setContent(() => {
      a.scroll(() => {
        a.vbox(() => {
          // Title
          a.label('Canvas Sphere Widget - Phase 1 Patterns').fontSize(18);
          a.separator();

          // Intro
          a.label(
            'This demo showcases the generalized canvasSphere widget with multiple pattern types'
          ).fontSize(12);
          a.label(
            'Phase 1 supports: solid, checkered, stripes, and gradient patterns'
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

          // Rotation example
          a.label('Pattern 9: Rotated Checkered Sphere').fontSize(14);
          a.label('Same checkered pattern but rotated 45 degrees').fontSize(11);
          a.canvasSphere({
            cx: 200,
            cy: 200,
            radius: 80,
            pattern: 'checkered',
            latBands: 8,
            lonSegments: 8,
            checkeredColor1: '#0066cc',
            checkeredColor2: '#ffff99',
            rotation: Math.PI / 4, // 45 degrees
          });
          a.spacer(100);

          // Summary
          a.separator();
          a.label('Phase 1 Complete Features:').fontSize(14);
          a.label('✓ Solid pattern').fontSize(11);
          a.label('✓ Checkered pattern with customizable bands').fontSize(11);
          a.label('✓ Horizontal and vertical stripes').fontSize(11);
          a.label('✓ Gradient patterns (north-south interpolation)').fontSize(11);
          a.label('✓ Y-axis rotation').fontSize(11);
          a.label('✓ Custom colors for all patterns').fontSize(11);
          a.label('✓ Backward compatible with canvasCheckeredSphere').fontSize(
            11
          );
          a.spacer(50);

          a.label('Future Phases:').fontSize(14);
          a.label('Phase 2: Multi-axis rotation (X, Y, Z)').fontSize(11);
          a.label('Phase 3: Lighting and shading').fontSize(11);
          a.label('Phase 4: Texture mapping').fontSize(11);
          a.label('Phase 5: Interactivity (tap events)').fontSize(11);
          a.label('Phase 6: Animation presets').fontSize(11);
        });
      });
    });

    win.show();
  });
});
