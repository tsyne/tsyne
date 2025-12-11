/**
 * RoundTrip Test: Accessibility
 * Tests that accessibility options can be added, updated, and saved correctly
 */

import {
  loadFromString,
  save,
  updateAccessibility,
  updateWidgetId,
  findWidget
} from './helpers';

describe('RoundTrip: Accessibility', () => {
  test('adding accessibility to button', async () => {
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

    await updateAccessibility(buttonWidget.id, {
      label: 'Submit Form',
      description: 'Submits the registration form',
      role: 'button',
      hint: 'Press Enter or click to submit'
    });

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Submit", () => {}).accessibility({
  "label": "Submit Form",
  "description": "Submits the registration form",
  "role": "button",
  "hint": "Press Enter or click to submit"
});
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('adding accessibility to label', async () => {
    const original = `import { app, window, vbox, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Username:");
    });
  });
});`;

    const result = await loadFromString(original);
    const labelWidget = findWidget(result.metadata, 'label');

    await updateAccessibility(labelWidget.id, {
      label: 'Username Field Label',
      role: 'label'
    });

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Username:").accessibility({
  "label": "Username Field Label",
  "role": "label"
});
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('adding accessibility with .withId() chaining', async () => {
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

    await updateWidgetId(buttonWidget.id, null, 'actionBtn');
    await updateAccessibility(buttonWidget.id, {
      label: 'Action Button',
      description: 'Triggers the main action'
    });

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click Me", () => {}).withId('actionBtn').accessibility({
  "label": "Action Button",
  "description": "Triggers the main action"
});
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('updating existing accessibility options', async () => {
    const original = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Submit", () => {}).accessibility({
  "label": "Old Label",
  "description": "Old description"
});
    });
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateAccessibility(buttonWidget.id, {
      label: 'New Label',
      description: 'New description',
      role: 'button',
      hint: 'Click to submit'
    });

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Submit", () => {}).accessibility({
  "label": "New Label",
  "description": "New description",
  "role": "button",
  "hint": "Click to submit"
});
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('accessibility on container widgets', async () => {
    const original = `import { app, window, vbox } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      vbox(() => {});
    });
  });
});`;

    const result = await loadFromString(original);
    // Find the inner vbox (not the outer one)
    const vboxWidgets = result.metadata.widgets.filter((w: any) => w.widgetType === 'vbox');
    const innerVbox = vboxWidgets.find((w: any) => w.parent !== null);

    await updateAccessibility(innerVbox.id, {
      label: 'Main Container',
      description: 'Container for main content',
      role: 'region'
    });

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      vbox(() => {}).accessibility({
  "label": "Main Container",
  "description": "Container for main content",
  "role": "region"
});
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('accessibility with minimal options', async () => {
    const original = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("OK", () => {});
    });
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateAccessibility(buttonWidget.id, {
      label: 'Confirm'
    });

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("OK", () => {}).accessibility({
  "label": "Confirm"
});
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('verify metadata reflects accessibility before save', async () => {
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

    const accessibility = {
      label: 'Click Button',
      description: 'Test button',
      role: 'button'
    };

    const updateResult = await updateAccessibility(buttonWidget.id, accessibility);
    expect(updateResult.success).toBe(true);

    expect(updateResult.metadata).toBeDefined();
    const updatedWidget = updateResult.metadata.widgets.find((w: any) => w.id === buttonWidget.id);
    expect(updatedWidget.accessibility).toBeDefined();
    expect(updatedWidget.accessibility.label).toBe('Click Button');
    expect(updatedWidget.accessibility.description).toBe('Test button');
    expect(updatedWidget.accessibility.role).toBe('button');
  });

  test('multiple widgets with accessibility', async () => {
    const original = `import { app, window, vbox, button, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Name:");
      button("Save", () => {});
    });
  });
});`;

    const result = await loadFromString(original);
    const labelWidget = findWidget(result.metadata, 'label');
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateAccessibility(labelWidget.id, {
      label: 'Name Label',
      role: 'label'
    });

    await updateAccessibility(buttonWidget.id, {
      label: 'Save Button',
      description: 'Saves the form data',
      role: 'button'
    });

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, button, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Name:").accessibility({
  "label": "Name Label",
  "role": "label"
});
      button("Save", () => {}).accessibility({
  "label": "Save Button",
  "description": "Saves the form data",
  "role": "button"
});
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });
});
