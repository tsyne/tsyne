// @tsyne-app:name Torus
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="12" rx="10" ry="4" stroke="#CC0000"/><ellipse cx="12" cy="12" rx="6" ry="10" stroke="#CC0000"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" stroke="#880000"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-60 12 12)" stroke="#880000"/></svg>
// @tsyne-app:category demos
// @tsyne-app:builder createTorusApp
// @tsyne-app:args app,windowWidth,windowHeight

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
import type { App, Window, TappableCanvasRaster } from 'tsyne';
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
const SEGMENTS_U = 48;    // Segments around major circle
const SEGMENTS_V = 32;    // Segments around minor circle

// Animation parameters
const AUTO_ROTATE_SPEED_THETA = 0.5;  // Radians per second (yaw)
const AUTO_ROTATE_SPEED_PHI = 0.3;    // Radians per second (pitch)
const AUTO_ROTATE_SPEED_PSI = 0.2;    // Radians per second (roll)

// Colors
const BACKGROUND_COLOR = rgb(26, 26, 46);  // #1a1a2e

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
 * Render the torus with shaded surfaces to a pixel buffer
 */
export function renderTorusToBuffer(
  buffer: PixelBuffer,
  projection: TorusProjection,
  majorRadius: number = MAJOR_RADIUS,
  minorRadius: number = MINOR_RADIUS,
  segmentsU: number = SEGMENTS_U,
  segmentsV: number = SEGMENTS_V
): void {
  // Clear to background color
  buffer.clear(BACKGROUND_COLOR);

  const mesh = generateTorusMesh({ majorRadius, minorRadius, segmentsU, segmentsV });

  // Light direction in camera space: slightly from upper-right, towards the scene
  // This is the direction FROM the surface TO the light
  // Since camera looks towards -Z, surfaces with normal pointing towards +Z are facing the camera
  // Adding slight x,y offset creates a more 3D looking shading
  const lightDir = { x: 0.2, y: 0.2, z: 0.96 }; // pre-normalized (0.2^2 + 0.2^2 + 0.96^2 ≈ 1)

  // Project all quads and calculate their depth
  const projectedQuads: ProjectedQuad[] = [];

  for (let quadIdx = 0; quadIdx < mesh.quads.length; quadIdx++) {
    const quad = mesh.quads[quadIdx];
    const vertices = quad.vertices;

    // Calculate checkerboard pattern based on grid position
    const i = Math.floor(quadIdx / segmentsV);  // Position around major circle
    const j = quadIdx % segmentsV;               // Position around minor circle
    const isAlternate = (i + j) % 2 === 0;

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
    const shade = Math.max(0, dot) * 0.7 + 0.3; // 0.3 ambient, 0.7 diffuse

    // Alternate between red and orange in a checkerboard pattern
    let color;
    if (isAlternate) {
      // Red
      const red = Math.round(60 + shade * 195);
      color = rgb(red, 0, 0);
    } else {
      // Orange
      const red = Math.round(60 + shade * 195);
      const green = Math.round(30 + shade * 100);
      color = rgb(red, green, 0);
    }

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
  // In our coordinate system, larger Z = closer to camera, so sort ascending (smallest Z first = farthest first)
  projectedQuads.sort((a, b) => a.depth - b.depth);

  // Draw all quads
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

/**
 * Main app builder function
 */
export function createTorusApp(a: App, windowWidth?: number, windowHeight?: number): void {
  const store = new TorusStore();
  let animationTimer: ReturnType<typeof setTimeout> | null = null;
  let lastFrameTime = Date.now();
  let raster: TappableCanvasRaster | null = null;

  // Create pixel buffer for software rendering
  const pixelBuffer = new PixelBuffer(CANVAS_WIDTH, CANVAS_HEIGHT);

  // Create projection
  const projection = new TorusProjection({
    focalLength: 300,
    center: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
  });

  const buildContent = () => {
    a.vbox(() => {
      // Create the tappable canvas raster with drag support for rotation
      raster = a.tappableCanvasRaster(CANVAS_WIDTH, CANVAS_HEIGHT, {
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
    renderTorusToBuffer(pixelBuffer, projection);

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

  // Always create a window - PhoneTop intercepts this to create a StackPaneAdapter
  // Use app's default dimensions (PhoneTop ignores these via StackPaneAdapter)
  a.window({ title: 'Interactive 3D Torus', width: 850, height: 680 }, (win: Window) => {
    win.setContent(buildContent);

    // Cleanup on window close
    const origClose = win.close.bind(win);
    win.close = async () => {
      if (animationTimer) {
        clearTimeout(animationTimer);
        animationTimer = null;
      }
      return origClose();
    };

    win.show();
    startAnimation();
  });
}

// Standalone execution
if (require.main === module) {
  app(resolveTransport(), { title: 'Torus' }, createTorusApp);
}
