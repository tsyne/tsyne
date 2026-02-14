/**
 * Canvas Interop Experiment — Can CosyneContext and CvgContext share one canvas?
 *
 * Tests three composition strategies with click handling on every shape.
 *
 * Color key (consistent across all strategies):
 *   GREEN  — CVG elements        (onClick attr + enableEvents())
 *   ORANGE — cosyne-classic      (no native onClick)
 *   BLUE   — tsyne base canvas   (TappableCanvasRectangle hit-areas over cosyne-classic shapes)
 *
 * Run: npx tsx cosyne/demos/canvas-interop-experiment.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, CosyneContext } from 'cosyne';
import { cvg, CvgContext } from '../src';

const W = 400;
const H = 400;

type ComponentType = 'cvg' | 'cosyne-classic' | 'tsyne';

function log(strategy: number, component: ComponentType, shape: string) {
  console.log(`[Strategy ${strategy}] [${component}] ${shape} clicked`);
}

// ─── Strategy 1: Both in one canvasStack ──────────────────────

function strategy1(a: App): CvgContext {
  let cvgCtx!: CvgContext;

  a.stack(() => {
    a.canvasRectangle({ width: W, height: H, fillColor: 'transparent' });
    a.canvasStack(() => {
      // ORANGE — cosyne-classic shapes
      cosyne(a, (c: CosyneContext) => {
        c.rect(0, 0, W, H).fill('#2e1a0a');
        c.circle(120, 200, 60).fill('#e67e22').stroke('#fad7a0', 2);
        c.rect(40, 320, 160, 40).fill('#d35400').stroke('#fad7a0', 1);
      });

      // BLUE — tsyne hit-areas (visible tint over cosyne-classic shapes)
      a.canvasRectangle({ x: 60, y: 140, width: 120, height: 120, fillColor: '#2980b920', strokeColor: '#3498db',
        onClick: () => log(1, 'tsyne', 'circle hit-area') });
      a.canvasRectangle({ x: 40, y: 320, width: 160, height: 40, fillColor: '#2980b920', strokeColor: '#3498db',
        onClick: () => log(1, 'tsyne', 'rect hit-area') });

      // GREEN — CVG shapes
      cvgCtx = cvg(a, { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, (s) => {
        s.circle({ cx: 280, cy: 200, r: 60, fill: '#27ae60', stroke: '#a9dfbf', 'stroke-width': 2,
          onClick: () => log(1, 'cvg', 'circle') });
        s.path({
          d: 'M280,120 L295,175 L350,175 L305,205 L320,260 L280,230 L240,260 L255,205 L210,175 L265,175 Z',
          fill: '#2ecc71', 'fill-opacity': 0.7,
          onClick: () => log(1, 'cvg', 'star'),
        });
        s.text(
          { x: W / 2, y: 380, 'text-anchor': 'middle', fill: '#d5f5e3', 'font-size': 16,
            onClick: () => log(1, 'cvg', 'text label') },
          'Strategy 1: Both in one canvasStack',
        );
      });
      cvgCtx.enableEvents();
    });
  });
  return cvgCtx;
}

// ─── Strategy 2: Classic foreground (drawn second) ─────────────

function strategy2(a: App): CvgContext {
  let cvgCtx!: CvgContext;

  a.stack(() => {
    a.canvasRectangle({ width: W, height: H, fillColor: 'transparent' });
    a.canvasStack(() => {
      // GREEN — CVG background layer
      cvgCtx = cvg(a, { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, (s) => {
        s.rect({ x: 0, y: 0, width: W, height: H, fill: '#0a2e1a',
          onClick: () => log(2, 'cvg', 'background rect') });
        s.circle({ cx: 200, cy: 200, r: 120, fill: '#145a32', stroke: '#27ae60', 'stroke-width': 2,
          onClick: () => log(2, 'cvg', 'big circle') });
        s.text(
          { x: W / 2, y: 30, 'text-anchor': 'middle', fill: '#a9dfbf', 'font-size': 14,
            onClick: () => log(2, 'cvg', 'text label') },
          'CVG background',
        );
      });
      cvgCtx.enableEvents();

      // ORANGE — cosyne-classic foreground
      cosyne(a, (c: CosyneContext) => {
        c.circle(200, 200, 40).fill('#e67e22').stroke('#fad7a0', 2);
        c.line(160, 160, 240, 240).stroke('#f39c12', 3);
        c.line(240, 160, 160, 240).stroke('#f39c12', 3);
      });

      // BLUE — tsyne hit-area
      a.canvasRectangle({ x: 160, y: 160, width: 80, height: 80, fillColor: '#2980b920', strokeColor: '#3498db',
        onClick: () => log(2, 'tsyne', 'circle + X hit-area') });
    });
  });
  return cvgCtx;
}

// ─── Strategy 3: CVG foreground (drawn second) ────────────────

function strategy3(a: App): CvgContext {
  let cvgCtx!: CvgContext;

  a.stack(() => {
    a.canvasRectangle({ width: W, height: H, fillColor: 'transparent' });
    a.canvasStack(() => {
      // ORANGE — cosyne-classic background
      cosyne(a, (c: CosyneContext) => {
        c.rect(0, 0, W, H).fill('#2e1a0a');
        for (let x = 40; x < W; x += 40) {
          for (let y = 40; y < H; y += 40) {
            c.circle(x, y, 8).fill('#d35400').stroke('#f39c12', 1);
          }
        }
      });

      // BLUE — tsyne hit-areas for a few grid dots (top-left corner)
      a.canvasRectangle({ x: 24, y: 24, width: 32, height: 32, fillColor: '#2980b920', strokeColor: '#3498db',
        onClick: () => log(3, 'tsyne', 'grid dot (40,40) hit-area') });
      a.canvasRectangle({ x: 64, y: 24, width: 32, height: 32, fillColor: '#2980b920', strokeColor: '#3498db',
        onClick: () => log(3, 'tsyne', 'grid dot (80,40) hit-area') });
      a.canvasRectangle({ x: 24, y: 64, width: 32, height: 32, fillColor: '#2980b920', strokeColor: '#3498db',
        onClick: () => log(3, 'tsyne', 'grid dot (40,80) hit-area') });

      // GREEN — CVG foreground overlay
      cvgCtx = cvg(a, { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, (s) => {
        s.rect({
          x: 80, y: 80, width: 240, height: 240,
          fill: '#27ae60', 'fill-opacity': 0.3, stroke: '#a9dfbf', 'stroke-width': 2,
          onClick: () => log(3, 'cvg', 'rect overlay'),
        });
        s.circle({ cx: 200, cy: 200, r: 80, fill: '#2ecc71', 'fill-opacity': 0.5, stroke: '#a9dfbf', 'stroke-width': 2,
          onClick: () => log(3, 'cvg', 'circle') });
        s.text(
          { x: W / 2, y: 200, 'text-anchor': 'middle', fill: '#d5f5e3', 'font-size': 18,
            onClick: () => log(3, 'cvg', '"CVG on top" text') },
          'CVG on top',
        );
        s.text(
          { x: W / 2, y: 380, 'text-anchor': 'middle', fill: '#a9dfbf', 'font-size': 12,
            onClick: () => log(3, 'cvg', 'bottom label') },
          'Strategy 3: CVG foreground over Classic grid',
        );
      });
      cvgCtx.enableEvents();
    });
  });
  return cvgCtx;
}

// ─── Standalone ───────────────────────────────────────────────

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Canvas Interop' }, async (a: App) => {
    const win = a.window(
      { title: 'CosyneContext + CvgContext Interop', width: W * 3 + 40, height: H + 80, padded: true },
      () => {
        a.hbox(() => {
          a.vbox(() => { a.label('1. Classic + CVG side by side'); strategy1(a); });
          a.vbox(() => { a.label('2. Classic over CVG');         strategy2(a); });
          a.vbox(() => { a.label('3. CVG over Classic');         strategy3(a); });
        });
      },
    );

    await win.show();
  });

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
