/**
 * Tests for HiDPI-aware coordinate mapping in CVG.
 *
 * Verifies that canvasPath and canvasRectangle coordinates are consistent
 * across different viewBox→canvas ratios, and that path elements inside
 * g() groups (like chess pieces in squares) produce coordinates that fall
 * within the corresponding rectangle bounds.
 *
 * Background: On HiDPI displays (e.g. 153 DPI = 1.6x), Fyne's canvas.Raster
 * callback receives device-pixel dimensions. The Go-side PathRaster.render()
 * must scale path coordinates accordingly. These TS-side tests verify the
 * coordinate pipeline that produces those path coordinates is correct.
 *
 *   cd cosyne && npx jest test/svg-hidpi-scaling.test.ts --forceExit
 */

import { cvg, CvgContext } from '../src/cvg/grammar';

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

function userCalls(app: { calls: MockCall[] }): MockCall[] {
  return app.calls.filter(c => !(c.method === 'canvasRectangle' && c.args[0]?.fillColor === 'transparent'));
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
    canvasRectangle(opts: any) {
      calls.push({ method: 'canvasRectangle', args: [opts] });
      return createMockWidget('rect', opts);
    },
    canvasLine(x1: number, y1: number, x2: number, y2: number, opts: any) {
      calls.push({ method: 'canvasLine', args: [x1, y1, x2, y2, opts] });
      return createMockWidget('line', { x1, y1, x2, y2, ...opts });
    },
    clip(builder: () => void) { builder(); return createMockWidget('clip', {}); },
    stack(builder: () => void) { builder(); return createMockWidget('stack', {}); },
    canvasStack(builder: () => void) { builder(); return createMockWidget('canvasStack', {}); },
    tappableCanvasRaster() { return createMockWidget('tappable', {}); },
  };
  return app;
}

/** Extract numeric x,y pairs from a mapped path string */
function extractPathCoords(path: string): [number, number][] {
  const coords: [number, number][] = [];
  const re = /([MLCZ])\s*([\d\s.e+-]*)/gi;
  let m;
  while ((m = re.exec(path)) !== null) {
    if (m[1].toUpperCase() === 'Z') continue;
    const nums = m[2].trim().split(/\s+/).map(Number);
    for (let i = 0; i + 1 < nums.length; i += 2) {
      coords.push([nums[i], nums[i + 1]]);
    }
  }
  return coords;
}

/** Compute bounding box of path coordinates */
function pathBounds(coords: [number, number][]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of coords) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

// ─── Path coordinates match rectangle positions ────────────────

describe('path and rect coordinate consistency', () => {
  // The chess bug: paths inside g({ transform: { translate: [x, y] } }) were
  // rendering at a smaller grid than rects. Verify they produce matching coords.

  it('path inside g() at (0,0) falls within rect at same position (1:1 mapping)', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      // Board square
      s.rect({ x: 0, y: 0, width: 25, height: 25, fill: '#CCC' });
      // Piece in same square
      s.g({ transform: { translate: [0, 0] } }, () => {
        s.path({ d: 'M 5 5 L 20 5 L 20 20 L 5 20 Z', fill: '#000' });
      });
    });
    const calls = userCalls(app);
    const rectCall = calls.find(c => c.method === 'canvasRectangle')!;
    const pathCall = calls.find(c => c.method === 'canvasPath')!;

    const rectBounds = {
      minX: rectCall.args[0].x,
      minY: rectCall.args[0].y,
      maxX: rectCall.args[0].x2,
      maxY: rectCall.args[0].y2,
    };
    const pCoords = extractPathCoords(pathCall.args[0].path);
    const pBounds = pathBounds(pCoords);

    // Path should be inside the rect
    expect(pBounds.minX).toBeGreaterThanOrEqual(rectBounds.minX - 1);
    expect(pBounds.minY).toBeGreaterThanOrEqual(rectBounds.minY - 1);
    expect(pBounds.maxX).toBeLessThanOrEqual(rectBounds.maxX + 1);
    expect(pBounds.maxY).toBeLessThanOrEqual(rectBounds.maxY + 1);
  });

  it('path inside g() at last square matches rect position (chess-like grid)', () => {
    const SQUARE = 45;
    const app = createMockApp();
    cvg(app, { viewBox: `0 0 ${8 * SQUARE} ${8 * SQUARE}`, width: 800, height: 800 }, (s) => {
      const file = 7, rank = 7;
      const x = file * SQUARE;
      const y = rank * SQUARE;

      // Board square at (7,7)
      s.rect({ x, y, width: SQUARE, height: SQUARE, fill: '#B58863' });
      // Piece in that square
      s.g({ transform: { translate: [x, y] } }, () => {
        s.path({ d: 'M 10 5 L 35 5 L 35 40 L 10 40 Z', fill: '#000' });
      });
    });

    const calls = userCalls(app);
    const rectCall = calls.find(c => c.method === 'canvasRectangle')!;
    const pathCall = calls.find(c => c.method === 'canvasPath')!;

    const rectBounds = {
      minX: rectCall.args[0].x,
      minY: rectCall.args[0].y,
      maxX: rectCall.args[0].x2,
      maxY: rectCall.args[0].y2,
    };
    const pCoords = extractPathCoords(pathCall.args[0].path);
    const pBounds = pathBounds(pCoords);

    // Path must fall within the rect bounds
    expect(pBounds.minX).toBeGreaterThanOrEqual(rectBounds.minX - 1);
    expect(pBounds.minY).toBeGreaterThanOrEqual(rectBounds.minY - 1);
    expect(pBounds.maxX).toBeLessThanOrEqual(rectBounds.maxX + 1);
    expect(pBounds.maxY).toBeLessThanOrEqual(rectBounds.maxY + 1);
  });
});

// ─── Coordinate mapping at various viewBox/canvas ratios ────────

describe('viewBox to canvas coordinate mapping at various scales', () => {
  const testCases = [
    { name: '1:1',   vb: '0 0 100 100', w: 100, h: 100, scale: 1 },
    { name: '2x',    vb: '0 0 100 100', w: 200, h: 200, scale: 2 },
    { name: '4x',    vb: '0 0 100 100', w: 400, h: 400, scale: 4 },
    { name: '0.5x',  vb: '0 0 100 100', w: 50,  h: 50,  scale: 0.5 },
    { name: '2.222x (chess)', vb: '0 0 360 360', w: 800, h: 800, scale: 800 / 360 },
    { name: '1.5x',  vb: '0 0 200 200', w: 300, h: 300, scale: 1.5 },
    { name: '10x',   vb: '0 0 50 50',   w: 500, h: 500, scale: 10 },
  ];

  for (const { name, vb, w, h, scale } of testCases) {
    it(`rect at origin scales correctly (${name})`, () => {
      const app = createMockApp();
      cvg(app, { viewBox: vb, width: w, height: h }, (s) => {
        s.rect({ x: 0, y: 0, width: 10, height: 10, fill: '#F00' });
      });
      const call = userCalls(app)[0];
      expect(call.args[0].x).toBeCloseTo(0);
      expect(call.args[0].y).toBeCloseTo(0);
      expect(call.args[0].x2).toBeCloseTo(10 * scale);
      expect(call.args[0].y2).toBeCloseTo(10 * scale);
    });

    it(`rect at offset scales correctly (${name})`, () => {
      const app = createMockApp();
      cvg(app, { viewBox: vb, width: w, height: h }, (s) => {
        s.rect({ x: 20, y: 30, width: 10, height: 10, fill: '#F00' });
      });
      const call = userCalls(app)[0];
      expect(call.args[0].x).toBeCloseTo(20 * scale);
      expect(call.args[0].y).toBeCloseTo(30 * scale);
      expect(call.args[0].x2).toBeCloseTo(30 * scale);
      expect(call.args[0].y2).toBeCloseTo(40 * scale);
    });

    it(`path coords scale correctly (${name})`, () => {
      const app = createMockApp();
      cvg(app, { viewBox: vb, width: w, height: h }, (s) => {
        s.path({ d: 'M 10 20 L 30 40 Z', fill: '#000' });
      });
      const call = userCalls(app)[0];
      const coords = extractPathCoords(call.args[0].path);
      // M 10 20
      expect(coords[0][0]).toBeCloseTo(10 * scale);
      expect(coords[0][1]).toBeCloseTo(20 * scale);
      // L 30 40
      expect(coords[1][0]).toBeCloseTo(30 * scale);
      expect(coords[1][1]).toBeCloseTo(40 * scale);
    });

    it(`path inside g(translate) scales correctly (${name})`, () => {
      const app = createMockApp();
      cvg(app, { viewBox: vb, width: w, height: h }, (s) => {
        s.g({ transform: { translate: [20, 30] } }, () => {
          s.path({ d: 'M 5 5 L 10 10 Z', fill: '#000' });
        });
      });
      const call = userCalls(app)[0];
      const coords = extractPathCoords(call.args[0].path);
      // translate(20,30) + M 5 5 → (25, 35) in viewBox → (25*scale, 35*scale) in canvas
      expect(coords[0][0]).toBeCloseTo(25 * scale);
      expect(coords[0][1]).toBeCloseTo(35 * scale);
      // translate(20,30) + L 10 10 → (30, 40)
      expect(coords[1][0]).toBeCloseTo(30 * scale);
      expect(coords[1][1]).toBeCloseTo(40 * scale);
    });
  }
});

// ─── Chess-like grid: all 64 squares ──────────────────────────

describe('chess-like grid: rects and grouped paths stay aligned', () => {
  const SQUARE = 45;
  const canvasSize = 800;
  const boardSize = 8 * SQUARE; // 360
  const scale = canvasSize / boardSize; // 2.2222...

  it('rect and path in same g() produce overlapping bounds for all 8 files', () => {
    // Check row 0 across all 8 columns — the pattern that exposes drift
    const rank = 0;
    for (let file = 0; file < 8; file++) {
      const app = createMockApp();
      cvg(app, { viewBox: `0 0 ${boardSize} ${boardSize}`, width: canvasSize, height: canvasSize }, (s) => {
        const x = file * SQUARE;
        const y = rank * SQUARE;
        s.rect({ x, y, width: SQUARE, height: SQUARE, fill: '#CCC' });
        s.g({ transform: { translate: [x, y] } }, () => {
          s.path({ d: 'M 5 5 L 40 5 L 40 40 L 5 40 Z', fill: '#000' });
        });
      });

      const calls = userCalls(app);
      const rectCall = calls.find(c => c.method === 'canvasRectangle')!;
      const pathCall = calls.find(c => c.method === 'canvasPath')!;

      const rX1 = rectCall.args[0].x;
      const rY1 = rectCall.args[0].y;
      const rX2 = rectCall.args[0].x2;
      const rY2 = rectCall.args[0].y2;

      const pCoords = extractPathCoords(pathCall.args[0].path);
      const pB = pathBounds(pCoords);

      // Verify rect position
      expect(rX1).toBeCloseTo(file * SQUARE * scale, 0);
      expect(rY1).toBeCloseTo(rank * SQUARE * scale, 0);
      expect(rX2).toBeCloseTo((file + 1) * SQUARE * scale, 0);
      expect(rY2).toBeCloseTo((rank + 1) * SQUARE * scale, 0);

      // Path must fall within rect bounds
      expect(pB.minX).toBeGreaterThanOrEqual(rX1 - 1);
      expect(pB.minY).toBeGreaterThanOrEqual(rY1 - 1);
      expect(pB.maxX).toBeLessThanOrEqual(rX2 + 1);
      expect(pB.maxY).toBeLessThanOrEqual(rY2 + 1);
    }
  });

  it('corner squares (0,0), (7,0), (0,7), (7,7) all have aligned paths', () => {
    const corners = [[0, 0], [7, 0], [0, 7], [7, 7]];

    for (const [file, rank] of corners) {
      const app = createMockApp();
      cvg(app, { viewBox: `0 0 ${boardSize} ${boardSize}`, width: canvasSize, height: canvasSize }, (s) => {
        const x = file * SQUARE;
        const y = rank * SQUARE;
        s.rect({ x, y, width: SQUARE, height: SQUARE, fill: '#CCC' });
        s.g({ transform: { translate: [x, y] } }, () => {
          // Approximate pawn shape bounds
          s.path({ d: 'M 11 9 L 34 9 L 34 39.5 L 11 39.5 Z', fill: '#000' });
        });
      });

      const calls = userCalls(app);
      const rectCall = calls.find(c => c.method === 'canvasRectangle')!;
      const pathCall = calls.find(c => c.method === 'canvasPath')!;

      const pCoords = extractPathCoords(pathCall.args[0].path);
      const pB = pathBounds(pCoords);

      // Verify the path's min point is offset from the square's origin by the piece's internal offset
      // Piece path starts at (11, 9) inside the 45x45 square
      const expectedMinX = (file * SQUARE + 11) * scale;
      const expectedMinY = (rank * SQUARE + 9) * scale;
      expect(pB.minX).toBeCloseTo(expectedMinX, 0);
      expect(pB.minY).toBeCloseTo(expectedMinY, 0);

      // Path must fall within the rect
      expect(pB.minX).toBeGreaterThanOrEqual(rectCall.args[0].x - 1);
      expect(pB.minY).toBeGreaterThanOrEqual(rectCall.args[0].y - 1);
      expect(pB.maxX).toBeLessThanOrEqual(rectCall.args[0].x2 + 1);
      expect(pB.maxY).toBeLessThanOrEqual(rectCall.args[0].y2 + 1);
    }
  });
});

// ─── canvasPath width/height matches path content ────────────

describe('canvasPath dimensions envelope the path coordinates', () => {
  it('width and height cover the rightmost/bottommost path coordinate', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 400, height: 400 }, (s) => {
      s.path({ d: 'M 10 20 L 80 90 Z', fill: '#000' });
    });
    const opts = userCalls(app)[0].args[0];
    const coords = extractPathCoords(opts.path);
    const bounds = pathBounds(coords);

    // width/height must cover the path's rightmost/bottommost point
    expect(opts.width).toBeGreaterThanOrEqual(bounds.maxX);
    expect(opts.height).toBeGreaterThanOrEqual(bounds.maxY);
  });

  it('grouped path at far corner has width/height covering its content', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 360 360', width: 800, height: 800 }, (s) => {
      s.g({ transform: { translate: [315, 315] } }, () => {
        s.path({ d: 'M 5 5 L 40 40 Z', fill: '#000' });
      });
    });
    const opts = userCalls(app)[0].args[0];
    const coords = extractPathCoords(opts.path);
    const bounds = pathBounds(coords);

    expect(opts.width).toBeGreaterThanOrEqual(bounds.maxX);
    expect(opts.height).toBeGreaterThanOrEqual(bounds.maxY);
  });
});

// ─── Non-square viewBox with centering ──────────────────────

describe('non-square viewBox centering', () => {
  it('wide viewBox centers vertically', () => {
    const app = createMockApp();
    // viewBox 200x100, canvas 400x400 → scale=2, offsetY=100
    cvg(app, { viewBox: '0 0 200 100', width: 400, height: 400 }, (s) => {
      s.rect({ x: 0, y: 0, width: 200, height: 100, fill: '#F00' });
      s.g({ transform: { translate: [100, 50] } }, () => {
        s.path({ d: 'M 0 0 L 10 10 Z', fill: '#000' });
      });
    });

    const calls = userCalls(app);
    const rectCall = calls.find(c => c.method === 'canvasRectangle')!;
    const pathCall = calls.find(c => c.method === 'canvasPath')!;

    // Rect: x=0*2=0, y=0*2+100=100, x2=200*2=400, y2=100*2+100=300
    expect(rectCall.args[0].x).toBeCloseTo(0);
    expect(rectCall.args[0].y).toBeCloseTo(100);
    expect(rectCall.args[0].x2).toBeCloseTo(400);
    expect(rectCall.args[0].y2).toBeCloseTo(300);

    // Path: translate(100,50) + (0,0) → (100,50) in vb → (200, 200) in canvas
    const coords = extractPathCoords(pathCall.args[0].path);
    expect(coords[0][0]).toBeCloseTo(200); // (100+0)*2
    expect(coords[0][1]).toBeCloseTo(200); // (50+0)*2 + 100
  });

  it('tall viewBox centers horizontally', () => {
    const app = createMockApp();
    // viewBox 100x200, canvas 400x400 → scale=2, offsetX=100
    cvg(app, { viewBox: '0 0 100 200', width: 400, height: 400 }, (s) => {
      s.g({ transform: { translate: [50, 100] } }, () => {
        s.path({ d: 'M 0 0 L 10 10 Z', fill: '#000' });
      });
    });

    const pathCall = userCalls(app)[0];
    const coords = extractPathCoords(pathCall.args[0].path);
    // translate(50,100) + (0,0) → (50,100) in vb → (50*2+100, 100*2) = (200, 200) in canvas
    expect(coords[0][0]).toBeCloseTo(200);
    expect(coords[0][1]).toBeCloseTo(200);
  });
});
