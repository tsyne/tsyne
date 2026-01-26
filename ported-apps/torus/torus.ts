// @tsyne-app:name Torus
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="12" rx="10" ry="4" stroke="#CC0000"/><ellipse cx="12" cy="12" rx="6" ry="10" stroke="#CC0000"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" stroke="#880000"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-60 12 12)" stroke="#880000"/></svg>
// @tsyne-app:category fun
// @tsyne-app:builder createTorusApp
// @tsyne-app:args app,window,windowWidth,windowHeight

/**
 * Interactive 3D Torus Demo for Tsyne
 *
 * Demonstrates 3D-to-2D projection and software rendering using CanvasRaster.
 *
 * Features:
 * - Parametric torus wireframe rendering
 * - 3D to 2D perspective projection with rotation
 * - Continuous auto-animation
 * - Lambertian shading for depth perception
 * - Efficient pixel-based rendering (no widget tree rebuilds)
 *
 * Mathematical Background:
 * A torus is defined by parametric equations:
 *   x = (R + r·cos(v)) · cos(u)
 *   y = (R + r·cos(v)) · sin(u)
 *   z = r · sin(v)
 * Where R = major radius, r = minor radius, u,v ∈ [0, 2π]
 */

import { app, resolveTransport } from 'tsyne';
import type { App, Window, TappableCanvasRaster, ITsyneWindow } from 'tsyne';
import { TorusProjection, type Point3D } from './projections';
import {
  generateTorusMesh,
  calculateLambertianShade,
  getDefaultLightDirection,
  type TorusQuad,
} from './base-torus';
import { PixelBuffer, rgb } from './raster';

// Canvas dimensions
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Torus geometry parameters
const MAJOR_RADIUS = 160;  // Distance from center to tube center
const MINOR_RADIUS = 60;   // Tube radius
const SEGMENTS_U = 80;    // Segments around major circle (increased for higher res)
const SEGMENTS_V = 48;    // Segments around minor circle (increased for higher res)

// Animation parameters - matched to original
const AUTO_ROTATE_SPEED_THETA = 0.55;  // Radians per second (yaw)
const AUTO_ROTATE_SPEED_PHI = 0.95;    // Radians per second (pitch)
const AUTO_ROTATE_SPEED_PSI = 0.15;    // Radians per second (roll)

// Background pixelation parameters (inspired by original WebGL shader)
const BG_PIXEL_SIZE = 8;         // Cell size for background noise

// Colors - deep blue/black for background
const BG_BLUE_MIN = rgb(0, 0, 20);    // Dark blue-black
const BG_BLUE_MAX = rgb(0, 10, 60);   // Slightly brighter blue

/**
 * Torus application state
 */
export interface TorusState {
  rotationTheta: number;  // Yaw (Z-axis rotation)
  rotationPhi: number;    // Pitch (X-axis rotation)
  rotationPsi: number;    // Roll (Y-axis rotation)
  autoRotate: boolean;
}

/**
 * Create initial state
 */
export function createInitialState(): TorusState {
  return {
    rotationTheta: 0.5,
    rotationPhi: 0.3,
    rotationPsi: 0,
    autoRotate: true,
  };
}

/**
 * Observable store for torus state
 */
export class TorusStore {
  private state: TorusState;
  private changeListeners: Array<() => void> = [];

  constructor(initialState?: Partial<TorusState>) {
    this.state = { ...createInitialState(), ...initialState };
  }

  getState(): TorusState {
    return { ...this.state };
  }

  subscribe(listener: () => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }

  private notifyChange(): void {
    this.changeListeners.forEach(l => l());
  }

  setRotation(theta: number, phi: number, psi: number): void {
    this.state.rotationTheta = theta;
    this.state.rotationPhi = phi;
    this.state.rotationPsi = psi;
    this.notifyChange();
  }

  incrementRotation(dTheta: number, dPhi: number, dPsi: number): void {
    this.state.rotationTheta += dTheta;
    this.state.rotationPhi += dPhi;
    this.state.rotationPsi += dPsi;
    // Don't notify - we'll render directly in the animation loop
  }

  toggleAutoRotate(): void {
    this.state.autoRotate = !this.state.autoRotate;
    this.notifyChange();
  }

  setAutoRotate(value: boolean): void {
    this.state.autoRotate = value;
    this.notifyChange();
  }

  resetView(): void {
    this.state.rotationTheta = 0.5;
    this.state.rotationPhi = 0.3;
    this.state.rotationPsi = 0;
    this.notifyChange();
  }
}

/**
 * Projected quad with depth info for sorting
 */
interface ProjectedQuad {
  points: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
  depth: number;
  color: { r: number; g: number; b: number; a: number };
}

/**
 * Hash function for pseudo-random values (like WebGL shader hash12)
 * Creates deterministic noise for stippling effect
 */
function hash12(x: number, y: number): number {
  // Simple hash combining x and y coordinates
  const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

/**
 * Draw a stippled/pixelated blue-black background
 */
function renderStippledBackground(buffer: PixelBuffer, pixelSize: number): void {
  const width = buffer.width;
  const height = buffer.height;

  // Process in grid cells for the blocky effect
  for (let cy = 0; cy < height; cy += pixelSize) {
    for (let cx = 0; cx < width; cx += pixelSize) {
      // Hash for this cell
      const cellX = Math.floor(cx / pixelSize);
      const cellY = Math.floor(cy / pixelSize);
      const h = hash12(cellX, cellY);

      // Vary blue intensity based on hash
      const blueIntensity = h * h; // Bias towards darker
      const blue = Math.floor(BG_BLUE_MIN.b + (BG_BLUE_MAX.b - BG_BLUE_MIN.b) * blueIntensity);
      const green = Math.floor(BG_BLUE_MIN.g + (BG_BLUE_MAX.g - BG_BLUE_MIN.g) * blueIntensity * 0.5);
      const color = rgb(0, green, blue);

      // Fill the cell
      for (let py = cy; py < cy + pixelSize && py < height; py++) {
        for (let px = cx; px < cx + pixelSize && px < width; px++) {
          buffer.setPixel(px, py, color);
        }
      }
    }
  }
}

/**
 * Render the torus with shaded surfaces to a pixel buffer
 * Blue/black stippled background with solid red torus and UV-based surface texture
 */
export function renderTorusToBuffer(
  buffer: PixelBuffer,
  projection: TorusProjection,
  majorRadius: number = MAJOR_RADIUS,
  minorRadius: number = MINOR_RADIUS,
  segmentsU: number = SEGMENTS_U,
  segmentsV: number = SEGMENTS_V
): void {
  // Render stippled blue/black background
  renderStippledBackground(buffer, BG_PIXEL_SIZE);

  const mesh = generateTorusMesh({ majorRadius, minorRadius, segmentsU, segmentsV });

  // Light direction in camera space: slightly from upper-right, towards the scene
  const lightDir = { x: 0.2, y: 0.3, z: 0.93 }; // pre-normalized

  // Project all quads and calculate their depth
  const projectedQuads: ProjectedQuad[] = [];

  for (let quadIdx = 0; quadIdx < mesh.quads.length; quadIdx++) {
    const quad = mesh.quads[quadIdx];
    const vertices = quad.vertices;

    // Get UV coordinates for surface texture (grid position on torus)
    const i = Math.floor(quadIdx / segmentsV);  // Position around major circle
    const j = quadIdx % segmentsV;               // Position around minor circle

    // Project all 4 vertices
    const projected = vertices.map(v => ({
      p2d: projection.project(v.position),
      p3d: v.position,
      alpha: projection.getAlpha(v.position)
    }));

    // Skip if any vertex is behind the camera
    if (projected.some(p => p.alpha < 0.1)) continue;

    // Calculate average depth for sorting (use rotated Z)
    const avgDepth = vertices.reduce((sum, v) => {
      return sum + projection.getDepth(v.position);
    }, 0) / 4;

    // Rotate the face normal to camera space for shading
    const rn = projection.rotate(quad.normal);
    // Normalize the rotated normal
    const rnLen = Math.sqrt(rn.x * rn.x + rn.y * rn.y + rn.z * rn.z);
    const rotatedNormal = rnLen > 0
      ? { x: rn.x / rnLen, y: rn.y / rnLen, z: rn.z / rnLen }
      : rn;

    // Backface culling: use rotated normal's Z component
    // If the normal points away from camera (negative Z), skip this face
    if (rotatedNormal.z < 0) continue;

    // Shading: dot product of rotated normal with light direction
    // Surfaces facing the camera (positive Z) are brighter
    const dot = rotatedNormal.x * lightDir.x + rotatedNormal.y * lightDir.y + rotatedNormal.z * lightDir.z;
    const shade = Math.max(0, dot) * 0.75 + 0.25; // 0.25 ambient, 0.75 diffuse

    // UV-based surface texture: use hash of grid position for per-quad variation
    // This creates stippling that moves WITH the torus surface
    const uvNoise = hash12(i * 7.3, j * 11.7);
    const textureVariation = 0.7 + uvNoise * 0.3; // 0.7 to 1.0 range

    // Red color with lighting and surface texture
    const red = Math.round((80 + shade * 175) * textureVariation);
    const color = rgb(red, 0, 0);

    projectedQuads.push({
      points: [
        projected[0].p2d,
        projected[1].p2d,
        projected[2].p2d,
        projected[3].p2d
      ],
      depth: avgDepth,
      color
    });
  }

  // Sort by depth (painter's algorithm - draw far quads first, near quads last)
  projectedQuads.sort((a, b) => a.depth - b.depth);

  // Draw all quads as solid shapes
  for (const quad of projectedQuads) {
    buffer.drawQuad(
      quad.points[0].x, quad.points[0].y,
      quad.points[1].x, quad.points[1].y,
      quad.points[2].x, quad.points[2].y,
      quad.points[3].x, quad.points[3].y,
      quad.color
    );
  }
}

// Aspect ratio for the torus canvas (4:3)
const ASPECT_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT;

// UI chrome height (buttons bar)
const UI_HEIGHT = 40;

/**
 * Main app builder function
 */
export function createTorusApp(a: App, win?: ITsyneWindow | null, windowWidth?: number, windowHeight?: number): void {
  const store = new TorusStore();
  let animationTimer: ReturnType<typeof setTimeout> | null = null;
  let lastFrameTime = Date.now();
  let raster: TappableCanvasRaster | null = null;

  // Current canvas size (can be resized)
  let canvasWidth = CANVAS_WIDTH;
  let canvasHeight = CANVAS_HEIGHT;

  // Create pixel buffer for software rendering (will be recreated on resize)
  let pixelBuffer = new PixelBuffer(canvasWidth, canvasHeight);

  // Create projection (will be updated on resize)
  const projection = new TorusProjection({
    focalLength: 300,
    center: { x: canvasWidth / 2, y: canvasHeight / 2 },
  });

  // Resize the canvas while maintaining aspect ratio
  const resizeCanvas = async (availWidth: number, availHeight: number) => {
    // Calculate new size maintaining aspect ratio
    let newWidth = availWidth;
    let newHeight = Math.round(newWidth / ASPECT_RATIO);

    if (newHeight > availHeight) {
      newHeight = availHeight;
      newWidth = Math.round(newHeight * ASPECT_RATIO);
    }

    // Ensure minimum size
    newWidth = Math.max(200, newWidth);
    newHeight = Math.max(150, newHeight);

    if (newWidth !== canvasWidth || newHeight !== canvasHeight) {
      canvasWidth = newWidth;
      canvasHeight = newHeight;

      // Recreate pixel buffer with new size
      pixelBuffer = new PixelBuffer(canvasWidth, canvasHeight);

      // Update projection center
      projection.setCenter({ x: canvasWidth / 2, y: canvasHeight / 2 });

      // Resize the raster widget
      if (raster) {
        await raster.resize(canvasWidth, canvasHeight);
      }
    }
  };

  const buildContent = () => {
    a.border({
      center: () => {
        // Use aspectRatio to maintain 4:3 ratio as window resizes
        a.aspectRatio(ASPECT_RATIO, () => {
          // Create the tappable canvas raster with drag support for rotation
          raster = a.tappableCanvasRaster(canvasWidth, canvasHeight, {
            onDrag: (x: number, y: number, deltaX: number, deltaY: number) => {
              // Convert drag delta to rotation
              const sensitivity = 0.01;
              store.setRotation(
                store.getState().rotationTheta + deltaX * sensitivity,
                store.getState().rotationPhi + deltaY * sensitivity,
                store.getState().rotationPsi
              );
            },
            onTap: () => {
              // Toggle auto-rotate on tap
              store.toggleAutoRotate();
            }
          });
        });
      },
      bottom: () => {
        // Control buttons
        a.hbox(() => {
          a.button('Toggle Auto-Rotate').onClick(() => {
            store.toggleAutoRotate();
          }).withId('autoRotateBtn');

          a.button('Reset View').onClick(() => {
            store.resetView();
          }).withId('resetBtn');

          a.spacer();

          a.label('Drag to rotate • Tap to toggle auto-rotate').withId('hintLabel');
        });
      }
    });
  };

  // Render function - draws to pixel buffer and updates raster
  const render = async () => {
    if (!raster) return;

    const state = store.getState();

    // Update projection with current rotation
    projection.setRotation({
      theta: state.rotationTheta,
      phi: state.rotationPhi,
      psi: state.rotationPsi,
    });

    // Render torus to pixel buffer
    renderTorusToBuffer(pixelBuffer, projection, MAJOR_RADIUS, MINOR_RADIUS, SEGMENTS_U, SEGMENTS_V);

    // Get the raw buffer data and send it efficiently
    const rawData = pixelBuffer.getRawData();
    await raster.setPixelBuffer(rawData);
  };

  // Animation loop
  const animate = async () => {
    const now = Date.now();
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    const state = store.getState();
    if (state.autoRotate) {
      store.incrementRotation(
        dt * AUTO_ROTATE_SPEED_THETA,
        dt * AUTO_ROTATE_SPEED_PHI,
        dt * AUTO_ROTATE_SPEED_PSI
      );
    }

    await render();

    animationTimer = setTimeout(animate, 33);  // ~30fps for raster updates
  };

  // Start animation
  const startAnimation = () => {
    setTimeout(async () => {
      await render();
      animate();
    }, 100);
  };

  // Cleanup function
  const cleanup = () => {
    if (animationTimer) {
      clearTimeout(animationTimer);
      animationTimer = null;
    }
  };

  // Register cleanup with app
  a.registerCleanup(cleanup);

  // Setup window content and resize handler
  const setupWindow = (w: Window | ITsyneWindow) => {
    w.setContent(buildContent);

    // Handle window resize - maintain aspect ratio
    w.onResize(async (newWidth: number, newHeight: number) => {
      const availWidth = Math.max(100, newWidth - 20);
      const availHeight = Math.max(100, newHeight - UI_HEIGHT - 20);
      await resizeCanvas(availWidth, availHeight);
      await render();
    });
  };

  if (win) {
    // PhoneTop/embedded mode with injected window
    setupWindow(win);
    win.show();
    startAnimation();
  } else {
    // Standalone mode - create our own window
    a.window({ title: 'Interactive 3D Torus', width: 850, height: 680 }, (w: Window) => {
      setupWindow(w);
      w.show();
      startAnimation();
    });
  }
}

// Standalone execution
if (require.main === module) {
  app(resolveTransport(), { title: 'Torus' }, (a: App) => createTorusApp(a));
}
