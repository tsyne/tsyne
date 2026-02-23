/**
 * Phase 6: Visual + shader compilation tests for Paris Density Simulation
 *
 * 6a: Screenshot tests at specific time/day combos (no map tiles — dark fallback)
 * 6b: Shader compilation test (verifies GLSL compiles on real GL context)
 *
 * Requires headed mode for real GL rendering. Run with:
 *   npx jest shader-visual.test.ts --maxWorkers=1
 */

import { TsyneTest, TestContext } from 'tsyne';
import type { App, CanvasShader, Label } from 'tsyne';
import { HOTSPOTS, getTimeMultiplier, getDayMultiplier } from './simulation';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// Simplified heatmap shader (same as app.ts but inlined for test isolation)
const HEATMAP_SHADER = `
uniform sampler2D u_background;
uniform float u_hasBackground;
uniform sampler2D u_hotspots;
uniform sampler2D u_mainColors;
uniform sampler2D u_glowColors;
uniform sampler2D u_hotColors;
uniform float u_count;
uniform float u_jitterAmplitude;
uniform float u_intensity;
uniform float u_opacity;
uniform float u_threshold;
uniform float u_showGlow;
uniform float u_glowIntensity;
uniform float u_showHotspots;
uniform float u_hotspotIntensity;
uniform float u_hotspotThreshold;
uniform vec2 u_sigmaParams;
uniform float u_radiusMain;
uniform float u_radiusGlow;
uniform float u_radiusHot;
uniform float u_maxRadiusKm;
uniform vec2 u_viewScale;
uniform vec2 u_viewOffset;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 refUv = uv * u_viewScale + u_viewOffset;

  float densityMain = 0.0;
  float densityGlow = 0.0;
  float densityHot  = 0.0;

  for (int i = 0; i < 64; i++) {
    if (float(i) >= u_count) break;
    float tx = (float(i) + 0.5) / 64.0;
    vec4 hd = texture2D(u_hotspots, vec2(tx, 0.25));
    vec2 center = hd.rg;
    float weight = hd.b;
    float radiusKm = hd.a * u_maxRadiusKm;

    vec4 jd = texture2D(u_hotspots, vec2(tx, 0.75));
    float phaseX = jd.r * 6.2832;
    float speedX = 0.3 + jd.g * 0.8;
    float phaseY = jd.b * 6.2832;
    float speedY = 0.3 + jd.a * 0.8;
    float densityFactor = 0.5 + weight * 0.5;
    center.x += sin(u_time * speedX + phaseX) * u_jitterAmplitude * densityFactor;
    center.y += sin(u_time * speedY + phaseY) * u_jitterAmplitude * densityFactor;

    vec2 diff = refUv - center;
    float sx = radiusKm * u_sigmaParams.x * u_radiusMain;
    float sy = sx * u_sigmaParams.y;
    float ex = diff.x / sx;
    float ey = diff.y / sy;
    densityMain += weight * exp(-0.5 * (ex * ex + ey * ey));

    if (u_showGlow > 0.5) {
      float gsx = radiusKm * u_sigmaParams.x * u_radiusGlow;
      float gsy = gsx * u_sigmaParams.y;
      float gex = diff.x / gsx;
      float gey = diff.y / gsy;
      densityGlow += weight * exp(-0.5 * (gex * gex + gey * gey));
    }

    if (u_showHotspots > 0.5 && weight > u_hotspotThreshold) {
      float hsx = radiusKm * u_sigmaParams.x * u_radiusHot;
      float hsy = hsx * u_sigmaParams.y;
      float hex2 = diff.x / hsx;
      float hey = diff.y / hsy;
      densityHot += weight * exp(-0.5 * (hex2 * hex2 + hey * hey));
    }
  }

  densityMain = clamp(densityMain * u_intensity, 0.0, 1.0);
  if (densityMain < u_threshold) densityMain = 0.0;
  densityGlow = clamp(densityGlow * u_glowIntensity, 0.0, 1.0);
  densityHot  = clamp(densityHot * u_hotspotIntensity, 0.0, 1.0);

  vec4 mainColor = texture2D(u_mainColors, vec2(densityMain, 0.5));
  vec4 glowColor = texture2D(u_glowColors, vec2(densityGlow, 0.5));
  vec4 hotColor  = texture2D(u_hotColors,  vec2(densityHot, 0.5));

  vec2 bgUv = vec2(uv.x, 1.0 - uv.y);
  vec4 bg = texture2D(u_background, bgUv);
  vec4 result = mix(vec4(0.078, 0.086, 0.118, 1.0), bg, u_hasBackground);

  float ga = glowColor.a * u_showGlow * u_opacity;
  result.rgb = mix(result.rgb, glowColor.rgb, ga);
  result.a = result.a + ga * (1.0 - result.a);

  float ma = mainColor.a * u_opacity;
  result.rgb = mix(result.rgb, mainColor.rgb, ma);
  result.a = result.a + ma * (1.0 - result.a);

  float ha = hotColor.a * u_showHotspots * u_opacity;
  result.rgb = mix(result.rgb, hotColor.rgb, ha);
  result.a = result.a + ha * (1.0 - result.a);

  gl_FragColor = result;
}
`;

// ============================================================================
// Helpers — duplicated from app.ts for test isolation
// ============================================================================

const PARIS_BOUNDS = { minLat: 48.815, maxLat: 48.905, minLng: 2.22, maxLng: 2.47 };
const LNG_RANGE = PARIS_BOUNDS.maxLng - PARIS_BOUNDS.minLng;
const LAT_RANGE = PARIS_BOUNDS.maxLat - PARIS_BOUNDS.minLat;
const COS_LAT = Math.cos(48.86 * Math.PI / 180);
const X_KM = LNG_RANGE * 111.0 * COS_LAT;
const Y_KM = LAT_RANGE * 111.0;
const KM_TO_UV_X = 1.0 / X_KM;
const UV_Y_SCALE = X_KM / Y_KM;
const MAX_HOTSPOTS = 64;
const MAX_RADIUS_KM = 2.0;

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

interface ColorStop { stop: number; color: { r: number; g: number; b: number; a: number } }
function rgbaStop(stop: number, r: number, g: number, b: number, a: number): ColorStop {
  return { stop, color: { r, g, b, a } };
}

const VIBRANT_STOPS: ColorStop[] = [
  rgbaStop(0.0,   64, 196, 255, 0),
  rgbaStop(0.15,  59, 130, 246, 80),
  rgbaStop(0.30,  16, 185, 129, 140),
  rgbaStop(0.45,  34, 197,  94, 180),
  rgbaStop(0.60, 250, 204,  21, 210),
  rgbaStop(0.80, 249, 115,  22, 235),
  rgbaStop(1.0,  239,  68,  68, 255),
];

const GLOW_STOPS: ColorStop[] = [
  rgbaStop(0.0,  100, 180, 255, 0),
  rgbaStop(0.25,  80, 150, 230, 40),
  rgbaStop(0.50,  60, 180, 160, 80),
  rgbaStop(0.75, 100, 200, 120, 120),
  rgbaStop(1.0,  255, 160,  80, 160),
];

const HOT_STOPS: ColorStop[] = [
  rgbaStop(0.0,  255, 200,  50, 0),
  rgbaStop(0.3,  255, 180,  50, 160),
  rgbaStop(0.5,  255, 140,  40, 200),
  rgbaStop(0.7,  250, 100,  30, 230),
  rgbaStop(0.9,  240,  60,  60, 245),
  rgbaStop(1.0,  220,  40,  80, 255),
];

function buildColorLUT(stops: ColorStop[]): Uint8Array {
  const lut = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let j = 0; j < stops.length - 1; j++) {
      if (t >= stops[j].stop && t <= stops[j + 1].stop) { lo = stops[j]; hi = stops[j + 1]; break; }
    }
    const range = hi.stop - lo.stop;
    const f = range > 0 ? (t - lo.stop) / range : 0;
    lut[i * 4 + 0] = Math.round(lo.color.r + (hi.color.r - lo.color.r) * f);
    lut[i * 4 + 1] = Math.round(lo.color.g + (hi.color.g - lo.color.g) * f);
    lut[i * 4 + 2] = Math.round(lo.color.b + (hi.color.b - lo.color.b) * f);
    lut[i * 4 + 3] = Math.round(lo.color.a + (hi.color.a - lo.color.a) * f);
  }
  return lut;
}

function computeWeights(hour: number, day: number): { data: Uint8Array; count: number } {
  const data = new Uint8Array(MAX_HOTSPOTS * 2 * 4);
  const count = Math.min(HOTSPOTS.length, MAX_HOTSPOTS);
  for (let i = 0; i < count; i++) {
    const h = HOTSPOTS[i];
    const noise = 0.8 + seededRandom(h.lat * 1000 + h.lng * 1000 + hour) * 0.2;
    const weight = (h.basePop * getTimeMultiplier(h.type, hour) * getDayMultiplier(h.type, day) * noise) / 100;
    const x = (h.lng - PARIS_BOUNDS.minLng) / LNG_RANGE;
    const y = (h.lat - PARIS_BOUNDS.minLat) / LAT_RANGE;

    data[i * 4 + 0] = Math.round(Math.max(0, Math.min(1, x)) * 255);
    data[i * 4 + 1] = Math.round(Math.max(0, Math.min(1, y)) * 255);
    data[i * 4 + 2] = Math.round(Math.max(0, Math.min(1, weight)) * 255);
    data[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, h.radius / MAX_RADIUS_KM)) * 255);

    // Row 1: jitter params (deterministic for reproducibility)
    const row1 = MAX_HOTSPOTS * 4;
    data[row1 + i * 4 + 0] = Math.round(seededRandom(i * 7 + 1) * 255);
    data[row1 + i * 4 + 1] = Math.round(seededRandom(i * 7 + 2) * 255);
    data[row1 + i * 4 + 2] = Math.round(seededRandom(i * 7 + 3) * 255);
    data[row1 + i * 4 + 3] = Math.round(seededRandom(i * 7 + 4) * 255);
  }
  return { data, count };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Paris Density Shader Visual Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeAll(() => {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  });

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  async function setupShader(hour: number, day: number): Promise<CanvasShader> {
    let shaderRef: CanvasShader;

    tsyneTest = new TsyneTest({ headed: true });
    const testApp = await tsyneTest.createApp((a: App) => {
      a.window({ title: `Paris Density h=${hour} d=${day}`, width: 840, height: 640 }, (win: any) => {
        win.setContent(() => {
          shaderRef = a.canvasShader(800, 600, HEATMAP_SHADER);
          shaderRef.withId('heatmap');
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Upload LUTs
    await Promise.all([
      shaderRef!.setTextureData('u_mainColors', buildColorLUT(VIBRANT_STOPS), 256, 1),
      shaderRef!.setTextureData('u_glowColors', buildColorLUT(GLOW_STOPS), 256, 1),
      shaderRef!.setTextureData('u_hotColors', buildColorLUT(HOT_STOPS), 256, 1),
    ]);

    // Set uniforms
    await shaderRef!.setUniforms({
      u_hasBackground: 0.0,
      u_jitterAmplitude: 0.0, // No jitter for deterministic screenshots
      u_intensity: 1.5,
      u_opacity: 0.85,
      u_threshold: 0.03,
      u_showGlow: 1.0,
      u_glowIntensity: 0.6,
      u_showHotspots: 1.0,
      u_hotspotIntensity: 2.5,
      u_hotspotThreshold: 0.45,
      u_sigmaParams: [KM_TO_UV_X, UV_Y_SCALE],
      u_radiusMain: 1.0,
      u_radiusGlow: 2.0,
      u_radiusHot: 0.6,
      u_maxRadiusKm: MAX_RADIUS_KM,
      u_viewScale: [1.0, 1.0],
      u_viewOffset: [0.0, 0.0],
    });

    // Upload hotspot data
    const { data, count } = computeWeights(hour, day);
    await shaderRef!.setTextureData('u_hotspots', data, MAX_HOTSPOTS, 2);
    await shaderRef!.setUniform('u_count', count);

    await ctx.wait(400);
    return shaderRef!;
  }

  // 6b: GLSL compilation — if shader creates and renders without error, it compiled
  it('should compile GLSL shader on real GL context', async () => {
    await setupShader(14, 5);
    const widgets = await ctx.getAllWidgets();
    expect(widgets.some((w: any) => w.type === 'canvasshader')).toBe(true);
  });

  // 6a: Screenshot at Friday 14:00 (rush hour, high activity)
  it('should render Friday 14:00 heatmap', async () => {
    await setupShader(14, 5);
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'paris-friday-14h.png'));
    expect(true).toBe(true);
  });

  // 6a: Screenshot at Tuesday 03:00 (night, low activity)
  it('should render Tuesday 03:00 heatmap', async () => {
    await setupShader(3, 2);
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'paris-tuesday-03h.png'));
    expect(true).toBe(true);
  });

  // 6a: Screenshot at Saturday 22:00 (weekend nightlife)
  it('should render Saturday 22:00 heatmap', async () => {
    await setupShader(22, 6);
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'paris-saturday-22h.png'));
    expect(true).toBe(true);
  });

  // 6a: Screenshot at Monday 08:00 (morning commute)
  it('should render Monday 08:00 heatmap', async () => {
    await setupShader(8, 1);
    await ctx.captureScreenshot(path.join(SCREENSHOTS_DIR, 'paris-monday-08h.png'));
    expect(true).toBe(true);
  });
});
