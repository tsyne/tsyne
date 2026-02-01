/**
 * Lighting Modes Demo
 *
 * Demonstrates different lighting setups via raymarching:
 * - Frontal: Light from camera direction
 * - Side: Light from the side
 * - Back: Rim lighting (light from behind)
 * - Multi: Multiple light sources
 *
 * Run: npx tsx cosyne/demos/lighting-modes.ts
 */

import { app, resolveTransport, CanvasShader } /**
 * Lighting Modes Demo
 *
 * Demonstrates different lighting setups via raymarching:
 * - Frontal: Light from camera direction
 * - Side: Light from the side
 * - Back: Rim lighting (light from behind)
 * - Multi: Multiple light sources
 *
 * Run: npx tsx cosyne/demos/lighting-modes.ts
 */

import { app, resolveTransport, CanvasShader , standaloneShutdownStrategyfrom 'tsyne';
import type { App } from 'tsyne';

const WIDTH = 500;
const HEIGHT = 500;

const lightingShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_lightMode;  // 0=frontal, 1=side, 2=back, 3=multi
uniform vec3 u_primColor;

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float matId = 0.0;

float sceneSDF(vec3 p) {
    // Rotating sphere
    float a = u_time * 0.3;
    float c = cos(a);
    float s = sin(a);
    vec3 rp = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);

    float sphere = sdSphere(rp, 0.8);
    float ground = p.y + 0.8;

    if (ground < sphere) {
        matId = 1.0;
        return ground;
    }
    matId = 0.0;
    return sphere;
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

vec3 envMap(vec3 rd) {
    float t = 0.5 + 0.5 * rd.y;
    return mix(vec3(0.5, 0.6, 0.7), vec3(0.1, 0.2, 0.4), t);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y) * 2.0;

    vec3 ro = vec3(0.0, 0.5, 3.0);
    vec3 target = vec3(0.0, 0.0, 0.0);
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    vec3 rd = normalize(forward + uv.x * right + uv.y * up);

    vec3 col = envMap(rd);

    float t = 0.0;
    for (int i = 0; i < 80; i++) {
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);

        if (d < 0.001) {
            vec3 pos = p;
            vec3 nor = calcNormal(pos);
            sceneSDF(pos);
            float hitMat = matId;

            // Different light directions based on mode
            vec3 lig;
            if (u_lightMode < 0.5) {
                // Frontal
                lig = normalize(vec3(0.0, 0.3, 1.0));
            } else if (u_lightMode < 1.5) {
                // Side
                lig = normalize(vec3(1.0, 0.5, 0.3));
            } else if (u_lightMode < 2.5) {
                // Back (rim lighting)
                lig = normalize(vec3(-0.5, 0.8, -1.0));
            } else {
                // Multi-light average
                vec3 lig1 = normalize(vec3(0.5, 0.8, 0.5));
                vec3 lig2 = normalize(vec3(-0.7, 0.4, 0.3));
                lig = normalize(lig1 + lig2 * 0.5);
            }

            float dif = clamp(dot(nor, lig), 0.0, 1.0);
            float sha = softShadow(pos + nor * 0.01, lig, 0.01, 5.0, 16.0);

            // Back light (rim) - always on for visual interest
            vec3 backLight = normalize(vec3(-lig.x, lig.y, -lig.z));
            float rim = pow(clamp(dot(nor, backLight), 0.0, 1.0), 3.0);

            vec3 matCol;
            if (hitMat < 0.5) {
                matCol = u_primColor;
            } else {
                float checker = mod(floor(pos.x * 3.0) + floor(pos.z * 3.0), 2.0);
                matCol = mix(vec3(0.2), vec3(0.35), checker);
            }

            // Combine lighting
            vec3 ambient = vec3(0.15);
            vec3 diffuse = matCol * dif * sha;
            vec3 rimCol = vec3(0.4, 0.5, 0.6) * rim * 0.3;

            col = ambient + diffuse + rimCol;

            // Gamma
            col = pow(col, vec3(0.4545));
            break;
        }

        t += d;
        if (t > 10.0) break;
    }

    gl_FragColor = vec4(col, 1.0);
}
`;

function createLightingDemo(a: App): void {
  let shader: CanvasShader | null = null;
  let lightMode = 0;

  const modes = ['Frontal', 'Side', 'Back', 'Multi'];
  const colors: { name: string; color: [number, number, number] }[] = [
    { name: 'Red', color: [0.8, 0.2, 0.15] },
    { name: 'Blue', color: [0.15, 0.3, 0.8] },
    { name: 'Yellow', color: [0.9, 0.7, 0.2] },
  ];
  let colorIdx = 0;

  a.window({ title: 'Lighting Modes', width: WIDTH + 40, height: HEIGHT + 100 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Light mode buttons
        a.hbox(() => {
          a.label('Light: ');
          for (const mode of modes) {
            a.button(mode).onClick(() => {
              lightMode = modes.indexOf(mode);
              shader?.setUniform('u_lightMode', lightMode);
            });
          }
        });

        // Color buttons
        a.hbox(() => {
          a.label('Color: ');
          for (const cc of colors) {
            a.button(cc.name).onClick(() => {
              colorIdx = colors.indexOf(cc);
              shader?.setUniform('u_primColor', cc.color);
            });
          }
        });

        // Canvas
        a.canvasStack(() => {
          shader = a.canvasShader(WIDTH, HEIGHT, lightingShader, {
            uniforms: {
              u_lightMode: lightMode,
              u_primColor: colors[colorIdx].color,
            }
          });
        });

        a.label(`Mode: ${modes[lightMode]} | Color: ${colors[colorIdx].name}`);
      });
    });

    win.show();
  });
}

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Lighting Modes' }, createLightingDemo);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));}

export { createLightingDemo };
