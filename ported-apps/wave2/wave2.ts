/**
 * Wave2 Canvas Demo - Cosyne
 *
 * Port of hakimel's wave CodePen
 * Animated sine wave lines with click-to-toggle color scheme.
 *
 * @tsyne-app:name Wave2
 * @tsyne-app:icon mediaVideo
 * @tsyne-app:category fun
 * @tsyne-app:args (a: App, win?: ITsyneWindow) => void
 */

import { App } from 'tsyne';
import type { Window, ITsyneWindow } from 'tsyne';
import { CosyneContext, cosyne, refreshAllCosyneContexts, enableEventHandling } from 'cosyne';

// Canvas dimensions
const WIDTH = 600;
const HEIGHT = 600;

// Color schemes (background, foreground)
const COLORS: [string, string][] = [
  ['#222222', '#ffffff'],
  ['#ffffff', '#222222'],
];

interface Point {
  nx: number;
  ny: number;
  x: number;
  y: number;
}

interface Line {
  points: Point[];
  ran: number;
}

/**
 * Observable state for wave animation
 */
export class Wave2State {
  step = 0;
  colorIndex = 0;
  lines: Line[] = [];

  constructor() {
    this.setup();
  }

  /**
   * Initialize wave lines
   */
  setup(): void {
    this.lines = [];

    const radius = Math.min(WIDTH, HEIGHT) * 0.5;
    const lineCount = 16;
    // Original used 20 points with quadratic curves. We use line segments,
    // so 40 points gives similar smoothness without curves.
    const pointCount = 40;
    const spacingH = (radius * 2) / pointCount;
    const spacingV = (radius * 2) / lineCount;

    for (let v = 1; v < lineCount; v++) {
      const line: Line = { points: [], ran: Math.random() };
      const spreadFactor = 1.1 - Math.abs(v - lineCount / 2) / (lineCount * 0.6);
      const points = pointCount * spreadFactor;

      let offsetX = WIDTH / 2 - (pointCount * spacingH) / 2;
      offsetX += radius - (points * spacingH) / 2;

      const offsetY = HEIGHT / 2 - (lineCount * spacingV) / 2;

      for (let h = 0; h < points; h++) {
        line.points.push({
          nx: offsetX + h * spacingH,
          ny: offsetY + v * spacingV,
          x: 0,
          y: 0,
        });
      }

      this.lines.push(line);
    }
  }

  /**
   * Toggle color scheme
   */
  toggleColor(): void {
    this.colorIndex = (this.colorIndex + 1) % COLORS.length;
  }

  /**
   * Get current background color
   */
  getBackgroundColor(): string {
    return COLORS[this.colorIndex][0];
  }

  /**
   * Get current foreground color
   */
  getForegroundColor(): string {
    return COLORS[this.colorIndex][1];
  }

  /**
   * Update animation step
   */
  update(): void {
    this.step += 1;

    // Update point positions with sine wave
    this.lines.forEach((line) => {
      line.points.forEach((point) => {
        point.x = point.nx;
        point.y = point.ny + Math.sin((point.x + this.step) / 50) * 30;
      });
    });
  }

  /**
   * Get SVG path string with quadratic curves for a line
   * Uses Q commands for smooth Bezier curves (matching original's quadraticCurveTo)
   */
  getSvgPath(lineIndex: number): string {
    const line = this.lines[lineIndex];
    if (!line || line.points.length === 0) return '';

    const parts: string[] = [];

    line.points.forEach((point, h) => {
      const nextPoint = line.points[h + 1];

      if (h === 0) {
        // Move to first point
        parts.push(`M ${point.x} ${point.y}`);
      } else if (nextPoint) {
        // Quadratic curve: control point is current, end point is midpoint to next
        const cpx = point.x + (nextPoint.x - point.x) / 2;
        const cpy = point.y + (nextPoint.y - point.y) / 2;
        parts.push(`Q ${point.x} ${point.y} ${cpx} ${cpy}`);
      }
    });

    return parts.join(' ');
  }
}

/**
 * Build the wave2 demo app
 */
export function buildWave2App(a: App, win?: Window | ITsyneWindow): () => void {
  const state = new Wave2State();

  const buildContent = () => {
    a.vbox(() => {
      a.label('Click to toggle colors').withId('instructions');

      a.canvasStack(() => {
        const ctx = cosyne(a, (c: CosyneContext) => {
          // Background rectangle with click handler
          c.rect(0, 0, WIDTH, HEIGHT)
            .bindFill(() => state.getBackgroundColor())
            .onClick(() => {
              state.toggleColor();
            })
            .withId('background');

          // Draw each wave line using line segments
          // Original uses quadraticCurveTo but Cosyne doesn't support animated paths
          // Using more points (set in setup) for smoother appearance
          state.lines.forEach((line, lineIndex) => {
            for (let i = 0; i < line.points.length - 1; i++) {
              const idx = i;
              const lidx = lineIndex;

              c.line(
                line.points[i].x || line.points[i].nx,
                line.points[i].y || line.points[i].ny,
                line.points[i + 1].x || line.points[i + 1].nx,
                line.points[i + 1].y || line.points[i + 1].ny,
                {
                  strokeColor: state.getForegroundColor(),
                  strokeWidth: 6,
                }
              )
                .bindEndpoint(() => {
                  const l = state.lines[lidx];
                  const p1 = l.points[idx];
                  const p2 = l.points[idx + 1];
                  return {
                    x1: p1.x,
                    y1: p1.y,
                    x2: p2.x,
                    y2: p2.y,
                  };
                })
                .bindStroke(() => state.getForegroundColor())
                .passthrough()
                .withId(`line-${lineIndex}-${i}`);
            }
          });
        });

        enableEventHandling(ctx, a, { width: WIDTH, height: HEIGHT });
      });
    });
  };

  if (win) {
    win.setContent(buildContent);
  } else {
    buildContent();
  }

  // Animation loop - 60fps
  const animationInterval = setInterval(() => {
    state.update();
    refreshAllCosyneContexts();
  }, 16);

  return () => clearInterval(animationInterval);
}

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport, getAppMetadata, screenshotIfRequested } = require('tsyne');

  const meta = getAppMetadata();
  app(resolveTransport(), { title: meta?.name ?? 'Wave2' }, (a: App) => {
    a.window({ title: 'Wave2', width: WIDTH + 40, height: HEIGHT + 80 }, (win: Window) => {
      const cleanup = buildWave2App(a, win);
      win.setCloseIntercept(() => {
        cleanup();
        process.exit(0);
        return true;
      });
      win.show();
      screenshotIfRequested(win, 500);
    });
  });
}

// PhoneTop embedded entry point
export default function (a: App, win?: ITsyneWindow): void {
  if (win) {
    const cleanup = buildWave2App(a, win);
    win.onClose(() => cleanup());
  } else {
    buildWave2App(a);
  }
}
