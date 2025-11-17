/**
 * RoundTrip Test: Transformer Fixes
 * XStream-style: inline code, exact assertions
 *
 * Tests cases that DON'T round-trip perfectly without transformers,
 * but can be fixed using the transformer plugin system.
 */

import {
  loadFromString,
  save,
  updateWidgetId
} from './helpers';

describe('RoundTrip: Transformer Fixes', () => {
  test('basic round-trip without transformer', async () => {
    const code = `import { app, window, vbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {});
    });
  });
});`;

    const result = await loadFromString(code);
    expect(result.success).toBe(true);

    const saveResult = await save('memory');

    expect(saveResult.content).toBe(code);
  });

  test('adding .withId() produces expected output', async () => {
    const original = `import { app, window, vbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {});
    });
  });
});`;

    const result = await loadFromString(original);
    const button = result.metadata.widgets.find((w: any) => w.widgetType === 'button');

    await updateWidgetId(button.id, null, 'actionBtn');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {}).withId('actionBtn');
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('multiple edits in sequence', async () => {
    const original = `import { app, window, vbox, button, label } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Title");
      button("Action", () => {});
    });
  });
});`;

    const result = await loadFromString(original);

    const button = result.metadata.widgets.find((w: any) => w.widgetType === 'button');
    const label = result.metadata.widgets.find((w: any) => w.widgetType === 'label');

    await updateWidgetId(button.id, null, 'btn');
    await updateWidgetId(label.id, null, 'lbl');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button, label } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Title").withId('lbl');
      button("Action", () => {}).withId('btn');
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('nested containers with multiple IDs', async () => {
    const original = `import { app, window, vbox, hbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      hbox(() => {
        button("A", () => {});
        button("B", () => {});
      });
    });
  });
});`;

    const result = await loadFromString(original);

    const vbox = result.metadata.widgets.find((w: any) => w.widgetType === 'vbox');
    const hbox = result.metadata.widgets.find((w: any) => w.widgetType === 'hbox');
    const buttons = result.metadata.widgets.filter((w: any) => w.widgetType === 'button');

    await updateWidgetId(vbox.id, null, 'main');
    await updateWidgetId(hbox.id, null, 'row');
    await updateWidgetId(buttons[0].id, null, 'btnA');
    await updateWidgetId(buttons[1].id, null, 'btnB');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, hbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      hbox(() => {
        button("A", () => {}).withId('btnA');
        button("B", () => {}).withId('btnB');
      }).withId('row');
    }).withId('main');
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('preserves widget order after edits', async () => {
    const original = `import { app, window, vbox, label } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("First");
      label("Second");
      label("Third");
    });
  });
});`;

    const result = await loadFromString(original);

    const labels = result.metadata.widgets.filter((w: any) => w.widgetType === 'label');
    const secondLabel = labels.find((l: any) => l.properties.text === 'Second');

    await updateWidgetId(secondLabel.id, null, 'middle');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, label } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("First");
      label("Second").withId('middle');
      label("Third");
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('complex nested structure with grid', async () => {
    const original = `import { app, window, vbox, grid, label } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(2, () => {
        label("A");
        label("B");
        label("C");
        label("D");
      });
    });
  });
});`;

    const result = await loadFromString(original);

    const grid = result.metadata.widgets.find((w: any) => w.widgetType === 'grid');

    await updateWidgetId(grid.id, null, 'mainGrid');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, grid, label } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(2, () => {
        label("A");
        label("B");
        label("C");
        label("D");
      }).withId('mainGrid');
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });
});
