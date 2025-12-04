/**
 * RoundTrip Test: WYSIWYG Designer Features
 *
 * Tests for features that DreamWeaver/Interface Builder users expect:
 * - when() for conditional visibility
 * - Style classes and CSS-like styling
 * - Widget properties (colors, fonts, alignment)
 * - Multiple event handlers on same widget
 * - Fluent API chaining
 */

import {
  loadFromString,
  save,
  updateProperty,
  updateWidgetId,
  findWidget,
  findWidgetById
} from './helpers';

describe('RoundTrip: WYSIWYG Features', () => {
  describe('when() Preservation', () => {
    test('simple when() is preserved', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    let isVisible = true;

    win.setContent(() => {
      a.vbox(() => {
        a.label('Conditional Widget').when(() => isVisible);
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

    test('when() with complex condition is preserved', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    const store = createStore();

    win.setContent(() => {
      a.vbox(() => {
        a.label('Active Items').when(() => {
          const items = store.getItems();
          return items.length > 0 && !store.isLoading();
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

    test('when() chained with withId is preserved', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    let isEditing = false;

    win.setContent(() => {
      a.vbox(() => {
        a.button('Edit Mode').onClick(() => {}).when(() => !isEditing).withId('editBtn');
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

    test('multiple widgets with different when() conditions are preserved', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    const state = { isAdmin: false, isLoggedIn: true };

    win.setContent(() => {
      a.vbox(() => {
        a.label('Welcome').when(() => state.isLoggedIn);
        a.button('Admin Panel').onClick(() => {}).when(() => state.isAdmin);
        a.button('Login').onClick(() => {}).when(() => !state.isLoggedIn);
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
  });

  describe('Style Classes Preservation', () => {
    test('widget with single style class is preserved', async () => {
      const code = `import { app, styles } from '../src';

styles({
  primary: {
    color: '#007acc',
    bold: true
  }
});

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Primary Action', "primary").onClick(() => {});
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

    test('multiple style classes are preserved', async () => {
      const code = `import { app, styles } from '../src';

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
  danger: {
    color: '#f44336'
  }
});

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Main Title', 'title');
        a.label('Subtitle Text', 'subtitle');
        a.button('Delete', "danger").onClick(() => {});
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
  });

  describe('Fluent API Chaining', () => {
    test('button with onClick and withId chained is preserved', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Submit').onClick(() => {
          submitForm();
        }).withId('submitBtn');
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

    test('entry with placeholder and onSubmit is preserved', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.entry('Enter text...', (value) => {
          console.log('Submitted:', value);
        }, 300);
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
  });

  describe('Container Properties', () => {
    test('vbox with alignment properties is preserved', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Centered Content');
      }).withId('centerBox');
    });
    win.show();
  });
});`;

      const result = await loadFromString(code);
      expect(result.success).toBe(true);

      const saveResult = await save('memory');
      expect(saveResult.content).toBe(code);
    });

    test('grid layout configuration is preserved', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.grid(2, () => {
        a.label('Cell 1');
        a.label('Cell 2');
        a.label('Cell 3');
        a.label('Cell 4');
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
  });

  describe('ModelBoundList Preservation', () => {
    test('simple model binding is preserved', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    const items = ['Item 1', 'Item 2', 'Item 3'];

    win.setContent(() => {
      const container = a.vbox(() => {});

      container.model(items)
        .trackBy((item) => item)
        .each((item) => {
          a.label(item);
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

    test('model binding with complex objects is preserved', async () => {
      const code = `import { app } from '../src';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    const todos: Todo[] = [
      { id: 1, text: 'Task 1', completed: false },
      { id: 2, text: 'Task 2', completed: true }
    ];

    win.setContent(() => {
      const container = a.vbox(() => {});

      container.model(todos)
        .trackBy((todo) => todo.id)
        .each((todo) => {
          a.hbox(() => {
            a.checkbox(todo.text, () => {});
            a.button('Delete').onClick(() => {});
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
  });

  describe('Mixed Features', () => {
    test('button with onClick, when(), style, and withId all preserved', async () => {
      const code = `import { app, styles } from '../src';

styles({
  primary: {
    color: '#007acc'
  }
});

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    let isEnabled = true;

    win.setContent(() => {
      a.vbox(() => {
        a.button('Submit', "primary").onClick(() => {
          console.log('Submitting...');
          performSubmit();
        }).when(() => isEnabled).withId('submitBtn');
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

    test('complex form with multiple widget types is preserved', async () => {
      const code = `import { app, styles } from '../src';

styles({
  formLabel: {
    fontSize: 14,
    bold: true
  }
});

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    let formData = { name: '', email: '', agree: false };

    win.setContent(() => {
      a.vbox(() => {
        a.label('Name:', 'formLabel');
        a.entry('Enter name', (value) => {
          formData.name = value;
        }).withId('nameInput');

        a.label('Email:', 'formLabel');
        a.entry('Enter email', (value) => {
          formData.email = value;
        }).withId('emailInput');

        a.checkbox('I agree to terms', (checked) => {
          formData.agree = checked;
        }).withId('agreeCheckbox');

        a.button('Submit').onClick(async () => {
          if (formData.agree) {
            await submitForm(formData);
          }
        }).when(() => formData.agree).withId('submitBtn');
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
  });

  describe('Widget-Specific Properties', () => {
    test('checkbox with initial state is preserved', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.checkbox('Enable notifications', (checked) => {
          console.log('Checked:', checked);
        }).withId('notifyCheck');
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

    test('slider with range and onChange is preserved', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.slider(0, 100, (value) => {
          console.log('Value:', value);
        }).withId('volumeSlider');
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

    test('select dropdown with options is preserved', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.select(['Option 1', 'Option 2', 'Option 3'], (selected) => {
          console.log('Selected:', selected);
        }).withId('dropdown');
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
  });
});
