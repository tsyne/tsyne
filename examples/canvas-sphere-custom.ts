#!/usr/bin/env npx tsx
/**
 * Canvas Sphere Demo - Phase 9: Custom Pattern Function
 *
 * Demonstrates custom pattern functions:
 * - User-provided (lat, lon) => color callbacks
 * - Procedural textures
 * - Mathematical patterns
 * - Data visualization on spheres
 */

import { app } from 'tsyne';
import { resolveTransport } from 'tsyne';

app(resolveTransport(), { title: 'Canvas Sphere - Custom Patterns' }, (a) => {
  a.window({ title: 'Phase 9: Custom Pattern Functions', width: 500, height: 1600 }, (win) => {
    win.setContent(() => {
      a.scroll(() => {
        a.vbox(() => {
          // Title
          a.label('Phase 9: Custom Pattern Functions');
          a.separator();

          // Introduction
          a.label('Create procedural patterns using (lat, lon) => color');
          a.label('lat: -PI/2 (south) to PI/2 (north)');
          a.label('lon: -PI (west) to PI (east)');
          a.spacer(20);

          // Example 1: Simple Latitude Stripes
          a.label('1. Procedural Latitude Stripes');
          a.label('10 alternating red/blue stripes');
          const latStripes = a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'custom',
            customPattern: (lat: number, lon: number) => {
              const stripeCount = 10;
              const stripe = Math.floor((lat + Math.PI / 2) / Math.PI * stripeCount);
              return stripe % 2 === 0 ? '#ff0000' : '#0000ff';
            },
          });
          // Render the custom pattern
          latStripes.renderCustomPattern();
          a.spacer(100);

          // Example 2: Longitude Stripes
          a.label('2. Procedural Longitude Stripes');
          a.label('12 segments around the equator');
          const lonStripes = a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'custom',
            customPattern: (lat: number, lon: number) => {
              const segmentCount = 12;
              const segment = Math.floor((lon + Math.PI) / (2 * Math.PI) * segmentCount);
              const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
              return colors[segment % colors.length];
            },
          });
          lonStripes.renderCustomPattern();
          a.spacer(100);

          // Example 3: Checkerboard (Procedural)
          a.label('3. Procedural Checkerboard');
          a.label('16x16 grid generated mathematically');
          const checker = a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'custom',
            customPattern: (lat: number, lon: number) => {
              const latBands = 16;
              const lonSegs = 16;
              const latIdx = Math.floor((lat + Math.PI / 2) / Math.PI * latBands);
              const lonIdx = Math.floor((lon + Math.PI) / (2 * Math.PI) * lonSegs);
              return (latIdx + lonIdx) % 2 === 0 ? '#000000' : '#ffffff';
            },
          });
          checker.renderCustomPattern();
          a.spacer(100);

          // Example 4: Polar Caps
          a.label('4. Polar Ice Caps');
          a.label('White caps at poles, blue ocean, green land');
          const polarCaps = a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'custom',
            customPattern: (lat: number, lon: number) => {
              const absLat = Math.abs(lat);
              // Polar caps
              if (absLat > 1.2) return '#ffffff';
              // Tundra
              if (absLat > 1.0) return '#aaddaa';
              // Land bands
              if (absLat > 0.5) return '#228B22';
              // Equatorial ocean with some islands
              const noise = Math.sin(lon * 5) * Math.cos(lat * 8);
              if (noise > 0.3) return '#228B22';
              return '#1E90FF';
            },
          });
          polarCaps.renderCustomPattern();
          a.spacer(100);

          // Example 5: Mathematical Spiral
          a.label('5. Mathematical Spiral');
          a.label('Spiral pattern using lat + lon');
          const spiral = a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'custom',
            customPattern: (lat: number, lon: number) => {
              const value = Math.sin((lat * 5 + lon * 3) * 2);
              if (value > 0.5) return '#ff0000';
              if (value > 0) return '#ffff00';
              if (value > -0.5) return '#00ff00';
              return '#0000ff';
            },
          });
          spiral.renderCustomPattern();
          a.spacer(100);

          // Example 6: Gradient with Custom Colors
          a.label('6. Multi-Color Gradient');
          a.label('Rainbow gradient from south to north');
          const rainbow = a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'custom',
            customPattern: (lat: number, lon: number) => {
              // Normalize lat to 0-1
              const t = (lat + Math.PI / 2) / Math.PI;
              // Rainbow: red -> yellow -> green -> cyan -> blue -> magenta
              const hue = t * 360;
              return hslToHex(hue, 100, 50);
            },
          });
          rainbow.renderCustomPattern();
          a.spacer(100);

          // Example 7: Waves Pattern
          a.label('7. Ocean Waves');
          a.label('Sinusoidal wave pattern');
          const waves = a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'custom',
            customPattern: (lat: number, lon: number) => {
              const wave = Math.sin(lat * 8 + lon * 2);
              const brightness = Math.floor((wave + 1) / 2 * 100 + 50);
              return `rgb(0, ${Math.floor(brightness * 0.5)}, ${brightness})`;
            },
          });
          waves.renderCustomPattern();
          a.spacer(100);

          // Example 8: Concentric Circles from North Pole
          a.label('8. Concentric Circles from North Pole');
          a.label('Distance-based rings from polar point');
          const rings = a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'custom',
            customPattern: (lat: number, lon: number) => {
              // Distance from north pole (lat = PI/2)
              const dist = Math.PI / 2 - lat;
              const ringIdx = Math.floor(dist * 8);
              const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#8800ff', '#ff00ff'];
              return colors[ringIdx % colors.length];
            },
          });
          rings.renderCustomPattern();
          a.spacer(100);

          // Summary
          a.separator();
          a.label('Phase 9 Features:');
          a.label('  - pattern: "custom"');
          a.label('  - customPattern: (lat, lon) => colorHex');
          a.label('  - Call sphere.renderCustomPattern() to render');
          a.label('  - Full JavaScript power for procedural generation');
          a.label('  - Works with lighting and rotation');
          a.spacer(50);
        });
      });
    });

    win.show();
  });
});

// Helper function to convert HSL to Hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}
