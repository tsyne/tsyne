import { TsyneTest, TestContext } from '../index-test';
import { App, CanvasLine, CanvasCircle, CanvasRectangle, CanvasText, CanvasRaster, CanvasLinearGradient } from '../index';

describe('Canvas Primitives', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  afterEach(() => {
    if (tsyneTest) {
      tsyneTest.cleanup();
    }
  });

  describe('CanvasLine', () => {
    it('should create a basic line', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'Line Test' }, (win) => {
          win.setContent(() => {
            app.canvasLine(0, 0, 100, 100);
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      // Line should be created (we test by checking the window exists)
      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasline')).toBe(true);
    });

    it('should create a line with custom color and width', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'Line Test' }, (win) => {
          win.setContent(() => {
            app.canvasLine(10, 10, 200, 200, {
              strokeColor: '#FF0000',
              strokeWidth: 5
            });
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasline')).toBe(true);
    });
  });

  describe('CanvasCircle', () => {
    it('should create a circle with fill color', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'Circle Test' }, (win) => {
          win.setContent(() => {
            app.canvasCircle({
              x: 50, y: 50,
              x2: 150, y2: 150,
              fillColor: '#00FF00'
            });
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvascircle')).toBe(true);
    });

    it('should create a circle with stroke', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'Circle Test' }, (win) => {
          win.setContent(() => {
            app.canvasCircle({
              x: 0, y: 0,
              x2: 100, y2: 100,
              strokeColor: '#0000FF',
              strokeWidth: 3
            });
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvascircle')).toBe(true);
    });
  });

  describe('CanvasRectangle', () => {
    it('should create a rectangle with dimensions', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'Rectangle Test' }, (win) => {
          win.setContent(() => {
            app.canvasRectangle({
              width: 200,
              height: 100,
              fillColor: '#FFFF00'
            });
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasrectangle')).toBe(true);
    });

    it('should create a rectangle with corner radius', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'Rectangle Test' }, (win) => {
          win.setContent(() => {
            app.canvasRectangle({
              width: 150,
              height: 80,
              fillColor: '#FF00FF',
              cornerRadius: 10
            });
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasrectangle')).toBe(true);
    });
  });

  describe('CanvasText', () => {
    it('should create text with custom styling', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'Text Test' }, (win) => {
          win.setContent(() => {
            app.canvasText('Hello Canvas', {
              color: '#333333',
              textSize: 24,
              bold: true
            });
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvastext')).toBe(true);
    });

    it('should create text with alignment', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'Text Test' }, (win) => {
          win.setContent(() => {
            app.canvasText('Centered Text', {
              alignment: 'center'
            });
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvastext')).toBe(true);
    });
  });

  describe('CanvasRaster', () => {
    it('should create a raster canvas', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'Raster Test' }, (win) => {
          win.setContent(() => {
            app.canvasRaster(64, 64);
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasraster')).toBe(true);
    });

    it('should create a raster with initial pixels', async () => {
      const pixels: Array<[number, number, number, number]> = [];
      for (let i = 0; i < 16; i++) {
        pixels.push([255, 0, 0, 255]); // Red pixels
      }

      const createTestApp = (app: App) => {
        app.window({ title: 'Raster Test' }, (win) => {
          win.setContent(() => {
            app.canvasRaster(4, 4, pixels);
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasraster')).toBe(true);
    });
  });

  describe('CanvasLinearGradient', () => {
    it('should create a horizontal gradient', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'Gradient Test' }, (win) => {
          win.setContent(() => {
            app.canvasLinearGradient({
              startColor: '#FF0000',
              endColor: '#0000FF',
              width: 200,
              height: 100
            });
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvaslineargradient')).toBe(true);
    });

    it('should create an angled gradient', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'Gradient Test' }, (win) => {
          win.setContent(() => {
            app.canvasLinearGradient({
              startColor: '#FFFF00',
              endColor: '#00FF00',
              angle: 45,
              width: 150,
              height: 150
            });
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvaslineargradient')).toBe(true);
    });
  });

  describe('Canvas Widget Updates', () => {
    it('should update line properties', async () => {
      let line!: CanvasLine;

      const createTestApp = (app: App) => {
        app.window({ title: 'Update Test' }, (win) => {
          win.setContent(() => {
            line = app.canvasLine(0, 0, 50, 50);
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      // Update the line
      await line.update({
        x1: 10, y1: 10,
        x2: 100, y2: 100,
        strokeColor: '#FF0000',
        strokeWidth: 3
      });

      // Verify line still exists
      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasline')).toBe(true);
    });

    it('should update gradient properties', async () => {
      let gradient!: CanvasLinearGradient;

      const createTestApp = (app: App) => {
        app.window({ title: 'Update Test' }, (win) => {
          win.setContent(() => {
            gradient = app.canvasLinearGradient({
              startColor: '#000000',
              endColor: '#FFFFFF',
              width: 100,
              height: 100
            });
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      // Update the gradient
      await gradient.update({
        startColor: '#FF0000',
        endColor: '#00FF00',
        angle: 90
      });

      // Verify gradient still exists
      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvaslineargradient')).toBe(true);
    });
  });
});
