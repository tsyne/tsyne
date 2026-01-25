/**
 * Cosyne 3D Integration Tests
 *
 * Tests the Cosyne 3D declarative scene graph system
 */

import {
  Cosyne3dContext,
  cosyne3d,
  clearAllCosyne3dContexts,
  refreshAllCosyne3dContexts,
  Vector3,
  Ray,
  Matrix4,
  Quaternion,
  Sphere3D,
  Box3D,
  Plane3D,
  Cylinder3D,
  Material,
  Materials,
  DirectionalLight,
  PointLight,
  AmbientLight,
} from 'cosyne';

describe('Cosyne 3D Integration', () => {
  const mockApp = {};

  beforeEach(() => {
    clearAllCosyne3dContexts();
  });

  describe('Scene Graph Construction', () => {
    test('creates a complete scene with primitives and lights', () => {
      const scene = cosyne3d(mockApp, (ctx) => {
        // Add camera
        ctx.setCamera({
          fov: 60,
          position: [0, 5, 10],
          lookAt: [0, 0, 0],
        });

        // Add lights
        ctx.light({ type: 'ambient', intensity: 0.3 });
        ctx.light({ type: 'directional', direction: [0, -1, 0], intensity: 0.8 });

        // Add primitives
        ctx.sphere({ radius: 1, position: [0, 1, 0] });
        ctx.box({ size: 2, position: [3, 1, 0] });
        ctx.plane({ size: 10, position: [0, 0, 0] });
        ctx.cylinder({ radius: 0.5, height: 2, position: [-3, 1, 0] });
      });

      expect(scene.getAllPrimitives().length).toBe(4);
      expect(scene.getLights().length).toBe(2);
    });

    test('creates hierarchical scene with transforms', () => {
      const scene = cosyne3d(mockApp, (ctx) => {
        ctx.transform({ translate: [5, 0, 0] }, (c) => {
          c.sphere({ radius: 1, id: 'outer-sphere' });

          c.transform({ translate: [2, 0, 0] }, (c2) => {
            c2.sphere({ radius: 0.5, id: 'inner-sphere' });
          });
        });
      });

      const outer = scene.getPrimitiveById('outer-sphere');
      const inner = scene.getPrimitiveById('inner-sphere');

      expect(outer?.position.x).toBe(5);
      expect(inner?.position.x).toBe(7); // 5 + 2
    });

    test('creates scene with collections', () => {
      const data = [
        { id: 'a', x: 0 },
        { id: 'b', x: 2 },
        { id: 'c', x: 4 },
      ];

      const scene = cosyne3d(mockApp, (ctx) => {
        ctx.spheres<typeof data[0]>()
          .bindTo({
            items: () => data,
            render: (item) => new Sphere3D({
              position: [item.x, 0, 0],
              id: item.id,
            }),
            trackBy: (item) => item.id,
          })
          .evaluate();
      });

      expect(scene.getAllPrimitives().length).toBe(3);
      expect(scene.getPrimitiveById('a')).toBeDefined();
      expect(scene.getPrimitiveById('b')).toBeDefined();
      expect(scene.getPrimitiveById('c')).toBeDefined();
    });
  });

  describe('Ray Casting', () => {
    test('raycasts to find sphere intersection', () => {
      const scene = cosyne3d(mockApp, (ctx) => {
        ctx.sphere({ radius: 1, position: [0, 0, 0] });
      });

      const ray = new Ray(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
      const hits = scene.raycast(ray);

      expect(hits.length).toBe(1);
      expect(hits[0].primitive).toBeInstanceOf(Sphere3D);
      expect(hits[0].point.z).toBeCloseTo(1);
    });

    test('raycasts through multiple objects', () => {
      const scene = cosyne3d(mockApp, (ctx) => {
        ctx.sphere({ radius: 1, position: [0, 0, 0], id: 'near' });
        ctx.sphere({ radius: 1, position: [0, 0, -5], id: 'far' });
      });

      const ray = new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1));
      const hits = scene.raycast(ray);

      expect(hits.length).toBe(2);
      expect(hits[0].primitive.getId()).toBe('near');
      expect(hits[1].primitive.getId()).toBe('far');
    });

    test('raycastClosest returns nearest hit', () => {
      const scene = cosyne3d(mockApp, (ctx) => {
        ctx.sphere({ radius: 1, position: [0, 0, 0], id: 'near' });
        ctx.sphere({ radius: 1, position: [0, 0, -10], id: 'far' });
      });

      const ray = new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1));
      const hit = scene.raycastClosest(ray);

      expect(hit).not.toBeNull();
      expect(hit!.primitive.getId()).toBe('near');
    });

    test('raycast ignores hidden primitives', () => {
      const scene = cosyne3d(mockApp, (ctx) => {
        ctx.sphere({ radius: 1, position: [0, 0, 0] }).hide();
      });

      const ray = new Ray(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
      const hits = scene.raycast(ray);

      expect(hits.length).toBe(0);
    });
  });

  describe('Bindings and Reactivity', () => {
    test('position binding updates on refresh', () => {
      let x = 0;
      const scene = cosyne3d(mockApp, (ctx) => {
        ctx.sphere({ radius: 1, id: 'moving' })
          .bindPosition(() => [x, 0, 0] as [number, number, number]);
      });

      const sphere = scene.getPrimitiveById('moving');
      expect(sphere?.position.x).toBe(0);

      x = 10;
      refreshAllCosyne3dContexts();

      expect(sphere?.position.x).toBe(10);
    });

    test('material binding updates on refresh', () => {
      let selected = false;
      const scene = cosyne3d(mockApp, (ctx) => {
        ctx.sphere({ radius: 1, id: 'selectable' })
          .bindMaterial(() => ({
            color: selected ? '#00ff00' : '#ff0000',
          }));
      });

      // Bindings are evaluated on refresh
      refreshAllCosyne3dContexts();

      const sphere = scene.getPrimitiveById('selectable');
      expect(sphere?.material.color).toBe('#ff0000');

      selected = true;
      refreshAllCosyne3dContexts();

      expect(sphere?.material.color).toBe('#00ff00');
    });

    test('visibility binding updates on refresh', () => {
      let visible = true;
      const scene = cosyne3d(mockApp, (ctx) => {
        ctx.sphere({ radius: 1, id: 'toggleable' })
          .bindVisible(() => visible);
      });

      const sphere = scene.getPrimitiveById('toggleable');
      expect(sphere?.visible).toBe(true);

      visible = false;
      refreshAllCosyne3dContexts();

      expect(sphere?.visible).toBe(false);
    });
  });

  describe('Event Handling', () => {
    test('click handler receives hit information', async () => {
      let clickedHit: any = null;

      const scene = cosyne3d(mockApp, (ctx) => {
        ctx.setCamera({
          fov: 60,
          position: [0, 0, 10],
          lookAt: [0, 0, 0],
        });

        ctx.sphere({ radius: 1, position: [0, 0, 0] })
          .onClick((hit) => {
            clickedHit = hit;
          });
      }, { width: 800, height: 600 });

      // Click at center of screen should hit the sphere
      await scene.handleClick(400, 300);

      expect(clickedHit).not.toBeNull();
      expect(clickedHit.primitive).toBeInstanceOf(Sphere3D);
    });

    test('hover handler receives enter and leave events', () => {
      let hoverState: boolean | null = null;

      const scene = cosyne3d(mockApp, (ctx) => {
        ctx.setCamera({
          fov: 60,
          position: [0, 0, 10],
          lookAt: [0, 0, 0],
        });

        ctx.sphere({ radius: 1, position: [0, 0, 0] })
          .onHover((hit) => {
            hoverState = hit !== null;
          });
      }, { width: 800, height: 600 });

      // Move to center (should hover)
      scene.handleMouseMove(400, 300);
      expect(hoverState).toBe(true);

      // Move away (should leave)
      scene.handleMouseMove(0, 0);
      expect(hoverState).toBe(false);
    });
  });

  describe('Material System', () => {
    test('preset materials are applied correctly', () => {
      const scene = cosyne3d(mockApp, (ctx) => {
        ctx.sphere({ radius: 1 }).setMaterial(Materials.gold());
        ctx.sphere({ radius: 1 }).setMaterial(Materials.silver());
        ctx.sphere({ radius: 1 }).setMaterial(Materials.glass());
      });

      const primitives = scene.getAllPrimitives();
      expect(primitives[0].material.color).toBe('#ffd700');
      expect(primitives[1].material.color).toBe('#c0c0c0');
      expect(primitives[2].material.opacity).toBeLessThan(1);
    });
  });

  describe('Camera', () => {
    test('camera can be repositioned', () => {
      const scene = cosyne3d(mockApp, (ctx) => {
        ctx.setCamera({
          position: [0, 10, 20],
          lookAt: [0, 0, 0],
        });
      });

      const camera = scene.getCamera();
      expect(camera.position.y).toBe(10);
      expect(camera.position.z).toBe(20);
    });

    test('camera binding updates on refresh', () => {
      let cameraZ = 10;
      const scene = cosyne3d(mockApp, (ctx) => {
        ctx.getCamera()
          .bindPosition(() => [0, 0, cameraZ] as [number, number, number]);
      });

      expect(scene.getCamera().position.z).toBe(10);

      cameraZ = 20;
      refreshAllCosyne3dContexts();

      expect(scene.getCamera().position.z).toBe(20);
    });
  });

  describe('Lighting', () => {
    test('multiple light types can be added', () => {
      const scene = cosyne3d(mockApp, (ctx) => {
        ctx.light({ type: 'ambient', intensity: 0.2 });
        ctx.light({ type: 'directional', direction: [0, -1, 0] });
        ctx.light({ type: 'point', position: [0, 5, 0] });
        ctx.light({ type: 'spot', position: [0, 5, 0], direction: [0, -1, 0] });
      });

      expect(scene.getLights().length).toBe(4);
    });
  });

  describe('Scene Statistics', () => {
    test('getStats returns correct counts', () => {
      const scene = cosyne3d(mockApp, (ctx) => {
        ctx.sphere({});
        ctx.box({});
        ctx.plane({});
        ctx.cylinder({}).hide();
        ctx.light({ type: 'ambient' });
        ctx.light({ type: 'directional' });
      });

      const stats = scene.getStats();
      expect(stats.primitiveCount).toBe(4);
      expect(stats.lightCount).toBe(2);
      expect(stats.visibleCount).toBe(3);
    });
  });

  describe('Rebuild', () => {
    test('rebuild recreates scene from builder', () => {
      let sphereCount = 2;
      const scene = cosyne3d(mockApp, (ctx) => {
        for (let i = 0; i < sphereCount; i++) {
          ctx.sphere({ position: [i * 2, 0, 0] });
        }
      });

      expect(scene.getAllPrimitives().length).toBe(2);

      sphereCount = 5;
      scene.rebuild();

      expect(scene.getAllPrimitives().length).toBe(5);
    });
  });
});

describe('Cosyne 3D Math', () => {
  describe('Vector3', () => {
    test('basic operations work correctly', () => {
      const a = new Vector3(1, 2, 3);
      const b = new Vector3(4, 5, 6);

      expect(a.add(b).x).toBe(5);
      expect(a.sub(b).x).toBe(-3);
      expect(a.multiplyScalar(2).x).toBe(2);
      expect(a.dot(b)).toBe(32);
    });

    test('normalize creates unit vector', () => {
      const v = new Vector3(3, 4, 0);
      const n = v.normalize();
      expect(n.length()).toBeCloseTo(1);
    });
  });

  describe('Matrix4', () => {
    test('translation matrix works', () => {
      const m = Matrix4.translation(10, 20, 30);
      const v = new Vector3(0, 0, 0);
      const result = v.applyMatrix4(m);

      expect(result.x).toBeCloseTo(10);
      expect(result.y).toBeCloseTo(20);
      expect(result.z).toBeCloseTo(30);
    });

    test('rotation matrix works', () => {
      const m = Matrix4.rotationY(Math.PI);
      const v = new Vector3(1, 0, 0);
      const result = v.applyMatrix4(m);

      expect(result.x).toBeCloseTo(-1);
      expect(result.z).toBeCloseTo(0);
    });
  });

  describe('Quaternion', () => {
    test('fromAxisAngle creates correct rotation', () => {
      const q = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
      const v = new Vector3(1, 0, 0);
      const result = v.applyQuaternion(q);

      expect(result.x).toBeCloseTo(0);
      expect(result.z).toBeCloseTo(-1);
    });
  });

  describe('Ray', () => {
    test('at returns point along ray', () => {
      const ray = new Ray(new Vector3(0, 0, 0), new Vector3(1, 0, 0));
      const point = ray.at(5);

      expect(point.x).toBe(5);
      expect(point.y).toBe(0);
      expect(point.z).toBe(0);
    });
  });
});
