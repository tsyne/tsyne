/**
 * Test the new updateImage API with path and SVG
 */

import { app } from '../core/src';
import * as path from 'path';

app({ title: 'UpdateImage API Test' }, async (a) => {
  a.window({ title: 'UpdateImage Test', width: 600, height: 400 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Testing updateImage API with different sources', undefined, 'center', 'word', { bold: true });
        a.separator();

        // Test 1: Start with one image, update with path
        a.label('Test 1: Update with { path: ... }');
        const img1 = a.image({ path: path.join(__dirname, 'chess/pieces/whiteKing.svg'), fillMode: 'original' });
        a.button('Update to White Queen').onClick(async () => {
          await img1.updateImage({ path: path.join(__dirname, 'chess/pieces/whiteQueen.svg') });
        });
        a.button('Update to Black King').onClick(async () => {
          await img1.updateImage({ path: path.join(__dirname, 'chess/pieces/blackKing.svg') });
        });

        a.separator();

        // Test 2: Update with raw SVG
        a.label('Test 2: Update with { svg: ... }');
        const img2 = a.image({ path: path.join(__dirname, 'chess/pieces/whiteRook.svg'), fillMode: 'original' });
        a.button('Update to Red Circle SVG').onClick(async () => {
          const svgString = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>';
          await img2.updateImage({ svg: svgString });
        });
        a.button('Update to Blue Square SVG').onClick(async () => {
          const svgString = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>';
          await img2.updateImage({ svg: svgString });
        });

        a.separator();

        // Test 3: Update with URL
        a.label('Test 3: Update with { url: ... }');
        const img3 = a.image({ path: path.join(__dirname, 'chess/pieces/whiteBishop.svg'), fillMode: 'original' });
        a.button('Load from GitHub (SVG)').onClick(async () => {
          await img3.updateImage({ url: 'https://raw.githubusercontent.com/paul-hammant/tsyne/main/examples/chess/pieces/blackQueen.svg' });
        });
        a.button('Load from GitHub (PNG)').onClick(async () => {
          await img3.updateImage({ url: 'https://raw.githubusercontent.com/paul-hammant/tsyne/main/screenshots/todomvc.png' });
        });

        a.separator();

        a.label('All tests ready! Click buttons to test updateImage.');
      });
    });

    win.show();
  });
});
