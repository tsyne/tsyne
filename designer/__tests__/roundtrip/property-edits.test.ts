/**
 * RoundTrip Test: Property Edits
 * Tests that property changes (text, className, etc.) are correctly applied and saved
 * XStream-style: inline code, exact assertions
 */

import {
  loadFromString,
  save,
  updateProperty,
  updateWidgetId,
  findWidget
} from './helpers';

describe('RoundTrip: Property Edits', () => {
  test('changing button text property', async () => {
    const original = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click Me", () => {});
    });
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateProperty(buttonWidget.id, 'text', 'Updated Button Text');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Updated Button Text", () => {});
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('changing button className property', async () => {
    const original = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Delete", () => {}, "primaryButton");
    });
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateProperty(buttonWidget.id, 'className', 'dangerButton');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Delete", () => {}, "dangerButton");
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('changing label text property', async () => {
    const original = `import { app, window, vbox, label } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Original Label");
    });
  });
});`;

    const result = await loadFromString(original);
    const labelWidget = findWidget(result.metadata, 'label');

    await updateProperty(labelWidget.id, 'text', 'Modified Label');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, label } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Modified Label");
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('changing label className property', async () => {
    const original = `import { app, window, vbox, label } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Title", "title");
    });
  });
});`;

    const result = await loadFromString(original);
    const labelWidget = findWidget(result.metadata, 'label');

    await updateProperty(labelWidget.id, 'className', 'subtitle');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, label } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Title", "subtitle");
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('multiple property changes in sequence', async () => {
    const original = `import { app, window, vbox, button, label } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Old Button", () => {}, "oldClass");
      label("Old Label");
    });
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = findWidget(result.metadata, 'button');
    const labelWidget = findWidget(result.metadata, 'label');

    await updateProperty(buttonWidget.id, 'text', 'New Button');
    await updateProperty(buttonWidget.id, 'className', 'customButton');
    await updateProperty(labelWidget.id, 'text', 'New Label');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button, label } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("New Button", () => {}, "customButton");
      label("New Label");
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('property change combined with .withId()', async () => {
    const original = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Submit", () => {});
    });
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateProperty(buttonWidget.id, 'text', 'Action Button');
    await updateWidgetId(buttonWidget.id, null, 'actionBtn');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Action Button", () => {}).withId('actionBtn');
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('changing text to empty string', async () => {
    const original = `import { app, window, vbox, label } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Some Text");
    });
  });
});`;

    const result = await loadFromString(original);
    const labelWidget = findWidget(result.metadata, 'label');

    await updateProperty(labelWidget.id, 'text', '');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, label } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("");
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('changing text with special characters', async () => {
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

    await updateProperty(buttonWidget.id, 'text', 'Click "Here" & Go!');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click "Here" & Go!", () => {});
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('property change preserves other properties', async () => {
    const original = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Keep This", () => {}, "oldClass");
    });
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateProperty(buttonWidget.id, 'className', 'newClass');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Keep This", () => {}, "newClass");
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('verify metadata reflects property change before save', async () => {
    const original = `import { app, window, vbox, button } from 'tsyne';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Original", () => {});
    });
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = findWidget(result.metadata, 'button');
    const originalText = buttonWidget.properties.text;

    const updateResult = await updateProperty(buttonWidget.id, 'text', 'New Text');
    expect(updateResult.success).toBe(true);

    expect(updateResult.metadata).toBeDefined();
    const updatedWidget = updateResult.metadata.widgets.find((w: any) => w.id === buttonWidget.id);
    expect(updatedWidget.properties.text).toBe('New Text');
    expect(updatedWidget.properties.text).not.toBe(originalText);
  });
});
