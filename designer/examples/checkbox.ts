import { app } from 'tsyne';

app({ title: 'Checkbox Example' }, (a) => {
  a.window({ title: 'Checkbox Layout' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Select options:');
        a.hbox(() => {
          a.button('Check All').onClick(() => {});
          a.button('Uncheck All').onClick(() => {});
        });
        a.checkbox('Option 1', false).onChanged(() => {});
        a.checkbox('Option 2', true).onChanged(() => {});
        a.checkbox('Option 3', false).onChanged(() => {});
      });
    });
    win.show();
  });
});
