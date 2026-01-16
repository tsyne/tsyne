import { app, resolveTransport, Label } from 'tsyne';

const fmt = (n: number) => String(n).padStart(10);

app(resolveTransport(), { title: 'My calculator' }, (a) => {
  a.window({ width: 200, height: 240 }, (win) => {
    let number = 0, op: string | null = null, previous = 0;
    let display: Label;

    win.setContent(() => {
      a.vbox(() => {
        a.hbox(() => {
          display = a.label(fmt(number), undefined, 'trailing', undefined, { monospace: true });
          a.button('Clr').onClick(() => { number = 0; display.setText(fmt(number)); });
        });

        a.grid(4, () => {
          for (const btn of '7 8 9 + 4 5 6 - 1 2 3 / 0 . = *'.split(' ')) {
            a.button(btn).onClick(() => {
              if (/[0-9]/.test(btn)) {
                number = number * 10 + parseInt(btn);
              } else if (btn === '=') {
                number = { '+': (a,b) => a+b, '-': (a,b) => a-b,
                           '*': (a,b) => a*b, '/': (a,b) => a/b }[op!](previous, number);
              } else {
                [previous, number, op] = [number, 0, btn];
              }
              display.setText(fmt(number));
            });
          }
        });
      });
    });
    win.show();
  });
});
