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
});
