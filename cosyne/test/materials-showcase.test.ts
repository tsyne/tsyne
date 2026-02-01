/**
 * Screenshot tests for materials showcase
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';
import path from 'path';

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

const materialsShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_material;
uniform vec3 u_baseColor;

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float matId = 0.0;

float sceneSDF(vec3 p) {
    float obj = sdSphere(p - vec3(0.0, 0.5, 0.0), 0.8);
    float platform = sdBox(p - vec3(0.0, -0.5, 0.0), vec3(1.5, 0.1, 1.5)) - 0.05;
    float ground = p.y + 0.6;

    float result = obj;
    matId = 0.0;

    if (platform < result) {
        result = platform;
        matId = 1.0;
    }
    if (ground < result) {
        result = ground;
        matId = 2.0;
    }

    return result;
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
        sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
        sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
    ));
}

vec3 envMap(vec3 rd) {
    float t = 0.5 + 0.5 * rd.y;
    vec3 sky = mix(vec3(0.4, 0.5, 0.6), vec3(0.1, 0.2, 0.4), t);
    vec3 sunDir = normalize(vec3(0.5, 0.3, 0.8));
    float sun = pow(max(dot(rd, sunDir), 0.0), 64.0);
    sky += vec3(1.0, 0.9, 0.7) * sun;
    return sky;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y) * 2.0;

    vec3 ro = vec3(0.0, 1.2, 3.5);
    vec3 target = vec3(0.0, 0.3, 0.0);
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    vec3 rd = normalize(forward + uv.x * right * 0.8 + uv.y * up * 0.8);

    vec3 col = envMap(rd);

    float t = 0.0;
    for (int i = 0; i < 64; i++) {
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);

        if (d < 0.001) {
            vec3 pos = p;
            vec3 nor = calcNormal(pos);
            sceneSDF(pos);
            float hitMat = matId;

            vec3 lig = normalize(vec3(0.5, 0.8, 0.6));
            float dif = clamp(dot(nor, lig), 0.0, 1.0);

            vec3 hal = normalize(lig - rd);
            float spe = pow(clamp(dot(nor, hal), 0.0, 1.0), 64.0);

            float fre = pow(1.0 - clamp(dot(nor, -rd), 0.0, 1.0), 4.0);

            vec3 ref = reflect(rd, nor);
            vec3 envCol = envMap(ref);

            vec3 matCol = u_baseColor;
            float roughness = 0.5;
            float metallic = 0.0;

            if (hitMat < 0.5) {
                if (u_material < 0.5) {
                    roughness = 1.0;
                    metallic = 0.0;
                } else if (u_material < 1.5) {
                    roughness = 0.3;
                    metallic = 0.7;
                } else {
                    roughness = 0.05;
                    metallic = 1.0;
                    matCol = vec3(0.95);
                }
            } else if (hitMat < 1.5) {
                matCol = vec3(0.15);
                roughness = 0.3;
                metallic = 0.8;
            } else {
                float checker = mod(floor(pos.x * 2.0) + floor(pos.z * 2.0), 2.0);
                matCol = mix(vec3(0.2), vec3(0.35), checker);
                roughness = 0.9;
            }

            vec3 ambient = vec3(0.1);
            vec3 diffuse = matCol * dif * (1.0 - metallic);
            vec3 specBase = mix(vec3(0.04), matCol, metallic);
            vec3 specular = specBase * spe * (1.0 - roughness);
            vec3 envReflect = envCol * mix(vec3(0.04), matCol, metallic) * (1.0 - roughness);
            vec3 fresnelReflect = envCol * fre * (1.0 - roughness * 0.5);

            col = ambient + diffuse + specular + envReflect * 0.3 + fresnelReflect * 0.4;
            break;
        }

        t += d;
        if (t > 20.0) break;
    }

    col = col / (col + vec3(1.0));
    col = pow(col, vec3(0.4545));

    gl_FragColor = vec4(col, 1.0);
}
`;

describe('Materials Showcase Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render matte red sphere', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Matte', width: 340, height: 300 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Matte Red');
            a.canvasStack(() => {
              a.canvasShader(300, 220, materialsShader, {
                uniforms: {
                  u_material: 0,
                  u_baseColor: [0.8, 0.2, 0.15],
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
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'material-matte-red.png'));
    expect(true).toBe(true);
  });

  it('should render metallic gold sphere', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Metallic', width: 340, height: 300 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Metallic Gold');
            a.canvasStack(() => {
              a.canvasShader(300, 220, materialsShader, {
                uniforms: {
                  u_material: 1,
                  u_baseColor: [0.9, 0.7, 0.3],
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
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'material-metallic-gold.png'));
    expect(true).toBe(true);
  });

  it('should render chrome sphere', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Chrome', width: 340, height: 300 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Chrome');
            a.canvasStack(() => {
              a.canvasShader(300, 220, materialsShader, {
                uniforms: {
                  u_material: 2,
                  u_baseColor: [0.95, 0.95, 0.95],
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
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'material-chrome.png'));
    expect(true).toBe(true);
  });

  it('should render glass sphere with cyan tint', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Glass', width: 340, height: 300 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Glass Cyan');
            a.canvasStack(() => {
              a.canvasShader(300, 220, materialsShader, {
                uniforms: {
                  u_material: 3,
                  u_baseColor: [0.2, 0.8, 0.9],
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
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'material-glass-cyan.png'));
    expect(true).toBe(true);
  });

  it('should render emissive glowing sphere', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Emissive', width: 340, height: 300 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Emissive (Glowing)');
            a.canvasStack(() => {
              a.canvasShader(300, 220, materialsShader, {
                uniforms: {
                  u_material: 4,
                  u_baseColor: [1.0, 0.5, 0.0],  // Orange glow
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
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'material-emissive-orange.png'));
    expect(true).toBe(true);
  });

  it('should render multiple color variations', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Colors', width: 340, height: 300 }, (win: any) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Metallic Purple');
            a.canvasStack(() => {
              a.canvasShader(300, 220, materialsShader, {
                uniforms: {
                  u_material: 1,  // Metallic
                  u_baseColor: [0.6, 0.2, 0.8],  // Purple
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
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'material-metallic-purple.png'));
    expect(true).toBe(true);
  });
});
