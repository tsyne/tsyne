#!/usr/bin/env npx tsx

/**
 * Interactive 3D Torus Demo
 *
 * Demonstrates:
 * - Parametric torus geometry generation
 * - 3D to 2D projection with rotation
 * - Interactive drag-based rotation
 * - Continuous animation
 * - Lambertian shading for depth perception
 * - Chromostereopsis-inspired red/blue colors
 */

import { app } from '../src';
import {
  cosyne,
  TorusProjection,
  generateTorusWireframe,
  calculateLambertianShade,
  getDefaultLightDirection,
  colorizeShade,
  type Point3D,
} from '../cosyne/src';

interface TorusState {
  rotationTheta: number;  // Yaw (Z-axis)
  rotationPhi: number;    // Pitch (X-axis)
  rotationPsi: number;    // Roll (Y-axis)
  autoRotate: boolean;
  isDragging: boolean;
  lastMouseX: number;
  lastMouseY: number;
  baseColor: { r: number; g: number; b: number };
  useChromostereopsis: boolean;
}

const state: TorusState = {
  rotationTheta: 0.5,
  rotationPhi: 0.3,
  rotationPsi: 0,
  autoRotate: true,
  isDragging: false,
  lastMouseX: 0,
  lastMouseY: 0,
  baseColor: { r: 255, g: 0, b: 0 },  // Red
  useChromostereopsis: true,
};

// Animation variables
let animationFrameId: number | null = null;
let lastFrameTime = Date.now();

function updateAnimation() {
  const now = Date.now();
  const deltaTime = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  if (state.autoRotate) {
    state.rotationTheta += deltaTime * 0.5;
    state.rotationPhi += deltaTime * 0.3;
    state.rotationPsi += deltaTime * 0.2;
  }

  animationFrameId = requestAnimationFrame(updateAnimation);
}

function renderTorusCanvas() {
  const canvasWidth = 800;
  const canvasHeight = 600;

  cosyne(app({ title: 'Interactive Torus' } as any, () => {}), (c) => {
    // Create projection and geometry
    const projection = new TorusProjection({
      focalLength: 300,
      center: { x: canvasWidth / 2, y: canvasHeight / 2 },
    });

    // Set initial rotation
    projection.setRotation({
      theta: state.rotationTheta,
      phi: state.rotationPhi,
      psi: state.rotationPsi,
    });

    // Generate torus wireframe (edges)
    const majorRadius = 80;
    const minorRadius = 30;
    const segmentsU = 20;
    const segmentsV = 15;

    const wireframe = generateTorusWireframe(majorRadius, minorRadius, segmentsU, segmentsV);
    const lightDir = getDefaultLightDirection();

    // Draw torus edges with shading
    for (const line of wireframe) {
      let lastPoint: Point3D | null = null;

      for (const point of line) {
        const proj = projection.project(point);
        const alpha = projection.getAlpha(point);

        if (alpha > 0.1) {
          // Calculate shading based on point normal
          const shade = calculateLambertianShade(point, lightDir, 0.3, 0.7);

          // Determine color
          let color: string;
          if (state.useChromostereopsis) {
            // Chromostereopsis-inspired: red for main object
            const r = Math.round(150 + (shade - 0.3) * 300);
            const g = 0;
            const b = 0;
            color = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          } else {
            // Standard shading
            const r = Math.round(state.baseColor.r * shade);
            const g = Math.round(state.baseColor.g * shade);
            const b = Math.round(state.baseColor.b * shade);
            color = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          }

          if (lastPoint) {
            const lastProj = projection.project(lastPoint);
            const lastAlpha = projection.getAlpha(lastPoint);

            c.line(lastProj.x, lastProj.y, proj.x, proj.y)
              .stroke(color)
              .strokeWidth(1.5)
              .alpha(Math.max(lastAlpha, alpha));
          }

          lastPoint = point;
        }
      }
    }

    // Draw reference circles for axis visualization
    c.circle(canvasWidth / 2, canvasHeight / 2, 5)
      .fill('#ffffff')
      .alpha(0.5);

    // Text info
    c.text(
      10,
      20,
      `θ: ${(state.rotationTheta * 180 / Math.PI).toFixed(1)}° φ: ${(state.rotationPhi * 180 / Math.PI).toFixed(1)}° ψ: ${(state.rotationPsi * 180 / Math.PI).toFixed(1)}°`
    )
      .fill('#ffffff')
      .fontSize(12)
      .alpha(0.8);

    c.text(10, 40, state.autoRotate ? 'Auto: ON (space to toggle)' : 'Auto: OFF (space to toggle)')
      .fill('#ffffff')
      .fontSize(12)
      .alpha(0.8);

    c.text(10, 60, 'Drag to rotate | Shift+Drag to change light')
      .fill('#cccccc')
      .fontSize(11)
      .alpha(0.6);
  });
}

app(
  { title: 'Interactive 3D Torus', width: 850, height: 650 },
  (a) => {
    a.window({ title: 'Interactive Torus', width: 850, height: 650 }, (win) => {
      win.setContent(async () => {
        a.vbox(async () => {
          // Canvas container
          const canvas = a.canvasStack(800, 600, (c) => {
            renderTorusCanvas();
          })
            .withId('torusCanvas');

          // Control panel
          a.hbox(() => {
            a.button('Toggle Auto-Rotate').onClick(() => {
              state.autoRotate = !state.autoRotate;
              renderTorusCanvas();
            });

            a.button('Reset View').onClick(() => {
              state.rotationTheta = 0.5;
              state.rotationPhi = 0.3;
              state.rotationPsi = 0;
              renderTorusCanvas();
            });

            a.button('Toggle Colors').onClick(() => {
              state.useChromostereopsis = !state.useChromostereopsis;
              renderTorusCanvas();
            });
          });

          // Set up event handling for rotation
          const canvasElement = a.canvasLine(0, 0, 0, 0).withId('eventCanvas');

          // Handle mouse drag for rotation
          let lastX = 0;
          let lastY = 0;

          canvasElement.onDrag((e) => {
            if (!state.isDragging) {
              state.isDragging = true;
              lastX = e.x;
              lastY = e.y;
            }

            const deltaX = e.x - lastX;
            const deltaY = e.y - lastY;

            state.rotationTheta += deltaX * 0.01;
            state.rotationPhi += deltaY * 0.01;

            lastX = e.x;
            lastY = e.y;

            renderTorusCanvas();
          });

          canvasElement.onDragEnd(() => {
            state.isDragging = false;
          });
        });
      });

      // Start animation loop
      updateAnimation();

      win.show();
    });
  }
);
