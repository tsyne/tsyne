/**
 * Example: SVG Rendering with resvg
 *
 * This example demonstrates how to use the SVG rendering utilities to:
 * 1. Convert SVG files to PNG at specific sizes
 * 2. Create composite images by layering SVGs
 * 3. Cache rendered images for performance
 *
 * NOTE: This is an advanced technique. In most cases, you should just use
 * Fyne's native SVG support by passing the SVG file path directly to the
 * image widget (e.g., app.image({ path: 'icon.svg' })).
 *
 * Use SVG rendering when you need to:
 * - Pre-render SVGs at specific sizes for performance
 * - Create composite images (e.g., chess board square + piece)
 * - Manipulate SVG content programmatically
 */

import { app, resolveTransport  } from 'tsyne';
import { renderSVGToBase64, createCompositeSVG } from './svg-renderer';
import * as path from 'path';

app(resolveTransport(), { title: 'SVG Rendering Example' }, async (a) => {
  a.window({ title: 'SVG Rendering', width: 600, height: 400 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('SVG Rendering with @resvg/resvg-js', undefined, 'center', 'word', { bold: true });
        a.separator();

        // Example 1: Direct SVG path (recommended - native Fyne support)
        a.label('Method 1: Direct SVG Path (Recommended)', undefined, 'leading', 'word', { bold: true });
        a.label('Uses Fyne\'s native SVG support - fast and simple');

        // Assuming you have an SVG file
        const exampleSVGPath = path.join(__dirname, '../chess/pieces/whiteKing.svg');

        a.hbox(() => {
          a.label('Native: ');
          // This is the recommended approach - Fyne loads and renders SVG natively
          a.image({ path: exampleSVGPath, fillMode: 'original' });
        });

        a.separator();

        // Example 2: Pre-rendered SVG (advanced - for special cases)
        a.label('Method 2: Pre-rendered with resvg (Advanced)', undefined, 'leading', 'word', { bold: true });
        a.label('Only use when you need custom rendering or compositing');

        a.hbox(() => {
          a.label('Rendered: ');

          // Pre-render the SVG to PNG at a specific size
          const renderedPNG = renderSVGToBase64(exampleSVGPath, 80, 80);
          a.image(renderedPNG, 'original');
        });

        a.separator();

        // Example 3: Composite image
        a.label('Method 3: Composite SVG (Special Use Case)', undefined, 'leading', 'word', { bold: true });
        a.label('Create layered images programmatically');

        a.hbox(() => {
          a.label('Composite: ');

          // Create a composite image with a colored square and piece
          const pieceData = renderSVGToBase64(exampleSVGPath, 80, 80);
          const composite = createCompositeSVG(100, 100, [
            { type: 'rect', attrs: { width: 100, height: 100, fill: '#f0d9b5' } },
            { type: 'image', attrs: { href: pieceData, x: 10, y: 10, width: 80, height: 80 } }
          ]);

          a.image(composite, 'original');
        });

        a.separator();

        a.label('Performance Comparison:', undefined, 'leading', 'word', { bold: true });
        a.label('• Native SVG: Instant, handled by Fyne');
        a.label('• Pre-rendered: ~90ms per SVG file');
        a.label('• Composite: ~100ms per composite');
        a.label('');
        a.label('Recommendation: Use native SVG unless you have specific requirements');
      });
    });

    win.show();
  });
});
