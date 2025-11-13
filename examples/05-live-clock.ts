// Portions copyright Ryelang developers (Apache 2.0)
// Live clock that updates every 500ms

import { app } from '../src';

app({ title: 'Live Clock' }, (a) => {
  a.window({ title: 'Date & Time', width: 400, height: 100 }, (win) => {
    let timeLabel: any;

    win.setContent(() => {
      a.vbox(() => {
        timeLabel = a.label(new Date().toString());
      });
    });

    // Update clock every 500ms
    setInterval(async () => {
      await timeLabel.setText(new Date().toString());
    }, 500);

    win.show();
  });
});
