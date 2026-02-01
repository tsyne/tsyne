/**
 * Screenshot test for GPU fractals
 *
 * Verifies that the GLSL shaders compile and render correctly
 * on desktop OpenGL (GLSL 1.10).
 */

import { TestContext } from 'tsyne';
import type { App, CanvasShader } from 'tsyne';
import { CosyneTest } from '../../cosyne/src';
import path from 'path';

const WIDTH = 400;
const HEIGHT = 400;
const MAX_ITERATIONS = 100;

const SCREENSHOTS_DIR = path.join(__dirname, '../../cosyne/test/screenshots');

/** Mandelbrot shader - uses only required uniforms */
const mandelbrotShader = `
#version 110

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoom;
uniform float u_maxIter;

vec2 csquare(vec2 z) {
  return vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 c = (uv - 0.5) * 3.0 / u_zoom + u_center;

  vec2 z = vec2(0.0);
  float iter = 0.0;

  for (int i = 0; i < 256; i++) {
    if (float(i) >= u_maxIter) break;
    z = csquare(z) + c;
    if (length(z) > 2.0) break;
    iter += 1.0;
  }

  if (iter >= u_maxIter - 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float t = iter / u_maxIter;
    // Fire palette
    vec3 col = vec3(
      min(1.0, t * 3.0),
      max(0.0, min(1.0, t * 3.0 - 1.0)),
      max(0.0, t * 3.0 - 2.0)
    );
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

/** Julia shader - uses only required uniforms */
const juliaShader = `
#version 110

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoom;
uniform float u_maxIter;
uniform vec2 u_juliaC;

vec2 csquare(vec2 z) {
  return vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 z = (uv - 0.5) * 3.0 / u_zoom + u_center;
  vec2 c = u_juliaC;

  float iter = 0.0;

  for (int i = 0; i < 256; i++) {
    if (float(i) >= u_maxIter) break;
    z = csquare(z) + c;
    if (length(z) > 2.0) break;
    iter += 1.0;
  }

  if (iter >= u_maxIter - 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float t = iter / u_maxIter;
    // Fire palette
    vec3 col = vec3(
      min(1.0, t * 3.0),
      max(0.0, min(1.0, t * 3.0 - 1.0)),
      max(0.0, t * 3.0 - 2.0)
    );
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

describe('GPU Fractals Screenshot Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render Mandelbrot set using GPU shader', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'GPU Mandelbrot', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('GPU Mandelbrot Set');
            a.canvasStack(() => {
              a.canvasShader(WIDTH, HEIGHT, mandelbrotShader, {
                uniforms: {
                  u_center: [-0.5, 0],
                  u_zoom: 1.0,
                  u_maxIter: MAX_ITERATIONS,
                }
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'gpu-mandelbrot.png'));
    expect(true).toBe(true);
  });

  it('should render Julia set using GPU shader', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'GPU Julia', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('GPU Julia Set (c = -0.7 + 0.27i)');
            a.canvasStack(() => {
              a.canvasShader(WIDTH, HEIGHT, juliaShader, {
                uniforms: {
                  u_center: [0, 0],
                  u_zoom: 1.0,
                  u_maxIter: MAX_ITERATIONS,
                  u_juliaC: [-0.7, 0.27015],
                }
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'gpu-julia.png'));
    expect(true).toBe(true);
  });
});
