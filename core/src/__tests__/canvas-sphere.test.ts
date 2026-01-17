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
          rotationY: Math.PI / 4,  // Phase 2: 'rotation' maps to 'rotationY'
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
          rotationY: Math.PI / 2,  // Phase 2: 'rotation' maps to 'rotationY'
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
          rotationY: Math.PI / 4,  // Phase 2: 'rotation' maps to 'rotationY'
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

  describe('Phase 2: Multi-axis rotation', () => {
    test('rotationY spins sphere left/right', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        rotationY: Math.PI / 4,  // 45 degrees
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          rotationY: Math.PI / 4,
        })
      );
    });

    test('rotationX tilts sphere forward/back', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        rotationX: Math.PI / 6,  // 30 degrees
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          rotationX: Math.PI / 6,
        })
      );
    });

    test('rotationZ rolls sphere', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        rotationZ: Math.PI / 3,  // 60 degrees
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          rotationZ: Math.PI / 3,
        })
      );
    });

    test('combined rotations apply correctly', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        rotationX: Math.PI / 8,
        rotationY: Math.PI / 4,
        rotationZ: Math.PI / 6,
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          rotationX: Math.PI / 8,
          rotationY: Math.PI / 4,
          rotationZ: Math.PI / 6,
        })
      );
    });

    test('backward compatibility: rotation parameter maps to rotationY', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        rotation: Math.PI / 2,  // Old API
      };

      const sphere = new CanvasSphere(ctx, options);

      // Should map to rotationY
      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          rotationY: Math.PI / 2,
        })
      );
    });

    test('rotationY takes precedence over rotation parameter', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        rotation: Math.PI / 2,  // Old API
        rotationY: Math.PI / 4,  // New API
      };

      const sphere = new CanvasSphere(ctx, options);

      // Should use rotationY, not rotation
      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          rotationY: Math.PI / 4,
        })
      );
    });
  });

  describe('update with rotation', () => {
    test('update can change rotationY', async () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
      };

      const sphere = new CanvasSphere(ctx, options);
      (mockBridge.send as jest.Mock).mockClear();

      await sphere.update({ rotationY: Math.PI / 3 });

      expect(mockBridge.send).toHaveBeenCalledWith(
        'updateCanvasSphere',
        expect.objectContaining({
          rotationY: Math.PI / 3,
        })
      );
    });

    test('update can change all rotation axes simultaneously', async () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
      };

      const sphere = new CanvasSphere(ctx, options);
      (mockBridge.send as jest.Mock).mockClear();

      await sphere.update({
        rotationX: Math.PI / 8,
        rotationY: Math.PI / 4,
        rotationZ: Math.PI / 6,
      });

      expect(mockBridge.send).toHaveBeenCalledWith(
        'updateCanvasSphere',
        expect.objectContaining({
          rotationX: Math.PI / 8,
          rotationY: Math.PI / 4,
          rotationZ: Math.PI / 6,
        })
      );
    });

    test('update with rotation parameter (backward compat) maps to rotationY', async () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
      };

      const sphere = new CanvasSphere(ctx, options);
      (mockBridge.send as jest.Mock).mockClear();

      await sphere.update({ rotation: Math.PI / 2 });

      expect(mockBridge.send).toHaveBeenCalledWith(
        'updateCanvasSphere',
        expect.objectContaining({
          rotationY: Math.PI / 2,
        })
      );
    });
  });

  describe('Phase 4: Texture Mapping', () => {
    test('texture option includes resourceName', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        texture: {
          resourceName: 'earth-equirectangular',
        },
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          texture: expect.objectContaining({
            resourceName: 'earth-equirectangular',
          }),
        })
      );
    });

    test('texture defaults to equirectangular mapping', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        texture: {
          resourceName: 'my-texture',
        },
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          texture: expect.objectContaining({
            mapping: 'equirectangular',
          }),
        })
      );
    });

    test('texture supports cubemap mapping', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        texture: {
          resourceName: 'cube-texture',
          mapping: 'cubemap',
        },
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          texture: expect.objectContaining({
            resourceName: 'cube-texture',
            mapping: 'cubemap',
          }),
        })
      );
    });

    test('texture can be updated', async () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
      };

      const sphere = new CanvasSphere(ctx, options);
      (mockBridge.send as jest.Mock).mockClear();

      await sphere.update({
        texture: {
          resourceName: 'new-texture',
          mapping: 'equirectangular',
        },
      });

      expect(mockBridge.send).toHaveBeenCalledWith(
        'updateCanvasSphere',
        expect.objectContaining({
          widgetId: sphere.id,
          texture: expect.objectContaining({
            resourceName: 'new-texture',
            mapping: 'equirectangular',
          }),
        })
      );
    });

    test('texture can be changed from one to another', async () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        texture: {
          resourceName: 'earth',
          mapping: 'equirectangular',
        },
      };

      const sphere = new CanvasSphere(ctx, options);
      (mockBridge.send as jest.Mock).mockClear();

      await sphere.update({
        texture: {
          resourceName: 'mars',
          mapping: 'equirectangular',
        },
      });

      expect(mockBridge.send).toHaveBeenCalledWith(
        'updateCanvasSphere',
        expect.objectContaining({
          texture: expect.objectContaining({
            resourceName: 'mars',
          }),
        })
      );
    });

    test('texture and rotation can be used together', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        texture: {
          resourceName: 'earth-equirectangular',
          mapping: 'equirectangular',
        },
        rotationX: Math.PI / 6,
        rotationY: Math.PI / 4,
        rotationZ: Math.PI / 8,
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          texture: expect.objectContaining({
            resourceName: 'earth-equirectangular',
            mapping: 'equirectangular',
          }),
          rotationX: Math.PI / 6,
          rotationY: Math.PI / 4,
          rotationZ: Math.PI / 8,
        })
      );
    });

    test('texture takes precedence over pattern when both specified', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'checkered',
        checkeredColor1: '#ff0000',
        checkeredColor2: '#ffffff',
        texture: {
          resourceName: 'override-texture',
          mapping: 'equirectangular',
        },
      };

      const sphere = new CanvasSphere(ctx, options);

      // Both should be sent, but bridge/Go should use texture
      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          pattern: 'checkered',
          texture: expect.objectContaining({
            resourceName: 'override-texture',
          }),
        })
      );
    });
  });

  describe('Phase 5: Interactivity (tap events with lat/lon)', () => {
    test('onTap callback registers with bridge event listener', () => {
      const onBridge = jest.fn();
      mockBridge.on = jest.fn((eventKey: string, handler: any) => {
        // Capture the event key for verification
      });

      const tapCallback = jest.fn((lat: number, lon: number) => {});
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'solid',
        solidColor: '#cc0000',
        onTap: tapCallback,
      };

      const sphere = new CanvasSphere(ctx, options);

      // Verify hasTapHandler flag is set
      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          hasTapHandler: true,
        })
      );

      // Verify event listener is registered
      expect(mockBridge.on).toHaveBeenCalled();
      const calls = (mockBridge.on as jest.Mock).mock.calls;
      expect(calls.length > 0).toBe(true);
      expect(calls[0][0]).toMatch(new RegExp(`sphereTapped:${sphere.id}`));
    });

    test('onTap callback fires when tap event is received', () => {
      let tapHandler: any = null;
      mockBridge.on = jest.fn((eventKey: string, handler: any) => {
        if (eventKey.startsWith('sphereTapped:')) {
          tapHandler = handler;
        }
      });

      const tapCallback = jest.fn();
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'checkered',
        onTap: tapCallback,
      };

      const sphere = new CanvasSphere(ctx, options);

      // Simulate tap event from bridge with lat/lon coordinates
      tapHandler({
        lat: 0,
        lon: 0,
        screenX: 100,
        screenY: 100,
      });

      expect(tapCallback).toHaveBeenCalledWith(0, 0, 100, 100);
    });

    test('onTap callback receives equator coordinates', () => {
      let tapHandler: any = null;
      mockBridge.on = jest.fn((eventKey: string, handler: any) => {
        if (eventKey.startsWith('sphereTapped:')) {
          tapHandler = handler;
        }
      });

      const tapCallback = jest.fn();
      const options: CanvasSphereOptions = {
        cx: 200,
        cy: 200,
        radius: 80,
        pattern: 'solid',
        solidColor: '#0000ff',
        onTap: tapCallback,
      };

      new CanvasSphere(ctx, options);

      // Simulate tap at equator, prime meridian
      tapHandler({
        lat: 0,
        lon: 0,
        screenX: 200,
        screenY: 200,
      });

      expect(tapCallback).toHaveBeenCalledWith(0, 0, 200, 200);
    });

    test('onTap callback receives north pole coordinates', () => {
      let tapHandler: any = null;
      mockBridge.on = jest.fn((eventKey: string, handler: any) => {
        if (eventKey.startsWith('sphereTapped:')) {
          tapHandler = handler;
        }
      });

      const tapCallback = jest.fn();
      const options: CanvasSphereOptions = {
        cx: 200,
        cy: 200,
        radius: 80,
        pattern: 'gradient',
        gradientStart: '#0000ff',
        gradientEnd: '#ff0000',
        onTap: tapCallback,
      };

      new CanvasSphere(ctx, options);

      // Simulate tap at north pole
      const PI_2 = Math.PI / 2;
      tapHandler({
        lat: PI_2,
        lon: 0,
        screenX: 200,
        screenY: 120,  // Top of sphere
      });

      expect(tapCallback).toHaveBeenCalledWith(PI_2, 0, 200, 120);
    });

    test('onTap works with rotation', () => {
      let tapHandler: any = null;
      mockBridge.on = jest.fn((eventKey: string, handler: any) => {
        if (eventKey.startsWith('sphereTapped:')) {
          tapHandler = handler;
        }
      });

      const tapCallback = jest.fn();
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'checkered',
        rotationY: Math.PI / 4,  // 45 degree rotation
        onTap: tapCallback,
      };

      new CanvasSphere(ctx, options);

      // Tap event should account for rotation
      tapHandler({
        lat: 0,
        lon: Math.PI / 8,  // Offset due to rotation
        screenX: 125,
        screenY: 100,
      });

      expect(tapCallback).toHaveBeenCalledWith(0, Math.PI / 8, 125, 100);
    });

    test('onTap does not register listener when callback not provided', () => {
      mockBridge.on = jest.fn();

      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'solid',
      };

      new CanvasSphere(ctx, options);

      // Verify bridge.on was never called since no onTap was provided
      expect(mockBridge.on).not.toHaveBeenCalled();
    });

    test('onTap with textured sphere', () => {
      let tapHandler: any = null;
      mockBridge.on = jest.fn((eventKey: string, handler: any) => {
        if (eventKey.startsWith('sphereTapped:')) {
          tapHandler = handler;
        }
      });

      const tapCallback = jest.fn();
      const options: CanvasSphereOptions = {
        cx: 150,
        cy: 150,
        radius: 60,
        texture: {
          resourceName: 'earth-texture',
          mapping: 'equirectangular',
        },
        onTap: tapCallback,
      };

      new CanvasSphere(ctx, options);

      // Tap on textured sphere
      tapHandler({
        lat: 0.5,
        lon: -0.5,
        screenX: 150,
        screenY: 175,
      });

      expect(tapCallback).toHaveBeenCalledWith(0.5, -0.5, 150, 175);
    });
  });
});
