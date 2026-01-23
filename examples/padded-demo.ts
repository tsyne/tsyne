// Padded container demo - demonstrates container.NewPadded functionality
// Shows the difference between padded and non-padded content

import { app, resolveTransport  } from 'tsyne';

app(resolveTransport(), { title: 'Padded Demo' }, (a) => {
  a.window({ title: 'Padded Container Demo', width: 500, height: 400 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Title
        a.label('Padded Container Demo', undefined, 'center', undefined, { bold: true });
        a.separator();

        // Side-by-side comparison using split
        a.hsplit(
          // Left side: Without padding
          () => {
            a.vbox(() => {
              a.label('Without Padding:', undefined, undefined, undefined, { bold: true });
              a.card('Card Title', 'No padding around content', () => {
                a.vbox(() => {
                  a.label('This content has no extra padding');
                  a.button('Button 1').onClick(() => console.log('Button 1 clicked'));
                  a.button('Button 2').onClick(() => console.log('Button 2 clicked'));
                });
              });
            });
          },
          // Right side: With padding
          () => {
            a.vbox(() => {
              a.label('With Padding:', undefined, undefined, undefined, { bold: true });
              a.card('Card Title', 'Theme padding around content', () => {
                a.padded(() => {
                  a.vbox(() => {
                    a.label('This content has theme padding');
                    a.button('Button 1').onClick(() => console.log('Padded Button 1 clicked'));
                    a.button('Button 2').onClick(() => console.log('Padded Button 2 clicked'));
                  });
                });
              });
            });
          },
          0.5
        );

        a.separator();

        // More examples
        a.label('More Padded Examples:', undefined, undefined, undefined, { bold: true });

        // Padded label
        a.padded(() => {
          a.label('This label is wrapped in a padded container');
        });

        // Padded button row
        a.padded(() => {
          a.hbox(() => {
            a.button('Padded').onClick(() => console.log('Padded button'));
            a.button('Button').onClick(() => console.log('Button'));
            a.button('Row').onClick(() => console.log('Row'));
          });
        });
      });
    });
    win.show();
  });
});
