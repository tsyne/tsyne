/**
 * Tests for Cosyne 3D Lighting system
 */

import {
  DirectionalLight,
  PointLight,
  AmbientLight,
  SpotLight,
  createLight,
  LightManager,
} from '../../src/light';
import { Vector3 } from '../../src/math3d';

describe('Cosyne 3D Lights', () => {
  describe('DirectionalLight', () => {
    test('creates with defaults', () => {
      const light = new DirectionalLight({ type: 'directional' });
      expect(light.type).toBe('directional');
      expect(light.color).toBe('#ffffff');
      expect(light.intensity).toBe(1.0);
      expect(light.enabled).toBe(true);
    });

    test('creates with options', () => {
      const light = new DirectionalLight({
        type: 'directional',
        direction: [1, -1, 0],
        color: '#ffff00',
        intensity: 0.8,
      });
      expect(light.color).toBe('#ffff00');
      expect(light.intensity).toBe(0.8);
      expect(light.direction.x).toBeCloseTo(1 / Math.sqrt(2));
      expect(light.direction.y).toBeCloseTo(-1 / Math.sqrt(2));
    });

    test('calculates intensity at point', () => {
      const light = new DirectionalLight({
        type: 'directional',
        direction: [0, -1, 0],
        intensity: 1.0,
      });
      const point = new Vector3(0, 0, 0);
      const normal = new Vector3(0, 1, 0); // Facing up towards light
      const intensity = light.calculateIntensityAt(point, normal);
      expect(intensity).toBeCloseTo(1.0);
    });

    test('returns zero when disabled', () => {
      const light = new DirectionalLight({
        type: 'directional',
        direction: [0, -1, 0],
        enabled: false,
      });
      const intensity = light.calculateIntensityAt(Vector3.zero(), Vector3.up());
      expect(intensity).toBe(0);
    });

    test('setDirection updates direction', () => {
      const light = new DirectionalLight({ type: 'directional' });
      light.setDirection(1, 0, 0);
      expect(light.direction.x).toBeCloseTo(1);
    });

    test('getLightDirectionAt returns correct direction', () => {
      const light = new DirectionalLight({
        type: 'directional',
        direction: [0, -1, 0],
      });
      const dir = light.getLightDirectionAt(Vector3.zero());
      expect(dir.y).toBeCloseTo(1); // Points towards light (up)
    });
  });

  describe('PointLight', () => {
    test('creates with defaults', () => {
      const light = new PointLight({ type: 'point' });
      expect(light.type).toBe('point');
      expect(light.position.x).toBe(0);
    });

    test('creates with options', () => {
      const light = new PointLight({
        type: 'point',
        position: [10, 20, 30],
        color: '#ff0000',
        range: 50,
        decay: 1,
      });
      expect(light.position.x).toBe(10);
      expect(light.position.y).toBe(20);
      expect(light.position.z).toBe(30);
      expect(light.range).toBe(50);
      expect(light.decay).toBe(1);
    });

    test('calculates intensity based on distance', () => {
      const light = new PointLight({
        type: 'point',
        position: [0, 10, 0],
        intensity: 1.0,
        decay: 0, // No decay for this test
      });
      const point = new Vector3(0, 0, 0);
      const normal = new Vector3(0, 1, 0);
      const intensity = light.calculateIntensityAt(point, normal);
      expect(intensity).toBeGreaterThan(0);
    });

    test('returns zero outside range', () => {
      const light = new PointLight({
        type: 'point',
        position: [0, 0, 0],
        range: 10,
      });
      const farPoint = new Vector3(100, 0, 0);
      const intensity = light.calculateIntensityAt(farPoint, Vector3.right().negate());
      expect(intensity).toBe(0);
    });

    test('setPosition updates position', () => {
      const light = new PointLight({ type: 'point' });
      light.setPosition(5, 10, 15);
      expect(light.position.x).toBe(5);
      expect(light.position.y).toBe(10);
      expect(light.position.z).toBe(15);
    });

    test('getLightDirectionAt points towards light', () => {
      const light = new PointLight({
        type: 'point',
        position: [10, 0, 0],
      });
      const dir = light.getLightDirectionAt(Vector3.zero());
      expect(dir.x).toBeCloseTo(1);
    });
  });

  describe('AmbientLight', () => {
    test('creates with defaults', () => {
      const light = new AmbientLight({ type: 'ambient' });
      expect(light.type).toBe('ambient');
      expect(light.intensity).toBe(0.3); // Lower default for ambient
    });

    test('calculates constant intensity', () => {
      const light = new AmbientLight({ type: 'ambient', intensity: 0.5 });
      const i1 = light.calculateIntensityAt(Vector3.zero(), Vector3.up());
      const i2 = light.calculateIntensityAt(new Vector3(100, 100, 100), Vector3.down());
      expect(i1).toBe(0.5);
      expect(i2).toBe(0.5);
    });

    test('returns zero when disabled', () => {
      const light = new AmbientLight({ type: 'ambient', enabled: false });
      expect(light.calculateIntensityAt(Vector3.zero(), Vector3.up())).toBe(0);
    });
  });

  describe('SpotLight', () => {
    test('creates with defaults', () => {
      const light = new SpotLight({ type: 'spot' });
      expect(light.type).toBe('spot');
    });

    test('creates with options', () => {
      const light = new SpotLight({
        type: 'spot',
        position: [0, 10, 0],
        direction: [0, -1, 0],
        innerAngle: Math.PI / 8,
        outerAngle: Math.PI / 4,
      });
      expect(light.position.y).toBe(10);
      expect(light.innerAngle).toBeCloseTo(Math.PI / 8);
      expect(light.outerAngle).toBeCloseTo(Math.PI / 4);
    });

    test('illuminates within cone', () => {
      const light = new SpotLight({
        type: 'spot',
        position: [0, 10, 0],
        direction: [0, -1, 0],
        outerAngle: Math.PI / 4,
      });
      const point = new Vector3(0, 0, 0);
      const normal = new Vector3(0, 1, 0);
      const intensity = light.calculateIntensityAt(point, normal);
      expect(intensity).toBeGreaterThan(0);
    });

    test('returns zero outside cone', () => {
      const light = new SpotLight({
        type: 'spot',
        position: [0, 10, 0],
        direction: [0, -1, 0],
        outerAngle: Math.PI / 8,
      });
      const point = new Vector3(100, 0, 0); // Way off to the side
      const normal = new Vector3(-1, 0, 0);
      const intensity = light.calculateIntensityAt(point, normal);
      expect(intensity).toBe(0);
    });
  });

  describe('createLight factory', () => {
    test('creates directional light', () => {
      const light = createLight({ type: 'directional' });
      expect(light).toBeInstanceOf(DirectionalLight);
    });

    test('creates point light', () => {
      const light = createLight({ type: 'point' });
      expect(light).toBeInstanceOf(PointLight);
    });

    test('creates ambient light', () => {
      const light = createLight({ type: 'ambient' });
      expect(light).toBeInstanceOf(AmbientLight);
    });

    test('creates spot light', () => {
      const light = createLight({ type: 'spot' });
      expect(light).toBeInstanceOf(SpotLight);
    });

    test('throws for unknown type', () => {
      expect(() => createLight({ type: 'unknown' as any })).toThrow();
    });
  });

  describe('LightManager', () => {
    test('creates with default ambient', () => {
      const manager = new LightManager();
      expect(manager.getLights().length).toBe(0);
    });

    test('adds and removes lights', () => {
      const manager = new LightManager();
      const light = new DirectionalLight({ type: 'directional' });
      manager.addLight(light);
      expect(manager.getLights().length).toBe(1);
      manager.removeLight(light);
      expect(manager.getLights().length).toBe(0);
    });

    test('clears all lights', () => {
      const manager = new LightManager();
      manager.addLight(new DirectionalLight({ type: 'directional' }));
      manager.addLight(new PointLight({ type: 'point' }));
      manager.clear();
      expect(manager.getLights().length).toBe(0);
    });

    test('calculateLightingAt sums multiple lights', () => {
      const manager = new LightManager();
      manager.addLight(new DirectionalLight({
        type: 'directional',
        direction: [0, -1, 0],
        intensity: 0.5,
      }));
      manager.addLight(new DirectionalLight({
        type: 'directional',
        direction: [0, -1, 0],
        intensity: 0.3,
      }));

      const point = new Vector3(0, 0, 0);
      const normal = new Vector3(0, 1, 0);
      const { diffuse, ambient } = manager.calculateLightingAt(point, normal);

      expect(diffuse).toBeCloseTo(0.8);
    });

    test('setDefaultAmbient changes ambient level', () => {
      const manager = new LightManager();
      manager.setDefaultAmbient(0.5);

      const { ambient } = manager.calculateLightingAt(Vector3.zero(), Vector3.up());
      expect(ambient).toBeCloseTo(0.5);
    });

    test('uses explicit ambient light over default', () => {
      const manager = new LightManager();
      manager.addLight(new AmbientLight({ type: 'ambient', intensity: 0.7 }));

      const { ambient } = manager.calculateLightingAt(Vector3.zero(), Vector3.up());
      expect(ambient).toBeCloseTo(0.7);
    });
  });
});
