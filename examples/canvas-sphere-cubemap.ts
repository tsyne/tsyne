#!/usr/bin/env npx tsx
/**
 * Canvas Sphere Demo - Phase 8: Cubemap Textures
 *
 * Demonstrates cubemap texture mapping:
 * - Six-face environment mapping
 * - Skybox rendering on spheres
 * - Combined with lighting and rotation
 *
 * Note: To use cubemaps, you need to register six image resources,
 * one for each face of the cube (+X, -X, +Y, -Y, +Z, -Z).
 */

import { app } from 'tsyne';
import { resolveTransport } from 'tsyne';
import * as fs from 'fs';
import * as path from 'path';

app(resolveTransport(), { title: 'Canvas Sphere - Cubemap Textures' }, async (a) => {
  a.window({ title: 'Phase 8: Cubemap Textures', width: 500, height: 1000 }, async (win) => {
    win.setContent(() => {
      a.scroll(() => {
        a.vbox(() => {
          // Title
          a.label('Phase 8: Cubemap Textures');
          a.separator();

          // Introduction
          a.label('Cubemap textures use 6 images for environment mapping:');
          a.label('  +X (right), -X (left)');
          a.label('  +Y (top), -Y (bottom)');
          a.label('  +Z (front), -Z (back)');
          a.spacer(20);

          // API Example
          a.label('API Usage:');
          a.label('');
          a.label('// Register 6 face textures');
          a.label('app.resources.register("sky-px", positiveXImage);');
          a.label('app.resources.register("sky-nx", negativeXImage);');
          a.label('app.resources.register("sky-py", positiveYImage);');
          a.label('app.resources.register("sky-ny", negativeYImage);');
          a.label('app.resources.register("sky-pz", positiveZImage);');
          a.label('app.resources.register("sky-nz", negativeZImage);');
          a.label('');
          a.label('// Create sphere with cubemap');
          a.label('a.canvasSphere({');
          a.label('  cx: 200, cy: 200, radius: 100,');
          a.label('  texture: {');
          a.label('    mapping: "cubemap",');
          a.label('    cubemap: {');
          a.label('      positiveX: "sky-px",');
          a.label('      negativeX: "sky-nx",');
          a.label('      positiveY: "sky-py",');
          a.label('      negativeY: "sky-ny",');
          a.label('      positiveZ: "sky-pz",');
          a.label('      negativeZ: "sky-nz",');
          a.label('    }');
          a.label('  }');
          a.label('});');
          a.spacer(30);

          // Use Cases
          a.separator();
          a.label('Common Use Cases:');
          a.label('');
          a.label('1. Skybox Environments');
          a.label('   - Show environment reflections on spheres');
          a.label('   - Create immersive 3D scenes');
          a.spacer(10);
          a.label('2. Environment Maps');
          a.label('   - Reflective surfaces');
          a.label('   - Chrome ball effects');
          a.spacer(10);
          a.label('3. Cube-Based Textures');
          a.label('   - Dice faces');
          a.label('   - Building/room interiors');
          a.spacer(30);

          // Technical Details
          a.separator();
          a.label('Technical Details:');
          a.label('');
          a.label('Face Selection:');
          a.label('  - Uses dominant normal component');
          a.label('  - nx > ny and nx > nz: +X or -X face');
          a.label('  - ny > nx and ny > nz: +Y or -Y face');
          a.label('  - nz > nx and nz > ny: +Z or -Z face');
          a.spacer(10);
          a.label('UV Mapping:');
          a.label('  - Each face uses local 2D coordinates');
          a.label('  - Coordinates derived from 3D direction');
          a.label('  - Seamless transitions between faces');
          a.spacer(30);

          // Combining with Other Features
          a.separator();
          a.label('Combining with Other Features:');
          a.label('');
          a.label('Cubemap + Lighting:');
          a.label('  texture: { mapping: "cubemap", ... },');
          a.label('  lighting: { ambient: 0.4, diffuse: 0.6 }');
          a.spacer(10);
          a.label('Cubemap + Rotation:');
          a.label('  texture: { mapping: "cubemap", ... },');
          a.label('  rotationX: Math.PI/6,');
          a.label('  rotationY: Math.PI/4');
          a.spacer(10);
          a.label('Cubemap + Animation:');
          a.label('  const sphere = a.canvasSphere({ ... });');
          a.label('  sphere.animate({ type: "spin", axis: "y" });');
          a.spacer(30);

          // Placeholder Sphere (without actual cubemap resources)
          a.separator();
          a.label('Demo Sphere (checkered - no cubemap resources loaded)');
          a.label('Load actual cubemap images to see the effect');
          a.canvasSphere({
            cx: 200,
            cy: 200,
            radius: 100,
            pattern: 'checkered',
            latBands: 16,
            lonSegments: 16,
            checkeredColor1: '#336699',
            checkeredColor2: '#99ccff',
            lighting: {
              ambient: 0.4,
              diffuse: 0.6,
            },
          });
          a.spacer(120);

          // Summary
          a.separator();
          a.label('Phase 8 Features:');
          a.label('  - texture.mapping: "cubemap"');
          a.label('  - texture.cubemap: { positiveX, negativeX, ... }');
          a.label('  - 6 face resources required');
          a.label('  - Works with lighting and rotation');
          a.label('  - Supports animation');
          a.spacer(50);
        });
      });
    });

    win.show();
  });
});
