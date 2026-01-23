// Portions copyright Ryelang developers (Apache 2.0)
// Demonstrates button interaction and spacer layout

import { app, resolveTransport  } from 'tsyne';

app(resolveTransport(), { title: 'Button Demo' }, (a) => {
  a.window({ title: 'Button', width: 200, height: 100 }, (win) => {
    let label: any;

    win.setContent(() => {
      a.vbox(() => {
        label = a.label("I'm Waiting ...");
        a.label(''); // Spacer equivalent
        a.button('Click here').onClick(async () => {
          await label.setText('Finally ...');
        });
      });
    });
    win.show();
  });
});
