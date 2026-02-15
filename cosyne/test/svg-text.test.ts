/**
 * Tests for SVG text rendering in the grammar.
 */

import { CvgContext, CvgElement, cvg, parseStyleAttr } from '../src/cvg/grammar';

// ─── Mock app ────────────────────────────────────────────────────

interface MockCall {
  method: string;
  args: any[];
}

/** Return only user-drawn calls, skipping the transparent sizing shim created by cvg(). */
function userCalls(app: { calls: MockCall[] }): MockCall[] {
  return app.calls.filter(c => !(c.method === 'canvasRectangle' && c.args[0]?.fillColor === 'transparent'));
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
    canvasText(text: string, opts: any) {
      calls.push({ method: 'canvasText', args: [text, opts] });
      return createMockWidget('text', { text, ...opts });
    },
    clip(builder: () => void) { builder(); return createMockWidget('clip', {}); },
    stack(builder: () => void) { builder(); return createMockWidget('stack', {}); },
    canvasStack(builder: () => void) { builder(); return createMockWidget('canvasStack', {}); },
  };
  return app;
}

// ─── parseStyleAttr ──────────────────────────────────────────────

describe('parseStyleAttr', () => {
  it('should parse basic style string', () => {
    const result = parseStyleAttr('font-size: 18px; text-anchor: middle');
    expect(result['font-size']).toBe('18px');
    expect(result['text-anchor']).toBe('middle');
  });

  it('should return empty object for undefined', () => {
    expect(parseStyleAttr(undefined)).toEqual({});
  });

  it('should return empty object for empty string', () => {
    expect(parseStyleAttr('')).toEqual({});
  });

  it('should handle trailing semicolons', () => {
    const result = parseStyleAttr('fill: red;');
    expect(result.fill).toBe('red');
  });

  it('should handle whitespace around properties', () => {
    const result = parseStyleAttr('  font-weight : bold ;  font-style:italic  ');
    expect(result['font-weight']).toBe('bold');
    expect(result['font-style']).toBe('italic');
  });

  it('should handle multiple colons in value', () => {
    // Not common in SVG but good to test robustness
    const result = parseStyleAttr('font-family: "Courier:New"');
    expect(result['font-family']).toBe('"Courier:New"');
  });
});

// ─── text() rendering ────────────────────────────────────────────

describe('CvgContext.text', () => {
  it('should render text with correct position and fill', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 400, height: 400 }, (s) => {
      s.text({ x: '50', y: '60', fill: '#FFF', 'font-size': '24' }, 'Hello');
    });
    expect(userCalls(app)).toHaveLength(1);
    const call = userCalls(app)[0];
    expect(call.method).toBe('canvasText');
    expect(call.args[0]).toBe('Hello');
    // x=50 → (50-0)*4 + 0 = 200, y=60 → mapped with baseline adjustment
    expect(call.args[1].x).toBeCloseTo(200);
    expect(call.args[1].y).toBeCloseTo(137.28);
    expect(call.args[1].color).toBe('#FFF');
    // font-size 24 * scale 4 = 96
    expect(call.args[1].textSize).toBeCloseTo(96);
  });

  it('should return CvgElement with null for empty content', () => {
    const app = createMockApp();
    let result: any;
    cvg(app, { viewBox: '0 0 100 100' }, (s) => {
      result = s.text({ x: '10', y: '10' });
    });
    expect(result).toBeInstanceOf(CvgElement);
    expect(result.getUnderlying()).toBeNull();
    expect(userCalls(app)).toHaveLength(0);
  });

  it('should return CvgElement with null for undefined content', () => {
    const app = createMockApp();
    let result: any;
    cvg(app, { viewBox: '0 0 100 100' }, (s) => {
      result = s.text({ x: '10', y: '10' }, undefined);
    });
    expect(result.getUnderlying()).toBeNull();
  });

  it('should use default font-size 16 when not specified', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.text({ x: '0', y: '20' }, 'Test');
    });
    // 1:1 mapping, default fontSize=16, transform scale=1
    expect(userCalls(app)[0].args[1].textSize).toBeCloseTo(16);
  });

  it('should map text-anchor "middle" to alignment "center"', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.text({ x: '50', y: '50', 'text-anchor': 'middle' }, 'Centered');
    });
    expect(userCalls(app)[0].args[1].alignment).toBe('center');
  });

  it('should map text-anchor "end" to alignment "trailing"', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.text({ x: '50', y: '50', 'text-anchor': 'end' }, 'Right');
    });
    expect(userCalls(app)[0].args[1].alignment).toBe('trailing');
  });

  it('should default to alignment "leading"', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.text({ x: '10', y: '20' }, 'Default');
    });
    expect(userCalls(app)[0].args[1].alignment).toBe('leading');
  });

  it('should detect bold font-weight', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.text({ x: '10', y: '20', 'font-weight': 'bold' }, 'Bold');
    });
    expect(userCalls(app)[0].args[1].bold).toBe(true);
  });

  it('should detect bold from numeric weight >= 600', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.text({ x: '10', y: '20', 'font-weight': '700' }, 'Bold');
    });
    expect(userCalls(app)[0].args[1].bold).toBe(true);
  });

  it('should not be bold for normal weight', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.text({ x: '10', y: '20', 'font-weight': '400' }, 'Normal');
    });
    expect(userCalls(app)[0].args[1].bold).toBe(false);
  });

  it('should detect italic', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.text({ x: '10', y: '20', 'font-style': 'italic' }, 'Italic');
    });
    expect(userCalls(app)[0].args[1].italic).toBe(true);
  });

  it('should detect oblique as italic', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.text({ x: '10', y: '20', 'font-style': 'oblique' }, 'Oblique');
    });
    expect(userCalls(app)[0].args[1].italic).toBe(true);
  });

  it('should detect monospace font family', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.text({ x: '10', y: '20', 'font-family': 'Courier New' }, 'Code');
    });
    expect(userCalls(app)[0].args[1].monospace).toBe(true);
  });

  it('should not be monospace for serif', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.text({ x: '10', y: '20', 'font-family': 'serif' }, 'Serif');
    });
    expect(userCalls(app)[0].args[1].monospace).toBe(false);
  });

  it('should use fill color from style, default to black', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.text({ x: '10', y: '20' }, 'Black');
      s.text({ x: '10', y: '40', fill: 'red' }, 'Red');
      s.text({ x: '10', y: '60', fill: 'none' }, 'None');
    });
    expect(userCalls(app)[0].args[1].color).toBe('#000000');
    expect(userCalls(app)[1].args[1].color).toBe('#ff0000');
    expect(userCalls(app)[2].args[1].color).toBe('black'); // fill=none falls back to hardcoded 'black'
  });
});

// ─── Style inheritance ───────────────────────────────────────────

describe('text style inheritance', () => {
  it('should inherit font-size from group', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ 'font-size': '24' }, () => {
        s.text({ x: '10', y: '20' }, 'Inherited');
      });
    });
    expect(userCalls(app)[0].args[1].textSize).toBeCloseTo(24);
  });

  it('should inherit text-anchor from group', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ 'text-anchor': 'middle' }, () => {
        s.text({ x: '50', y: '50' }, 'Centered');
      });
    });
    expect(userCalls(app)[0].args[1].alignment).toBe('center');
  });

  it('should inherit font-weight from group', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ 'font-weight': 'bold' }, () => {
        s.text({ x: '10', y: '20' }, 'Bold');
      });
    });
    expect(userCalls(app)[0].args[1].bold).toBe(true);
  });

  it('should inherit fill from group for text color', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ fill: 'blue' }, () => {
        s.text({ x: '10', y: '20' }, 'Blue');
      });
    });
    expect(userCalls(app)[0].args[1].color).toBe('#0000ff');
  });

  it('should allow text element to override inherited font-size', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ 'font-size': '24' }, () => {
        s.text({ x: '10', y: '20', 'font-size': '12' }, 'Smaller');
      });
    });
    expect(userCalls(app)[0].args[1].textSize).toBeCloseTo(12);
  });

  it('should inherit style attribute properties on group', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.g({ style: 'font-size: 18px; text-anchor: middle; font-family: serif' }, () => {
        s.text({ x: '50', y: '50' }, 'Styled');
      });
    });
    expect(userCalls(app)[0].args[1].textSize).toBeCloseTo(18);
    expect(userCalls(app)[0].args[1].alignment).toBe('center');
    expect(userCalls(app)[0].args[1].monospace).toBe(false);
  });
});

// ─── Transform on text ───────────────────────────────────────────

describe('text with transform', () => {
  it('should apply transform to text position', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.text({ x: '10', y: '20', transform: 'translate(5, 10)' }, 'Moved');
    });
    // transform: translate(5,10) → point (10,20) → (15,30), then baseline adjustment
    expect(userCalls(app)[0].args[1].x).toBeCloseTo(15);
    expect(userCalls(app)[0].args[1].y).toBeCloseTo(12.88);
  });

  it('should scale font size with transform', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.text({ x: '10', y: '20', 'font-size': '10', transform: 'scale(2)' }, 'Big');
    });
    // fontSize=10, viewBox scale=1, transform averageScale=2 → 10*1*2 = 20
    expect(userCalls(app)[0].args[1].textSize).toBeCloseTo(20);
  });
});

// ─── Text with style attribute ───────────────────────────────────

describe('text with style attribute', () => {
  it('should parse font-size from style attribute', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.text({ x: '10', y: '20', style: 'font-size: 32px' }, 'Styled');
    });
    expect(userCalls(app)[0].args[1].textSize).toBeCloseTo(32);
  });

  it('should parse text-anchor from style attribute', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.text({ x: '50', y: '50', style: 'text-anchor: middle' }, 'Center');
    });
    expect(userCalls(app)[0].args[1].alignment).toBe('center');
  });

  it('should prefer direct attrs over style attribute', () => {
    const app = createMockApp();
    cvg(app, { viewBox: '0 0 100 100', width: 100, height: 100 }, (s) => {
      s.text({ x: '10', y: '20', 'font-size': '20', style: 'font-size: 40px' }, 'Direct');
    });
    // Direct attr font-size=20 should win
    expect(userCalls(app)[0].args[1].textSize).toBeCloseTo(20);
  });
});
