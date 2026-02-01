/**
 * Tests for Kaleidoscope
 */

import { KaleidoscopeState } from './index';

describe('KaleidoscopeState', () => {
  describe('initialization', () => {
    it('should initialize with default values', () => {
      const state = new KaleidoscopeState();
      expect(state.segments).toBe(8);
      expect(state.currentPalette).toBe('rainbow');
      expect(state.trail.length).toBe(0);
    });

    it('should initialize mouse at center', () => {
      const state = new KaleidoscopeState();
      expect(state.mouseX).toBe(250); // CENTER_X
      expect(state.mouseY).toBe(250); // CENTER_Y
    });
  });

  describe('mouse tracking', () => {
    it('should update mouse position', () => {
      const state = new KaleidoscopeState();
      state.updateMouse(100, 150);
      expect(state.mouseX).toBe(100);
      expect(state.mouseY).toBe(150);
    });

    it('should track last mouse position', () => {
      const state = new KaleidoscopeState();
      state.updateMouse(100, 150);
      state.updateMouse(200, 250);
      expect(state.lastMouseX).toBe(100);
      expect(state.lastMouseY).toBe(150);
    });

    it('should add trail points when drawing', () => {
      const state = new KaleidoscopeState();
      state.isDrawing = true;
      state.updateMouse(100, 150);
      expect(state.trail.length).toBe(1);
    });

    it('should not add trail points when not drawing', () => {
      const state = new KaleidoscopeState();
      state.isDrawing = false;
      state.updateMouse(100, 150);
      expect(state.trail.length).toBe(0);
    });
  });

  describe('trail management', () => {
    it('should limit trail length', () => {
      const state = new KaleidoscopeState();
      state.trailLength = 10;
      state.isDrawing = true;

      for (let i = 0; i < 20; i++) {
        state.updateMouse(i * 10, i * 10);
      }

      expect(state.trail.length).toBeLessThanOrEqual(10);
    });

    it('should age trail points on step', () => {
      const state = new KaleidoscopeState();
      state.isDrawing = true;
      state.updateMouse(100, 100);
      const initialAge = state.trail[0].age;

      state.step();

      expect(state.trail[0].age).toBeGreaterThan(initialAge);
    });

    it('should remove fully faded points', () => {
      const state = new KaleidoscopeState();
      state.trail.push({ x: 100, y: 100, age: 0.99, color: '#fff' });
      state.fadeSpeed = 0.02;
      state.step();

      expect(state.trail.length).toBe(0);
    });

    it('should clear trail', () => {
      const state = new KaleidoscopeState();
      state.isDrawing = true;
      state.updateMouse(100, 100);
      state.updateMouse(200, 200);
      expect(state.trail.length).toBe(2);

      state.clear();
      expect(state.trail.length).toBe(0);
    });
  });

  describe('kaleidoscope geometry', () => {
    it('should convert to relative coordinates', () => {
      const state = new KaleidoscopeState();
      const { rx, ry } = state.toRelative(300, 300);
      expect(rx).toBe(50); // 300 - 250
      expect(ry).toBe(50); // 300 - 250
    });

    it('should rotate points correctly', () => {
      const state = new KaleidoscopeState();
      // Rotate (50, 0) by 90 degrees = (0, 50)
      const { x, y } = state.rotatePoint(50, 0, Math.PI / 2);
      expect(x).toBeCloseTo(250, 0); // CENTER_X + 0
      expect(y).toBeCloseTo(300, 0); // CENTER_Y + 50
    });

    it('should mirror points horizontally', () => {
      const state = new KaleidoscopeState();
      const { rx, ry } = state.mirrorPoint(50, 30);
      expect(rx).toBe(-50);
      expect(ry).toBe(30);
    });

    it('should generate correct number of kaleidoscope points', () => {
      const state = new KaleidoscopeState();
      state.segments = 6;
      const points = state.getKaleidoscopePoints(300, 300);
      // Each segment has original + mirrored = 2 points per segment
      expect(points.length).toBe(6 * 2);
    });

    it('should generate different points for different segments', () => {
      const state = new KaleidoscopeState();
      state.segments = 4;
      const points = state.getKaleidoscopePoints(300, 260);

      // Points should be distributed around the center
      const uniqueX = new Set(points.map((p) => Math.round(p.x)));
      expect(uniqueX.size).toBeGreaterThan(1);
    });
  });

  describe('segment configuration', () => {
    it('should change segments', () => {
      const state = new KaleidoscopeState();
      state.setSegments(12);
      expect(state.segments).toBe(12);
    });

    it('should clamp segments to minimum', () => {
      const state = new KaleidoscopeState();
      state.setSegments(1);
      expect(state.segments).toBe(2);
    });

    it('should clamp segments to maximum', () => {
      const state = new KaleidoscopeState();
      state.setSegments(100);
      expect(state.segments).toBe(24);
    });
  });

  describe('palette cycling', () => {
    it('should cycle to next palette', () => {
      const state = new KaleidoscopeState();
      expect(state.currentPalette).toBe('rainbow');
      state.nextPalette();
      expect(state.currentPalette).toBe('fire');
    });

    it('should wrap around to first palette', () => {
      const state = new KaleidoscopeState();
      // Cycle through all palettes
      for (let i = 0; i < 5; i++) {
        state.nextPalette();
      }
      expect(state.currentPalette).toBe('rainbow');
    });
  });

  describe('status text', () => {
    it('should include segment count', () => {
      const state = new KaleidoscopeState();
      state.segments = 10;
      expect(state.getStatusText()).toContain('10');
    });

    it('should include palette name', () => {
      const state = new KaleidoscopeState();
      expect(state.getStatusText()).toContain('rainbow');
    });

    it('should include trail count', () => {
      const state = new KaleidoscopeState();
      state.isDrawing = true;
      state.updateMouse(100, 100);
      expect(state.getStatusText()).toContain('1');
    });
  });

  describe('time progression', () => {
    it('should increment time on step', () => {
      const state = new KaleidoscopeState();
      const initialTime = state.time;
      state.step();
      expect(state.time).toBeGreaterThan(initialTime);
    });
  });
});
