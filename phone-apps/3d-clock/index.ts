#!/usr/bin/env npx tsx
/**
 * Cosyne 3D Demo: 3D Clock
 *
 * Demonstrates:
 * - Continuous animation loops
 * - Time-based rotation bindings
 * - Hierarchy and camera controls
 * - High-performance buffer rendering
 */

import { app, resolveTransport } from '../../core/src/index';
import { cosyne3d, renderer3d, createRenderTarget, RenderTarget } from '../../cosyne/src/index3d';

// ============================================================================
// State
// ============================================================================

export const timeState = { now: new Date() };

export const cameraState = {
  radius: 20,
  theta: Math.PI / 2,
  phi: Math.PI / 2,
  lookAt: [0, 0, 0] as [number, number, number],
};

// ============================================================================
// Camera Helpers
// ============================================================================

export function computeSphericalCameraPosition(): [number, number, number] {
  const { radius, phi, theta } = cameraState;
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

export function orbitCameraByDragDelta(deltaX: number, deltaY: number): void {
  const sensitivity = 0.01;
  const epsilon = 0.1;
  cameraState.theta -= deltaX * sensitivity;
  cameraState.phi = Math.max(epsilon, Math.min(Math.PI - epsilon, cameraState.phi - deltaY * sensitivity));
}

export function zoomCameraByScrollDelta(deltaY: number): void {
  const zoomSpeed = 0.05;
  const factor = 1 + (deltaY > 0 ? 1 : -1) * zoomSpeed;
  cameraState.radius = Math.max(2, Math.min(100, cameraState.radius * factor));
}

// ============================================================================
// Clock Geometry Helpers
// ============================================================================

function createClockFaceRingSegment(ctx: any, segmentIndex: number, totalSegments: number, radius: number, thickness: number): void {
  const angle1 = (segmentIndex / totalSegments) * Math.PI * 2;
  const angle2 = ((segmentIndex + 1) / totalSegments) * Math.PI * 2;
  const midAngle = (angle1 + angle2) / 2;
  const segmentLength = 2 * radius * Math.sin(Math.PI / totalSegments);

  ctx.box({
    size: [thickness, segmentLength, thickness],
    position: [Math.sin(midAngle) * radius, Math.cos(midAngle) * radius, 0.1],
    rotation: [0, 0, -midAngle],
  }).setMaterial({ color: '#444444' });
}

function createHourMarker(ctx: any, hourIndex: number, radius: number): void {
  const angle = (hourIndex / 12) * Math.PI * 2;
  ctx.box({ size: [0.2, 0.5, 0.1], position: [Math.sin(angle) * radius, Math.cos(angle) * radius, 0.2] })
    .setRotation([0, 0, -angle])
    .setMaterial({ color: '#333333' });
}

function createRotatingHandWithPivotAtOrigin(
  ctx: any,
  width: number,
  length: number,
  zDepth: number,
  color: string,
  getAngle: () => number
): void {
  ctx.box({ size: [width, length, 0.1] })
    .setMaterial({ color })
    .bindPosition(() => {
      const angle = getAngle();
      return [-length / 2 * Math.sin(-angle), length / 2 * Math.cos(-angle), zDepth];
    })
    .bindRotation(() => [0, 0, -getAngle()]);
}

// ============================================================================
// Time Angle Calculations
// ============================================================================

export const getHourHandAngle = () => (timeState.now.getHours() % 12 + timeState.now.getMinutes() / 60) / 12 * Math.PI * 2;
export const getMinuteHandAngle = () => (timeState.now.getMinutes() + timeState.now.getSeconds() / 60) / 60 * Math.PI * 2;
export const getSecondHandAngleSmoothWithMilliseconds = () => (timeState.now.getSeconds() + timeState.now.getMilliseconds() / 1000) / 60 * Math.PI * 2;

// ============================================================================
// Animation Loop Management
// ============================================================================

function startAnimationLoopUpdatingTimeAndRenderingAt20Fps(renderFrame: () => void): ReturnType<typeof setInterval> {
  return setInterval(() => {
    timeState.now = new Date();
    renderFrame();
  }, 50);
}

function createCleanupHandlerThatStopsAnimationOnWindowClose(
  getInterval: () => ReturnType<typeof setInterval> | undefined,
  clearIntervalRef: () => void
): () => Promise<boolean> {
  return async () => {
    const interval = getInterval();
    if (interval) {
      clearInterval(interval);
      clearIntervalRef();
    }
    return true;
  };
}

// ============================================================================
// Main App
// ============================================================================

export function buildClockApp(a: any) {
  a.window({ title: '3D Clock', width: 600, height: 600 }, (win: any) => {
    const WIDTH = 600, HEIGHT = 600;
    const renderTarget: RenderTarget = createRenderTarget(WIDTH, HEIGHT);
    let canvas: any = null;
    let animationInterval: ReturnType<typeof setInterval> | undefined;

    const scene = cosyne3d(a, (ctx) => {
      // Camera
      ctx.setCamera({ fov: 45, lookAt: cameraState.lookAt })
        .bindPosition(computeSphericalCameraPosition);

      // Lighting
      ctx.light({ type: 'ambient', intensity: 0.4 });
      ctx.light({ type: 'directional', direction: [-0.5, -0.5, -1], intensity: 0.8 });

      // Clock face ring (64 segments)
      for (let i = 0; i < 64; i++) createClockFaceRingSegment(ctx, i, 64, 5, 0.05);

      // Hour markers
      for (let i = 0; i < 12; i++) createHourMarker(ctx, i, 4.5);

      // Center pin
      ctx.cylinder({ radius: 0.2, height: 0.6, position: [0, 0, 0.3], rotation: [Math.PI / 2, 0, 0] })
        .setMaterial({ color: '#333333' });

      // Hands
      createRotatingHandWithPivotAtOrigin(ctx, 0.3, 3, 0.3, '#333333', getHourHandAngle);
      createRotatingHandWithPivotAtOrigin(ctx, 0.2, 4.5, 0.4, '#666666', getMinuteHandAngle);
      createRotatingHandWithPivotAtOrigin(ctx, 0.1, 4.8, 0.5, '#cc0000', getSecondHandAngleSmoothWithMilliseconds);
    }, { width: WIDTH, height: HEIGHT, backgroundColor: '#b8d4e8' });

    const renderFrame = async () => {
      if (!canvas) return;
      scene.refreshBindings();
      await canvas.setPixelBuffer(renderer3d.renderToBuffer(scene, renderTarget));
    };

    win.setContent(() => {
      a.max(() => {
        canvas = a.tappableCanvasRaster(WIDTH, HEIGHT, {
          onDrag: async (_x: any, _y: any, deltaX: any, deltaY: any) => {
            orbitCameraByDragDelta(deltaX, deltaY);
            await renderFrame();
          },
          onScroll: async (_dx: any, dy: any) => {
            zoomCameraByScrollDelta(dy);
            await renderFrame();
          },
        });
      });
    });

    win.show();
    setTimeout(renderFrame, 100);

    animationInterval = startAnimationLoopUpdatingTimeAndRenderingAt20Fps(renderFrame);
    win.setCloseIntercept(createCleanupHandlerThatStopsAnimationOnWindowClose(
      () => animationInterval,
      () => { animationInterval = undefined; }
    ));
  });
}

if (require.main === module) {
  app(resolveTransport(), { title: '3D Clock' }, buildClockApp);
}
