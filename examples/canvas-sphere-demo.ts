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
          a.label('Canvas Sphere Widget - Phase 1 Patterns');
          a.separator();

          // Intro
          a.label(
            'This demo showcases the generalized canvasSphere widget with multiple pattern types'
          );
          a.label(
            'Phase 1 supports: solid, checkered, stripes, and gradient patterns'
          );
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

          // Rotation example
          a.label('Pattern 9: Rotated Checkered Sphere');
          a.label('Same checkered pattern but rotated 45 degrees');
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
          a.label('Phase 1 Complete Features:');
          a.label('✓ Solid pattern');
          a.label('✓ Checkered pattern with customizable bands');
          a.label('✓ Horizontal and vertical stripes');
          a.label('✓ Gradient patterns (north-south interpolation)');
          a.label('✓ Y-axis rotation');
          a.label('✓ Custom colors for all patterns');
          a.label('✓ Backward compatible with canvasCheckeredSphere');
          a.spacer(50);

          a.label('Future Phases:');
          a.label('Phase 2: Multi-axis rotation (X, Y, Z)');
          a.label('Phase 3: Lighting and shading');
          a.label('Phase 4: Texture mapping');
          a.label('Phase 5: Interactivity (tap events)');
          a.label('Phase 6: Animation presets');
        });
      });
    });

    win.show();
  });
});
