// Demo: Pie Chart using CanvasArc primitives
// Shows how to create pie chart segments using arcs

import { app } from '../core/src';

app({ title: 'Pie Chart Demo' }, (a) => {
  a.window({ title: 'Pie Chart', width: 500, height: 400 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Sales Distribution by Quarter');

        // Create a container for the pie chart using multiple arcs
        a.hbox(() => {
          // Q1 - Red (0 to PI/2 radians = 0 to 90 degrees)
          a.canvasArc({
            x: 0, y: 0,
            x2: 200, y2: 200,
            startAngle: 0,
            endAngle: Math.PI / 2,
            fillColor: '#e74c3c'
          });
        });

        a.hbox(() => {
          // Q2 - Green (PI/2 to PI radians = 90 to 180 degrees)
          a.canvasArc({
            x: 0, y: 0,
            x2: 200, y2: 200,
            startAngle: Math.PI / 2,
            endAngle: Math.PI,
            fillColor: '#27ae60'
          });
        });

        a.hbox(() => {
          // Q3 - Blue (PI to 3PI/2 radians = 180 to 270 degrees)
          a.canvasArc({
            x: 0, y: 0,
            x2: 200, y2: 200,
            startAngle: Math.PI,
            endAngle: (3 * Math.PI) / 2,
            fillColor: '#3498db'
          });
        });

        a.hbox(() => {
          // Q4 - Orange (3PI/2 to 2PI radians = 270 to 360 degrees)
          a.canvasArc({
            x: 0, y: 0,
            x2: 200, y2: 200,
            startAngle: (3 * Math.PI) / 2,
            endAngle: 2 * Math.PI,
            fillColor: '#f39c12'
          });
        });

        // Legend
        a.hbox(() => {
          a.label('Q1 (25%): Red  |  Q2 (25%): Green  |  Q3 (25%): Blue  |  Q4 (25%): Orange');
        });
      });
    });
    win.show();
  });
});
