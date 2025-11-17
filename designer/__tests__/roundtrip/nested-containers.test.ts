/**
 * RoundTrip Test: Nested containers (vbox + hbox)
 * XStream-style: inline code, exact assertions
 */

import {
  loadFromString,
  save,
  updateWidgetId,
  findWidget
} from './helpers';

describe('RoundTrip: Nested containers', () => {
  test('load and save with no edits', async () => {
    const code = `// Portions copyright Ryelang developers (Apache 2.0)
// Demonstrates button interaction and spacer layout

import { app } from '../src';

app({ title: 'Button Demo' }, (a) => {
  a.window({ title: 'Button', width: 200, height: 100 }, (win) => {
    let label: any;

    win.setContent(() => {
      a.vbox(() => {
        label = a.label("I'm Waiting ...");
        a.label(''); // Spacer equivalent
        a.button('Click here', async () => {
          await label.setText('Finally ...');
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

  test('adding .withId() to container and widgets', async () => {
    const original = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label("Waiting");
        a.button('Click', async () => {});
      });
    });
    win.show();
  });
});`;

    const result = await loadFromString(original);

    const vboxWidget = findWidget(result.metadata, 'vbox');
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateWidgetId(vboxWidget.id, null, 'mainContainer');
    await updateWidgetId(buttonWidget.id, null, 'clickButton');

    const saveResult = await save('memory');

    const expected = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label("Waiting");
        a.button('Click', async () => {}).withId('clickButton');
      }).withId('mainContainer');
    });
    win.show();
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('renaming .withId() on nested widgets', async () => {
    const original = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label("Status").withId('statusLabel');
        a.label("Message");
      });
    });
    win.show();
  });
});`;

    const result = await loadFromString(original);
    const statusLabel = result.metadata.widgets.find((w: any) => w.widgetId === 'statusLabel');

    await updateWidgetId(statusLabel.id, 'statusLabel', 'messageLabel');

    const saveResult = await save('memory');

    const expected = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label("Status").withId('messageLabel');
        a.label("Message");
      });
    });
    win.show();
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('removing .withId() from container', async () => {
    const original = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label("Test");
      }).withId('containerBox');
    });
    win.show();
  });
});`;

    const result = await loadFromString(original);
    const containerBox = result.metadata.widgets.find((w: any) => w.widgetId === 'containerBox');

    await updateWidgetId(containerBox.id, 'containerBox', null);

    const saveResult = await save('memory');

    const expected = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label("Test");
      });
    });
    win.show();
  });
});`;

    expect(saveResult.content).toBe(expected);
  });
});
