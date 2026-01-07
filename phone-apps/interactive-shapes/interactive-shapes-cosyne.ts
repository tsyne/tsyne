/**
 * Interactive Shapes Demo - Cosyne Phase 8
 *
 * Demonstrates interactive event handling with mouse click and drag
 * - Click shapes to change their color
 * - Drag shapes to move them around
 * - Hover to highlight
 */

import { App } from '../../core/src';
import { CosyneContext, cosyne, registerCosyneContext, refreshAllCosyneContexts, enableEventHandling } from '../../cosyne/src';

interface ShapeState {
  x: number;
  y: number;
  color: string;
  hovered: boolean;
}

const shapeStates: Map<string, ShapeState> = new Map();

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

function pickRandomColor(current: string): string {
  const available = COLORS.filter(c => c !== current);
  return available[Math.floor(Math.random() * available.length)];
}

export function buildInteractiveShapesApp(a: App): void {
  a.canvasStack(() => {
    const cosyneCtx = cosyne(a, (c: CosyneContext) => {
      // Circle 1
      const circle1State: ShapeState = { x: 100, y: 100, color: COLORS[0], hovered: false };
      shapeStates.set('circle1', circle1State);

      const circle1 = c
        .circle(circle1State.x, circle1State.y, 30)
        .fill(circle1State.color)
        .withId('circle1')
        .onClick(async (e) => {
          circle1State.color = pickRandomColor(circle1State.color);
          refreshAllCosyneContexts();
        })
        .onMouseEnter(() => {
          circle1State.hovered = true;
          refreshAllCosyneContexts();
        })
        .onMouseLeave(() => {
          circle1State.hovered = false;
          refreshAllCosyneContexts();
        })
        .onDragStart((e) => {
          console.log(`Started dragging circle at ${e.x}, ${e.y}`);
        })
        .onDrag((e) => {
          circle1State.x = e.x - 30;
          circle1State.y = e.y - 30;
          refreshAllCosyneContexts();
        })
        .onDragEnd(() => {
          console.log(`Finished dragging circle`);
        });

      // Circle 2
      const circle2State: ShapeState = { x: 300, y: 150, color: COLORS[1], hovered: false };
      shapeStates.set('circle2', circle2State);

      const circle2 = c
        .circle(circle2State.x, circle2State.y, 25)
        .fill(circle2State.color)
        .withId('circle2')
        .onClick(async () => {
          circle2State.color = pickRandomColor(circle2State.color);
          refreshAllCosyneContexts();
        })
        .onMouseEnter(() => {
          circle2State.hovered = true;
          refreshAllCosyneContexts();
        })
        .onMouseLeave(() => {
          circle2State.hovered = false;
          refreshAllCosyneContexts();
        })
        .onDrag((e) => {
          circle2State.x = e.x - 25;
          circle2State.y = e.y - 25;
          refreshAllCosyneContexts();
        });

      // Rectangle
      const rectState: ShapeState = { x: 150, y: 300, color: COLORS[2], hovered: false };
      shapeStates.set('rect', rectState);

      const rect = c
        .rect(rectState.x, rectState.y, 80, 60)
        .fill(rectState.color)
        .withId('rect')
        .onClick(async () => {
          rectState.color = pickRandomColor(rectState.color);
          refreshAllCosyneContexts();
        })
        .onMouseEnter(() => {
          rectState.hovered = true;
          refreshAllCosyneContexts();
        })
        .onMouseLeave(() => {
          rectState.hovered = false;
          refreshAllCosyneContexts();
        })
        .onDrag((e) => {
          rectState.x = e.x - 40;
          rectState.y = e.y - 30;
          refreshAllCosyneContexts();
        });

      // Add stroke when hovered
      c.circle(circle1State.x, circle1State.y, 35)
        .stroke('#ffffff', circle1State.hovered ? 3 : 0)
        .bindPosition(() => ({ x: circle1State.x, y: circle1State.y }))
        .bindFill(() => (circle1State.hovered ? '#ffffff' : 'transparent'));

      c.circle(circle2State.x, circle2State.y, 30)
        .stroke('#ffffff', circle2State.hovered ? 3 : 0)
        .bindPosition(() => ({ x: circle2State.x, y: circle2State.y }))
        .bindFill(() => (circle2State.hovered ? '#ffffff' : 'transparent'));

      c.rect(rectState.x, rectState.y, 80, 60)
        .stroke('#ffffff', rectState.hovered ? 3 : 0)
        .bindPosition(() => ({ x: rectState.x, y: rectState.y }))
        .bindFill(() => (rectState.hovered ? '#ffffff' : 'transparent'));
    });

    // Enable event handling on the canvas
    enableEventHandling(cosyneCtx, a, {
      width: 500,
      height: 450,
    });
  });
}

// Standalone execution
if (require.main === module) {
  const { app } = require('../../core/src');
  app(
    {
      title: 'Interactive Shapes - Cosyne Phase 8',
      width: 600,
      height: 550,
    },
    (a: any) => {
      a.window(
        { title: 'Interactive Shapes Demo', width: 500, height: 450 },
        (win: any) => {
          win.setContent(() => {
            buildInteractiveShapesApp(a);
          });
          win.show();
        }
      );
    }
  );
}
