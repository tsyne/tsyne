/**
 * Projections Demo - Cosyne Phase 4
 *
 * Demonstrates 3D → 2D coordinate transforms
 * - SphericalProjection: 3D globe with latitude/longitude
 * - IsometricProjection: Isometric 3D blocks in 2D space
 */

import { App } from 'tsyne';
import { CosyneContext, cosyne, refreshAllCosyneContexts, SphericalProjection, IsometricProjection } from '../../cosyne/src';

export function buildProjectionsApp(a: App): void {
  a.canvasStack(() => {
    const cosyneCtx = cosyne(a, (c: CosyneContext) => {
      // =====================================================================
      // SPHERICAL PROJECTION - 3D Globe
      // =====================================================================

      const sphere = new SphericalProjection();
      let sphereRotation = { theta: 0, phi: 0 };

      // Rotate sphere over time
      setInterval(() => {
        sphereRotation.theta += 0.02;
        sphereRotation.phi = Math.sin(sphereRotation.theta) * 0.3;
        sphere.setRotation(sphereRotation);
        refreshAllCosyneContexts();
      }, 50);

      // Title for sphere section
      c.text(130, 20, 'Spherical Projection (3D Globe)')
        .fill('#2C3E50');

      // Draw latitude/longitude grid on sphere
      const gridPoints: Array<{ x: number; y: number; z: number; color: string }> = [];

      // Latitude lines (0, ±30, ±60, ±90)
      for (let lat = -90; lat <= 90; lat += 30) {
        const latRad = (lat * Math.PI) / 180;
        for (let lon = 0; lon < 360; lon += 10) {
          const lonRad = (lon * Math.PI) / 180;
          const x = 80 * Math.cos(latRad) * Math.cos(lonRad);
          const y = 80 * Math.sin(latRad);
          const z = 80 * Math.cos(latRad) * Math.sin(lonRad);

          gridPoints.push({
            x,
            y,
            z,
            color: lat === 0 ? '#FF6B6B' : '#CCCCCC',
          });
        }
      }

      // Longitude lines
      for (let lon = 0; lon < 360; lon += 30) {
        const lonRad = (lon * Math.PI) / 180;
        for (let lat = -90; lat <= 90; lat += 10) {
          const latRad = (lat * Math.PI) / 180;
          const x = 80 * Math.cos(latRad) * Math.cos(lonRad);
          const y = 80 * Math.sin(latRad);
          const z = 80 * Math.cos(latRad) * Math.sin(lonRad);

          gridPoints.push({
            x,
            y,
            z,
            color: lon === 0 ? '#4ECDC4' : '#CCCCCC',
          });
        }
      }

      // Plot projected points
      c.circles()
        .bindTo(gridPoints, { trackBy: (_, i) => i })
        .bindPosition((pt) => {
          const proj2d = sphere.project({ x: pt.x, y: pt.y, z: pt.z });
          return { x: 130 + proj2d.x, y: 100 + proj2d.y };
        })
        .bindFill((pt) => pt.color)
        .bindAlpha((pt) => {
          const proj2d = sphere.project({ x: pt.x, y: pt.y, z: pt.z });
          return 0.3 + sphere.getAlpha(proj2d) * 0.7; // Depth-based visibility
        });

      // Mark poles
      const northPole = sphere.project({ x: 0, y: 80, z: 0 });
      c.circle(130 + northPole.x, 100 + northPole.y, 4)
        .fill('#FF0000')
        .withId('north-pole');

      const southPole = sphere.project({ x: 0, y: -80, z: 0 });
      c.circle(130 + southPole.x, 100 + southPole.y, 4)
        .fill('#0000FF')
        .withId('south-pole');

      // =====================================================================
      // ISOMETRIC PROJECTION - 3D Blocks
      // =====================================================================

      const iso = new IsometricProjection();

      c.text(360, 20, 'Isometric Projection (3D Blocks)')
        .fill('#2C3E50');

      // Create a 3D grid of blocks
      const blocks: Array<{ x: number; y: number; z: number; color: string }> = [];
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

      for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          for (let z = 0; z < 3; z++) {
            blocks.push({
              x: x * 30 - 45,
              y: z * 30 - 30,
              z: y * 30 - 45,
              color: colors[(x + y + z) % colors.length],
            });
          }
        }
      }

      // Sort blocks back-to-front for proper rendering
      blocks.sort((a, b) => {
        const projA = iso.project({ x: a.x, y: a.y, z: a.z });
        const projB = iso.project({ x: b.x, y: b.y, z: b.z });
        return projA.x + projA.y - (projB.x + projB.y);
      });

      // Draw isometric cubes
      c.rects()
        .bindTo(blocks, { trackBy: (_, i) => i })
        .bindPosition((block) => {
          const proj = iso.project({ x: block.x, y: block.y, z: block.z });
          return { x: 360 + proj.x, y: 100 + proj.y };
        })
        .bindFill((block) => block.color)
        .bindAlpha(() => 0.8);

      // Info text
      c.rect(10, 220, 480, 50)
        .fill('#F9F9F9')
        .stroke('#CCCCCC', 1);

      c.text(20, 235, 'Spherical: Rotates continuously • Isometric: Static 3D block grid')
        .fill('#2C3E50');

      c.text(20, 255, 'Both use coordinate transformation instead of 3D rendering for efficiency')
        .fill('#666666');
    });
  });
}

// Standalone execution
if (require.main === module) {
  const { app } = require('../../core/src');
  app(
    {
      title: 'Projections Demo - Cosyne Phase 4',
      width: 600,
      height: 350,
    },
    (a: any) => {
      a.window(
        { title: 'Projections Demo', width: 500, height: 300 },
        (win: any) => {
          win.setContent(() => {
            buildProjectionsApp(a);
          });
          win.show();
        }
      );
    }
  );
}
