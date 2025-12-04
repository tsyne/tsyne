/**
 * RoundTrip Test: onClick and Imperative Code Preservation
 *
 * Critical for WYSIWYG designers: User-written event handlers must survive roundtrips.
 * These tests verify that complex onClick handlers with imperative code are preserved.
 */

import {
  loadFromString,
  save,
  updateProperty,
  updateWidgetId,
  findWidget,
  findWidgetById
} from './helpers';

describe('RoundTrip: onClick Preservation', () => {
  test('simple onClick handler is preserved', async () => {
    const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Click Me').onClick(() => {
          console.log('Button clicked!');
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

  test('onClick with multiple statements is preserved', async () => {
    const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    let count = 0;

    win.setContent(() => {
      a.vbox(() => {
        a.button('Increment').onClick(() => {
          count++;
          console.log('Count:', count);
          if (count > 10) {
            console.log('Count exceeded 10!');
          }
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

  test('onClick with async/await is preserved', async () => {
    const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Fetch Data').onClick(async () => {
          const response = await fetch('https://api.example.com/data');
          const data = await response.json();
          console.log('Data:', data);
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

  test('onClick with widget reference and setText is preserved', async () => {
    const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    let counter = 0;
    let label: any;

    win.setContent(() => {
      a.vbox(() => {
        label = a.label('Count: 0');
        a.button('Increment').onClick(async () => {
          counter++;
          await label.setText(\`Count: \${counter}\`);
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

  test('onClick with complex conditional logic is preserved', async () => {
    const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Calculate').onClick(() => {
          const x = Math.random();
          if (x < 0.33) {
            console.log('Low');
          } else if (x < 0.66) {
            console.log('Medium');
          } else {
            console.log('High');
          }
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

  test('onClick with try-catch error handling is preserved', async () => {
    const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Safe Operation').onClick(async () => {
          try {
            const result = await riskyOperation();
            console.log('Success:', result);
          } catch (error) {
            console.error('Error:', error);
            alert('Operation failed!');
          }
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

  test('onClick with array operations is preserved', async () => {
    const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    const items: string[] = [];

    win.setContent(() => {
      a.vbox(() => {
        a.button('Add Item').onClick(() => {
          const newItem = \`Item \${items.length + 1}\`;
          items.push(newItem);
          console.log('Items:', items);
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

  test('onClick preserved after adding .withId()', async () => {
    const original = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Click').onClick(() => {
          console.log('Important business logic here!');
          performCriticalOperation();
        });
      });
    });
    win.show();
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateWidgetId(buttonWidget.id, null, 'actionButton');

    const saveResult = await save('memory');

    const expected = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Click').onClick(() => {
          console.log('Important business logic here!');
          performCriticalOperation();
        }).withId('actionButton');
      });
    });
    win.show();
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('onClick preserved after changing button text', async () => {
    const original = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Old Text').onClick(() => {
          console.log('Handler code must survive!');
        });
      });
    });
    win.show();
  });
});`;

    const result = await loadFromString(original);
    const buttonWidget = findWidget(result.metadata, 'button');

    await updateProperty(buttonWidget.id, 'text', 'New Text');

    const saveResult = await save('memory');

    const expected = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('New Text').onClick(() => {
          console.log('Handler code must survive!');
        });
      });
    });
    win.show();
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('multiple different onClick handlers are preserved', async () => {
    const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Save').onClick(async () => {
          await saveData();
          console.log('Data saved!');
        });

        a.button('Load').onClick(async () => {
          const data = await loadData();
          console.log('Data loaded:', data);
        });

        a.button('Delete').onClick(() => {
          if (confirm('Are you sure?')) {
            deleteAllData();
          }
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

  test('onClick with closure over variables is preserved', async () => {
    const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    const apiKey = 'secret-key-123';
    const baseUrl = 'https://api.example.com';

    win.setContent(() => {
      a.vbox(() => {
        a.button('Fetch').onClick(async () => {
          const url = \`\${baseUrl}/data?key=\${apiKey}\`;
          const response = await fetch(url);
          console.log('Response:', response);
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

  test('onClick with object destructuring is preserved', async () => {
    const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Process').onClick(async () => {
          const { data, error } = await fetchData();
          if (error) {
            console.error('Error:', error);
          } else {
            console.log('Data:', data);
          }
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
