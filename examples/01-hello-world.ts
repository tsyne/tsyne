// Portions copyright Ryelang developers (Apache 2.0)
// Simple hello world example demonstrating basic Tsyne application structure

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';

const appInstance = app(resolveTransport(), { title: 'Hello' }, (a) => {
  a.window({ title: 'Hello', width: 400, height: 200 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Hello Tsyne world!');
      });
    });
    win.show();
  });
});

// Set shutdown strategy for standalone mode
appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
