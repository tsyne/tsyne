/**
 * Tests for Cosyne3dContext
 */

import {
  Cosyne3dContext,
  cosyne3d,
  registerCosyne3dContext,
  unregisterCosyne3dContext,
  refreshAllCosyne3dContexts,
  rebuildAllCosyne3dContexts,
  clearAllCosyne3dContexts,
  getAllCosyne3dContexts,
} from '../../src/context3d';
import { Vector3, Ray } from '../../src/math3d';
import { Sphere3D } from '../../src/primitives3d/sphere3d';
import { Box3D } from '../../src/primitives3d/box3d';
import { Plane3D } from '../../src/primitives3d/plane3d';
import { Cylinder3D } from '../../src/primitives3d/cylinder3d';

describe('Cosyne3dContext', () => {
  // Mock app object
  const mockApp = {};

  beforeEach(() => {
    // Clear global registry before each test
    clearAllCosyne3dContexts();
  });

  describe('creation', () => {
    test('creates with defaults', () => {
      const ctx = new Cosyne3dContext(mockApp);
      expect(ctx.getWidth()).toBe(800);
      expect(ctx.getHeight()).toBe(600);
      expect(ctx.getBackgroundColor()).toBe('#000000');
      expect(ctx.getSceneId()).toBeDefined();
    });

    test('creates with options', () => {
      const ctx = new Cosyne3dContext(mockApp, {
        width: 1024,
        height: 768,
        backgroundColor: '#112233',
      });
      expect(ctx.getWidth()).toBe(1024);
      expect(ctx.getHeight()).toBe(768);
      expect(ctx.getBackgroundColor()).toBe('#112233');
    });

    test('creates unique scene ID', () => {
      const ctx1 = new Cosyne3dContext(mockApp);
      const ctx2 = new Cosyne3dContext(mockApp);
      expect(ctx1.getSceneId()).not.toBe(ctx2.getSceneId());
    });
  });

  describe('configuration', () => {
    test('setSize updates dimensions and camera aspect', () => {
      const ctx = new Cosyne3dContext(mockApp);
      ctx.setSize(1920, 1080);
      expect(ctx.getWidth()).toBe(1920);
      expect(ctx.getHeight()).toBe(1080);
      expect(ctx.getCamera().aspect).toBeCloseTo(1920 / 1080);
    });

    test('setBackgroundColor updates color', () => {
      const ctx = new Cosyne3dContext(mockApp);
      ctx.setBackgroundColor('#ff0000');
      expect(ctx.getBackgroundColor()).toBe('#ff0000');
    });
  });

  describe('primitive factory methods', () => {
    test('sphere creates and tracks Sphere3D', () => {
      const ctx = new Cosyne3dContext(mockApp);
      const s = ctx.sphere({ radius: 5 });
      expect(s).toBeInstanceOf(Sphere3D);
      expect(s.radius).toBe(5);
      expect(ctx.getAllPrimitives()).toContain(s);
    });

    test('box creates and tracks Box3D', () => {
      const ctx = new Cosyne3dContext(mockApp);
      const b = ctx.box({ size: 2 });
      expect(b).toBeInstanceOf(Box3D);
      expect(ctx.getAllPrimitives()).toContain(b);
    });

    test('plane creates and tracks Plane3D', () => {
      const ctx = new Cosyne3dContext(mockApp);
      const p = ctx.plane({ size: 10 });
      expect(p).toBeInstanceOf(Plane3D);
      expect(ctx.getAllPrimitives()).toContain(p);
    });

    test('cylinder creates and tracks Cylinder3D', () => {
      const ctx = new Cosyne3dContext(mockApp);
      const c = ctx.cylinder({ radius: 3 });
      expect(c).toBeInstanceOf(Cylinder3D);
      expect(ctx.getAllPrimitives()).toContain(c);
    });

    test('primitives with IDs can be retrieved', () => {
      const ctx = new Cosyne3dContext(mockApp);
      const s = ctx.sphere({ radius: 1, id: 'test-sphere' });
      expect(ctx.getPrimitiveById('test-sphere')).toBe(s);
    });
  });

  describe('collection builders', () => {
    test('spheres creates collection builder', () => {
      const ctx = new Cosyne3dContext(mockApp);
      const data = [{ x: 0 }, { x: 5 }, { x: 10 }];

      const collection = ctx.spheres<{ x: number }>()
        .bindTo({
          items: () => data,
          render: (item) => new Sphere3D({ position: [item.x, 0, 0] }),
          trackBy: (item) => item.x,
        });

      const items = collection.evaluate();
      expect(items.length).toBe(3);
      expect(items[0]).toBeInstanceOf(Sphere3D);
    });

    test('boxes creates collection builder', () => {
      const ctx = new Cosyne3dContext(mockApp);
      const collection = ctx.boxes<number>()
        .bindTo({
          items: () => [1, 2, 3],
          render: (n) => new Box3D({ size: n }),
          trackBy: (n) => n,
        });

      const items = collection.evaluate();
      expect(items.length).toBe(3);
    });

    test('collection removes deleted items', () => {
      const ctx = new Cosyne3dContext(mockApp);
      let data = [1, 2, 3];

      const collection = ctx.spheres<number>()
        .bindTo({
          items: () => data,
          render: (n) => new Sphere3D({ radius: n, id: `sphere-${n}` }),
          trackBy: (n) => `sphere-${n}`,
        });

      collection.evaluate();
      expect(ctx.getAllPrimitives().length).toBe(3);

      data = [1, 2]; // Remove one
      collection.evaluate();
      expect(ctx.getAllPrimitives().length).toBe(2);
      expect(ctx.getPrimitiveById('sphere-3')).toBeUndefined();
    });
  });

  describe('transform', () => {
    test('transform applies translation to nested primitives', () => {
      const ctx = new Cosyne3dContext(mockApp);

      ctx.transform({ translate: [10, 0, 0] }, (c) => {
        c.sphere({ position: [0, 0, 0] });
      });

      const spheres = ctx.getAllPrimitives();
      expect(spheres.length).toBe(1);
      expect(spheres[0].position.x).toBe(10);
    });

    test('transform applies scale to nested primitives', () => {
      const ctx = new Cosyne3dContext(mockApp);

      ctx.transform({ scale: 2 }, (c) => {
        c.sphere({ radius: 1 });
      });

      const spheres = ctx.getAllPrimitives();
      expect(spheres[0].scale.x).toBe(2);
    });

    test('nested transforms accumulate', () => {
      const ctx = new Cosyne3dContext(mockApp);

      ctx.transform({ translate: [5, 0, 0] }, (c) => {
        c.transform({ translate: [3, 0, 0] }, (c2) => {
          c2.sphere({ position: [0, 0, 0] });
        });
      });

      const spheres = ctx.getAllPrimitives();
      expect(spheres[0].position.x).toBe(8);
    });
  });

  describe('camera', () => {
    test('default camera is created', () => {
      const ctx = new Cosyne3dContext(mockApp);
      const camera = ctx.getCamera();
      expect(camera).toBeDefined();
      expect(camera.fov).toBe(60);
    });

    test('setCamera replaces camera', () => {
      const ctx = new Cosyne3dContext(mockApp);
      const newCamera = ctx.setCamera({ fov: 90, position: [0, 10, 20] });
      expect(ctx.getCamera()).toBe(newCamera);
      expect(ctx.getCamera().fov).toBe(90);
    });

    test('camera aspect is updated on setSize', () => {
      const ctx = new Cosyne3dContext(mockApp, { width: 800, height: 600 });
      expect(ctx.getCamera().aspect).toBeCloseTo(800 / 600);
      ctx.setSize(1600, 900);
      expect(ctx.getCamera().aspect).toBeCloseTo(1600 / 900);
    });
  });

  describe('lights', () => {
    test('light adds to light manager', () => {
      const ctx = new Cosyne3dContext(mockApp);
      ctx.light({ type: 'directional', direction: [0, -1, 0] });
      ctx.light({ type: 'point', position: [5, 5, 5] });
      expect(ctx.getLights().length).toBe(2);
    });

    test('getLightManager returns manager', () => {
      const ctx = new Cosyne3dContext(mockApp);
      const manager = ctx.getLightManager();
      expect(manager).toBeDefined();
    });
  });

  describe('primitive management', () => {
    test('getVisiblePrimitives filters hidden', () => {
      const ctx = new Cosyne3dContext(mockApp);
      ctx.sphere({}).hide();
      ctx.sphere({});
      ctx.sphere({}).setVisible(false);

      expect(ctx.getAllPrimitives().length).toBe(3);
      expect(ctx.getVisiblePrimitives().length).toBe(1);
    });

    test('getStats returns correct counts', () => {
      const ctx = new Cosyne3dContext(mockApp);
      ctx.sphere({});
      ctx.box({});
      ctx.sphere({}).hide();
      ctx.light({ type: 'directional' });
      ctx.light({ type: 'ambient' });

      const stats = ctx.getStats();
      expect(stats.primitiveCount).toBe(3);
      expect(stats.lightCount).toBe(2);
      expect(stats.visibleCount).toBe(2);
    });
  });

  describe('ray casting', () => {
    test('raycast finds intersecting primitives', () => {
      const ctx = new Cosyne3dContext(mockApp);
      ctx.sphere({ radius: 1, position: [0, 0, 0] });

      const ray = new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1));
      const hits = ctx.raycast(ray);

      expect(hits.length).toBe(1);
      expect(hits[0].primitive).toBeInstanceOf(Sphere3D);
    });

    test('raycast returns hits sorted by distance', () => {
      const ctx = new Cosyne3dContext(mockApp);
      ctx.sphere({ radius: 1, position: [0, 0, 0] });
      ctx.sphere({ radius: 1, position: [0, 0, 5] });

      const ray = new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1));
      const hits = ctx.raycast(ray);

      expect(hits.length).toBe(2);
      expect(hits[0].distance).toBeLessThan(hits[1].distance);
    });

    test('raycast ignores hidden primitives', () => {
      const ctx = new Cosyne3dContext(mockApp);
      ctx.sphere({ radius: 1, position: [0, 0, 0] }).hide();

      const ray = new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1));
      const hits = ctx.raycast(ray);

      expect(hits.length).toBe(0);
    });

    test('raycast ignores passthrough primitives', () => {
      const ctx = new Cosyne3dContext(mockApp);
      ctx.sphere({ radius: 1, position: [0, 0, 0] }).passthrough();

      const ray = new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1));
      const hits = ctx.raycast(ray);

      expect(hits.length).toBe(0);
    });

    test('raycastClosest returns first hit', () => {
      const ctx = new Cosyne3dContext(mockApp);
      ctx.sphere({ radius: 1, position: [0, 0, 0] });
      ctx.sphere({ radius: 1, position: [0, 0, 5] });

      const ray = new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1));
      const hit = ctx.raycastClosest(ray);

      expect(hit).not.toBeNull();
      expect(hit!.point.z).toBeGreaterThan(0);
    });

    test('raycastClosest returns null for no hits', () => {
      const ctx = new Cosyne3dContext(mockApp);
      ctx.sphere({ radius: 1, position: [100, 0, 0] });

      const ray = new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1));
      const hit = ctx.raycastClosest(ray);

      expect(hit).toBeNull();
    });

    test('raycastFromPixel uses camera', () => {
      const ctx = new Cosyne3dContext(mockApp, { width: 800, height: 600 });
      ctx.sphere({ radius: 1, position: [0, 0, 0] });

      // Center of screen should hit the sphere (camera looks at origin)
      const hits = ctx.raycastFromPixel(400, 300);
      expect(hits.length).toBeGreaterThan(0);
    });

    test('raycastFromNDC uses NDC coordinates', () => {
      const ctx = new Cosyne3dContext(mockApp);
      ctx.sphere({ radius: 1, position: [0, 0, 0] });

      // Center (0, 0) should hit the sphere
      const hits = ctx.raycastFromNDC(0, 0);
      expect(hits.length).toBeGreaterThan(0);
    });
  });

  describe('event handling', () => {
    test('handleClick invokes click handler', async () => {
      const ctx = new Cosyne3dContext(mockApp, { width: 800, height: 600 });
      let clicked = false;

      ctx.sphere({ radius: 1, position: [0, 0, 0] })
        .onClick(() => { clicked = true; });

      await ctx.handleClick(400, 300);
      expect(clicked).toBe(true);
    });

    test('handleClick does nothing when missing sphere', async () => {
      const ctx = new Cosyne3dContext(mockApp, { width: 800, height: 600 });
      let clicked = false;

      ctx.sphere({ radius: 1, position: [100, 0, 0] })
        .onClick(() => { clicked = true; });

      await ctx.handleClick(400, 300);
      expect(clicked).toBe(false);
    });

    test('handleMouseMove triggers hover enter', () => {
      const ctx = new Cosyne3dContext(mockApp, { width: 800, height: 600 });
      let hovered = false;

      ctx.sphere({ radius: 1, position: [0, 0, 0] })
        .onHover((hit) => { hovered = hit !== null; });

      ctx.handleMouseMove(400, 300);
      expect(hovered).toBe(true);
    });

    test('handleMouseMove triggers hover leave', () => {
      const ctx = new Cosyne3dContext(mockApp, { width: 800, height: 600 });
      let hoverState: boolean | null = null;

      ctx.sphere({ radius: 1, position: [0, 0, 0] })
        .onHover((hit) => { hoverState = hit !== null; });

      ctx.handleMouseMove(400, 300); // Enter
      expect(hoverState).toBe(true);

      ctx.handleMouseMove(0, 0); // Leave (corner of screen)
      expect(hoverState).toBe(false);
    });
  });

  describe('bindings', () => {
    test('refreshBindings updates primitive positions', () => {
      const ctx = new Cosyne3dContext(mockApp);
      let x = 0;

      const sphere = ctx.sphere({})
        .bindPosition(() => [x, 0, 0] as [number, number, number]);

      x = 10;
      ctx.refreshBindings();

      expect(sphere.position.x).toBe(10);
    });

    test('refreshBindings updates camera bindings', () => {
      const ctx = new Cosyne3dContext(mockApp);
      let z = 10;

      ctx.getCamera().bindPosition(() => [0, 0, z] as [number, number, number]);

      z = 20;
      ctx.refreshBindings();

      expect(ctx.getCamera().position.z).toBe(20);
    });
  });

  describe('builder pattern', () => {
    test('rebuild clears and re-runs builder', () => {
      const ctx = new Cosyne3dContext(mockApp);
      let buildCount = 0;

      ctx.setBuilder((c) => {
        buildCount++;
        c.sphere({});
      });

      // Initial build
      ctx.rebuild();
      expect(buildCount).toBe(1);
      expect(ctx.getAllPrimitives().length).toBe(1);

      // Second rebuild
      ctx.rebuild();
      expect(buildCount).toBe(2);
      expect(ctx.getAllPrimitives().length).toBe(1); // Still 1, not 2
    });
  });

  describe('cleanup', () => {
    test('clear removes all primitives and lights', () => {
      const ctx = new Cosyne3dContext(mockApp);
      ctx.sphere({});
      ctx.box({});
      ctx.light({ type: 'directional' });

      ctx.clear();

      expect(ctx.getAllPrimitives().length).toBe(0);
      expect(ctx.getLights().length).toBe(0);
    });

    test('dispose clears context', () => {
      const ctx = new Cosyne3dContext(mockApp);
      ctx.sphere({});
      ctx.dispose();
      expect(ctx.getAllPrimitives().length).toBe(0);
    });
  });
});

describe('Global Registry', () => {
  beforeEach(() => {
    clearAllCosyne3dContexts();
  });

  test('cosyne3d creates and registers context', () => {
    const ctx = cosyne3d(mockApp, (c) => {
      c.sphere({});
    });

    expect(getAllCosyne3dContexts()).toContain(ctx);
    expect(ctx.getAllPrimitives().length).toBe(1);
  });

  test('registerCosyne3dContext adds to registry', () => {
    const ctx = new Cosyne3dContext(mockApp);
    registerCosyne3dContext(ctx);
    expect(getAllCosyne3dContexts()).toContain(ctx);
  });

  test('registerCosyne3dContext prevents duplicates', () => {
    const ctx = new Cosyne3dContext(mockApp);
    registerCosyne3dContext(ctx);
    registerCosyne3dContext(ctx);
    expect(getAllCosyne3dContexts().length).toBe(1);
  });

  test('unregisterCosyne3dContext removes from registry', () => {
    const ctx = new Cosyne3dContext(mockApp);
    registerCosyne3dContext(ctx);
    unregisterCosyne3dContext(ctx);
    expect(getAllCosyne3dContexts()).not.toContain(ctx);
  });

  test('refreshAllCosyne3dContexts calls refresh on all', () => {
    let refreshCount = 0;

    const ctx1 = cosyne3d(mockApp, (c) => {
      c.sphere({}).bindPosition(() => {
        refreshCount++;
        return [0, 0, 0];
      });
    });

    const ctx2 = cosyne3d(mockApp, (c) => {
      c.box({}).bindPosition(() => {
        refreshCount++;
        return [0, 0, 0];
      });
    });

    refreshCount = 0; // Reset after initial creation
    refreshAllCosyne3dContexts();

    expect(refreshCount).toBe(2);
  });

  test('rebuildAllCosyne3dContexts calls rebuild on all', () => {
    let buildCount = 0;

    cosyne3d(mockApp, () => { buildCount++; });
    cosyne3d(mockApp, () => { buildCount++; });

    buildCount = 0;
    rebuildAllCosyne3dContexts();

    expect(buildCount).toBe(2);
  });

  test('clearAllCosyne3dContexts disposes all', () => {
    cosyne3d(mockApp, (c) => { c.sphere({}); });
    cosyne3d(mockApp, (c) => { c.sphere({}); });

    expect(getAllCosyne3dContexts().length).toBe(2);

    clearAllCosyne3dContexts();

    expect(getAllCosyne3dContexts().length).toBe(0);
  });
});

// Mock app
const mockApp = {};
