/**
 * Interactive 3D Torus Demo - GPU Version
 *
 * Renders a raymarched SDF torus entirely on the GPU via a fragment shader.
 * The CPU version does parametric mesh generation, 3D rotation, perspective
 * projection, Lambertian shading, depth sorting, and scanline rasterization.
 * This version replaces ALL of that with a single fragment shader.
 *
 * @tsyne-app:name Torus GPU
 * @tsyne-app:category fun
 * @tsyne-app:builder createTorusGPUApp
 * @tsyne-app:args app
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, CanvasShader, Label } from 'tsyne';

// Torus SDF raymarching shader
const torusShader = `
#version 110
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_theta;
uniform float u_phi;
uniform float u_psi;
uniform float u_autoRotate;
varying vec2 v_texCoord;

// Rotation matrices
mat3 rotateY(float a) {
  float s = sin(a), c = cos(a);
  return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
}

mat3 rotateX(float a) {
  float s = sin(a), c = cos(a);
  return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
}

mat3 rotateZ(float a) {
  float s = sin(a), c = cos(a);
  return mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0);
}

// Torus SDF: R = major radius, r = minor radius (in unit space)
float sdTorus(vec3 p, float R, float r) {
  vec2 q = vec2(length(p.xz) - R, p.y);
  return length(q) - r;
}

// Hash for stippled background and surface texture
float hash12(vec2 p) {
  float h = sin(p.x * 12.9898 + p.y * 78.233) * 43758.5453;
  return fract(h);
}

void main() {
  vec2 uv = v_texCoord;
  vec2 fragPos = uv * u_resolution;
  float aspect = u_resolution.x / u_resolution.y;

  // Stippled blue-black background (blocky noise like the CPU version)
  float pixSize = 8.0;
  vec2 cellCoord = floor(fragPos / pixSize);
  float h = hash12(cellCoord);
  float blueIntensity = h * h;
  vec3 bgColor = vec3(0.0, blueIntensity * 0.04, 0.08 + blueIntensity * 0.16);

  // Compute rotation angles
  float theta = u_theta;
  float phi = u_phi;
  float psi = u_psi;
  if (u_autoRotate > 0.5) {
    theta += u_time * 0.55;
    phi += u_time * 0.95;
    psi += u_time * 0.15;
  }

  // Build rotation matrix: yaw (Z) * pitch (X) * roll (Y)
  mat3 rot = rotateZ(theta) * rotateX(phi) * rotateY(psi);

  // Camera setup - ray from camera through pixel
  float fov = 1.0;
  vec2 screenPos = (uv - 0.5) * 2.0;
  screenPos.x *= aspect;
  vec3 rayDir = normalize(vec3(screenPos * fov, -2.5));
  vec3 rayOrigin = vec3(0.0, 0.0, 5.0);

  // Apply inverse rotation to ray (rotate the scene)
  mat3 invRot = mat3(
    rot[0][0], rot[1][0], rot[2][0],
    rot[0][1], rot[1][1], rot[2][1],
    rot[0][2], rot[1][2], rot[2][2]
  );
  rayDir = invRot * rayDir;
  rayOrigin = invRot * rayOrigin;

  // Torus parameters in normalized space
  float R = 1.0;   // Major radius
  float r = 0.375; // Minor radius (60/160 = 0.375 ratio)

  // Raymarch
  float t = 0.0;
  float minDist = 1000.0;
  bool hit = false;
  for (int i = 0; i < 80; i++) {
    vec3 p = rayOrigin + rayDir * t;
    float d = sdTorus(p, R, r);
    minDist = min(minDist, d);
    if (d < 0.001) {
      hit = true;
      break;
    }
    if (t > 10.0) break;
    t += d;
  }

  if (!hit) {
    gl_FragColor = vec4(bgColor, 1.0);
    return;
  }

  // Hit point
  vec3 p = rayOrigin + rayDir * t;

  // Normal via central differences
  float e = 0.001;
  vec3 n = normalize(vec3(
    sdTorus(p + vec3(e, 0.0, 0.0), R, r) - sdTorus(p - vec3(e, 0.0, 0.0), R, r),
    sdTorus(p + vec3(0.0, e, 0.0), R, r) - sdTorus(p - vec3(0.0, e, 0.0), R, r),
    sdTorus(p + vec3(0.0, 0.0, e), R, r) - sdTorus(p - vec3(0.0, 0.0, e), R, r)
  ));

  // Light direction (same as CPU: 0.2, 0.3, 0.93 in camera space)
  // Rotate light with the scene to match CPU behavior
  vec3 lightDir = normalize(vec3(0.2, 0.3, 0.93));

  // Lambertian shading: 25% ambient + 75% diffuse (same as CPU)
  float diff = max(dot(n, lightDir), 0.0);
  float shade = 0.25 + 0.75 * diff;

  // UV-based surface stippling (per-surface-point texture variation)
  // Compute torus UV coordinates from the hit point
  float torusAngleU = atan(p.z, p.x); // angle around major circle
  float torusAngleV = atan(p.y, length(p.xz) - R); // angle around minor circle
  // Discretize to match CPU's per-quad stippling
  vec2 torusUV = vec2(torusAngleU * 12.73, torusAngleV * 7.64);
  float uvNoise = hash12(floor(torusUV));
  float textureVariation = 0.7 + uvNoise * 0.3;

  // Red color matching CPU: red = (80 + shade * 175) * textureVariation
  float red = (80.0 + shade * 175.0) * textureVariation / 255.0;

  gl_FragColor = vec4(red, 0.0, 0.0, 1.0);
}
`;

class TorusGPUUI {
  private a: App;
  private shader: CanvasShader | null = null;
  private statusLabel: Label | null = null;

  // Rotation state
  private theta = 0.5;
  private phi = 0.3;
  private psi = 0.0;
  private autoRotate = true;

  constructor(a: App) {
    this.a = a;
  }

  build(): void {
    this.a.window({ title: 'Interactive 3D Torus (GPU)', width: 850, height: 680 }, (win) => {
      win.setContent(() => {
        this.a.border({
          center: () => {
            this.shader = this.a.canvasShader(800, 600, torusShader, {
              uniforms: {
                u_theta: this.theta,
                u_phi: this.phi,
                u_psi: this.psi,
                u_autoRotate: 1.0,
              },
              onDrag: (e) => {
                const sensitivity = 0.01;
                this.theta += e.dragged.dx * sensitivity;
                this.phi += e.dragged.dy * sensitivity;
                this.shader!.setUniforms({
                  u_theta: this.theta,
                  u_phi: this.phi,
                });
              },
              onMouseDown: () => {
                this.toggleAutoRotate();
              },
            });
          },
          bottom: () => {
            this.a.hbox(() => {
              this.a.button('Toggle Auto-Rotate', {
                onClick: () => this.toggleAutoRotate(),
              });
              this.a.button('Reset View', {
                onClick: () => this.resetView(),
              });
              this.a.spacer();
              this.statusLabel = this.a.label('Auto-rotating | Drag to rotate | Click to toggle');
            });
          },
        });
      });

      win.show();

      // Enable auto-animation for smooth 60fps GPU-side rendering
      setTimeout(() => {
        if (this.shader) {
          this.shader.setAutoAnimate(true);
        }
      }, 100);
    });
  }

  private async toggleAutoRotate(): Promise<void> {
    this.autoRotate = !this.autoRotate;
    if (this.shader) {
      await this.shader.setUniform('u_autoRotate', this.autoRotate ? 1.0 : 0.0);
    }
    if (this.statusLabel) {
      await this.statusLabel.setText(
        this.autoRotate ? 'Auto-rotating | Drag to rotate | Click to toggle' : 'Paused | Drag to rotate | Click to toggle'
      );
    }
  }

  private async resetView(): Promise<void> {
    this.theta = 0.5;
    this.phi = 0.3;
    this.psi = 0.0;
    if (this.shader) {
      await this.shader.setUniforms({
        u_theta: this.theta,
        u_phi: this.phi,
        u_psi: this.psi,
      });
    }
  }
}

export function createTorusGPUApp(a: App): void {
  new TorusGPUUI(a).build();
}

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Torus GPU' }, createTorusGPUApp);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
