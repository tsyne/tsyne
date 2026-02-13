/**
 * Big Ben (Elizabeth Tower) — SVG transform composition demo.
 *
 * Reuses `drawClockFace()` from svg-clock.ts, placing it into an
 * architectural scene via a single `s.g({ transform })` group.
 * Zero modification to the clock component — pure SVG composition.
 *
 * Run: npx tsx cosyne/demos/svg-big-ben.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { svg, SvgContext } from '../src';
import { drawClockFace, SIZE } from './svg-clock';

// ─── Tower dimensions ───────────────────────────────────────

const VB_W = 200;
const VB_H = 500;
const MID = VB_W / 2;

// Colors
const STONE      = '#c9b98a';
const STONE_DARK = '#a89660';
const STONE_BAND = '#b8a878';
const TRIM       = '#8a7d5a';
const SPIRE_COL  = '#6b6b6b';
const SKY        = '#d4e6f1';

// ─── Reusable SVG component ─────────────────────────────────

/**
 * Draw a stylized Big Ben tower with a live clock face.
 *
 * @param s     SvgContext to draw into (expects ~200x500 viewBox)
 * @param time  Function returning the current Date
 */
export function drawBigBen(s: SvgContext, time: () => Date) {
  // Sky background
  s.rect({ x: 0, y: 0, width: VB_W, height: VB_H, fill: SKY });

  // ── Base ──────────────────────────────────────────────────
  const baseY = 440;
  const baseH = 60;
  s.rect({ x: 30, y: baseY, width: 140, height: baseH, fill: STONE_DARK });
  // Base detail lines
  for (const dy of [10, 20]) {
    s.line({ x1: 32, y1: baseY + dy, x2: 168, y2: baseY + dy, stroke: TRIM, 'stroke-width': 1 });
  }

  // ── Main shaft ────────────────────────────────────────────
  const shaftX = 55;
  const shaftW = 90;
  const shaftY = 200;
  const shaftH = baseY - shaftY;
  s.rect({ x: shaftX, y: shaftY, width: shaftW, height: shaftH, fill: STONE });

  // Horizontal bands on the shaft
  for (let row = 0; row < 5; row++) {
    const y = shaftY + 30 + row * 45;
    s.line({ x1: shaftX, y1: y, x2: shaftX + shaftW, y2: y, stroke: STONE_BAND, 'stroke-width': 2 });
  }

  // Small windows on the shaft
  for (let row = 0; row < 4; row++) {
    const wy = shaftY + 50 + row * 45;
    s.rect({ x: MID - 5, y: wy, width: 10, height: 15, fill: TRIM, rx: 2 });
  }

  // ── Clock housing ─────────────────────────────────────────
  const housingSize = 80;
  const housingX = MID - housingSize / 2;
  const housingY = 140;
  const housingH = shaftY - housingY;

  // Wider housing section
  s.rect({ x: housingX - 8, y: housingY, width: housingSize + 16, height: housingH, fill: STONE });
  // Decorative border
  s.rect({
    x: housingX - 10, y: housingY - 2,
    width: housingSize + 20, height: housingH + 4,
    fill: 'none', stroke: TRIM, 'stroke-width': 2,
  });

  // ── Clock face — transform composition ────────────────────
  const clockScale = housingSize / SIZE;
  const clockX = housingX;
  const clockY = housingY + (housingH - housingSize) / 2;

  s.g({ transform: `translate(${clockX}, ${clockY}) scale(${clockScale})` }, () => {
    drawClockFace(s, time);
  });

  // ── Belfry ────────────────────────────────────────────────
  const belfryX = 52;
  const belfryW = 96;
  const belfryY = 80;
  const belfryH = housingY - belfryY;

  s.rect({ x: belfryX, y: belfryY, width: belfryW, height: belfryH, fill: STONE });
  // Arched openings (simplified as dark rects with rounded tops)
  const archW = 16;
  const archH = 30;
  const archY = belfryY + 10;
  for (const ax of [MID - 28, MID - 8, MID + 12]) {
    s.rect({ x: ax, y: archY, width: archW, height: archH, fill: STONE_DARK, rx: 8 });
  }
  // Top band
  s.line({ x1: belfryX, y1: belfryY + 2, x2: belfryX + belfryW, y2: belfryY + 2, stroke: TRIM, 'stroke-width': 2 });

  // ── Spire ─────────────────────────────────────────────────
  const spireBase = belfryY;
  const spireTop = 10;
  s.polygon({
    points: `${MID},${spireTop} ${MID - 20},${spireBase} ${MID + 20},${spireBase}`,
    fill: SPIRE_COL,
  });
  // Spire detail — small horizontal line
  s.line({ x1: MID - 10, y1: spireBase - 20, x2: MID + 10, y2: spireBase - 20, stroke: TRIM, 'stroke-width': 1 });

  // ── Corner turrets (small rectangles flanking the belfry) ─
  for (const tx of [belfryX - 8, belfryX + belfryW]) {
    s.rect({ x: tx, y: belfryY + 5, width: 8, height: belfryH - 5, fill: STONE_DARK });
    // Tiny pinnacle
    s.polygon({
      points: `${tx + 4},${belfryY - 5} ${tx},${belfryY + 5} ${tx + 8},${belfryY + 5}`,
      fill: SPIRE_COL,
    });
  }
}

// ─── Standalone ─────────────────────────────────────────────

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Big Ben' }, async (a: App) => {
    let svgCtx: SvgContext;
    const now = () => new Date();

    const win = a.window({ title: 'Big Ben', width: 400, height: 700, padded: false }, () => {
      a.stack(() => {
        svgCtx = svg(a, { viewBox: `0 0 ${VB_W} ${VB_H}`, width: 400, height: 700 }, (s) => {
          drawBigBen(s, now);
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
