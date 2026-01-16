// Test for canvas gradient text - verifies rainbow gradient text rendering
import { TsyneTest, TestContext } from '../core/src/index-test';
import * as path from 'path';

describe('Canvas Gradient Text', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  describe('canvasGradientText()', () => {
    test('should create gradient text with default options', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Gradient Text Test', width: 400, height: 200 }, (win) => {
          win.setContent(() => {
            app.canvasStack(() => {
              app.canvasGradientText('Hello');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasgradienttext')).toBe(true);
    });

    test('should create gradient text with custom font size', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Gradient Text Test', width: 400, height: 200 }, (win) => {
          win.setContent(() => {
            app.canvasStack(() => {
              app.canvasGradientText('Large', { fontSize: 72 });
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasgradienttext')).toBe(true);
    });

    test('should create gradient text with position', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Gradient Text Test', width: 400, height: 200 }, (win) => {
          win.setContent(() => {
            app.canvasStack(() => {
              app.canvasGradientText('Positioned', { x: 50, y: 30, fontSize: 36 });
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasgradienttext')).toBe(true);
    });

    test('should create multiple gradient texts', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Multi Gradient Text', width: 400, height: 300 }, (win) => {
          win.setContent(() => {
            app.canvasStack(() => {
              app.canvasGradientText('Rainbow', { x: 10, y: 10, fontSize: 48 });
              app.canvasGradientText('Text', { x: 10, y: 70, fontSize: 48 });
              app.canvasGradientText('Demo', { x: 10, y: 130, fontSize: 48 });
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      const gradientTexts = widgetInfo.filter((w: any) => w.type === 'canvasgradienttext');
      expect(gradientTexts.length).toBe(3);
    });

    test('should create bold gradient text', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Bold Gradient Text', width: 400, height: 200 }, (win) => {
          win.setContent(() => {
            app.canvasStack(() => {
              app.canvasGradientText('Bold', { x: 10, y: 10, fontSize: 72, bold: true });
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasgradienttext')).toBe(true);
    });
  });

  describe('Gradient directions', () => {
    test('should render gradient down (default - ROYGBIV top to bottom)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Gradient Down', width: 300, height: 150 }, (win) => {
          win.setContent(() => {
            app.canvasStack(() => {
              app.rectangle('#333', 300, 150);
              app.canvasGradientText('DOWN', { x: 10, y: 10, fontSize: 72, direction: 'down' });
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasgradienttext')).toBe(true);
    });

    test('should render gradient up (ROYGBIV bottom to top)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Gradient Up', width: 300, height: 150 }, (win) => {
          win.setContent(() => {
            app.canvasStack(() => {
              app.rectangle('#333', 300, 150);
              app.canvasGradientText('UP', { x: 10, y: 10, fontSize: 72, direction: 'up' });
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasgradienttext')).toBe(true);
    });

    test('should render gradient left (ROYGBIV right to left)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Gradient Left', width: 300, height: 150 }, (win) => {
          win.setContent(() => {
            app.canvasStack(() => {
              app.rectangle('#333', 300, 150);
              app.canvasGradientText('LEFT', { x: 10, y: 10, fontSize: 72, direction: 'left' });
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasgradienttext')).toBe(true);
    });

    test('should render gradient right (ROYGBIV left to right)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Gradient Right', width: 300, height: 150 }, (win) => {
          win.setContent(() => {
            app.canvasStack(() => {
              app.rectangle('#333', 300, 150);
              app.canvasGradientText('RIGHT', { x: 10, y: 10, fontSize: 72, direction: 'right' });
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasgradienttext')).toBe(true);
    });

    test('should render all four directions together', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'All Gradient Directions', width: 500, height: 400 }, (win) => {
          win.setContent(() => {
            app.canvasStack(() => {
              app.rectangle('#222', 500, 400);
              app.canvasGradientText('DOWN', { x: 10, y: 10, fontSize: 64, direction: 'down' });
              app.canvasGradientText('UP', { x: 10, y: 100, fontSize: 64, direction: 'up' });
              app.canvasGradientText('LEFT', { x: 10, y: 190, fontSize: 64, direction: 'left' });
              app.canvasGradientText('RIGHT', { x: 10, y: 280, fontSize: 64, direction: 'right' });
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Capture screenshot if TAKE_SCREENSHOTS=1
      if (process.env.TAKE_SCREENSHOTS === '1') {
        const screenshotPath = path.join(__dirname, 'screenshots', 'gradient-directions.png');
        await ctx.wait(500);
        await tsyneTest.screenshot(screenshotPath);
        console.log(`Screenshot saved: ${screenshotPath}`);
      }

      const widgetInfo = await ctx.getAllWidgets();
      const gradientTexts = widgetInfo.filter((w: any) => w.type === 'canvasgradienttext');
      expect(gradientTexts.length).toBe(4);
    });
  });

  describe('Visual verification', () => {
    test('should render gradient text visually', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Gradient Text Visual', width: 500, height: 300 }, (win) => {
          win.setContent(() => {
            app.canvasStack(() => {
              // Background
              app.rectangle('#2c2c54', 500, 300);
              // Rainbow gradient text
              app.canvasGradientText('Tsyne', { x: 50, y: 50, fontSize: 96 });
              app.canvasGradientText('Rainbow', { x: 50, y: 160, fontSize: 72 });
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Capture screenshot if TAKE_SCREENSHOTS=1
      if (process.env.TAKE_SCREENSHOTS === '1') {
        const screenshotPath = path.join(__dirname, 'screenshots', 'gradient-text.png');
        await ctx.wait(500);
        await tsyneTest.screenshot(screenshotPath);
        console.log(`Screenshot saved: ${screenshotPath}`);
      }

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasgradienttext')).toBe(true);
    });
  });
});
