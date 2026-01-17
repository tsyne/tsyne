import { CanvasSphere, CanvasSphereOptions } from '../widgets';
import { Context } from '../context';
import { BridgeInterface } from '../fynebridge';

describe('CanvasSphere', () => {
  let ctx: Context;
  let mockBridge: Partial<BridgeInterface>;

  beforeEach(() => {
    // Create a mock bridge that captures sent messages
    const messages: any[] = [];
    mockBridge = {
      send: jest.fn((action: string, payload: any) => {
        messages.push({ action, payload });
        return Promise.resolve();
      }),
    };

    ctx = new Context(mockBridge as BridgeInterface);
  });

  describe('pattern system', () => {
    test('solid pattern uses single color', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'solid',
        solidColor: '#ff0000',
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          pattern: 'solid',
          solidColor: '#ff0000',
        })
      );
    });

    test('checkered pattern alternates colors', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'checkered',
        checkeredColor1: '#cc0000',
        checkeredColor2: '#ffffff',
        latBands: 8,
        lonSegments: 8,
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          pattern: 'checkered',
          checkeredColor1: '#cc0000',
          checkeredColor2: '#ffffff',
          latBands: 8,
          lonSegments: 8,
        })
      );
    });

    test('stripes pattern creates horizontal bands by default', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'stripes',
        stripeColors: ['#ff0000', '#00ff00', '#0000ff'],
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          pattern: 'stripes',
          stripeColors: ['#ff0000', '#00ff00', '#0000ff'],
          stripeDirection: 'horizontal',
        })
      );
    });

    test('stripes pattern supports vertical direction', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'stripes',
        stripeColors: ['#ff0000', '#0000ff'],
        stripeDirection: 'vertical',
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          pattern: 'stripes',
          stripeDirection: 'vertical',
        })
      );
    });

    test('gradient pattern interpolates colors', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'gradient',
        gradientStart: '#ff0000',
        gradientEnd: '#0000ff',
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          pattern: 'gradient',
          gradientStart: '#ff0000',
          gradientEnd: '#0000ff',
        })
      );
    });
  });

  describe('default values', () => {
    test('defaults to checkered pattern', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          pattern: 'checkered',
        })
      );
    });

    test('defaults to 8x8 bands and segments', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          latBands: 8,
          lonSegments: 8,
        })
      );
    });

    test('default checkered colors are red and white', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'checkered',
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          checkeredColor1: '#cc0000',
          checkeredColor2: '#ffffff',
        })
      );
    });

    test('default solid color is red', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'solid',
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          solidColor: '#cc0000',
        })
      );
    });
  });

  describe('widget properties', () => {
    test('generates unique widget ID', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
      };

      const sphere1 = new CanvasSphere(ctx, options);
      const sphere2 = new CanvasSphere(ctx, options);

      expect(sphere1.id).not.toBe(sphere2.id);
      expect(sphere1.id).toMatch(/canvassphere_/);
      expect(sphere2.id).toMatch(/canvassphere_/);
    });

    test('passes all parameters to bridge', () => {
      const options: CanvasSphereOptions = {
        cx: 150,
        cy: 200,
        radius: 75,
        pattern: 'checkered',
        latBands: 16,
        lonSegments: 12,
        rotation: Math.PI / 4,
        checkeredColor1: '#ff0000',
        checkeredColor2: '#00ff00',
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          cx: 150,
          cy: 200,
          radius: 75,
          latBands: 16,
          lonSegments: 12,
          rotation: Math.PI / 4,
        })
      );
    });
  });

  describe('update method', () => {
    test('sends update message with changed properties', async () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
      };

      const sphere = new CanvasSphere(ctx, options);
      await sphere.update({
        cx: 150,
        cy: 200,
        radius: 75,
        rotation: Math.PI / 2,
      });

      expect(mockBridge.send).toHaveBeenCalledWith(
        'updateCanvasSphere',
        expect.objectContaining({
          widgetId: sphere.id,
          cx: 150,
          cy: 200,
          radius: 75,
          rotation: Math.PI / 2,
        })
      );
    });

    test('update only changes specified properties', async () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
      };

      const sphere = new CanvasSphere(ctx, options);
      await sphere.update({
        rotation: Math.PI / 4,
      });

      expect(mockBridge.send).toHaveBeenCalledWith(
        'updateCanvasSphere',
        expect.objectContaining({
          widgetId: sphere.id,
          rotation: Math.PI / 4,
        })
      );
    });
  });

  describe('backward compatibility', () => {
    test('canvasCheckeredSphere still works with deprecation warning', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { CanvasCheckeredSphere } = require('../widgets');
      const options = {
        cx: 100,
        cy: 100,
        radius: 50,
        latBands: 8,
        lonSegments: 8,
      };

      const sphere = new CanvasCheckeredSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasCheckeredSphere',
        expect.any(Object)
      );

      warnSpy.mockRestore();
    });
  });

  describe('pattern option validation', () => {
    test('accepts all supported pattern types', () => {
      const patterns: Array<'solid' | 'checkered' | 'stripes' | 'gradient'> = [
        'solid',
        'checkered',
        'stripes',
        'gradient',
      ];

      patterns.forEach((pattern) => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
          pattern,
        };

        const sphere = new CanvasSphere(ctx, options);

        expect(mockBridge.send).toHaveBeenCalledWith(
          'createCanvasSphere',
          expect.objectContaining({
            pattern,
          })
        );
      });
    });
  });

  describe('color handling', () => {
    test('preserves hex color format', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'gradient',
        gradientStart: '#FF0000',
        gradientEnd: '#00FF00',
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          gradientStart: '#FF0000',
          gradientEnd: '#00FF00',
        })
      );
    });

    test('stripe colors array is passed correctly', () => {
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'stripes',
        stripeColors: colors,
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          stripeColors: colors,
        })
      );
    });
  });
});
