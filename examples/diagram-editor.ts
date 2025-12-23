/**
 * Diagram Editor - Shape drawing demo using canvas primitives
 *
 * Demonstrates:
 * - canvas.Circle for circles/ellipses
 * - canvas.Rectangle for rectangles
 * - canvas.Text for labels
 * - canvas.Line for connections
 */

import { app, resolveTransport  } from '../core/src/index';

app(resolveTransport(), { title: 'Diagram Editor' }, (a) => {
  let selectedShape = 'rectangle';
  let selectedColor = '#3498db';

  a.window({ title: 'Diagram Editor - Shape Drawing', width: 900, height: 700 }, (win) => {
    win.setContent(() => {
      a.border({
        left: () => {
          // Toolbar panel
          a.vbox(() => {
            a.label('Shapes', undefined, 'center', undefined, { bold: true });
            a.separator();
            a.button('Rectangle').onClick(() => { selectedShape = 'rectangle'; });
            a.button('Circle').onClick(() => { selectedShape = 'circle'; });
            a.button('Line').onClick(() => { selectedShape = 'line'; });
            a.button('Text').onClick(() => { selectedShape = 'text'; });
            a.separator();
            a.label('Colors', undefined, 'center', undefined, { bold: true });
            a.separator();
            a.button('Blue').onClick(() => { selectedColor = '#3498db'; });
            a.button('Red').onClick(() => { selectedColor = '#e74c3c'; });
            a.button('Green').onClick(() => { selectedColor = '#2ecc71'; });
            a.button('Orange').onClick(() => { selectedColor = '#f39c12'; });
            a.button('Purple').onClick(() => { selectedColor = '#9b59b6'; });
          });
        },
        center: () => {
          // Canvas area
          a.max(() => {
            // White background
            a.canvasRectangle({
              width: 700,
              height: 600,
              fillColor: '#FFFFFF',
              strokeColor: '#CCCCCC',
              strokeWidth: 1
            });

            // Sample diagram: Flowchart
            // Start node (rounded rectangle)
            a.canvasRectangle({
              width: 100,
              height: 50,
              fillColor: '#2ecc71',
              strokeColor: '#27ae60',
              strokeWidth: 2,
              cornerRadius: 25
            });

            // Process node
            a.canvasRectangle({
              width: 120,
              height: 60,
              fillColor: '#3498db',
              strokeColor: '#2980b9',
              strokeWidth: 2
            });

            // Decision node (using rotated rectangle simulation with circle)
            a.canvasCircle({
              x: 280, y: 200,
              x2: 380, y2: 300,
              fillColor: '#f39c12',
              strokeColor: '#e67e22',
              strokeWidth: 2
            });

            // End node
            a.canvasCircle({
              x: 280, y: 350,
              x2: 380, y2: 410,
              fillColor: '#e74c3c',
              strokeColor: '#c0392b',
              strokeWidth: 2
            });

            // Connection lines
            a.canvasLine(330, 75, 330, 130, { strokeColor: '#333333', strokeWidth: 2 });
            a.canvasLine(330, 190, 330, 200, { strokeColor: '#333333', strokeWidth: 2 });
            a.canvasLine(330, 300, 330, 350, { strokeColor: '#333333', strokeWidth: 2 });

            // Labels
            a.canvasText('Start', { color: '#FFFFFF', textSize: 14, bold: true });
            a.canvasText('Process', { color: '#FFFFFF', textSize: 14, bold: true });
            a.canvasText('Decision?', { color: '#FFFFFF', textSize: 12, bold: true });
            a.canvasText('End', { color: '#FFFFFF', textSize: 14, bold: true });

            // Arrow heads (simple lines)
            a.canvasLine(325, 125, 330, 130, { strokeColor: '#333333', strokeWidth: 2 });
            a.canvasLine(335, 125, 330, 130, { strokeColor: '#333333', strokeWidth: 2 });

            // Side branch
            a.canvasLine(380, 250, 480, 250, { strokeColor: '#333333', strokeWidth: 2 });
            a.canvasLine(480, 250, 480, 160, { strokeColor: '#333333', strokeWidth: 2 });
            a.canvasLine(480, 160, 390, 160, { strokeColor: '#333333', strokeWidth: 2 });

            // Yes/No labels
            a.canvasText('Yes', { color: '#27ae60', textSize: 12 });
            a.canvasText('No', { color: '#e74c3c', textSize: 12 });
          });
        },
        bottom: () => {
          a.label('Diagram Editor Demo - Sample flowchart diagram with shapes and connections');
        }
      });
    });
    win.show();
  });
});
