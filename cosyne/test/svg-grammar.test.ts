/**
 * Tests for SVG grammar (CvgContext, PathBuilder, svg factory)
 *
 * Mock-based — no display needed. We mock app.canvasPath(), app.canvasCircle() etc.
 * and verify the grammar calls them with correct parameters.
 */

import { CvgContext, CvgElement, CvgBuilder, PathBuilder, cvg, cvgBuilder } from '../src/cvg/grammar';

// Track all calls to the mock app
interface MockCall {
  method: string;
  args: any[];
}

function createMockWidget(type: string, initialProps: any) {
  const props = { ...initialProps };
  return {
    type,
    ...props,
    _props: props,
    update(updates: any) {
      Object.assign(props, updates);
      Object.assign(this, updates);
    },
  };
}

function createMockApp() {
  const calls: MockCall[] = [];
  const app = {
    calls,
    canvasPath(opts: any) {
      calls.push({ method: 'canvasPath', args: [opts] });
      return createMockWidget('path', opts);
    },
    canvasCircle(opts: any) {
      calls.push({ method: 'canvasCircle', args: [opts] });
      return createMockWidget('circle', opts);
    },
    canvasEllipse(opts: any) {
      calls.push({ method: 'canvasEllipse', args: [opts] });
      return createMockWidget('ellipse', opts);
    },
    canvasRectangle(opts: any) {
      calls.push({ method: 'canvasRectangle', args: [opts] });
      return createMockWidget('rect', opts);
    },
    canvasLine(x1: number, y1: number, x2: number, y2: number, opts: any) {
      calls.push({ method: 'canvasLine', args: [x1, y1, x2, y2, opts] });
      return createMockWidget('line', { x1, y1, x2, y2, ...opts });
    },
  };
  return app;
}

describe('svg factory', () => {
  it('should create context and call builder', () => {
    const app = createMockApp();
    let called = false;
    cvg(app, { viewBox: '0 0 100 100', width: 400, height: 400 }, (s) => {
      called = true;
      expect(s).toBeInstanceOf(CvgContext);
    });
    expect(called).toBe(true);
  });

  it('should use default dimensions when not specified', () => {
    const app = createMockApp();
    const ctx = cvg(app, { viewBox: '0 0 100 100' }, () => {});
    expect(ctx).toBeInstanceOf(CvgContext);
  });

  it('should handle missing viewBox', () => {
    const app = createMockApp();
    const ctx = cvg(app, { width: 200, height: 200 }, (s) => {
      // Without viewBox, 1:1 mapping
      s.path({ d: 'M 10 10 L 20 20' });
    });
    expect(app.calls).toHaveLength(1);
  });

  it('should handle viewBox as object', () => {
    const app = createMockApp();
    cvg(app, { viewBox: { minX: 0, minY: 0, width: 100, height: 100 }, width: 400, height: 400 }, (s) => {
      s.circle({ cx: 50, cy: 50, r: 10 });
    });
    expect(app.calls).toHaveLength(1);
    expect(app.calls[0].method).toBe('canvasCircle');
  });
});

describe('CvgContext coordinate mapping', () => {
  it('should map coordinates with viewBox scaling', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 400, height: 400 }, (s) => {
      // viewBox 100x100 → canvas 400x400, scale=4
      s.circle({ cx: 50, cy: 50, r: 10 });
    });
    const call = app.calls[0];
    expect(call.method).toBe('canvasCircle');
    // cx=50 → 50*4=200, r=10 → 10*4=40
    expect(call.args[0].x).toBeCloseTo(160); // 200 - 40
    expect(call.args[0].y).toBeCloseTo(160); // 200 - 40
    expect(call.args[0].x2).toBeCloseTo(240); // 200 + 40
    expect(call.args[0].y2).toBeCloseTo(240); // 200 + 40
  });

  it('should center non-square viewBox', () => {
    const app = createMockApp();
    // viewBox is 200x100, canvas is 400x400
    // scale = min(400/200, 400/100) = min(2, 4) = 2
    // offsetX = (400 - 200*2)/2 = 0
    // offsetY = (400 - 100*2)/2 = 100
    cvg(app, { viewBox: '0 0 200 100', width: 400, height: 400 }, (s) => {
      s.circle({ cx: 0, cy: 0, r: 10 });
    });
    const call = app.calls[0];
    // cx=0 → 0*2 + 0 = 0, cy=0 → 0*2 + 100 = 100
    expect(call.args[0].x).toBeCloseTo(-20); // 0 - 10*2
    expect(call.args[0].y).toBeCloseTo(80);  // 100 - 10*2
  });

  it('should handle viewBox with offset', () => {
    const app = createMockApp();
    // viewBox "10 20 100 100" → minX=10, minY=20
    cvg(app, { viewBox: '10 20 100 100', width: 400, height: 400 }, (s) => {
      s.circle({ cx: 10, cy: 20, r: 5 });
    });
    const call = app.calls[0];
    // (10 - 10)*4 + 0 = 0, (20 - 20)*4 + 0 = 0
    // r = 5*4 = 20
    expect(call.args[0].x).toBeCloseTo(-20); // 0 - 20
    expect(call.args[0].y).toBeCloseTo(-20); // 0 - 20
  });
});

describe('CvgContext.path', () => {
  it('should normalize and map path coordinates', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 400, height: 400 }, (s) => {
      s.path({ d: 'M 10 10 L 20 20 Z', fill: '#F00' });
    });
    expect(app.calls).toHaveLength(1);
    const call = app.calls[0];
    expect(call.method).toBe('canvasPath');
    // Path should be normalized and mapped
    expect(call.args[0].path).toContain('M');
    expect(call.args[0].path).toContain('L');
    expect(call.args[0].path).toContain('Z');
    expect(call.args[0].fillColor).toBe('#F00');
  });

  it('should normalize relative commands', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      // 1:1 mapping for easy verification
      s.path({ d: 'M 10 10 l 5 5' });
    });
    const path = app.calls[0].args[0].path;
    // Should be absolute — no lowercase
    expect(path).not.toMatch(/[a-z]/);
  });

  it('should return CvgElement with null underlying for empty d', () => {
    const app = createMockApp();
    let result: any;
    cvg(app, { viewBox: '0 0 100 100' }, (s) => {
      result = s.path({});
    });
    expect(result).toBeInstanceOf(CvgElement);
    expect(result.getUnderlying()).toBeNull();
    expect(app.calls).toHaveLength(0);
  });
});

describe('CvgContext.circle', () => {
  it('should render circle with fill and stroke', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.circle({ cx: 50, cy: 50, r: 20, fill: 'red', stroke: 'black', 'stroke-width': '3' });
    });
    const call = app.calls[0];
    expect(call.args[0].fillColor).toBe('red');
    expect(call.args[0].strokeColor).toBe('black');
    expect(call.args[0].strokeWidth).toBe(3);
  });

  it('should handle fill=none', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.circle({ cx: 50, cy: 50, r: 20, fill: 'none', stroke: '#000', 'stroke-width': '10' });
    });
    const call = app.calls[0];
    expect(call.args[0].fillColor).toBeUndefined();
    expect(call.args[0].strokeColor).toBe('#000');
    expect(call.args[0].strokeWidth).toBe(10);
  });

  it('should default fill to black', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.circle({ cx: 50, cy: 50, r: 20 });
    });
    const call = app.calls[0];
    expect(call.args[0].fillColor).toBe('black');
  });
});

describe('CvgContext.rect', () => {
  it('should render rectangle', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.rect({ x: 10, y: 20, width: 50, height: 30, fill: 'blue' });
    });
    const call = app.calls[0];
    expect(call.method).toBe('canvasRectangle');
    expect(call.args[0].fillColor).toBe('blue');
    expect(call.args[0].x).toBeCloseTo(10);
    expect(call.args[0].y).toBeCloseTo(20);
    expect(call.args[0].x2).toBeCloseTo(60);
    expect(call.args[0].y2).toBeCloseTo(50);
  });
});

describe('CvgContext.line', () => {
  it('should render line', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.line({ x1: 10, y1: 20, x2: 90, y2: 80, stroke: 'red', 'stroke-width': '2' });
    });
    const call = app.calls[0];
    expect(call.method).toBe('canvasLine');
    expect(call.args[0]).toBeCloseTo(10);
    expect(call.args[1]).toBeCloseTo(20);
    expect(call.args[2]).toBeCloseTo(90);
    expect(call.args[3]).toBeCloseTo(80);
    expect(call.args[4].strokeColor).toBe('red');
  });
});

describe('CvgContext.g (groups)', () => {
  it('should inherit fill from group', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ fill: 'red' }, () => {
        s.circle({ cx: 50, cy: 50, r: 10 });
      });
    });
    expect(app.calls[0].args[0].fillColor).toBe('red');
  });

  it('should inherit stroke from group', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ stroke: '#B13', 'stroke-width': '9', fill: 'none' }, () => {
        s.circle({ cx: 43, cy: 58, r: 34 });
      });
    });
    const call = app.calls[0];
    expect(call.args[0].fillColor).toBeUndefined(); // fill=none
    expect(call.args[0].strokeColor).toBe('#B13');
    expect(call.args[0].strokeWidth).toBe(9);
  });

  it('should allow child to override group style', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ fill: 'red' }, () => {
        s.circle({ cx: 50, cy: 50, r: 10, fill: 'blue' });
      });
    });
    expect(app.calls[0].args[0].fillColor).toBe('blue');
  });

  it('should pop style after group exits', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ fill: 'red' }, () => {
        s.circle({ cx: 10, cy: 10, r: 5 });
      });
      // After group, should revert to default (black)
      s.circle({ cx: 20, cy: 20, r: 5 });
    });
    expect(app.calls[0].args[0].fillColor).toBe('red');
    expect(app.calls[1].args[0].fillColor).toBe('black');
  });

  it('should support nested groups', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ fill: 'red' }, () => {
        s.g({ stroke: 'blue' }, () => {
          s.circle({ cx: 50, cy: 50, r: 10 });
        });
      });
    });
    expect(app.calls[0].args[0].fillColor).toBe('red');
    expect(app.calls[0].args[0].strokeColor).toBe('blue');
  });
});

describe('CvgContext.polyline and polygon', () => {
  it('should convert polyline points to path', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.polyline({ points: '10,10 20,20 30,10', stroke: 'black', fill: 'none' });
    });
    expect(app.calls).toHaveLength(1);
    expect(app.calls[0].method).toBe('canvasPath');
    // Should contain M and L commands
    const path = app.calls[0].args[0].path;
    expect(path).toContain('M');
    expect(path).toContain('L');
  });

  it('should convert polygon points to closed path', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.polygon({ points: '10,10 20,20 30,10', fill: 'green' });
    });
    expect(app.calls).toHaveLength(1);
    const path = app.calls[0].args[0].path;
    expect(path).toContain('Z');
  });
});

describe('CvgContext.desc and defs', () => {
  it('desc should not create any canvas elements', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100' }, (s) => {
      s.desc({});
    });
    expect(app.calls).toHaveLength(0);
  });

  it('defs should not create any canvas elements', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100' }, (s) => {
      s.defs({}, () => {});
    });
    expect(app.calls).toHaveLength(0);
  });
});

describe('PathBuilder', () => {
  it('should build a simple path with fill', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.pathBuilder()
        .moveTo(10, 10)
        .lineTo(20, 20)
        .lineTo(30, 10)
        .close()
        .fill('#F00');
    });
    expect(app.calls).toHaveLength(1);
    expect(app.calls[0].method).toBe('canvasPath');
    expect(app.calls[0].args[0].fillColor).toBe('#F00');
    const path = app.calls[0].args[0].path;
    expect(path).toContain('M');
    expect(path).toContain('L');
    expect(path).toContain('Z');
  });

  it('should build a path with stroke', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.pathBuilder()
        .moveTo(0, 0)
        .lineTo(100, 100)
        .stroke('blue', 3);
    });
    expect(app.calls).toHaveLength(1);
    expect(app.calls[0].args[0].strokeColor).toBe('blue');
    expect(app.calls[0].args[0].strokeWidth).toBe(3);
  });

  it('should handle cubicTo', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.pathBuilder()
        .moveTo(50, 30)
        .cubicTo(59, 8, 92, 6, 98, 30)
        .close()
        .fill('#F00');
    });
    const path = app.calls[0].args[0].path;
    expect(path).toContain('C');
  });

  it('should handle arc via normalizer', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.pathBuilder()
        .moveTo(50, 50)
        .arc(25, 25, 0, 0, 1, 75, 75)
        .fill('green');
    });
    expect(app.calls).toHaveLength(1);
    // Arc should have been converted to cubic
    const path = app.calls[0].args[0].path;
    expect(path).toContain('C');
    expect(path).not.toContain('A');
  });

  it('should handle quadraticTo', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.pathBuilder()
        .moveTo(10, 80)
        .quadraticTo(95, 10, 180, 80)
        .fill('red');
    });
    const path = app.calls[0].args[0].path;
    // Should have been promoted to cubic
    expect(path).toContain('C');
    expect(path).not.toContain('Q');
  });

  it('should support fill then stroke chaining', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.pathBuilder()
        .moveTo(10, 10)
        .lineTo(90, 90)
        .fill('#F00')
        .stroke('#000', 2);
    });
    // fill() and stroke() each render, so 2 calls
    expect(app.calls).toHaveLength(2);
  });
});

describe('CvgElement fluent chaining', () => {
  it('should allow .fill() after circle', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.circle({ r: 15, cx: 50, cy: 18 }).fill('#900');
    });
    expect(app.calls).toHaveLength(1);
    // The initial circle is created with default fill (black), then .fill() updates it
    const widget = app.calls[0].args[0];
    // After .fill('#900'), the underlying widget's props should be updated
  });

  it('should allow .stroke() after path', () => {
    const app = createMockApp();
    let elem: CvgElement;
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      elem = s.path({ d: 'M 10 10 L 90 90' }).stroke('blue', 3);
    });
    expect(elem!).toBeInstanceOf(CvgElement);
    expect(elem!.getUnderlying()._props.strokeColor).toBe('blue');
    expect(elem!.getUnderlying()._props.strokeWidth).toBe(3);
  });

  it('should chain .fill() then .stroke()', () => {
    const app = createMockApp();
    let elem: CvgElement;
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      elem = s.circle({ r: 20, cx: 50, cy: 50 }).fill('#F00').stroke('#000', 2);
    });
    expect(elem!.getUnderlying()._props.fillColor).toBe('#F00');
    expect(elem!.getUnderlying()._props.strokeColor).toBe('#000');
    expect(elem!.getUnderlying()._props.strokeWidth).toBe(2);
  });

  it('.fill() on empty path (no d) should not throw', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100' }, (s) => {
      // Should not throw even though underlying is null
      s.path({}).fill('red');
    });
    expect(app.calls).toHaveLength(0);
  });
});

describe('CvgBuilder (builder-style API)', () => {
  it('should create svg context via s.svg()', () => {
    const app = createMockApp();
    const s = cvgBuilder(app);
    const ctx = s.svg({ viewBox: '0 0 100 100', width: 400, height: 400 }, () => {
      s.circle({ cx: 50, cy: 50, r: 10 });
    });
    expect(ctx).toBeInstanceOf(CvgContext);
    expect(app.calls).toHaveLength(1);
    expect(app.calls[0].method).toBe('canvasCircle');
  });

  it('should pass CvgContext as argument when builder has parameter', () => {
    const app = createMockApp();
    const s = cvgBuilder(app);
    let receivedCtx: CvgContext | null = null;
    s.svg({ viewBox: '0 0 100 100' }, (ctx) => {
      receivedCtx = ctx;
      ctx.circle({ cx: 50, cy: 50, r: 10 });
    });
    expect(receivedCtx).toBeInstanceOf(CvgContext);
  });

  it('should support the full user-facing pattern', () => {
    const app = createMockApp();
    const s = cvgBuilder(app);
    s.svg({ viewBox: '0 0 100 100' }, () => {
      s.path({
        d: 'M19,16a46,46 0,1,0 62,0l-8,8a34,34 0,1,1-46,0z',
        fill: '#069',
      });
      s.circle({ r: 15, cx: 50, cy: 18 }).fill('#900');
    });
    expect(app.calls).toHaveLength(2);
    expect(app.calls[0].method).toBe('canvasPath');
    expect(app.calls[0].args[0].fillColor).toBe('#069');
    expect(app.calls[1].method).toBe('canvasCircle');
    // .fill('#900') updates the underlying widget
    expect(app.calls[1].args[0].fillColor).toBe('black'); // initial creation is black
    // But after .fill(), the widget's props should have been updated
  });

  it('should support groups via builder', () => {
    const app = createMockApp();
    const s = cvgBuilder(app);
    s.svg({ viewBox: '0 0 100 100' }, () => {
      s.g({ fill: 'red', stroke: '#000' }, () => {
        s.circle({ cx: 50, cy: 50, r: 20 });
      });
    });
    expect(app.calls[0].args[0].fillColor).toBe('red');
    expect(app.calls[0].args[0].strokeColor).toBe('#000');
  });

  it('should support pathBuilder via builder', () => {
    const app = createMockApp();
    const s = cvgBuilder(app);
    s.svg({ viewBox: '0 0 100 100' }, () => {
      s.pathBuilder()
        .moveTo(10, 10)
        .lineTo(90, 90)
        .stroke('green', 2);
    });
    expect(app.calls).toHaveLength(1);
    expect(app.calls[0].args[0].strokeColor).toBe('green');
  });
});
