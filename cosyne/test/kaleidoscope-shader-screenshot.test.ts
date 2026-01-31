/**
 * Screenshot test for GPU kaleidoscope shader
 */

import { TestContext } from 'tsyne';
import type { App, CanvasShader } from 'tsyne';
import { CosyneTest } from '../src';

const WIDTH = 500;
const HEIGHT = 500;

const kaleidoscopeShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_segments;
uniform vec2 u_offset;

vec3 pattern(vec2 uv) {
    float v1 = sin(uv.x * 5.0 + u_time);
    float v2 = sin(uv.y * 5.0 + u_time * 0.7);
    float v3 = sin((uv.x + uv.y) * 5.0 + u_time * 1.3);
    float v4 = sin(length(uv) * 10.0 - u_time * 2.0);
    float v = (v1 + v2 + v3 + v4) * 0.25;
    vec3 col;
    col.r = sin(v * 3.14159 + 0.0) * 0.5 + 0.5;
    col.g = sin(v * 3.14159 + 2.094) * 0.5 + 0.5;
    col.b = sin(v * 3.14159 + 4.188) * 0.5 + 0.5;
    return col;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y) * 2.0;
    uv += u_offset * 0.5;
    float radius = length(uv);
    float angle = atan(uv.y, uv.x);
    float segments = max(2.0, u_segments);
    float segmentAngle = 3.14159 * 2.0 / segments;
    float segmentIndex = floor(angle / segmentAngle + segments);
    segmentIndex = mod(segmentIndex, segments);
    float localAngle = mod(angle + 3.14159 * 2.0, segmentAngle);
    if (mod(segmentIndex, 2.0) >= 1.0) {
        localAngle = segmentAngle - localAngle;
    }
    vec2 mirroredUV = vec2(cos(localAngle), sin(localAngle)) * radius;
    vec3 col = pattern(mirroredUV);
    col *= 1.0 - radius * 0.3;
    gl_FragColor = vec4(col, 1.0);
}
`;

describe('Kaleidoscope Shader Screenshot', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render GPU kaleidoscope with 8 segments', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'GPU Kaleidoscope', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('GPU Kaleidoscope - 8 segments');
            a.canvasStack(() => {
              a.canvasShader(WIDTH, HEIGHT, kaleidoscopeShader, {
                uniforms: {
                  u_segments: 8,
                  u_offset: [0, 0],
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
    await ctx.captureScreenshot('kaleidoscope-shader-8.png');
    expect(true).toBe(true);
  });

  it('should render GPU kaleidoscope with 6 segments', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'GPU Kaleidoscope', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('GPU Kaleidoscope - 6 segments');
            a.canvasStack(() => {
              a.canvasShader(WIDTH, HEIGHT, kaleidoscopeShader, {
                uniforms: {
                  u_segments: 6,
                  u_offset: [0, 0],
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
    await ctx.captureScreenshot('kaleidoscope-shader-6.png');
    expect(true).toBe(true);
  });
});
