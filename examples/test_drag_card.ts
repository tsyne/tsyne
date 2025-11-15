/**
 * Simple test for dragging a card image
 * Tests the DraggableContainer functionality
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
  app({ title: 'Drag Test - TypeScript/Bridge' }, (a: App) => {
    console.log('Creating test card image...');
    const testCardData = createTestCard();
    console.log(`Test card created: ${testCardData.substring(0, 50)}...`);

    let statusLabel: any = null;
    let dragCount = 0;
    let clickCount = 0;

    a.window({ title: 'Card Drag Test', width: 600, height: 600 }, (win: Window) => {
      win.setContent(() => {
        a.vbox(() => {
          a.label('Drag Test - Drag the card below');
          a.separator();

          // Draggable card
          a.image(
            testCardData,
            'original',
            () => {
              clickCount++;
              console.log(`Card clicked! Count: ${clickCount}`);
              if (statusLabel) {
                statusLabel.setText(`Clicked: ${clickCount}, Dragged: ${dragCount}`);
              }
            },
            (x: number, y: number) => {
              dragCount++;
              console.log(`Card dragging at (${x}, ${y}). Drag count: ${dragCount}`);
              if (statusLabel) {
                statusLabel.setText(`Dragging at (${Math.floor(x)}, ${Math.floor(y)}). Drag count: ${dragCount}`);
              }
            },
            (x: number, y: number) => {
              console.log(`Card drag ended at (${x}, ${y})`);
              if (statusLabel) {
                statusLabel.setText(`Drag ended at (${Math.floor(x)}, ${Math.floor(y)}). Total drags: ${dragCount}`);
              }
            }
          );

          a.separator();
          statusLabel = a.label('Drag count: 0, Click count: 0');
        });
      });

      win.show();
    });

    // Keep the process alive so the window stays open
    setInterval(() => {}, 1000);
  });
}
