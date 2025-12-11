/**
 * RoundTrip Test: Inline Code with Exact Assertions
 *
 * XStream-style acceptance tests using inline code fragments
 * and exact equality assertions (.toBe instead of .toContain)
 */

import {
  loadFromString,
  save,
  updateProperty,
  updateWidgetId,
  findWidget
} from './helpers';

describe('RoundTrip: Inline Code with Exact Assertions', () => {
  test('round-trip: simple button with no edits', async () => {
    const code = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click Me", () => {});
    });
  });
});`;

    const result = await loadFromString(code);
    expect(result.success).toBe(true);

    const saveResult = await save('memory');

    // Exact match - round-trip should produce EXACTLY the same code
    expect(saveResult.content).toBe(code);
  });

  test('round-trip: change button text', async () => {
    const original = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click Me", () => {});
    });
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateProperty(buttonWidget.id, 'text', 'Updated');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Updated", () => {});
    });
  });
});`;

    // Exact equality assertion
    expect(saveResult.content).toBe(expected);
  });

  test('round-trip: add .withId()', async () => {
    const original = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {});
    });
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateWidgetId(buttonWidget.id, null, 'clickBtn');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {}).withId('clickBtn');
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('round-trip: remove .withId()', async () => {
    const original = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {}).withId('clickBtn');
    });
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateWidgetId(buttonWidget.id, 'clickBtn', null);

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {});
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('round-trip: multiple widgets', async () => {
    const original = `import { app, window, vbox, label, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Hello");
      button("OK", () => {});
    });
  });
});`;

    const result = await loadFromString(original);
    expect(result.success).toBe(true);

    const saveResult = await save('memory');

    expect(saveResult.content).toBe(original);
  });

  test('round-trip: change property and add ID', async () => {
    const original = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Submit", () => {});
    });
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateProperty(buttonWidget.id, 'text', 'Send');
    await updateWidgetId(buttonWidget.id, null, 'sendBtn');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Send", () => {}).withId('sendBtn');
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('round-trip: nested containers', async () => {
    const original = `import { app, window, vbox, hbox, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      hbox(() => {
        label("Left");
        label("Right");
      });
    });
  });
});`;

    const result = await loadFromString(original);
    expect(result.success).toBe(true);

    const saveResult = await save('memory');

    expect(saveResult.content).toBe(original);
  });

  test('round-trip: button with className', async () => {
    const original = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Delete", () => {}, "danger");
    });
  });
});`;

    const result = await loadFromString(original);
    expect(result.success).toBe(true);

    const saveResult = await save('memory');

    expect(saveResult.content).toBe(original);
  });

  test('round-trip: change className property', async () => {
    const original = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Delete", () => {}, "danger");
    });
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateProperty(buttonWidget.id, 'className', 'warning');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Delete", () => {}, "warning");
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });
});
