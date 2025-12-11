import { app, window, vbox, hbox, button, label, styles } from '../core/src';

// CSS Classes for styling
styles({
  header: {
    fontSize: 18,
    bold: true,
    color: '#61dafb'
  },
  buttonGroup: {
    padding: 5
  }
});

// Example demonstrating horizontal layout with hbox
app({ title: "HBox Example" }, () => {
  window({ title: "Horizontal Layout Demo", width: 500, height: 300 }, () => {
    vbox(() => {
      label("Horizontal Button Group", "header");

      hbox(() => {
        button("Left", () => {
          console.log("Left button clicked");
        });

        button("Center", () => {
          console.log("Center button clicked");
        });

        button("Right", () => {
          console.log("Right button clicked");
        });
      });

      label("Nested Layouts");

      hbox(() => {
        vbox(() => {
          label("Column 1");
          button("Action 1", () => {});
        });

        vbox(() => {
          label("Column 2");
          button("Action 2", () => {});
        });
      });
    });
  });
});
