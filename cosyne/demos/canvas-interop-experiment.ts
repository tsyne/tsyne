/**
 * Canvas Interop Experiment — Can CosyneContext and CvgContext share one canvas?
 *
 * Tests six composition strategies with click handling on every shape.
 *
 * Row 1 — cosyne/CVG layering:
 *   GREEN  — CVG elements        (onClick attr + enableEvents())
 *   ORANGE — cosyne-classic      (no native onClick)
 *   BLUE   — tsyne base canvas   (TappableCanvasRectangle hit-areas over cosyne-classic shapes)
 *
 * Row 2 — GL canvas (Three.js) + overlay layering:
 *   4. GL canvas + CVG overlay in stack()           — does it render?
 *   5. GL canvas + clickable CVG buttons            — do clicks work over GL?
 *   6. GL canvas + Fyne button + CVG overlay        — native widgets over GL?
 *
 * Run: npx tsx cosyne/demos/canvas-interop-experiment.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, CosyneContext } from 'cosyne';
import { cvg, CvgContext } from '../src';
import { initThreeJSWidget } from '../../trine/integration/init';

const W = 400;
const H = 400;

type ComponentType = 'cvg' | 'cosyne-classic' | 'tsyne' | 'fyne';

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

// ─── Helper: start a spinning cube on a Three.js widget canvas ─

async function startSpinningCube(a: App, color: number, interactive: boolean) {
  const { THREE, canvas } = await initThreeJSWidget(a, { width: W, height: H, interactive });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
  camera.position.set(0, 0, 3);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040));

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshPhongMaterial({ color }),
  );
  scene.add(mesh);

  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas as any });
  renderer.setSize(W, H);

  const gl = renderer.getContext();
  const animate = async () => {
    mesh.rotation.x += 0.008;
    mesh.rotation.y += 0.012;
    renderer.render(scene, camera);
    if (gl?.flush) await (gl as any).flush();
    setTimeout(animate, 33);
  };
  animate();
  return canvas;
}

// ─── Strategy 4: GL spinning cube + CVG overlay in stack() ───
// Tests: does CVG render on top of a live GL scene?
// GL canvas is non-interactive (passive background).

function strategy4(a: App) {
  a.stack(() => {
    startSpinningCube(a, 0xe74c3c, false); // red cube, non-interactive

    a.canvasStack(() => {
      const cvgCtx = cvg(a, { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, (s) => {
        s.rect({ x: 0, y: 0, width: W, height: H, fill: '#000000', 'fill-opacity': 0.3 });
        s.text(
          { x: W / 2, y: 40, 'text-anchor': 'middle', fill: '#ffffff', 'font-size': 20 },
          'CVG Overlay on GL Canvas',
        );
        s.circle({ cx: 200, cy: 200, r: 80, fill: '#27ae60', 'fill-opacity': 0.4,
          stroke: '#a9dfbf', 'stroke-width': 2 });
        s.text(
          { x: W / 2, y: 380, 'text-anchor': 'middle', fill: '#a9dfbf', 'font-size': 12 },
          'Strategy 4: GL(non-interactive) + CVG',
        );
      });
      cvgCtx.enableEvents();
    });
  });
}

// ─── Strategy 5: GL cube + clickable CVG buttons ─────────────
// Tests: do CVG click handlers work over a GL canvas?
// GL canvas is non-interactive so CVG gets the clicks.

function strategy5(a: App) {
  let clickCount = 0;
  let cvgCtxRef: CvgContext;

  a.stack(() => {
    startSpinningCube(a, 0x3498db, false); // blue cube, non-interactive

    a.canvasStack(() => {
      cvgCtxRef = cvg(a, { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, (s) => {
        s.rect({ x: 0, y: 0, width: W, height: H, fill: '#000000', 'fill-opacity': 0.5 });

        s.text(
          { x: W / 2, y: 60, 'text-anchor': 'middle', fill: '#ffffff', 'font-size': 18 },
          'Clickable CVG Buttons over GL',
        );

        const click = (name: string) => {
          clickCount++;
          log(5, 'cvg', name);
          cvgCtxRef.refresh();
        };

        // "Play" button
        s.rect({ x: 120, y: 100, width: 160, height: 50, fill: '#27ae60', rx: 8,
          onClick: () => click('PLAY button') });
        s.text(
          { x: 200, y: 132, 'text-anchor': 'middle', fill: '#ffffff', 'font-size': 22,
            onClick: () => click('PLAY button') },
          'Play',
        );

        // "Settings" button
        s.rect({ x: 120, y: 170, width: 160, height: 50, fill: '#2980b9', rx: 8,
          onClick: () => click('SETTINGS button') });
        s.text(
          { x: 200, y: 202, 'text-anchor': 'middle', fill: '#ffffff', 'font-size': 22,
            onClick: () => click('SETTINGS button') },
          'Settings',
        );

        // "Guide" button
        s.rect({ x: 120, y: 240, width: 160, height: 50, fill: '#8e44ad', rx: 8,
          onClick: () => click('GUIDE button') });
        s.text(
          { x: 200, y: 272, 'text-anchor': 'middle', fill: '#ffffff', 'font-size': 22,
            onClick: () => click('GUIDE button') },
          'Guide',
        );

        // Click counter (updates via bindText + refresh)
        s.text(
          { x: W / 2, y: 340, 'text-anchor': 'middle', fill: '#f39c12', 'font-size': 14 },
          `Clicks: ${clickCount}`,
        ).bindText(() => `Clicks: ${clickCount}`);

        s.text(
          { x: W / 2, y: 380, 'text-anchor': 'middle', fill: '#a9dfbf', 'font-size': 12 },
          'Strategy 5: GL(non-interactive) + CVG buttons',
        );
      });
      cvgCtxRef!.enableEvents();
    });
  });
}

// ─── Strategy 6: GL cube + Fyne widgets ──────────────────────
// Tests: do native Fyne widgets work on top of an interactive GL canvas?

function strategy6(a: App) {
  a.stack(() => {
    startSpinningCube(a, 0x9b59b6, true); // purple cube, interactive

    // Fyne native widgets on top of GL
    a.vbox(() => {
      a.spacer();
      a.hbox(() => {
        a.spacer();
        a.vbox(() => {
          a.label('Fyne widgets over GL canvas');
          a.button('Native Button 1', { onClick: () => log(6, 'fyne', 'Button 1') });
          a.button('Native Button 2', { onClick: () => log(6, 'fyne', 'Button 2') });
        });
        a.spacer();
      });
      a.spacer();
    });
  });
}

// ─── Standalone ───────────────────────────────────────────────

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Canvas Interop' }, async (a: App) => {
    const win = a.window(
      { title: 'Canvas Interop Experiment', width: W * 3 + 40, height: H * 2 + 120, padded: true },
      () => {
        a.vbox(() => {
          // Row 1: cosyne/CVG layering (existing)
          a.label('Row 1 — Cosyne / CVG layering');
          a.hbox(() => {
            a.vbox(() => { a.label('1. Classic + CVG side by side'); strategy1(a); });
            a.vbox(() => { a.label('2. Classic over CVG');         strategy2(a); });
            a.vbox(() => { a.label('3. CVG over Classic');         strategy3(a); });
          });

          a.separator();

          // Row 2: GL canvas (Three.js spinning cube) + overlay
          a.label('Row 2 — GL canvas (spinning cube) + overlay');
          a.hbox(() => {
            a.vbox(() => { a.label('4. GL + CVG overlay');   strategy4(a); });
            a.vbox(() => { a.label('5. GL + CVG buttons');   strategy5(a); });
            a.vbox(() => { a.label('6. GL + Fyne widgets');  strategy6(a); });
          });
        });
      },
    );

    await win.show();
  });

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
