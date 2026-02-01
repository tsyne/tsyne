/**
 * Tests for Cars Demo
 */

import { Vec3, Car, CarsState } from './index';

describe('Vec3', () => {
  describe('construction', () => {
    it('should create zero vector by default', () => {
      const v = new Vec3();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
      expect(v.z).toBe(0);
    });

    it('should create vector with given values', () => {
      const v = new Vec3(1, 2, 3);
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
      expect(v.z).toBe(3);
    });
  });

  describe('operations', () => {
    it('should add vectors', () => {
      const a = new Vec3(1, 2, 3);
      const b = new Vec3(4, 5, 6);
      const c = a.add(b);
      expect(c.x).toBe(5);
      expect(c.y).toBe(7);
      expect(c.z).toBe(9);
    });

    it('should subtract vectors', () => {
      const a = new Vec3(4, 5, 6);
      const b = new Vec3(1, 2, 3);
      const c = a.sub(b);
      expect(c.x).toBe(3);
      expect(c.y).toBe(3);
      expect(c.z).toBe(3);
    });

    it('should scale vector', () => {
      const v = new Vec3(1, 2, 3);
      const scaled = v.scale(2);
      expect(scaled.x).toBe(2);
      expect(scaled.y).toBe(4);
      expect(scaled.z).toBe(6);
    });

    it('should calculate length', () => {
      const v = new Vec3(3, 4, 0);
      expect(v.length()).toBe(5);
    });

    it('should normalize vector', () => {
      const v = new Vec3(3, 4, 0);
      const n = v.normalize();
      expect(n.length()).toBeCloseTo(1);
      expect(n.x).toBeCloseTo(0.6);
      expect(n.y).toBeCloseTo(0.8);
    });

    it('should handle zero vector normalization', () => {
      const v = new Vec3(0, 0, 0);
      const n = v.normalize();
      expect(n.x).toBe(0);
      expect(n.y).toBe(0);
      expect(n.z).toBe(0);
    });

    it('should calculate dot product', () => {
      const a = new Vec3(1, 0, 0);
      const b = new Vec3(0, 1, 0);
      expect(a.dot(b)).toBe(0); // Perpendicular

      const c = new Vec3(1, 0, 0);
      const d = new Vec3(1, 0, 0);
      expect(c.dot(d)).toBe(1); // Parallel
    });

    it('should rotate around Y axis', () => {
      const v = new Vec3(1, 0, 0);
      const rotated = v.rotateY(Math.PI / 2);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBe(0);
      expect(rotated.z).toBeCloseTo(-1);
    });
  });
});

describe('Car', () => {
  describe('construction', () => {
    it('should create car at position', () => {
      const car = new Car(5, 10, 0, { body: '#ff0000', accent: '#000000' });
      expect(car.position.x).toBe(5);
      expect(car.position.z).toBe(10);
      expect(car.rotation).toBe(0);
    });

    it('should initialize with zero velocity', () => {
      const car = new Car(0, 0, 0, { body: '#ff0000', accent: '#000000' });
      expect(car.velocity).toBe(0);
    });
  });

  describe('update', () => {
    it('should accelerate forward', () => {
      const car = new Car(0, 0, 0, { body: '#ff0000', accent: '#000000' });
      car.update(1, 0, 0.1);
      expect(car.velocity).toBeGreaterThan(0);
    });

    it('should decelerate when no throttle', () => {
      const car = new Car(0, 0, 0, { body: '#ff0000', accent: '#000000' });
      car.velocity = 10;
      car.update(0, 0, 0.1);
      expect(car.velocity).toBeLessThan(10);
    });

    it('should move position when velocity', () => {
      const car = new Car(0, 0, 0, { body: '#ff0000', accent: '#000000' });
      car.velocity = 10;
      const startZ = car.position.z;
      car.update(0, 0, 0.1);
      expect(car.position.z).toBeGreaterThan(startZ);
    });

    it('should steer when moving', () => {
      const car = new Car(0, 0, 0, { body: '#ff0000', accent: '#000000' });
      car.velocity = 10;
      const startRot = car.rotation;
      car.update(0, 1, 0.1);
      expect(car.rotation).not.toBe(startRot);
    });

    it('should not steer when stationary', () => {
      const car = new Car(0, 0, 0, { body: '#ff0000', accent: '#000000' });
      car.velocity = 0;
      const startRot = car.rotation;
      car.update(0, 1, 0.1);
      expect(car.rotation).toBe(startRot);
    });

    it('should clamp to bounds', () => {
      const car = new Car(100, 100, 0, { body: '#ff0000', accent: '#000000' });
      car.update(0, 0, 0.1);
      expect(car.position.x).toBeLessThanOrEqual(50);
      expect(car.position.z).toBeLessThanOrEqual(50);
    });

    it('should clamp velocity to max', () => {
      const car = new Car(0, 0, 0, { body: '#ff0000', accent: '#000000' });
      for (let i = 0; i < 100; i++) {
        car.update(1, 0, 0.1);
      }
      expect(car.velocity).toBeLessThanOrEqual(30);
    });
  });
});

describe('CarsState', () => {
  describe('construction', () => {
    it('should create two cars', () => {
      const state = new CarsState(100, 100);
      expect(state.cars.length).toBe(2);
    });

    it('should create pixel buffer', () => {
      const state = new CarsState(100, 100);
      expect(state.pixelBuffer.length).toBe(100 * 100 * 4);
    });

    it('should start in day mode', () => {
      const state = new CarsState(100, 100);
      expect(state.isNight).toBe(false);
    });
  });

  describe('camera', () => {
    it('should change camera view', () => {
      const state = new CarsState(100, 100);
      state.setCamera(2);
      expect(state.currentCameraView).toBe(2);
    });

    it('should wrap camera view index', () => {
      const state = new CarsState(100, 100);
      state.setCamera(100);
      expect(state.currentCameraView).toBeLessThan(10);
    });
  });

  describe('day/night', () => {
    it('should toggle night mode', () => {
      const state = new CarsState(100, 100);
      expect(state.isNight).toBe(false);
      state.toggleNight();
      expect(state.isNight).toBe(true);
      state.toggleNight();
      expect(state.isNight).toBe(false);
    });
  });

  describe('car switching', () => {
    it('should switch active car', () => {
      const state = new CarsState(100, 100);
      expect(state.activeCar).toBe(0);
      state.switchCar();
      expect(state.activeCar).toBe(1);
      state.switchCar();
      expect(state.activeCar).toBe(0);
    });
  });

  describe('update', () => {
    it('should update without error', () => {
      const state = new CarsState(100, 100);
      expect(() => state.update(0.1)).not.toThrow();
    });

    it('should move camera position', () => {
      const state = new CarsState(100, 100);
      state.setCamera(0);
      state.update(0.1);
      // Camera should be positioned according to view
      expect(state.cameraPos.y).toBeGreaterThan(0);
    });
  });

  describe('rendering', () => {
    it('should render without error', () => {
      const state = new CarsState(100, 100);
      expect(() => state.render()).not.toThrow();
    });

    it('should fill pixel buffer', () => {
      const state = new CarsState(100, 100);
      state.render();
      // Check that pixels were set (not all zeros)
      let hasContent = false;
      for (let i = 0; i < state.pixelBuffer.length; i += 4) {
        if (state.pixelBuffer[i] !== 0 || state.pixelBuffer[i + 1] !== 0) {
          hasContent = true;
          break;
        }
      }
      expect(hasContent).toBe(true);
    });

    it('should change background for night mode', () => {
      const state = new CarsState(100, 100);
      state.render();
      const dayBg = state.pixelBuffer[0];

      state.toggleNight();
      state.render();
      const nightBg = state.pixelBuffer[0];

      expect(dayBg).not.toBe(nightBg);
    });
  });

  describe('projection', () => {
    it('should project points in front of camera', () => {
      const state = new CarsState(100, 100);
      state.cameraPos = new Vec3(0, 10, 20);
      state.cameraTarget = new Vec3(0, 0, 0);
      const result = state.project(new Vec3(0, 0, 0));
      expect(result).not.toBeNull();
    });

    it('should return null for points behind camera', () => {
      const state = new CarsState(100, 100);
      state.cameraPos = new Vec3(0, 10, 20);
      state.cameraTarget = new Vec3(0, 0, 0);
      const result = state.project(new Vec3(0, 0, 100));
      expect(result).toBeNull();
    });
  });

  describe('status', () => {
    it('should include camera name', () => {
      const state = new CarsState(100, 100);
      expect(state.getStatusText()).toContain('Overview');
    });

    it('should include day/night mode', () => {
      const state = new CarsState(100, 100);
      expect(state.getStatusText()).toContain('Day');
      state.toggleNight();
      expect(state.getStatusText()).toContain('Night');
    });

    it('should include car name', () => {
      const state = new CarsState(100, 100);
      expect(state.getStatusText()).toContain('Bugatti');
      state.switchCar();
      expect(state.getStatusText()).toContain('Lamborghini');
    });
  });
});
