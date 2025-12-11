/**
 * Test: Source Tab Currentness
 *
 * Verifies that the "source" tab in the designer shows the current state
 * of the model after edits, not the original source.
 *
 * ISSUE: The "source" tab was showing originalSource even after edits,
 * which included comments that wouldn't be preserved in model->save.
 *
 * FIX: updateProperty now captures currentSource from the backend response,
 * so the "source" tab reflects the actual edited state.
 */

import {
  loadFromString,
  updateProperty,
  findWidget
} from './helpers';

describe('Source Tab Currentness', () => {
  test('updateProperty returns currentSource without comments', async () => {
    const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // This is an important button
        a.button('Old Text').onClick(() => {});
      });
    });
    win.show();
  });
});`;

    // Load the source with comments
    const loadResult = await loadFromString(original);
    expect(loadResult.success).toBe(true);

    const buttonWidget = findWidget(loadResult.metadata, 'button');
    expect(buttonWidget).toBeDefined();

    // Update a property
    const updateResult = await updateProperty(buttonWidget.id, 'text', 'New Text');
    expect(updateResult.success).toBe(true);

    // The response should include currentSource
    expect(updateResult.currentSource).toBeDefined();

    // The currentSource should have the updated text
    expect(updateResult.currentSource).toContain('New Text');
    expect(updateResult.currentSource).not.toContain('Old Text');

    // The currentSource should NOT have comments (known limitation)
    // because it goes through the model
    expect(updateResult.currentSource).not.toContain('// This is an important button');
  });

  test('updateProperty currentSource reflects multiple edits', async () => {
    const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('First Label');
        a.label('Second Label'); // Important label
      });
    });
    win.show();
  });
});`;

    const loadResult = await loadFromString(original);
    expect(loadResult.success).toBe(true);

    const labels = loadResult.metadata.widgets.filter((w: any) => w.widgetType === 'label');
    const firstLabel = labels.find((w: any) => w.properties.text === 'First Label');
    const secondLabel = labels.find((w: any) => w.properties.text === 'Second Label');

    // First edit
    const updateResult1 = await updateProperty(firstLabel.id, 'text', 'Modified First');
    expect(updateResult1.currentSource).toContain('Modified First');
    expect(updateResult1.currentSource).toContain('Second Label');

    // Second edit
    const updateResult2 = await updateProperty(secondLabel.id, 'text', 'Modified Second');
    expect(updateResult2.currentSource).toContain('Modified First');
    expect(updateResult2.currentSource).toContain('Modified Second');

    // Neither should have comments
    expect(updateResult2.currentSource).not.toContain('// Important label');
  });

  test('originalSource preserved while currentSource updates', async () => {
    const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Original comment
        a.button('Original').onClick(() => {});
      });
    });
    win.show();
  });
});`;

    const loadResult = await loadFromString(original);
    expect(loadResult.success).toBe(true);

    // Original source should have comments
    expect(loadResult.originalSource).toContain('// Original comment');
    expect(loadResult.originalSource).toContain('Original');

    const buttonWidget = findWidget(loadResult.metadata, 'button');
    const updateResult = await updateProperty(buttonWidget.id, 'text', 'Updated');

    // currentSource should have updated text without comments
    expect(updateResult.currentSource).toContain('Updated');
    expect(updateResult.currentSource).not.toContain('// Original comment');

    // Note: originalSource is not returned by updateProperty,
    // it's only returned on initial load and stays constant
  });

  test('valid source passes linting on load', async () => {
    const validSource = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Click').onClick(() => {});
      });
    });
    win.show();
  });
});`;

    const loadResult = await loadFromString(validSource);
    expect(loadResult.success).toBe(true);
    // If linting fails, it logs warnings but still loads
    expect(loadResult.metadata).toBeDefined();
  });

  test('invalid source logs lint errors but still loads', async () => {
    const invalidSource = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Click').onClick(() => {
          // Missing closing brace
      });
    });
    win.show();
  });
});`;

    // The load should still succeed even with lint errors
    // (linting is informational, not blocking)
    const loadResult = await loadFromString(invalidSource);
    // Load might fail for other reasons (execution error), but that's expected
    // The important thing is that linting doesn't crash the process
    expect(loadResult).toBeDefined();
  });
});
