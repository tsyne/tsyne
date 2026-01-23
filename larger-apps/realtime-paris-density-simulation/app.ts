// @tsyne-app:name Paris Density
// @tsyne-app:category visualization
// @tsyne-app:builder buildParisDensity
// Portions copyright Yvann Barbot and portions copyright Paul Hammant 2025

import type { App, Window, Label } from 'tsyne';
import { generateDensityGrid, interpolateDensityGrids, DensityPoint, TimeOfWeek } from './simulation';
import * as os from 'os';
import * as path from 'path';

// Import graphics utilities from core
import {
  createRenderTarget,
  clearRenderTarget,
  RenderTarget,
  renderHeatmap,
  rgba,
  HeatmapPoint,
  Color
} from 'tsyne';

// Import tile rendering for map background
import {
  TileMapRenderer,
  TILE_SOURCES,
  MapViewport,
  TileSource
} from 'tsyne';

// Tile cache directory (7-day TTL per OSM policy)
const TILE_CACHE_PATH = path.join(os.homedir(), '.tsyne', 'realtime-paris-density-simulation', 'map-cache');

// ============================================================================
// Paris Map Configuration
// ============================================================================

// Paris view matching the original app
const PARIS_VIEW = {
  center: { lng: 2.3522, lat: 48.8566 },
  zoom: 12
};

// Paris geographic bounds (from simulation.ts)
const PARIS_BOUNDS = {
  minLat: 48.815,
  maxLat: 48.905,
  minLng: 2.22,
  maxLng: 2.47
};

// Calculate aspect ratio correction for heatmap circles
// Geographic aspect ratio vs canvas aspect ratio determines Y stretch
function calculateAspectRatioCorrection(canvasWidth: number, canvasHeight: number): number {
  const geoAspect = (PARIS_BOUNDS.maxLng - PARIS_BOUNDS.minLng) /
                    (PARIS_BOUNDS.maxLat - PARIS_BOUNDS.minLat);
  const canvasAspect = canvasWidth / canvasHeight;
  return geoAspect / canvasAspect;
}

// Get Mapbox token from environment
function getMapboxToken(): string | null {
  // Try environment variable
  if (typeof process !== 'undefined' && process.env?.MAPBOX_TOKEN) {
    return process.env.MAPBOX_TOKEN;
  }
  // Could also try reading from .env file here
  return null;
}

// ============================================================================
// Color Presets (matching original Deck.gl implementation)
// ============================================================================

type ColorPreset = 'vibrant' | 'heat' | 'cool' | 'plasma' | 'fire';

// Color presets with reduced alpha for transparency (map shows through)
const COLOR_PRESETS: Record<ColorPreset, Array<{ stop: number; color: Color }>> = {
  vibrant: [
    { stop: 0.0, color: rgba(64, 196, 255, 0) },
    { stop: 0.15, color: rgba(59, 130, 246, 40) },
    { stop: 0.30, color: rgba(16, 185, 129, 70) },
    { stop: 0.45, color: rgba(34, 197, 94, 100) },
    { stop: 0.60, color: rgba(250, 204, 21, 130) },
    { stop: 0.80, color: rgba(249, 115, 22, 160) },
    { stop: 1.0, color: rgba(239, 68, 68, 180) }
  ],
  heat: [
    { stop: 0.0, color: rgba(0, 0, 0, 0) },
    { stop: 0.15, color: rgba(30, 0, 100, 30) },
    { stop: 0.30, color: rgba(120, 0, 180, 60) },
    { stop: 0.45, color: rgba(200, 50, 50, 100) },
    { stop: 0.60, color: rgba(255, 100, 0, 130) },
    { stop: 0.80, color: rgba(255, 200, 0, 160) },
    { stop: 1.0, color: rgba(255, 255, 200, 180) }
  ],
  cool: [
    { stop: 0.0, color: rgba(0, 50, 100, 0) },
    { stop: 0.15, color: rgba(0, 100, 150, 40) },
    { stop: 0.30, color: rgba(0, 150, 200, 70) },
    { stop: 0.45, color: rgba(50, 200, 200, 100) },
    { stop: 0.60, color: rgba(100, 220, 180, 130) },
    { stop: 0.80, color: rgba(150, 240, 160, 160) },
    { stop: 1.0, color: rgba(200, 255, 200, 180) }
  ],
  plasma: [
    { stop: 0.0, color: rgba(13, 8, 135, 0) },
    { stop: 0.15, color: rgba(75, 3, 161, 40) },
    { stop: 0.30, color: rgba(138, 10, 165, 70) },
    { stop: 0.45, color: rgba(188, 55, 84, 100) },
    { stop: 0.60, color: rgba(227, 99, 25, 130) },
    { stop: 0.80, color: rgba(248, 149, 64, 160) },
    { stop: 1.0, color: rgba(252, 206, 37, 180) }
  ],
  fire: [
    { stop: 0.0, color: rgba(0, 0, 0, 0) },
    { stop: 0.15, color: rgba(40, 0, 0, 30) },
    { stop: 0.30, color: rgba(100, 10, 0, 60) },
    { stop: 0.45, color: rgba(180, 30, 0, 100) },
    { stop: 0.60, color: rgba(230, 80, 0, 130) },
    { stop: 0.80, color: rgba(255, 150, 20, 160) },
    { stop: 1.0, color: rgba(255, 220, 100, 180) }
  ]
};

// Glow layer colors (very soft, subtle background)
const GLOW_PRESETS: Record<ColorPreset, Array<{ stop: number; color: Color }>> = {
  vibrant: [
    { stop: 0.0, color: rgba(100, 180, 255, 0) },
    { stop: 0.25, color: rgba(80, 150, 230, 15) },
    { stop: 0.50, color: rgba(60, 180, 160, 30) },
    { stop: 0.75, color: rgba(100, 200, 120, 50) },
    { stop: 1.0, color: rgba(255, 160, 80, 70) }
  ],
  heat: [
    { stop: 0.0, color: rgba(50, 0, 50, 0) },
    { stop: 0.25, color: rgba(80, 0, 100, 15) },
    { stop: 0.50, color: rgba(120, 20, 100, 30) },
    { stop: 0.75, color: rgba(160, 50, 50, 50) },
    { stop: 1.0, color: rgba(230, 120, 30, 70) }
  ],
  cool: [
    { stop: 0.0, color: rgba(0, 80, 120, 0) },
    { stop: 0.25, color: rgba(0, 100, 140, 15) },
    { stop: 0.50, color: rgba(20, 130, 160, 30) },
    { stop: 0.75, color: rgba(40, 160, 180, 50) },
    { stop: 1.0, color: rgba(120, 210, 170, 70) }
  ],
  plasma: [
    { stop: 0.0, color: rgba(30, 20, 100, 0) },
    { stop: 0.25, color: rgba(60, 20, 130, 15) },
    { stop: 0.50, color: rgba(100, 30, 140, 30) },
    { stop: 0.75, color: rgba(150, 50, 100, 50) },
    { stop: 1.0, color: rgba(220, 120, 60, 70) }
  ],
  fire: [
    { stop: 0.0, color: rgba(20, 0, 0, 0) },
    { stop: 0.25, color: rgba(50, 10, 0, 15) },
    { stop: 0.50, color: rgba(80, 20, 0, 30) },
    { stop: 0.75, color: rgba(130, 40, 0, 50) },
    { stop: 1.0, color: rgba(220, 110, 30, 70) }
  ]
};

// ============================================================================
// Tile Source Options
// ============================================================================

type TileSourceKey = 'osm' | 'mapbox-light' | 'mapbox-dark' | 'mapbox-streets' | 'mapbox-satellite';

const TILE_SOURCE_LABELS: Record<TileSourceKey, string> = {
  'osm': 'OpenStreetMap',
  'mapbox-light': 'Mapbox Light',
  'mapbox-dark': 'Mapbox Dark',
  'mapbox-streets': 'Mapbox Streets',
  'mapbox-satellite': 'Mapbox Satellite'
};

function getTileSource(key: TileSourceKey, mapboxToken: string | null): TileSource | null {
  switch (key) {
    case 'osm':
      return TILE_SOURCES.osmRaster();
    case 'mapbox-light':
      return mapboxToken ? TILE_SOURCES.mapboxLight(mapboxToken) : null;
    case 'mapbox-dark':
      return mapboxToken ? TILE_SOURCES.mapboxDark(mapboxToken) : null;
    case 'mapbox-streets':
      return mapboxToken ? TILE_SOURCES.mapboxStreets(mapboxToken) : null;
    case 'mapbox-satellite':
      return mapboxToken ? TILE_SOURCES.mapboxSatellite(mapboxToken) : null;
    default:
      return null;
  }
}

// ============================================================================
// Point Movement (organic animation)
// ============================================================================

interface PointOffset {
  phaseX: number;
  phaseY: number;
  speedX: number;
  speedY: number;
  amplitude: number;
}

function initializePointOffsets(count: number): PointOffset[] {
  const offsets: PointOffset[] = [];
  for (let i = 0; i < count; i++) {
    offsets.push({
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      speedX: 0.3 + Math.random() * 0.8,
      speedY: 0.3 + Math.random() * 0.8,
      amplitude: 0.002 + Math.random() * 0.004 // Normalized coordinate space
    });
  }
  return offsets;
}

function applyOrganicMovement(
  points: DensityPoint[],
  offsets: PointOffset[],
  time: number
): DensityPoint[] {
  return points.map((point, i) => {
    const offset = offsets[i % offsets.length];
    const densityFactor = 0.5 + (point.density / 100) * 0.5;

    const offsetX = Math.sin(time * offset.speedX + offset.phaseX) * offset.amplitude * densityFactor;
    const offsetY = Math.sin(time * offset.speedY + offset.phaseY) * offset.amplitude * densityFactor;

    return {
      ...point,
      x: Math.max(0, Math.min(1, point.x + offsetX)),
      y: Math.max(0, Math.min(1, point.y + offsetY))
    };
  });
}

// ============================================================================
// Visualization Settings
// ============================================================================

interface VisualizationSettings {
  // Main heatmap
  opacity: number;
  intensity: number;
  radiusPixels: number;
  threshold: number;

  // Glow layer
  showGlow: boolean;
  glowIntensity: number;
  glowRadius: number;

  // Hotspot layer
  showHotspots: boolean;
  hotspotIntensity: number;
  hotspotRadius: number;
  hotspotThreshold: number;

  // Color
  colorPreset: ColorPreset;
}

const DEFAULT_SETTINGS: VisualizationSettings = {
  // Main heatmap - very transparent to let map show through
  opacity: 0.3,
  intensity: 0.4,
  radiusPixels: 50,
  threshold: 0.03,

  // Glow layer - subtle background glow
  showGlow: true,
  glowIntensity: 0.15,
  glowRadius: 100,

  // Hotspot highlights - more visible but still transparent
  showHotspots: true,
  hotspotIntensity: 0.8,
  hotspotRadius: 30,
  hotspotThreshold: 45,

  colorPreset: 'vibrant'
};

// ============================================================================
// Main Application
// ============================================================================

export function buildParisDensity(a: App) {
  let time: TimeOfWeek = { hour: 12, day: 0 };
  let canvas: any;
  let timeLabel: Label | undefined;
  let fpsLabel: Label | undefined;
  let statsLabel: Label | undefined;

  // Data caches
  let currentHourData: DensityPoint[] | null = null;
  let nextHourData: DensityPoint[] | null = null;
  let displayData: DensityPoint[] | null = null;
  let densityCache: Record<string, DensityPoint[]> = {};
  let pointOffsets: PointOffset[] = [];

  // Animation state
  let animationRunning = false;
  let animationSpeed = 1.0;
  let progress = 0; // 0-1 progress through current hour
  let lastFrameTime = 0;
  let frameCount = 0;
  let lastFpsUpdate = 0;
  let currentFps = 0;

  // Visualization settings
  let settings: VisualizationSettings = { ...DEFAULT_SETTINGS };

  // Canvas dimensions (larger for overlay style)
  const canvasWidth = 800;
  const canvasHeight = 600;

  // Render target
  let renderTarget: RenderTarget | null = null;

  // Render lock to prevent overlapping renders
  let renderInProgress = false;
  let renderPending = false;

  // Map tile renderer
  let tileRenderer: TileMapRenderer | null = null;
  let mapTilesEnabled = true;
  let mapTilesLoaded = false;
  let currentTileSource: TileSourceKey = 'osm';
  const mapboxToken = getMapboxToken();

  // Function to create/update tile renderer based on source selection
  function setTileSource(key: TileSourceKey): boolean {
    const source = getTileSource(key, mapboxToken);
    if (source) {
      tileRenderer = new TileMapRenderer(source, {
        maxCacheSize: 50,
        fsCachePath: TILE_CACHE_PATH  // Cache tiles to disk (7-day TTL per OSM policy)
      });
      currentTileSource = key;
      mapTilesLoaded = false;
      return true;
    }
    return false;
  }

  // Initialize with OSM (always available)
  setTileSource('osm');

  // Map viewport for tile rendering (mutable for panning)
  let mapViewport: MapViewport = {
    center: { ...PARIS_VIEW.center },
    zoom: PARIS_VIEW.zoom,
    width: canvasWidth,
    height: canvasHeight
  };

  // Pan the map by pixel delta
  function panMap(deltaX: number, deltaY: number) {
    // Convert pixel delta to geographic delta
    // At zoom 12, roughly 0.00004 degrees per pixel
    const pixelsPerDegree = Math.pow(2, mapViewport.zoom) * 256 / 360;
    const lngDelta = -deltaX / pixelsPerDegree;
    const latDelta = deltaY / pixelsPerDegree;

    mapViewport.center = {
      lng: mapViewport.center.lng + lngDelta,
      lat: mapViewport.center.lat + latDelta
    };

    // Don't clear cache - TileMapRenderer has LRU caching that handles this
    void renderDensityCanvas();
  }

  // ============================================================================
  // Data Loading
  // ============================================================================

  function getCacheKey(t: TimeOfWeek): string {
    return `${t.hour}:${t.day}`;
  }

  function getDensityGrid(t: TimeOfWeek): DensityPoint[] {
    const key = getCacheKey(t);
    if (!densityCache[key]) {
      densityCache[key] = generateDensityGrid(t);
    }
    return densityCache[key];
  }

  function loadHourData(hour: number, day: number) {
    const nextHour = (hour + 1) % 24;

    currentHourData = getDensityGrid({ hour, day });
    nextHourData = getDensityGrid({ hour: nextHour, day });

    // Initialize point offsets if needed
    if (pointOffsets.length !== currentHourData.length) {
      pointOffsets = initializePointOffsets(currentHourData.length);
    }

    // Initialize display data
    displayData = currentHourData.map(p => ({ ...p }));

    updateStats();
  }

  function updateStats() {
    if (!displayData || !statsLabel) return;
    const avgDensity = displayData.reduce((sum, p) => sum + p.density, 0) / displayData.length;
    const maxDensity = Math.max(...displayData.map(p => p.density));
    statsLabel.setText(`Points: ${displayData.length} | Avg: ${avgDensity.toFixed(1)} | Max: ${maxDensity.toFixed(0)}`);
  }

  // ============================================================================
  // Multi-Layer Rendering
  // ============================================================================

  function toHeatmapPoints(data: DensityPoint[]): HeatmapPoint[] {
    // Convert normalized (0-1) density coords to geographic coords, then to viewport pixels
    return data.map(point => {
      // Convert from normalized to geographic
      const lng = PARIS_BOUNDS.minLng + point.x * (PARIS_BOUNDS.maxLng - PARIS_BOUNDS.minLng);
      const lat = PARIS_BOUNDS.maxLat - point.y * (PARIS_BOUNDS.maxLat - PARIS_BOUNDS.minLat);

      // Project geographic to viewport pixels using Web Mercator
      const worldSize = 256 * Math.pow(2, mapViewport.zoom);

      // Point in world pixels
      const pointWorldX = ((lng + 180) / 360) * worldSize;
      const latRad = lat * Math.PI / 180;
      const pointWorldY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * worldSize;

      // Center in world pixels
      const centerWorldX = ((mapViewport.center.lng + 180) / 360) * worldSize;
      const centerLatRad = mapViewport.center.lat * Math.PI / 180;
      const centerWorldY = ((1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / Math.PI) / 2) * worldSize;

      // Convert to canvas pixels (relative to center)
      const x = canvasWidth / 2 + (pointWorldX - centerWorldX);
      const y = canvasHeight / 2 + (pointWorldY - centerWorldY);

      return { x, y, weight: point.density / 100 };
    });
  }

  async function renderDensityCanvas() {
    if (!canvas || !displayData) {
      return;
    }

    // If a render is already in progress, mark pending and exit
    if (renderInProgress) {
      renderPending = true;
      return;
    }
    renderInProgress = true;

    // Initialize render target on first use
    if (!renderTarget) {
      renderTarget = createRenderTarget(canvasWidth, canvasHeight);
    }

    // Clear to dark background (will be overwritten by map tiles if available)
    clearRenderTarget(renderTarget, 20, 22, 30, 255);

    // Render map tiles as background
    if (mapTilesEnabled && tileRenderer) {
      try {
        await tileRenderer.render(renderTarget, mapViewport);
        mapTilesLoaded = true;
      } catch (err) {
        console.error('Failed to render map tiles:', err);
      }
    }

    const points = toHeatmapPoints(displayData);
    const colorStops = COLOR_PRESETS[settings.colorPreset];
    const glowStops = GLOW_PRESETS[settings.colorPreset];

    // Aspect ratio correction: geographic coords are stretched differently in X vs Y
    // This makes circles appear as circles in geographic space
    const aspectCorrection = calculateAspectRatioCorrection(canvasWidth, canvasHeight);

    // Layer 1: Ambient glow (large soft background)
    if (settings.showGlow) {
      renderHeatmap(renderTarget, points, {
        radius: settings.glowRadius,
        radiusY: Math.round(settings.glowRadius * aspectCorrection),
        intensity: settings.glowIntensity * settings.opacity,
        colorStops: glowStops
      });
    }

    // Layer 2: Main heatmap
    renderHeatmap(renderTarget, points, {
      radius: settings.radiusPixels,
      radiusY: Math.round(settings.radiusPixels * aspectCorrection),
      intensity: settings.intensity,
      colorStops: colorStops
    });

    // Layer 3: Hotspot highlights (high-intensity areas)
    if (settings.showHotspots) {
      const hotspotPoints = points.filter((_, i) => displayData![i].density > settings.hotspotThreshold);
      if (hotspotPoints.length > 0) {
        renderHeatmap(renderTarget, hotspotPoints, {
          radius: settings.hotspotRadius,
          radiusY: Math.round(settings.hotspotRadius * aspectCorrection),
          intensity: settings.hotspotIntensity,
          colorStops: [
            { stop: 0.0, color: rgba(255, 200, 50, 0) },
            { stop: 0.3, color: rgba(255, 180, 50, 140) },
            { stop: 0.5, color: rgba(255, 140, 40, 180) },
            { stop: 0.7, color: rgba(250, 100, 30, 210) },
            { stop: 0.9, color: rgba(240, 60, 60, 240) },
            { stop: 1.0, color: rgba(220, 40, 80, 255) }
          ]
        });
      }
    }

    await canvas.setPixelBuffer(renderTarget.pixels);

    // Release lock and check for pending render
    renderInProgress = false;
    if (renderPending) {
      renderPending = false;
      void renderDensityCanvas();
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

    // Shift data
    currentHourData = nextHourData;
    const nextHour = (time.hour + 1) % 24;
    nextHourData = getDensityGrid({ hour: nextHour, day: time.day });
  }

  async function animationFrame(currentTime: number) {
    if (!animationRunning) return;

    // Calculate delta time
    const deltaTime = lastFrameTime > 0 ? (currentTime - lastFrameTime) / 1000 : 0;
    lastFrameTime = currentTime;

    // FPS counter
    frameCount++;
    if (currentTime - lastFpsUpdate > 1000) {
      currentFps = Math.round(frameCount * 1000 / (currentTime - lastFpsUpdate));
      if (fpsLabel) {
        fpsLabel.setText(`${currentFps} FPS`);
      }
      frameCount = 0;
      lastFpsUpdate = currentTime;
    }

    // Update progress (full hour in ~10 seconds at speed 1.0)
    progress += deltaTime * 0.1 * animationSpeed;

    if (progress >= 1) {
      progress = 0;
      advanceHour();
    }

    // Interpolate between hours with organic movement
    if (currentHourData && nextHourData) {
      const interpolated = interpolateDensityGrids(currentHourData, nextHourData, progress);
      displayData = applyOrganicMovement(interpolated, pointOffsets, currentTime / 1000);
    }

    updateTimeLabel();
    await renderDensityCanvas();

    // Schedule next frame
    if (animationRunning) {
      setTimeout(() => animationFrame(Date.now()), 33); // ~30 FPS
    }
  }

  function startAnimation() {
    if (animationRunning) return;
    animationRunning = true;
    lastFrameTime = 0;
    frameCount = 0;
    lastFpsUpdate = Date.now();
    animationFrame(Date.now());
  }

  function stopAnimation() {
    animationRunning = false;
  }

  function setTime(h: number, d: number) {
    time = { hour: h % 24, day: d % 7 };
    progress = 0;
    loadHourData(time.hour, time.day);
    updateTimeLabel();
    void renderDensityCanvas();
  }

  function nextHour() {
    time.hour = (time.hour + 1) % 24;
    if (time.hour === 0) {
      time.day = (time.day + 1) % 7;
    }
    progress = 0;
    loadHourData(time.hour, time.day);
    updateTimeLabel();
    void renderDensityCanvas();
  }

  function prevHour() {
    time.hour = (time.hour - 1 + 24) % 24;
    if (time.hour === 23) {
      time.day = (time.day - 1 + 7) % 7;
    }
    progress = 0;
    loadHourData(time.hour, time.day);
    updateTimeLabel();
    void renderDensityCanvas();
  }

  // ============================================================================
  // UI
  // ============================================================================

  // Panel collapsed state
  let panelCollapsed = true;
  let panelContainer: any = null;
  let hamburgerBtn: any = null;

  // Set contrasting scrollbar color and wider size for dark panel
  a.setCustomTheme({ scrollBar: '#888888' });
  a.setCustomSizes({ scrollBar: 16 });

  a.window({ title: 'Paris Density Simulation', width: 820, height: 620, fixedSize: true }, (win: Window) => {
    win.setContent(async () => {
      // Use stack for overlay: canvas on bottom, controls on top-left
      a.stack(() => {
        // Bottom layer: Full-size map canvas
        const rawCanvas = a.tappableCanvasRaster(canvasWidth, canvasHeight, {
          onTap: (x, y) => {
            console.log(`Tapped at ${x}, ${y}`);
          },
          onDrag: (_x, _y, deltaX, deltaY) => {
            panMap(deltaX, deltaY);
          },
          onDragEnd: () => {
            // Could trigger a final render here if needed
          },
          onScroll: (deltaX, deltaY, _x, _y) => {
            // Use scroll/mousewheel to pan the map
            panMap(deltaX * 3, deltaY * 3);
          }
        }) as any;
        canvas = rawCanvas;
        if (rawCanvas && typeof rawCanvas.withId === 'function') {
          rawCanvas.withId('densityCanvas');
        }

        // Top layer: Control panel on the left
        a.hbox(() => {
          a.themeoverride('dark', () => {
            a.vbox(() => {
              // Hamburger button row with title (always visible, with opaque background)
              a.max(() => {
                a.rectangle('#1a1a2e', 200, 40);
                a.hbox(() => {
                  hamburgerBtn = a.button('☰').onClick(() => {
                    panelCollapsed = !panelCollapsed;
                    if (panelContainer) {
                      if (panelCollapsed) {
                        panelContainer.hide();
                      } else {
                        panelContainer.show();
                      }
                    }
                  }).withId('hamburgerBtn');
                  a.label(' Paris Traffic');
                });
              });

              // Collapsible panel (scrollable to fit within window)
              panelContainer = a.max(() => {
                a.rectangle('#1a1a2e', 200, canvasHeight - 40);
                a.scroll(() => {
                  a.vbox(() => {
                    fpsLabel = a.label('-- FPS').withId('fpsLabel');
                    timeLabel = a.label('Sun 12:00').withId('timeLabel');
                    statsLabel = a.label('Points: --').withId('statsLabel');

                    a.hbox(() => {
                      a.button('< Hour').onClick(() => prevHour()).withId('prevHourBtn');
                      a.button('Hour >').onClick(() => nextHour()).withId('nextHourBtn');
                    });
                    a.hbox(() => {
                      a.button('< Day').onClick(() => {
                        time.day = (time.day - 1 + 7) % 7;
                        progress = 0;
                        loadHourData(time.hour, time.day);
                        updateTimeLabel();
                        void renderDensityCanvas();
                      }).withId('prevDayBtn');
                      a.button('Day >').onClick(() => {
                        time.day = (time.day + 1) % 7;
                        progress = 0;
                        loadHourData(time.hour, time.day);
                        updateTimeLabel();
                        void renderDensityCanvas();
                      }).withId('nextDayBtn');
                    });

                    a.hbox(() => {
                      a.button('Play').onClick(() => startAnimation()).withId('playBtn');
                      a.button('Stop').onClick(() => stopAnimation()).withId('pauseBtn');
                    });

                    a.label('— Heatmap —');
                    let intensityLabel = a.label(`Intensity: ${settings.intensity.toFixed(1)}`);
                    a.slider(0.1, 2, settings.intensity, (v) => {
                      settings.intensity = v;
                      intensityLabel.setText(`Intensity: ${v.toFixed(1)}`);
                      void renderDensityCanvas();
                    });

                    let radiusLabel = a.label(`Radius: ${settings.radiusPixels}px`);
                    a.slider(10, 150, settings.radiusPixels, (v) => {
                      settings.radiusPixels = Math.round(v);
                      radiusLabel.setText(`Radius: ${settings.radiusPixels}px`);
                      void renderDensityCanvas();
                    });

                    let thresholdLabel = a.label(`Threshold: ${settings.threshold.toFixed(2)}`);
                    a.slider(0, 0.2, settings.threshold, (v) => {
                      settings.threshold = v;
                      thresholdLabel.setText(`Threshold: ${v.toFixed(2)}`);
                      void renderDensityCanvas();
                    });

                    let opacityLabel = a.label(`Opacity: ${Math.round(settings.opacity * 100)}%`);
                    a.slider(0.2, 1, settings.opacity, (v) => {
                      settings.opacity = v;
                      opacityLabel.setText(`Opacity: ${Math.round(v * 100)}%`);
                      void renderDensityCanvas();
                    });

                    a.label('— Glow —');
                    let glowIntensityLabel = a.label(`Glow Int: ${settings.glowIntensity.toFixed(1)}`);
                    a.slider(0, 1, settings.glowIntensity, (v) => {
                      settings.glowIntensity = v;
                      glowIntensityLabel.setText(`Glow Int: ${v.toFixed(1)}`);
                      void renderDensityCanvas();
                    });

                    let glowRadiusLabel = a.label(`Glow Rad: ${settings.glowRadius}px`);
                    a.slider(30, 250, settings.glowRadius, (v) => {
                      settings.glowRadius = Math.round(v);
                      glowRadiusLabel.setText(`Glow Rad: ${settings.glowRadius}px`);
                      void renderDensityCanvas();
                    });

                    a.label('— Colors —');
                    a.hbox(() => {
                      a.button('Vibrant').onClick(() => { settings.colorPreset = 'vibrant'; void renderDensityCanvas(); });
                      a.button('Heat').onClick(() => { settings.colorPreset = 'heat'; void renderDensityCanvas(); });
                    });
                    a.hbox(() => {
                      a.button('Cool').onClick(() => { settings.colorPreset = 'cool'; void renderDensityCanvas(); });
                      a.button('Plasma').onClick(() => { settings.colorPreset = 'plasma'; void renderDensityCanvas(); });
                    });
                    a.hbox(() => {
                      a.button('Fire').onClick(() => { settings.colorPreset = 'fire'; void renderDensityCanvas(); });
                      a.spacer();
                    });

                    a.label('— Layers —');
                    a.hbox(() => {
                      a.button('Glow').onClick(() => { settings.showGlow = !settings.showGlow; void renderDensityCanvas(); }).withId('glowToggle');
                      a.button('Hotspots').onClick(() => { settings.showHotspots = !settings.showHotspots; void renderDensityCanvas(); }).withId('hotspotsToggle');
                    });

                    a.button('Reset View').onClick(() => {
                      mapViewport.center = { ...PARIS_VIEW.center };
                      if (tileRenderer) { tileRenderer.clearCache(); }
                      void renderDensityCanvas();
                    }).withId('resetViewBtn');
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

      // Initial data load and render
      loadHourData(time.hour, time.day);
      updateTimeLabel();
      await new Promise(resolve => setTimeout(resolve, 50));
      await renderDensityCanvas();
    });

    win.show();
  });
}

// Standalone execution for testing
if (require.main === module) {
  const { app, resolveTransport  } = require('../../core/src');
  app(resolveTransport(), { title: 'Paris Density Simulation' }, (a: App) => {
    buildParisDensity(a);
  });
}
