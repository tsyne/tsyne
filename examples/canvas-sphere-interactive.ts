#!/usr/bin/env npx tsx
/**
 * Canvas Sphere Interactive Demo - Phase 5
 * Demonstrates tap/click interactivity with latitude/longitude coordinates
 *
 * Phase 5 Features:
 * - onTap callback with lat/lon coordinates
 * - Screen coordinate reversal to geographic coordinates
 * - Interactive feedback (click tracking, coordinate display)
 * - Works with all patterns and textures
 */

import { app } from 'tsyne';
import { resolveTransport } from 'tsyne';

app(resolveTransport(), { title: 'Canvas Sphere - Phase 5 Interactive' }, (a) => {
  a.window({ title: 'Canvas Sphere Interactive Demo - Phase 5', width: 1000, height: 900 }, (win) => {
    win.setContent(() => {
      a.scroll(() => {
        a.vbox(() => {
          // Title
          a.label('Canvas Sphere Widget - Phase 5 Interactivity');
          a.label('Tap on any sphere to see latitude/longitude coordinates');
          a.separator();

          // Example 1: Simple solid sphere with tap tracking
          a.label('Example 1: Solid Sphere with Tap Tracking');
          a.label('Click anywhere on the sphere to see coordinates');

          let tapCount1 = 0;
          const statusLabel1 = a.label('Click on sphere: Awaiting tap...').withId('status1');

          a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'solid',
            solidColor: '#ff6347',
            onTap: async (lat: number, lon: number, screenX: number, screenY: number) => {
              tapCount1++;
              const latDeg = (lat * 180 / Math.PI).toFixed(1);
              const lonDeg = (lon * 180 / Math.PI).toFixed(1);
              await statusLabel1.setText(`Tap #${tapCount1}: Lat ${latDeg}°, Lon ${lonDeg}° (Screen: ${screenX}, ${screenY})`);
            },
          });
          a.spacer();

          // Example 2: Checkered sphere with region highlighting
          a.label('Example 2: Checkered Sphere with Hemisphere Detection');
          a.label('Northern Hemisphere = positive latitude, Southern = negative');

          let hemisphere = 'None';
          const hemisphereLabel = a.label('Hemisphere: None').withId('hemisphere');

          a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'checkered',
            latBands: 8,
            lonSegments: 8,
            checkeredColor1: '#cc0000',
            checkeredColor2: '#ffffff',
            onTap: async (lat: number, lon: number) => {
              if (lat > 0) {
                hemisphere = `Northern Hemisphere (lat=${lat.toFixed(2)})`;
              } else if (lat < 0) {
                hemisphere = `Southern Hemisphere (lat=${lat.toFixed(2)})`;
              } else {
                hemisphere = `Equator (lat=0)`;
              }
              await hemisphereLabel.setText(`Hemisphere: ${hemisphere}`);
            },
          });
          a.spacer();

          // Example 3: Striped sphere with prime meridian detection
          a.label('Example 3: Striped Sphere with Prime Meridian Detection');
          a.label('Eastern Hemisphere = positive longitude, Western = negative');

          let meridian = 'None';
          const meridianLabel = a.label('Meridian: None').withId('meridian');

          a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'stripes',
            stripeColors: ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff'],
            stripeDirection: 'vertical',
            onTap: async (lat: number, lon: number) => {
              if (lon > 0) {
                meridian = `Eastern Hemisphere (lon=${lon.toFixed(2)})`;
              } else if (lon < 0) {
                meridian = `Western Hemisphere (lon=${lon.toFixed(2)})`;
              } else {
                meridian = `Prime Meridian (lon=0)`;
              }
              await meridianLabel.setText(`Meridian: ${meridian}`);
            },
          });
          a.spacer();

          // Example 4: Gradient sphere with distance calculator
          a.label('Example 4: Gradient Sphere with Coordinate History');
          a.label('Shows last 3 taps with color feedback');

          let taps: Array<{ lat: string; lon: string; index: number }> = [];
          const tap1 = a.label('Tap 1: -').withId('tap1');
          const tap2 = a.label('Tap 2: -').withId('tap2');
          const tap3 = a.label('Tap 3: -').withId('tap3');

          a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'gradient',
            gradientStart: '#0000ff',
            gradientEnd: '#ff0000',
            onTap: async (lat: number, lon: number) => {
              const latDeg = (lat * 180 / Math.PI).toFixed(1);
              const lonDeg = (lon * 180 / Math.PI).toFixed(1);
              taps.unshift({ lat: latDeg, lon: lonDeg, index: taps.length });
              if (taps.length > 3) taps.pop();

              await tap1.setText(taps[0] ? `Tap 1: Lat ${taps[0].lat}°, Lon ${taps[0].lon}°` : 'Tap 1: -');
              await tap2.setText(taps[1] ? `Tap 2: Lat ${taps[1].lat}°, Lon ${taps[1].lon}°` : 'Tap 2: -');
              await tap3.setText(taps[2] ? `Tap 3: Lat ${taps[2].lat}°, Lon ${taps[2].lon}°` : 'Tap 3: -');
            },
          });
          a.spacer();

          // Example 5: Rotated sphere with dynamic rotation
          a.label('Example 5: Rotated Sphere - Shows Rotation Compensation');
          a.label('45° Y-axis rotation - coordinates account for rotation');

          let rotatedTaps = 0;
          const rotatedStatus = a.label('Taps on rotated sphere: 0').withId('rotated');

          a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'stripes',
            stripeColors: ['#ff00ff', '#00ffff'],
            stripeDirection: 'horizontal',
            rotationY: Math.PI / 4,  // 45 degrees
            onTap: async (lat: number, lon: number) => {
              rotatedTaps++;
              const lonDeg = (lon * 180 / Math.PI).toFixed(1);
              await rotatedStatus.setText(`Taps on rotated sphere: ${rotatedTaps} (Last lon=${lonDeg}° - accounts for rotation)`);
            },
          });
          a.spacer();

          // Example 6: Multiple axes rotation with interactive logging
          a.label('Example 6: Multi-Axis Rotation (X + Y + Z)');
          a.label('3D rotation: all axes involved');

          let multiRotTaps = 0;
          const multiRotStatus = a.label('Total taps: 0').withId('multirot');

          a.canvasSphere({
            cx: 150,
            cy: 150,
            radius: 80,
            pattern: 'checkered',
            latBands: 8,
            lonSegments: 8,
            rotationX: Math.PI / 12,   // 15 degrees
            rotationY: Math.PI / 6,    // 30 degrees
            rotationZ: Math.PI / 8,    // 22.5 degrees
            onTap: async (lat: number, lon: number, screenX: number, screenY: number) => {
              multiRotTaps++;
              const latDeg = (lat * 180 / Math.PI).toFixed(1);
              const lonDeg = (lon * 180 / Math.PI).toFixed(1);
              await multiRotStatus.setText(`Total taps: ${multiRotTaps} (Last: Lat ${latDeg}°, Lon ${lonDeg}°)`);
            },
          });
          a.spacer();

          // Summary
          a.separator();
          a.label('Phase 5 Features:');
          a.label('✓ onTap callback with (lat, lon, screenX, screenY)');
          a.label('✓ Latitude ranges from -π/2 (south pole) to π/2 (north pole)');
          a.label('✓ Longitude ranges from -π to π (west to east)');
          a.label('✓ Screen coordinates show click position on canvas');
          a.label('✓ Works with all patterns: solid, checkered, stripes, gradient');
          a.label('✓ Coordinates automatically account for sphere rotation');
          a.label('✓ Multi-axis rotation supported (X, Y, Z)');
          a.label('');
          a.label('Use Cases:');
          a.label('• Interactive globes with country/region selection');
          a.label('• Celestial sphere navigation');
          a.label('• 3D data visualization with hover/click interactions');
          a.label('• Educational tools for geography/astronomy');
          a.label('• Games with sphere-based gameplay');
        });
      });
    });

    win.show();
  });
});
