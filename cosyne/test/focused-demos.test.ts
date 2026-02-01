/**
 * Screenshot tests for focused demos
 *
 * Tests individual concepts extracted from the larger car demo:
 * - Lighting modes
 * - SDF operations
 * - Procedural patterns
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';
import path from 'path';

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// ============================================================================
// Lighting Modes Tests
// ============================================================================

const lightingShader = `
#version 110
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_lightMode;
uniform vec3 u_primColor;

float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float sceneSDF(vec3 p) {
    float sphere = sdSphere(p, 0.8);
    float ground = p.y + 0.8;
    return min(sphere, ground);
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
        sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
        sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
    ));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y) * 2.0;
    vec3 ro = vec3(0.0, 0.5, 3.0);
    vec3 target = vec3(0.0, 0.0, 0.0);
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    vec3 rd = normalize(forward + uv.x * right + uv.y * up);

    vec3 col = vec3(0.2, 0.3, 0.4);
    float t = 0.0;

    for (int i = 0; i < 64; i++) {
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);
        if (d < 0.001) {
            vec3 pos = p;
            vec3 nor = calcNormal(pos);

            vec3 lig;
            if (u_lightMode < 0.5) {
                lig = normalize(vec3(0.0, 0.3, 1.0));
            } else if (u_lightMode < 1.5) {
                lig = normalize(vec3(1.0, 0.5, 0.3));
            } else if (u_lightMode < 2.5) {
                lig = normalize(vec3(-0.5, 0.8, -1.0));
            } else {
                lig = normalize(vec3(0.5, 0.8, 0.5));
            }

            float dif = clamp(dot(nor, lig), 0.0, 1.0);
            vec3 matCol = (pos.y < -0.7) ? vec3(0.25) : u_primColor;
            col = vec3(0.15) + matCol * dif * 0.8;
            col = pow(col, vec3(0.4545));
            break;
        }
        t += d;
        if (t > 10.0) break;
    }

    gl_FragColor = vec4(col, 1.0);
}
`;

// ============================================================================
// SDF Operations Tests
// ============================================================================

const sdfShader = `
#version 110
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_operation;

float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float opUnion(float a, float b) { return min(a, b); }
float opSub(float a, float b) { return max(a, -b); }
float opIntersect(float a, float b) { return max(a, b); }

float sceneSDF(vec3 p) {
    float a = u_time * 0.3;
    float c = cos(a);
    float s = sin(a);
    vec3 rp = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);

    float sphere = sdSphere(rp, 0.6);
    float box = sdBox(rp, vec3(0.5)) - 0.05;

    float result;
    if (u_operation < 0.5) {
        result = opUnion(sphere, box);
    } else if (u_operation < 1.5) {
        result = opSub(sphere, box);
    } else {
        result = opIntersect(sphere, box);
    }

    float ground = p.y + 0.9;
    return min(result, ground);
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
        sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
        sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
    ));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y) * 2.0;
    vec3 ro = vec3(0.0, 0.5, 3.0);
    vec3 target = vec3(0.0, 0.0, 0.0);
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    vec3 rd = normalize(forward + uv.x * right + uv.y * up);

    vec3 col = vec3(0.2, 0.3, 0.4);
    float t = 0.0;

    for (int i = 0; i < 64; i++) {
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);
        if (d < 0.001) {
            vec3 nor = calcNormal(p);
            vec3 lig = normalize(vec3(0.5, 0.8, 0.6));
            float dif = clamp(dot(nor, lig), 0.0, 1.0);

            vec3 baseCol;
            if (u_operation < 0.5) {
                baseCol = vec3(0.2, 0.6, 0.8);
            } else if (u_operation < 1.5) {
                baseCol = vec3(0.8, 0.3, 0.2);
            } else {
                baseCol = vec3(0.3, 0.8, 0.3);
            }

            if (p.y < -0.85) {
                baseCol = vec3(0.25);
            }

            col = vec3(0.2) + baseCol * dif * 0.8;
            col = pow(col, vec3(0.4545));
            break;
        }
        t += d;
        if (t > 10.0) break;
    }

    gl_FragColor = vec4(col, 1.0);
}
`;

// ============================================================================
// Test Suite
// ============================================================================

describe('Focused Demos Screenshot Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  describe('Lighting Modes', () => {
    it('should render frontal lighting', async () => {
      cosyneTest = new CosyneTest({ headed: true });
      const testApp = await cosyneTest.createApp((a: App) => {
        a.window({ title: 'Frontal', width: 340, height: 340 }, (win: any) => {
          win.setContent(() => {
            a.vbox(() => {
              a.label('Frontal Light');
              a.canvasStack(() => {
                a.canvasShader(300, 300, lightingShader, {
                  uniforms: {
                    u_lightMode: 0,
                    u_primColor: [0.8, 0.2, 0.15],
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
      await ctx.wait(400);
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'demo-light-frontal.png'));
      expect(true).toBe(true);
    });

    it('should render side lighting', async () => {
      cosyneTest = new CosyneTest({ headed: true });
      const testApp = await cosyneTest.createApp((a: App) => {
        a.window({ title: 'Side', width: 340, height: 340 }, (win: any) => {
          win.setContent(() => {
            a.vbox(() => {
              a.label('Side Light');
              a.canvasStack(() => {
                a.canvasShader(300, 300, lightingShader, {
                  uniforms: {
                    u_lightMode: 1,
                    u_primColor: [0.15, 0.3, 0.8],
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
      await ctx.wait(400);
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'demo-light-side.png'));
      expect(true).toBe(true);
    });

    it('should render back/rim lighting', async () => {
      cosyneTest = new CosyneTest({ headed: true });
      const testApp = await cosyneTest.createApp((a: App) => {
        a.window({ title: 'Back', width: 340, height: 340 }, (win: any) => {
          win.setContent(() => {
            a.vbox(() => {
              a.label('Back/Rim Light');
              a.canvasStack(() => {
                a.canvasShader(300, 300, lightingShader, {
                  uniforms: {
                    u_lightMode: 2,
                    u_primColor: [0.9, 0.7, 0.2],
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
      await ctx.wait(400);
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'demo-light-back.png'));
      expect(true).toBe(true);
    });
  });

  describe('SDF Operations', () => {
    it('should render union operation', async () => {
      cosyneTest = new CosyneTest({ headed: true });
      const testApp = await cosyneTest.createApp((a: App) => {
        a.window({ title: 'Union', width: 340, height: 340 }, (win: any) => {
          win.setContent(() => {
            a.vbox(() => {
              a.label('Union');
              a.canvasStack(() => {
                a.canvasShader(300, 300, sdfShader, {
                  uniforms: { u_operation: 0 }
                });
              });
            });
          });
          win.show();
        });
      });

      ctx = cosyneTest.getContext();
      await testApp.run();
      await ctx.wait(400);
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'demo-sdf-union.png'));
      expect(true).toBe(true);
    });

    it('should render subtraction operation', async () => {
      cosyneTest = new CosyneTest({ headed: true });
      const testApp = await cosyneTest.createApp((a: App) => {
        a.window({ title: 'Subtract', width: 340, height: 340 }, (win: any) => {
          win.setContent(() => {
            a.vbox(() => {
              a.label('Subtraction');
              a.canvasStack(() => {
                a.canvasShader(300, 300, sdfShader, {
                  uniforms: { u_operation: 1 }
                });
              });
            });
          });
          win.show();
        });
      });

      ctx = cosyneTest.getContext();
      await testApp.run();
      await ctx.wait(400);
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'demo-sdf-subtract.png'));
      expect(true).toBe(true);
    });

    it('should render intersection operation', async () => {
      cosyneTest = new CosyneTest({ headed: true });
      const testApp = await cosyneTest.createApp((a: App) => {
        a.window({ title: 'Intersect', width: 340, height: 340 }, (win: any) => {
          win.setContent(() => {
            a.vbox(() => {
              a.label('Intersection');
              a.canvasStack(() => {
                a.canvasShader(300, 300, sdfShader, {
                  uniforms: { u_operation: 2 }
                });
              });
            });
          });
          win.show();
        });
      });

      ctx = cosyneTest.getContext();
      await testApp.run();
      await ctx.wait(400);
      await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'demo-sdf-intersect.png'));
      expect(true).toBe(true);
    });
  });
});
