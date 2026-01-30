import { TsyneTest, TestContext } from '../index-test';
import { App, CanvasShader } from '../index';

describe('CanvasShader', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  describe('Basic Shader Creation', () => {
    it('should create a basic shader with gradient', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'Shader Test' }, (win) => {
          win.setContent(() => {
            // Simple gradient shader
            app.canvasShader(400, 300, `
              void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution;
                gl_FragColor = vec4(uv.x, uv.y, 0.5, 1.0);
              }
            `);
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasshader')).toBe(true);
    });

    it('should create a shader with custom uniforms', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'Shader Uniforms Test' }, (win) => {
          win.setContent(() => {
            app.canvasShader(400, 300, `
              uniform float u_scale;
              void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution * u_scale;
                gl_FragColor = vec4(uv.x, uv.y, 0.0, 1.0);
              }
            `, {
              uniforms: {
                u_scale: 2.0
              }
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
      expect(widgetInfo.some((w: any) => w.type === 'canvasshader')).toBe(true);
    });

    it('should create a shader with vec2 uniform', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'Shader Vec2 Test' }, (win) => {
          win.setContent(() => {
            app.canvasShader(400, 300, `
              uniform vec2 u_center;
              void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution - u_center;
                float d = length(uv);
                gl_FragColor = vec4(vec3(1.0 - d), 1.0);
              }
            `, {
              uniforms: {
                u_center: [0.5, 0.5]
              }
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
      expect(widgetInfo.some((w: any) => w.type === 'canvasshader')).toBe(true);
    });
  });

  describe('Shader Updates', () => {
    it('should update shader uniforms', async () => {
      let shader: CanvasShader | null = null;

      const createTestApp = (app: App) => {
        app.window({ title: 'Shader Update Test' }, (win) => {
          win.setContent(() => {
            shader = app.canvasShader(400, 300, `
              uniform float u_brightness;
              void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution;
                gl_FragColor = vec4(vec3(u_brightness), 1.0);
              }
            `, {
              uniforms: { u_brightness: 0.5 }
            });
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      // Verify shader was created
      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasshader')).toBe(true);

      // Update uniform
      if (shader) {
        await shader.setUniform('u_brightness', 1.0);
        expect(shader.getUniforms()['u_brightness']).toBe(1.0);
      }
    });

    it('should update multiple uniforms at once', async () => {
      let shader: CanvasShader | null = null;

      const createTestApp = (app: App) => {
        app.window({ title: 'Shader Multi-Update Test' }, (win) => {
          win.setContent(() => {
            shader = app.canvasShader(400, 300, `
              uniform float u_time;
              uniform vec2 u_mouse;
              void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution;
                gl_FragColor = vec4(uv, sin(u_time), 1.0);
              }
            `);
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      if (shader) {
        await shader.setUniforms({
          u_time: 1.5,
          u_mouse: [0.25, 0.75]
        });
        const uniforms = shader.getUniforms();
        expect(uniforms['u_time']).toBe(1.5);
        expect(uniforms['u_mouse']).toEqual([0.25, 0.75]);
      }
    });
  });

  describe('Fractal Shader Examples', () => {
    it('should create a Mandelbrot set shader', async () => {
      const mandelbrotShader = `
        uniform float u_zoom;
        uniform vec2 u_center;

        void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution;
          vec2 c = (uv - 0.5) * 4.0 / u_zoom + u_center;

          vec2 z = vec2(0.0);
          int i;
          for (i = 0; i < 100; i++) {
            z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
            if (length(z) > 2.0) break;
          }

          float t = float(i) / 100.0;
          gl_FragColor = vec4(t, t*0.5, t*0.25, 1.0);
        }
      `;

      const createTestApp = (app: App) => {
        app.window({ title: 'Mandelbrot Test' }, (win) => {
          win.setContent(() => {
            app.canvasShader(400, 400, mandelbrotShader, {
              uniforms: {
                u_zoom: 1.0,
                u_center: [-0.5, 0.0]
              }
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
      expect(widgetInfo.some((w: any) => w.type === 'canvasshader')).toBe(true);
    });

    it('should create an animated shader using u_time', async () => {
      const animatedShader = `
        void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution;
          vec3 col = 0.5 + 0.5 * cos(u_time + uv.xyx + vec3(0, 2, 4));
          gl_FragColor = vec4(col, 1.0);
        }
      `;

      const createTestApp = (app: App) => {
        app.window({ title: 'Animated Shader Test' }, (win) => {
          win.setContent(() => {
            app.canvasShader(400, 300, animatedShader);
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'canvasshader')).toBe(true);
    });
  });
});
