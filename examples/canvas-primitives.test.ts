// Test for canvas-primitives example - tests simplified factory methods
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

describe('Canvas Primitives - Simple Factory Methods', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  describe('rectangle()', () => {
    test('should create colored rectangle with simple API', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Rectangle Test' }, (win) => {
          win.setContent(() => {
            app.vbox(() => {
              app.rectangle('#e74c3c', 100, 50);
              app.rectangle('#3498db', 80, 40);
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      const rectangles = widgetInfo.filter((w: any) => w.type === 'canvasrectangle');
      expect(rectangles.length).toBe(2);
    });

    test('should create rectangle with color only', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Rectangle Test' }, (win) => {
          win.setContent(() => {
            app.rectangle('#27ae60');
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasrectangle')).toBe(true);
    });
  });

  describe('circle()', () => {
    test('should create colored circle with radius', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Circle Test' }, (win) => {
          win.setContent(() => {
            app.vbox(() => {
              app.circle('#e74c3c', 30);
              app.circle('#3498db', 25);
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      const circles = widgetInfo.filter((w: any) => w.type === 'canvascircle');
      expect(circles.length).toBe(2);
    });

    test('should create circle with color only', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Circle Test' }, (win) => {
          win.setContent(() => {
            app.circle('#f1c40f');
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvascircle')).toBe(true);
    });
  });

  describe('line()', () => {
    test('should create colored line with stroke width', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Line Test' }, (win) => {
          win.setContent(() => {
            app.vbox(() => {
              app.line('#e74c3c', 2);
              app.line('#3498db', 5);
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      const lines = widgetInfo.filter((w: any) => w.type === 'canvasline');
      expect(lines.length).toBe(2);
    });

    test('should create line with color only', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Line Test' }, (win) => {
          win.setContent(() => {
            app.line('#27ae60');
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasline')).toBe(true);
    });
  });

  describe('linearGradient()', () => {
    test('should create linear gradient with two colors', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Gradient Test' }, (win) => {
          win.setContent(() => {
            app.linearGradient('#e74c3c', '#3498db');
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvaslineargradient')).toBe(true);
    });

    test('should create linear gradient with angle', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Gradient Test' }, (win) => {
          win.setContent(() => {
            app.linearGradient('#f1c40f', '#9b59b6', 45);
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvaslineargradient')).toBe(true);
    });
  });

  describe('radialGradient()', () => {
    test('should create radial gradient', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Radial Gradient Test' }, (win) => {
          win.setContent(() => {
            app.radialGradient('#ffffff', '#e74c3c');
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasradialgradient')).toBe(true);
    });
  });

  describe('text()', () => {
    test('should create canvas text with content', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Text Test' }, (win) => {
          win.setContent(() => {
            app.text('Hello Canvas');
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvastext')).toBe(true);
    });

    test('should create canvas text with size and color', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Text Test' }, (win) => {
          win.setContent(() => {
            app.vbox(() => {
              app.text('Large Text', 24);
              app.text('Colored Text', 16, '#e74c3c');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      const textWidgets = widgetInfo.filter((w: any) => w.type === 'canvastext');
      expect(textWidgets.length).toBe(2);
    });
  });

  describe('Full demo', () => {
    test('should create all canvas primitives with simple APIs', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Canvas Primitives', width: 600, height: 500 }, (win) => {
          win.setContent(() => {
            app.vbox(() => {
              app.label('Canvas Primitives Demo');
              app.hbox(() => {
                app.rectangle('#e74c3c', 80, 60);
                app.circle('#3498db', 30);
                app.line('#27ae60', 3);
              });
              app.hbox(() => {
                app.linearGradient('#e74c3c', '#3498db');
                app.radialGradient('#ffffff', '#9b59b6');
              });
              app.text('Canvas Text', 20, '#333333');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Verify all primitive types are created
      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasrectangle')).toBe(true);
      expect(widgetInfo.some((w: any) => w.type === 'canvascircle')).toBe(true);
      expect(widgetInfo.some((w: any) => w.type === 'canvasline')).toBe(true);
      expect(widgetInfo.some((w: any) => w.type === 'canvaslineargradient')).toBe(true);
      expect(widgetInfo.some((w: any) => w.type === 'canvasradialgradient')).toBe(true);
      expect(widgetInfo.some((w: any) => w.type === 'canvastext')).toBe(true);

      // Capture screenshot if TAKE_SCREENSHOTS=1
      if (process.env.TAKE_SCREENSHOTS === '1') {
        const screenshotPath = path.join(__dirname, 'screenshots', 'canvas-primitives.png');
        await ctx.wait(500);
        await tsyneTest.screenshot(screenshotPath);
        console.log(`Screenshot saved: ${screenshotPath}`);
      }
    });
  });
});
