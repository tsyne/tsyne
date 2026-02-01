/**
 * Tests for Fractal Explorer
 *
 * Tests the fractal state management, rendering logic, and UI interactions.
 */

import { FractalState, fractalTypes, fractalTypeNames } from './index';

describe('FractalState', () => {
  describe('initialization', () => {
    it('should initialize with default Mandelbrot settings', () => {
      const state = new FractalState(100, 100);
      expect(state.currentFractal).toBe('mandelbrot');
      expect(state.centerX).toBe(-0.5);
      expect(state.centerY).toBe(0);
      expect(state.zoom).toBe(1);
    });

    it('should create pixel buffer of correct size', () => {
      const state = new FractalState(100, 100);
      expect(state.pixelBuffer.length).toBe(100 * 100 * 4);
    });

    it('should allow custom canvas dimensions', () => {
      const state = new FractalState(200, 150);
      expect(state.canvasWidth).toBe(200);
      expect(state.canvasHeight).toBe(150);
      expect(state.pixelBuffer.length).toBe(200 * 150 * 4);
    });
  });

  describe('fractal type switching', () => {
    it('should switch to Julia set with correct defaults', () => {
      const state = new FractalState(100, 100);
      state.setFractal('julia');
      expect(state.currentFractal).toBe('julia');
      expect(state.centerX).toBe(0);
      expect(state.centerY).toBe(0);
      expect(state.zoom).toBe(1);
    });

    it('should switch to Burning Ship with correct defaults', () => {
      const state = new FractalState(100, 100);
      state.setFractal('burningShip');
      expect(state.currentFractal).toBe('burningShip');
      expect(state.centerX).toBe(-0.4);
      expect(state.centerY).toBe(-0.6);
      expect(state.zoom).toBe(0.8);
    });

    it('should switch to Tricorn with correct defaults', () => {
      const state = new FractalState(100, 100);
      state.setFractal('tricorn');
      expect(state.currentFractal).toBe('tricorn');
      expect(state.centerX).toBe(-0.3);
      expect(state.centerY).toBe(0);
    });

    it('should switch to Newton with correct defaults', () => {
      const state = new FractalState(100, 100);
      state.setFractal('newton');
      expect(state.currentFractal).toBe('newton');
      expect(state.centerX).toBe(0);
      expect(state.centerY).toBe(0);
      expect(state.zoom).toBe(0.5);
    });

    it('should ignore invalid fractal types', () => {
      const state = new FractalState(100, 100);
      state.setFractal('invalid');
      expect(state.currentFractal).toBe('mandelbrot');
    });
  });

  describe('zoom operations', () => {
    it('should zoom in by factor of 2 by default', () => {
      const state = new FractalState(100, 100);
      const initialZoom = state.zoom;
      state.zoomIn();
      expect(state.zoom).toBe(initialZoom * 2);
    });

    it('should zoom in by custom factor', () => {
      const state = new FractalState(100, 100);
      const initialZoom = state.zoom;
      state.zoomIn(3);
      expect(state.zoom).toBe(initialZoom * 3);
    });

    it('should zoom out by factor of 2 by default', () => {
      const state = new FractalState(100, 100);
      state.zoom = 4;
      state.zoomOut();
      expect(state.zoom).toBe(2);
    });

    it('should not zoom out below minimum', () => {
      const state = new FractalState(100, 100);
      state.zoom = 0.2;
      state.zoomOut();
      expect(state.zoom).toBe(0.1);
      state.zoomOut();
      expect(state.zoom).toBe(0.1);
    });
  });

  describe('pan operations', () => {
    it('should pan left', () => {
      const state = new FractalState(100, 100);
      const initialX = state.centerX;
      state.pan(-1, 0);
      expect(state.centerX).toBeLessThan(initialX);
      expect(state.centerY).toBe(0);
    });

    it('should pan right', () => {
      const state = new FractalState(100, 100);
      const initialX = state.centerX;
      state.pan(1, 0);
      expect(state.centerX).toBeGreaterThan(initialX);
    });

    it('should pan up', () => {
      const state = new FractalState(100, 100);
      const initialY = state.centerY;
      state.pan(0, -1);
      expect(state.centerY).toBeLessThan(initialY);
    });

    it('should pan down', () => {
      const state = new FractalState(100, 100);
      const initialY = state.centerY;
      state.pan(0, 1);
      expect(state.centerY).toBeGreaterThan(initialY);
    });
  });

  describe('click handling', () => {
    it('should center on clicked point', () => {
      const state = new FractalState(100, 100);
      state.handleClick(75, 75); // Click bottom-right quadrant
      expect(state.centerX).toBeGreaterThan(-0.5);
      expect(state.centerY).toBeGreaterThan(0);
    });

    it('should zoom in after click', () => {
      const state = new FractalState(100, 100);
      const initialZoom = state.zoom;
      state.handleClick(50, 50);
      expect(state.zoom).toBe(initialZoom * 2);
    });
  });

  describe('scroll handling', () => {
    it('should zoom in on scroll down', () => {
      const state = new FractalState(100, 100);
      const initialZoom = state.zoom;
      state.handleScroll(1, 50, 50);
      expect(state.zoom).toBeGreaterThan(initialZoom);
    });

    it('should zoom out on scroll up', () => {
      const state = new FractalState(100, 100);
      const initialZoom = state.zoom;
      state.handleScroll(-1, 50, 50);
      expect(state.zoom).toBeLessThan(initialZoom);
    });

    it('should preserve cursor position on zoom', () => {
      const state = new FractalState(100, 100);
      // Zoom at center should not shift the center much
      const initialX = state.centerX;
      const initialY = state.centerY;
      state.handleScroll(1, 50, 50);
      // Center should be approximately the same (small floating point variance)
      expect(Math.abs(state.centerX - initialX)).toBeLessThan(0.1);
      expect(Math.abs(state.centerY - initialY)).toBeLessThan(0.1);
    });
  });

  describe('reset', () => {
    it('should reset to default values for current fractal', () => {
      const state = new FractalState(100, 100);
      state.zoomIn();
      state.pan(1, 1);
      state.reset();
      expect(state.centerX).toBe(-0.5);
      expect(state.centerY).toBe(0);
      expect(state.zoom).toBe(1);
    });

    it('should reset to Julia defaults when Julia is selected', () => {
      const state = new FractalState(100, 100);
      state.setFractal('julia');
      state.zoomIn();
      state.pan(1, 1);
      state.reset();
      expect(state.centerX).toBe(0);
      expect(state.centerY).toBe(0);
      expect(state.zoom).toBe(1);
    });
  });

  describe('palette cycling', () => {
    it('should cycle through palettes', () => {
      const state = new FractalState(100, 100);
      expect(state.currentPalette).toBe(0);
      state.nextPalette();
      expect(state.currentPalette).toBe(1);
    });

    it('should wrap around to first palette', () => {
      const state = new FractalState(100, 100);
      // Cycle through all palettes
      for (let i = 0; i < 8; i++) {
        state.nextPalette();
      }
      expect(state.currentPalette).toBe(0);
    });
  });

  describe('Julia parameters', () => {
    it('should have default Julia constants', () => {
      const state = new FractalState(100, 100);
      expect(state.juliaR).toBe(-0.7);
      expect(state.juliaI).toBe(0.27015);
    });

    it('should have default Phoenix parameters', () => {
      const state = new FractalState(100, 100);
      expect(state.phoenixP).toBeCloseTo(0.5667);
      expect(state.phoenixQ).toBe(-0.5);
    });
  });

  describe('rendering', () => {
    it('should fill pixel buffer after render', () => {
      const state = new FractalState(10, 10);
      state.render();
      // Check that some pixels were set (not all zeros)
      let hasNonZero = false;
      for (let i = 0; i < state.pixelBuffer.length; i++) {
        if (state.pixelBuffer[i] !== 0) {
          hasNonZero = true;
          break;
        }
      }
      expect(hasNonZero).toBe(true);
    });

    it('should render all fractals without errors', () => {
      const state = new FractalState(10, 10);
      for (const fractalKey of fractalTypeNames) {
        state.setFractal(fractalKey);
        expect(() => state.render()).not.toThrow();
      }
    });
  });

  describe('resize', () => {
    it('should update dimensions on resize', () => {
      const state = new FractalState(100, 100);
      state.resize(200, 150);
      expect(state.canvasWidth).toBe(200);
      expect(state.canvasHeight).toBe(150);
    });

    it('should reallocate pixel buffer on resize', () => {
      const state = new FractalState(100, 100);
      state.resize(200, 150);
      expect(state.pixelBuffer.length).toBe(200 * 150 * 4);
    });
  });

  describe('status text', () => {
    it('should include fractal name', () => {
      const state = new FractalState(100, 100);
      expect(state.getStatusText()).toContain('Mandelbrot');
    });

    it('should include zoom level', () => {
      const state = new FractalState(100, 100);
      state.zoom = 2;
      expect(state.getStatusText()).toContain('2.0x');
    });

    it('should include palette name', () => {
      const state = new FractalState(100, 100);
      expect(state.getStatusText()).toContain('classic');
    });
  });
});

describe('fractalTypes', () => {
  it('should have all expected fractal types', () => {
    expect(fractalTypeNames).toContain('mandelbrot');
    expect(fractalTypeNames).toContain('julia');
    expect(fractalTypeNames).toContain('tricorn');
    expect(fractalTypeNames).toContain('burningShip');
    expect(fractalTypeNames).toContain('newton');
    expect(fractalTypeNames).toContain('mandelbrot3');
    expect(fractalTypeNames).toContain('phoenix');
  });

  it('should have 7 fractal types', () => {
    expect(fractalTypeNames.length).toBe(7);
  });

  it('should have Julia marked as needing Julia params', () => {
    expect(fractalTypes.julia.needsJuliaParams).toBe(true);
  });

  it('should have Phoenix marked as needing Phoenix params', () => {
    expect(fractalTypes.phoenix.needsPhoenixParams).toBe(true);
  });

  it('should have Mandelbrot not needing extra params', () => {
    expect(fractalTypes.mandelbrot.needsJuliaParams).toBeUndefined();
    expect(fractalTypes.mandelbrot.needsPhoenixParams).toBeUndefined();
  });
});
