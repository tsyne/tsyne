// Portions copyright Ryelang developers (Apache 2.0)
// Feedback form with multiline entry, select dropdown, and dialog

import { app, resolveTransport, dialog  } from 'tsyne';

app(resolveTransport(), { title: 'Feedback' }, (a) => {
  a.window({ title: 'Feedback', width: 400, height: 300 }, (win) => {
    let messageEntry: any;
    let moodSelect: any;

    win.setContent(() => {
      a.vbox(() => {
        a.label('How are you feeling?');

        moodSelect = a.select(['Happy', 'Normal', 'Confused'], (selected: string) => {
          // Selection changed
        });

        a.label('Tell us more:');
        messageEntry = a.multilineentry('Type your feedback here...');

        a.button('Send').onClick(async () => {
          const message = await messageEntry.getText();
          const mood = await moodSelect.getSelected();

          dialog.showInformation(
            win,
            'Feedback Received',
            `Mood: ${mood}\n\nMessage: ${message}`
          );
        });
      });
    });
    win.show();
  });
});
