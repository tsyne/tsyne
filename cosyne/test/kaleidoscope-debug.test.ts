/**
 * Debug test for kaleidoscope shader
 */

import { TestContext, CanvasShader } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';

const WIDTH = 400;
const HEIGHT = 400;

const kaleidoscopeShader = `
#version 110

uniform vec2 u_resolution;
uniform vec2 u_position;  // Position of shader quad in window coordinates
uniform float u_time;
uniform float u_segments;

vec3 pattern(vec2 uv) {
    float v1 = sin(uv.x * 5.0 + u_time);
    float v2 = sin(uv.y * 5.0 + u_time * 0.7);
    float v3 = sin((uv.x + uv.y) * 5.0 + u_time * 1.3);
    float v = (v1 + v2 + v3) / 3.0;

    vec3 col;
    col.r = sin(v * 3.14159) * 0.5 + 0.5;
    col.g = sin(v * 3.14159 + 2.094) * 0.5 + 0.5;
    col.b = sin(v * 3.14159 + 4.188) * 0.5 + 0.5;
    return col;
}

void main() {
    // DEBUG: Test if u_position uniform is being received
    // If u_position.x > 0, the shader should get it from the bridge
    // Just show gl_FragCoord as colors to debug

    // DEBUG disabled - now run the real kaleidoscope

    // With viewport set by the painter, gl_FragCoord is already relative to shader quad
    // Normalize to -1 to 1, centered
    vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y) * 2.0;

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

describe('Kaleidoscope Shader Debug', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render kaleidoscope shader', async () => {
    let shader: CanvasShader | null = null;

    const createTestApp = (a: App) => {
      a.window({ title: 'Kaleidoscope Test', width: WIDTH + 40, height: HEIGHT + 60 }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Kaleidoscope Shader Test');

            a.canvasStack(() => {
              shader = a.canvasShader(WIDTH, HEIGHT, kaleidoscopeShader, {
                uniforms: {
                  u_segments: 8,
                }
              });
              console.log(`[test] Created shader with id: ${shader.id}`);
            });
          });
        });
        win.show();
      });
    };

    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp(createTestApp);
    ctx = cosyneTest.getContext();
    await testApp.run();

    // Wait for rendering
    await ctx.wait(500);

    // Take screenshot
    await ctx.captureScreenshot('kaleidoscope-test.png');

    // Check widgets
    const widgets = await ctx.getAllWidgets();
    console.log(`[test] Total widgets: ${widgets.length}`);
    const shaderWidgets = widgets.filter((w: any) => w.type === 'canvasshader');
    console.log(`[test] Shader widgets: ${shaderWidgets.length}`);

    if (shaderWidgets.length > 0) {
      console.log(`[test] Shader widget:`, JSON.stringify(shaderWidgets[0], null, 2));
    }

    expect(shaderWidgets.length).toBe(1);
  });
});
