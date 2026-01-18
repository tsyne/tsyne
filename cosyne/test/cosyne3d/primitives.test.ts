/**
 * Tests for Cosyne 3D Primitives
 */

import { Sphere3D, sphere } from '../../src/primitives3d/sphere3d';
import { Box3D, box, cube } from '../../src/primitives3d/box3d';
import { Plane3D, plane, ground } from '../../src/primitives3d/plane3d';
import { Cylinder3D, cylinder, cone } from '../../src/primitives3d/cylinder3d';
import { Vector3, Ray, Quaternion } from '../../src/math3d';
import { Material } from '../../src/material';

describe('Cosyne 3D Primitives', () => {
  describe('Sphere3D', () => {
    describe('creation', () => {
      test('creates with defaults', () => {
        const s = new Sphere3D();
        expect(s.type).toBe('sphere');
        expect(s.radius).toBe(1);
        expect(s.widthSegments).toBe(32);
        expect(s.heightSegments).toBe(16);
      });

      test('creates with options', () => {
        const s = new Sphere3D({
          radius: 5,
          position: [1, 2, 3],
          widthSegments: 64,
          heightSegments: 32,
        });
        expect(s.radius).toBe(5);
        expect(s.position.x).toBe(1);
        expect(s.widthSegments).toBe(64);
        expect(s.heightSegments).toBe(32);
      });

      test('sphere factory creates sphere', () => {
        const s = sphere({ radius: 3 });
        expect(s).toBeInstanceOf(Sphere3D);
        expect(s.radius).toBe(3);
      });
    });

    describe('properties', () => {
      test('radius is clamped to positive', () => {
        const s = new Sphere3D();
        s.radius = -5;
        expect(s.radius).toBeGreaterThan(0);
      });

      test('setRadius returns this', () => {
        const s = new Sphere3D();
        expect(s.setRadius(10)).toBe(s);
        expect(s.radius).toBe(10);
      });

      test('widthSegments is at least 3', () => {
        const s = new Sphere3D();
        s.widthSegments = 1;
        expect(s.widthSegments).toBe(3);
      });

      test('heightSegments is at least 2', () => {
        const s = new Sphere3D();
        s.heightSegments = 1;
        expect(s.heightSegments).toBe(2);
      });
    });

    describe('ray intersection', () => {
      test('ray hits sphere at origin', () => {
        const s = new Sphere3D({ radius: 1 });
        const ray = new Ray(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
        const hit = s.intersectRay(ray);
        expect(hit).not.toBeNull();
        expect(hit!.distance).toBeCloseTo(4);
        expect(hit!.point.z).toBeCloseTo(1);
        expect(hit!.normal.z).toBeCloseTo(1);
      });

      test('ray misses sphere', () => {
        const s = new Sphere3D({ radius: 1 });
        const ray = new Ray(new Vector3(10, 0, 5), new Vector3(0, 0, -1));
        const hit = s.intersectRay(ray);
        expect(hit).toBeNull();
      });

      test('ray behind sphere misses', () => {
        const s = new Sphere3D({ radius: 1 });
        const ray = new Ray(new Vector3(0, 0, -5), new Vector3(0, 0, -1));
        const hit = s.intersectRay(ray);
        expect(hit).toBeNull();
      });

      test('hit includes lat/lon data', () => {
        const s = new Sphere3D({ radius: 1 });
        const ray = new Ray(new Vector3(0, 5, 0), new Vector3(0, -1, 0));
        const hit = s.intersectRay(ray);
        expect(hit).not.toBeNull();
        expect(hit!.data?.lat).toBeDefined();
        expect(hit!.data?.lon).toBeDefined();
      });

      test('hit includes UV coordinates', () => {
        const s = new Sphere3D({ radius: 1 });
        const ray = new Ray(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
        const hit = s.intersectRay(ray);
        expect(hit).not.toBeNull();
        expect(hit!.uv).toBeDefined();
        expect(hit!.uv!.u).toBeGreaterThanOrEqual(0);
        expect(hit!.uv!.u).toBeLessThanOrEqual(1);
      });
    });

    describe('bounding box', () => {
      test('getLocalBoundingBox returns correct bounds', () => {
        const s = new Sphere3D({ radius: 5 });
        const box = s.getLocalBoundingBox();
        expect(box.min.x).toBe(-5);
        expect(box.max.x).toBe(5);
      });
    });

    describe('surface calculations', () => {
      test('getPointOnSurface returns world point', () => {
        const s = new Sphere3D({ radius: 10 });
        const point = s.getPointOnSurface(0, 0);
        expect(point.length()).toBeCloseTo(10);
      });

      test('getNormalAtSurface returns unit vector', () => {
        const s = new Sphere3D();
        const normal = s.getNormalAtSurface(0, 0);
        expect(normal.length()).toBeCloseTo(1);
      });
    });

    describe('bindings', () => {
      test('bindRadius creates binding', () => {
        const s = new Sphere3D();
        s.bindRadius(() => 5);
        expect(s.getRadiusBinding()).not.toBeNull();
      });

      test('refreshBindings updates radius', () => {
        const s = new Sphere3D({ radius: 1 });
        s.bindRadius(() => 10);
        s.refreshBindings();
        expect(s.radius).toBe(10);
      });
    });

    describe('clone', () => {
      test('clone creates copy', () => {
        const s = new Sphere3D({ radius: 5, position: [1, 2, 3] });
        const c = s.clone();
        expect(c.radius).toBe(5);
        expect(c.position.x).toBe(1);
      });

      test('clone is independent', () => {
        const s = new Sphere3D({ radius: 5 });
        const c = s.clone();
        c.radius = 10;
        expect(s.radius).toBe(5);
      });
    });
  });

  describe('Box3D', () => {
    describe('creation', () => {
      test('creates with defaults', () => {
        const b = new Box3D();
        expect(b.type).toBe('box');
        expect(b.width).toBe(1);
        expect(b.height).toBe(1);
        expect(b.depth).toBe(1);
      });

      test('creates with size number', () => {
        const b = new Box3D({ size: 5 });
        expect(b.width).toBe(5);
        expect(b.height).toBe(5);
        expect(b.depth).toBe(5);
      });

      test('creates with size array', () => {
        const b = new Box3D({ size: [2, 3, 4] });
        expect(b.width).toBe(2);
        expect(b.height).toBe(3);
        expect(b.depth).toBe(4);
      });

      test('box factory creates box', () => {
        const b = box({ width: 10 });
        expect(b).toBeInstanceOf(Box3D);
        expect(b.width).toBe(10);
      });

      test('cube factory creates cube', () => {
        const c = cube(5);
        expect(c).toBeInstanceOf(Box3D);
        expect(c.width).toBe(5);
        expect(c.height).toBe(5);
        expect(c.depth).toBe(5);
      });
    });

    describe('properties', () => {
      test('dimensions are clamped to positive', () => {
        const b = new Box3D();
        b.width = -1;
        b.height = -1;
        b.depth = -1;
        expect(b.width).toBeGreaterThan(0);
        expect(b.height).toBeGreaterThan(0);
        expect(b.depth).toBeGreaterThan(0);
      });

      test('setSize with number sets all dimensions', () => {
        const b = new Box3D();
        b.setSize(10);
        expect(b.width).toBe(10);
        expect(b.height).toBe(10);
        expect(b.depth).toBe(10);
      });

      test('setSize with array sets individual dimensions', () => {
        const b = new Box3D();
        b.setSize([1, 2, 3]);
        expect(b.width).toBe(1);
        expect(b.height).toBe(2);
        expect(b.depth).toBe(3);
      });
    });

    describe('ray intersection', () => {
      test('ray hits box at origin', () => {
        const b = new Box3D({ size: 2 });
        const ray = new Ray(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
        const hit = b.intersectRay(ray);
        expect(hit).not.toBeNull();
        expect(hit!.distance).toBeCloseTo(4);
        expect(hit!.point.z).toBeCloseTo(1);
      });

      test('ray misses box', () => {
        const b = new Box3D({ size: 2 });
        const ray = new Ray(new Vector3(10, 0, 5), new Vector3(0, 0, -1));
        const hit = b.intersectRay(ray);
        expect(hit).toBeNull();
      });

      test('hit includes face data', () => {
        const b = new Box3D({ size: 2 });
        const ray = new Ray(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
        const hit = b.intersectRay(ray);
        expect(hit).not.toBeNull();
        expect(hit!.data?.face).toBe('front');
      });

      test('different faces are detected', () => {
        const b = new Box3D({ size: 2 });

        // Hit top
        const topRay = new Ray(new Vector3(0, 5, 0), new Vector3(0, -1, 0));
        const topHit = b.intersectRay(topRay);
        expect(topHit!.data?.face).toBe('top');

        // Hit right
        const rightRay = new Ray(new Vector3(5, 0, 0), new Vector3(-1, 0, 0));
        const rightHit = b.intersectRay(rightRay);
        expect(rightHit!.data?.face).toBe('right');
      });
    });

    describe('face access', () => {
      test('getFaceVertices returns 4 vertices', () => {
        const b = new Box3D({ size: 2 });
        const vertices = b.getFaceVertices('front');
        expect(vertices.length).toBe(4);
      });

      test('getFaceCenter returns center point', () => {
        const b = new Box3D({ size: 2 });
        const center = b.getFaceCenter('front');
        expect(center.z).toBeCloseTo(1);
      });
    });

    describe('clone', () => {
      test('clone creates copy', () => {
        const b = new Box3D({ size: [1, 2, 3] });
        const c = b.clone();
        expect(c.width).toBe(1);
        expect(c.height).toBe(2);
        expect(c.depth).toBe(3);
      });
    });
  });

  describe('Plane3D', () => {
    describe('creation', () => {
      test('creates with defaults', () => {
        const p = new Plane3D();
        expect(p.type).toBe('plane');
        expect(p.width).toBe(10);
        expect(p.height).toBe(10);
      });

      test('creates with size number', () => {
        const p = new Plane3D({ size: 20 });
        expect(p.width).toBe(20);
        expect(p.height).toBe(20);
      });

      test('creates with size array', () => {
        const p = new Plane3D({ size: [30, 40] });
        expect(p.width).toBe(30);
        expect(p.height).toBe(40);
      });

      test('plane factory creates plane', () => {
        const p = plane({ width: 15 });
        expect(p).toBeInstanceOf(Plane3D);
        expect(p.width).toBe(15);
      });

      test('ground factory creates large plane', () => {
        const g = ground(200);
        expect(g).toBeInstanceOf(Plane3D);
        expect(g.width).toBe(200);
        expect(g.height).toBe(200);
      });
    });

    describe('properties', () => {
      test('dimensions are clamped to positive', () => {
        const p = new Plane3D();
        p.width = -1;
        p.height = -1;
        expect(p.width).toBeGreaterThan(0);
        expect(p.height).toBeGreaterThan(0);
      });

      test('segments are at least 1', () => {
        const p = new Plane3D();
        p.widthSegments = 0;
        p.heightSegments = 0;
        expect(p.widthSegments).toBe(1);
        expect(p.heightSegments).toBe(1);
      });
    });

    describe('ray intersection', () => {
      test('ray hits plane from above', () => {
        const p = new Plane3D({ size: 10 });
        const ray = new Ray(new Vector3(0, 5, 0), new Vector3(0, -1, 0));
        const hit = p.intersectRay(ray);
        expect(hit).not.toBeNull();
        expect(hit!.point.y).toBeCloseTo(0);
        expect(hit!.normal.y).toBeCloseTo(1);
      });

      test('ray parallel to plane misses', () => {
        const p = new Plane3D({ size: 10 });
        const ray = new Ray(new Vector3(0, 5, 0), new Vector3(1, 0, 0));
        const hit = p.intersectRay(ray);
        expect(hit).toBeNull();
      });

      test('ray outside bounds misses', () => {
        const p = new Plane3D({ size: 10 });
        const ray = new Ray(new Vector3(100, 5, 0), new Vector3(0, -1, 0));
        const hit = p.intersectRay(ray);
        expect(hit).toBeNull();
      });

      test('ray from below hits plane', () => {
        const p = new Plane3D({ size: 10 });
        const ray = new Ray(new Vector3(0, -5, 0), new Vector3(0, 1, 0));
        const hit = p.intersectRay(ray);
        expect(hit).not.toBeNull();
      });

      test('hit includes UV coordinates', () => {
        const p = new Plane3D({ size: 10 });
        const ray = new Ray(new Vector3(0, 5, 0), new Vector3(0, -1, 0));
        const hit = p.intersectRay(ray);
        expect(hit).not.toBeNull();
        expect(hit!.uv!.u).toBeCloseTo(0.5);
        expect(hit!.uv!.v).toBeCloseTo(0.5);
      });
    });

    describe('corners and normal', () => {
      test('getCorners returns 4 corners', () => {
        const p = new Plane3D({ size: 10 });
        const corners = p.getCorners();
        expect(corners.length).toBe(4);
      });

      test('getWorldNormal returns up vector by default', () => {
        const p = new Plane3D();
        const normal = p.getWorldNormal();
        expect(normal.y).toBeCloseTo(1);
      });
    });

    describe('clone', () => {
      test('clone creates copy', () => {
        const p = new Plane3D({ size: [20, 30] });
        const c = p.clone();
        expect(c.width).toBe(20);
        expect(c.height).toBe(30);
      });
    });
  });

  describe('Cylinder3D', () => {
    describe('creation', () => {
      test('creates with defaults', () => {
        const c = new Cylinder3D();
        expect(c.type).toBe('cylinder');
        expect(c.radiusTop).toBe(1);
        expect(c.radiusBottom).toBe(1);
        expect(c.height).toBe(2);
      });

      test('creates with radius', () => {
        const c = new Cylinder3D({ radius: 5 });
        expect(c.radiusTop).toBe(5);
        expect(c.radiusBottom).toBe(5);
      });

      test('creates with separate radii', () => {
        const c = new Cylinder3D({ radiusTop: 2, radiusBottom: 4 });
        expect(c.radiusTop).toBe(2);
        expect(c.radiusBottom).toBe(4);
      });

      test('cylinder factory creates cylinder', () => {
        const c = cylinder({ radius: 3 });
        expect(c).toBeInstanceOf(Cylinder3D);
        expect(c.radiusTop).toBe(3);
      });

      test('cone factory creates cone', () => {
        const c = cone(5, 10);
        expect(c).toBeInstanceOf(Cylinder3D);
        expect(c.radiusTop).toBe(0);
        expect(c.radiusBottom).toBe(5);
        expect(c.height).toBe(10);
      });
    });

    describe('properties', () => {
      test('radii are clamped to non-negative', () => {
        const c = new Cylinder3D();
        c.radiusTop = -5;
        c.radiusBottom = -5;
        expect(c.radiusTop).toBeGreaterThanOrEqual(0);
        expect(c.radiusBottom).toBeGreaterThanOrEqual(0);
      });

      test('height is clamped to positive', () => {
        const c = new Cylinder3D();
        c.height = -1;
        expect(c.height).toBeGreaterThan(0);
      });

      test('setRadius sets both radii', () => {
        const c = new Cylinder3D();
        c.setRadius(10);
        expect(c.radiusTop).toBe(10);
        expect(c.radiusBottom).toBe(10);
      });

      test('setHeight returns this', () => {
        const c = new Cylinder3D();
        expect(c.setHeight(5)).toBe(c);
        expect(c.height).toBe(5);
      });

      test('radialSegments is at least 3', () => {
        const c = new Cylinder3D();
        c.radialSegments = 1;
        expect(c.radialSegments).toBe(3);
      });

      test('heightSegments is at least 1', () => {
        const c = new Cylinder3D();
        c.heightSegments = 0;
        expect(c.heightSegments).toBe(1);
      });

      test('openEnded can be set', () => {
        const c = new Cylinder3D();
        c.openEnded = true;
        expect(c.openEnded).toBe(true);
      });
    });

    describe('ray intersection', () => {
      test('ray hits cylinder side', () => {
        const c = new Cylinder3D({ radius: 1, height: 4 });
        const ray = new Ray(new Vector3(5, 0, 0), new Vector3(-1, 0, 0));
        const hit = c.intersectRay(ray);
        expect(hit).not.toBeNull();
        expect(hit!.data?.face).toBe('side');
      });

      test('ray hits cylinder top cap', () => {
        const c = new Cylinder3D({ radius: 2, height: 2 });
        const ray = new Ray(new Vector3(0, 5, 0), new Vector3(0, -1, 0));
        const hit = c.intersectRay(ray);
        expect(hit).not.toBeNull();
        expect(hit!.data?.face).toBe('top');
      });

      test('ray hits cylinder bottom cap', () => {
        const c = new Cylinder3D({ radius: 2, height: 2 });
        const ray = new Ray(new Vector3(0, -5, 0), new Vector3(0, 1, 0));
        const hit = c.intersectRay(ray);
        expect(hit).not.toBeNull();
        expect(hit!.data?.face).toBe('bottom');
      });

      test('open ended cylinder has no cap hits', () => {
        const c = new Cylinder3D({ radius: 2, height: 2, openEnded: true });
        const ray = new Ray(new Vector3(0, 5, 0), new Vector3(0, -1, 0));
        const hit = c.intersectRay(ray);
        // Should miss caps
        expect(hit === null || hit.data?.face === 'side').toBe(true);
      });

      test('ray misses cylinder', () => {
        const c = new Cylinder3D({ radius: 1, height: 2 });
        const ray = new Ray(new Vector3(10, 0, 0), new Vector3(0, 0, -1));
        const hit = c.intersectRay(ray);
        expect(hit).toBeNull();
      });
    });

    describe('bounding box', () => {
      test('getLocalBoundingBox uses max radius', () => {
        const c = new Cylinder3D({ radiusTop: 1, radiusBottom: 3, height: 4 });
        const box = c.getLocalBoundingBox();
        expect(box.min.x).toBe(-3);
        expect(box.max.x).toBe(3);
        expect(box.min.y).toBe(-2);
        expect(box.max.y).toBe(2);
      });
    });

    describe('bindings', () => {
      test('bindRadius creates binding', () => {
        const c = new Cylinder3D();
        c.bindRadius(() => 5);
        expect(c.getRadiusBinding()).not.toBeNull();
      });

      test('bindHeight creates binding', () => {
        const c = new Cylinder3D();
        c.bindHeight(() => 10);
        expect(c.getHeightBinding()).not.toBeNull();
      });

      test('refreshBindings updates radius', () => {
        const c = new Cylinder3D({ radius: 1 });
        c.bindRadius(() => 10);
        c.refreshBindings();
        expect(c.radiusTop).toBe(10);
        expect(c.radiusBottom).toBe(10);
      });

      test('refreshBindings updates height', () => {
        const c = new Cylinder3D({ height: 2 });
        c.bindHeight(() => 20);
        c.refreshBindings();
        expect(c.height).toBe(20);
      });
    });

    describe('clone', () => {
      test('clone creates copy', () => {
        const c = new Cylinder3D({
          radiusTop: 2,
          radiusBottom: 4,
          height: 6,
          openEnded: true,
        });
        const copy = c.clone();
        expect(copy.radiusTop).toBe(2);
        expect(copy.radiusBottom).toBe(4);
        expect(copy.height).toBe(6);
        expect(copy.openEnded).toBe(true);
      });
    });
  });

  describe('Base Primitive3D functionality', () => {
    test('withId sets custom id', () => {
      const s = new Sphere3D();
      s.withId('test-sphere');
      expect(s.getId()).toBe('test-sphere');
    });

    test('setPosition accepts array', () => {
      const s = new Sphere3D();
      s.setPosition([1, 2, 3]);
      expect(s.position.x).toBe(1);
      expect(s.position.y).toBe(2);
      expect(s.position.z).toBe(3);
    });

    test('setPosition accepts object', () => {
      const s = new Sphere3D();
      s.setPosition({ x: 4, y: 5, z: 6 });
      expect(s.position.x).toBe(4);
      expect(s.position.y).toBe(5);
      expect(s.position.z).toBe(6);
    });

    test('setRotation accepts array', () => {
      const s = new Sphere3D();
      s.setRotation([Math.PI / 2, 0, 0]);
      expect(s.rotation).toBeInstanceOf(Quaternion);
    });

    test('setScale accepts number', () => {
      const s = new Sphere3D();
      s.setScale(2);
      expect(s.scale.x).toBe(2);
      expect(s.scale.y).toBe(2);
      expect(s.scale.z).toBe(2);
    });

    test('setScale accepts array', () => {
      const s = new Sphere3D();
      s.setScale([1, 2, 3]);
      expect(s.scale.x).toBe(1);
      expect(s.scale.y).toBe(2);
      expect(s.scale.z).toBe(3);
    });

    test('translate moves position', () => {
      const s = new Sphere3D({ position: [0, 0, 0] });
      s.translate(1, 2, 3);
      expect(s.position.x).toBe(1);
      expect(s.position.y).toBe(2);
      expect(s.position.z).toBe(3);
    });

    test('rotateX, rotateY, rotateZ work', () => {
      const s = new Sphere3D();
      s.rotateX(Math.PI / 4);
      s.rotateY(Math.PI / 4);
      s.rotateZ(Math.PI / 4);
      expect(s.rotation).toBeInstanceOf(Quaternion);
    });

    test('lookAt orients toward target', () => {
      const s = new Sphere3D({ position: [0, 0, 0] });
      s.lookAt(new Vector3(1, 0, 0));
      expect(s.rotation).toBeInstanceOf(Quaternion);
    });

    test('setMaterial updates material', () => {
      const s = new Sphere3D();
      s.setMaterial({ color: '#ff0000' });
      expect(s.material.color).toBe('#ff0000');
    });

    test('show and hide work', () => {
      const s = new Sphere3D();
      s.hide();
      expect(s.visible).toBe(false);
      s.show();
      expect(s.visible).toBe(true);
    });

    test('setCastShadow returns this', () => {
      const s = new Sphere3D();
      expect(s.setCastShadow(false)).toBe(s);
      expect(s.castShadow).toBe(false);
    });

    test('setReceiveShadow returns this', () => {
      const s = new Sphere3D();
      expect(s.setReceiveShadow(false)).toBe(s);
      expect(s.receiveShadow).toBe(false);
    });

    test('passthrough mode can be set', () => {
      const s = new Sphere3D();
      s.passthrough(true);
      expect(s.isPassthroughEnabled()).toBe(true);
    });

    test('event handlers can be set', () => {
      const s = new Sphere3D();
      const clickHandler = () => {};
      const hoverHandler = () => {};
      s.onClick(clickHandler);
      s.onHover(hoverHandler);
      expect(s.getClickHandler()).toBe(clickHandler);
      expect(s.getHoverHandler()).toBe(hoverHandler);
      expect(s.hasEventHandlers()).toBe(true);
    });

    test('getProperties returns serializable object', () => {
      const s = new Sphere3D({ radius: 5, position: [1, 2, 3] });
      const props = s.getProperties();
      expect(props.type).toBe('sphere');
      expect(props.radius).toBe(5);
      expect(props.position).toEqual([1, 2, 3]);
    });

    test('getWorldBoundingBox transforms to world space', () => {
      const s = new Sphere3D({ radius: 1, position: [10, 0, 0] });
      const box = s.getWorldBoundingBox();
      expect(box.min.x).toBeCloseTo(9);
      expect(box.max.x).toBeCloseTo(11);
    });

    test('dispose clears handlers and parent', () => {
      const parent = new Sphere3D();
      const child = new Sphere3D();
      parent.add(child);
      child.onClick(() => {});
      child.dispose();
      expect(child.getClickHandler()).toBeNull();
      expect(child.parent).toBeNull();
      expect(parent.children.length).toBe(0);
    });
  });

  describe('Parent-child hierarchy', () => {
    test('add sets parent', () => {
      const parent = new Sphere3D();
      const child = new Sphere3D();
      parent.add(child);
      expect(child.parent).toBe(parent);
      expect(parent.children.length).toBe(1);
    });

    test('remove clears parent', () => {
      const parent = new Sphere3D();
      const child = new Sphere3D();
      parent.add(child);
      parent.remove(child);
      expect(child.parent).toBeNull();
      expect(parent.children.length).toBe(0);
    });

    test('removeAll clears all children', () => {
      const parent = new Sphere3D();
      parent.add(new Sphere3D());
      parent.add(new Sphere3D());
      parent.removeAll();
      expect(parent.children.length).toBe(0);
    });

    test('adding to new parent removes from old', () => {
      const parent1 = new Sphere3D();
      const parent2 = new Sphere3D();
      const child = new Sphere3D();
      parent1.add(child);
      parent2.add(child);
      expect(parent1.children.length).toBe(0);
      expect(parent2.children.length).toBe(1);
    });

    test('getWorldMatrix includes parent transform', () => {
      const parent = new Sphere3D({ position: [10, 0, 0] });
      const child = new Sphere3D({ position: [5, 0, 0] });
      parent.add(child);
      const worldPos = child.getWorldPosition();
      expect(worldPos.x).toBeCloseTo(15);
    });
  });

  describe('Bindings', () => {
    test('bindPosition creates binding', () => {
      const s = new Sphere3D();
      s.bindPosition(() => [1, 2, 3] as [number, number, number]);
      expect(s.getPositionBinding()).not.toBeNull();
    });

    test('bindRotation creates binding', () => {
      const s = new Sphere3D();
      s.bindRotation(() => [0, Math.PI, 0] as [number, number, number]);
      expect(s.getRotationBinding()).not.toBeNull();
    });

    test('bindScale creates binding', () => {
      const s = new Sphere3D();
      s.bindScale(() => 2);
      expect(s.getScaleBinding()).not.toBeNull();
    });

    test('bindMaterial creates binding', () => {
      const s = new Sphere3D();
      s.bindMaterial(() => ({ color: '#ff0000' }));
      expect(s.getMaterialBinding()).not.toBeNull();
    });

    test('bindVisible creates binding', () => {
      const s = new Sphere3D();
      s.bindVisible(() => false);
      expect(s.getVisibleBinding()).not.toBeNull();
    });

    test('refreshBindings evaluates all bindings', () => {
      const s = new Sphere3D();
      s.bindPosition(() => [10, 20, 30] as [number, number, number]);
      s.bindScale(() => 5);
      s.bindVisible(() => false);
      s.refreshBindings();
      expect(s.position.x).toBe(10);
      expect(s.scale.x).toBe(5);
      expect(s.visible).toBe(false);
    });

    test('refreshBindings propagates to children', () => {
      const parent = new Sphere3D();
      const child = new Sphere3D();
      child.bindPosition(() => [1, 1, 1] as [number, number, number]);
      parent.add(child);
      parent.refreshBindings();
      expect(child.position.x).toBe(1);
    });
  });
});
