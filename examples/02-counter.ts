// Simple counter example demonstrating state management

import { app } from '../src';

app({ title: 'Counter' }, (a) => {
  a.window({ title: 'Counter', width: 300, height: 150 }, (win) => {
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
});
