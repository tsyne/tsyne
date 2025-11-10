import { app, window, vbox, hbox, button, label } from '../src';

// Counter example demonstrating state management with Tsyne
let countLabel: any;
let count = 0;

function updateCounter() {
  if (countLabel) {
    countLabel.setText(`Count: ${count}`);
  }
}

app({ title: "Counter App" }, () => {
  window({ title: "Simple Counter" }, () => {
    vbox(() => {
      countLabel = label("Count: 0");

      hbox(() => {
        button("-", () => {
          count--;
          updateCounter();
        });

        button("Reset", () => {
          count = 0;
          updateCounter();
        });

        button("+", () => {
          count++;
          updateCounter();
        });
      });
    });
  });
});
