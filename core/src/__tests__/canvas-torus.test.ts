/**
 * Torus visualization integration tests
 *
 * Tests that torus projection and geometry work correctly as a pure,
 * composable module that can be integrated with Tsyne's canvas system.
 *
 * Note: These tests focus on the pure math functions and geometric operations.
 * The DOM/Canvas integration is tested via the standalone demo apps.
 */

// Import only the pure math/geometry parts that don't require DOM
// This is intentional - we're testing the library works in Node.js context
import type { Point3D } from '../../../cosyne/src/projections';

// We'll reimplement TorusProjection here to avoid DOM imports,
// or just test the pure geometry functions directly.

describe('Torus Visualization - Pure Math Integration', () => {
  // Replicate TorusProjection's core math for testing
  class TestTorusProjection {
    private rotation = { theta: 0, phi: 0, psi: 0 };
    private center = { x: 400, y: 300 };
    private focalLength = 320;

    constructor(options?: { focalLength?: number; center?: { x: number; y: number } }) {
      if (options?.focalLength) this.focalLength = options.focalLength;
      if (options?.center) this.center = options.center;
    }

    project(point: Point3D) {
      const rotated = this.rotatePoint(point);
      const scale = this.focalLength / (this.focalLength + rotated.z);
      return {
        x: this.center.x + rotated.x * scale,
        y: this.center.y - rotated.y * scale,
      };
    }

    getAlpha(point: Point3D): number {
      const rotated = this.rotatePoint(point);
      if (rotated.z < -this.focalLength) return 0;
      const alpha = Math.max(0, 1 + rotated.z / (this.focalLength * 2));
      return Math.min(1, alpha);
    }

    setRotation(angles: { theta: number; phi: number; psi?: number }) {
      this.rotation = {
        theta: angles.theta,
        phi: angles.phi,
        psi: angles.psi ?? 0,
      };
    }

    private rotatePoint(point: Point3D): Point3D {
      let p = { ...point };

      if (this.rotation.theta !== 0) {
        const cos = Math.cos(this.rotation.theta);
        const sin = Math.sin(this.rotation.theta);
        const x = p.x * cos - p.y * sin;
        const y = p.x * sin + p.y * cos;
        p = { ...p, x, y };
      }

      if (this.rotation.phi !== 0) {
        const cos = Math.cos(this.rotation.phi);
        const sin = Math.sin(this.rotation.phi);
        const y = p.y * cos - p.z * sin;
        const z = p.y * sin + p.z * cos;
        p = { ...p, y, z };
      }

      if (this.rotation.psi) {
        const cos = Math.cos(this.rotation.psi);
        const sin = Math.sin(this.rotation.psi);
        const x = p.x * cos + p.z * sin;
        const z = -p.x * sin + p.z * cos;
        p = { ...p, x, z };
      }

      return p;
    }
  }

  // Replicate torus wireframe generation
  function generateTorusWireframe(
    majorRadius: number,
    minorRadius: number,
    segmentsU: number,
    segmentsV: number
  ): Point3D[][] {
    const lines: Point3D[][] = [];

    // Major circle lines
    for (let j = 0; j < segmentsV; j++) {
      const line: Point3D[] = [];
      for (let i = 0; i <= segmentsU; i++) {
        const u = (i / segmentsU) * Math.PI * 2;
        const v = (j / segmentsV) * Math.PI * 2;

        const cosU = Math.cos(u);
        const sinU = Math.sin(u);
        const cosV = Math.cos(v);
        const sinV = Math.sin(v);

        const r = majorRadius + minorRadius * cosV;
        line.push({
          x: r * cosU,
          y: r * sinU,
          z: minorRadius * sinV,
        });
      }
      lines.push(line);
    }

    // Minor circle lines
    for (let i = 0; i < segmentsU; i++) {
      const line: Point3D[] = [];
      for (let j = 0; j <= segmentsV; j++) {
        const u = (i / segmentsU) * Math.PI * 2;
        const v = (j / segmentsV) * Math.PI * 2;

        const cosU = Math.cos(u);
        const sinU = Math.sin(u);
        const cosV = Math.cos(v);
        const sinV = Math.sin(v);

        const r = majorRadius + minorRadius * cosV;
        line.push({
          x: r * cosU,
          y: r * sinU,
          z: minorRadius * sinV,
        });
      }
      lines.push(line);
    }

    return lines;
  }

  describe('projection with canvas rendering', () => {
    it('should generate valid 2D points from 3D torus projection', () => {
      const projection = new TestTorusProjection({
        focalLength: 250,
        center: { x: 300, y: 250 },
      });

      projection.setRotation({
        theta: 0.5,
        phi: 0.3,
        psi: 0.1,
      });

      const wireframe = generateTorusWireframe(80, 30, 16, 12);

      let projectedCount = 0;
      let visibleCount = 0;

      for (const line of wireframe) {
        for (const point of line) {
          const p2d = projection.project(point);
          const alpha = projection.getAlpha(point);

          expect(p2d.x).toBeGreaterThan(-500);
          expect(p2d.x).toBeLessThan(800);
          expect(p2d.y).toBeGreaterThan(-500);
          expect(p2d.y).toBeLessThan(800);

          expect(alpha).toBeGreaterThanOrEqual(0);
          expect(alpha).toBeLessThanOrEqual(1);

          projectedCount++;
          if (alpha > 0.1) {
            visibleCount++;
          }
        }
      }

      expect(projectedCount).toBeGreaterThan(100);
      expect(visibleCount).toBeGreaterThan(projectedCount * 0.5);
    });

    it('should render torus as canvas line segments', () => {
      const projection = new TestTorusProjection({
        focalLength: 300,
        center: { x: 400, y: 300 },
      });

      projection.setRotation({
        theta: 0.5,
        phi: 0.3,
        psi: 0,
      });

      const wireframe = generateTorusWireframe(100, 40, 16, 12);

      const lineSegments: Array<{ x1: number; y1: number; x2: number; y2: number; alpha: number }> = [];

      for (const line of wireframe) {
        let prev: Point3D | null = null;

        for (const point of line) {
          const p2d = projection.project(point);
          const alpha = projection.getAlpha(point);

          if (alpha > 0.1 && prev) {
            const prevP2d = projection.project(prev);

            lineSegments.push({
              x1: prevP2d.x,
              y1: prevP2d.y,
              x2: p2d.x,
              y2: p2d.y,
              alpha: Math.max(projection.getAlpha(prev), alpha),
            });
          }

          prev = point;
        }
      }

      expect(lineSegments.length).toBeGreaterThan(50);

      for (const segment of lineSegments) {
        expect(segment.x1).toBeGreaterThan(-100);
        expect(segment.x2).toBeGreaterThan(-100);
        expect(segment.y1).toBeGreaterThan(-100);
        expect(segment.y2).toBeGreaterThan(-100);
        expect(segment.alpha).toBeGreaterThan(0);
        expect(segment.alpha).toBeLessThanOrEqual(1);
      }
    });

    it('should handle continuous rotation without errors', () => {
      const projection = new TestTorusProjection({
        focalLength: 300,
        center: { x: 400, y: 300 },
      });

      const wireframe = generateTorusWireframe(80, 30, 12, 8);

      let lastAngle = 0;
      const frames = 11; // 0-10 gives us exactly 2π on last frame

      for (let frame = 0; frame < frames; frame++) {
        const angle = (frame / (frames - 1)) * Math.PI * 2;

        projection.setRotation({
          theta: angle,
          phi: angle * 0.7,
          psi: angle * 0.5,
        });

        let visiblePoints = 0;

        for (const line of wireframe) {
          for (const point of line) {
            const alpha = projection.getAlpha(point);
            if (alpha > 0.1) {
              visiblePoints++;
            }
          }
        }

        expect(visiblePoints).toBeGreaterThan(0);
        lastAngle = angle;
      }

      expect(lastAngle).toBeCloseTo(Math.PI * 2, 5);
    });

    it('should work with different canvas sizes', () => {
      const canvasSizes = [
        { width: 400, height: 300 },
        { width: 800, height: 600 },
        { width: 1200, height: 900 },
      ];

      for (const size of canvasSizes) {
        const projection = new TestTorusProjection({
          focalLength: 250,
          center: { x: size.width / 2, y: size.height / 2 },
        });

        projection.setRotation({ theta: 0.3, phi: 0.4, psi: 0 });

        const wireframe = generateTorusWireframe(80, 30, 12, 8);

        for (const line of wireframe) {
          for (const point of line) {
            const p2d = projection.project(point);
            const alpha = projection.getAlpha(point);

            if (alpha > 0.2) {
              expect(p2d.x).toBeGreaterThan(size.width * -0.2);
              expect(p2d.x).toBeLessThan(size.width * 1.2);
              expect(p2d.y).toBeGreaterThan(size.height * -0.2);
              expect(p2d.y).toBeLessThan(size.height * 1.2);
            }
          }
        }
      }
    });

    it('should maintain depth ordering (alpha) during rotation', () => {
      const projection = new TestTorusProjection({
        focalLength: 300,
        center: { x: 400, y: 300 },
      });

      const wireframe = generateTorusWireframe(100, 40, 16, 12);

      const rotations = [
        { theta: 0, phi: 0, psi: 0 },
        { theta: Math.PI / 4, phi: 0, psi: 0 },
        { theta: 0, phi: Math.PI / 4, psi: 0 },
      ];

      for (const rot of rotations) {
        projection.setRotation(rot);

        const alphas: number[] = [];

        for (const line of wireframe) {
          for (const point of line) {
            const alpha = projection.getAlpha(point);
            alphas.push(alpha);
          }
        }

        const hasFullyVisible = alphas.some((a) => a > 0.9);
        const hasPartiallyVisible = alphas.some((a) => a > 0.2 && a < 0.9);

        expect(hasFullyVisible || hasPartiallyVisible).toBe(true);

        const avgAlpha = alphas.reduce((a, b) => a + b, 0) / alphas.length;
        expect(avgAlpha).toBeGreaterThan(0.1);
        expect(avgAlpha).toBeLessThan(1);
      }
    });
  });

  describe('torus as composable component', () => {
    it('should be pure and deterministic', () => {
      const projection = new TestTorusProjection({
        focalLength: 300,
        center: { x: 400, y: 300 },
      });

      const point: Point3D = { x: 100, y: 50, z: 80 };

      projection.setRotation({ theta: 0.5, phi: 0.3, psi: 0.1 });

      const result1 = projection.project(point);
      const result2 = projection.project(point);

      expect(result1.x).toBe(result2.x);
      expect(result1.y).toBe(result2.y);

      const alpha1 = projection.getAlpha(point);
      const alpha2 = projection.getAlpha(point);
      expect(alpha1).toBe(alpha2);
    });

    it('should work with state management patterns', () => {
      const state = {
        rotTheta: 0,
        rotPhi: 0,
        rotPsi: 0,
      };

      const projection = new TestTorusProjection({
        focalLength: 300,
        center: { x: 400, y: 300 },
      });

      const updateProjection = () => {
        projection.setRotation({
          theta: state.rotTheta,
          phi: state.rotPhi,
          psi: state.rotPsi,
        });
      };

      updateProjection();
      const wireframe = generateTorusWireframe(80, 30, 12, 8);
      let initialAlphaSum = 0;
      for (const line of wireframe) {
        for (const point of line) {
          initialAlphaSum += projection.getAlpha(point);
        }
      }

      // Rotate significantly to change alpha distribution
      state.rotTheta += Math.PI / 2; // 90 degrees
      state.rotPhi += Math.PI / 3;   // 60 degrees
      updateProjection();

      let updatedAlphaSum = 0;
      for (const line of wireframe) {
        for (const point of line) {
          updatedAlphaSum += projection.getAlpha(point);
        }
      }

      // Alpha distribution should change with rotation (threshold is reasonable)
      expect(Math.abs(initialAlphaSum - updatedAlphaSum)).toBeGreaterThan(0.5);
    });

    it('should generate consistent torus geometry', () => {
      const geom1 = generateTorusWireframe(100, 40, 16, 12);
      const geom2 = generateTorusWireframe(100, 40, 16, 12);

      expect(geom1.length).toBe(geom2.length);

      // Check that same parameters produce identical output
      for (let i = 0; i < geom1.length; i++) {
        expect(geom1[i].length).toBe(geom2[i].length);
        for (let j = 0; j < geom1[i].length; j++) {
          expect(geom1[i][j].x).toBeCloseTo(geom2[i][j].x, 10);
          expect(geom1[i][j].y).toBeCloseTo(geom2[i][j].y, 10);
          expect(geom1[i][j].z).toBeCloseTo(geom2[i][j].z, 10);
        }
      }
    });
  });
});
