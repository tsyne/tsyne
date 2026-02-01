/**
 * Fractal Explorer - GPU-Accelerated Version
 *
 * Uses CanvasShader for GPU-accelerated fractal rendering.
 * Based on https://script-schmiede.de/labs/fractals/r3/
 *
 * This version renders fractals 100-1000x faster than the CPU version
 * by running the iteration loops on the GPU via GLSL fragment shaders.
 *
 * @tsyne-app:name Fractals GPU
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
 * @tsyne-app:category graphics
 * @tsyne-app:builder createFractalsGPUApp
 * @tsyne-app:args app
 */

import { app, resolveTransport } from 'tsyne';
import type { App, CanvasShader, Label, Select } from 'tsyne';

const CANVAS_SIZE = 400;
const MAX_ITERATIONS = 256;

// ============================================================================
// GLSL Shader Library
// ============================================================================

/** Common shader header with uniforms */
const shaderHeader = `
#version 110
// Desktop OpenGL - no precision qualifiers (GLSL 1.10)
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_center;
uniform float u_zoom;
uniform float u_maxIter;
uniform float u_palette;
uniform vec2 u_juliaC;
uniform vec2 u_phoenixPQ;

// Complex number operations
vec2 cmul(vec2 a, vec2 b) {
  return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}

vec2 csquare(vec2 z) {
  return vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y);
}

vec2 ccube(vec2 z) {
  float x = z.x, y = z.y;
  return vec2(x*x*x - 3.0*x*y*y, 3.0*x*x*y - y*y*y);
}

vec2 cdiv(vec2 a, vec2 b) {
  float d = b.x*b.x + b.y*b.y;
  return vec2((a.x*b.x + a.y*b.y)/d, (a.y*b.x - a.x*b.y)/d);
}

float cabs(vec2 z) {
  return length(z);
}

// Color palettes
vec3 palette0(float t) { // Fire
  return vec3(
    min(1.0, t * 3.0),
    max(0.0, min(1.0, t * 3.0 - 1.0)),
    max(0.0, t * 3.0 - 2.0)
  );
}

vec3 palette1(float t) { // Ocean
  return vec3(
    max(0.0, t * 2.0 - 1.0),
    t,
    min(1.0, 0.5 + t * 0.5)
  );
}

vec3 palette2(float t) { // Rainbow
  return vec3(
    0.5 + 0.5 * cos(6.28318 * (t + 0.0)),
    0.5 + 0.5 * cos(6.28318 * (t + 0.33)),
    0.5 + 0.5 * cos(6.28318 * (t + 0.67))
  );
}

vec3 palette3(float t) { // Grayscale
  return vec3(t);
}

vec3 palette4(float t) { // Electric
  return vec3(
    0.5 + 0.5 * sin(t * 6.28318 * 2.0),
    0.5 + 0.5 * sin(t * 6.28318 * 3.0 + 2.0),
    0.5 + 0.5 * sin(t * 6.28318 * 5.0 + 4.0)
  );
}

vec3 palette5(float t) { // Sunset
  return vec3(
    min(1.0, t * 2.0),
    t * t,
    t * t * t
  );
}

vec3 palette6(float t) { // Ice
  return vec3(
    0.7 + 0.3 * t,
    0.8 + 0.2 * t,
    1.0
  );
}

vec3 palette7(float t) { // Neon
  float h = t * 6.0;
  float c = 1.0;
  float x = c * (1.0 - abs(mod(h, 2.0) - 1.0));
  vec3 rgb;
  if (h < 1.0) rgb = vec3(c, x, 0.0);
  else if (h < 2.0) rgb = vec3(x, c, 0.0);
  else if (h < 3.0) rgb = vec3(0.0, c, x);
  else if (h < 4.0) rgb = vec3(0.0, x, c);
  else if (h < 5.0) rgb = vec3(x, 0.0, c);
  else rgb = vec3(c, 0.0, x);
  return rgb;
}

vec3 getPaletteColor(float t, float palette) {
  if (palette < 0.5) return palette0(t);
  if (palette < 1.5) return palette1(t);
  if (palette < 2.5) return palette2(t);
  if (palette < 3.5) return palette3(t);
  if (palette < 4.5) return palette4(t);
  if (palette < 5.5) return palette5(t);
  if (palette < 6.5) return palette6(t);
  return palette7(t);
}
`;

/** Mandelbrot shader */
const mandelbrotShader = shaderHeader + `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 c = (uv - 0.5) * 3.0 / u_zoom + u_center;

  vec2 z = vec2(0.0);
  float iter = 0.0;

  for (int i = 0; i < 256; i++) {
    if (float(i) >= u_maxIter) break;
    z = csquare(z) + c;
    if (cabs(z) > 2.0) break;
    iter += 1.0;
  }

  if (iter >= u_maxIter - 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float t = iter / u_maxIter;
    vec3 col = getPaletteColor(t, u_palette);
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

/** Julia set shader */
const juliaShader = shaderHeader + `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 z = (uv - 0.5) * 3.0 / u_zoom + u_center;
  vec2 c = u_juliaC;

  float iter = 0.0;

  for (int i = 0; i < 256; i++) {
    if (float(i) >= u_maxIter) break;
    z = csquare(z) + c;
    if (cabs(z) > 2.0) break;
    iter += 1.0;
  }

  if (iter >= u_maxIter - 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float t = iter / u_maxIter;
    vec3 col = getPaletteColor(t, u_palette);
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

/** Tricorn shader */
const tricornShader = shaderHeader + `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 c = (uv - 0.5) * 3.0 / u_zoom + u_center;

  vec2 z = vec2(0.0);
  float iter = 0.0;

  for (int i = 0; i < 256; i++) {
    if (float(i) >= u_maxIter) break;
    // Tricorn uses conjugate: z = conj(z)^2 + c
    vec2 zbar = vec2(z.x, -z.y);
    z = csquare(zbar) + c;
    if (cabs(z) > 2.0) break;
    iter += 1.0;
  }

  if (iter >= u_maxIter - 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float t = iter / u_maxIter;
    vec3 col = getPaletteColor(t, u_palette);
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

/** Burning Ship shader */
const burningShipShader = shaderHeader + `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 c = (uv - 0.5) * 3.0 / u_zoom + u_center;

  vec2 z = vec2(0.0);
  float iter = 0.0;

  for (int i = 0; i < 256; i++) {
    if (float(i) >= u_maxIter) break;
    // Burning Ship uses absolute values: z = (|Re(z)| + i|Im(z)|)^2 + c
    z = vec2(abs(z.x), abs(z.y));
    z = csquare(z) + c;
    if (cabs(z) > 2.0) break;
    iter += 1.0;
  }

  if (iter >= u_maxIter - 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float t = iter / u_maxIter;
    vec3 col = getPaletteColor(t, u_palette);
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

/** Newton fractal shader (z^3 - 1 = 0) */
const newtonShader = shaderHeader + `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 z = (uv - 0.5) * 3.0 / u_zoom + u_center;

  // Roots of z^3 - 1 = 0
  vec2 r1 = vec2(1.0, 0.0);
  vec2 r2 = vec2(-0.5, 0.866025);
  vec2 r3 = vec2(-0.5, -0.866025);

  float iter = 0.0;
  int root = 0;

  for (int i = 0; i < 256; i++) {
    if (float(i) >= u_maxIter) break;

    // Newton iteration: z = z - f(z)/f'(z) = z - (z^3 - 1)/(3z^2)
    vec2 z2 = csquare(z);
    vec2 z3 = cmul(z2, z);
    vec2 numerator = z3 - vec2(1.0, 0.0);
    vec2 denominator = 3.0 * z2;
    z = z - cdiv(numerator, denominator);

    // Check which root we're closest to
    if (cabs(z - r1) < 0.001) { root = 1; break; }
    if (cabs(z - r2) < 0.001) { root = 2; break; }
    if (cabs(z - r3) < 0.001) { root = 3; break; }

    iter += 1.0;
  }

  float t = iter / u_maxIter;
  vec3 col;
  if (root == 1) col = vec3(1.0, 0.2, 0.2) * (1.0 - t * 0.5);
  else if (root == 2) col = vec3(0.2, 1.0, 0.2) * (1.0 - t * 0.5);
  else if (root == 3) col = vec3(0.2, 0.2, 1.0) * (1.0 - t * 0.5);
  else col = vec3(0.0);

  gl_FragColor = vec4(col, 1.0);
}
`;

/** Mandelbrot^3 shader */
const mandelbrot3Shader = shaderHeader + `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 c = (uv - 0.5) * 3.0 / u_zoom + u_center;

  vec2 z = vec2(0.0);
  float iter = 0.0;

  for (int i = 0; i < 256; i++) {
    if (float(i) >= u_maxIter) break;
    z = ccube(z) + c;
    if (cabs(z) > 2.0) break;
    iter += 1.0;
  }

  if (iter >= u_maxIter - 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float t = iter / u_maxIter;
    vec3 col = getPaletteColor(t, u_palette);
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

/** Phoenix fractal shader */
const phoenixShader = shaderHeader + `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 c = (uv - 0.5) * 3.0 / u_zoom + u_center;

  float p = u_phoenixPQ.x;
  float q = u_phoenixPQ.y;

  vec2 z = c;
  vec2 zPrev = vec2(0.0);
  float iter = 0.0;

  for (int i = 0; i < 256; i++) {
    if (float(i) >= u_maxIter) break;

    vec2 zNew = csquare(z) + vec2(p, 0.0) + q * zPrev;
    zPrev = z;
    z = zNew;

    if (cabs(z) > 2.0) break;
    iter += 1.0;
  }

  if (iter >= u_maxIter - 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float t = iter / u_maxIter;
    vec3 col = getPaletteColor(t, u_palette);
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

// ============================================================================
// Fractal Types
// ============================================================================

interface FractalType {
  name: string;
  shader: string;
  defaultCenter: [number, number];
  defaultZoom: number;
  needsJuliaParams?: boolean;
  needsPhoenixParams?: boolean;
}

const fractalTypes: Record<string, FractalType> = {
  mandelbrot: {
    name: 'Mandelbrot',
    shader: mandelbrotShader,
    defaultCenter: [-0.5, 0],
    defaultZoom: 1,
  },
  julia: {
    name: 'Julia',
    shader: juliaShader,
    defaultCenter: [0, 0],
    defaultZoom: 1,
    needsJuliaParams: true,
  },
  tricorn: {
    name: 'Tricorn',
    shader: tricornShader,
    defaultCenter: [-0.3, 0],
    defaultZoom: 1,
  },
  burningShip: {
    name: 'Burning Ship',
    shader: burningShipShader,
    defaultCenter: [-0.4, -0.6],
    defaultZoom: 0.8,
  },
  newton: {
    name: 'Newton',
    shader: newtonShader,
    defaultCenter: [0, 0],
    defaultZoom: 0.5,
  },
  mandelbrot3: {
    name: 'Mandelbrot^3',
    shader: mandelbrot3Shader,
    defaultCenter: [0, 0],
    defaultZoom: 1,
  },
  phoenix: {
    name: 'Phoenix',
    shader: phoenixShader,
    defaultCenter: [0, 0],
    defaultZoom: 1,
    needsPhoenixParams: true,
  },
};

const fractalTypeNames = Object.keys(fractalTypes);
const paletteNames = ['Fire', 'Ocean', 'Rainbow', 'Grayscale', 'Electric', 'Sunset', 'Ice', 'Neon'];

// ============================================================================
// GPU Fractal UI
// ============================================================================

class FractalsGPUUI {
  private a: App;
  private shader: CanvasShader | null = null;
  private statusLabel: Label | null = null;

  // State
  private currentFractal = 'mandelbrot';
  private currentPalette = 0;
  private centerX: number;
  private centerY: number;
  private zoom: number;
  private juliaR = -0.7;
  private juliaI = 0.27015;
  private phoenixP = 0.5667;
  private phoenixQ = -0.5;

  constructor(a: App) {
    this.a = a;
    const fractal = fractalTypes[this.currentFractal];
    this.centerX = fractal.defaultCenter[0];
    this.centerY = fractal.defaultCenter[1];
    this.zoom = fractal.defaultZoom;
  }

  private async updateUniforms(): Promise<void> {
    if (!this.shader) return;

    await this.shader.setUniforms({
      u_center: [this.centerX, this.centerY],
      u_zoom: this.zoom,
      u_maxIter: MAX_ITERATIONS,
      u_palette: this.currentPalette,
      u_juliaC: [this.juliaR, this.juliaI],
      u_phoenixPQ: [this.phoenixP, this.phoenixQ],
    });

    if (this.statusLabel) {
      const fractal = fractalTypes[this.currentFractal];
      await this.statusLabel.setText(`${fractal.name} | Zoom: ${this.zoom.toFixed(1)}x | ${paletteNames[this.currentPalette]}`);
    }
  }

  async setFractal(key: string): Promise<void> {
    if (!fractalTypes[key] || !this.shader) return;

    this.currentFractal = key;
    const fractal = fractalTypes[key];
    this.centerX = fractal.defaultCenter[0];
    this.centerY = fractal.defaultCenter[1];
    this.zoom = fractal.defaultZoom;

    await this.shader.setSource(fractal.shader);
    await this.updateUniforms();
  }

  async zoomIn(): Promise<void> {
    this.zoom *= 2;
    await this.updateUniforms();
  }

  async zoomOut(): Promise<void> {
    this.zoom = Math.max(0.1, this.zoom / 2);
    await this.updateUniforms();
  }

  async pan(dx: number, dy: number): Promise<void> {
    const scale = 3 / (CANVAS_SIZE * this.zoom);
    this.centerX += dx * scale * 50;
    this.centerY += dy * scale * 50;
    await this.updateUniforms();
  }

  async reset(): Promise<void> {
    const fractal = fractalTypes[this.currentFractal];
    this.centerX = fractal.defaultCenter[0];
    this.centerY = fractal.defaultCenter[1];
    this.zoom = fractal.defaultZoom;
    await this.updateUniforms();
  }

  async nextPalette(): Promise<void> {
    this.currentPalette = (this.currentPalette + 1) % paletteNames.length;
    await this.updateUniforms();
  }

  async adjustJuliaR(delta: number): Promise<void> {
    const fractal = fractalTypes[this.currentFractal];
    if (fractal.needsJuliaParams) {
      this.juliaR += delta;
    } else if (fractal.needsPhoenixParams) {
      this.phoenixP += delta;
    }
    await this.updateUniforms();
  }

  async adjustJuliaI(delta: number): Promise<void> {
    const fractal = fractalTypes[this.currentFractal];
    if (fractal.needsJuliaParams) {
      this.juliaI += delta;
    } else if (fractal.needsPhoenixParams) {
      this.phoenixQ += delta;
    }
    await this.updateUniforms();
  }

  build(): void {
    this.a.window({ title: 'Fractal Explorer (GPU)', width: 500, height: 600 }, (win: any) => {
      win.setContent(() => {
        this.a.vbox(() => {
          // Fractal selector
          this.a.hbox(() => {
            this.a.label('Fractal: ');
            this.a.select(
              fractalTypeNames.map(k => fractalTypes[k].name),
              async (value: string) => {
                const idx = fractalTypeNames.findIndex(k => fractalTypes[k].name === value);
                if (idx >= 0) {
                  await this.setFractal(fractalTypeNames[idx]);
                }
              }
            );
          });

          // Shader canvas
          this.a.center(() => {
            const fractal = fractalTypes[this.currentFractal];
            this.shader = this.a.canvasShader(CANVAS_SIZE, CANVAS_SIZE, fractal.shader, {
              uniforms: {
                u_center: [this.centerX, this.centerY],
                u_zoom: this.zoom,
                u_maxIter: MAX_ITERATIONS,
                u_palette: this.currentPalette,
                u_juliaC: [this.juliaR, this.juliaI],
                u_phoenixPQ: [this.phoenixP, this.phoenixQ],
              }
            });
          });

          // Status
          this.statusLabel = this.a.label('GPU-accelerated fractals');

          // Zoom controls
          this.a.hbox(() => {
            this.a.button('Zoom +').onClick(() => this.zoomIn());
            this.a.button('Zoom -').onClick(() => this.zoomOut());
            this.a.button('Reset').onClick(() => this.reset());
            this.a.button('Palette').onClick(() => this.nextPalette());
          });

          // Pan controls
          this.a.hbox(() => {
            this.a.button('<').onClick(() => this.pan(-1, 0));
            this.a.button('^').onClick(() => this.pan(0, -1));
            this.a.button('v').onClick(() => this.pan(0, 1));
            this.a.button('>').onClick(() => this.pan(1, 0));
          });

          // Julia/Phoenix controls
          this.a.hbox(() => {
            this.a.button('c.r-').onClick(() => this.adjustJuliaR(-0.05));
            this.a.button('c.r+').onClick(() => this.adjustJuliaR(0.05));
            this.a.button('c.i-').onClick(() => this.adjustJuliaI(-0.05));
            this.a.button('c.i+').onClick(() => this.adjustJuliaI(0.05));
          });

          this.a.separator();
          this.a.label('GPU-accelerated: 100-1000x faster than CPU');
        });
      });

      win.show();

      // Initial status update
      setTimeout(() => this.updateUniforms(), 100);
    });
  }
}

export function createFractalsGPUApp(a: App): void {
  new FractalsGPUUI(a).build();
}

if (require.main === module) {
  app(resolveTransport(), { title: 'Fractal Explorer (GPU)' }, createFractalsGPUApp);
}
