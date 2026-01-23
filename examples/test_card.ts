/**
 * Standalone test for canvas.Image display through TypeScript/Bridge
 *
 * This mirrors test_card_display.go to verify that images display correctly
 * through the TypeScript -> Bridge -> Fyne pipeline.
 *
 * Creates a simple test card (red border, white background, black center)
 * and displays it in multiple configurations to test different sizing approaches.
 */

import { app } from 'tsyne';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';
import * as path from 'path';
import { renderSVGToBase64 } from './solitaire/svg-renderer';

/**
 * Load and render a real card from the solitaire faces directory
 * This gives us a real 200x290 PNG to test with
 */
function createTestCard(): string {
  const facesDir = path.join(process.cwd(), 'examples/solitaire/faces');
  const cardPath = path.join(facesDir, 'AC.svg');

  console.log(`Loading card from: ${cardPath}`);

  // renderSVGToBase64 already returns a full data URI
  const pngDataURI = renderSVGToBase64(cardPath, 200, 290);

  return pngDataURI;
}

/**
 * Main test app
 */
if (require.main === module) {
  app({ title: 'Card Display Test - TypeScript/Bridge' }, (a: App) => {
    console.log('Creating test card image...');
    const testCardData = createTestCard();
    console.log(`Test card created: ${testCardData.substring(0, 50)}...`);

    a.window({ title: 'Card Display Test - TypeScript/Bridge', width: 900, height: 700 }, (win: Window) => {
      win.setContent(() => {
        a.vbox(() => {
          a.label('canvas.Image Display Tests - TypeScript/Bridge');
          a.separator();

          // Row 1: Three test cases side by side
          a.hbox(() => {
            // Test 1: Default - no special sizing
            a.vbox(() => {
              a.label('1: Default (original mode)');
              a.image(testCardData, 'original');
            });

            // Test 2: Contain mode
            a.vbox(() => {
              a.label('2: Contain mode');
              a.image(testCardData, 'contain');
            });

            // Test 3: Stretch mode
            a.vbox(() => {
              a.label('3: Stretch mode');
              a.image(testCardData, 'stretch');
            });
          });

          a.separator();

          // Row 2: More test cases
          a.hbox(() => {
            // Test 4: Multiple cards in a column
            a.vbox(() => {
              a.label('4: Multiple cards vertically');
              a.image(testCardData, 'original');
              a.image(testCardData, 'original');
              a.image(testCardData, 'original');
            });

            // Test 5: Multiple cards in a row (nested)
            a.vbox(() => {
              a.label('5: Multiple cards horizontally');
              a.hbox(() => {
                a.image(testCardData, 'original');
                a.image(testCardData, 'original');
              });
            });
          });

          a.separator();
          a.label('Status: Test complete - Which tests display the red/white/black card correctly?');
        });
      });

      win.show();
    });

    // Keep the process alive so the window stays open
    setInterval(() => {}, 1000);
  });
}
