/**
 * Raymarching Introduction Demo
 *
 * Demonstrates GPU-based 3D rendering using raymarching (sphere tracing).
 * No vertex buffers needed - pure fragment shader magic.
 *
 * This is a stepping stone toward proper 3D rendering for the cars demo.
 *
 * Run: npx tsx cosyne/demos/raymarching-intro.ts
 */

import { app, resolveTransport, CanvasShader , standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';

// Simple FPS counter for performance monitoring
class FPSCounter {
  private frames = 0;
  private lastTime = Date.now();
  private fps = 0;
  private minFps = 999;
  private maxFps = 0;

  update(): number {
    this.frames++;
    const now = Date.now();
    const elapsed = now - this.lastTime;

    if (elapsed >= 500) {
      this.fps = Math.round((this.frames * 1000) / elapsed);
      this.minFps = Math.min(this.minFps, this.fps);
      this.maxFps = Math.max(this.maxFps, this.fps);
      this.frames = 0;
      this.lastTime = now;
    }

    return this.fps;
  }

  getStats(): string {
    return `FPS: ${this.fps} (min: ${this.minFps}, max: ${this.maxFps})`;
  }
}

const WIDTH = 500;
const HEIGHT = 500;

// Raymarching shader with multiple primitives
const raymarchingShader = `
#version 110

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_scene;      // 0=sphere, 1=box, 2=torus, 3=combined
uniform vec3 u_lightDir;
uniform vec3 u_baseColor;

// Signed Distance Functions (SDFs)
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

float sdCylinder(vec3 p, float r, float h) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

// Smooth minimum for blending shapes
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// Scene distance function
float sceneSDF(vec3 p) {
    // Rotate scene over time
    float c = cos(u_time * 0.5);
    float s = sin(u_time * 0.5);
    vec3 rp = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);

    if (u_scene < 0.5) {
        // Single sphere
        return sdSphere(rp, 1.0);
    } else if (u_scene < 1.5) {
        // Rounded box
        return sdBox(rp, vec3(0.8)) - 0.1;
    } else if (u_scene < 2.5) {
        // Torus
        return sdTorus(rp, vec2(0.8, 0.3));
    } else {
        // Combined scene: sphere + box with smooth blend
        float sphere = sdSphere(rp - vec3(0.5, 0.0, 0.0), 0.6);
        float box = sdBox(rp + vec3(0.5, 0.0, 0.0), vec3(0.5)) - 0.05;
        float torus = sdTorus(rp - vec3(0.0, -0.8, 0.0), vec2(1.2, 0.15));
        return smin(smin(sphere, box, 0.3), torus, 0.2);
    }
}

// Calculate normal via gradient
vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
        sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
        sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
    ));
}

// Soft shadow
float softShadow(vec3 ro, vec3 rd, float mint, float maxt) {
    float k = 12.0;  // Balanced softness
    float res = 1.0;
    float t = mint;
    for (int i = 0; i < 32; i++) {
        if (t >= maxt) break;
        float h = sceneSDF(ro + rd * t);
        if (h < 0.001) return 0.0;
        res = min(res, k * h / t);
        t += h;
    }
    return res;
}

// Ambient occlusion
float calcAO(vec3 pos, vec3 nor) {
    float occ = 0.0;
    float sca = 1.0;
    for (int i = 0; i < 8; i++) {  // Increased from 5 to 8 samples
        float h = 0.02 + 0.08 * float(i);  // Standardized step size
        float d = sceneSDF(pos + h * nor);
        occ += (h - d) * sca;
        sca *= 0.95;
    }
    return clamp(1.0 - 2.5 * occ, 0.0, 1.0);  // Standardized multiplier
}

void main() {
    vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y) * 2.0;

    // Camera setup
    vec3 ro = vec3(0.0, 0.0, 3.5);  // Ray origin (camera position)
    vec3 rd = normalize(vec3(uv, -1.5));  // Ray direction

    // Raymarching
    float t = 0.0;
    float maxDist = 20.0;
    vec3 col = vec3(0.1, 0.1, 0.15);  // Background

    for (int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);

        if (d < 0.001) {
            // Hit! Calculate lighting
            vec3 pos = p;
            vec3 nor = calcNormal(pos);

            // Light direction (normalized)
            vec3 lig = normalize(u_lightDir);

            // Diffuse
            float dif = clamp(dot(nor, lig), 0.0, 1.0);

            // Specular (Blinn-Phong)
            vec3 hal = normalize(lig - rd);
            float spe = pow(clamp(dot(nor, hal), 0.0, 1.0), 32.0);

            // Shadow
            float sha = softShadow(pos + nor * 0.01, lig, 0.01, 5.0);

            // Ambient occlusion
            float ao = calcAO(pos, nor);

            // Fresnel rim lighting
            float fre = pow(1.0 - clamp(dot(nor, -rd), 0.0, 1.0), 3.0);

            // Combine lighting
            vec3 ambient = vec3(0.1, 0.12, 0.15) * ao;
            vec3 diffuse = u_baseColor * dif * sha;
            vec3 specular = vec3(1.0) * spe * sha * 0.5;
            vec3 rim = vec3(0.3, 0.4, 0.5) * fre * 0.5;

            col = ambient + diffuse + specular + rim;

            // Gamma correction
            col = pow(col, vec3(0.4545));
            break;
        }

        t += d;
        if (t > maxDist) break;
    }

    gl_FragColor = vec4(col, 1.0);
}
`;

function createRaymarchingDemo(a: App): void {
  let shader: CanvasShader | null = null;
  let scene = 3;  // Start with combined scene

  const sceneNames = ['Sphere', 'Box', 'Torus', 'Combined'];
  const colors: [number, number, number][] = [
    [0.8, 0.3, 0.2],  // Red
    [0.2, 0.6, 0.8],  // Blue
    [0.3, 0.8, 0.3],  // Green
    [0.8, 0.6, 0.2],  // Orange
  ];
  let colorIdx = 3;

  // FPS Counter
  const fpsCounter = new FPSCounter();

  // Light direction controls
  let lightAngle = 30;      // Horizontal angle in degrees
  let lightElevation = 45;  // Vertical angle in degrees
  let statusLabel: any = null;
  let fpsLabel: any = null;

  const computeLightDir = (): [number, number, number] => {
    const angleRad = (lightAngle * Math.PI) / 180;
    const elevRad = (lightElevation * Math.PI) / 180;
    const cosElev = Math.cos(elevRad);
    return [
      cosElev * Math.cos(angleRad),
      Math.sin(elevRad),
      cosElev * Math.sin(angleRad),
    ];
  };

  a.window({ title: 'Raymarching 3D Demo', width: WIDTH + 40, height: HEIGHT + 220 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Scene controls
        a.hbox(() => {
          a.button('Sphere', { onClick: () => {
            scene = 0;
            shader?.setUniform('u_scene', scene);
          } });
          a.button('Box', { onClick: () => {
            scene = 1;
            shader?.setUniform('u_scene', scene);
          } });
          a.button('Torus', { onClick: () => {
            scene = 2;
            shader?.setUniform('u_scene', scene);
          } });
          a.button('Combined', { onClick: () => {
            scene = 3;
            shader?.setUniform('u_scene', scene);
          } });
        });

        // Color controls
        a.hbox(() => {
          a.button('Red', { onClick: () => {
            colorIdx = 0;
            shader?.setUniform('u_baseColor', colors[colorIdx]);
          } });
          a.button('Blue', { onClick: () => {
            colorIdx = 1;
            shader?.setUniform('u_baseColor', colors[colorIdx]);
          } });
          a.button('Green', { onClick: () => {
            colorIdx = 2;
            shader?.setUniform('u_baseColor', colors[colorIdx]);
          } });
          a.button('Orange', { onClick: () => {
            colorIdx = 3;
            shader?.setUniform('u_baseColor', colors[colorIdx]);
          } });
        });

        // Light direction controls
        a.vbox(() => {
          a.label('💡 Light Controls');

          a.hbox(() => {
            a.label('Horizontal:');
            a.slider(0, 360, lightAngle, (val) => {
              lightAngle = val;
              shader?.setUniform('u_lightDir', computeLightDir());
            });
            a.label(`${Math.round(lightAngle)}°`);
          });

          a.hbox(() => {
            a.label('Elevation:');
            a.slider(-90, 90, lightElevation, (val) => {
              lightElevation = val;
              shader?.setUniform('u_lightDir', computeLightDir());
            });
            a.label(`${Math.round(lightElevation)}°`);
          });
        });

        // Shader canvas
        a.canvasStack(() => {
          shader = a.canvasShader(WIDTH, HEIGHT, raymarchingShader, {
            uniforms: {
              u_scene: scene,
              u_lightDir: computeLightDir(),
              u_baseColor: colors[colorIdx],
            }
          });
        });

        // Status label
        statusLabel = a.label(`Scene: ${sceneNames[scene]} | Light: ${Math.round(lightAngle)}° horizontal, ${Math.round(lightElevation)}° elevation`);
        a.label('Shapes rotate automatically via u_time');

        // FPS counter
        fpsLabel = a.label('⏱️ FPS: 0');
      });
    });

    // Update FPS counter periodically
    let updateInterval: any = null;
    const updateFPS = () => {
      fpsCounter.update();
      if (fpsLabel) {
        fpsLabel.setText(`⏱️ ${fpsCounter.getStats()}`);
      }
      updateInterval = setTimeout(updateFPS, 500);
    };
    updateInterval = setTimeout(updateFPS, 500);

    win.show();
  });
}

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Raymarching Demo' }, createRaymarchingDemo);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));}

export { createRaymarchingDemo };
