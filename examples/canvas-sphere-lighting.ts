#!/usr/bin/env npx tsx
/**
 * Canvas Sphere Demo - Phase 7: Configurable Lighting
 *
 * Demonstrates configurable lighting options:
 * - Enabling/disabling lighting
 * - Custom light direction
 * - Adjustable ambient and diffuse intensities
 */

import { app } from 'tsyne';
import { resolveTransport } from 'tsyne';

app(resolveTransport(), { title: 'Canvas Sphere - Configurable Lighting' }, (a) => {
  a.window({ title: 'Phase 7: Configurable Lighting', width: 500, height: 1400 }, (win) => {
    win.setContent(() => {
      a.scroll(() => {
        a.vbox(() => {
          // Title
          a.label('Phase 7: Configurable Lighting');
          a.separator();

          // Introduction
          a.label('Control light direction, ambient, and diffuse intensity');
          a.label('or disable lighting entirely for flat shading');
          a.spacer(20);

          // Example 1: Default Lighting
          a.label('1. Default Lighting');
          a.label('Light from front-right-top (0.5, -0.3, 0.8)');
          a.label('Ambient: 0.3, Diffuse: 0.7');
          a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'solid',
            solidColor: '#0066cc',
            // No lighting specified = use defaults
          });
          a.spacer(100);

          // Example 2: Custom Light Direction - Left
          a.label('2. Light from Left');
          a.label('direction: { x: -1, y: 0, z: 0.5 }');
          a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'solid',
            solidColor: '#cc0000',
            lighting: {
              direction: { x: -1, y: 0, z: 0.5 },
            },
          });
          a.spacer(100);

          // Example 3: Light from Above
          a.label('3. Light from Above');
          a.label('direction: { x: 0, y: -1, z: 0.3 }');
          a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'gradient',
            gradientStart: '#ff6600',
            gradientEnd: '#ffff00',
            lighting: {
              direction: { x: 0, y: -1, z: 0.3 },
            },
          });
          a.spacer(100);

          // Example 4: Light from Below
          a.label('4. Light from Below (Dramatic)');
          a.label('direction: { x: 0, y: 1, z: 0.5 }');
          a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'checkered',
            checkeredColor1: '#8800ff',
            checkeredColor2: '#ffffff',
            lighting: {
              direction: { x: 0, y: 1, z: 0.5 },
            },
          });
          a.spacer(100);

          // Example 5: High Ambient (Soft Shadows)
          a.label('5. High Ambient (Soft Shadows)');
          a.label('ambient: 0.6, diffuse: 0.4');
          a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'solid',
            solidColor: '#00cc66',
            lighting: {
              ambient: 0.6,
              diffuse: 0.4,
            },
          });
          a.spacer(100);

          // Example 6: High Diffuse (Strong Contrast)
          a.label('6. High Diffuse (Strong Contrast)');
          a.label('ambient: 0.1, diffuse: 0.9');
          a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'stripes',
            stripeColors: ['#ff0000', '#ffff00', '#00ff00'],
            lighting: {
              ambient: 0.1,
              diffuse: 0.9,
            },
          });
          a.spacer(100);

          // Example 7: Flat Lighting (Disabled)
          a.label('7. Lighting Disabled (Flat Shading)');
          a.label('enabled: false');
          a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'checkered',
            checkeredColor1: '#cc0000',
            checkeredColor2: '#ffffff',
            lighting: {
              enabled: false,
            },
          });
          a.spacer(100);

          // Example 8: Ambient Only (No Shadows)
          a.label('8. Ambient Only (Full Brightness)');
          a.label('ambient: 1.0, diffuse: 0');
          a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'gradient',
            gradientStart: '#0000ff',
            gradientEnd: '#ff0000',
            lighting: {
              ambient: 1.0,
              diffuse: 0,
            },
          });
          a.spacer(100);

          // Comparison Side-by-Side
          a.separator();
          a.label('Comparison: Same Sphere, Different Lighting');
          a.hbox(() => {
            a.vbox(() => {
              a.label('Left Light');
              a.canvasSphere({
                cx: 60,
                cy: 60,
                radius: 50,
                pattern: 'solid',
                solidColor: '#0066cc',
                lighting: {
                  direction: { x: -1, y: 0, z: 0.5 },
                },
              });
            });
            a.spacer(30);
            a.vbox(() => {
              a.label('Right Light');
              a.canvasSphere({
                cx: 60,
                cy: 60,
                radius: 50,
                pattern: 'solid',
                solidColor: '#0066cc',
                lighting: {
                  direction: { x: 1, y: 0, z: 0.5 },
                },
              });
            });
            a.spacer(30);
            a.vbox(() => {
              a.label('No Light');
              a.canvasSphere({
                cx: 60,
                cy: 60,
                radius: 50,
                pattern: 'solid',
                solidColor: '#0066cc',
                lighting: { enabled: false },
              });
            });
          });
          a.spacer(50);

          // Summary
          a.separator();
          a.label('Phase 7 Features:');
          a.label('  - lighting.enabled: true/false');
          a.label('  - lighting.direction: { x, y, z }');
          a.label('  - lighting.ambient: 0.0 to 1.0');
          a.label('  - lighting.diffuse: 0.0 to 1.0');
          a.spacer(50);
        });
      });
    });

    win.show();
  });
});
