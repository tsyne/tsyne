// Demo: Shape Gallery using CanvasPolygon primitives
// Shows how to create various polygon shapes

import { app, resolveTransport  } from 'tsyne';

app(resolveTransport(), { title: 'Shape Gallery' }, (a) => {
  a.window({ title: 'Polygon Shape Gallery', width: 600, height: 500 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Various Polygon Shapes');

        a.hbox(() => {
          // Triangle
          a.vbox(() => {
            a.label('Triangle');
            a.canvasPolygon({
              points: [
                { x: 50, y: 0 },
                { x: 100, y: 100 },
                { x: 0, y: 100 }
              ],
              fillColor: '#e74c3c'
            });
          });

          // Square
          a.vbox(() => {
            a.label('Square');
            a.canvasPolygon({
              points: [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
                { x: 100, y: 100 },
                { x: 0, y: 100 }
              ],
              fillColor: '#3498db'
            });
          });

          // Pentagon
          a.vbox(() => {
            a.label('Pentagon');
            const pentagonPoints = [];
            for (let i = 0; i < 5; i++) {
              const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
              pentagonPoints.push({
                x: 50 + 50 * Math.cos(angle),
                y: 50 + 50 * Math.sin(angle)
              });
            }
            a.canvasPolygon({
              points: pentagonPoints,
              fillColor: '#27ae60'
            });
          });
        });

        a.hbox(() => {
          // Hexagon
          a.vbox(() => {
            a.label('Hexagon');
            const hexagonPoints = [];
            for (let i = 0; i < 6; i++) {
              const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
              hexagonPoints.push({
                x: 50 + 50 * Math.cos(angle),
                y: 50 + 50 * Math.sin(angle)
              });
            }
            a.canvasPolygon({
              points: hexagonPoints,
              fillColor: '#9b59b6'
            });
          });

          // Star (5-pointed)
          a.vbox(() => {
            a.label('Star');
            const starPoints = [];
            for (let i = 0; i < 10; i++) {
              const angle = (i * Math.PI) / 5 - Math.PI / 2;
              const radius = i % 2 === 0 ? 50 : 20;
              starPoints.push({
                x: 50 + radius * Math.cos(angle),
                y: 50 + radius * Math.sin(angle)
              });
            }
            a.canvasPolygon({
              points: starPoints,
              fillColor: '#f1c40f'
            });
          });

          // Diamond
          a.vbox(() => {
            a.label('Diamond');
            a.canvasPolygon({
              points: [
                { x: 50, y: 0 },
                { x: 100, y: 50 },
                { x: 50, y: 100 },
                { x: 0, y: 50 }
              ],
              fillColor: '#e67e22'
            });
          });
        });
      });
    });
    win.show();
  });
});
