/**
 * Foreign Objects Demo - Cosyne Phase 5
 *
 * Demonstrates embedding Tsyne widgets inside Cosyne canvas
 * - Button controls that trigger canvas animations
 * - Text input that updates canvas content
 * - Mixing native Tsyne UI with canvas graphics
 */

import { App } from 'tsyne';
import { CosyneContext, cosyne, refreshAllCosyneContexts, easeInOutCubic } from '../../cosyne/src';

interface CanvasState {
  circleX: number;
  circleY: number;
  circleColor: string;
  message: string;
  isAnimating: boolean;
}

export function buildForeignObjectsApp(a: App): void {
  const state: CanvasState = {
    circleX: 250,
    circleY: 150,
    circleColor: '#FF6B6B',
    message: 'Click buttons to interact with canvas',
    isAnimating: false,
  };

  a.canvasStack(() => {
    const cosyneCtx = cosyne(a, (c: CosyneContext) => {
      // Background
      c.rect(0, 0, 500, 300)
        .fill('#F5F5F5');

      // Title
      c.text(250, 20, 'Foreign Objects Demo - Tsyne + Canvas')
        .fill('#2C3E50');

      // Canvas graphics - main circle
      c.circle(250, 150, 30)
        .fill('#FF6B6B')
        .bindPosition(() => ({ x: state.circleX, y: state.circleY }))
        .bindFill(() => state.circleColor)
        .stroke('#FFFFFF', 2)
        .withId('main-circle');

      // Message display on canvas
      c.text(250, 260, state.message)
        .fill('#2C3E50')
        .bindPosition(() => ({ x: 250, y: 260 }))
        .withId('canvas-message');

      // Decorative circles around main circle
      const decorativeAngles = [0, 60, 120, 180, 240, 300];
      c.circles()
        .bindTo(decorativeAngles, { trackBy: (angle) => angle })
        .bindPosition((angle) => {
          const rad = (angle * Math.PI) / 180;
          return {
            x: state.circleX + Math.cos(rad) * 80,
            y: state.circleY + Math.sin(rad) * 80,
          };
        })
        .bindAlpha(() => (state.isAnimating ? 0.8 : 0.3));

      // Foreign object: Control panel with Tsyne widgets
      c.foreign(20, 200, (app) => {
        app.vbox(() => {
          app.label('Canvas Controls:')
            .withId('control-label');

          app.hbox(() => {
            app.button('Red', () => {
              state.circleColor = '#FF6B6B';
              state.message = 'Color changed to Red';
              refreshAllCosyneContexts();
            }).withId('btn-red');

            app.button('Blue', () => {
              state.circleColor = '#4ECDC4';
              state.message = 'Color changed to Blue';
              refreshAllCosyneContexts();
            }).withId('btn-blue');

            app.button('Green', () => {
              state.circleColor = '#45B7D1';
              state.message = 'Color changed to Green';
              refreshAllCosyneContexts();
            }).withId('btn-green');
          });

          app.hbox(() => {
            app.button('Move Up', () => {
              state.circleY = Math.max(50, state.circleY - 20);
              state.message = 'Moved up';
              refreshAllCosyneContexts();
            }).withId('btn-up');

            app.button('Move Down', () => {
              state.circleY = Math.min(250, state.circleY + 20);
              state.message = 'Moved down';
              refreshAllCosyneContexts();
            }).withId('btn-down');
          });

          app.hbox(() => {
            app.button('Animate', () => {
              if (state.isAnimating) {
                state.message = 'Already animating!';
                refreshAllCosyneContexts();
                return;
              }

              state.isAnimating = true;
              const startX = state.circleX;
              const startY = state.circleY;
              state.message = 'Animating...';
              refreshAllCosyneContexts();

              // Animate circle in a circle
              let progress = 0;
              const animInterval = setInterval(() => {
                progress += 0.05;
                if (progress >= 1) {
                  clearInterval(animInterval);
                  state.circleX = startX;
                  state.circleY = startY;
                  state.isAnimating = false;
                  state.message = 'Animation complete!';
                  refreshAllCosyneContexts();
                  return;
                }

                const angle = progress * Math.PI * 2;
                state.circleX = startX + Math.cos(angle) * 60;
                state.circleY = startY + Math.sin(angle) * 60;
                refreshAllCosyneContexts();
              }, 30);
            }).withId('btn-animate');

            app.button('Reset', () => {
              state.circleX = 250;
              state.circleY = 150;
              state.circleColor = '#FF6B6B';
              state.message = 'Reset to center';
              state.isAnimating = false;
              refreshAllCosyneContexts();
            }).withId('btn-reset');
          });
        });
      });

      // Foreign object: Text input
      c.foreign(250, 200, (app) => {
        app.vbox(() => {
          app.label('Update message:')
            .withId('msg-label');

          app.entry('Enter text...', (text) => {
            state.message = text || 'Empty message';
            refreshAllCosyneContexts();
          }, 150).withId('msg-input');
        });
      });
    });
  });
}

// Standalone execution
if (require.main === module) {
  const { app } = require('../../core/src');
  app(
    {
      title: 'Foreign Objects Demo - Cosyne Phase 5',
      width: 600,
      height: 400,
    },
    (a: any) => {
      a.window(
        { title: 'Foreign Objects Demo', width: 500, height: 350 },
        (win: any) => {
          win.setContent(() => {
            buildForeignObjectsApp(a);
          });
          win.show();
        }
      );
    }
  );
}
