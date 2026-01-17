import {
  EffectRenderer,
  EffectsAnchor,
  LinearGradient,
  RadialGradient,
  PRESET_GRADIENTS,
  ClippingRegion,
  ClippingUtils,
} from '../src/index';

describe('Effects, Gradients, and Clipping', () => {
  describe('EffectsAnchor', () => {
    it('should initialize empty', () => {
      const effects = new EffectsAnchor();
      expect(effects.getDropShadow()).toBeNull();
      expect(effects.getGlow()).toBeNull();
      expect(effects.getBlendMode()).toBeNull();
    });

    it('should set drop shadow', () => {
      const effects = new EffectsAnchor();
      effects.setDropShadow({ dx: 2, dy: 2, blur: 4, color: '#000', alpha: 0.5 });
      expect(effects.getDropShadow()).toEqual({
        dx: 2,
        dy: 2,
        blur: 4,
        color: '#000',
        alpha: 0.5,
      });
    });

    it('should clear drop shadow', () => {
      const effects = new EffectsAnchor();
      effects.setDropShadow({ dx: 2, dy: 2 }).clearDropShadow();
      expect(effects.getDropShadow()).toBeNull();
    });

    it('should set glow', () => {
      const effects = new EffectsAnchor();
      effects.setGlow({ color: '#FF0000', blur: 10, mode: 'outer' });
      const glow = effects.getGlow();
      expect(glow?.color).toBe('#FF0000');
      expect(glow?.blur).toBe(10);
      expect(glow?.mode).toBe('outer');
    });

    it('should set blend mode', () => {
      const effects = new EffectsAnchor();
      effects.setBlendMode('multiply');
      expect(effects.getBlendMode()).toBe('multiply');
    });

    it('should set stroke dash', () => {
      const effects = new EffectsAnchor();
      effects.setStrokeDash([5, 3], 0);
      expect(effects.getStrokeDash()).toEqual([5, 3]);
      expect(effects.getStrokeDashOffset()).toBe(0);
    });

    it('should support fluent API', () => {
      const effects = new EffectsAnchor();
      const result = effects
        .setDropShadow({ blur: 4 })
        .setBlendMode('screen')
        .setGlow({ blur: 8 });
      expect(result).toBe(effects);
      expect(effects.getDropShadow()).not.toBeNull();
      expect(effects.getBlendMode()).toBe('screen');
    });
  });

  describe('LinearGradient', () => {
    it('should initialize with default direction', () => {
      const grad = new LinearGradient();
      const stops = grad.getStops();
      expect(stops).toEqual([]);
    });

    it('should add color stops', () => {
      const grad = new LinearGradient();
      grad.addStop(0, '#FF0000').addStop(1, '#0000FF');
      const stops = grad.getStops();
      expect(stops).toHaveLength(2);
      expect(stops[0]).toEqual([0, '#FF0000', 1]);
      expect(stops[1]).toEqual([1, '#0000FF', 1]);
    });

    it('should add stops with alpha', () => {
      const grad = new LinearGradient();
      grad.addStop(0, '#FF0000', 1).addStop(1, '#0000FF', 0);
      const stops = grad.getStops();
      expect(stops[0][2]).toBe(1);
      expect(stops[1][2]).toBe(0);
    });

    it('should keep stops sorted by offset', () => {
      const grad = new LinearGradient();
      grad.addStop(1, '#FF0000').addStop(0, '#0000FF').addStop(0.5, '#00FF00');
      const stops = grad.getStops();
      expect(stops[0][0]).toBe(0);
      expect(stops[1][0]).toBe(0.5);
      expect(stops[2][0]).toBe(1);
    });

    it('should set direction', () => {
      const grad = new LinearGradient(0, 0, 100, 100);
      grad.setDirection(10, 20, 30, 40);
      // Direction is set internally, no getter but can create gradient
      expect(grad.clone()).toBeDefined();
    });

    it('should set angle', () => {
      const grad = new LinearGradient();
      grad.setAngle(90, 100);  // 90° = downward
      expect(grad.clone()).toBeDefined();
    });

    it('should clone gradient', () => {
      const grad = new LinearGradient();
      grad.addStop(0, '#FF0000').addStop(1, '#0000FF');
      const cloned = grad.clone();
      expect(cloned.getStops()).toEqual(grad.getStops());
    });

    it('should create canvas gradient', () => {
      const grad = new LinearGradient(0, 0, 100, 0);
      grad.addStop(0, '#FF0000').addStop(1, '#0000FF');

      const mockCtx = {
        createLinearGradient: jest.fn().mockReturnValue({
          addColorStop: jest.fn(),
        }),
      };

      const canvasGrad = grad.createCanvasGradient(mockCtx as any);
      expect(mockCtx.createLinearGradient).toHaveBeenCalledWith(0, 0, 100, 0);
      expect(canvasGrad).toBeDefined();
    });
  });

  describe('RadialGradient', () => {
    it('should initialize with center and radius', () => {
      const grad = new RadialGradient(50, 50, 100);
      expect(grad.getStops()).toEqual([]);
    });

    it('should add color stops', () => {
      const grad = new RadialGradient();
      grad.addStop(0, '#FFFFFF').addStop(1, '#000000');
      expect(grad.getStops()).toHaveLength(2);
    });

    it('should set center point', () => {
      const grad = new RadialGradient();
      grad.setCenter(100, 100);
      const cloned = grad.clone();
      expect(cloned).toBeDefined();
    });

    it('should set radius', () => {
      const grad = new RadialGradient();
      grad.setRadius(150);
      expect(grad.clone()).toBeDefined();
    });

    it('should set focal point', () => {
      const grad = new RadialGradient();
      grad.setFocalPoint(75, 75);
      expect(grad.clone()).toBeDefined();
    });

    it('should create canvas radial gradient', () => {
      const grad = new RadialGradient(50, 50, 50);
      grad.addStop(0, '#FFFFFF').addStop(1, '#000000');

      const mockCtx = {
        createRadialGradient: jest.fn().mockReturnValue({
          addColorStop: jest.fn(),
        }),
      };

      const canvasGrad = grad.createCanvasGradient(mockCtx as any);
      expect(mockCtx.createRadialGradient).toHaveBeenCalled();
      expect(canvasGrad).toBeDefined();
    });
  });

  describe('PRESET_GRADIENTS', () => {
    it('should have sunset gradient', () => {
      const grad = PRESET_GRADIENTS.sunset();
      expect(grad).toBeInstanceOf(LinearGradient);
      expect(grad.getStops().length).toBeGreaterThan(0);
    });

    it('should have ocean gradient', () => {
      const grad = PRESET_GRADIENTS.ocean();
      expect(grad).toBeInstanceOf(LinearGradient);
      expect(grad.getStops().length).toBeGreaterThan(0);
    });

    it('should have forest gradient', () => {
      const grad = PRESET_GRADIENTS.forest();
      expect(grad).toBeInstanceOf(LinearGradient);
    });

    it('should have radial presets', () => {
      const grad = PRESET_GRADIENTS.sunsetRadial();
      expect(grad).toBeInstanceOf(RadialGradient);
    });

    it('all presets should be functional', () => {
      Object.values(PRESET_GRADIENTS).forEach((preset) => {
        const grad = preset();
        expect(grad).toBeDefined();
        expect(grad.getStops().length).toBeGreaterThan(0);
      });
    });
  });

  describe('ClippingRegion', () => {
    it('should initialize unclipped', () => {
      const clip = new ClippingRegion();
      expect(clip.getClipPath()).toBeNull();
      expect(clip.isEnabled()).toBe(false);
    });

    it('should set circle clip', () => {
      const clip = new ClippingRegion();
      clip.setCircleClip(50, 50, 30);
      expect(clip.getClipPath()?.type).toBe('circle');
    });

    it('should set rect clip', () => {
      const clip = new ClippingRegion();
      clip.setRectClip(10, 10, 100, 100);
      expect(clip.getClipPath()?.type).toBe('rect');
    });

    it('should set polygon clip', () => {
      const clip = new ClippingRegion();
      clip.setPolygonClip([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 100 }]);
      expect(clip.getClipPath()?.type).toBe('polygon');
    });

    it('should set path clip', () => {
      const clip = new ClippingRegion();
      clip.setPathClip('M0,0 L100,0 L50,100 Z');
      expect(clip.getClipPath()?.type).toBe('path');
    });

    it('should clear clip', () => {
      const clip = new ClippingRegion();
      clip.setCircleClip(50, 50, 30).clearClip();
      expect(clip.getClipPath()).toBeNull();
    });

    it('should enable/disable clipping', () => {
      const clip = new ClippingRegion();
      clip.setCircleClip(50, 50, 30);
      expect(clip.isEnabled()).toBe(true);
      clip.setEnabled(false);
      expect(clip.isEnabled()).toBe(false);
    });

    it('should check point in circle', () => {
      const clip = new ClippingRegion();
      clip.setCircleClip(50, 50, 30);
      expect(clip.containsPoint(50, 50)).toBe(true);
      expect(clip.containsPoint(100, 100)).toBe(false);
    });

    it('should check point in rect', () => {
      const clip = new ClippingRegion();
      clip.setRectClip(10, 10, 100, 100);
      expect(clip.containsPoint(50, 50)).toBe(true);
      expect(clip.containsPoint(0, 0)).toBe(false);
    });

    it('should check point in polygon (ray casting)', () => {
      const clip = new ClippingRegion();
      clip.setPolygonClip([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ]);
      expect(clip.containsPoint(50, 50)).toBe(true);
      expect(clip.containsPoint(150, 150)).toBe(false);
    });

    it('should support fluent API', () => {
      const clip = new ClippingRegion();
      const result = clip.setCircleClip(50, 50, 30).setEnabled(true);
      expect(result).toBe(clip);
      expect(clip.isEnabled()).toBe(true);
    });
  });

  describe('ClippingUtils', () => {
    it('should create circle clip', () => {
      const clip = ClippingUtils.createCircleClip(50, 50, 30);
      expect(clip.type).toBe('circle');
      expect(clip.cx).toBe(50);
      expect(clip.cy).toBe(50);
      expect(clip.r).toBe(30);
    });

    it('should create rect clip', () => {
      const clip = ClippingUtils.createRectClip(10, 10, 100, 100, 5);
      expect(clip.type).toBe('rect');
      expect(clip.radius).toBe(5);
    });

    it('should create polygon clip', () => {
      const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 100 }];
      const clip = ClippingUtils.createPolygonClip(points);
      expect(clip.type).toBe('polygon');
      expect(clip.points).toEqual(points);
    });

    it('should get bounds of circle clip', () => {
      const clip = ClippingUtils.createCircleClip(50, 50, 30);
      const bounds = ClippingUtils.getBounds(clip);
      expect(bounds.x).toBe(20);
      expect(bounds.y).toBe(20);
      expect(bounds.width).toBe(60);
      expect(bounds.height).toBe(60);
    });

    it('should get bounds of rect clip', () => {
      const clip = ClippingUtils.createRectClip(10, 10, 100, 100);
      const bounds = ClippingUtils.getBounds(clip);
      expect(bounds.x).toBe(10);
      expect(bounds.y).toBe(10);
      expect(bounds.width).toBe(100);
      expect(bounds.height).toBe(100);
    });

    it('should get bounds of polygon clip', () => {
      const points = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const clip = ClippingUtils.createPolygonClip(points);
      const bounds = ClippingUtils.getBounds(clip);
      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(100);
      expect(bounds.height).toBe(100);
    });
  });

  describe('EffectRenderer', () => {
    let mockCtx: any;

    beforeEach(() => {
      mockCtx = {
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowBlur: 0,
        shadowColor: '#000000',
        globalAlpha: 1,
        setLineDash: jest.fn(),
        clearRect: jest.fn(),
      };
    });

    it('should apply drop shadow', () => {
      EffectRenderer.applyDropShadow(mockCtx, {
        dx: 2,
        dy: 2,
        blur: 4,
        color: '#000',
        alpha: 0.3,
      });

      expect(mockCtx.shadowOffsetX).toBe(2);
      expect(mockCtx.shadowOffsetY).toBe(2);
      expect(mockCtx.shadowBlur).toBe(4);
      expect(mockCtx.shadowColor).toBe('#000');
    });

    it('should clear drop shadow', () => {
      mockCtx.shadowOffsetX = 5;
      mockCtx.shadowBlur = 10;
      EffectRenderer.clearDropShadow(mockCtx);
      expect(mockCtx.shadowOffsetX).toBe(0);
      expect(mockCtx.shadowBlur).toBe(0);
    });
  });

  describe('Integration', () => {
    it('should combine effects and clipping', () => {
      const effects = new EffectsAnchor();
      const clip = new ClippingRegion();

      effects.setDropShadow({ blur: 5 }).setBlendMode('multiply');
      clip.setCircleClip(50, 50, 40);

      expect(effects.getDropShadow()).not.toBeNull();
      expect(clip.isEnabled()).toBe(true);
    });

    it('should combine gradients and clipping', () => {
      const grad = new LinearGradient();
      const clip = new ClippingRegion();

      grad.addStop(0, '#FF0000').addStop(1, '#0000FF');
      clip.setRectClip(10, 10, 100, 100);

      expect(grad.getStops()).toHaveLength(2);
      expect(clip.isEnabled()).toBe(true);
    });
  });
});
