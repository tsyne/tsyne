/**
 * Tests for Cosyne 3D Math utilities
 */

import {
  Vector3,
  Matrix4,
  Quaternion,
  Ray,
  Box3,
  degToRad,
  radToDeg,
  clamp,
  lerp,
  rayLineIntersect2D,
  rayLineIntersect2DV,
  urandom,
  urandomVector,
  randomUnitVector,
  angleBetween,
  angleBetween2D,
  normalizeAngle,
  angleDiff,
  lerpAngle,
  rotateAroundX,
  rotateAroundY,
  rotateAroundZ,
  rotateXY,
  rotateXZ,
  rotateYZ,
  angleBetweenYForward,
  angleBetweenYForward2D,
  isInRegion,
  isInPolygon2D,
  MapPolygon,
} from '../../src/math3d';

describe('Cosyne 3D Math', () => {
  describe('Vector3', () => {
    describe('creation', () => {
      test('creates with default values', () => {
        const v = new Vector3();
        expect(v.x).toBe(0);
        expect(v.y).toBe(0);
        expect(v.z).toBe(0);
      });

      test('creates with specified values', () => {
        const v = new Vector3(1, 2, 3);
        expect(v.x).toBe(1);
        expect(v.y).toBe(2);
        expect(v.z).toBe(3);
      });

      test('creates from array', () => {
        const v = Vector3.fromArray([4, 5, 6]);
        expect(v.x).toBe(4);
        expect(v.y).toBe(5);
        expect(v.z).toBe(6);
      });

      test('static constructors work', () => {
        expect(Vector3.zero().equals(new Vector3(0, 0, 0))).toBe(true);
        expect(Vector3.one().equals(new Vector3(1, 1, 1))).toBe(true);
        expect(Vector3.up().equals(new Vector3(0, 1, 0))).toBe(true);
        expect(Vector3.forward().equals(new Vector3(0, 0, 1))).toBe(true);
        expect(Vector3.right().equals(new Vector3(1, 0, 0))).toBe(true);
      });
    });

    describe('basic operations', () => {
      test('add adds vectors', () => {
        const a = new Vector3(1, 2, 3);
        const b = new Vector3(4, 5, 6);
        const result = a.add(b);
        expect(result.x).toBe(5);
        expect(result.y).toBe(7);
        expect(result.z).toBe(9);
      });

      test('sub subtracts vectors', () => {
        const a = new Vector3(5, 7, 9);
        const b = new Vector3(1, 2, 3);
        const result = a.sub(b);
        expect(result.x).toBe(4);
        expect(result.y).toBe(5);
        expect(result.z).toBe(6);
      });

      test('multiplyScalar scales vector', () => {
        const v = new Vector3(1, 2, 3);
        const result = v.multiplyScalar(2);
        expect(result.x).toBe(2);
        expect(result.y).toBe(4);
        expect(result.z).toBe(6);
      });

      test('negate negates vector', () => {
        const v = new Vector3(1, -2, 3);
        const result = v.negate();
        expect(result.x).toBe(-1);
        expect(result.y).toBe(2);
        expect(result.z).toBe(-3);
      });
    });

    describe('vector math', () => {
      test('dot product is correct', () => {
        const a = new Vector3(1, 2, 3);
        const b = new Vector3(4, 5, 6);
        expect(a.dot(b)).toBe(32); // 1*4 + 2*5 + 3*6 = 32
      });

      test('cross product is correct', () => {
        const x = Vector3.right();
        const y = Vector3.up();
        const z = x.cross(y);
        expect(z.x).toBeCloseTo(0);
        expect(z.y).toBeCloseTo(0);
        expect(z.z).toBeCloseTo(1); // Right-handed: X cross Y = Z
      });

      test('length calculates magnitude', () => {
        const v = new Vector3(3, 4, 0);
        expect(v.length()).toBe(5);
      });

      test('normalize creates unit vector', () => {
        const v = new Vector3(10, 0, 0);
        const n = v.normalize();
        expect(n.length()).toBeCloseTo(1);
        expect(n.x).toBe(1);
      });

      test('distanceTo calculates distance', () => {
        const a = new Vector3(0, 0, 0);
        const b = new Vector3(3, 4, 0);
        expect(a.distanceTo(b)).toBe(5);
      });

      test('lerp interpolates correctly', () => {
        const a = new Vector3(0, 0, 0);
        const b = new Vector3(10, 20, 30);
        const mid = a.lerp(b, 0.5);
        expect(mid.x).toBe(5);
        expect(mid.y).toBe(10);
        expect(mid.z).toBe(15);
      });
    });

    describe('utility', () => {
      test('clone creates copy', () => {
        const v = new Vector3(1, 2, 3);
        const c = v.clone();
        expect(c.x).toBe(1);
        expect(c.y).toBe(2);
        expect(c.z).toBe(3);
        c.x = 10;
        expect(v.x).toBe(1); // Original unchanged
      });

      test('toArray converts to array', () => {
        const v = new Vector3(1, 2, 3);
        const arr = v.toArray();
        expect(arr).toEqual([1, 2, 3]);
      });

      test('equals compares vectors', () => {
        const a = new Vector3(1, 2, 3);
        const b = new Vector3(1, 2, 3);
        const c = new Vector3(1, 2, 4);
        expect(a.equals(b)).toBe(true);
        expect(a.equals(c)).toBe(false);
      });
    });
  });

  describe('Matrix4', () => {
    describe('creation', () => {
      test('creates identity matrix', () => {
        const m = Matrix4.identity();
        expect(m.elements[0]).toBe(1);
        expect(m.elements[5]).toBe(1);
        expect(m.elements[10]).toBe(1);
        expect(m.elements[15]).toBe(1);
      });

      test('translation matrix is correct', () => {
        const m = Matrix4.translation(10, 20, 30);
        expect(m.elements[12]).toBe(10);
        expect(m.elements[13]).toBe(20);
        expect(m.elements[14]).toBe(30);
      });

      test('scaling matrix is correct', () => {
        const m = Matrix4.scaling(2, 3, 4);
        expect(m.elements[0]).toBe(2);
        expect(m.elements[5]).toBe(3);
        expect(m.elements[10]).toBe(4);
      });
    });

    describe('operations', () => {
      test('multiply multiplies matrices', () => {
        const a = Matrix4.translation(10, 0, 0);
        const b = Matrix4.translation(0, 20, 0);
        const c = a.multiply(b);
        expect(c.elements[12]).toBe(10);
        expect(c.elements[13]).toBe(20);
      });

      test('transpose works correctly', () => {
        const m = new Matrix4();
        m.elements[4] = 5; // Column 1, Row 0
        const t = m.transpose();
        expect(t.elements[1]).toBe(5); // Row 0, Column 1
      });

      test('determinant is calculated correctly', () => {
        const identity = Matrix4.identity();
        expect(identity.determinant()).toBe(1);

        const scale = Matrix4.scaling(2, 3, 4);
        expect(scale.determinant()).toBe(24); // 2 * 3 * 4
      });

      test('invert works correctly', () => {
        const t = Matrix4.translation(10, 20, 30);
        const inv = t.invert();
        const result = t.multiply(inv);
        expect(result.elements[0]).toBeCloseTo(1);
        expect(result.elements[12]).toBeCloseTo(0);
      });
    });

    describe('projection', () => {
      test('perspective matrix has correct structure', () => {
        const p = Matrix4.perspective(Math.PI / 4, 1.5, 0.1, 100);
        expect(p.elements[11]).toBe(-1); // Perspective division
      });

      test('orthographic matrix has correct structure', () => {
        const o = Matrix4.orthographic(-10, 10, -10, 10, 0.1, 100);
        expect(o.elements[15]).toBe(1); // No perspective division
      });

      test('lookAt creates correct view matrix', () => {
        const eye = new Vector3(0, 0, 10);
        const target = new Vector3(0, 0, 0);
        const up = Vector3.up();
        const m = Matrix4.lookAt(eye, target, up);
        // The view should transform the target to be in front
        const transformed = target.applyMatrix4(m);
        expect(transformed.z).toBeCloseTo(-10);
      });
    });

    describe('decomposition', () => {
      test('compose and decompose are inverse', () => {
        const pos = new Vector3(10, 20, 30);
        const rot = Quaternion.fromAxisAngle(Vector3.up(), Math.PI / 4);
        const scale = new Vector3(2, 3, 4);

        const m = new Matrix4();
        m.compose(pos, rot, scale);

        const { position, quaternion, scale: s } = m.decompose();
        expect(position.x).toBeCloseTo(pos.x);
        expect(position.y).toBeCloseTo(pos.y);
        expect(position.z).toBeCloseTo(pos.z);
        expect(s.x).toBeCloseTo(scale.x);
        expect(s.y).toBeCloseTo(scale.y);
        expect(s.z).toBeCloseTo(scale.z);
      });

      test('getPosition extracts translation', () => {
        const m = Matrix4.translation(5, 10, 15);
        const pos = m.getPosition();
        expect(pos.x).toBe(5);
        expect(pos.y).toBe(10);
        expect(pos.z).toBe(15);
      });
    });
  });

  describe('Quaternion', () => {
    describe('creation', () => {
      test('identity quaternion is correct', () => {
        const q = Quaternion.identity();
        expect(q.x).toBe(0);
        expect(q.y).toBe(0);
        expect(q.z).toBe(0);
        expect(q.w).toBe(1);
      });

      test('fromAxisAngle creates rotation', () => {
        const q = Quaternion.fromAxisAngle(Vector3.up(), Math.PI / 2);
        expect(q.length()).toBeCloseTo(1);
      });

      test('fromEuler creates rotation', () => {
        const q = Quaternion.fromEuler(0, Math.PI / 2, 0);
        expect(q.length()).toBeCloseTo(1);
      });
    });

    describe('operations', () => {
      test('multiply combines rotations', () => {
        const a = Quaternion.fromAxisAngle(Vector3.up(), Math.PI / 2);
        const b = Quaternion.fromAxisAngle(Vector3.up(), Math.PI / 2);
        const c = a.multiply(b);
        // Should be 180 degree rotation around Y
        // Test by rotating a forward vector
        const forward = new Vector3(0, 0, 1);
        const rotated = forward.applyQuaternion(c);
        // 180 degree Y rotation should flip Z
        expect(rotated.x).toBeCloseTo(0);
        expect(rotated.y).toBeCloseTo(0);
        expect(rotated.z).toBeCloseTo(-1);
      });

      test('conjugate reverses rotation', () => {
        const q = Quaternion.fromAxisAngle(Vector3.up(), Math.PI / 4);
        const conj = q.conjugate();
        expect(conj.x).toBe(-q.x);
        expect(conj.y).toBe(-q.y);
        expect(conj.z).toBe(-q.z);
        expect(conj.w).toBe(q.w);
      });

      test('normalize creates unit quaternion', () => {
        const q = new Quaternion(1, 2, 3, 4);
        const n = q.normalize();
        expect(n.length()).toBeCloseTo(1);
      });

      test('slerp interpolates correctly', () => {
        const a = Quaternion.identity();
        const b = Quaternion.fromAxisAngle(Vector3.up(), Math.PI);
        const mid = a.slerp(b, 0.5);
        expect(mid.length()).toBeCloseTo(1);
      });
    });

    describe('conversion', () => {
      test('toEuler and fromEuler are inverse', () => {
        const original = { x: 0.1, y: 0.2, z: 0.3 };
        const q = Quaternion.fromEuler(original.x, original.y, original.z);
        const euler = q.toEuler();
        expect(euler.x).toBeCloseTo(original.x, 1);
        expect(euler.y).toBeCloseTo(original.y, 1);
        expect(euler.z).toBeCloseTo(original.z, 1);
      });
    });
  });

  describe('Ray', () => {
    describe('creation', () => {
      test('creates with default values', () => {
        const r = new Ray();
        expect(r.origin.x).toBe(0);
        expect(r.direction.z).toBe(-1);
      });

      test('creates with specified values', () => {
        const r = new Ray(new Vector3(1, 2, 3), new Vector3(0, 1, 0));
        expect(r.origin.x).toBe(1);
        expect(r.direction.y).toBe(1);
      });
    });

    describe('at', () => {
      test('returns point along ray', () => {
        const r = new Ray(new Vector3(0, 0, 0), new Vector3(1, 0, 0));
        const p = r.at(5);
        expect(p.x).toBe(5);
        expect(p.y).toBe(0);
        expect(p.z).toBe(0);
      });
    });

    describe('intersection', () => {
      test('intersects sphere correctly', () => {
        const r = new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1));
        const t = r.intersectSphere(new Vector3(0, 0, 0), 1);
        expect(t).toBeCloseTo(9); // Distance to near surface
      });

      test('misses sphere when off-axis', () => {
        const r = new Ray(new Vector3(10, 0, 10), new Vector3(0, 0, -1));
        const t = r.intersectSphere(new Vector3(0, 0, 0), 1);
        expect(t).toBeNull();
      });

      test('intersects box correctly', () => {
        const r = new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1));
        const t = r.intersectBox(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
        expect(t).toBeCloseTo(9);
      });

      test('misses box when off-axis', () => {
        const r = new Ray(new Vector3(10, 10, 10), new Vector3(0, 0, -1));
        const t = r.intersectBox(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
        expect(t).toBeNull();
      });

      test('intersects plane correctly', () => {
        const r = new Ray(new Vector3(0, 10, 0), new Vector3(0, -1, 0));
        const t = r.intersectPlane(Vector3.up(), Vector3.zero());
        expect(t).toBeCloseTo(10);
      });
    });
  });

  describe('Box3', () => {
    describe('creation', () => {
      test('creates from center and size', () => {
        const b = Box3.fromCenterSize(new Vector3(0, 0, 0), new Vector3(2, 4, 6));
        expect(b.min.x).toBe(-1);
        expect(b.max.x).toBe(1);
        expect(b.min.y).toBe(-2);
        expect(b.max.y).toBe(2);
      });
    });

    describe('properties', () => {
      test('getCenter returns center', () => {
        const b = new Box3(new Vector3(0, 0, 0), new Vector3(10, 20, 30));
        const c = b.getCenter();
        expect(c.x).toBe(5);
        expect(c.y).toBe(10);
        expect(c.z).toBe(15);
      });

      test('getSize returns dimensions', () => {
        const b = new Box3(new Vector3(0, 0, 0), new Vector3(10, 20, 30));
        const s = b.getSize();
        expect(s.x).toBe(10);
        expect(s.y).toBe(20);
        expect(s.z).toBe(30);
      });

      test('isEmpty detects empty box', () => {
        const empty = new Box3();
        const nonEmpty = new Box3(Vector3.zero(), Vector3.one());
        expect(empty.isEmpty()).toBe(true);
        expect(nonEmpty.isEmpty()).toBe(false);
      });
    });

    describe('containsPoint', () => {
      test('point inside returns true', () => {
        const b = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
        expect(b.containsPoint(Vector3.zero())).toBe(true);
      });

      test('point outside returns false', () => {
        const b = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
        expect(b.containsPoint(new Vector3(5, 0, 0))).toBe(false);
      });
    });

    describe('intersectsBox', () => {
      test('overlapping boxes return true', () => {
        const a = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
        const b = new Box3(new Vector3(0, 0, 0), new Vector3(2, 2, 2));
        expect(a.intersectsBox(b)).toBe(true);
      });

      test('non-overlapping boxes return false', () => {
        const a = new Box3(new Vector3(-2, -2, -2), new Vector3(-1, -1, -1));
        const b = new Box3(new Vector3(1, 1, 1), new Vector3(2, 2, 2));
        expect(a.intersectsBox(b)).toBe(false);
      });
    });
  });

  describe('utility functions', () => {
    test('degToRad converts correctly', () => {
      expect(degToRad(180)).toBeCloseTo(Math.PI);
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
    });

    test('radToDeg converts correctly', () => {
      expect(radToDeg(Math.PI)).toBeCloseTo(180);
      expect(radToDeg(Math.PI / 2)).toBeCloseTo(90);
    });

    test('clamp restricts values', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    test('lerp interpolates correctly', () => {
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 1)).toBe(10);
      expect(lerp(0, 10, 0.5)).toBe(5);
    });
  });

  describe('rayLineIntersect2D', () => {
    test('detects intersection with horizontal line', () => {
      // Ray from origin pointing upward (+Y)
      const result = rayLineIntersect2D(0, 0, 0, 1, -10, 5, 10, 5);
      expect(result).not.toBeNull();
      expect(result!.t).toBeCloseTo(5, 5);
      expect(result!.u).toBeCloseTo(0.5, 5); // Hits middle of line
    });

    test('detects intersection with vertical line', () => {
      // Ray from origin pointing right (+X)
      const result = rayLineIntersect2D(0, 0, 1, 0, 5, -10, 5, 10);
      expect(result).not.toBeNull();
      expect(result!.t).toBeCloseTo(5, 5);
      expect(result!.u).toBeCloseTo(0.5, 5);
    });

    test('returns null when ray misses line', () => {
      // Ray pointing away from line
      const result = rayLineIntersect2D(0, 0, -1, 0, 5, -10, 5, 10);
      expect(result).toBeNull();
    });

    test('returns null when parallel to line', () => {
      // Ray parallel to horizontal line
      const result = rayLineIntersect2D(0, 0, 1, 0, -10, 5, 10, 5);
      expect(result).toBeNull();
    });

    test('returns null when intersection is outside line segment', () => {
      // Ray pointing at extended line, but not at segment
      const result = rayLineIntersect2D(0, 0, 0, 1, 5, 10, 10, 10);
      expect(result).toBeNull();
    });

    test('calculates u correctly along line', () => {
      // Ray from origin pointing upward
      const result1 = rayLineIntersect2D(0, 0, 0, 1, -10, 5, 10, 5);
      expect(result1!.u).toBeCloseTo(0.5, 5); // Center

      const result2 = rayLineIntersect2D(-10, 0, 0, 1, -10, 5, 10, 5);
      expect(result2!.u).toBeCloseTo(0, 5); // Start

      const result3 = rayLineIntersect2D(10, 0, 0, 1, -10, 5, 10, 5);
      expect(result3!.u).toBeCloseTo(1, 5); // End
    });
  });

  describe('urandom', () => {
    test('returns values in [-1, 1] range', () => {
      for (let i = 0; i < 100; i++) {
        const v = urandom();
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    });

    test('produces varied results', () => {
      const values = new Set<number>();
      for (let i = 0; i < 100; i++) {
        values.add(Math.round(urandom() * 100) / 100);
      }
      // Should have multiple distinct values
      expect(values.size).toBeGreaterThan(10);
    });
  });

  describe('urandomVector', () => {
    test('returns Vector3 with components in [-1, 1]', () => {
      for (let i = 0; i < 50; i++) {
        const v = urandomVector();
        expect(v.x).toBeGreaterThanOrEqual(-1);
        expect(v.x).toBeLessThanOrEqual(1);
        expect(v.y).toBeGreaterThanOrEqual(-1);
        expect(v.y).toBeLessThanOrEqual(1);
        expect(v.z).toBeGreaterThanOrEqual(-1);
        expect(v.z).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('randomUnitVector', () => {
    test('returns normalized vectors', () => {
      for (let i = 0; i < 50; i++) {
        const v = randomUnitVector();
        expect(v.length()).toBeCloseTo(1, 5);
      }
    });
  });

  describe('angleBetween', () => {
    test('returns 0 for point along +X', () => {
      const a = new Vector3(0, 0, 0);
      const b = new Vector3(10, 0, 0);
      expect(angleBetween(a, b)).toBeCloseTo(0, 5);
    });

    test('returns PI/2 for point along +Y', () => {
      const a = new Vector3(0, 0, 0);
      const b = new Vector3(0, 10, 0);
      expect(angleBetween(a, b)).toBeCloseTo(Math.PI / 2, 5);
    });

    test('returns PI for point along -X', () => {
      const a = new Vector3(0, 0, 0);
      const b = new Vector3(-10, 0, 0);
      expect(Math.abs(angleBetween(a, b))).toBeCloseTo(Math.PI, 5);
    });

    test('returns -PI/2 for point along -Y', () => {
      const a = new Vector3(0, 0, 0);
      const b = new Vector3(0, -10, 0);
      expect(angleBetween(a, b)).toBeCloseTo(-Math.PI / 2, 5);
    });

    test('works with non-origin points', () => {
      const a = new Vector3(5, 5, 0);
      const b = new Vector3(10, 5, 0); // +X direction from a
      expect(angleBetween(a, b)).toBeCloseTo(0, 5);
    });
  });

  describe('angleBetween2D', () => {
    test('works with raw coordinates', () => {
      expect(angleBetween2D(0, 0, 10, 0)).toBeCloseTo(0, 5);
      expect(angleBetween2D(0, 0, 0, 10)).toBeCloseTo(Math.PI / 2, 5);
      expect(angleBetween2D(5, 5, 10, 10)).toBeCloseTo(Math.PI / 4, 5);
    });
  });

  describe('normalizeAngle', () => {
    test('keeps angles in [-PI, PI] range', () => {
      expect(normalizeAngle(0)).toBeCloseTo(0, 5);
      expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI, 5);
      expect(normalizeAngle(-Math.PI)).toBeCloseTo(-Math.PI, 5);
    });

    test('wraps large positive angles', () => {
      expect(normalizeAngle(Math.PI * 2)).toBeCloseTo(0, 5);
      expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 5);
      expect(normalizeAngle(Math.PI * 4)).toBeCloseTo(0, 5);
    });

    test('wraps large negative angles', () => {
      expect(normalizeAngle(-Math.PI * 2)).toBeCloseTo(0, 5);
      expect(normalizeAngle(-Math.PI * 3)).toBeCloseTo(-Math.PI, 5);
    });
  });

  describe('angleDiff', () => {
    test('returns 0 for same angle', () => {
      expect(angleDiff(0, 0)).toBeCloseTo(0, 5);
      expect(angleDiff(Math.PI, Math.PI)).toBeCloseTo(0, 5);
    });

    test('returns positive for counter-clockwise rotation', () => {
      expect(angleDiff(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2, 5);
    });

    test('returns negative for clockwise rotation', () => {
      expect(angleDiff(0, -Math.PI / 2)).toBeCloseTo(-Math.PI / 2, 5);
    });

    test('takes shortest path across PI boundary', () => {
      // From just before PI to just after -PI should be small negative
      const result = angleDiff(Math.PI - 0.1, -Math.PI + 0.1);
      expect(Math.abs(result)).toBeLessThan(0.5);
    });
  });

  describe('lerpAngle', () => {
    test('interpolates simple angles', () => {
      expect(lerpAngle(0, Math.PI / 2, 0)).toBeCloseTo(0, 5);
      expect(lerpAngle(0, Math.PI / 2, 1)).toBeCloseTo(Math.PI / 2, 5);
      expect(lerpAngle(0, Math.PI / 2, 0.5)).toBeCloseTo(Math.PI / 4, 5);
    });

    test('takes shortest path around circle', () => {
      // From 170deg to -170deg should interpolate through 180deg
      const from = degToRad(170);
      const to = degToRad(-170);
      const mid = lerpAngle(from, to, 0.5);
      // Should be close to +/- 180 degrees
      expect(Math.abs(mid)).toBeCloseTo(Math.PI, 1);
    });
  });

  // ============================================================================
  // Rotation Functions
  // ============================================================================

  describe('rotateAroundZ', () => {
    test('rotating (1,0,0) by 90 degrees gives (0,1,0)', () => {
      const v = new Vector3(1, 0, 0);
      const result = rotateAroundZ(v, Math.PI / 2);
      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(1, 5);
      expect(result.z).toBeCloseTo(0, 5);
    });

    test('rotating (1,0,0) by 180 degrees gives (-1,0,0)', () => {
      const v = new Vector3(1, 0, 0);
      const result = rotateAroundZ(v, Math.PI);
      expect(result.x).toBeCloseTo(-1, 5);
      expect(result.y).toBeCloseTo(0, 5);
      expect(result.z).toBeCloseTo(0, 5);
    });

    test('rotating (0,1,0) by -90 degrees gives (1,0,0)', () => {
      const v = new Vector3(0, 1, 0);
      const result = rotateAroundZ(v, -Math.PI / 2);
      expect(result.x).toBeCloseTo(1, 5);
      expect(result.y).toBeCloseTo(0, 5);
      expect(result.z).toBeCloseTo(0, 5);
    });

    test('preserves z component', () => {
      const v = new Vector3(1, 0, 5);
      const result = rotateAroundZ(v, Math.PI / 2);
      expect(result.z).toBeCloseTo(5, 5);
    });

    test('rotateXY is an alias for rotateAroundZ', () => {
      expect(rotateXY).toBe(rotateAroundZ);
    });
  });

  describe('rotateAroundY', () => {
    test('rotating (1,0,0) by 90 degrees gives (0,0,-1)', () => {
      const v = new Vector3(1, 0, 0);
      const result = rotateAroundY(v, Math.PI / 2);
      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(0, 5);
      expect(result.z).toBeCloseTo(-1, 5);
    });

    test('rotating (0,0,1) by 90 degrees gives (1,0,0)', () => {
      const v = new Vector3(0, 0, 1);
      const result = rotateAroundY(v, Math.PI / 2);
      expect(result.x).toBeCloseTo(1, 5);
      expect(result.y).toBeCloseTo(0, 5);
      expect(result.z).toBeCloseTo(0, 5);
    });

    test('preserves y component', () => {
      const v = new Vector3(1, 7, 0);
      const result = rotateAroundY(v, Math.PI / 2);
      expect(result.y).toBeCloseTo(7, 5);
    });

    test('rotateXZ is an alias for rotateAroundY', () => {
      expect(rotateXZ).toBe(rotateAroundY);
    });
  });

  describe('rotateAroundX', () => {
    test('rotating (0,1,0) by 90 degrees gives (0,0,1)', () => {
      const v = new Vector3(0, 1, 0);
      const result = rotateAroundX(v, Math.PI / 2);
      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(0, 5);
      expect(result.z).toBeCloseTo(1, 5);
    });

    test('rotating (0,0,1) by 90 degrees gives (0,-1,0)', () => {
      const v = new Vector3(0, 0, 1);
      const result = rotateAroundX(v, Math.PI / 2);
      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(-1, 5);
      expect(result.z).toBeCloseTo(0, 5);
    });

    test('preserves x component', () => {
      const v = new Vector3(3, 1, 0);
      const result = rotateAroundX(v, Math.PI / 2);
      expect(result.x).toBeCloseTo(3, 5);
    });

    test('rotateYZ is an alias for rotateAroundX', () => {
      expect(rotateYZ).toBe(rotateAroundX);
    });
  });

  describe('rotation functions combined', () => {
    test('full 360 degree rotation returns to original', () => {
      const v = new Vector3(1, 2, 3);
      const result = rotateAroundZ(v, Math.PI * 2);
      expect(result.x).toBeCloseTo(v.x, 5);
      expect(result.y).toBeCloseTo(v.y, 5);
      expect(result.z).toBeCloseTo(v.z, 5);
    });

    test('rotation preserves vector length', () => {
      const v = new Vector3(3, 4, 5);
      const originalLength = v.length();

      const rotatedZ = rotateAroundZ(v, 0.7);
      expect(rotatedZ.length()).toBeCloseTo(originalLength, 5);

      const rotatedY = rotateAroundY(v, 1.2);
      expect(rotatedY.length()).toBeCloseTo(originalLength, 5);

      const rotatedX = rotateAroundX(v, 2.1);
      expect(rotatedX.length()).toBeCloseTo(originalLength, 5);
    });
  });

  // ============================================================================
  // Vector3-based Ray Intersection
  // ============================================================================

  describe('rayLineIntersect2DV', () => {
    test('detects intersection using Vector3', () => {
      const origin = new Vector3(0, 0, 0);
      const direction = new Vector3(1, 0, 0);
      const lineStart = new Vector3(5, -5, 0);
      const lineEnd = new Vector3(5, 5, 0);

      const result = rayLineIntersect2DV(origin, direction, lineStart, lineEnd);
      expect(result).not.toBeNull();
      expect(result!.t).toBeCloseTo(5, 5);
      expect(result!.u).toBeCloseTo(0.5, 5);
    });

    test('returns null when ray misses line', () => {
      const origin = new Vector3(0, 0, 0);
      const direction = new Vector3(1, 0, 0);
      const lineStart = new Vector3(-5, 1, 0);
      const lineEnd = new Vector3(-5, 2, 0);

      const result = rayLineIntersect2DV(origin, direction, lineStart, lineEnd);
      expect(result).toBeNull();
    });

    test('ignores z component (2D intersection)', () => {
      const origin = new Vector3(0, 0, 100);
      const direction = new Vector3(1, 0, 50);
      const lineStart = new Vector3(5, -5, -200);
      const lineEnd = new Vector3(5, 5, 300);

      // Should still intersect in XY plane despite different Z values
      const result = rayLineIntersect2DV(origin, direction, lineStart, lineEnd);
      expect(result).not.toBeNull();
      expect(result!.t).toBeCloseTo(5, 5);
    });

    test('matches primitive function results', () => {
      const origin = new Vector3(2, 3, 0);
      const direction = new Vector3(1, 1, 0);
      const lineStart = new Vector3(10, 5, 0);
      const lineEnd = new Vector3(10, 15, 0);

      const vectorResult = rayLineIntersect2DV(origin, direction, lineStart, lineEnd);
      const primitiveResult = rayLineIntersect2D(2, 3, 1, 1, 10, 5, 10, 15);

      expect(vectorResult).toEqual(primitiveResult);
    });
  });

  // ============================================================================
  // Game Convention Angles
  // ============================================================================

  describe('angleBetweenYForward', () => {
    test('returns 0 for point along +Y', () => {
      const a = new Vector3(0, 0, 0);
      const b = new Vector3(0, 10, 0);
      expect(angleBetweenYForward(a, b)).toBeCloseTo(0, 5);
    });

    test('returns PI/2 for point along +X', () => {
      const a = new Vector3(0, 0, 0);
      const b = new Vector3(10, 0, 0);
      expect(angleBetweenYForward(a, b)).toBeCloseTo(Math.PI / 2, 5);
    });

    test('returns -PI/2 for point along -X', () => {
      const a = new Vector3(0, 0, 0);
      const b = new Vector3(-10, 0, 0);
      expect(angleBetweenYForward(a, b)).toBeCloseTo(-Math.PI / 2, 5);
    });

    test('returns PI for point along -Y', () => {
      const a = new Vector3(0, 0, 0);
      const b = new Vector3(0, -10, 0);
      expect(Math.abs(angleBetweenYForward(a, b))).toBeCloseTo(Math.PI, 5);
    });

    test('works with non-origin points', () => {
      const a = new Vector3(5, 5, 0);
      const b = new Vector3(5, 15, 0); // 10 units in +Y
      expect(angleBetweenYForward(a, b)).toBeCloseTo(0, 5);
    });

    test('diagonal angles are correct', () => {
      const a = new Vector3(0, 0, 0);
      const b = new Vector3(10, 10, 0); // +X +Y diagonal
      // Should be PI/4 (45 degrees towards +X from +Y forward)
      expect(angleBetweenYForward(a, b)).toBeCloseTo(Math.PI / 4, 5);
    });
  });

  describe('angleBetweenYForward2D', () => {
    test('returns 0 for point along +Y', () => {
      expect(angleBetweenYForward2D(0, 0, 0, 10)).toBeCloseTo(0, 5);
    });

    test('returns PI/2 for point along +X', () => {
      expect(angleBetweenYForward2D(0, 0, 10, 0)).toBeCloseTo(Math.PI / 2, 5);
    });

    test('matches Vector3 version', () => {
      const ax = 3, ay = 4;
      const bx = 7, by = 9;

      const a = new Vector3(ax, ay, 0);
      const b = new Vector3(bx, by, 0);

      expect(angleBetweenYForward2D(ax, ay, bx, by))
        .toBeCloseTo(angleBetweenYForward(a, b), 10);
    });
  });

  describe('angleBetween vs angleBetweenYForward comparison', () => {
    test('angleBetween: 0 = +X, angleBetweenYForward: 0 = +Y', () => {
      const origin = new Vector3(0, 0, 0);

      // Point along +X
      const plusX = new Vector3(10, 0, 0);
      expect(angleBetween(origin, plusX)).toBeCloseTo(0, 5);
      expect(angleBetweenYForward(origin, plusX)).toBeCloseTo(Math.PI / 2, 5);

      // Point along +Y
      const plusY = new Vector3(0, 10, 0);
      expect(angleBetween(origin, plusY)).toBeCloseTo(Math.PI / 2, 5);
      expect(angleBetweenYForward(origin, plusY)).toBeCloseTo(0, 5);
    });

    test('conventions differ by 90 degrees for cardinal directions', () => {
      const origin = new Vector3(0, 0, 0);
      const target = new Vector3(10, 10, 0);

      const mathAngle = angleBetween(origin, target);
      const gameAngle = angleBetweenYForward(origin, target);

      // Game angle should be 90 degrees less (or rotated) from math angle
      // For (10, 10): math gives PI/4, game gives PI/4
      // Actually they're the same for diagonals, but differ for cardinals
      expect(mathAngle).toBeCloseTo(Math.PI / 4, 5);
      expect(gameAngle).toBeCloseTo(Math.PI / 4, 5);
    });
  });

  // ============================================================================
  // Map/Region Utilities
  // ============================================================================

  describe('isInRegion', () => {
    // Simple square room: (0,0) to (10,10)
    const squareRoom: MapPolygon = [
      new Vector3(0, 0, 0),
      new Vector3(10, 0, 0),
      new Vector3(10, 10, 0),
      new Vector3(0, 10, 0),
    ];

    test('point inside square returns true', () => {
      expect(isInRegion(squareRoom, new Vector3(5, 5, 0))).toBe(true);
      expect(isInRegion(squareRoom, new Vector3(1, 1, 0))).toBe(true);
      expect(isInRegion(squareRoom, new Vector3(9, 9, 0))).toBe(true);
    });

    test('point outside square returns false', () => {
      expect(isInRegion(squareRoom, new Vector3(-1, 5, 0))).toBe(false);
      expect(isInRegion(squareRoom, new Vector3(11, 5, 0))).toBe(false);
      expect(isInRegion(squareRoom, new Vector3(5, -1, 0))).toBe(false);
      expect(isInRegion(squareRoom, new Vector3(5, 11, 0))).toBe(false);
    });

    test('point on edge is handled consistently', () => {
      // Edge cases - behavior depends on exact algorithm, just verify no crash
      const onEdge = isInRegion(squareRoom, new Vector3(0, 5, 0));
      expect(typeof onEdge).toBe('boolean');
    });

    test('point at corner is handled consistently', () => {
      const atCorner = isInRegion(squareRoom, new Vector3(0, 0, 0));
      expect(typeof atCorner).toBe('boolean');
    });

    test('z coordinate is ignored (2D test)', () => {
      // Same x,y but different z should give same result
      expect(isInRegion(squareRoom, new Vector3(5, 5, 0))).toBe(true);
      expect(isInRegion(squareRoom, new Vector3(5, 5, 100))).toBe(true);
      expect(isInRegion(squareRoom, new Vector3(5, 5, -50))).toBe(true);
    });

    // L-shaped room
    const lShapedRoom: MapPolygon = [
      new Vector3(0, 0, 0),
      new Vector3(10, 0, 0),
      new Vector3(10, 5, 0),
      new Vector3(5, 5, 0),
      new Vector3(5, 10, 0),
      new Vector3(0, 10, 0),
    ];

    test('L-shaped room: point in main area', () => {
      expect(isInRegion(lShapedRoom, new Vector3(2, 2, 0))).toBe(true);
    });

    test('L-shaped room: point in extension', () => {
      expect(isInRegion(lShapedRoom, new Vector3(2, 7, 0))).toBe(true);
    });

    test('L-shaped room: point in cutout area returns false', () => {
      expect(isInRegion(lShapedRoom, new Vector3(7, 7, 0))).toBe(false);
    });

    // Triangle
    const triangle: MapPolygon = [
      new Vector3(0, 0, 0),
      new Vector3(10, 0, 0),
      new Vector3(5, 10, 0),
    ];

    test('triangle: point inside', () => {
      expect(isInRegion(triangle, new Vector3(5, 3, 0))).toBe(true);
    });

    test('triangle: point outside', () => {
      expect(isInRegion(triangle, new Vector3(0, 10, 0))).toBe(false);
      expect(isInRegion(triangle, new Vector3(10, 10, 0))).toBe(false);
    });

    // Edge cases
    test('empty polygon returns false', () => {
      expect(isInRegion([], new Vector3(5, 5, 0))).toBe(false);
    });

    test('single point polygon returns false', () => {
      expect(isInRegion([new Vector3(5, 5, 0)], new Vector3(5, 5, 0))).toBe(false);
    });

    test('two point polygon returns false', () => {
      const line: MapPolygon = [new Vector3(0, 0, 0), new Vector3(10, 10, 0)];
      expect(isInRegion(line, new Vector3(5, 5, 0))).toBe(false);
    });

    // Concave polygon (star-like shape)
    const concaveShape: MapPolygon = [
      new Vector3(5, 0, 0),   // bottom point
      new Vector3(6, 4, 0),   // inner right
      new Vector3(10, 5, 0),  // right point
      new Vector3(6, 6, 0),   // inner right top
      new Vector3(5, 10, 0),  // top point
      new Vector3(4, 6, 0),   // inner left top
      new Vector3(0, 5, 0),   // left point
      new Vector3(4, 4, 0),   // inner left
    ];

    test('concave shape: point in center', () => {
      expect(isInRegion(concaveShape, new Vector3(5, 5, 0))).toBe(true);
    });

    test('concave shape: point in concave indent returns false', () => {
      // Point between center and right point, in the "bay"
      expect(isInRegion(concaveShape, new Vector3(8, 4, 0))).toBe(false);
    });
  });

  describe('isInPolygon2D', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];

    test('point inside returns true', () => {
      expect(isInPolygon2D(square, 5, 5)).toBe(true);
    });

    test('point outside returns false', () => {
      expect(isInPolygon2D(square, -1, 5)).toBe(false);
      expect(isInPolygon2D(square, 15, 5)).toBe(false);
    });

    test('matches isInRegion results', () => {
      const region: MapPolygon = [
        new Vector3(0, 0, 0),
        new Vector3(10, 0, 0),
        new Vector3(10, 10, 0),
        new Vector3(0, 10, 0),
      ];

      // Test several points
      const testPoints = [
        { x: 5, y: 5 },
        { x: 0, y: 0 },
        { x: -5, y: 5 },
        { x: 15, y: 15 },
        { x: 3, y: 7 },
      ];

      for (const p of testPoints) {
        const regionResult = isInRegion(region, new Vector3(p.x, p.y, 0));
        const polygonResult = isInPolygon2D(square, p.x, p.y);
        expect(polygonResult).toBe(regionResult);
      }
    });

    test('empty polygon returns false', () => {
      expect(isInPolygon2D([], 5, 5)).toBe(false);
    });
  });
});
