import { TsyneTest, TestContext } from '../index-test';
import type { App, CanvasShader } from '../index';
import path from 'path';

const WIDTH = 300;
const HEIGHT = 300;
const SCREENSHOTS_DIR = path.join(__dirname, '..', '..', '..', 'ported-apps', 'script-schmiede-fractals', 'screenshots');

const mandelbrotShader = `
#version 110
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_center;
uniform float u_zoom;
uniform float u_maxIter;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 c = (uv - 0.5) * 3.0 / u_zoom + u_center;
  vec2 z = vec2(0.0);
  float iter = 0.0;
  for (int i = 0; i < 256; i++) {
    if (float(i) >= u_maxIter) break;
    z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
    if (length(z) > 2.0) break;
    iter += 1.0;
  }
  if (iter >= u_maxIter - 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float t = iter / u_maxIter;
    gl_FragColor = vec4(min(1.0, t*3.0), max(0.0, t*3.0 - 1.0), max(0.0, t*3.0 - 2.0), 1.0);
  }
}
`;

const juliaShader = `
#version 110
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_center;
uniform float u_zoom;
uniform float u_maxIter;
uniform vec2 u_juliaC;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 z = (uv - 0.5) * 3.0 / u_zoom + u_center;
  vec2 c = u_juliaC;
  float iter = 0.0;
  for (int i = 0; i < 256; i++) {
    if (float(i) >= u_maxIter) break;
    z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
    if (length(z) > 2.0) break;
    iter += 1.0;
  }
  if (iter >= u_maxIter - 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float t = iter / u_maxIter;
    gl_FragColor = vec4(min(1.0, t*3.0), max(0.0, t*3.0 - 1.0), max(0.0, t*3.0 - 2.0), 1.0);
  }
}
`;

describe('CanvasShader setSource debug', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  it('should render mandelbrot, then switch source and re-render', async () => {
    let shader: CanvasShader;

    tsyneTest = new TsyneTest({ headed: true });
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'SetSource Debug', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Mandelbrot → Julia');
            shader = app.canvasShader(WIDTH, HEIGHT, mandelbrotShader, {
              uniforms: {
                u_center: [-0.5, 0],
                u_zoom: 1,
                u_maxIter: 256,
              }
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Screenshot 1: initial mandelbrot
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'debug-1-initial-mandelbrot.png'));

    // Now mimic what setFractal does: setSource then setUniforms
    await shader!.setSource(juliaShader);
    await shader!.setUniforms({
      u_center: [0, 0],
      u_zoom: 1,
      u_maxIter: 256,
      u_juliaC: [-0.7, 0.27015],
    });
    await ctx.wait(500);

    // Screenshot 2: after switching to julia
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'debug-2-after-julia.png'));

    // Switch back to mandelbrot
    await shader!.setSource(mandelbrotShader);
    await shader!.setUniforms({
      u_center: [-0.5, 0],
      u_zoom: 1,
      u_maxIter: 256,
    });
    await ctx.wait(500);

    // Screenshot 3: after switching back to mandelbrot
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'debug-3-back-to-mandelbrot.png'));

    expect(true).toBe(true);
  });
});
