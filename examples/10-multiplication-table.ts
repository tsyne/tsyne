// Portions copyright Ryelang developers (Apache 2.0)
// Multiplication table demonstrating table widget with dynamic cell population

import { app, resolveTransport  } from '../core/src';

app(resolveTransport(), { title: 'Multiplication Table' }, (a) => {
  a.window({ title: 'Multiplication table', width: 330, height: 400 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Multiplication Table (1-10)');
        a.separator();

        // Create table with createCell and updateCell functions
        a.table(
          10, // rows
          10, // columns
          () => {
            // createCell - called once per cell
            return a.label('...');
          },
          (cell: any, row: number, col: number) => {
            // updateCell - called to populate cell data
            const r = row + 1;
            const c = col + 1;
            const product = r * c;
            (async () => {
              await cell.setText(product.toString());
            })();
          }
        );
      });
    });
    win.show();
  });
});
