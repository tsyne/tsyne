/**
 * RoundTrip Test: Counter with state management
 * XStream-style: inline code, exact assertions
 */

import {
  loadFromString,
  save,
  updateWidgetId,
  findWidget
} from './helpers';

describe('RoundTrip: Counter with state', () => {
  test('load and save with no edits', async () => {
    const code = `// Simple counter example demonstrating state management

import { app } from '../core/src';

app({ title: 'Counter' }, (a) => {
  a.window({ title: 'Counter', width: 300, height: 150 }, (win) => {
    let count = 0;
    let countLabel: any;

    win.setContent(() => {
      a.vbox(() => {
        a.label('Counter Example');
        a.separator();

        countLabel = a.label(\`Count: \${count}\`);

        a.hbox(() => {
          a.button('Decrement').onClick(async () => {
            count--;
            await countLabel.setText(\`Count: \${count}\`);
          });

          a.button('Reset').onClick(async () => {
            count = 0;
            await countLabel.setText(\`Count: \${count}\`);
          });

          a.button('Increment').onClick(async () => {
            count++;
            await countLabel.setText(\`Count: \${count}\`);
          });
        });
      });
    });
    win.show();
  });
});`;

    const result = await loadFromString(code);
    expect(result.success).toBe(true);

    const saveResult = await save('memory');

    expect(saveResult.content).toBe(code);
  });

  test('adding .withId() to multiple buttons', async () => {
    const original = `import { app } from '../core/src';

app({ title: 'Counter' }, (a) => {
  a.window({ title: 'Counter' }, (win) => {
    win.setContent(() => {
      a.hbox(() => {
        a.button('Decrement').onClick(async () => {});
        a.button('Reset').onClick(async () => {});
        a.button('Increment').onClick(async () => {});
      });
    });
    win.show();
  });
});`;

    const result = await loadFromString(original);

    const incrementBtn = findWidget(result.metadata, 'button', { name: 'text', value: 'Increment' });
    const decrementBtn = findWidget(result.metadata, 'button', { name: 'text', value: 'Decrement' });

    await updateWidgetId(incrementBtn.id, null, 'incrementBtn');
    await updateWidgetId(decrementBtn.id, null, 'decrementBtn');

    const saveResult = await save('memory');

    const expected = `import { app } from '../core/src';

app({ title: 'Counter' }, (a) => {
  a.window({ title: 'Counter' }, (win) => {
    win.setContent(() => {
      a.hbox(() => {
        a.button('Decrement').onClick(async () => {}).withId('decrementBtn');
        a.button('Reset').onClick(async () => {});
        a.button('Increment').onClick(async () => {}).withId('incrementBtn');
      });
    });
    win.show();
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('renaming .withId() on specific button', async () => {
    const original = `import { app } from '../core/src';

app({ title: 'Counter' }, (a) => {
  a.window({ title: 'Counter' }, (win) => {
    win.setContent(() => {
      a.hbox(() => {
        a.button('Reset').onClick(async () => {}).withId('resetButton');
      });
    });
    win.show();
  });
});`;

    const result = await loadFromString(original);
    const resetBtn = result.metadata.widgets.find((w: any) => w.widgetId === 'resetButton');

    await updateWidgetId(resetBtn.id, 'resetButton', 'clearButton');

    const saveResult = await save('memory');

    const expected = `import { app } from '../core/src';

app({ title: 'Counter' }, (a) => {
  a.window({ title: 'Counter' }, (win) => {
    win.setContent(() => {
      a.hbox(() => {
        a.button('Reset').onClick(async () => {}).withId('clearButton');
      });
    });
    win.show();
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('removing .withId() from one of many buttons', async () => {
    const original = `import { app } from '../core/src';

app({ title: 'Counter' }, (a) => {
  a.window({ title: 'Counter' }, (win) => {
    win.setContent(() => {
      a.hbox(() => {
        a.button('Decrement').onClick(async () => {}).withId('btn1');
        a.button('Reset').onClick(async () => {}).withId('btn2');
        a.button('Increment').onClick(async () => {}).withId('btn3');
      });
    });
    win.show();
  });
});`;

    const result = await loadFromString(original);
    const btn2 = result.metadata.widgets.find((w: any) => w.widgetId === 'btn2');

    await updateWidgetId(btn2.id, 'btn2', null);

    const saveResult = await save('memory');

    const expected = `import { app } from '../core/src';

app({ title: 'Counter' }, (a) => {
  a.window({ title: 'Counter' }, (win) => {
    win.setContent(() => {
      a.hbox(() => {
        a.button('Decrement').onClick(async () => {}).withId('btn1');
        a.button('Reset').onClick(async () => {});
        a.button('Increment').onClick(async () => {}).withId('btn3');
      });
    });
    win.show();
  });
});`;

    expect(saveResult.content).toBe(expected);
  });
});
