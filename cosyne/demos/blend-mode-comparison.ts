/**
 * Blend Mode Comparison - Side by Side
 *
 * Shows static overlapping lines:
 * - Left: Normal blending (lines just overlap)
 * - Right: Additive blending (overlaps get brighter)
 *
 * This demonstrates the visual difference blend modes make.
 */

import { App, asRenderTarget , standaloneShutdownStrategy } from 'tsyne';
import type { Window, ITsyneWindow, IRenderTarget } from 'tsyne';
import { CosyneContext, cosyne, enableEventHandling } from '../src';

// Canvas dimensions for each panel
const PANEL_WIDTH = 300;
const PANEL_HEIGHT = 300;

// Total canvas size
const TOTAL_WIDTH = PANEL_WIDTH * 2 + 40; // 40px gap
const TOTAL_HEIGHT = PANEL_HEIGHT;

/**
 * Build the comparison demo
 */
export function buildComparisonApp(a: App, target: IRenderTarget): void {
  target.setContent(() => {
    a.vbox(() => {
      a.hbox(() => {
        a.label('Normal Blending', { color: '#ffffff' }).withId('label-normal');
        a.spacer();
        a.label('Additive Blending (Glow)', { color: '#ffffff' }).withId('label-additive');
      });

      a.canvasStack(() => {
        cosyne(a, (c: CosyneContext) => {
          // Full dark background
          c.rect(0, 0, TOTAL_WIDTH, TOTAL_HEIGHT)
            .fill('#000000')
            .withId('background');

          // Divider line
          c.line(PANEL_WIDTH + 20, 0, PANEL_WIDTH + 20, TOTAL_HEIGHT, {
            strokeColor: '#333333',
            strokeWidth: 2,
          }).withId('divider');

          // Left panel center
          const leftCx = PANEL_WIDTH / 2;
          const leftCy = PANEL_HEIGHT / 2;

          // Right panel center
          const rightCx = PANEL_WIDTH + 40 + PANEL_WIDTH / 2;
          const rightCy = PANEL_HEIGHT / 2;

          // Use filled rectangles for more visible blending
          const rectSize = 80;
          const overlap = 30;

          // LEFT PANEL - Normal blending
          // Three overlapping filled rectangles
          c.rect(leftCx - rectSize/2 - overlap, leftCy - rectSize/2, rectSize, rectSize)
            .fill('#ff0000')  // Red
            .withId('left-rect-1');
          c.rect(leftCx - rectSize/2 + overlap, leftCy - rectSize/2, rectSize, rectSize)
            .fill('#00ff00')  // Green
            .withId('left-rect-2');
          c.rect(leftCx - rectSize/2, leftCy - rectSize/2 + overlap, rectSize, rectSize)
            .fill('#0000ff')  // Blue
            .withId('left-rect-3');

          // RIGHT PANEL - Additive blending (glow effect)
          // Same three overlapping rectangles but with additive blending
          c.rect(rightCx - rectSize/2 - overlap, rightCy - rectSize/2, rectSize, rectSize, { blendMode: 'additive' })
            .fill('#ff0000')  // Red
            .withId('right-rect-1');
          c.rect(rightCx - rectSize/2 + overlap, rightCy - rectSize/2, rectSize, rectSize, { blendMode: 'additive' })
            .fill('#00ff00')  // Green
            .withId('right-rect-2');
          c.rect(rightCx - rectSize/2, rightCy - rectSize/2 + overlap, rectSize, rectSize, { blendMode: 'additive' })
            .fill('#0000ff')  // Blue
            .withId('right-rect-3');

          // Labels at bottom
          c.text(leftCx - 80, PANEL_HEIGHT - 20, 'Overlaps stay same color', {
            fillColor: '#ffffff',
            fontSize: 11,
          }).withId('left-label');

          c.text(rightCx - 80, PANEL_HEIGHT - 20, 'Overlaps get BRIGHTER', {
            fillColor: '#ffffff',
            fontSize: 11,
          }).withId('right-label');
        });

        enableEventHandling(
          cosyne(a, () => {}),
          a,
          { width: TOTAL_WIDTH, height: TOTAL_HEIGHT }
        );
      });
    });
  });
}

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport } = require('tsyne');

  const appInstance = app(resolveTransport(), { title: 'Blend Mode Comparison' }, (a: App) => {
    a.window({ title: 'Blend Mode Comparison', width: TOTAL_WIDTH + 40, height: TOTAL_HEIGHT + 100 }, (win: Window) => {
      const target = asRenderTarget(win as ITsyneWindow);

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));      buildComparisonApp(a, target);
      win.show();
    });
  });
}
