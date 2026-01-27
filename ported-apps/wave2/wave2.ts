/**
 * Wave2 Canvas Demo - Pseudo-Declarative Style
 *
 * Port of hakimel's wave CodePen using extracted utility functions
 * and pseudo-declarative composition patterns.
 *
 * @tsyne-app:name Wave2
 * @tsyne-app:icon mediaVideo
 * @tsyne-app:category fun
 * @tsyne-app:args (a: App, win?: ITsyneWindow) => void
 */

import { App, CanvasPath, refreshAllBindings, asRenderTarget } from 'tsyne';
import type { Window, ITsyneWindow, IRenderTarget } from 'tsyne';
import { CosyneContext, cosyne, refreshAllCosyneContexts, enableEventHandling } from 'cosyne';

// Canvas dimensions
const W = 600;
const H = 600;

// Color schemes [background, foreground]
const colors: [string, string][] = [
  ['#222222', '#ffffff'],
  ['#ffffff', '#222222'],
];

// ============================================================================
// Extracted utility functions - reusable for any wave-like effect
// ============================================================================

interface WavePoint {
  nx: number;  // natural x position
  ny: number;  // natural y position
  x: number;   // animated x position
  y: number;   // animated y position
}

interface WaveLine {
  points: WavePoint[];
}

/**
 * Create wave line geometry - extracted for reusability
 */
function createWaveLines(w: number, h: number, lineCount = 16, pointCount = 20): WaveLine[] {
  const lines: WaveLine[] = [];
  const radius = Math.min(w, h) * 0.5;
  const spacingH = (radius * 2) / pointCount;
  const spacingV = (radius * 2) / lineCount;

  for (let v = 1; v < lineCount; v++) {
    const spread = 1.1 - Math.abs(v - lineCount / 2) / (lineCount * 0.6);
    const pts = pointCount * spread;
    const offsetX = w / 2 - (pointCount * spacingH) / 2 + radius - (pts * spacingH) / 2;
    const offsetY = h / 2 - (lineCount * spacingV) / 2;

    lines.push({
      points: Array.from({ length: Math.floor(pts) }, (_, h) => ({
        nx: offsetX + h * spacingH,
        ny: offsetY + v * spacingV,
        x: 0,
        y: 0,
      })),
    });
  }
  return lines;
}

/**
 * Convert points to SVG path with quadratic Bezier curves
 * Matches original's context.quadraticCurveTo() behavior
 */
function pointsToSvgPath(points: WavePoint[]): string {
  return points
    .map((p, i, arr) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const next = arr[i + 1];
      if (next) {
        const cpx = p.x + (next.x - p.x) / 2;
        const cpy = p.y + (next.y - p.y) / 2;
        return `Q ${p.x} ${p.y} ${cpx} ${cpy}`;
      }
      return '';
    })
    .join(' ');
}

/**
 * Update wave points with sine animation
 */
function updateWavePoints(lines: WaveLine[], step: number): void {
  lines.forEach((line) => {
    line.points.forEach((p) => {
      p.x = p.nx;
      p.y = p.ny + Math.sin((p.x + step) / 50) * 30;
    });
  });
}

// ============================================================================
// Pseudo-declarative composition
// ============================================================================

/**
 * Build wave2 app - pseudo-declarative style
 */
export function buildWave2App(a: App, target: IRenderTarget): () => void {
  const lines = createWaveLines(W, H);
  let step = 0;
  let colorIdx = 0;
  const paths: CanvasPath[] = [];

  let keepRunning = true;

  target.setContent(() => {
    a.vbox(() => {
      a.label('Click to toggle colors');

      a.canvasStack(() => {
        // Background with click-to-toggle (using Cosyne for event handling)
        const ctx = cosyne(a, (c: CosyneContext) => {
          c.rect(0, 0, W, H)
            .bindFill(() => colors[colorIdx][0])
            .onClick(() => {
              colorIdx = (colorIdx + 1) % colors.length;
            });
        });
        enableEventHandling(ctx, a, { width: W, height: H });

        // One path per wave line - declarative iteration
        for (let i = 0; i < lines.length; i++) {
          const idx = i; // capture for closure
          paths.push(
            a.canvasPath({
              width: W,
              height: H,
              path: pointsToSvgPath(lines[idx].points),
              strokeColor: colors[colorIdx][1],
              strokeWidth: 6,
              lineCap: 'round',
              lineJoin: 'round',
            })
          );
        }
      });
    });
  });

  // Animation loop - update points and refresh bindings
  const animate = async () => {
    while (keepRunning) {
      updateWavePoints(lines, ++step);

      // Update each path with new geometry and current color
      for (let i = 0; i < paths.length; i++) {
        paths[i].update({
          path: pointsToSvgPath(lines[i].points),
          strokeColor: colors[colorIdx][1],
        });
      }

      refreshAllCosyneContexts(); // For background color binding
      await refreshAllBindings();
      await new Promise(resolve => setTimeout(resolve, 16));
    }
  };
  animate();

  return () => { keepRunning = false; };
}

// ============================================================================
// Entry points
// ============================================================================

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport, getAppMetadata, screenshotIfRequested } = require('tsyne');

  const meta = getAppMetadata();
  app(resolveTransport(), { title: meta?.name ?? 'Wave2' }, (a: App) => {
    a.window({ title: 'Wave2', width: W + 40, height: H + 80 }, (win: Window) => {
      const target = asRenderTarget(win as ITsyneWindow);
      const cleanup = buildWave2App(a, target);
      win.setCloseIntercept(() => {
        cleanup();
        return true;
      });
      win.show();
      screenshotIfRequested(win, 500);
    });
  });
}

// PhoneTop embedded entry point
export default function (a: App, win?: ITsyneWindow): void {
  const target = asRenderTarget(win);
  const cleanup = buildWave2App(a, target);
  target.onClose?.(() => cleanup());
}
