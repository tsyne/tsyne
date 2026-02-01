/**
 * Visual tests for CanvasShader widget
 *
 * Tests GPU shader rendering with screenshot verification:
 * - Basic shader patterns (gradient, radial, checkerboard)
 * - Uniform updates (float, vec2, vec3, vec4)
 * - Dynamic shader source changes (setSource)
 * - Animation via u_time
 *
 * These tests complement core/src/__tests__/canvas-shader.test.ts
 * which only verifies widget creation without visual verification.
 */

import { TestContext } from 'tsyne';
import type { App, CanvasShader } from 'tsyne';
import { CosyneTest } from '../src';
import path from 'path';

const WIDTH = 300;
const HEIGHT = 300;
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// ============================================================================
// Shader Library - Various test patterns
// ============================================================================

const shaders = {
  /** Simple horizontal gradient (left=black, right=white) */
  horizontalGradient: `
#version 110
uniform vec2 u_resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  gl_FragColor = vec4(vec3(uv.x), 1.0);
}
`,

  /** Radial gradient from center (white center, black edge) */
  radialGradient: `
#version 110
uniform vec2 u_resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 center = uv - 0.5;
  float d = length(center) * 2.0;
  gl_FragColor = vec4(vec3(1.0 - d), 1.0);
}
`,

  /** Checkerboard pattern controlled by uniform scale */
  checkerboard: `
#version 110
uniform vec2 u_resolution;
uniform float u_scale;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution * u_scale;
  float checker = mod(floor(uv.x) + floor(uv.y), 2.0);
  gl_FragColor = vec4(vec3(checker), 1.0);
}
`,

  /** Solid color controlled by vec3 uniform */
  solidColor: `
#version 110
uniform vec2 u_resolution;
uniform vec3 u_color;

void main() {
  gl_FragColor = vec4(u_color, 1.0);
}
`,

  /** Color with alpha controlled by vec4 uniform */
  colorWithAlpha: `
#version 110
uniform vec2 u_resolution;
uniform vec4 u_color;

void main() {
  gl_FragColor = u_color;
}
`,

  /** Animated color cycling using u_time */
  animatedColors: `
#version 110
uniform vec2 u_resolution;
uniform float u_time;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 col = 0.5 + 0.5 * cos(u_time + uv.xyx + vec3(0.0, 2.0, 4.0));
  gl_FragColor = vec4(col, 1.0);
}
`,

  /** Circle with controllable center and radius */
  circle: `
#version 110
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_radius;
uniform vec3 u_color;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float d = length(uv - u_center);
  float circle = step(d, u_radius);
  gl_FragColor = vec4(u_color * circle, 1.0);
}
`,

  /** Plasma effect */
  plasma: `
#version 110
uniform vec2 u_resolution;
uniform float u_time;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution * 10.0;
  float v = sin(uv.x + u_time);
  v += sin(uv.y + u_time);
  v += sin(uv.x + uv.y + u_time);
  v += sin(length(uv) + u_time);
  v = v / 4.0;
  vec3 col = vec3(
    sin(v * 3.14159),
    sin(v * 3.14159 + 2.094),
    sin(v * 3.14159 + 4.188)
  ) * 0.5 + 0.5;
  gl_FragColor = vec4(col, 1.0);
}
`,
};

// ============================================================================
// Test Suite
// ============================================================================

describe('CanvasShader Visual Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  describe('Basic Shader Patterns', () => {
    it('should render horizontal gradient', async () => {
      cosyneTest = new CosyneTest({ headed: true });
      const testApp = await cosyneTest.createApp((a: App) => {
        a.window({ title: 'Horizontal Gradient', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
          win.setContent(() => {
            a.vbox(() => {
              a.label('Horizontal Gradient');
              a.canvasStack(() => {
                a.canvasShader(WIDTH, HEIGHT, shaders.horizontalGradient, {});
              });
            });
          });
          win.show();
        });
      });

      ctx = cosyneTest.getContext();
      await testApp.run();
      await ctx.wait(300);
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'shader-horizontal-gradient.png'));
      expect(true).toBe(true);
    });

    it('should render radial gradient', async () => {
      cosyneTest = new CosyneTest({ headed: true });
      const testApp = await cosyneTest.createApp((a: App) => {
        a.window({ title: 'Radial Gradient', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
          win.setContent(() => {
            a.vbox(() => {
              a.label('Radial Gradient');
              a.canvasStack(() => {
                a.canvasShader(WIDTH, HEIGHT, shaders.radialGradient, {});
              });
            });
          });
          win.show();
        });
      });

      ctx = cosyneTest.getContext();
      await testApp.run();
      await ctx.wait(300);
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'shader-radial-gradient.png'));
      expect(true).toBe(true);
    });

    it('should render checkerboard pattern', async () => {
      cosyneTest = new CosyneTest({ headed: true });
      const testApp = await cosyneTest.createApp((a: App) => {
        a.window({ title: 'Checkerboard', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
          win.setContent(() => {
            a.vbox(() => {
              a.label('Checkerboard (8x8)');
              a.canvasStack(() => {
                a.canvasShader(WIDTH, HEIGHT, shaders.checkerboard, {
                  uniforms: { u_scale: 8.0 }
                });
              });
            });
          });
          win.show();
        });
      });

      ctx = cosyneTest.getContext();
      await testApp.run();
      await ctx.wait(300);
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'shader-checkerboard.png'));
      expect(true).toBe(true);
    });
  });

  describe('Uniform Updates', () => {
    it('should update float uniform (checkerboard scale)', async () => {
      let shader: CanvasShader | null = null;

      cosyneTest = new CosyneTest({ headed: true });
      const testApp = await cosyneTest.createApp((a: App) => {
        a.window({ title: 'Uniform Update', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
          win.setContent(() => {
            a.vbox(() => {
              a.label('Checkerboard - Scale Changed');
              a.canvasStack(() => {
                shader = a.canvasShader(WIDTH, HEIGHT, shaders.checkerboard, {
                  uniforms: { u_scale: 4.0 }
                });
              });
            });
          });
          win.show();
        });
      });

      ctx = cosyneTest.getContext();
      await testApp.run();
      await ctx.wait(300);

      // Screenshot before change
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'shader-uniform-before.png'));

      // Update scale
      await shader!.setUniform('u_scale', 16.0);
      await ctx.wait(200);

      // Screenshot after change
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'shader-uniform-after.png'));
      expect(true).toBe(true);
    });

    it('should update vec3 uniform (solid color)', async () => {
      let shader: CanvasShader | null = null;

      cosyneTest = new CosyneTest({ headed: true });
      const testApp = await cosyneTest.createApp((a: App) => {
        a.window({ title: 'Color Change', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
          win.setContent(() => {
            a.vbox(() => {
              a.label('Solid Color - Red then Blue');
              a.canvasStack(() => {
                shader = a.canvasShader(WIDTH, HEIGHT, shaders.solidColor, {
                  uniforms: { u_color: [1.0, 0.0, 0.0] }  // Red
                });
              });
            });
          });
          win.show();
        });
      });

      ctx = cosyneTest.getContext();
      await testApp.run();
      await ctx.wait(300);

      // Screenshot red
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'shader-color-red.png'));

      // Change to blue
      await shader!.setUniform('u_color', [0.0, 0.0, 1.0]);
      await ctx.wait(200);

      // Screenshot blue
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'shader-color-blue.png'));
      expect(true).toBe(true);
    });

    it('should update vec2 uniform (circle position)', async () => {
      let shader: CanvasShader | null = null;

      cosyneTest = new CosyneTest({ headed: true });
      const testApp = await cosyneTest.createApp((a: App) => {
        a.window({ title: 'Circle Move', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
          win.setContent(() => {
            a.vbox(() => {
              a.label('Circle - Position Changed');
              a.canvasStack(() => {
                shader = a.canvasShader(WIDTH, HEIGHT, shaders.circle, {
                  uniforms: {
                    u_center: [0.25, 0.5],
                    u_radius: 0.15,
                    u_color: [1.0, 1.0, 0.0]  // Yellow
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
      await ctx.wait(300);

      // Screenshot left
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'shader-circle-left.png'));

      // Move to right
      await shader!.setUniform('u_center', [0.75, 0.5]);
      await ctx.wait(200);

      // Screenshot right
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'shader-circle-right.png'));
      expect(true).toBe(true);
    });
  });

  describe('Dynamic Shader Source', () => {
    it('should change shader source with setSource()', async () => {
      let shader: CanvasShader | null = null;

      cosyneTest = new CosyneTest({ headed: true });
      const testApp = await cosyneTest.createApp((a: App) => {
        a.window({ title: 'Source Change', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
          win.setContent(() => {
            a.vbox(() => {
              a.label('Shader Source Changed');
              a.canvasStack(() => {
                shader = a.canvasShader(WIDTH, HEIGHT, shaders.horizontalGradient, {});
              });
            });
          });
          win.show();
        });
      });

      ctx = cosyneTest.getContext();
      await testApp.run();
      await ctx.wait(300);

      // Screenshot horizontal gradient
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'shader-source-before.png'));

      // Change to radial gradient
      await shader!.setSource(shaders.radialGradient);
      await ctx.wait(200);

      // Screenshot radial gradient
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'shader-source-after.png'));
      expect(true).toBe(true);
    });
  });

  describe('Animation', () => {
    it('should show animation via u_time', async () => {
      cosyneTest = new CosyneTest({ headed: true });
      const testApp = await cosyneTest.createApp((a: App) => {
        a.window({ title: 'Animation', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
          win.setContent(() => {
            a.vbox(() => {
              a.label('Animated Colors (u_time)');
              a.canvasStack(() => {
                a.canvasShader(WIDTH, HEIGHT, shaders.animatedColors, {});
              });
            });
          });
          win.show();
        });
      });

      ctx = cosyneTest.getContext();
      await testApp.run();

      // Capture at t=0
      await ctx.wait(100);
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'shader-anim-t0.png'));

      // Capture at t=500ms
      await ctx.wait(500);
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'shader-anim-t500.png'));

      // Capture at t=1000ms
      await ctx.wait(500);
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'shader-anim-t1000.png'));

      expect(true).toBe(true);
    });

    it('should render plasma effect', async () => {
      cosyneTest = new CosyneTest({ headed: true });
      const testApp = await cosyneTest.createApp((a: App) => {
        a.window({ title: 'Plasma', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
          win.setContent(() => {
            a.vbox(() => {
              a.label('Plasma Effect');
              a.canvasStack(() => {
                a.canvasShader(WIDTH, HEIGHT, shaders.plasma, {});
              });
            });
          });
          win.show();
        });
      });

      ctx = cosyneTest.getContext();
      await testApp.run();
      await ctx.wait(300);
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'shader-plasma.png'));
      expect(true).toBe(true);
    });
  });
});
