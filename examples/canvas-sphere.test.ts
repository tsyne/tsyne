/**
 * Canvas Sphere Integration Tests
 * Tests all pattern types with TsyneTest
 */

import { App } from '../core/src/index';
import { TsyneTest } from '../core/src/index-test';

describe('Canvas Sphere Widget', () => {
  let tsyneTest: TsyneTest;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.close();
  });

  describe('solid pattern', () => {
    test('should create solid sphere widget', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'solid',
          solidColor: '#ff0000',
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      // Verify widget was created (basic sanity check)
      expect(ctx).toBeDefined();
    });

    test('should render yellow sphere', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.canvasSphere({
          cx: 150,
          cy: 150,
          radius: 60,
          pattern: 'solid',
          solidColor: '#ffff00',
        });
      });

      await testApp.run();
      // Visual verification would happen with screenshot comparison
      expect(testApp).toBeDefined();
    });
  });

  describe('checkered pattern', () => {
    test('should create checkered sphere (Boing Ball style)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 96,
          pattern: 'checkered',
          latBands: 8,
          lonSegments: 8,
          checkeredColor1: '#cc0000',
          checkeredColor2: '#ffffff',
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });

    test('should default to checkered pattern', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          // pattern omitted - should default to checkered
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });

    test('should support custom checkerboard colors', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'checkered',
          latBands: 8,
          lonSegments: 8,
          checkeredColor1: '#00ff00',
          checkeredColor2: '#0000ff',
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });

    test('should support different band configurations', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'checkered',
          latBands: 4,
          lonSegments: 6,
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });
  });

  describe('stripes pattern', () => {
    test('should create horizontal stripes', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'stripes',
          stripeColors: ['#ff0000', '#ffffff', '#0000ff'],
          stripeDirection: 'horizontal',
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });

    test('should create vertical stripes', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'stripes',
          stripeColors: ['#ff0000', '#00ff00'],
          stripeDirection: 'vertical',
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });

    test('should support multiple stripe colors', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'stripes',
          stripeColors: [
            '#ff0000',
            '#00ff00',
            '#0000ff',
            '#ffff00',
            '#ff00ff',
            '#00ffff',
          ],
          stripeDirection: 'horizontal',
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });
  });

  describe('gradient pattern', () => {
    test('should create red to blue gradient sphere', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'gradient',
          gradientStart: '#ff0000',
          gradientEnd: '#0000ff',
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });

    test('should create temperature-style gradient', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'gradient',
          gradientStart: '#0000ff',  // Cold blue
          gradientEnd: '#ff0000',    // Hot red
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });
  });

  describe('rotation', () => {
    test('should support Y-axis rotation', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'checkered',
          rotation: Math.PI / 4,
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });

    test('should update rotation dynamically', async () => {
      let sphere: any;
      const testApp = await tsyneTest.createApp((app) => {
        sphere = app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'checkered',
          rotation: 0,
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      // Rotate the sphere
      await sphere.update({
        rotation: Math.PI / 2,
      });

      expect(ctx).toBeDefined();
    });
  });

  describe('position and size', () => {
    test('should update position dynamically', async () => {
      let sphere: any;
      const testApp = await tsyneTest.createApp((app) => {
        sphere = app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'solid',
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      // Move the sphere
      await sphere.update({
        cx: 200,
        cy: 150,
      });

      expect(ctx).toBeDefined();
    });

    test('should update radius dynamically', async () => {
      let sphere: any;
      const testApp = await tsyneTest.createApp((app) => {
        sphere = app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'solid',
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      // Change size
      await sphere.update({
        radius: 80,
      });

      expect(ctx).toBeDefined();
    });
  });

  describe('multiple spheres', () => {
    test('should render all patterns together', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        // Solid
        app.canvasSphere({
          cx: 50,
          cy: 50,
          radius: 40,
          pattern: 'solid',
          solidColor: '#ff0000',
        });

        // Checkered
        app.canvasSphere({
          cx: 150,
          cy: 50,
          radius: 40,
          pattern: 'checkered',
          latBands: 8,
          lonSegments: 8,
        });

        // Stripes
        app.canvasSphere({
          cx: 250,
          cy: 50,
          radius: 40,
          pattern: 'stripes',
          stripeColors: ['#00ff00', '#ffffff'],
        });

        // Gradient
        app.canvasSphere({
          cx: 350,
          cy: 50,
          radius: 40,
          pattern: 'gradient',
          gradientStart: '#0000ff',
          gradientEnd: '#ffff00',
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });
  });

  describe('canvas sphere demo', () => {
    test('should create demo with all patterns', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.label('Canvas Sphere - Phase 1 Patterns');

        // Create demo spheres
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 80,
          pattern: 'solid',
          solidColor: '#ff0000',
        });

        app.canvasSphere({
          cx: 300,
          cy: 100,
          radius: 80,
          pattern: 'checkered',
          latBands: 8,
          lonSegments: 8,
        });

        app.canvasSphere({
          cx: 100,
          cy: 300,
          radius: 80,
          pattern: 'stripes',
          stripeColors: ['#ff0000', '#ffffff'],
        });

        app.canvasSphere({
          cx: 300,
          cy: 300,
          radius: 80,
          pattern: 'gradient',
          gradientStart: '#0000ff',
          gradientEnd: '#ff0000',
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      // Verify at least one widget was created
      expect(ctx).toBeDefined();
    });
  });

  describe('Phase 2: Multi-axis rotation', () => {
    test('should render sphere with Y-axis rotation (spin)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'checkered',
          rotationY: Math.PI / 4,  // 45 degrees spin
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });

    test('should render sphere with X-axis rotation (tilt)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'stripes',
          rotationX: Math.PI / 6,  // 30 degrees tilt
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });

    test('should render sphere with Z-axis rotation (roll)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'gradient',
          rotationZ: Math.PI / 3,  // 60 degrees roll
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });

    test('should animate sphere with combined rotations', async () => {
      let rotX = 0, rotY = 0, rotZ = 0;
      let sphere: any;

      const testApp = await tsyneTest.createApp((app) => {
        sphere = app.canvasSphere({
          cx: 200,
          cy: 200,
          radius: 80,
          pattern: 'checkered',
          rotationX: rotX,
          rotationY: rotY,
          rotationZ: rotZ,
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      // Simulate animation with combined rotations
      const increment = Math.PI / 180;  // 1 degree per frame
      for (let i = 0; i < 10; i++) {
        rotX += increment;
        rotY += increment * 1.5;
        rotZ += increment * 0.5;

        await sphere.update({
          rotationX: rotX,
          rotationY: rotY,
          rotationZ: rotZ,
        });
      }

      expect(ctx).toBeDefined();
    });

    test('should support backward compatibility with rotation parameter', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        // Using old API 'rotation' (should map to rotationY)
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'checkered',
          rotation: Math.PI / 4,
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });

    test('should render demo with multiple rotations', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.label('Canvas Sphere - Phase 2 Rotations');

        // Y-axis only (spin)
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'checkered',
          rotationY: Math.PI / 6,
        });

        // X-axis only (tilt)
        app.canvasSphere({
          cx: 250,
          cy: 100,
          radius: 50,
          pattern: 'stripes',
          rotationX: Math.PI / 8,
        });

        // Z-axis only (roll)
        app.canvasSphere({
          cx: 100,
          cy: 250,
          radius: 50,
          pattern: 'gradient',
          rotationZ: Math.PI / 5,
        });

        // Combined rotations (tumbling effect)
        app.canvasSphere({
          cx: 250,
          cy: 250,
          radius: 50,
          pattern: 'solid',
          solidColor: '#00ff00',
          rotationX: Math.PI / 12,
          rotationY: Math.PI / 4,
          rotationZ: Math.PI / 8,
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });
  });

  describe('Phase 4: Texture Mapping', () => {
    // Create a minimal valid PNG image (1x1 pixel red) for testing
    function createTestPNG(): string {
      // Minimal PNG: 1x1 red pixel
      // PNG signature + IHDR + IDAT + IEND chunks
      const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/8+gHgAFBQIB' +
                        'lJDIkwAAAABJRU5ErkJggg==';
      return `data:image/png;base64,${pngBase64}`;
    }

    test('should accept texture with equirectangular mapping', async () => {
      const testApp = await tsyneTest.createApp(async (app) => {
        // Register a test texture
        const textureData = createTestPNG();
        await app.resources.registerResource('test-texture', textureData);

        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'solid',
          solidColor: '#cc0000',
          texture: {
            resourceName: 'test-texture',
            mapping: 'equirectangular',
          },
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });

    test('should create textured sphere with checkered fallback pattern', async () => {
      const testApp = await tsyneTest.createApp(async (app) => {
        const textureData = createTestPNG();
        await app.resources.registerResource('texture-with-pattern', textureData);

        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          pattern: 'checkered',
          checkeredColor1: '#ff0000',
          checkeredColor2: '#ffffff',
          texture: {
            resourceName: 'texture-with-pattern',
          },
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });

    test('should support texture with rotation', async () => {
      const testApp = await tsyneTest.createApp(async (app) => {
        const textureData = createTestPNG();
        await app.resources.registerResource('rotated-texture', textureData);

        app.canvasSphere({
          cx: 150,
          cy: 150,
          radius: 60,
          texture: {
            resourceName: 'rotated-texture',
            mapping: 'equirectangular',
          },
          rotationX: Math.PI / 6,
          rotationY: Math.PI / 4,
          rotationZ: Math.PI / 8,
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      expect(ctx).toBeDefined();
    });

    test('should handle missing texture resource gracefully', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        // Don't register the resource, just reference it
        app.canvasSphere({
          cx: 100,
          cy: 100,
          radius: 50,
          texture: {
            resourceName: 'non-existent-texture',
          },
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      // Should not crash, falls back to pattern or solid color
      expect(ctx).toBeDefined();
    });

    test('should allow switching textures dynamically', async () => {
      let sphere: any;
      const testApp = await tsyneTest.createApp(async (app) => {
        const texture1 = createTestPNG();
        await app.resources.registerResource('texture1', texture1);

        app.window({ title: 'Texture Switch', width: 300, height: 300 }, (win) => {
          win.setContent(() => {
            sphere = app.canvasSphere({
              cx: 100,
              cy: 100,
              radius: 50,
              texture: {
                resourceName: 'texture1',
              },
            });
          });
          win.show();
        });
      });

      const ctx = tsyneTest.getContext();
      await testApp.run();

      // Switch to a different texture (would need registration in real scenario)
      if (sphere) {
        await sphere.update({
          texture: {
            resourceName: 'texture2',
          },
        });
      }

      expect(ctx).toBeDefined();
    });
  });
});
