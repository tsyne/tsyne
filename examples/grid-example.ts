import { app, window, vbox, grid, button, label, styles } from '../core/src';

// CSS Classes for styling
styles({
  header: {
    fontSize: 18,
    bold: true,
    color: '#ff6b6b'
  },
  gridButton: {
    padding: 8,
    color: '#4ecdc4'
  },
  gridLabel: {
    fontSize: 12,
    color: '#95e1d3'
  }
});

// Example demonstrating grid layout
app({ title: "Grid Example" }, () => {
  window({ title: "Grid Layout Demo", width: 600, height: 400 }, () => {
    vbox(() => {
      label("2-Column Grid", "header");

      grid(2, () => {
        label("Cell 1,1", "gridLabel");
        label("Cell 1,2", "gridLabel");
        label("Cell 2,1", "gridLabel");
        label("Cell 2,2", "gridLabel");
      });

      label("Button Grid (3 columns)", "header");

      grid(3, () => {
        button("Button 1", () => {
          console.log("Button 1");
        }, "gridButton");

        button("Button 2", () => {
          console.log("Button 2");
        }, "gridButton");

        button("Button 3", () => {
          console.log("Button 3");
        }, "gridButton");

        button("Button 4", () => {
          console.log("Button 4");
        }, "gridButton");

        button("Button 5", () => {
          console.log("Button 5");
        }, "gridButton");

        button("Button 6", () => {
          console.log("Button 6");
        }, "gridButton");
      });

      label("Nested Grid with Mixed Content", "header");

      grid(2, () => {
        vbox(() => {
          label("Column A");
          button("A1", () => {});
          button("A2", () => {});
        });

        vbox(() => {
          label("Column B");
          button("B1", () => {});
          button("B2", () => {});
        });
      });
    });
  });
});
