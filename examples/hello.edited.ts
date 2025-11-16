import { app, window, vbox, button, label } from '../src';

// Simple Hello World example demonstrating Tsyne's elegant declarative syntax
app({ title: "Hello Tsyne" }, () => {
  window({ title: "Hello World" }, () => {
    vbox(() => {
      label("Welcome to Tsyne!");
      label("A TypeScript wrapper for Fyne");

      button("Press Me!", () => {
        console.log("Button clicked!");
      });

      button("Exit", () => {
        process.exit(0);
      });
    });
  });
});
