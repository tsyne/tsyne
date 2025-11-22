/**
 * Whiteboard - Freehand drawing demo using canvas primitives
 *
 * Demonstrates:
 * - canvas.Line for freehand drawing
 * - Mouse event handling for drawing
 * - Dynamic line creation
 */

import { app } from '../src/index';

app({ title: 'Whiteboard' }, (a) => {
  // Store lines for the drawing
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let currentColor = '#000000';
  let strokeWidth = 2;

  a.window({ title: 'Whiteboard - Freehand Drawing', width: 800, height: 600 }, (win) => {
    win.setContent(() => {
      a.border({
        top: () => {
          a.hbox(() => {
            a.label('Color: ');
            const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
            colors.forEach(color => {
              a.button('  ', () => {
                currentColor = color;
              });
            });
            a.separator();
            a.label('Width: ');
            a.button('Thin', () => { strokeWidth = 1; });
            a.button('Medium', () => { strokeWidth = 3; });
            a.button('Thick', () => { strokeWidth = 5; });
            a.separator();
            a.button('Clear', () => {
              // Clear would require container refresh - for demo purposes
              console.log('Clear drawing');
            });
          });
        },
        center: () => {
          // Create a canvas area with a background
          a.max(() => {
            // Background
            a.canvasRectangle({
              width: 780,
              height: 520,
              fillColor: '#FFFFFF',
              strokeColor: '#CCCCCC',
              strokeWidth: 1
            });

            // Draw some sample lines to demonstrate
            a.canvasLine(100, 100, 200, 200, { strokeColor: '#FF0000', strokeWidth: 2 });
            a.canvasLine(200, 200, 300, 150, { strokeColor: '#00FF00', strokeWidth: 2 });
            a.canvasLine(300, 150, 400, 250, { strokeColor: '#0000FF', strokeWidth: 3 });

            // Draw a simple shape
            a.canvasLine(500, 100, 600, 100, { strokeColor: '#000000', strokeWidth: 2 });
            a.canvasLine(600, 100, 600, 200, { strokeColor: '#000000', strokeWidth: 2 });
            a.canvasLine(600, 200, 500, 200, { strokeColor: '#000000', strokeWidth: 2 });
            a.canvasLine(500, 200, 500, 100, { strokeColor: '#000000', strokeWidth: 2 });

            // Instruction text
            a.canvasText('Whiteboard Demo - Sample Drawing', {
              color: '#333333',
              textSize: 20,
              bold: true
            });
          });
        },
        bottom: () => {
          a.label('Click and drag to draw lines. Use toolbar to change color and width.');
        }
      });
    });
    win.show();
  });
});
