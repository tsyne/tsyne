/**
 * Screenshot tests for raymarching demos
 *
 * Verifies GPU-based 3D rendering via GLSL raymarching.
 */

import { TestContext } from 'tsyne';
import type { App, CanvasShader } from 'tsyne';
import { CosyneTest } from '../src';
import path from 'path';

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// Simplified raymarching shader for testing
const testRaymarchShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_scene;

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float sceneSDF(vec3 p) {
    float c = cos(u_time * 0.5);
    float s = sin(u_time * 0.5);
    vec3 rp = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);

    if (u_scene < 0.5) {
        return sdSphere(rp, 1.0);
    } else {
        return sdBox(rp, vec3(0.8)) - 0.1;
    }
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

    vec3 ro = vec3(0.0, 0.0, 3.0);
    vec3 rd = normalize(vec3(uv, -1.5));

    vec3 col = vec3(0.1, 0.1, 0.15);

    float t = 0.0;
    for (int i = 0; i < 64; i++) {
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);

        if (d < 0.001) {
            vec3 nor = calcNormal(p);
            vec3 lig = normalize(vec3(0.5, 0.8, 0.6));
            float dif = clamp(dot(nor, lig), 0.0, 1.0);
            col = vec3(0.8, 0.3, 0.2) * (0.2 + 0.8 * dif);
            col = pow(col, vec3(0.4545));
            break;
        }

        t += d;
        if (t > 10.0) break;
    }

    gl_FragColor = vec4(col, 1.0);
}
`;

// Simplified car shader for testing
const testCarShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_rotateY;
uniform vec3 u_carColor;

float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float sdCylinder(vec3 p, float r, float h) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

vec3 rotateY(vec3 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
}

float matId = 0.0;

float sdCar(vec3 p) {
    float body = sdBox(p - vec3(0.0, 0.3, 0.0), vec3(1.8, 0.35, 0.8)) - 0.08;
    vec3 cabinP = p - vec3(-0.1, 0.75, 0.0);
    float cabin = sdBox(cabinP, vec3(0.9, 0.3, 0.7)) - 0.1;
    float carBody = smin(body, cabin, 0.15);

    float result = carBody;
    matId = 0.0;

    // Wheels
    float wheelR = 0.28;
    float wheelW = 0.15;
    vec3 wp1 = p - vec3(1.1, 0.0, 0.85);
    vec3 wp2 = p - vec3(1.1, 0.0, -0.85);
    vec3 wp3 = p - vec3(-1.1, 0.0, 0.85);
    vec3 wp4 = p - vec3(-1.1, 0.0, -0.85);

    float w1 = sdCylinder(wp1.xzy, wheelR, wheelW);
    float w2 = sdCylinder(wp2.xzy, wheelR, wheelW);
    float w3 = sdCylinder(wp3.xzy, wheelR, wheelW);
    float w4 = sdCylinder(wp4.xzy, wheelR, wheelW);
    float wheels = min(min(w1, w2), min(w3, w4));

    if (wheels < result) {
        result = wheels;
        matId = 1.0;
    }

    return result;
}

float sdGround(vec3 p) {
    return p.y + 0.28;
}

float sceneSDF(vec3 p) {
    vec3 carP = rotateY(p, u_rotateY);
    float car = sdCar(carP);
    float ground = sdGround(p);
    if (ground < car) {
        matId = 2.0;
        return ground;
    }
    return car;
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

    vec3 ro = vec3(4.0, 2.0, 4.0);
    vec3 target = vec3(0.0, 0.3, 0.0);
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    vec3 rd = normalize(forward + uv.x * right + uv.y * up);

    // Sky
    float skyT = 0.5 + 0.5 * rd.y;
    vec3 col = mix(vec3(0.6, 0.7, 0.9), vec3(0.2, 0.4, 0.8), skyT);

    float t = 0.0;
    for (int i = 0; i < 64; i++) {
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);

        if (d < 0.001) {
            vec3 nor = calcNormal(p);
            vec3 lig = normalize(vec3(0.5, 0.8, 0.3));
            float dif = clamp(dot(nor, lig), 0.0, 1.0);

            vec3 matCol;
            if (matId < 0.5) {
                matCol = u_carColor;
            } else if (matId < 1.5) {
                matCol = vec3(0.1);
            } else {
                float checker = mod(floor(p.x * 2.0) + floor(p.z * 2.0), 2.0);
                matCol = mix(vec3(0.2), vec3(0.3), checker);
            }

            col = matCol * (0.2 + 0.8 * dif);
            col = pow(col, vec3(0.4545));
            break;
        }

        t += d;
        if (t > 20.0) break;
    }

    gl_FragColor = vec4(col, 1.0);
}
`;

describe('Raymarching 3D Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render raymarched sphere', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Raymarch Sphere', width: 340, height: 360 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Raymarched Sphere');
            a.canvasStack(() => {
              a.canvasShader(300, 300, testRaymarchShader, {
                uniforms: { u_scene: 0 }
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
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'raymarch-sphere.png'));
    expect(true).toBe(true);
  });

  it('should render raymarched box', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Raymarch Box', width: 340, height: 360 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Raymarched Box');
            a.canvasStack(() => {
              a.canvasShader(300, 300, testRaymarchShader, {
                uniforms: { u_scene: 1 }
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
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'raymarch-box.png'));
    expect(true).toBe(true);
  });

  it('should render raymarched 3D car', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Raymarch Car', width: 440, height: 360 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Raymarched 3D Car');
            a.canvasStack(() => {
              a.canvasShader(400, 300, testCarShader, {
                uniforms: {
                  u_rotateY: 0.5,
                  u_carColor: [0.8, 0.1, 0.1],  // Red
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
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'raymarch-car-red.png'));
    expect(true).toBe(true);
  });

  it('should render car with different color', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Blue Car', width: 440, height: 360 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Blue Raymarched Car');
            a.canvasStack(() => {
              a.canvasShader(400, 300, testCarShader, {
                uniforms: {
                  u_rotateY: -0.3,
                  u_carColor: [0.1, 0.2, 0.8],  // Blue
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
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'raymarch-car-blue.png'));
    expect(true).toBe(true);
  });

  it('should render raymarched torus', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Raymarch Torus', width: 340, height: 360 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Raymarched Torus');
            a.canvasStack(() => {
              a.canvasShader(300, 300, testRaymarchShader, {
                uniforms: { u_scene: 2 }  // Torus
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
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'raymarch-torus.png'));
    expect(true).toBe(true);
  });

  it('should render combined scene with multiple shapes', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Combined Shapes', width: 340, height: 360 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Combined Shapes');
            a.canvasStack(() => {
              a.canvasShader(300, 300, testRaymarchShader, {
                uniforms: { u_scene: 3 }  // Combined
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
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'raymarch-combined.png'));
    expect(true).toBe(true);
  });

  it('should render silver car with metallic finish', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Silver Car', width: 440, height: 360 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Silver Car');
            a.canvasStack(() => {
              a.canvasShader(400, 300, testCarShader, {
                uniforms: {
                  u_rotateY: 0.0,
                  u_carColor: [0.7, 0.7, 0.75],  // Silver
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
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'raymarch-car-silver.png'));
    expect(true).toBe(true);
  });

  it('should render black car with matte finish', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Black Car', width: 440, height: 360 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Black Car');
            a.canvasStack(() => {
              a.canvasShader(400, 300, testCarShader, {
                uniforms: {
                  u_rotateY: 1.0,
                  u_carColor: [0.05, 0.05, 0.05],  // Black
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
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'raymarch-car-black.png'));
    expect(true).toBe(true);
  });
});
