/**
 * RoundTrip Test: Widget Manipulation
 *
 * Tests for adding, deleting, and reordering widgets - core WYSIWYG operations.
 * These are the bread and butter of any visual designer tool.
 */

import {
  loadFromString,
  save,
  addWidget,
  deleteWidget,
  updateWidgetId,
  findWidget,
  findWidgetById
} from './helpers';

describe('RoundTrip: Widget Manipulation', () => {
  describe('Adding Widgets', () => {
    test('add button to empty vbox', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {});
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const vboxWidget = findWidget(result.metadata, 'vbox');

      await addWidget(vboxWidget.id, 'button');

      const saveResult = await save('memory');

      // Should have added a button
      expect(saveResult.content).toContain('a.button(');
    });

    test('add label to vbox with existing widgets', async () => {
      const original = `import { app } from '../core/src';

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

      const result = await loadFromString(original);
      const vboxWidget = findWidget(result.metadata, 'vbox');

      await addWidget(vboxWidget.id, 'label');

      const saveResult = await save('memory');

      // Should have both button and label
      expect(saveResult.content).toContain('a.button(');
      expect(saveResult.content).toContain('a.label(');
    });

    test('add nested container (hbox inside vbox)', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Title');
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const vboxWidget = findWidget(result.metadata, 'vbox');

      await addWidget(vboxWidget.id, 'hbox');

      const saveResult = await save('memory');

      // Should have nested hbox
      expect(saveResult.content).toContain('a.hbox(');
      expect(saveResult.content).toContain('a.label(');
    });
  });

  describe('Deleting Widgets', () => {
    test('delete single widget from container', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Delete Me').onClick(() => {});
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const buttonWidget = findWidget(result.metadata, 'button');

      await deleteWidget(buttonWidget.id);

      const saveResult = await save('memory');

      // Button should be gone, vbox should be empty
      expect(saveResult.content).not.toContain('a.button(');
      expect(saveResult.content).toContain('a.vbox(() => {});');
    });

    test('delete one of multiple widgets', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Keep Me');
        a.button('Delete Me').onClick(() => {});
        a.label('Keep Me Too');
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const buttonWidget = findWidget(result.metadata, 'button');

      await deleteWidget(buttonWidget.id);

      const saveResult = await save('memory');

      // Button should be gone, labels should remain
      expect(saveResult.content).not.toContain('a.button(');
      expect(saveResult.content).toContain('a.label(\'Keep Me\')');
      expect(saveResult.content).toContain('a.label(\'Keep Me Too\')');
    });

    test('delete widget with onClick handler', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Title');
        a.button('Delete').onClick(() => {
          console.log('Important code!');
          performCriticalOperation();
        });
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const buttonWidget = findWidget(result.metadata, 'button');

      await deleteWidget(buttonWidget.id);

      const saveResult = await save('memory');

      // Button and its handler should be gone
      expect(saveResult.content).not.toContain('Important code!');
      expect(saveResult.content).not.toContain('a.button(');
      expect(saveResult.content).toContain('a.label(');
    });

    test('delete container deletes all children', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.hbox(() => {
          a.label('Child 1');
          a.label('Child 2');
        });
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const hboxWidget = findWidget(result.metadata, 'hbox');

      await deleteWidget(hboxWidget.id);

      const saveResult = await save('memory');

      // hbox and its children should be gone
      expect(saveResult.content).not.toContain('a.hbox(');
      expect(saveResult.content).not.toContain('Child 1');
      expect(saveResult.content).not.toContain('Child 2');
    });
  });

  describe('Complex Manipulations', () => {
    test('add widget with withId already set', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Existing').withId('existingLabel');
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const vboxWidget = findWidget(result.metadata, 'vbox');

      await addWidget(vboxWidget.id, 'button');

      const saveResult = await save('memory');

      // Both widgets should exist
      expect(saveResult.content).toContain('.withId(\'existingLabel\')');
      expect(saveResult.content).toContain('a.button(');
    });

    test('delete and re-add widget', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Original').onClick(() => {});
      });
    });
    win.show();
  });
});`;

      // First delete the button
      const result1 = await loadFromString(original);
      const buttonWidget1 = findWidget(result1.metadata, 'button');
      await deleteWidget(buttonWidget1.id);
      const saveResult1 = await save('memory');

      // Then add a new button
      const result2 = await loadFromString(saveResult1.content);
      const vboxWidget = findWidget(result2.metadata, 'vbox');
      await addWidget(vboxWidget.id, 'button');

      const saveResult2 = await save('memory');

      // Should have a button (newly added)
      expect(saveResult2.content).toContain('a.button(');
    });

    test('add multiple widgets in sequence', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {});
    });
    win.show();
  });
});`;

      let currentCode = original;

      // Add label
      let result = await loadFromString(currentCode);
      let vboxWidget = findWidget(result.metadata, 'vbox');
      await addWidget(vboxWidget.id, 'label');
      let saveResult = await save('memory');
      currentCode = saveResult.content;

      // Add button
      result = await loadFromString(currentCode);
      vboxWidget = findWidget(result.metadata, 'vbox');
      await addWidget(vboxWidget.id, 'button');
      saveResult = await save('memory');
      currentCode = saveResult.content;

      // Add entry
      result = await loadFromString(currentCode);
      vboxWidget = findWidget(result.metadata, 'vbox');
      await addWidget(vboxWidget.id, 'entry');
      saveResult = await save('memory');

      // All three should be present
      expect(saveResult.content).toContain('a.label(');
      expect(saveResult.content).toContain('a.button(');
      expect(saveResult.content).toContain('a.entry(');
    });
  });

  describe('Preserving Surrounding Code During Manipulation', () => {
    test('delete widget preserves other onClick handlers', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    let count = 0;

    win.setContent(() => {
      a.vbox(() => {
        a.button('Keep').onClick(() => {
          count++;
          console.log('Keep this handler!');
        });
        a.button('Delete').onClick(() => {
          console.log('Delete this');
        });
        a.button('Also Keep').onClick(() => {
          count--;
          console.log('Also keep this!');
        });
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const buttons = result.metadata.widgets.filter((w: any) => w.widgetType === 'button');
      const deleteButton = buttons.find((b: any) => b.properties.text === 'Delete');

      await deleteWidget(deleteButton.id);

      const saveResult = await save('memory');

      // Deleted handler should be gone
      expect(saveResult.content).not.toContain('Delete this');

      // Other handlers should remain
      expect(saveResult.content).toContain('Keep this handler!');
      expect(saveResult.content).toContain('Also keep this!');
      expect(saveResult.content).toContain('count++');
      expect(saveResult.content).toContain('count--');
    });

    test('add widget preserves variables and state', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    let counter = 0;
    const multiplier = 2;
    let label: any;

    win.setContent(() => {
      a.vbox(() => {
        label = a.label(\`Count: \${counter}\`);
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const vboxWidget = findWidget(result.metadata, 'vbox');

      await addWidget(vboxWidget.id, 'button');

      const saveResult = await save('memory');

      // Variables should still be present
      expect(saveResult.content).toContain('let counter = 0');
      expect(saveResult.content).toContain('const multiplier = 2');
      expect(saveResult.content).toContain('let label: any');

      // New button should be added
      expect(saveResult.content).toContain('a.button(');
    });

    test('delete widget preserves when() on other widgets', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    let showFirst = true;
    let showSecond = false;

    win.setContent(() => {
      a.vbox(() => {
        a.label('First').when(() => showFirst);
        a.label('Delete Me');
        a.label('Second').when(() => showSecond);
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const labels = result.metadata.widgets.filter((w: any) => w.widgetType === 'label');
      const deleteLabel = labels.find((l: any) => l.properties.text === 'Delete Me');

      await deleteWidget(deleteLabel.id);

      const saveResult = await save('memory');

      // when() should be preserved on remaining widgets
      expect(saveResult.content).toContain('.when(() => showFirst)');
      expect(saveResult.content).toContain('.when(() => showSecond)');
      expect(saveResult.content).not.toContain('Delete Me');
    });
  });
});
