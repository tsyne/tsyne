/**
 * RoundTrip Test: Simple vbox with button
 * XStream-style: inline code, exact assertions
 */

import {
  loadFromString,
  save,
  updateWidgetId,
  findWidget
} from './helpers';

describe('RoundTrip: Simple vbox with button', () => {
  test('load and save with no edits', async () => {
    const code = `import { app, window, vbox, button, label, styles } from 'tsyne';

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
  window({ title: "Hello World" }, () => {
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
  });
});`;

    const result = await loadFromString(code);
    expect(result.success).toBe(true);

    const saveResult = await save('memory');

    expect(saveResult.content).toBe(code);
  });

  test('adding .withId() to button', async () => {
    const original = `import { app, window, vbox, button, label } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Hello");
      button("Click", () => {});
    });
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateWidgetId(buttonWidget.id, null, 'myButton');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button, label } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Hello");
      button("Click", () => {}).withId('myButton');
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('renaming .withId()', async () => {
    const original = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {}).withId('oldButtonId');
    });
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = result.metadata.widgets.find((w: any) => w.widgetId === 'oldButtonId');

    await updateWidgetId(buttonWidget.id, 'oldButtonId', 'newButtonId');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {}).withId('newButtonId');
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('removing .withId()', async () => {
    const original = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {}).withId('removeMe');
    });
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = result.metadata.widgets.find((w: any) => w.widgetId === 'removeMe');

    await updateWidgetId(buttonWidget.id, 'removeMe', null);

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {});
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('adding .withId() to label widget', async () => {
    const original = `import { app, window, vbox, label } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Title");
    });
  });
});`;

    const result = await loadFromString(original);
    const labelWidget = findWidget(result.metadata, 'label');

    await updateWidgetId(labelWidget.id, null, 'titleLabel');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, label } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Title").withId('titleLabel');
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('adding .withId() to vbox container', async () => {
    const original = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {});
    });
  });
});`;

    const result = await loadFromString(original);
    const vboxWidget = findWidget(result.metadata, 'vbox');

    await updateWidgetId(vboxWidget.id, null, 'mainContainer');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {});
    }).withId('mainContainer');
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('adding .withId() with special characters in ID', async () => {
    const original = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {});
    });
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateWidgetId(buttonWidget.id, null, 'btn_click_01');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {}).withId('btn_click_01');
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('adding .withId() to multiple widgets', async () => {
    const original = `import { app, window, vbox, button, label } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {});
      label("Title");
    });
  });
});`;

    const result = await loadFromString(original);

    const buttonWidget = findWidget(result.metadata, 'button');
    const labelWidget = findWidget(result.metadata, 'label');
    const vboxWidget = findWidget(result.metadata, 'vbox');

    await updateWidgetId(buttonWidget.id, null, 'actionBtn');
    await updateWidgetId(labelWidget.id, null, 'titleLbl');
    await updateWidgetId(vboxWidget.id, null, 'container');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button, label } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {}).withId('actionBtn');
      label("Title").withId('titleLbl');
    }).withId('container');
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('adding then immediately removing .withId()', async () => {
    const original = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {});
    });
  });
});`;

    const result1 = await loadFromString(original);
    const buttonWidget1 = findWidget(result1.metadata, 'button');

    await updateWidgetId(buttonWidget1.id, null, 'tempId');
    const saveResult1 = await save('memory');

    // Load the edited version and remove the ID
    const result2 = await loadFromString(saveResult1.content);
    const buttonWidget2 = result2.metadata.widgets.find((w: any) => w.widgetId === 'tempId');
    await updateWidgetId(buttonWidget2.id, 'tempId', null);

    const saveResult2 = await save('memory');

    // Should be back to original
    expect(saveResult2.content).toBe(original);
  });

  test('verify widget metadata is captured correctly', async () => {
    const code = `import { app, window, vbox, button, label } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Hello");
      button("Click", () => {});
    });
  });
});`;

    const result = await loadFromString(code);
    expect(result.success).toBe(true);
    expect(result.metadata).toBeDefined();
    expect(result.metadata.widgets).toBeDefined();

    const widgetTypes = result.metadata.widgets.map((w: any) => w.widgetType);

    expect(widgetTypes).toContain('window');
    expect(widgetTypes).toContain('vbox');
    expect(widgetTypes).toContain('button');
  });
});
