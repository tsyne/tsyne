/**
 * Analog Clock — Declarative cosyne-svg
 *
 * The entire clock is a pure scene description: SVG elements with bound
 * positions, driven by poll(). No imperative update loop, no class, no
 * manual interval management.
 *
 * Resizes with the window, maintaining circular aspect ratio via
 * svgCtx.resize() — the quasi-SVG transform trick: the viewBox stays
 * fixed at 200x200, only the mapping to canvas pixels changes.
 *
 * Run: npx tsx cosyne/demos/svg-clock.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { svg, SvgContext } from '../src';

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 90;

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

export { SIZE, CENTER, RADIUS };

/**
 * Build the clock scene into an existing canvasStack.
 *
 * @param a     Tsyne App
 * @param time  Function returning the current Date (injectable for testing)
 * @param opts  Canvas dimensions; mirror adds a horizontally-flipped copy
 * @returns     The SvgContext (already polling)
 */
export function createClock(
  a: App,
  time: () => Date = () => new Date(),
  opts: { width?: number; height?: number; mirror?: boolean } = {},
): SvgContext {
  const mirror = opts.mirror ?? false;
  const vbW = mirror ? SIZE * 2 + 20 : SIZE;  // 420 wide for two clocks + gap
  const w = opts.width ?? (mirror ? 500 : 250);
  const h = opts.height ?? 250;

  const hourRotation = () => {
    const t = time();
    return (t.getHours() % 12 + t.getMinutes() / 60) / 12;
  };
  const minRotation = () => {
    const t = time();
    return (t.getMinutes() + t.getSeconds() / 60) / 60;
  };
  const secRotation = () => time().getSeconds() / 60;

  /** Draw a single clock face (static + animated hands). */
  const drawClockFace = (s: any, prefix: string) => {
    s.circle({ cx: CENTER, cy: CENTER, r: RADIUS, fill: '#f5f5f5', stroke: '#333', 'stroke-width': 3 });
    for (let i = 0; i < 12; i++) {
      s.line({ ...markerLine(i), stroke: '#333', 'stroke-width': i % 3 === 0 ? 3 : 1 });
    }
    s.line({ ...handLine(hourRotation(), RADIUS * 0.5), stroke: '#333', 'stroke-width': 4 })
      .name(`${prefix}hour`)
      .bindPos(() => handLine(hourRotation(), RADIUS * 0.5));
    s.line({ ...handLine(minRotation(), RADIUS * 0.75), stroke: '#333', 'stroke-width': 3 })
      .name(`${prefix}minute`)
      .bindPos(() => handLine(minRotation(), RADIUS * 0.75));
    s.line({ ...handLine(secRotation(), RADIUS * 0.85), stroke: '#e74c3c', 'stroke-width': 1 })
      .name(`${prefix}second`)
      .bindPos(() => handLine(secRotation(), RADIUS * 0.85));
    s.circle({ cx: CENTER, cy: CENTER, r: 5, fill: '#333' });
  };

  const svgCtx = svg(a, { viewBox: `0 0 ${vbW} ${SIZE}`, width: w, height: h }, (s) => {
    // ── Normal clock on the left ──
    drawClockFace(s, '');

    if (mirror) {
      // ── Mirrored clock on the right ──
      // translate(420, 0) moves to right edge, scale(-1, 1) flips horizontally
      s.g({ transform: `translate(${vbW}, 0) scale(-1, 1)`, opacity: 0.5 }, () => {
        drawClockFace(s, 'mirror-');
      });
    }
  });

  svgCtx.poll(1000);
  return svgCtx;
}

// ── Standalone execution ──
if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Mirror Clock' }, async (a: App) => {
    let svgCtx: SvgContext;
    const win = a.window({ title: 'Mirror Clock', width: 620, height: 300, padded: false }, () => {
      a.stack(() => {
        svgCtx = createClock(a, undefined, { width: 620, height: 300, mirror: true });
      });
    });
    await win.show();
    win.onResize((w: number, h: number) => {
      svgCtx.resize(w, h);
    });
  });
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
