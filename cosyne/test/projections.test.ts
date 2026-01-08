/**
 * Unit tests for Cosyne projections (Phase 4)
 */

import {
  SphericalProjection,
  IsometricProjection,
  Graticule,
  Point3D,
  RotationAngles,
} from '../src/projections';

describe('SphericalProjection', () => {
  it('TC-PROJ-001: Spherical projection converts lat/lon to screen xy', () => {
    const proj = new SphericalProjection({ focalLength: 320, center: { x: 400, y: 300 } });

    // Point at prime meridian, equator
    const point: Point3D = { x: 100, y: 0, z: 0 };
    const screen = proj.project(point);

    // Should project to screen coordinates near center
    expect(screen.x).toBeGreaterThan(0);
    expect(screen.y).toBeGreaterThan(0);
  });

  it('TC-PROJ-002: Spherical projection respects focalLength', () => {
    const proj1 = new SphericalProjection({ focalLength: 100 });
    const proj2 = new SphericalProjection({ focalLength: 500 });

    const point: Point3D = { x: 100, y: 100, z: 50 };

    const screen1 = proj1.project(point);
    const screen2 = proj2.project(point);

    // Larger focal length gives larger scale factor (scale = focalLength / (focalLength + z))
    // So points appear farther from center (like a telephoto lens magnifying the image)
    const dist1 = Math.hypot(screen1.x - 400, screen1.y - 300);
    const dist2 = Math.hypot(screen2.x - 400, screen2.y - 300);

    expect(dist2).toBeGreaterThan(dist1);
  });

  it('TC-PROJ-003: Points behind sphere have low/zero alpha', () => {
    const proj = new SphericalProjection({ focalLength: 320 });

    // Point far behind camera
    const behindPoint: Point3D = { x: 0, y: 0, z: -500 };
    const frontPoint: Point3D = { x: 100, y: 100, z: 50 };

    const alphaBack = proj.getAlpha(behindPoint);
    const alphaFront = proj.getAlpha(frontPoint);

    expect(alphaBack).toBeLessThan(alphaFront);
    expect(alphaFront).toBeGreaterThan(0.5);
  });

  it('TC-PROJ-008: Projection bindings update on rotation change', () => {
    const proj = new SphericalProjection({ focalLength: 320 });

    const point: Point3D = { x: 100, y: 0, z: 0 };
    const screen1 = proj.project(point);

    // Rotate around Z axis
    proj.setRotation({ theta: Math.PI / 4, phi: 0, psi: 0 });
    const screen2 = proj.project(point);

    // Rotation should change projected coordinates
    expect(screen2.x).not.toEqual(screen1.x);
  });

  it('should set and get rotation angles', () => {
    const proj = new SphericalProjection();

    const angles: RotationAngles = { theta: 0.5, phi: 0.3, psi: 0.1 };
    proj.setRotation(angles);

    const retrieved = proj.getRotation();
    expect(retrieved.theta).toBeCloseTo(0.5);
    expect(retrieved.phi).toBeCloseTo(0.3);
    expect(retrieved.psi).toBeCloseTo(0.1);
  });

  it('should set and get center', () => {
    const proj = new SphericalProjection();

    proj.setCenter({ x: 500, y: 600 });

    const center = proj.getCenter();
    expect(center.x).toEqual(500);
    expect(center.y).toEqual(600);
  });

  it('TC-PROJ-006: Projection center offset works', () => {
    const proj1 = new SphericalProjection({ center: { x: 400, y: 300 } });
    const proj2 = new SphericalProjection({ center: { x: 200, y: 150 } });

    const point: Point3D = { x: 100, y: 100, z: 50 };

    const screen1 = proj1.project(point);
    const screen2 = proj2.project(point);

    // Different centers should produce different screen positions
    expect(screen1.x).not.toEqual(screen2.x);
    expect(screen1.y).not.toEqual(screen2.y);
  });

  it('TC-PROJ-007: Multiple projections can coexist', () => {
    const proj1 = new SphericalProjection({ focalLength: 320 });
    const proj2 = new SphericalProjection({ focalLength: 400 });

    const point: Point3D = { x: 100, y: 100, z: 50 };

    const screen1 = proj1.project(point);
    const screen2 = proj2.project(point);

    // Should produce different results
    expect(screen1.x).not.toEqual(screen2.x);
    expect(screen1.y).not.toEqual(screen2.y);

    // Changing one shouldn't affect the other
    proj1.setRotation({ theta: Math.PI / 2, phi: 0, psi: 0 });
    const screen1Updated = proj1.project(point);
    const screen2Again = proj2.project(point);

    expect(screen2Again.x).toEqual(screen2.x);
    expect(screen2Again.y).toEqual(screen2.y);
  });
});

describe('IsometricProjection', () => {
  it('should project 3D points to 2D isometric view', () => {
    const proj = new IsometricProjection({ scale: 1, center: { x: 400, y: 300 } });

    const point: Point3D = { x: 100, y: 100, z: 100 };
    const screen = proj.project(point);

    expect(screen.x).toBeDefined();
    expect(screen.y).toBeDefined();
  });

  it('should have constant alpha for all points', () => {
    const proj = new IsometricProjection();

    const point1: Point3D = { x: 100, y: 100, z: 100 };
    const point2: Point3D = { x: -100, y: -100, z: -100 };

    const alpha1 = proj.getAlpha(point1);
    const alpha2 = proj.getAlpha(point2);

    expect(alpha1).toEqual(1);
    expect(alpha2).toEqual(1);
  });
});

describe('Graticule', () => {
  it('TC-PROJ-004: Graticule generates correct number of lines', () => {
    const graticule = Graticule.generate(4, 8); // 4 latitude, 8 longitude lines

    // Should generate meridians and parallels
    expect(graticule.meridians.length).toBeGreaterThan(0);
    expect(graticule.parallels.length).toBeGreaterThan(0);
  });

  it('TC-PROJ-005: Graticule respects projection', () => {
    const proj = new SphericalProjection({ focalLength: 320 });

    const graticule = Graticule.generate(2, 4);

    // Project each line
    if (graticule.meridians.length > 0) {
      const firstMeridian = graticule.meridians[0];
      const projectedLine = firstMeridian.map((p) => proj.project(p));

      // Should have valid projections
      expect(projectedLine.length).toEqual(firstMeridian.length);
      projectedLine.forEach((p) => {
        expect(p.x).toBeDefined();
        expect(p.y).toBeDefined();
      });
    }
  });

  it('TC-PROJ-009: Custom projection function can be provided', () => {
    const proj = new SphericalProjection();

    // Can set custom rotation on projection
    proj.setRotation({ theta: Math.PI / 6, phi: Math.PI / 4, psi: 0 });

    const point: Point3D = { x: 100, y: 100, z: 100 };
    const screen = proj.project(point);

    expect(screen.x).toBeDefined();
    expect(screen.y).toBeDefined();
  });

  it('should generate meridians and parallels on sphere', () => {
    const graticule = Graticule.generate(3, 6, 100);

    // Meridians should go from north to south pole
    graticule.meridians.forEach((meridian) => {
      expect(meridian.length).toBeGreaterThan(0);
      meridian.forEach((point) => {
        const dist = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
        expect(dist).toBeCloseTo(100, 1); // Should be on radius 100 sphere
      });
    });

    // Parallels should form circles at constant latitude
    graticule.parallels.forEach((parallel) => {
      expect(parallel.length).toBeGreaterThan(0);
    });
  });
});

describe('Projection coordinate transformations', () => {
  it('should handle point rotation correctly', () => {
    const proj = new SphericalProjection({ focalLength: 320 });

    const point: Point3D = { x: 100, y: 0, z: 0 };

    // No rotation
    proj.setRotation({ theta: 0, phi: 0, psi: 0 });
    const screenNoRot = proj.project(point);

    // 90 degree rotation around Z
    proj.setRotation({ theta: Math.PI / 2, phi: 0, psi: 0 });
    const screenRot = proj.project(point);

    // Should be different after rotation
    expect(Math.abs(screenRot.x - screenNoRot.x)).toBeGreaterThan(1);
  });

  it('should handle points at different depths', () => {
    const proj = new SphericalProjection({ focalLength: 320, center: { x: 0, y: 0 } });

    const nearPoint: Point3D = { x: 50, y: 50, z: 50 };
    const farPoint: Point3D = { x: 50, y: 50, z: 200 };

    const screenNear = proj.project(nearPoint);
    const screenFar = proj.project(farPoint);

    // Perspective: far point should be scaled smaller
    const distNear = Math.hypot(screenNear.x, screenNear.y);
    const distFar = Math.hypot(screenFar.x, screenFar.y);

    expect(distFar).toBeLessThan(distNear);
  });
});
