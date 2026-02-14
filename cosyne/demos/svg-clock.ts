/**
 * Analog Clock — Declarative cosyne-svg with SVG transform composition.
 *
 * Three layers of reuse:
 *   1. Geometry functions (markerLine, handLine) — pure math
 *   2. drawClockFace() — reusable SVG component, draws into current coordinate space
 *   3. createClock() — single-clock factory for embedding and tests
 *
 * The standalone demo composes four clock faces in one viewBox:
 * a normal clock and three mirrored reflections (horizontal,
 * vertical, both), using only SVG transform groups.
 *
 * Run: npx tsx cosyne/demos/svg-clock.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cvg, CvgContext } from '../src';

// ─── Constants ───────────────────────────────────────────────

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 90;

export { SIZE, CENTER, RADIUS };

// ─── Geometry ────────────────────────────────────────────────

/** Hour marker tick line (0-11). */
export function markerLine(hour: number) {
  const angle = (hour / 12) * 2 * Math.PI - Math.PI / 2;
  const r0 = RADIUS * 0.85;
  const r1 = RADIUS * 0.95;
  return {
    x1: CENTER + Math.cos(angle) * r0,
    y1: CENTER + Math.sin(angle) * r0,
    x2: CENTER + Math.cos(angle) * r1,
    y2: CENTER + Math.sin(angle) * r1,
  };
}

/** Clock hand endpoint from rotation (0 = 12 o'clock, 0.5 = 6 o'clock). */
export function handLine(rotation: number, length: number) {
  const angle = rotation * 2 * Math.PI - Math.PI / 2;
  return {
    x1: CENTER,
    y1: CENTER,
    x2: CENTER + Math.cos(angle) * length,
    y2: CENTER + Math.sin(angle) * length,
  };
}

// ─── Reusable SVG component ─────────────────────────────────

/**
 * Draw a clock face into the current SVG coordinate space (200x200).
 *
 * This is a pure SVG component — it draws at (0,0) in whatever
 * coordinate space the caller establishes. Wrap it in `s.g()`
 * with a transform to translate, scale, rotate, or mirror it.
 *
 * @param s      CvgContext to draw into
 * @param time   Function returning the current Date
 */
export function drawClockFace(s: CvgContext, time: () => Date) {
  const hourRotation = () => {
    const t = time();
    return (t.getHours() % 12 + t.getMinutes() / 60) / 12;
  };
  const minRotation = () => {
    const t = time();
    return (t.getMinutes() + t.getSeconds() / 60) / 60;
  };
  const secRotation = () => time().getSeconds() / 60;

  // Face
  s.circle({ cx: CENTER, cy: CENTER, r: RADIUS, fill: '#f5f5f5', stroke: '#333', 'stroke-width': 3 });

  // Hour markers
  for (let i = 0; i < 12; i++) {
    s.line({ ...markerLine(i), stroke: '#333', 'stroke-width': i % 3 === 0 ? 3 : 1 });
  }

  // Hands with bound positions
  s.line({ ...handLine(hourRotation(), RADIUS * 0.5), stroke: '#333', 'stroke-width': 4 })
    .name('hour')
    .bindPos(() => handLine(hourRotation(), RADIUS * 0.5));

  s.line({ ...handLine(minRotation(), RADIUS * 0.75), stroke: '#333', 'stroke-width': 3 })
    .name('minute')
    .bindPos(() => handLine(minRotation(), RADIUS * 0.75));

  s.line({ ...handLine(secRotation(), RADIUS * 0.85), stroke: '#e74c3c', 'stroke-width': 1 })
    .name('second')
    .bindPos(() => handLine(secRotation(), RADIUS * 0.85));

  // Center dot
  s.circle({ cx: CENTER, cy: CENTER, r: 5, fill: '#333' });
}

// ─── Single-clock factory ────────────────────────────────────

/**
 * Create a single clock in its own SVG context.
 *
 * @param a     Tsyne App
 * @param time  Function returning the current Date (injectable for testing)
 * @param opts  Canvas dimensions
 * @returns     The CvgContext (already polling)
 */
export function createClock(
  a: App,
  time: () => Date = () => new Date(),
  opts: { width?: number; height?: number } = {},
): CvgContext {
  const w = opts.width ?? 250;
  const h = opts.height ?? 250;

  const svgCtx = cvg(a, { viewBox: `0 0 ${SIZE} ${SIZE}`, width: w, height: h }, (s) => {
    drawClockFace(s, time);
  });

  svgCtx.poll(1000);
  return svgCtx;
}

// ─── Standalone: mirror composition demo ─────────────────────

if (require.main === module) {
  const GAP = 20;
  const SCENE_W = SIZE * 2 + GAP;
  const SCENE_H = SIZE * 2 + GAP;

  const appInstance = app(resolveTransport(), { title: 'Mirror Clock' }, async (a: App) => {
    let svgCtx: CvgContext;
    const now = () => new Date();

    const win = a.window({ title: 'Mirror Clock', width: 500, height: 500, padded: false }, () => {
      a.stack(() => {
        const mirror = (sx: number, sy: number) => {
          const flips = (sx < 0 ? 1 : 0) + (sy < 0 ? 1 : 0);
          const opacity = [1, 0.5, 0.25][flips];
          const tx = sx < 0 ? SCENE_W : 0;
          const ty = sy < 0 ? SCENE_H : 0;
          return { opacity, tx, ty, sx, sy };
        };

        svgCtx = cvg(a, { viewBox: `0 0 ${SCENE_W} ${SCENE_H}`, width: 500, height: 500 }, (s) => {
          for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
            const m = mirror(sx, sy);
            s.g({ transform: { translate: [m.tx, m.ty], scale: [m.sx, m.sy] }, opacity: m.opacity }, () => {
              drawClockFace(s, now);
            });
          }
        });
        svgCtx!.poll(1000);
      });
    });

    await win.show();
    win.onResize((w: number, h: number) => {
      svgCtx.resize(w, h);
    });
  });

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
