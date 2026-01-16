/**
 * Clock - Analog Clock with Declarative Hands (Cosyne Version)
 *
 * Ported from imperative clock hand binding to declarative Cosyne.
 * Demonstrates bindEndpoint on lines following rotation.
 *
 * Original: ~200 lines of hand binding updates
 * Cosyne: ~70 lines of declarative rendering
 */

import { app, resolveTransport } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import { cosyne, refreshAllCosyneContexts } from '../../cosyne/src';
import {
  CLOCK_SIZE,
  CLOCK_CENTER,
  CLOCK_RADIUS,
  calcHourMarkerLine,
  calcHandLine,
} from '../clock-shared';

/**
 * Clock state - tracks current time
 */
class ClockState {
  getHourRotation(): number {
    const t = new Date();
    return (t.getHours() % 12 + t.getMinutes() / 60) / 12;
  }

  getMinuteRotation(): number {
    const t = new Date();
    return (t.getMinutes() + t.getSeconds() / 60) / 60;
  }

  getSecondRotation(): number {
    return new Date().getSeconds() / 60;
  }
}

/**
 * Create the clock app
 */
export function createClockApp(a: App, win: Window) {
  const state = new ClockState();

  win.setContent(() => {
    a.vbox(() => {
      // Analog clock
      a.center(() => {
        a.canvasStack(() => {
          cosyne(a, (c) => {
            // Sizing rect for minimum canvas size
            c.rect(0, 0, CLOCK_SIZE, CLOCK_SIZE)
              .fill('transparent')
              .withId('size-rect');

            // Clock face
            c.circle(CLOCK_CENTER, CLOCK_CENTER, CLOCK_RADIUS)
              .fill('#f5f5f5')
              .stroke('#333333', 3)
              .withId('clock-face');

            // Hour markers
            for (let i = 0; i < 12; i++) {
              const { x1, y1, x2, y2 } = calcHourMarkerLine(i);
              c.line(x1, y1, x2, y2)
                .stroke('#333333', i % 3 === 0 ? 3 : 1)
                .withId(`hour-marker-${i}`);
            }

            // Hour hand
            c.line(CLOCK_CENTER, CLOCK_CENTER, 0, 0)
              .bindEndpoint(() => calcHandLine(state.getHourRotation(), CLOCK_RADIUS * 0.5))
              .stroke('#333333', 4)
              .withId('hour-hand');

            // Minute hand
            c.line(CLOCK_CENTER, CLOCK_CENTER, 0, 0)
              .bindEndpoint(() => calcHandLine(state.getMinuteRotation(), CLOCK_RADIUS * 0.75))
              .stroke('#333333', 3)
              .withId('minute-hand');

            // Second hand
            c.line(CLOCK_CENTER, CLOCK_CENTER, 0, 0)
              .bindEndpoint(() => calcHandLine(state.getSecondRotation(), CLOCK_RADIUS * 0.85))
              .stroke('#e74c3c', 1)
              .withId('second-hand');

            // Center dot
            c.circle(CLOCK_CENTER, CLOCK_CENTER, 5)
              .fill('#333333')
              .withId('center-dot');
          });
        });
      });

      a.separator();

      // Digital time display (foreign widget)
      a.label('')
        .withId('time-display')
        .bindText(() => new Date().toLocaleTimeString());

      a.label('')
        .withId('date-display')
        .bindText(() => new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }));

      a.label(`Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    });
  });

  // Update loop - refresh every 100ms for smooth second hand
  const updateInterval = setInterval(() => {
    refreshAllCosyneContexts();
  }, 100);

  // Cleanup on app close (if needed)
  return () => clearInterval(updateInterval);
}

// Auto-run if this is the main module
if (require.main === module) {
  app(resolveTransport(), { title: 'Clock' }, (a) => {
    a.window({ title: 'Clock', width: 300, height: 350 }, (win) => {
      createClockApp(a, win);
      win.show();
    });
  });
}
