// Demo: Simplified Canvas Primitive Factory Methods
// Shows the new simple APIs: rectangle(), circle(), line(), linearGradient(), radialGradient(), text()

import { app } from '../core/src';

app({ title: 'Canvas Primitives' }, (a) => {
  a.window({ title: 'Canvas Primitives - Simple APIs', width: 600, height: 500 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Simplified Canvas Primitive Factory Methods');
        a.separator();

        // Rectangles section
        a.label('Rectangles - a.rectangle(color, width?, height?)');
        a.hbox(() => {
          a.vbox(() => {
            a.label('Basic');
            a.rectangle('#e74c3c', 80, 60);
          });
          a.vbox(() => {
            a.label('Blue');
            a.rectangle('#3498db', 80, 60);
          });
          a.vbox(() => {
            a.label('Green');
            a.rectangle('#27ae60', 80, 60);
          });
          a.vbox(() => {
            a.label('Purple');
            a.rectangle('#9b59b6', 80, 60);
          });
        });

        a.separator();

        // Circles section
        a.label('Circles - a.circle(color, radius?)');
        a.hbox(() => {
          a.vbox(() => {
            a.label('Red r=30');
            a.circle('#e74c3c', 30);
          });
          a.vbox(() => {
            a.label('Blue r=25');
            a.circle('#3498db', 25);
          });
          a.vbox(() => {
            a.label('Yellow r=35');
            a.circle('#f1c40f', 35);
          });
          a.vbox(() => {
            a.label('Orange r=20');
            a.circle('#e67e22', 20);
          });
        });

        a.separator();

        // Lines section
        a.label('Lines - a.line(color, strokeWidth?)');
        a.hbox(() => {
          a.vbox(() => {
            a.label('Thin red');
            a.line('#e74c3c', 1);
          });
          a.vbox(() => {
            a.label('Medium blue');
            a.line('#3498db', 3);
          });
          a.vbox(() => {
            a.label('Thick green');
            a.line('#27ae60', 5);
          });
        });

        a.separator();

        // Gradients section
        a.label('Gradients - linearGradient() & radialGradient()');
        a.hbox(() => {
          a.vbox(() => {
            a.label('Linear');
            a.linearGradient('#e74c3c', '#3498db');
          });
          a.vbox(() => {
            a.label('Linear 45deg');
            a.linearGradient('#f1c40f', '#9b59b6', 45);
          });
          a.vbox(() => {
            a.label('Radial');
            a.radialGradient('#ffffff', '#e74c3c');
          });
          a.vbox(() => {
            a.label('Radial Blue');
            a.radialGradient('#ffffff', '#3498db');
          });
        });

        a.separator();

        // Text section
        a.label('Text - a.text(content, size?, color?)');
        a.hbox(() => {
          a.text('Default', undefined, undefined);
          a.text('Large', 24, undefined);
          a.text('Red', 16, '#e74c3c');
          a.text('Blue 20px', 20, '#3498db');
        });
      });
    });
    win.show();
  });
});
