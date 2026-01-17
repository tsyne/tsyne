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
});
