// @tsyne-app:name Counter
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
// @tsyne-app:category utilities
// @tsyne-app:builder buildCounter

// Simple counter example demonstrating state management

import { app, App, Window } from '../src';

export function buildCounter(a: App) {
  a.window({ title: 'Counter', width: 300, height: 150 }, (win: Window) => {
    let count = 0;
    let countLabel: any;

    win.setContent(() => {
      a.vbox(() => {
        a.label('Counter Example');
        a.separator();

        countLabel = a.label(`Count: ${count}`);

        a.hbox(() => {
          a.button('Decrement').onClick(async () => {
            count--;
            await countLabel.setText(`Count: ${count}`);
          });

          a.button('Reset').onClick(async () => {
            count = 0;
            await countLabel.setText(`Count: ${count}`);
          });

          a.button('Increment').onClick(async () => {
            count++;
            await countLabel.setText(`Count: ${count}`);
          });
        });
      });
    });
    win.show();
  });
}

// Skip auto-run when imported by test framework or desktop
const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (!isTestEnvironment) {
  app({ title: 'Counter' }, buildCounter);
}
