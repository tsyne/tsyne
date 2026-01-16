import { ZoomPan, Brush } from '../src/zoom-pan';

describe('ZoomPan', () => {
  it('should initialize with default state', () => {
    const zp = new ZoomPan();
    const state = zp.getState();
    expect(state.scale).toBe(1);
    expect(state.translateX).toBe(0);
    expect(state.translateY).toBe(0);
  });

  it('should translate', () => {
    const zp = new ZoomPan();
    zp.translate(50, 100);
    const state = zp.getState();
    expect(state.translateX).toBe(50);
    expect(state.translateY).toBe(100);
  });

  it('should support chaining translate', () => {
    const zp = new ZoomPan();
    zp.translate(10, 20).translate(30, 40);
    const state = zp.getState();
    expect(state.translateX).toBe(40);
    expect(state.translateY).toBe(60);
  });

  it('should zoom', () => {
    const zp = new ZoomPan();
    zp.zoom(2);
    const state = zp.getState();
    expect(state.scale).toBe(2);
  });

  it('should clamp scale', () => {
    const zp = new ZoomPan({ minScale: 0.5, maxScale: 5 });
    zp.zoom(10);
    expect(zp.getState().scale).toBe(5);
    zp.zoom(0.05);
    expect(zp.getState().scale).toBe(0.5);
  });

  it('should reset to initial state', () => {
    const zp = new ZoomPan();
    zp.zoom(3).translate(100, 200);
    zp.reset();
    const state = zp.getState();
    expect(state.scale).toBe(1);
    expect(state.translateX).toBe(0);
    expect(state.translateY).toBe(0);
  });

  it('should handle mouse pan', () => {
    const zp = new ZoomPan();
    zp.handleMouseDown(0, 0);
    zp.handleMouseMove(50, 100);
    zp.handleMouseUp();
    const state = zp.getState();
    expect(state.translateX).toBe(50);
    expect(state.translateY).toBe(100);
  });

  it('should handle mouse wheel zoom', () => {
    const zp = new ZoomPan({ scaleSpeed: 0.1 });
    zp.handleWheel(-100);  // Scroll up = zoom in
    const state = zp.getState();
    expect(state.scale).toBeGreaterThan(1);
  });

  it('should support listeners', (done) => {
    const zp = new ZoomPan();
    const unsub = zp.subscribe((state) => {
      expect(state.translateX).toBe(50);
      unsub();
      done();
    });
    zp.translate(50, 0);
  });

  it('should unsubscribe listeners', () => {
    const zp = new ZoomPan();
    let callCount = 0;
    const unsub = zp.subscribe(() => {
      callCount++;
    });
    zp.translate(10, 0);
    expect(callCount).toBe(1);
    unsub();
    zp.translate(20, 0);
    expect(callCount).toBe(1);  // No more calls
  });

  it('should respect enablePan option', () => {
    const zp = new ZoomPan({ enablePan: false });
    zp.translate(50, 100);
    const state = zp.getState();
    expect(state.translateX).toBe(0);
    expect(state.translateY).toBe(0);
  });

  it('should respect enableZoom option', () => {
    const zp = new ZoomPan({ enableZoom: false });
    zp.zoom(2);
    const state = zp.getState();
    expect(state.scale).toBe(1);
  });

  it('should get transform string', () => {
    const zp = new ZoomPan();
    zp.translate(100, 50).zoom(2);
    const transform = zp.getTransformString();
    expect(transform).toContain('translate');
    expect(transform).toContain('scale');
  });

  it('should get transform matrix', () => {
    const zp = new ZoomPan();
    zp.translate(50, 100).zoom(2);
    const [a, b, c, d, e, f] = zp.getTransformMatrix();
    expect(a).toBe(2);  // scale
    expect(e).toBe(50);  // translateX
    expect(f).toBe(100);  // translateY
  });

  it('should fit bounds', () => {
    const zp = new ZoomPan();
    zp.fitBounds(0, 0, 100, 100, 10);
    const state = zp.getState();
    expect(state.scale).toBeGreaterThan(0);
    expect(state.scale).toBeLessThan(1);
  });
});

describe('Brush', () => {
  it('should initialize with null extent', () => {
    const brush = new Brush();
    expect(brush.getExtent()).toBeNull();
  });

  it('should track selection', () => {
    const brush = new Brush();
    brush.handleMouseDown(0, 0);
    brush.handleMouseMove(100, 100);
    const extent = brush.getExtent();
    expect(extent).not.toBeNull();
    expect(extent?.x0).toBe(0);
    expect(extent?.y1).toBe(100);
  });

  it('should finalize selection on mouse up', (done) => {
    const brush = new Brush();
    brush.subscribe((extent) => {
      if (extent) {
        expect(extent.x0).toBe(0);
        expect(extent.y1).toBe(100);
        done();
      }
    });
    brush.handleMouseDown(0, 0);
    brush.handleMouseMove(100, 100);
    brush.handleMouseUp();
  });

  it('should support x-only dimension', () => {
    const brush = new Brush({ dimension: 'x' });
    brush.handleMouseDown(0, 50);
    brush.handleMouseMove(100, 200);
    const extent = brush.getExtent();
    expect(extent?.x0).toBe(0);
    expect(extent?.x1).toBe(100);
  });

  it('should support y-only dimension', () => {
    const brush = new Brush({ dimension: 'y' });
    brush.handleMouseDown(50, 0);
    brush.handleMouseMove(200, 100);
    const extent = brush.getExtent();
    expect(extent?.y0).toBe(0);
    expect(extent?.y1).toBe(100);
  });

  it('should clear selection', (done) => {
    const brush = new Brush();
    brush.subscribe((extent) => {
      if (extent === null) {
        done();
      }
    });
    brush.handleMouseDown(0, 0);
    brush.handleMouseMove(100, 100);
    brush.handleMouseUp();
    brush.clear();
  });

  it('should emit move events', (done) => {
    const brush = new Brush();
    brush.onMove((extent) => {
      expect(extent.x1).toBeGreaterThan(extent.x0);
      done();
    });
    brush.handleMouseDown(0, 0);
    brush.handleMouseMove(50, 50);
  });

  it('should get stroke color', () => {
    const brush = new Brush({ strokeColor: '#ff0000' });
    expect(brush.getStrokeColor()).toBe('#ff0000');
  });

  it('should get fill color and alpha', () => {
    const brush = new Brush({ fillColor: '#00ff00', fillAlpha: 0.5 });
    expect(brush.getFillColor()).toBe('#00ff00');
    expect(brush.getFillAlpha()).toBe(0.5);
  });
});
