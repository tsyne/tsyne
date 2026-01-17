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

  describe('Phase 6: Animation Presets', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('animate() method', () => {
      test('spin animation starts and updates rotation', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'checkered',
        };

        const sphere = new CanvasSphere(ctx, options);
        (mockBridge.send as jest.Mock).mockClear();

        const handle = sphere.animate({ type: 'spin', speed: 1.0 });

        expect(handle.isRunning()).toBe(true);
        expect(handle.isPaused()).toBe(false);
        expect(sphere.isAnimating()).toBe(true);

        // Advance timer to trigger animation frame
        jest.advanceTimersByTime(100);

        // Should have called update with rotation
        expect(mockBridge.send).toHaveBeenCalledWith(
          'updateCanvasSphere',
          expect.objectContaining({
            widgetId: sphere.id,
            rotationY: expect.any(Number),
          })
        );

        handle.stop();
      });

      test('spin animation on X axis', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'solid',
        };

        const sphere = new CanvasSphere(ctx, options);
        (mockBridge.send as jest.Mock).mockClear();

        const handle = sphere.animate({ type: 'spin', speed: 1.0, axis: 'x' });

        jest.advanceTimersByTime(100);

        expect(mockBridge.send).toHaveBeenCalledWith(
          'updateCanvasSphere',
          expect.objectContaining({
            rotationX: expect.any(Number),
          })
        );

        handle.stop();
      });

      test('spin animation on Z axis', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'gradient',
        };

        const sphere = new CanvasSphere(ctx, options);
        (mockBridge.send as jest.Mock).mockClear();

        const handle = sphere.animate({ type: 'spin', speed: 2.0, axis: 'z' });

        jest.advanceTimersByTime(100);

        expect(mockBridge.send).toHaveBeenCalledWith(
          'updateCanvasSphere',
          expect.objectContaining({
            rotationZ: expect.any(Number),
          })
        );

        handle.stop();
      });

      test('wobble animation oscillates rotation', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'checkered',
        };

        const sphere = new CanvasSphere(ctx, options);
        (mockBridge.send as jest.Mock).mockClear();

        const handle = sphere.animate({
          type: 'wobble',
          speed: 1.0,
          axis: 'x',
          amplitude: Math.PI / 8,
        });

        jest.advanceTimersByTime(100);

        expect(mockBridge.send).toHaveBeenCalledWith(
          'updateCanvasSphere',
          expect.objectContaining({
            rotationX: expect.any(Number),
          })
        );

        handle.stop();
      });

      test('bounce animation changes radius', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'solid',
        };

        const sphere = new CanvasSphere(ctx, options);
        (mockBridge.send as jest.Mock).mockClear();

        const handle = sphere.animate({
          type: 'bounce',
          speed: 1.0,
          amplitude: 0.2,
        });

        jest.advanceTimersByTime(100);

        expect(mockBridge.send).toHaveBeenCalledWith(
          'updateCanvasSphere',
          expect.objectContaining({
            radius: expect.any(Number),
          })
        );

        handle.stop();
      });

      test('pulse animation smoothly varies radius', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 60,
          pattern: 'stripes',
        };

        const sphere = new CanvasSphere(ctx, options);
        (mockBridge.send as jest.Mock).mockClear();

        const handle = sphere.animate({
          type: 'pulse',
          speed: 0.5,
        });

        jest.advanceTimersByTime(100);

        expect(mockBridge.send).toHaveBeenCalledWith(
          'updateCanvasSphere',
          expect.objectContaining({
            radius: expect.any(Number),
          })
        );

        handle.stop();
      });
    });

    describe('stopAnimation() method', () => {
      test('stops running animation', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
        };

        const sphere = new CanvasSphere(ctx, options);
        const handle = sphere.animate({ type: 'spin' });

        expect(sphere.isAnimating()).toBe(true);

        sphere.stopAnimation();

        expect(sphere.isAnimating()).toBe(false);
        expect(handle.isRunning()).toBe(false);
      });

      test('handle.stop() also stops animation', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
        };

        const sphere = new CanvasSphere(ctx, options);
        const handle = sphere.animate({ type: 'wobble' });

        expect(sphere.isAnimating()).toBe(true);

        handle.stop();

        expect(sphere.isAnimating()).toBe(false);
      });
    });

    describe('pause and resume', () => {
      test('pause() pauses animation', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
        };

        const sphere = new CanvasSphere(ctx, options);
        const handle = sphere.animate({ type: 'spin' });

        expect(handle.isRunning()).toBe(true);
        expect(handle.isPaused()).toBe(false);

        handle.pause();

        expect(handle.isRunning()).toBe(false);
        expect(handle.isPaused()).toBe(true);
        expect(sphere.isAnimating()).toBe(true);  // Timer still exists
      });

      test('resume() resumes paused animation', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
        };

        const sphere = new CanvasSphere(ctx, options);
        const handle = sphere.animate({ type: 'pulse' });

        handle.pause();
        expect(handle.isPaused()).toBe(true);

        handle.resume();
        expect(handle.isPaused()).toBe(false);
        expect(handle.isRunning()).toBe(true);

        handle.stop();
      });

      test('paused animation does not update sphere', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
        };

        const sphere = new CanvasSphere(ctx, options);
        (mockBridge.send as jest.Mock).mockClear();

        const handle = sphere.animate({ type: 'spin' });

        // Let some frames run
        jest.advanceTimersByTime(50);
        const callCount1 = (mockBridge.send as jest.Mock).mock.calls.length;

        // Pause animation
        handle.pause();
        (mockBridge.send as jest.Mock).mockClear();

        // Advance time while paused
        jest.advanceTimersByTime(200);

        // No new calls should have been made while paused
        expect(mockBridge.send).not.toHaveBeenCalled();

        handle.stop();
      });
    });

    describe('non-looping animations', () => {
      test('non-looping animation calls onComplete when done', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
        };

        const onComplete = jest.fn();
        const sphere = new CanvasSphere(ctx, options);
        const handle = sphere.animate({
          type: 'spin',
          speed: 10.0,  // Fast speed for quick completion
          loop: false,
          onComplete,
        });

        expect(sphere.isAnimating()).toBe(true);

        // Advance time past one cycle
        jest.advanceTimersByTime(1000);

        // Should have completed
        expect(onComplete).toHaveBeenCalled();
        expect(sphere.isAnimating()).toBe(false);
      });
    });

    describe('getCurrentAnimation()', () => {
      test('returns current animation options', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
        };

        const sphere = new CanvasSphere(ctx, options);
        sphere.animate({
          type: 'wobble',
          speed: 2.0,
          axis: 'x',
          amplitude: Math.PI / 4,
        });

        const current = sphere.getCurrentAnimation();
        expect(current).toBeDefined();
        expect(current?.type).toBe('wobble');
        expect(current?.speed).toBe(2.0);
        expect(current?.axis).toBe('x');
        expect(current?.amplitude).toBe(Math.PI / 4);

        sphere.stopAnimation();
      });

      test('returns undefined when no animation', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
        };

        const sphere = new CanvasSphere(ctx, options);
        expect(sphere.getCurrentAnimation()).toBeUndefined();
      });
    });

    describe('starting new animation replaces existing', () => {
      test('animate() stops previous animation and starts new one', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
        };

        const sphere = new CanvasSphere(ctx, options);

        sphere.animate({ type: 'spin' });
        expect(sphere.getCurrentAnimation()?.type).toBe('spin');
        expect(sphere.isAnimating()).toBe(true);

        sphere.animate({ type: 'wobble' });
        expect(sphere.getCurrentAnimation()?.type).toBe('wobble');
        expect(sphere.isAnimating()).toBe(true);

        // Only one animation should be running (the new one)
        const handle = sphere.animate({ type: 'bounce' });
        expect(sphere.getCurrentAnimation()?.type).toBe('bounce');
        expect(handle.isRunning()).toBe(true);

        handle.stop();
        expect(sphere.isAnimating()).toBe(false);
      });
    });

    describe('default values', () => {
      test('spin uses default speed of 1.0', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
        };

        const sphere = new CanvasSphere(ctx, options);
        sphere.animate({ type: 'spin' });

        const current = sphere.getCurrentAnimation();
        expect(current?.speed).toBe(1.0);

        sphere.stopAnimation();
      });

      test('wobble uses default amplitude of PI/6', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
        };

        const sphere = new CanvasSphere(ctx, options);
        sphere.animate({ type: 'wobble' });

        const current = sphere.getCurrentAnimation();
        expect(current?.amplitude).toBeCloseTo(Math.PI / 6, 5);

        sphere.stopAnimation();
      });

      test('bounce uses default amplitude of 0.15', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
        };

        const sphere = new CanvasSphere(ctx, options);
        sphere.animate({ type: 'bounce' });

        const current = sphere.getCurrentAnimation();
        expect(current?.amplitude).toBe(0.15);

        sphere.stopAnimation();
      });

      test('pulse uses default amplitude of 0.08', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
        };

        const sphere = new CanvasSphere(ctx, options);
        sphere.animate({ type: 'pulse' });

        const current = sphere.getCurrentAnimation();
        expect(current?.amplitude).toBe(0.08);

        sphere.stopAnimation();
      });

      test('default axis is Y', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
        };

        const sphere = new CanvasSphere(ctx, options);
        sphere.animate({ type: 'spin' });

        const current = sphere.getCurrentAnimation();
        expect(current?.axis).toBe('y');

        sphere.stopAnimation();
      });

      test('default loop is true', () => {
        const options: CanvasSphereOptions = {
          cx: 100,
          cy: 100,
          radius: 50,
        };

        const sphere = new CanvasSphere(ctx, options);
        sphere.animate({ type: 'spin' });

        const current = sphere.getCurrentAnimation();
        expect(current?.loop).toBe(true);

        sphere.stopAnimation();
      });
    });
  });

  describe('Phase 7: Configurable Lighting', () => {
    test('lighting options sent to bridge', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'solid',
        solidColor: '#0066cc',
        lighting: {
          enabled: true,
          direction: { x: 1, y: -0.5, z: 0.5 },
          ambient: 0.2,
          diffuse: 0.8,
        },
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          lighting: expect.objectContaining({
            enabled: true,
            direction: { x: 1, y: -0.5, z: 0.5 },
            ambient: 0.2,
            diffuse: 0.8,
          }),
        })
      );
    });

    test('lighting.enabled=false disables shading', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'checkered',
        lighting: {
          enabled: false,
        },
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          lighting: expect.objectContaining({
            enabled: false,
          }),
        })
      );
    });

    test('custom light direction affects shading', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'solid',
        lighting: {
          direction: { x: -1, y: 0, z: 0 },  // Light from left
        },
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          lighting: expect.objectContaining({
            direction: { x: -1, y: 0, z: 0 },
          }),
        })
      );
    });

    test('ambient=1.0 creates flat lighting', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'gradient',
        lighting: {
          ambient: 1.0,
          diffuse: 0,
        },
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          lighting: expect.objectContaining({
            ambient: 1.0,
            diffuse: 0,
          }),
        })
      );
    });

    test('diffuse=0 removes directional component', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'stripes',
        lighting: {
          diffuse: 0,
        },
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          lighting: expect.objectContaining({
            diffuse: 0,
          }),
        })
      );
    });

    test('default lighting values when not specified', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'solid',
        // No lighting specified - should use defaults
      };

      const sphere = new CanvasSphere(ctx, options);

      // When no lighting specified, the bridge should NOT receive lighting options
      // (Go will use hardcoded defaults)
      const calls = (mockBridge.send as jest.Mock).mock.calls;
      const createCall = calls.find((call: any[]) => call[0] === 'createCanvasSphere');
      expect(createCall).toBeDefined();
      expect(createCall[1].lighting).toBeUndefined();
    });

    test('lighting can be updated', async () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'solid',
        lighting: {
          ambient: 0.3,
        },
      };

      const sphere = new CanvasSphere(ctx, options);
      (mockBridge.send as jest.Mock).mockClear();

      await sphere.update({
        lighting: {
          ambient: 0.5,
          diffuse: 0.5,
        },
      });

      expect(mockBridge.send).toHaveBeenCalledWith(
        'updateCanvasSphere',
        expect.objectContaining({
          widgetId: sphere.id,
          lighting: expect.objectContaining({
            ambient: 0.5,
            diffuse: 0.5,
          }),
        })
      );
    });
  });

  describe('Phase 9: Custom Pattern Function', () => {
    test('custom pattern function is stored and pattern type sent to bridge', () => {
      const customFn = (lat: number, lon: number) => '#ff0000';
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        pattern: 'custom',
        customPattern: customFn,
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          pattern: 'custom',
          hasCustomPattern: true,
        })
      );
    });

    test('custom pattern with lat ranging from -PI/2 to PI/2', async () => {
      const receivedLats: number[] = [];
      const customFn = (lat: number, lon: number) => {
        receivedLats.push(lat);
        return '#ff0000';
      };

      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 25,  // Small radius for fast test
        pattern: 'custom',
        customPattern: customFn,
      };

      const sphere = new CanvasSphere(ctx, options);
      await sphere.renderCustomPattern();

      // Verify lat values are in valid range
      const minLat = Math.min(...receivedLats);
      const maxLat = Math.max(...receivedLats);
      expect(minLat).toBeGreaterThanOrEqual(-Math.PI / 2 - 0.01);
      expect(maxLat).toBeLessThanOrEqual(Math.PI / 2 + 0.01);
    });

    test('custom pattern with lon ranging from -PI to PI', async () => {
      const receivedLons: number[] = [];
      const customFn = (lat: number, lon: number) => {
        receivedLons.push(lon);
        return '#ff0000';
      };

      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 25,
        pattern: 'custom',
        customPattern: customFn,
      };

      const sphere = new CanvasSphere(ctx, options);
      await sphere.renderCustomPattern();

      // Verify lon values are in valid range
      const minLon = Math.min(...receivedLons);
      const maxLon = Math.max(...receivedLons);
      expect(minLon).toBeGreaterThanOrEqual(-Math.PI - 0.01);
      expect(maxLon).toBeLessThanOrEqual(Math.PI + 0.01);
    });

    test('custom pattern respects rotation', async () => {
      let callCount = 0;
      const customFn = (lat: number, lon: number) => {
        callCount++;
        return '#ff0000';
      };

      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 25,
        pattern: 'custom',
        customPattern: customFn,
        rotationY: Math.PI / 4,
      };

      const sphere = new CanvasSphere(ctx, options);
      await sphere.renderCustomPattern();

      // Custom pattern function should be called for visible pixels
      expect(callCount).toBeGreaterThan(0);
    });

    test('custom pattern re-renders on update()', async () => {
      let renderCount = 0;
      const customFn = (lat: number, lon: number) => {
        renderCount++;
        return '#ff0000';
      };

      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 25,
        pattern: 'custom',
        customPattern: customFn,
      };

      const sphere = new CanvasSphere(ctx, options);
      const initialRenderCount = renderCount;

      // Trigger re-render with rotation change
      await sphere.update({ rotationY: Math.PI / 2 });

      // Should have additional render calls after update
      expect(renderCount).toBeGreaterThan(initialRenderCount);
    });

    test('custom pattern sends buffer to bridge', async () => {
      const customFn = (lat: number, lon: number) => '#ff0000';
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 25,
        pattern: 'custom',
        customPattern: customFn,
      };

      const sphere = new CanvasSphere(ctx, options);
      (mockBridge.send as jest.Mock).mockClear();

      await sphere.renderCustomPattern();

      expect(mockBridge.send).toHaveBeenCalledWith(
        'updateCanvasSphereBuffer',
        expect.objectContaining({
          widgetId: sphere.id,
          buffer: expect.any(String),  // Base64 encoded buffer
        })
      );
    });
  });

  describe('Phase 8: Cubemap Textures', () => {
    test('cubemap texture options sent to bridge', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        texture: {
          mapping: 'cubemap',
          cubemap: {
            positiveX: 'skybox-px',
            negativeX: 'skybox-nx',
            positiveY: 'skybox-py',
            negativeY: 'skybox-ny',
            positiveZ: 'skybox-pz',
            negativeZ: 'skybox-nz',
          },
        },
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          texture: expect.objectContaining({
            mapping: 'cubemap',
            cubemap: expect.objectContaining({
              positiveX: 'skybox-px',
              negativeX: 'skybox-nx',
              positiveY: 'skybox-py',
              negativeY: 'skybox-ny',
              positiveZ: 'skybox-pz',
              negativeZ: 'skybox-nz',
            }),
          }),
        })
      );
    });

    test('cubemap with rotation', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        rotationX: Math.PI / 6,
        rotationY: Math.PI / 4,
        texture: {
          mapping: 'cubemap',
          cubemap: {
            positiveX: 'px',
            negativeX: 'nx',
            positiveY: 'py',
            negativeY: 'ny',
            positiveZ: 'pz',
            negativeZ: 'nz',
          },
        },
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          rotationX: Math.PI / 6,
          rotationY: Math.PI / 4,
          texture: expect.objectContaining({
            mapping: 'cubemap',
          }),
        })
      );
    });

    test('cubemap with lighting', () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        texture: {
          mapping: 'cubemap',
          cubemap: {
            positiveX: 'px',
            negativeX: 'nx',
            positiveY: 'py',
            negativeY: 'ny',
            positiveZ: 'pz',
            negativeZ: 'nz',
          },
        },
        lighting: {
          ambient: 0.4,
          diffuse: 0.6,
        },
      };

      const sphere = new CanvasSphere(ctx, options);

      expect(mockBridge.send).toHaveBeenCalledWith(
        'createCanvasSphere',
        expect.objectContaining({
          texture: expect.objectContaining({
            mapping: 'cubemap',
          }),
          lighting: expect.objectContaining({
            ambient: 0.4,
            diffuse: 0.6,
          }),
        })
      );
    });

    test('cubemap can be updated', async () => {
      const options: CanvasSphereOptions = {
        cx: 100,
        cy: 100,
        radius: 50,
        texture: {
          mapping: 'cubemap',
          cubemap: {
            positiveX: 'old-px',
            negativeX: 'old-nx',
            positiveY: 'old-py',
            negativeY: 'old-ny',
            positiveZ: 'old-pz',
            negativeZ: 'old-nz',
          },
        },
      };

      const sphere = new CanvasSphere(ctx, options);
      (mockBridge.send as jest.Mock).mockClear();

      await sphere.update({
        texture: {
          mapping: 'cubemap',
          cubemap: {
            positiveX: 'new-px',
            negativeX: 'new-nx',
            positiveY: 'new-py',
            negativeY: 'new-ny',
            positiveZ: 'new-pz',
            negativeZ: 'new-nz',
          },
        },
      });

      expect(mockBridge.send).toHaveBeenCalledWith(
        'updateCanvasSphere',
        expect.objectContaining({
          widgetId: sphere.id,
          texture: expect.objectContaining({
            mapping: 'cubemap',
            cubemap: expect.objectContaining({
              positiveX: 'new-px',
            }),
          }),
        })
      );
    });
  });
});
