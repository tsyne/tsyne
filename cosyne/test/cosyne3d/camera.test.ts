/**
 * Tests for Cosyne 3D Camera system
 */

import { Camera, CameraProjection } from '../../src/camera';
import { Vector3, Matrix4 } from '../../src/math3d';

describe('Cosyne 3D Camera', () => {
  describe('creation', () => {
    test('creates with defaults', () => {
      const camera = new Camera();
      expect(camera.fov).toBe(60);
      expect(camera.near).toBe(0.1);
      expect(camera.far).toBe(1000);
      expect(camera.aspect).toBe(1);
      expect(camera.projection).toBe('perspective');
      expect(camera.position.z).toBe(10);
    });

    test('creates with options', () => {
      const camera = new Camera({
        fov: 75,
        near: 0.5,
        far: 500,
        aspect: 16 / 9,
        projection: 'perspective',
        position: [5, 5, 5],
        lookAt: [0, 0, 0],
      });
      expect(camera.fov).toBe(75);
      expect(camera.near).toBe(0.5);
      expect(camera.far).toBe(500);
      expect(camera.aspect).toBeCloseTo(16 / 9);
      expect(camera.position.x).toBe(5);
      expect(camera.position.y).toBe(5);
      expect(camera.position.z).toBe(5);
      expect(camera.target.x).toBe(0);
    });

    test('creates orthographic camera', () => {
      const camera = new Camera({
        projection: 'orthographic',
        left: -10,
        right: 10,
        top: 10,
        bottom: -10,
      });
      expect(camera.projection).toBe('orthographic');
      expect(camera.left).toBe(-10);
      expect(camera.right).toBe(10);
    });
  });

  describe('projection properties', () => {
    test('fov is clamped', () => {
      const camera = new Camera();
      camera.fov = 200;
      expect(camera.fov).toBe(179);
      camera.fov = -10;
      expect(camera.fov).toBe(1);
    });

    test('near is clamped to positive', () => {
      const camera = new Camera();
      camera.near = -1;
      expect(camera.near).toBe(0.001);
    });

    test('far stays greater than near', () => {
      const camera = new Camera();
      camera.near = 10;
      camera.far = 5;
      expect(camera.far).toBeGreaterThan(camera.near);
    });

    test('aspect is clamped to positive', () => {
      const camera = new Camera();
      camera.aspect = -1;
      expect(camera.aspect).toBe(0.001);
    });
  });

  describe('fluent API', () => {
    test('setFov returns this', () => {
      const camera = new Camera();
      expect(camera.setFov(90)).toBe(camera);
      expect(camera.fov).toBe(90);
    });

    test('setNear returns this', () => {
      const camera = new Camera();
      expect(camera.setNear(1)).toBe(camera);
      expect(camera.near).toBe(1);
    });

    test('setFar returns this', () => {
      const camera = new Camera();
      expect(camera.setFar(500)).toBe(camera);
      expect(camera.far).toBe(500);
    });

    test('setAspect returns this', () => {
      const camera = new Camera();
      expect(camera.setAspect(2)).toBe(camera);
      expect(camera.aspect).toBe(2);
    });

    test('setProjection returns this', () => {
      const camera = new Camera();
      expect(camera.setProjection('orthographic')).toBe(camera);
      expect(camera.projection).toBe('orthographic');
    });

    test('setPosition accepts Vector3', () => {
      const camera = new Camera();
      camera.setPosition(new Vector3(1, 2, 3));
      expect(camera.position.x).toBe(1);
      expect(camera.position.y).toBe(2);
      expect(camera.position.z).toBe(3);
    });

    test('setPosition accepts array', () => {
      const camera = new Camera();
      camera.setPosition([5, 6, 7]);
      expect(camera.position.x).toBe(5);
      expect(camera.position.y).toBe(6);
      expect(camera.position.z).toBe(7);
    });

    test('setLookAt accepts Vector3', () => {
      const camera = new Camera();
      camera.setLookAt(new Vector3(1, 0, 0));
      expect(camera.target.x).toBe(1);
    });

    test('setLookAt accepts array', () => {
      const camera = new Camera();
      camera.setLookAt([2, 3, 4]);
      expect(camera.target.x).toBe(2);
      expect(camera.target.y).toBe(3);
      expect(camera.target.z).toBe(4);
    });

    test('setUp normalizes the up vector', () => {
      const camera = new Camera();
      camera.setUp([0, 2, 0]);
      expect(camera.up.length()).toBeCloseTo(1);
    });

    test('setOrthoBounds sets all bounds', () => {
      const camera = new Camera();
      camera.setOrthoBounds(-5, 5, -5, 5);
      expect(camera.left).toBe(-5);
      expect(camera.right).toBe(5);
      expect(camera.bottom).toBe(-5);
      expect(camera.top).toBe(5);
    });
  });

  describe('matrices', () => {
    test('getProjectionMatrix returns perspective matrix', () => {
      const camera = new Camera({
        projection: 'perspective',
        fov: 60,
        aspect: 1,
        near: 0.1,
        far: 100,
      });
      const proj = camera.getProjectionMatrix();
      expect(proj).toBeInstanceOf(Matrix4);
      // Perspective matrix has specific structure
      expect(proj.elements[15]).toBe(0); // w row is 0,0,-1,0 pattern
    });

    test('getProjectionMatrix returns orthographic matrix', () => {
      const camera = new Camera({
        projection: 'orthographic',
        left: -10,
        right: 10,
        bottom: -10,
        top: 10,
        near: 0.1,
        far: 100,
      });
      const proj = camera.getProjectionMatrix();
      expect(proj).toBeInstanceOf(Matrix4);
      // Orthographic matrix has 1 at [3][3]
      expect(proj.elements[15]).toBe(1);
    });

    test('getViewMatrix returns view matrix', () => {
      const camera = new Camera({
        position: [0, 0, 10],
        lookAt: [0, 0, 0],
      });
      const view = camera.getViewMatrix();
      expect(view).toBeInstanceOf(Matrix4);
    });

    test('getViewProjectionMatrix combines view and projection', () => {
      const camera = new Camera();
      const vp = camera.getViewProjectionMatrix();
      expect(vp).toBeInstanceOf(Matrix4);
    });

    test('getInverseViewMatrix inverts view', () => {
      const camera = new Camera();
      const view = camera.getViewMatrix();
      const invView = camera.getInverseViewMatrix();
      const identity = view.multiply(invView);
      // Should be approximately identity
      expect(identity.elements[0]).toBeCloseTo(1);
      expect(identity.elements[5]).toBeCloseTo(1);
      expect(identity.elements[10]).toBeCloseTo(1);
      expect(identity.elements[15]).toBeCloseTo(1);
    });

    test('matrices are cached and invalidated', () => {
      const camera = new Camera();
      const proj1 = camera.getProjectionMatrix();
      const proj2 = camera.getProjectionMatrix();
      expect(proj1).toBe(proj2); // Same cached instance

      camera.fov = 90; // Invalidates projection
      const proj3 = camera.getProjectionMatrix();
      expect(proj3).not.toBe(proj1); // New instance
    });
  });

  describe('derived properties', () => {
    test('getForward returns direction to target', () => {
      const camera = new Camera({
        position: [0, 0, 10],
        lookAt: [0, 0, 0],
      });
      const forward = camera.getForward();
      expect(forward.z).toBeCloseTo(-1);
    });

    test('getRight returns right vector', () => {
      const camera = new Camera({
        position: [0, 0, 10],
        lookAt: [0, 0, 0],
        up: [0, 1, 0],
      });
      const right = camera.getRight();
      expect(right.x).toBeCloseTo(1);
    });

    test('getUp returns orthogonalized up', () => {
      const camera = new Camera({
        position: [0, 0, 10],
        lookAt: [0, 0, 0],
      });
      const up = camera.getUp();
      expect(up.y).toBeCloseTo(1);
    });
  });

  describe('camera movement', () => {
    test('moveForward moves camera and target', () => {
      const camera = new Camera({
        position: [0, 0, 10],
        lookAt: [0, 0, 0],
      });
      camera.moveForward(5);
      expect(camera.position.z).toBeCloseTo(5);
      expect(camera.target.z).toBeCloseTo(-5);
    });

    test('moveRight moves camera along right axis', () => {
      const camera = new Camera({
        position: [0, 0, 10],
        lookAt: [0, 0, 0],
      });
      camera.moveRight(5);
      expect(camera.position.x).toBeCloseTo(5);
    });

    test('moveUp moves camera along up axis', () => {
      const camera = new Camera({
        position: [0, 0, 10],
        lookAt: [0, 0, 0],
      });
      camera.moveUp(5);
      expect(camera.position.y).toBeCloseTo(5);
    });

    test('orbit rotates around target', () => {
      const camera = new Camera({
        position: [0, 0, 10],
        lookAt: [0, 0, 0],
      });
      const initialDistance = camera.position.distanceTo(camera.target);
      camera.orbit(Math.PI / 4, 0);
      const newDistance = camera.position.distanceTo(camera.target);
      expect(newDistance).toBeCloseTo(initialDistance);
    });

    test('zoom moves camera closer/farther from target', () => {
      const camera = new Camera({
        position: [0, 0, 10],
        lookAt: [0, 0, 0],
      });
      camera.zoom(0.5);
      expect(camera.position.distanceTo(camera.target)).toBeCloseTo(5);
    });

    test('pan moves both camera and target', () => {
      const camera = new Camera({
        position: [0, 0, 10],
        lookAt: [0, 0, 0],
      });
      const initialDistance = camera.position.distanceTo(camera.target);
      camera.pan(5, 3);
      expect(camera.position.distanceTo(camera.target)).toBeCloseTo(initialDistance);
    });
  });

  describe('ray casting', () => {
    test('screenToRay creates ray from NDC', () => {
      const camera = new Camera({
        position: [0, 0, 10],
        lookAt: [0, 0, 0],
      });
      const ray = camera.screenToRay(0, 0);
      // Center of screen should point roughly forward
      expect(ray.direction.z).toBeLessThan(0);
    });

    test('pixelToRay converts pixel coordinates', () => {
      const camera = new Camera({
        position: [0, 0, 10],
        lookAt: [0, 0, 0],
        aspect: 1,
      });
      const ray = camera.pixelToRay(400, 300, 800, 600);
      // Center of screen
      expect(ray.direction.z).toBeLessThan(0);
    });
  });

  describe('projection', () => {
    test('projectToNDC projects world point', () => {
      const camera = new Camera({
        position: [0, 0, 10],
        lookAt: [0, 0, 0],
      });
      const ndc = camera.projectToNDC(new Vector3(0, 0, 0));
      // Target should project to roughly center
      expect(Math.abs(ndc.x)).toBeLessThan(0.1);
      expect(Math.abs(ndc.y)).toBeLessThan(0.1);
    });

    test('projectToPixel converts to screen coordinates', () => {
      const camera = new Camera({
        position: [0, 0, 10],
        lookAt: [0, 0, 0],
      });
      const pixel = camera.projectToPixel(new Vector3(0, 0, 0), 800, 600);
      // Target should project to roughly center of screen
      expect(pixel.x).toBeCloseTo(400, 0);
      expect(pixel.y).toBeCloseTo(300, 0);
    });

    test('isPointInFront detects points in view', () => {
      const camera = new Camera({
        position: [0, 0, 10],
        lookAt: [0, 0, 0],
      });
      expect(camera.isPointInFront(new Vector3(0, 0, 0))).toBe(true);
      expect(camera.isPointInFront(new Vector3(0, 0, 20))).toBe(false);
    });
  });

  describe('bindings', () => {
    test('bindPosition creates binding', () => {
      const camera = new Camera();
      let t = 0;
      camera.bindPosition(() => [Math.sin(t) * 10, 5, Math.cos(t) * 10] as [number, number, number]);
      expect(camera.getPositionBinding()).not.toBeNull();
    });

    test('bindLookAt creates binding', () => {
      const camera = new Camera();
      camera.bindLookAt(() => [0, 0, 0] as [number, number, number]);
      expect(camera.getLookAtBinding()).not.toBeNull();
    });

    test('refreshBindings evaluates position binding', () => {
      const camera = new Camera();
      camera.bindPosition(() => [5, 5, 5] as [number, number, number]);
      camera.refreshBindings();
      expect(camera.position.x).toBe(5);
      expect(camera.position.y).toBe(5);
      expect(camera.position.z).toBe(5);
    });

    test('refreshBindings evaluates lookAt binding', () => {
      const camera = new Camera();
      camera.bindLookAt(() => [1, 2, 3] as [number, number, number]);
      camera.refreshBindings();
      expect(camera.target.x).toBe(1);
      expect(camera.target.y).toBe(2);
      expect(camera.target.z).toBe(3);
    });

    test('bindings can return Vector3', () => {
      const camera = new Camera();
      camera.bindPosition(() => new Vector3(3, 4, 5));
      camera.refreshBindings();
      expect(camera.position.x).toBe(3);
      expect(camera.position.y).toBe(4);
      expect(camera.position.z).toBe(5);
    });
  });

  describe('clone', () => {
    test('clone creates copy', () => {
      const camera = new Camera({
        fov: 75,
        position: [1, 2, 3],
        lookAt: [4, 5, 6],
        projection: 'perspective',
      });
      const cloned = camera.clone();
      expect(cloned.fov).toBe(75);
      expect(cloned.position.x).toBe(1);
      expect(cloned.target.x).toBe(4);
    });

    test('clone is independent', () => {
      const camera = new Camera();
      const cloned = camera.clone();
      cloned.fov = 120;
      expect(camera.fov).toBe(60);
    });
  });
});
