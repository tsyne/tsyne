/**
 * Interactive Shapes Demo - Cosyne Phase 8
 * Click to change color, drag to move, hover to highlight
 */

import { App } from 'tsyne';
import { CosyneContext, cosyne, refreshAllCosyneContexts, enableEventHandling } from '../../cosyne/src';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
const pickRandom = (exclude: string) => COLORS.filter(c => c !== exclude)[Math.floor(Math.random() * 4)];

// Shape definitions - data-driven
const SHAPES = [
  { id: 'circle1', type: 'circle', x: 100, y: 100, r: 30, color: COLORS[0] },
  { id: 'circle2', type: 'circle', x: 300, y: 150, r: 25, color: COLORS[1] },
  { id: 'rect', type: 'rect', x: 150, y: 300, w: 80, h: 60, color: COLORS[2] },
] as const;

type ShapeDef = typeof SHAPES[number];

export function buildInteractiveShapesApp(a: App): void {
  // State per shape - closure-captured
  const state = Object.fromEntries(SHAPES.map(s => [s.id, {
    x: s.x, y: s.y, color: s.color,
    hovered: false, dragging: false, offsetX: 0, offsetY: 0
  }])) as Record<string, { x: number; y: number; color: string; hovered: boolean; dragging: boolean; offsetX: number; offsetY: number }>;

  const refresh = () => refreshAllCosyneContexts();

  a.canvasStack(() => {
    const ctx = cosyne(a, (c: CosyneContext) => {
      for (const def of SHAPES) {
        const s = state[def.id];

        // Main shape
        const shape = def.type === 'circle'
          ? c.circle(s.x, s.y, def.r, { fillColor: s.color })
          : c.rect(s.x, s.y, (def as any).w, (def as any).h, { fillColor: s.color });

        shape
          .bindFill(() => s.color)
          .bindPosition(() => ({ x: s.x, y: s.y }))
          .withId(def.id)
          .onClick(() => { s.color = pickRandom(s.color); refresh(); })
          .onMouseEnter(() => { if (!s.dragging) { s.hovered = true; refresh(); } })
          .onMouseLeave(() => { if (!s.dragging) { s.hovered = false; refresh(); } })
          .onDragStart((e) => {
            s.dragging = true; s.hovered = false;
            s.offsetX = s.x - e.x; s.offsetY = s.y - e.y;
            refresh();
          })
          .onDrag((e) => { s.x = e.x + s.offsetX; s.y = e.y + s.offsetY; refresh(); })
          .onDragEnd(() => { s.dragging = false; refresh(); });

        // Hover highlight (passthrough)
        const hl = def.type === 'circle'
          ? c.circle(s.x, s.y, def.r + 5, { fillColor: 'transparent' })
          : c.rect(s.x, s.y, (def as any).w, (def as any).h, { fillColor: 'transparent' });

        hl.bindPosition(() => ({ x: s.x, y: s.y }))
          .bindFill(() => s.hovered ? 'rgba(255,255,255,0.3)' : 'transparent')
          .passthrough();
      }
    });

    enableEventHandling(ctx, a, { width: 500, height: 450 });
  });
}

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport, screenshotIfRequested } = require('../../core/src');
  app(resolveTransport(), { title: 'Interactive Shapes' }, (a: any) => {
    a.window(
      { title: 'Interactive Shapes Demo', width: 500, height: 450 },
      (win: any) => {
        win.setContent(() => {
          buildInteractiveShapesApp(a);
        });
        win.show();
        screenshotIfRequested(win, 500);
      }
    );
  });
}
