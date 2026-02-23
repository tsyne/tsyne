// @tsyne-app:name Paris Density
// @tsyne-app:category visualization
// @tsyne-app:builder buildParisDensity
// Portions copyright Yvann Barbot and portions copyright Paul Hammant 2025

import type { App, Window, Label, CanvasShader } from 'tsyne';
import {
  standaloneShutdownStrategy,
  resolveTransport,
  TileMapRenderer,
  TILE_SOURCES,
  createRenderTarget,
  clearRenderTarget,
} from 'tsyne';
import type { MapViewport } from 'tsyne';
import { HOTSPOTS, TimeOfWeek, getTimeMultiplier, getDayMultiplier } from './simulation';
import * as os from 'os';
import * as path from 'path';

// ============================================================================
// Paris Map Configuration
// ============================================================================

const PARIS_BOUNDS = {
  minLat: 48.815,
  maxLat: 48.905,
  minLng: 2.22,
  maxLng: 2.47
};

// Geographic dimensions of the viewport in km
const LNG_RANGE = PARIS_BOUNDS.maxLng - PARIS_BOUNDS.minLng; // 0.25°
const LAT_RANGE = PARIS_BOUNDS.maxLat - PARIS_BOUNDS.minLat; // 0.09°
const COS_LAT = Math.cos(48.86 * Math.PI / 180); // ≈ 0.658
const X_KM = LNG_RANGE * 111.0 * COS_LAT; // ≈ 18.3 km
const Y_KM = LAT_RANGE * 111.0;            // ≈ 10.0 km
const KM_TO_UV_X = 1.0 / X_KM;
const UV_Y_SCALE = X_KM / Y_KM; // ≈ 1.83, multiply sigma_x to get sigma_y

// Max hotspot texture slots (must match shader loop limit)
const MAX_HOTSPOTS = 64;

// Max radius in km across all hotspots (for byte encoding headroom)
const MAX_RADIUS_KM = 2.0;

// ============================================================================
// Viewport Geometry Helpers
// ============================================================================

/** Compute geographic bounds of the visible viewport using Mercator math */
function getViewportGeoBounds(vp: MapViewport) {
  const z = Math.round(vp.zoom);
  const worldSize = 256 * Math.pow(2, z);

  const centerXpx = ((vp.center.lng + 180) / 360) * worldSize;
  const latRad = vp.center.lat * Math.PI / 180;
  const centerYpx = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * worldSize;

  const leftPx = centerXpx - vp.width / 2;
  const rightPx = centerXpx + vp.width / 2;
  const topPx = centerYpx - vp.height / 2;
  const bottomPx = centerYpx + vp.height / 2;

  const minLng = (leftPx / worldSize) * 360 - 180;
  const maxLng = (rightPx / worldSize) * 360 - 180;
  const maxLat = Math.atan(Math.sinh(Math.PI * (1 - 2 * topPx / worldSize))) * 180 / Math.PI;
  const minLat = Math.atan(Math.sinh(Math.PI * (1 - 2 * bottomPx / worldSize))) * 180 / Math.PI;

  return { minLat, maxLat, minLng, maxLng };
}

/** Compute u_viewScale/u_viewOffset uniforms that map viewport UV to PARIS_BOUNDS reference UV */
function computeViewTransform(vp: MapViewport) {
  const bounds = getViewportGeoBounds(vp);
  const viewLngRange = bounds.maxLng - bounds.minLng;
  const viewLatRange = bounds.maxLat - bounds.minLat;

  return {
    viewScale: [viewLngRange / LNG_RANGE, viewLatRange / LAT_RANGE] as [number, number],
    viewOffset: [
      (bounds.minLng - PARIS_BOUNDS.minLng) / LNG_RANGE,
      (bounds.minLat - PARIS_BOUNDS.minLat) / LAT_RANGE,
    ] as [number, number],
  };
}

/** Convert pixel drag delta to geographic offset (Mercator) */
function pixelDeltaToGeo(dx: number, dy: number, zoom: number, centerLat: number) {
  const worldSize = 256 * Math.pow(2, Math.round(zoom));
  // Dragging right → center moves west (negative lng)
  const dLng = -dx * 360 / worldSize;
  // Dragging down → center moves south (negative lat) via Mercator derivative
  const cosLat = Math.cos(centerLat * Math.PI / 180);
  const dLat = -dy * 360 * cosLat / worldSize;
  return { dLng, dLat };
}

// ============================================================================
// GLSL Fragment Shader — GPU Heatmap
// ============================================================================

const HEATMAP_SHADER = `
// Map tile background texture
uniform sampler2D u_background;
uniform float u_hasBackground;

// Per-hotspot data (64×2 texture):
//   Row 0 (y=0.25): R=x_uv, G=y_uv, B=weight, A=radius_km_encoded
//   Row 1 (y=0.75): R=phaseX, G=speedX, B=phaseY, A=speedY  (all 0-1 encoded)
uniform sampler2D u_hotspots;
// Color lookup tables: 256×1 RGBA gradients
uniform sampler2D u_mainColors;
uniform sampler2D u_glowColors;
uniform sampler2D u_hotColors;

// Number of active hotspots (use float, GLSL 110 has no uniform int)
uniform float u_count;

// GPU-side jitter amplitude (UV space, ~0.004)
uniform float u_jitterAmplitude;

// Layer controls
uniform float u_intensity;
uniform float u_opacity;
uniform float u_threshold;

uniform float u_showGlow;
uniform float u_glowIntensity;

uniform float u_showHotspots;
uniform float u_hotspotIntensity;
uniform float u_hotspotThreshold;

// Sigma base for main layer: vec2(radiusKm_to_sigmaX, uvYScale)
// sigmaX = radiusKm * u_sigmaParams.x, sigmaY = sigmaX * u_sigmaParams.y
uniform vec2 u_sigmaParams;

// Radius multipliers per layer (relative to hotspot's own radius)
uniform float u_radiusMain;
uniform float u_radiusGlow;
uniform float u_radiusHot;

// Max radius in km (for decoding texture A channel)
uniform float u_maxRadiusKm;

// Viewport transform: maps viewport UV [0,1] to reference (PARIS_BOUNDS) UV
uniform vec2 u_viewScale;
uniform vec2 u_viewOffset;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  // Convert viewport UV to reference UV for hotspot distance computation
  vec2 refUv = uv * u_viewScale + u_viewOffset;

  float densityMain = 0.0;
  float densityGlow = 0.0;
  float densityHot  = 0.0;

  for (int i = 0; i < 64; i++) {
    if (float(i) >= u_count) break;

    // Sample hotspot data at texel center
    float tx = (float(i) + 0.5) / 64.0;
    vec4 hd = texture2D(u_hotspots, vec2(tx, 0.25));

    vec2 center = hd.rg;
    float weight = hd.b;
    float radiusKm = hd.a * u_maxRadiusKm;

    // GPU-side jitter from row 1
    vec4 jd = texture2D(u_hotspots, vec2(tx, 0.75));
    float phaseX = jd.r * 6.2832; // 0-1 → 0-2π
    float speedX = 0.3 + jd.g * 0.8; // 0.3-1.1
    float phaseY = jd.b * 6.2832;
    float speedY = 0.3 + jd.a * 0.8;
    float densityFactor = 0.5 + weight * 0.5;
    center.x += sin(u_time * speedX + phaseX) * u_jitterAmplitude * densityFactor;
    center.y += sin(u_time * speedY + phaseY) * u_jitterAmplitude * densityFactor;

    vec2 diff = refUv - center;

    // Main layer
    float sx = radiusKm * u_sigmaParams.x * u_radiusMain;
    float sy = sx * u_sigmaParams.y;
    float ex = diff.x / sx;
    float ey = diff.y / sy;
    float g = exp(-0.5 * (ex * ex + ey * ey));
    densityMain += weight * g;

    // Glow layer (wider radius)
    if (u_showGlow > 0.5) {
      float gsx = radiusKm * u_sigmaParams.x * u_radiusGlow;
      float gsy = gsx * u_sigmaParams.y;
      float gex = diff.x / gsx;
      float gey = diff.y / gsy;
      densityGlow += weight * exp(-0.5 * (gex * gex + gey * gey));
    }

    // Hotspot layer (tighter, only high-weight)
    if (u_showHotspots > 0.5 && weight > u_hotspotThreshold) {
      float hsx = radiusKm * u_sigmaParams.x * u_radiusHot;
      float hsy = hsx * u_sigmaParams.y;
      float hex2 = diff.x / hsx;
      float hey = diff.y / hsy;
      densityHot += weight * exp(-0.5 * (hex2 * hex2 + hey * hey));
    }
  }

  // Apply intensity and threshold
  densityMain *= u_intensity;
  if (densityMain < u_threshold) densityMain = 0.0;
  densityMain = clamp(densityMain, 0.0, 1.0);

  densityGlow = clamp(densityGlow * u_glowIntensity, 0.0, 1.0);
  densityHot  = clamp(densityHot * u_hotspotIntensity, 0.0, 1.0);

  // Look up colors from LUT textures
  vec4 mainColor = texture2D(u_mainColors, vec2(densityMain, 0.5));
  vec4 glowColor = texture2D(u_glowColors, vec2(densityGlow, 0.5));
  vec4 hotColor  = texture2D(u_hotColors,  vec2(densityHot, 0.5));

  // Composite: background → glow → main → hotspot
  // Start with map tiles or transparent black
  vec2 bgUv = vec2(uv.x, 1.0 - uv.y); // Flip Y: pixel buffer is top-down, GL is bottom-up
  vec4 bg = texture2D(u_background, bgUv);
  vec4 result = mix(vec4(0.078, 0.086, 0.118, 1.0), bg, u_hasBackground);

  // Blend glow (alpha scaled by opacity)
  float ga = glowColor.a * u_showGlow * u_opacity;
  result.rgb = mix(result.rgb, glowColor.rgb, ga);
  result.a = result.a + ga * (1.0 - result.a);

  // Blend main (alpha scaled by opacity)
  float ma = mainColor.a * u_opacity;
  result.rgb = mix(result.rgb, mainColor.rgb, ma);
  result.a = result.a + ma * (1.0 - result.a);

  // Blend hotspot (alpha scaled by opacity)
  float ha = hotColor.a * u_showHotspots * u_opacity;
  result.rgb = mix(result.rgb, hotColor.rgb, ha);
  result.a = result.a + ha * (1.0 - result.a);

  gl_FragColor = result;
}
`;

// ============================================================================
// Color Presets
// ============================================================================

type ColorPreset = 'vibrant' | 'heat' | 'cool' | 'plasma' | 'fire';

interface RGBA { r: number; g: number; b: number; a: number; }
interface ColorStop { stop: number; color: RGBA; }

function rgbaStop(stop: number, r: number, g: number, b: number, a: number): ColorStop {
  return { stop, color: { r, g, b, a } };
}

// Main layer color presets (alpha 0-255)
const COLOR_PRESETS: Record<ColorPreset, ColorStop[]> = {
  vibrant: [
    rgbaStop(0.0,   64, 196, 255, 0),
    rgbaStop(0.15,  59, 130, 246, 80),
    rgbaStop(0.30,  16, 185, 129, 140),
    rgbaStop(0.45,  34, 197,  94, 180),
    rgbaStop(0.60, 250, 204,  21, 210),
    rgbaStop(0.80, 249, 115,  22, 235),
    rgbaStop(1.0,  239,  68,  68, 255),
  ],
  heat: [
    rgbaStop(0.0,    0,   0,   0, 0),
    rgbaStop(0.15,  30,   0, 100, 60),
    rgbaStop(0.30, 120,   0, 180, 120),
    rgbaStop(0.45, 200,  50,  50, 180),
    rgbaStop(0.60, 255, 100,   0, 210),
    rgbaStop(0.80, 255, 200,   0, 235),
    rgbaStop(1.0,  255, 255, 200, 255),
  ],
  cool: [
    rgbaStop(0.0,    0,  50, 100, 0),
    rgbaStop(0.15,   0, 100, 150, 80),
    rgbaStop(0.30,   0, 150, 200, 140),
    rgbaStop(0.45,  50, 200, 200, 180),
    rgbaStop(0.60, 100, 220, 180, 210),
    rgbaStop(0.80, 150, 240, 160, 235),
    rgbaStop(1.0,  200, 255, 200, 255),
  ],
  plasma: [
    rgbaStop(0.0,   13,   8, 135, 0),
    rgbaStop(0.15,  75,   3, 161, 80),
    rgbaStop(0.30, 138,  10, 165, 140),
    rgbaStop(0.45, 188,  55,  84, 180),
    rgbaStop(0.60, 227,  99,  25, 210),
    rgbaStop(0.80, 248, 149,  64, 235),
    rgbaStop(1.0,  252, 206,  37, 255),
  ],
  fire: [
    rgbaStop(0.0,    0,   0,   0, 0),
    rgbaStop(0.15,  40,   0,   0, 60),
    rgbaStop(0.30, 100,  10,   0, 120),
    rgbaStop(0.45, 180,  30,   0, 180),
    rgbaStop(0.60, 230,  80,   0, 210),
    rgbaStop(0.80, 255, 150,  20, 235),
    rgbaStop(1.0,  255, 220, 100, 255),
  ],
};

// Glow layer presets (softer, lower alpha)
const GLOW_PRESETS: Record<ColorPreset, ColorStop[]> = {
  vibrant: [
    rgbaStop(0.0,  100, 180, 255, 0),
    rgbaStop(0.25,  80, 150, 230, 40),
    rgbaStop(0.50,  60, 180, 160, 80),
    rgbaStop(0.75, 100, 200, 120, 120),
    rgbaStop(1.0,  255, 160,  80, 160),
  ],
  heat: [
    rgbaStop(0.0,   50,   0,  50, 0),
    rgbaStop(0.25,  80,   0, 100, 40),
    rgbaStop(0.50, 120,  20, 100, 80),
    rgbaStop(0.75, 160,  50,  50, 120),
    rgbaStop(1.0,  230, 120,  30, 160),
  ],
  cool: [
    rgbaStop(0.0,    0,  80, 120, 0),
    rgbaStop(0.25,   0, 100, 140, 40),
    rgbaStop(0.50,  20, 130, 160, 80),
    rgbaStop(0.75,  40, 160, 180, 120),
    rgbaStop(1.0,  120, 210, 170, 160),
  ],
  plasma: [
    rgbaStop(0.0,   30,  20, 100, 0),
    rgbaStop(0.25,  60,  20, 130, 40),
    rgbaStop(0.50, 100,  30, 140, 80),
    rgbaStop(0.75, 150,  50, 100, 120),
    rgbaStop(1.0,  220, 120,  60, 160),
  ],
  fire: [
    rgbaStop(0.0,   20,   0,   0, 0),
    rgbaStop(0.25,  50,  10,   0, 40),
    rgbaStop(0.50,  80,  20,   0, 80),
    rgbaStop(0.75, 130,  40,   0, 120),
    rgbaStop(1.0,  220, 110,  30, 160),
  ],
};

// Hotspot highlight colors (warm accent, same for all presets)
const HOTSPOT_COLORS: ColorStop[] = [
  rgbaStop(0.0,  255, 200,  50, 0),
  rgbaStop(0.3,  255, 180,  50, 160),
  rgbaStop(0.5,  255, 140,  40, 200),
  rgbaStop(0.7,  250, 100,  30, 230),
  rgbaStop(0.9,  240,  60,  60, 245),
  rgbaStop(1.0,  220,  40,  80, 255),
];

// ============================================================================
// LUT Builder — convert color stops to 256×1 RGBA texture
// ============================================================================

function buildColorLUT(stops: ColorStop[]): Uint8Array {
  const lut = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    // Find surrounding stops
    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let j = 0; j < stops.length - 1; j++) {
      if (t >= stops[j].stop && t <= stops[j + 1].stop) {
        lo = stops[j];
        hi = stops[j + 1];
        break;
      }
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

// ============================================================================
// Hotspot Texture Packer
// ============================================================================

interface HotspotWeight {
  x: number;   // UV 0-1
  y: number;   // UV 0-1
  weight: number; // 0-1
  radiusKm: number;
}

function packHotspotTexture(spots: HotspotWeight[], jitters?: HotspotJitter[]): Uint8Array {
  // 64×2 texture: row 0 = position/weight/radius, row 1 = jitter params
  const data = new Uint8Array(MAX_HOTSPOTS * 2 * 4);
  const count = Math.min(spots.length, MAX_HOTSPOTS);
  const row1Offset = MAX_HOTSPOTS * 4; // byte offset to row 1
  for (let i = 0; i < count; i++) {
    const s = spots[i];
    // Row 0: position, weight, radius
    data[i * 4 + 0] = Math.round(Math.max(0, Math.min(1, s.x)) * 255);
    data[i * 4 + 1] = Math.round(Math.max(0, Math.min(1, s.y)) * 255);
    data[i * 4 + 2] = Math.round(Math.max(0, Math.min(1, s.weight)) * 255);
    data[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, s.radiusKm / MAX_RADIUS_KM)) * 255);
    // Row 1: jitter params (phaseX, speedX, phaseY, speedY) encoded 0-1
    if (jitters && jitters[i]) {
      const j = jitters[i];
      data[row1Offset + i * 4 + 0] = Math.round((j.phaseX / (Math.PI * 2)) * 255);
      data[row1Offset + i * 4 + 1] = Math.round(((j.speedX - 0.3) / 0.8) * 255);
      data[row1Offset + i * 4 + 2] = Math.round((j.phaseY / (Math.PI * 2)) * 255);
      data[row1Offset + i * 4 + 3] = Math.round(((j.speedY - 0.3) / 0.8) * 255);
    }
  }
  return data;
}

// ============================================================================
// Organic Movement (per-hotspot jitter)
// ============================================================================

interface HotspotJitter {
  phaseX: number;
  phaseY: number;
  speedX: number;
  speedY: number;
  amplitude: number; // in UV space
}

function initializeJitter(count: number): HotspotJitter[] {
  const jitters: HotspotJitter[] = [];
  for (let i = 0; i < count; i++) {
    jitters.push({
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      speedX: 0.3 + Math.random() * 0.8,
      speedY: 0.3 + Math.random() * 0.8,
      amplitude: 0.002 + Math.random() * 0.004,
    });
  }
  return jitters;
}

// ============================================================================
// Seed-based noise (matches simulation.ts pattern)
// ============================================================================

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ============================================================================
// Visualization Settings
// ============================================================================

interface VisualizationSettings {
  opacity: number;
  intensity: number;
  radiusPixels: number;
  threshold: number;

  showGlow: boolean;
  glowIntensity: number;
  glowRadius: number;

  showHotspots: boolean;
  hotspotIntensity: number;
  hotspotRadius: number;
  hotspotThreshold: number;

  colorPreset: ColorPreset;
}

// Higher defaults to match OG Deck.gl visual quality
const DEFAULT_SETTINGS: VisualizationSettings = {
  opacity: 0.85,
  intensity: 1.5,
  radiusPixels: 50,
  threshold: 0.03,

  showGlow: true,
  glowIntensity: 0.6,
  glowRadius: 100,

  showHotspots: true,
  hotspotIntensity: 2.5,
  hotspotRadius: 30,
  hotspotThreshold: 0.45,

  colorPreset: 'vibrant',
};

// ============================================================================
// Main Application
// ============================================================================

export function buildParisDensity(a: App) {
  let time: TimeOfWeek = { hour: 14, day: 5 }; // Friday 14:00 (like OG default)
  let shader: CanvasShader | null = null;
  let timeLabel: Label | undefined;
  let statusLabel: Label | undefined;
  let statsLabel: Label | undefined;

  // Animation state
  let animationRunning = false;
  let animationSpeed = 2.0; // hours per minute
  let progress = 0; // 0-1 through current hour
  let lastFrameTime = 0;

  // Visualization settings
  let settings: VisualizationSettings = { ...DEFAULT_SETTINGS };

  // Canvas dimensions (responsive — updated on window resize)
  let canvasWidth = 800;
  let canvasHeight = 600;

  // Per-hotspot jitter for organic movement
  const jitters = initializeJitter(HOTSPOTS.length);

  // Map tile renderer for background
  const tileCachePath = path.join(os.homedir(), '.tsyne', 'realtime-paris-density-simulation', 'map-cache');
  const tileRenderer = new TileMapRenderer(TILE_SOURCES.osmRaster(), {
    fsCachePath: tileCachePath,
  });
  const mapViewport: MapViewport = {
    center: { lng: 2.3522, lat: 48.8566 },
    zoom: 12,
    width: canvasWidth,
    height: canvasHeight,
  };
  let backgroundLoaded = false;

  // Zoom/pan state
  const MIN_ZOOM = 10;
  const MAX_ZOOM = 16;
  let tileReloadTimer: ReturnType<typeof setTimeout> | null = null;

  /** Update view transform uniforms (instant — just 2 uniform updates) */
  function updateViewTransform() {
    if (!shader) return;
    const { viewScale, viewOffset } = computeViewTransform(mapViewport);
    shader.setUniforms({
      u_viewScale: viewScale,
      u_viewOffset: viewOffset,
    });
  }

  /** Debounced tile background reload (async HTTP fetch) */
  function scheduleTileReload() {
    if (tileReloadTimer) clearTimeout(tileReloadTimer);
    tileReloadTimer = setTimeout(() => {
      tileReloadTimer = null;
      loadTileBackground().catch(err => console.error('Tile reload failed:', err));
    }, 250);
  }

  /** Update status bar: zoom level + center coords + source */
  function updateStatusLabel() {
    if (!statusLabel) return;
    const z = Math.round(mapViewport.zoom);
    const lat = mapViewport.center.lat.toFixed(4);
    const lng = mapViewport.center.lng.toFixed(4);
    statusLabel.setText(`Z${z} | ${lat}N, ${lng}E | OSM`);
  }

  /** Convert pixel position to geographic coordinates */
  function pixelToGeo(px: number, py: number): { lat: number, lng: number } {
    // Pixel → viewport UV (flip Y for GL coords)
    const uvX = px / canvasWidth;
    const uvY = py / canvasHeight;

    // Viewport UV → reference UV via view transform
    const { viewScale, viewOffset } = computeViewTransform(mapViewport);
    const refUvX = uvX * viewScale[0] + viewOffset[0];
    const refUvY = uvY * viewScale[1] + viewOffset[1];

    // Reference UV → lat/lng
    const lng = PARIS_BOUNDS.minLng + refUvX * LNG_RANGE;
    const lat = PARIS_BOUNDS.minLat + refUvY * LAT_RANGE;
    return { lat, lng };
  }

  /** Find nearest hotspot to given lat/lng within maxDistKm */
  function findNearestHotspot(lat: number, lng: number, maxDistKm = 0.8): { name: string, type: string, index: number } | null {
    let bestDist = Infinity;
    let bestIdx = -1;
    for (let i = 0; i < HOTSPOTS.length; i++) {
      const h = HOTSPOTS[i];
      const dLat = (h.lat - lat) * 111.0;
      const dLng = (h.lng - lng) * 111.0 * COS_LAT;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestDist <= maxDistKm && bestIdx >= 0) {
      return { name: HOTSPOTS[bestIdx].name, type: HOTSPOTS[bestIdx].type, index: bestIdx };
    }
    return null;
  }

  // ============================================================================
  // Hotspot Weight Computation
  // ============================================================================

  function computeHotspotWeights(
    hour: number, day: number, hourProgress: number
  ): HotspotWeight[] {
    const nextHour = (hour + 1) % 24;
    const spots: HotspotWeight[] = [];

    for (let i = 0; i < HOTSPOTS.length; i++) {
      const h = HOTSPOTS[i];

      // Temporal weight for current and next hour
      const noise = 0.8 + seededRandom(h.lat * 1000 + h.lng * 1000 + hour) * 0.2;
      const w0 = (h.basePop * getTimeMultiplier(h.type, hour) * getDayMultiplier(h.type, day) * noise) / 100;
      const noiseNext = 0.8 + seededRandom(h.lat * 1000 + h.lng * 1000 + nextHour) * 0.2;
      const w1 = (h.basePop * getTimeMultiplier(h.type, nextHour) * getDayMultiplier(h.type, day) * noiseNext) / 100;

      // Smoothstep interpolation between hours
      const t = hourProgress * hourProgress * (3 - 2 * hourProgress);
      const weight = w0 * (1 - t) + w1 * t;

      // Base UV position (jitter is now GPU-side via u_time in shader)
      const x = (h.lng - PARIS_BOUNDS.minLng) / LNG_RANGE;
      const y = (h.lat - PARIS_BOUNDS.minLat) / LAT_RANGE;

      spots.push({ x, y, weight, radiusKm: h.radius });
    }

    return spots;
  }

  // ============================================================================
  // Upload color LUTs to shader
  // ============================================================================

  async function uploadColorLUTs() {
    if (!shader) return;
    const mainLUT = buildColorLUT(COLOR_PRESETS[settings.colorPreset]);
    const glowLUT = buildColorLUT(GLOW_PRESETS[settings.colorPreset]);
    const hotLUT = buildColorLUT(HOTSPOT_COLORS);
    await Promise.all([
      shader.setTextureData('u_mainColors', mainLUT, 256, 1),
      shader.setTextureData('u_glowColors', glowLUT, 256, 1),
      shader.setTextureData('u_hotColors', hotLUT, 256, 1),
    ]);
  }

  // ============================================================================
  // Load map tiles and upload as background texture
  // ============================================================================

  async function loadTileBackground() {
    if (!shader) return;
    try {
      const target = createRenderTarget(canvasWidth, canvasHeight);
      clearRenderTarget(target, 20, 22, 30, 255); // dark fallback
      await tileRenderer.render(target, mapViewport);
      await shader.setTextureData('u_background', target.pixels, canvasWidth, canvasHeight);
      shader.setUniform('u_hasBackground', 1.0);
      backgroundLoaded = true;
    } catch (err) {
      console.error('Failed to load map tiles:', err);
      shader.setUniform('u_hasBackground', 0.0);
    }
  }

  // ============================================================================
  // Update shader uniforms from settings
  // ============================================================================

  function updateSettingsUniforms() {
    if (!shader) return;

    // Sigma params: kmToUvX factor and Y scale
    // User radius slider scales the base sigma
    const radiusScale = settings.radiusPixels / 50.0; // 50px = default = 1.0x
    const glowScale = settings.glowRadius / 50.0;
    const hotScale = settings.hotspotRadius / 50.0;

    shader.setUniforms({
      u_intensity: settings.intensity,
      u_opacity: settings.opacity,
      u_threshold: settings.threshold,
      u_showGlow: settings.showGlow ? 1.0 : 0.0,
      u_glowIntensity: settings.glowIntensity,
      u_showHotspots: settings.showHotspots ? 1.0 : 0.0,
      u_hotspotIntensity: settings.hotspotIntensity,
      u_hotspotThreshold: settings.hotspotThreshold,
      u_sigmaParams: [KM_TO_UV_X, UV_Y_SCALE],
      u_radiusMain: radiusScale,
      u_radiusGlow: glowScale,
      u_radiusHot: hotScale,
      u_maxRadiusKm: MAX_RADIUS_KM,
    });
  }

  // ============================================================================
  // Render a single frame
  // ============================================================================

  async function renderFrame() {
    if (!shader) return;

    // Compute per-hotspot weights with interpolation
    const spots = computeHotspotWeights(time.hour, time.day, progress);

    // Pack and upload 64×2 hotspot texture (row 0: data, row 1: jitter)
    const hotspotTex = packHotspotTexture(spots, jitters);
    await shader.setTextureData('u_hotspots', hotspotTex, MAX_HOTSPOTS, 2);

    // Update count and jitter amplitude
    shader.setUniforms({
      u_count: Math.min(HOTSPOTS.length, MAX_HOTSPOTS),
      u_jitterAmplitude: 0.004,
    });

    // Update stats
    if (statsLabel) {
      const avgWeight = spots.reduce((s, p) => s + p.weight, 0) / spots.length;
      const maxWeight = Math.max(...spots.map(p => p.weight));
      statsLabel.setText(`${spots.length} hotspots | avg ${(avgWeight * 100).toFixed(0)}% | peak ${(maxWeight * 100).toFixed(0)}%`);
    }
  }

  // ============================================================================
  // Animation Loop
  // ============================================================================

  function updateTimeLabel() {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const progressMins = Math.floor(progress * 60);
    const label = `${dayNames[time.day]} ${String(time.hour).padStart(2, '0')}:${String(progressMins).padStart(2, '0')}`;
    if (timeLabel) {
      timeLabel.setText(label);
    }
  }

  function advanceHour() {
    time.hour = (time.hour + 1) % 24;
    if (time.hour === 0) {
      time.day = (time.day + 1) % 7;
    }
  }

  /** Simulation tick — runs at ~2Hz. GPU handles 60fps rendering via auto-animate. */
  async function simulationTick() {
    if (!animationRunning) return;

    const currentTime = Date.now();
    const deltaTime = lastFrameTime > 0 ? (currentTime - lastFrameTime) / 1000 : 0;
    lastFrameTime = currentTime;

    // Advance time (animationSpeed = hours per minute)
    progress += deltaTime * animationSpeed / 60;
    if (progress >= 1) {
      progress -= 1;
      advanceHour();
    }

    updateTimeLabel();
    await renderFrame();

    // Schedule next simulation tick (~2 Hz — GPU auto-animate handles rendering)
    if (animationRunning) {
      setTimeout(() => simulationTick(), 500);
    }
  }

  function startAnimation() {
    if (animationRunning) return;
    animationRunning = true;
    lastFrameTime = 0;
    // Enable GPU-side 60fps refresh
    if (shader) shader.setAutoAnimate(true);
    simulationTick();
  }

  function stopAnimation() {
    animationRunning = false;
    // Disable GPU-side auto-animate
    if (shader) shader.setAutoAnimate(false);
  }

  async function setTimeAndRender(h: number, d: number) {
    time = { hour: h % 24, day: d % 7 };
    progress = 0;
    updateTimeLabel();
    await renderFrame();
  }

  // ============================================================================
  // UI
  // ============================================================================

  let panelCollapsed = true;
  let panelContainer: any = null;

  a.setCustomTheme({ scrollBar: '#888888' });
  a.setCustomSizes({ scrollBar: 16 });

  a.window({ title: 'Paris Density Simulation', width: 820, height: 620 }, (win: Window) => {
    // Responsive resize with throttle
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    win.onResize((w, h) => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeTimer = null;
        canvasWidth = w;
        canvasHeight = h;
        mapViewport.width = w;
        mapViewport.height = h;
        if (shader) {
          shader.resize(w, h);
          updateViewTransform();
          scheduleTileReload();
        }
      }, 100);
    });
    win.setContent(async () => {
      a.stack(() => {
        // Bottom layer: GPU shader canvas with zoom/pan/hover events
        let tooltipTimer: ReturnType<typeof setTimeout> | null = null;
        shader = a.canvasShader(canvasWidth, canvasHeight, HEATMAP_SHADER, {
          onScroll: (e) => {
            const oldZoom = Math.round(mapViewport.zoom);
            if (e.scrolled.dy > 0) {
              mapViewport.zoom = Math.min(MAX_ZOOM, mapViewport.zoom + 1);
            } else if (e.scrolled.dy < 0) {
              mapViewport.zoom = Math.max(MIN_ZOOM, mapViewport.zoom - 1);
            }
            if (Math.round(mapViewport.zoom) !== oldZoom) {
              updateViewTransform();
              scheduleTileReload();
              updateStatusLabel();
            }
          },
          onDrag: (e) => {
            const { dLng, dLat } = pixelDeltaToGeo(
              e.dragged.dx, e.dragged.dy, mapViewport.zoom, mapViewport.center.lat
            );
            mapViewport.center.lng += dLng;
            mapViewport.center.lat += dLat;
            updateViewTransform();
            scheduleTileReload();
            updateStatusLabel();
          },
          onMouseMoved: (e) => {
            // Throttled tooltip: 50ms debounce
            if (tooltipTimer) clearTimeout(tooltipTimer);
            tooltipTimer = setTimeout(() => {
              if (!shader) return;
              const geo = pixelToGeo(e.position.x, e.position.y);
              const hotspot = findNearestHotspot(geo.lat, geo.lng);
              if (hotspot) {
                // Get current weight for display
                const spots = computeHotspotWeights(time.hour, time.day, progress);
                const density = spots[hotspot.index]?.weight ?? 0;
                shader.showTooltip(
                  `${hotspot.name} (${hotspot.type}) ${(density * 100).toFixed(0)}%`,
                  e.position.x, e.position.y
                );
              } else {
                shader.hideTooltip();
              }
            }, 50);
          },
          onMouseOut: () => {
            if (tooltipTimer) { clearTimeout(tooltipTimer); tooltipTimer = null; }
            if (shader) shader.hideTooltip();
          },
        });

        // Top layer: Control panel on the left
        a.hbox(() => {
          a.themeoverride('dark', () => {
            a.vbox(() => {
              // Hamburger bar (always visible)
              a.max(() => {
                a.rectangle('#1a1a2e', 200, 40);
                a.hbox(() => {
                  a.button('☰', { onClick: () => {
                    panelCollapsed = !panelCollapsed;
                    if (panelContainer) {
                      if (panelCollapsed) {
                        panelContainer.hide();
                      } else {
                        panelContainer.show();
                      }
                    }
                  } }).withId('hamburgerBtn');
                  a.label(' Paris Traffic');
                });
              });

              // Collapsible control panel
              panelContainer = a.max(() => {
                a.rectangle('#1a1a2e', 200, canvasHeight - 40);
                a.scroll(() => {
                  a.vbox(() => {
                    statusLabel = a.label(`Z${Math.round(mapViewport.zoom)} | 48.8566N, 2.3522E | OSM`).withId('statusLabel');
                    timeLabel = a.label('Fri 14:00').withId('timeLabel');
                    statsLabel = a.label('-- hotspots').withId('statsLabel');

                    // Zoom controls
                    a.hbox(() => {
                      a.button('Z+', { onClick: () => {
                        mapViewport.zoom = Math.min(MAX_ZOOM, mapViewport.zoom + 1);
                        updateViewTransform();
                        scheduleTileReload();
                        updateStatusLabel();
                      } }).withId('zoomInBtn');
                      a.button('Z-', { onClick: () => {
                        mapViewport.zoom = Math.max(MIN_ZOOM, mapViewport.zoom - 1);
                        updateViewTransform();
                        scheduleTileReload();
                        updateStatusLabel();
                      } }).withId('zoomOutBtn');
                    });

                    // Time navigation
                    a.hbox(() => {
                      a.button('< Hour', { onClick: () => {
                        time.hour = (time.hour - 1 + 24) % 24;
                        if (time.hour === 23) time.day = (time.day - 1 + 7) % 7;
                        void setTimeAndRender(time.hour, time.day);
                      } }).withId('prevHourBtn');
                      a.button('Hour >', { onClick: () => {
                        time.hour = (time.hour + 1) % 24;
                        if (time.hour === 0) time.day = (time.day + 1) % 7;
                        void setTimeAndRender(time.hour, time.day);
                      } }).withId('nextHourBtn');
                    });
                    a.hbox(() => {
                      a.button('< Day', { onClick: () => {
                        void setTimeAndRender(time.hour, (time.day - 1 + 7) % 7);
                      } }).withId('prevDayBtn');
                      a.button('Day >', { onClick: () => {
                        void setTimeAndRender(time.hour, (time.day + 1) % 7);
                      } }).withId('nextDayBtn');
                    });

                    // Play/Stop
                    a.hbox(() => {
                      a.button('Play', { onClick: () => startAnimation() }).withId('playBtn');
                      a.button('Stop', { onClick: () => stopAnimation() }).withId('pauseBtn');
                    });

                    // --- Heatmap settings ---
                    a.label('— Heatmap —');
                    let intensityLabel = a.label(`Intensity: ${settings.intensity.toFixed(1)}x`);
                    a.slider(0.1, 4, settings.intensity, (v) => {
                      settings.intensity = v;
                      intensityLabel.setText(`Intensity: ${v.toFixed(1)}x`);
                      updateSettingsUniforms();
                    });

                    let radiusLabel = a.label(`Radius: ${settings.radiusPixels}px`);
                    a.slider(10, 150, settings.radiusPixels, (v) => {
                      settings.radiusPixels = Math.round(v);
                      radiusLabel.setText(`Radius: ${settings.radiusPixels}px`);
                      updateSettingsUniforms();
                    });

                    let thresholdLabel = a.label(`Threshold: ${Math.round(settings.threshold * 100)}%`);
                    a.slider(0, 0.2, settings.threshold, (v) => {
                      settings.threshold = v;
                      thresholdLabel.setText(`Threshold: ${Math.round(v * 100)}%`);
                      updateSettingsUniforms();
                    });

                    let opacityLabel = a.label(`Opacity: ${Math.round(settings.opacity * 100)}%`);
                    a.slider(0.2, 1, settings.opacity, (v) => {
                      settings.opacity = v;
                      opacityLabel.setText(`Opacity: ${Math.round(v * 100)}%`);
                      updateSettingsUniforms();
                    });

                    // --- Glow settings ---
                    a.label('— Glow —');
                    let glowIntensityLabel = a.label(`Glow Int: ${settings.glowIntensity.toFixed(1)}`);
                    a.slider(0, 2, settings.glowIntensity, (v) => {
                      settings.glowIntensity = v;
                      glowIntensityLabel.setText(`Glow Int: ${v.toFixed(1)}`);
                      updateSettingsUniforms();
                    });

                    let glowRadiusLabel = a.label(`Glow Rad: ${settings.glowRadius}px`);
                    a.slider(30, 250, settings.glowRadius, (v) => {
                      settings.glowRadius = Math.round(v);
                      glowRadiusLabel.setText(`Glow Rad: ${settings.glowRadius}px`);
                      updateSettingsUniforms();
                    });

                    // --- Hotspot settings ---
                    a.label('— Hotspots —');
                    let hotIntLabel = a.label(`Hot Int: ${settings.hotspotIntensity.toFixed(1)}`);
                    a.slider(0.5, 5, settings.hotspotIntensity, (v) => {
                      settings.hotspotIntensity = v;
                      hotIntLabel.setText(`Hot Int: ${v.toFixed(1)}`);
                      updateSettingsUniforms();
                    });

                    let hotRadLabel = a.label(`Hot Rad: ${settings.hotspotRadius}px`);
                    a.slider(10, 80, settings.hotspotRadius, (v) => {
                      settings.hotspotRadius = Math.round(v);
                      hotRadLabel.setText(`Hot Rad: ${settings.hotspotRadius}px`);
                      updateSettingsUniforms();
                    });

                    let hotThreshLabel = a.label(`Hot Thresh: ${Math.round(settings.hotspotThreshold * 100)}%`);
                    a.slider(0.2, 0.8, settings.hotspotThreshold, (v) => {
                      settings.hotspotThreshold = v;
                      hotThreshLabel.setText(`Hot Thresh: ${Math.round(v * 100)}%`);
                      updateSettingsUniforms();
                    });

                    // --- Animation speed ---
                    a.label('— Animation —');
                    let speedLabel = a.label(`Speed: ${animationSpeed.toFixed(1)} h/min`);
                    a.slider(0.5, 10, animationSpeed, (v) => {
                      animationSpeed = v;
                      speedLabel.setText(`Speed: ${v.toFixed(1)} h/min`);
                    });

                    // --- Color presets ---
                    a.label('— Colors —');
                    a.hbox(() => {
                      a.button('Vibrant', { onClick: () => { settings.colorPreset = 'vibrant'; void uploadColorLUTs(); } });
                      a.button('Heat', { onClick: () => { settings.colorPreset = 'heat'; void uploadColorLUTs(); } });
                    });
                    a.hbox(() => {
                      a.button('Cool', { onClick: () => { settings.colorPreset = 'cool'; void uploadColorLUTs(); } });
                      a.button('Plasma', { onClick: () => { settings.colorPreset = 'plasma'; void uploadColorLUTs(); } });
                    });
                    a.hbox(() => {
                      a.button('Fire', { onClick: () => { settings.colorPreset = 'fire'; void uploadColorLUTs(); } });
                      a.spacer();
                    });

                    // --- Layer toggles ---
                    a.label('— Layers —');
                    a.hbox(() => {
                      a.button('Glow', { onClick: () => {
                        settings.showGlow = !settings.showGlow;
                        updateSettingsUniforms();
                      } }).withId('glowToggle');
                      a.button('Hotspots', { onClick: () => {
                        settings.showHotspots = !settings.showHotspots;
                        updateSettingsUniforms();
                      } }).withId('hotspotsToggle');
                    });
                  });
                });
              });

              // Hide panel initially
              if (panelCollapsed && panelContainer) {
                panelContainer.hide();
              }
            });
          });

          a.spacer();
        });
      });

      // Initial setup: upload LUTs, set uniforms, set view transform, load tiles, render first frame
      await new Promise(resolve => setTimeout(resolve, 50));
      await uploadColorLUTs();
      updateSettingsUniforms();
      updateViewTransform();
      updateStatusLabel();
      shader!.setUniforms({ u_hasBackground: 0.0, u_jitterAmplitude: 0.004 });
      await renderFrame();
      // Load tiles asynchronously (may take time on first run)
      loadTileBackground().catch(err => console.error('Tile loading failed:', err));
    });

    win.show();
  });
}

// Standalone execution
if (require.main === module) {
  const { app } = require('tsyne');
  const appInstance = app(resolveTransport(), { title: 'Paris Density Simulation' }, (a: App) => {
    buildParisDensity(a);
  });
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
