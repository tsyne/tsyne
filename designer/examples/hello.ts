import { app } from '../../core/src';

app({ title: 'Hello' }, (a) => {
  a.window({ title: 'Hello World' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Hello, World!');
        a.button('Click Me').onClick(() => console.log('clicked'));
      });
    });
    win.show();
  });
});
