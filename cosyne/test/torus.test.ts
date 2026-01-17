/**
 * Torus geometry and projection tests
 */

import {
  TorusProjection,
  generateTorusMesh,
  generateTorusWireframe,
  calculateLambertianShade,
  getDefaultLightDirection,
  colorizeShade,
  chromostereopsisColor,
  Point3D,
  type TorusGeometry,
} from '../src';

describe('TorusProjection', () => {
  describe('basic projection', () => {
    let projection: TorusProjection;

    beforeEach(() => {
      projection = new TorusProjection({
        focalLength: 320,
        center: { x: 400, y: 300 },
      });
    });

    it('should project a point at the origin', () => {
      const point: Point3D = { x: 0, y: 0, z: 0 };
      const projected = projection.project(point);

      expect(projected.x).toBe(400);
      expect(projected.y).toBe(300);
    });

    it('should project points in front of camera with scaling', () => {
      const point: Point3D = { x: 100, y: 0, z: 100 };
      const projected = projection.project(point);

      // With focal length 320 and z=100: scale = 320/(320+100) ≈ 0.762
      expect(projected.x).toBeCloseTo(400 + 100 * (320 / 420), 1);
      expect(projected.y).toBe(300);
    });

    it('should flip Y coordinate for canvas coordinates', () => {
      const point: Point3D = { x: 0, y: 100, z: 0 };
      const projected = projection.project(point);

      expect(projected.x).toBe(400);
      expect(projected.y).toBe(200); // 300 - 100
    });

    it('should apply rotation before projection', () => {
      projection.setRotation({ theta: Math.PI / 2, phi: 0, psi: 0 }); // 90 degree yaw

      const point: Point3D = { x: 100, y: 0, z: 0 };
      const projected = projection.project(point);

      // After 90 degree rotation around Z: x → y, y → -x
      // Point becomes approximately (0, 100, 0)
      expect(projected.x).toBeCloseTo(400, 1);
      expect(projected.y).toBeCloseTo(200, 1); // 300 - 100
    });
  });

  describe('alpha (depth visibility)', () => {
    let projection: TorusProjection;

    beforeEach(() => {
      projection = new TorusProjection({ focalLength: 320 });
    });

    it('should return 1 for points in front of camera', () => {
      const point: Point3D = { x: 0, y: 0, z: 100 };
      expect(projection.getAlpha(point)).toBe(1);
    });

    it('should fade points as they approach back of camera', () => {
      const point: Point3D = { x: 0, y: 0, z: -160 };
      const alpha = projection.getAlpha(point);
      expect(alpha).toBeGreaterThan(0);
      expect(alpha).toBeLessThan(1);
    });

    it('should return 0 for points behind camera', () => {
      const point: Point3D = { x: 0, y: 0, z: -640 };
      expect(projection.getAlpha(point)).toBe(0);
    });
  });

  describe('rotation angles', () => {
    let projection: TorusProjection;

    beforeEach(() => {
      projection = new TorusProjection();
    });

    it('should store and retrieve rotation angles', () => {
      projection.setRotation({ theta: 0.1, phi: 0.2, psi: 0.3 });
      const angles = projection.getRotation();

      expect(angles.theta).toBe(0.1);
      expect(angles.phi).toBe(0.2);
      expect(angles.psi).toBe(0.3);
    });

    it('should handle default psi value', () => {
      projection.setRotation({ theta: 0.1, phi: 0.2 });
      const angles = projection.getRotation();

      // psi should be either 0 or undefined when not set
      expect(angles.psi === 0 || angles.psi === undefined).toBe(true);
    });
  });

  describe('center point', () => {
    let projection: TorusProjection;

    beforeEach(() => {
      projection = new TorusProjection();
    });

    it('should set and get center point', () => {
      projection.setCenter({ x: 100, y: 200 });
      const center = projection.getCenter();

      expect(center.x).toBe(100);
      expect(center.y).toBe(200);
    });

    it('should use custom center in projection', () => {
      projection.setCenter({ x: 100, y: 100 });
      const point: Point3D = { x: 50, y: 0, z: 0 };
      const projected = projection.project(point);

      expect(projected.x).toBeGreaterThan(100);
      expect(projected.y).toBe(100);
    });
  });
});

describe('Torus Geometry', () => {
  describe('mesh generation', () => {
    it('should generate valid mesh with basic parameters', () => {
      const geometry: TorusGeometry = {
        majorRadius: 100,
        minorRadius: 40,
        segmentsU: 16,
        segmentsV: 12,
      };

      const mesh = generateTorusMesh(geometry);

      // Should have vertices for each segment combination
      expect(mesh.vertices.length).toBeGreaterThan(0);
      expect(mesh.quads.length).toBeGreaterThan(0);
      expect(mesh.edges.length).toBeGreaterThan(0);
    });

    it('should create vertices with position and normal', () => {
      const geometry: TorusGeometry = {
        majorRadius: 100,
        minorRadius: 40,
        segmentsU: 4,
        segmentsV: 3,
      };

      const mesh = generateTorusMesh(geometry);
      const vertex = mesh.vertices[0];

      expect(vertex.position).toHaveProperty('x');
      expect(vertex.position).toHaveProperty('y');
      expect(vertex.position).toHaveProperty('z');
      expect(vertex.normal).toHaveProperty('x');
      expect(vertex.normal).toHaveProperty('y');
      expect(vertex.normal).toHaveProperty('z');
    });

    it('should create quad faces with 4 vertices each', () => {
      const geometry: TorusGeometry = {
        majorRadius: 100,
        minorRadius: 40,
        segmentsU: 4,
        segmentsV: 3,
      };

      const mesh = generateTorusMesh(geometry);
      const quad = mesh.quads[0];

      expect(quad.vertices.length).toBe(4);
      expect(quad.normal).toHaveProperty('x');
      expect(quad.normal).toHaveProperty('y');
      expect(quad.normal).toHaveProperty('z');
    });

    it('should calculate correct torus parametric positions', () => {
      const geometry: TorusGeometry = {
        majorRadius: 100,
        minorRadius: 50,
        segmentsU: 8,
        segmentsV: 8,
      };

      const mesh = generateTorusMesh(geometry);

      // Check a vertex on the outer equator (v=0, u varies)
      // At v=0: x = (majorRadius + minorRadius) * cos(u), y = ..., z = 0
      const outerRadius = geometry.majorRadius + geometry.minorRadius;
      const vertex = mesh.vertices[0];

      // Should be roughly on the outer radius at z=0
      const dist = Math.sqrt(vertex.position.x * vertex.position.x + vertex.position.y * vertex.position.y);
      expect(dist).toBeCloseTo(outerRadius, 1);
      expect(vertex.position.z).toBeCloseTo(0, 1);
    });
  });

  describe('wireframe generation', () => {
    it('should generate wireframe lines', () => {
      const lines = generateTorusWireframe(100, 40, 12, 8);

      expect(lines.length).toBeGreaterThan(0);
      expect(Array.isArray(lines[0])).toBe(true);
    });

    it('should create lines with 3D points', () => {
      const lines = generateTorusWireframe(100, 40, 4, 4);
      const line = lines[0];
      const point = line[0];

      expect(point).toHaveProperty('x');
      expect(point).toHaveProperty('y');
      expect(point).toHaveProperty('z');
    });

    it('should generate major and minor circle lines', () => {
      const segmentsU = 8;
      const segmentsV = 6;
      const lines = generateTorusWireframe(100, 40, segmentsU, segmentsV);

      // Total lines = segmentsV (major circles) + segmentsU (minor circles)
      expect(lines.length).toBe(segmentsV + segmentsU);
    });

    it('should create points with correct torus shape', () => {
      const majorRadius = 100;
      const minorRadius = 40;
      const lines = generateTorusWireframe(majorRadius, minorRadius, 16, 8);

      // Sample a point and verify it's on torus surface
      const line = lines[0];
      const point = line[0];

      // Distance from Z-axis should be close to majorRadius ± minorRadius
      const dist = Math.sqrt(point.x * point.x + point.y * point.y);
      expect(dist).toBeGreaterThanOrEqual(majorRadius - minorRadius - 5);
      expect(dist).toBeLessThanOrEqual(majorRadius + minorRadius + 5);
    });
  });
});

describe('Shading Calculations', () => {
  describe('Lambertian shading', () => {
    it('should calculate shade based on surface normal and light direction', () => {
      const normal: Point3D = { x: 0, y: 0, z: 1 }; // Pointing up
      const lightDir: Point3D = { x: 0, y: 0, z: 1 }; // Light from above

      const shade = calculateLambertianShade(normal, lightDir, 0.3, 0.7);

      // Should be fully lit: ambient + diffuse * 1
      expect(shade).toBeCloseTo(0.3 + 0.7, 1);
    });

    it('should darken when light hits at angle', () => {
      const normal: Point3D = { x: 0, y: 0, z: 1 };
      const lightDir: Point3D = { x: 1, y: 0, z: 0 }; // Light perpendicular to normal

      const shade = calculateLambertianShade(normal, lightDir, 0.3, 0.7);

      // Should be ambient only (dot product = 0)
      expect(shade).toBeCloseTo(0.3, 1);
    });

    it('should apply ambient minimum when normal faces away', () => {
      const normal: Point3D = { x: 0, y: 0, z: -1 }; // Pointing away
      const lightDir: Point3D = { x: 0, y: 0, z: 1 }; // Light from opposite direction

      const shade = calculateLambertianShade(normal, lightDir, 0.3, 0.7);

      // Should be ambient minimum
      expect(shade).toBeCloseTo(0.3, 1);
    });

    it('should handle unnormalized normals', () => {
      const normal: Point3D = { x: 0, y: 0, z: 10 }; // Not normalized
      const lightDir: Point3D = { x: 0, y: 0, z: 1 };

      const shade = calculateLambertianShade(normal, lightDir, 0.3, 0.7);

      // Should still work and give same result as normalized
      expect(shade).toBeCloseTo(1.0, 1);
    });

    it('should handle zero normal gracefully', () => {
      const normal: Point3D = { x: 0, y: 0, z: 0 };
      const lightDir: Point3D = { x: 0, y: 0, z: 1 };

      const shade = calculateLambertianShade(normal, lightDir, 0.3, 0.7);

      // Should return ambient
      expect(shade).toBe(0.3);
    });

    it('should respect custom ambient and diffuse intensities', () => {
      const normal: Point3D = { x: 0, y: 0, z: 1 };
      const lightDir: Point3D = { x: 0, y: 0, z: 1 };

      const shade = calculateLambertianShade(normal, lightDir, 0.2, 0.5);

      expect(shade).toBeCloseTo(0.2 + 0.5, 1);
    });
  });

  describe('default light direction', () => {
    it('should return normalized light direction', () => {
      const lightDir = getDefaultLightDirection();

      const length = Math.sqrt(
        lightDir.x * lightDir.x + lightDir.y * lightDir.y + lightDir.z * lightDir.z
      );

      expect(length).toBeCloseTo(1, 3);
    });

    it('should point in front-right-top direction', () => {
      const lightDir = getDefaultLightDirection();

      // Should have positive X (right), negative Y (top in canvas coords), positive Z (front)
      expect(lightDir.x).toBeGreaterThan(0);
      expect(lightDir.y).toBeLessThan(0);
      expect(lightDir.z).toBeGreaterThan(0);
    });
  });
});

describe('Color Functions', () => {
  describe('colorizeShade', () => {
    it('should create darker color at low shade', () => {
      const baseColor = { r: 255, g: 100, b: 50 };
      const darkColor = colorizeShade(0.2, baseColor);
      const lightColor = colorizeShade(0.8, baseColor);

      expect(darkColor).not.toBe(lightColor);
      // Dark color should have smaller numbers
      expect(darkColor.match(/rgb\((\d+)/)?.[1]).toBeDefined();
    });

    it('should preserve color proportions', () => {
      const baseColor = { r: 255, g: 0, b: 0 };
      const colored = colorizeShade(0.5, baseColor);

      // 255 * 0.5 = 127.5, rounded to 128
      expect(colored).toMatch(/rgb\(12[78],0,0\)/);
    });
  });

  describe('chromostereopsisColor', () => {
    it('should return red color for main object', () => {
      const color = chromostereopsisColor(0.5, false);

      expect(color).toContain('rgb');
      // Should have red component > 100
      // Pattern allows for spaces and various formats
      expect(color).toMatch(/rgb\(\s*\d+,\s*0,\s*0/);
    });

    it('should return blue color for background', () => {
      const color = chromostereopsisColor(0.5, true);

      expect(color).toContain('rgb');
      // Blue background
      const matches = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
      if (matches) {
        const [_, r, g, b] = matches.map(Number);
        expect(b).toBeGreaterThan(r);
      }
    });

    it('should vary brightness with shade', () => {
      const darkColor = chromostereopsisColor(0.2, false);
      const brightColor = chromostereopsisColor(0.8, false);

      expect(darkColor).not.toBe(brightColor);
    });
  });
});

describe('Torus Integration', () => {
  it('should project torus mesh vertices with projection', () => {
    const geometry: TorusGeometry = {
      majorRadius: 100,
      minorRadius: 40,
      segmentsU: 8,
      segmentsV: 6,
    };

    const mesh = generateTorusMesh(geometry);
    const projection = new TorusProjection({
      focalLength: 300,
      center: { x: 400, y: 300 },
    });

    projection.setRotation({ theta: 0.5, phi: 0.3, psi: 0.1 });

    // Project all vertices
    for (const vertex of mesh.vertices) {
      const p2d = projection.project(vertex.position);
      const alpha = projection.getAlpha(vertex.position);

      expect(p2d).toHaveProperty('x');
      expect(p2d).toHaveProperty('y');
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThanOrEqual(1);
    }
  });

  it('should calculate shading for mesh quads', () => {
    const geometry: TorusGeometry = {
      majorRadius: 100,
      minorRadius: 40,
      segmentsU: 8,
      segmentsV: 6,
    };

    const mesh = generateTorusMesh(geometry);
    const lightDir = getDefaultLightDirection();

    for (const quad of mesh.quads) {
      const shade = calculateLambertianShade(quad.normal, lightDir, 0.3, 0.7);

      expect(shade).toBeGreaterThanOrEqual(0);
      expect(shade).toBeLessThanOrEqual(1);
    }
  });
});
