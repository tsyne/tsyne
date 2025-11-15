/**
 * Simple test for clicking on a card image
 * Tests the ClickableContainer functionality
 */

import { app } from '../src';
import type { App } from '../src/app';
import type { Window } from '../src/window';
import * as path from 'path';
import { renderSVGToBase64 } from './solitaire/svg-renderer';

/**
 * Create a test card
 */
function createTestCard(): string {
  const facesDir = path.join(process.cwd(), 'examples/solitaire/faces');
  const cardPath = path.join(facesDir, 'AC.svg');

  console.log(`Loading card from: ${cardPath}`);
  const pngDataURI = renderSVGToBase64(cardPath, 200, 290);

  return pngDataURI;
}

/**
 * Main test app
 */
if (require.main === module) {
  app({ title: 'Click Test - TypeScript/Bridge' }, (a: App) => {
    console.log('Creating test card image...');
    const testCardData = createTestCard();
    console.log(`Test card created: ${testCardData.substring(0, 50)}...`);

    let clickCount = 0;
    let statusLabel: any = null;

    a.window({ title: 'Card Click Test', width: 600, height: 600 }, (win: Window) => {
      win.setContent(() => {
        a.vbox(() => {
          a.label('Click Test - Click on the card below');
          a.separator();

          // Clickable card
          a.image(testCardData, 'original', () => {
            clickCount++;
            console.log(`Card clicked! Count: ${clickCount}`);
            if (statusLabel) {
              statusLabel.setText(`Click count: ${clickCount}`);
            }
          });

          a.separator();
          statusLabel = a.label('Click count: 0');
        });
      });

      win.show();
    });

    // Keep the process alive so the window stays open
    setInterval(() => {}, 1000);
  });
}
