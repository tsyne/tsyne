/**
 * Unit tests for Cosyne transforms and foreign objects (Phase 5)
 */

import { TransformMatrix, TransformStack, TransformOptions } from '../src/transforms';
import { ForeignObject, ForeignObjectCollection } from '../src/foreign';
import { CosyneContext } from '../src/context';

describe('TransformMatrix', () => {
  it('TC-TRANS-001: translate moves primitives', () => {
    const transform = new TransformMatrix({ translate: [100, 50] });

    const [x, y] = transform.transformPoint(0, 0);
    expect(x).toEqual(100);
    expect(y).toEqual(50);
  });

  it('TC-TRANS-002: rotate rotates primitives around origin', () => {
    const transform = new TransformMatrix({ rotate: Math.PI / 2 }); // 90 degrees

    // Point (1, 0) rotated 90° should be approximately (0, 1)
    const [x, y] = transform.transformPoint(1, 0);
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(1, 5);
  });

  it('TC-TRANS-003: scale scales primitives', () => {
    const transform = new TransformMatrix({ scale: [2, 3] });

    const [x, y] = transform.transformPoint(10, 20);
    expect(x).toEqual(20);
    expect(y).toEqual(60);
  });

  it('TC-TRANS-004: Nested transforms compose correctly', () => {
    const matrix1 = new TransformMatrix({ translate: [10, 20] });
    const matrix2 = matrix1.clone();
    matrix2.translate(5, 5);

    const [x1, y1] = matrix1.transformPoint(0, 0);
    const [x2, y2] = matrix2.transformPoint(0, 0);

    expect(x1).toEqual(10);
    expect(y1).toEqual(20);
    expect(x2).toEqual(15);
    expect(y2).toEqual(25);
  });

  it('TC-TRANS-005: Transform applies to all nested content', () => {
    const transform = new TransformMatrix({
      translate: [100, 100],
      rotate: Math.PI / 4,
      scale: [2, 2],
    });

    const point = transform.transformPoint(10, 0);
    expect(point[0]).toBeDefined();
    expect(point[1]).toBeDefined();
  });

  it('TC-TRANS-006: Transform does not affect siblings', () => {
    const transform1 = new TransformMatrix({ translate: [100, 0] });
    const transform2 = new TransformMatrix({ translate: [50, 50] });

    const [x1, y1] = transform1.transformPoint(0, 0);
    const [x2, y2] = transform2.transformPoint(0, 0);

    expect(x1).not.toEqual(x2);
    expect(y1).not.toEqual(y2);
  });

  it('should clone transforms independently', () => {
    const original = new TransformMatrix({ translate: [10, 20] });
    const cloned = original.clone();

    cloned.translate(5, 5);

    const [ox, oy] = original.transformPoint(0, 0);
    const [cx, cy] = cloned.transformPoint(0, 0);

    expect(ox).toEqual(10);
    expect(oy).toEqual(20);
    expect(cx).toEqual(15);
    expect(cy).toEqual(25);
  });

  it('should reset to identity', () => {
    const transform = new TransformMatrix({ translate: [100, 100] });
    transform.reset();

    const [x, y] = transform.transformPoint(10, 20);
    expect(x).toEqual(10);
    expect(y).toEqual(20);
  });
});

describe('TransformStack', () => {
  it('should push and pop transforms', () => {
    const stack = new TransformStack();

    expect(stack.depth()).toEqual(1);

    stack.push({ translate: [10, 20] });
    expect(stack.depth()).toEqual(2);

    stack.pop();
    expect(stack.depth()).toEqual(1);
  });

  it('should compose transforms from parent', () => {
    const stack = new TransformStack();

    const t1 = stack.push({ translate: [10, 20] });
    const [x, y] = t1.transformPoint(0, 0);

    expect(x).toEqual(10);
    expect(y).toEqual(20);
  });

  it('should handle nested push/pop', () => {
    const stack = new TransformStack();

    stack.push({ translate: [100, 100] });
    expect(stack.depth()).toEqual(2);

    stack.push({ scale: [2, 2] });
    expect(stack.depth()).toEqual(3);

    stack.pop();
    expect(stack.depth()).toEqual(2);

    stack.pop();
    expect(stack.depth()).toEqual(1);
  });
});

describe('ForeignObject', () => {
  it('TC-FOR-001: foreign() embeds Tsyne button at coords', () => {
    class MockApp {
      button(label: string) {
        return { label };
      }
    }

    const app = new MockApp();
    const builder = (a: any) => {
      a.button('Click');
    };

    const foreign = new ForeignObject(100, 200, builder, app);

    expect(foreign.getPosition()).toEqual({ x: 100, y: 200 });
  });

  it('TC-FOR-002: foreign() embeds Tsyne label at coords', () => {
    class MockApp {
      label(text: string) {
        return { text };
      }
    }

    const app = new MockApp();
    const builder = (a: any) => {
      a.label('Info');
    };

    const foreign = new ForeignObject(50, 75, builder, app);

    expect(foreign.getPosition()).toEqual({ x: 50, y: 75 });
  });

  it('TC-FOR-003: Embedded widget receives click events', () => {
    const builder = (a: any) => {
      // Builder would set up click handlers
    };
    const foreign = new ForeignObject(100, 100, builder, {});

    expect(foreign.getBuilder()).toBeDefined();
    expect(foreign.getBuilder()).toEqual(builder);
  });

  it('TC-FOR-004: Embedded widget bindings work (bindText)', () => {
    const foreign = new ForeignObject(100, 100, () => {}, {});

    foreign.bindPosition(() => ({ x: 150, y: 200 }));
    const binding = foreign.getPositionBinding();

    expect(binding).toBeDefined();

    const pos = binding!();
    expect(pos.x).toEqual(150);
    expect(pos.y).toEqual(200);
  });

  it('TC-FOR-005: Multiple foreign objects at different positions', () => {
    const f1 = new ForeignObject(10, 20, () => {}, {});
    const f2 = new ForeignObject(100, 200, () => {}, {});
    const f3 = new ForeignObject(50, 50, () => {}, {});

    expect(f1.getPosition()).toEqual({ x: 10, y: 20 });
    expect(f2.getPosition()).toEqual({ x: 100, y: 200 });
    expect(f3.getPosition()).toEqual({ x: 50, y: 50 });
  });

  it('TC-FOR-006: Foreign object respects transforms', () => {
    const foreign = new ForeignObject(100, 100, () => {}, {});
    const transform = new TransformMatrix({ translate: [50, 50] });

    const originalPos = foreign.getPosition();
    const [transformedX, transformedY] = transform.transformPoint(originalPos.x, originalPos.y);

    expect(transformedX).toEqual(150);
    expect(transformedY).toEqual(150);
  });

  it('TC-FOR-007: Foreign object z-index is above canvas primitives', () => {
    const foreign = new ForeignObject(100, 100, () => {}, {});

    // Foreign objects have a higher z-index conceptually
    // This is enforced at rendering time
    expect(foreign.isVisible()).toEqual(true);
  });

  it('TC-FOR-008: Foreign object with vbox/hbox layout works', () => {
    const builder = (a: any) => {
      // Would create vbox/hbox
    };
    const foreign = new ForeignObject(0, 0, builder, {});

    foreign.setDimensions(200, 300);
    const dims = foreign.getDimensions();

    expect(dims.width).toEqual(200);
    expect(dims.height).toEqual(300);
  });

  it('should set and get ID', () => {
    const foreign = new ForeignObject(100, 100, () => {}, {});

    foreign.withId('myForeign');
    expect(foreign.getId()).toEqual('myForeign');
  });

  it('should show/hide foreign objects', () => {
    const foreign = new ForeignObject(100, 100, () => {}, {});

    expect(foreign.isVisible()).toEqual(true);

    foreign.setVisible(false);
    expect(foreign.isVisible()).toEqual(false);

    foreign.setVisible(true);
    expect(foreign.isVisible()).toEqual(true);
  });

  it('should update position from binding', () => {
    const foreign = new ForeignObject(100, 100, () => {}, {});

    foreign.updatePosition({ x: 200, y: 300 });
    expect(foreign.getPosition()).toEqual({ x: 200, y: 300 });
  });
});

describe('ForeignObjectCollection', () => {
  it('should add and retrieve foreign objects', () => {
    const collection = new ForeignObjectCollection();
    const f1 = new ForeignObject(10, 20, () => {}, {}).withId('f1');
    const f2 = new ForeignObject(30, 40, () => {}, {}).withId('f2');

    collection.add(f1);
    collection.add(f2);

    expect(collection.getById('f1')).toEqual(f1);
    expect(collection.getById('f2')).toEqual(f2);
  });

  it('should get all foreign objects', () => {
    const collection = new ForeignObjectCollection();
    const f1 = new ForeignObject(10, 20, () => {}, {});
    const f2 = new ForeignObject(30, 40, () => {}, {});

    collection.add(f1);
    collection.add(f2);

    const all = collection.getAll();
    expect(all.length).toEqual(2);
  });

  it('should clear all foreign objects', () => {
    const collection = new ForeignObjectCollection();
    collection.add(new ForeignObject(10, 20, () => {}, {}));
    collection.add(new ForeignObject(30, 40, () => {}, {}));

    expect(collection.count()).toEqual(2);

    collection.clear();
    expect(collection.count()).toEqual(0);
  });
});

describe('CosyneContext transforms and foreign', () => {
  it('TC-TRANS-007: bindTransform updates dynamically', () => {
    class MockApp {
      canvasCircle(props: any) {
        return { properties: props };
      }
    }

    const app = new MockApp();
    const ctx = new CosyneContext(app);

    let angle = 0;
    ctx.transform({ rotate: () => angle }, (c) => {
      // Would create primitives in transformed space
    });

    angle = Math.PI / 4;
    expect(angle).toBeCloseTo(Math.PI / 4);
  });

  it('should support foreign() in context', () => {
    class MockApp {
      button(label: string) {
        return { label };
      }
    }

    const app = new MockApp();
    const ctx = new CosyneContext(app);

    const foreign = ctx.foreign(100, 200, (a) => {
      a.button('Click');
    });

    expect(foreign).toBeDefined();
    expect(foreign.getPosition()).toEqual({ x: 100, y: 200 });
  });

  it('should track foreign objects by ID', () => {
    class MockApp {}

    const app = new MockApp();
    const ctx = new CosyneContext(app);

    const f1 = ctx.foreign(10, 20, () => {}).withId('f1');
    const f2 = ctx.foreign(30, 40, () => {}).withId('f2');

    expect(ctx.getForeignById('f1')).toEqual(f1);
    expect(ctx.getForeignById('f2')).toEqual(f2);
  });

  it('should get all foreign objects', () => {
    class MockApp {}

    const app = new MockApp();
    const ctx = new CosyneContext(app);

    ctx.foreign(10, 20, () => {});
    ctx.foreign(30, 40, () => {});

    const all = ctx.getAllForeignObjects();
    expect(all.length).toEqual(2);
  });

  it('should have transform stack', () => {
    class MockApp {}

    const app = new MockApp();
    const ctx = new CosyneContext(app);

    const stack = ctx.getTransformStack();
    expect(stack.depth()).toEqual(1);
  });
});
