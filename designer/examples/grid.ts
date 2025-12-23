import { app } from '../../core/src';

app({ title: 'Grid Example' }, (a) => {
  a.window({ title: 'Grid Layout' }, (win) => {
    win.setContent(() => {
      a.grid(3, () => {
        a.label('Cell 1');
        a.label('Cell 2');
        a.label('Cell 3');
        a.button('Button 1').onClick(() => {});
        a.button('Button 2').onClick(() => {});
        a.button('Button 3').onClick(() => {});
      });
    });
    win.show();
  });
});
