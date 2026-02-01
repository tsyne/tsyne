/**
 * Materials Showcase Demo
 *
 * Demonstrates different material types rendered via raymarching:
 * - Matte (diffuse only)
 * - Metallic (reflective)
 * - Chrome (highly reflective)
 * - Glass (transparent, refractive)
 * - Emissive (glowing)
 *
 * Run: npx tsx cosyne/demos/materials-showcase.ts
 */

import { app, resolveTransport, CanvasShader } /**
 * Materials Showcase Demo
 *
 * Demonstrates different material types rendered via raymarching:
 * - Matte (diffuse only)
 * - Metallic (reflective)
 * - Chrome (highly reflective)
 * - Glass (transparent, refractive)
 * - Emissive (glowing)
 *
 * Run: npx tsx cosyne/demos/materials-showcase.ts
 */

import { app, resolveTransport, CanvasShader , standaloneShutdownStrategyfrom 'tsyne';
import type { App } from 'tsyne';

const WIDTH = 600;
const HEIGHT = 400;

const materialsShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_material;  // 0=matte, 1=metallic, 2=chrome, 3=glass, 4=emissive
uniform vec3 u_baseColor;

// SDF primitives
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

// Scene: sphere on a platform
float matId = 0.0;

float sceneSDF(vec3 p) {
    // Rotate object
    float a = u_time * 0.3;
    float c = cos(a);
    float s = sin(a);
    vec3 rp = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);

    // Main object (sphere or torus based on material)
    float obj;
    if (u_material > 3.5) {
        // Emissive: use torus
        obj = sdTorus(rp - vec3(0.0, 0.5, 0.0), vec2(0.6, 0.2));
    } else {
        // Others: use sphere
        obj = sdSphere(rp - vec3(0.0, 0.5, 0.0), 0.8);
    }

    // Platform
    float platform = sdBox(p - vec3(0.0, -0.5, 0.0), vec3(1.5, 0.1, 1.5)) - 0.05;

    // Ground
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

float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
    float res = 1.0;
    float t = mint;
    for (int i = 0; i < 24; i++) {
        if (t >= maxt) break;
        float h = sceneSDF(ro + rd * t);
        if (h < 0.001) return 0.0;
        res = min(res, k * h / t);
        t += h;
    }
    return res;
}

float calcAO(vec3 pos, vec3 nor) {
    float occ = 0.0;
    float sca = 1.0;
    for (int i = 0; i < 5; i++) {
        float h = 0.01 + 0.1 * float(i);
        float d = sceneSDF(pos + h * nor);
        occ += (h - d) * sca;
        sca *= 0.95;
    }
    return clamp(1.0 - 2.0 * occ, 0.0, 1.0);
}

// Environment map (gradient sky + horizon)
vec3 envMap(vec3 rd) {
    float t = 0.5 + 0.5 * rd.y;
    vec3 sky = mix(vec3(0.4, 0.5, 0.6), vec3(0.1, 0.2, 0.4), t);

    // Sun
    vec3 sunDir = normalize(vec3(0.5, 0.3, 0.8));
    float sun = pow(max(dot(rd, sunDir), 0.0), 64.0);
    sky += vec3(1.0, 0.9, 0.7) * sun;

    // Horizon glow
    float horizon = exp(-abs(rd.y) * 3.0);
    sky += vec3(0.5, 0.4, 0.3) * horizon * 0.5;

    return sky;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y) * 2.0;

    // Camera
    vec3 ro = vec3(0.0, 1.2, 3.5);
    vec3 target = vec3(0.0, 0.3, 0.0);
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    vec3 rd = normalize(forward + uv.x * right * 0.8 + uv.y * up * 0.8);

    // Sky background
    vec3 col = envMap(rd);

    // Raymarch
    float t = 0.0;
    for (int i = 0; i < 80; i++) {
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);

        if (d < 0.001) {
            vec3 pos = p;
            vec3 nor = calcNormal(pos);

            // Re-evaluate for material
            sceneSDF(pos);
            float hitMat = matId;

            // Light
            vec3 lig = normalize(vec3(0.5, 0.8, 0.6));
            float dif = clamp(dot(nor, lig), 0.0, 1.0);
            float sha = softShadow(pos + nor * 0.01, lig, 0.01, 5.0, 16.0);
            float ao = calcAO(pos, nor);

            // Specular
            vec3 hal = normalize(lig - rd);
            float spe = pow(clamp(dot(nor, hal), 0.0, 1.0), 64.0);

            // Fresnel
            float fre = pow(1.0 - clamp(dot(nor, -rd), 0.0, 1.0), 4.0);

            // Reflection
            vec3 ref = reflect(rd, nor);
            vec3 envCol = envMap(ref);

            vec3 matCol = u_baseColor;
            float roughness = 0.5;
            float metallic = 0.0;

            if (hitMat < 0.5) {
                // Main object - apply selected material
                if (u_material < 0.5) {
                    // Matte
                    roughness = 1.0;
                    metallic = 0.0;
                } else if (u_material < 1.5) {
                    // Metallic
                    roughness = 0.3;
                    metallic = 0.7;
                } else if (u_material < 2.5) {
                    // Chrome
                    roughness = 0.05;
                    metallic = 1.0;
                    matCol = vec3(0.95);  // Chrome is mostly white
                } else if (u_material < 3.5) {
                    // Glass (simplified - just highly reflective with tint)
                    roughness = 0.0;
                    metallic = 0.2;
                    matCol = vec3(0.9, 0.95, 1.0);
                    fre = pow(1.0 - clamp(dot(nor, -rd), 0.0, 1.0), 2.0);
                } else {
                    // Emissive
                    col = u_baseColor * 2.0;  // Bright glow
                    col += u_baseColor * fre * 3.0;  // Extra rim glow

                    // Add pulsing
                    col *= 0.8 + 0.2 * sin(u_time * 3.0);
                    break;
                }
            } else if (hitMat < 1.5) {
                // Platform - dark metallic
                matCol = vec3(0.15);
                roughness = 0.3;
                metallic = 0.8;
            } else {
                // Ground - checkered
                float checker = mod(floor(pos.x * 2.0) + floor(pos.z * 2.0), 2.0);
                matCol = mix(vec3(0.2), vec3(0.35), checker);
                roughness = 0.9;
                metallic = 0.0;
            }

            // Combine lighting
            vec3 ambient = vec3(0.1) * ao;
            vec3 diffuse = matCol * dif * sha * (1.0 - metallic);

            // Specular reflection
            vec3 specBase = mix(vec3(0.04), matCol, metallic);
            vec3 specular = specBase * spe * sha * (1.0 - roughness);

            // Environment reflection
            vec3 envReflect = envCol * mix(vec3(0.04), matCol, metallic) * (1.0 - roughness);

            // Fresnel blend
            vec3 fresnelReflect = envCol * fre * (1.0 - roughness * 0.5);

            col = ambient + diffuse + specular + envReflect * 0.3 + fresnelReflect * 0.4;

            break;
        }

        t += d;
        if (t > 20.0) break;
    }

    // Tone mapping
    col = col / (col + vec3(1.0));
    col = pow(col, vec3(0.4545));

    gl_FragColor = vec4(col, 1.0);
}
`;

function createMaterialsDemo(a: App): void {
  let shader: CanvasShader | null = null;
  let material = 1;  // Start with metallic

  const materials = [
    { name: 'Matte', id: 0 },
    { name: 'Metallic', id: 1 },
    { name: 'Chrome', id: 2 },
    { name: 'Glass', id: 3 },
    { name: 'Emissive', id: 4 },
  ];

  const colors: { name: string; color: [number, number, number] }[] = [
    { name: 'Red', color: [0.8, 0.2, 0.15] },
    { name: 'Blue', color: [0.15, 0.3, 0.8] },
    { name: 'Gold', color: [0.9, 0.7, 0.3] },
    { name: 'Green', color: [0.2, 0.7, 0.3] },
    { name: 'Purple', color: [0.6, 0.2, 0.8] },
    { name: 'Cyan', color: [0.2, 0.8, 0.9] },
  ];
  let colorIdx = 0;

  a.window({ title: 'Materials Showcase', width: WIDTH + 40, height: HEIGHT + 120 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Material selection
        a.hbox(() => {
          a.label('Material: ');
          for (const mat of materials) {
            a.button(mat.name).onClick(() => {
              material = mat.id;
              shader?.setUniform('u_material', material);
            });
          }
        });

        // Color selection
        a.hbox(() => {
          a.label('Color: ');
          for (const cc of colors) {
            a.button(cc.name).onClick(() => {
              colorIdx = colors.indexOf(cc);
              shader?.setUniform('u_baseColor', cc.color);
            });
          }
        });

        // Shader canvas
        a.center(() => {
          shader = a.canvasShader(WIDTH, HEIGHT, materialsShader, {
            uniforms: {
              u_material: material,
              u_baseColor: colors[colorIdx].color,
            }
          });
        });

        a.label(`${materials[material].name} material | ${colors[colorIdx].name} color`);
        a.label('Object rotates automatically via u_time');
      });
    });

    win.show();
  });
}

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Materials Showcase' }, createMaterialsDemo);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));}

export { createMaterialsDemo };
