import { app, window, vbox, button, label, styles, screenshotIfRequested } from '../src';

// CSS Classes for styling widgets
styles({
  title: {
    fontSize: 20,
    bold: true,
    color: '#4ec9b0'
  },
  subtitle: {
    fontSize: 14,
    italic: true,
    color: '#9cdcfe'
  },
  primaryButton: {
    color: '#007acc',
    padding: 10
  },
  dangerButton: {
    color: '#f44336',
    padding: 10
  }
});

// Simple Hello World example demonstrating Tsyne's elegant declarative syntax
app({ title: "Hello Tsyne" }, () => {
  window({ title: "Hello World" }, (win) => {
    vbox(() => {
      label("Welcome to Tsyne!", "title");
      label("A TypeScript wrapper for Fyne", "subtitle");

      button("Click Me", () => {
        console.log("Button clicked!");
      }, "primaryButton");

      button("Exit", () => {
        process.exit(0);
      }, "dangerButton");
    });
    screenshotIfRequested(win);
  });
});
