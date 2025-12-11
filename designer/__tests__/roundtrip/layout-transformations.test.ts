/**
 * RoundTrip Test: Layout Transformations
 *
 * Tests for transforming layouts - a key WYSIWYG feature.
 * Users should be able to switch between vbox, hbox, grid, etc.
 * Think Interface Builder's ability to change stack view orientation.
 */

import {
  loadFromString,
  save,
  updateProperty,
  findWidget
} from './helpers';

describe('RoundTrip: Layout Transformations', () => {
  describe('Basic Layout Switching', () => {
    test('vbox to hbox transformation preserves children', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('First');
        a.label('Second');
        a.button('Third').onClick(() => {});
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const vboxWidget = findWidget(result.metadata, 'vbox');

      // Transform vbox to hbox
      await updateProperty(vboxWidget.id, '_layout', 'hbox');

      const saveResult = await save('memory');

      // Should now be hbox with same children
      expect(saveResult.content).toContain('a.hbox(() => {');
      expect(saveResult.content).not.toContain('a.vbox(() => {');
      expect(saveResult.content).toContain('a.label(\'First\')');
      expect(saveResult.content).toContain('a.label(\'Second\')');
      expect(saveResult.content).toContain('a.button(\'Third\'');
    });

    test('hbox to vbox transformation preserves children', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.hbox(() => {
        a.button('Left').onClick(() => {});
        a.button('Center').onClick(() => {});
        a.button('Right').onClick(() => {});
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const hboxWidget = findWidget(result.metadata, 'hbox');

      // Transform hbox to vbox
      await updateProperty(hboxWidget.id, '_layout', 'vbox');

      const saveResult = await save('memory');

      // Should now be vbox
      expect(saveResult.content).toContain('a.vbox(() => {');
      expect(saveResult.content).not.toContain('a.hbox(() => {');
      expect(saveResult.content).toContain('a.button(\'Left\'');
      expect(saveResult.content).toContain('a.button(\'Center\'');
      expect(saveResult.content).toContain('a.button(\'Right\'');
    });
  });

  describe('Grid Layout Transformations', () => {
    test('vbox to grid preserves children', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('1');
        a.label('2');
        a.label('3');
        a.label('4');
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const vboxWidget = findWidget(result.metadata, 'vbox');

      // Transform to 2-column grid
      await updateProperty(vboxWidget.id, '_layout', 'grid');
      await updateProperty(vboxWidget.id, '_gridColumns', 2);

      const saveResult = await save('memory');

      // Should be grid with 2 columns
      expect(saveResult.content).toContain('a.grid(2, () => {');
      expect(saveResult.content).not.toContain('a.vbox(');
      expect(saveResult.content).toContain('a.label(\'1\')');
      expect(saveResult.content).toContain('a.label(\'2\')');
      expect(saveResult.content).toContain('a.label(\'3\')');
      expect(saveResult.content).toContain('a.label(\'4\')');
    });

    test('grid to vbox preserves children and onClick handlers', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.grid(3, () => {
        a.button('A').onClick(() => { console.log('A'); });
        a.button('B').onClick(() => { console.log('B'); });
        a.button('C').onClick(() => { console.log('C'); });
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const gridWidget = findWidget(result.metadata, 'grid');

      // Transform to vbox
      await updateProperty(gridWidget.id, '_layout', 'vbox');

      const saveResult = await save('memory');

      // Should be vbox with all onClick handlers
      expect(saveResult.content).toContain('a.vbox(() => {');
      expect(saveResult.content).not.toContain('a.grid(');
      expect(saveResult.content).toContain('console.log(\'A\')');
      expect(saveResult.content).toContain('console.log(\'B\')');
      expect(saveResult.content).toContain('console.log(\'C\')');
    });

    test('change grid column count', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.grid(2, () => {
        a.label('1');
        a.label('2');
        a.label('3');
        a.label('4');
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const gridWidget = findWidget(result.metadata, 'grid');

      // Change from 2 columns to 3
      await updateProperty(gridWidget.id, '_gridColumns', 3);

      const saveResult = await save('memory');

      // Should be 3-column grid
      expect(saveResult.content).toContain('a.grid(3, () => {');
      expect(saveResult.content).not.toContain('a.grid(2,');
    });
  });

  describe('Complex Layout Transformations', () => {
    test('nested layout transformation preserves structure', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Title');
        a.hbox(() => {
          a.button('Left').onClick(() => {});
          a.button('Right').onClick(() => {});
        });
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const hboxWidget = findWidget(result.metadata, 'hbox');

      // Transform inner hbox to vbox
      await updateProperty(hboxWidget.id, '_layout', 'vbox');

      const saveResult = await save('memory');

      // Outer vbox should remain, inner should be vbox now
      expect(saveResult.content).toMatch(/a\.vbox\(\(\) => \{[\s\S]*a\.vbox\(\(\) => \{/);
      expect(saveResult.content).toContain('a.label(\'Title\')');
      expect(saveResult.content).toContain('a.button(\'Left\'');
      expect(saveResult.content).toContain('a.button(\'Right\'');
    });

    test('layout transformation preserves withId', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Content').withId('myLabel');
        a.button('Action').onClick(() => {}).withId('myButton');
      }).withId('container');
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const vboxWidget = findWidget(result.metadata, 'vbox');

      // Transform to hbox
      await updateProperty(vboxWidget.id, '_layout', 'hbox');

      const saveResult = await save('memory');

      // Should be hbox with all IDs preserved
      expect(saveResult.content).toContain('a.hbox(() => {');
      expect(saveResult.content).toContain('.withId(\'container\')');
      expect(saveResult.content).toContain('.withId(\'myLabel\')');
      expect(saveResult.content).toContain('.withId(\'myButton\')');
    });

    test('layout transformation preserves when() conditions', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    let isVisible = true;

    win.setContent(() => {
      a.vbox(() => {
        a.label('Always Shown');
        a.button('Conditional').onClick(() => {}).when(() => isVisible);
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const vboxWidget = findWidget(result.metadata, 'vbox');

      // Transform to hbox
      await updateProperty(vboxWidget.id, '_layout', 'hbox');

      const saveResult = await save('memory');

      // Should preserve when()
      expect(saveResult.content).toContain('a.hbox(() => {');
      expect(saveResult.content).toContain('.when(() => isVisible)');
    });

    test('layout transformation preserves style classes', async () => {
      const original = `import { app, styles } from '../core/src';

styles({
  primary: {
    color: '#007acc'
  }
});

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Styled', "primary").onClick(() => {});
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const vboxWidget = findWidget(result.metadata, 'vbox');

      // Transform to hbox
      await updateProperty(vboxWidget.id, '_layout', 'hbox');

      const saveResult = await save('memory');

      // Should preserve style class
      expect(saveResult.content).toContain('a.hbox(() => {');
      expect(saveResult.content).toContain(', \'primary\')');
    });
  });

  describe('Special Layout Types', () => {
    test('vbox to scroll container transformation', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Item 1');
        a.label('Item 2');
        a.label('Item 3');
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const vboxWidget = findWidget(result.metadata, 'vbox');

      // Transform to scroll container
      await updateProperty(vboxWidget.id, '_layout', 'scroll');

      const saveResult = await save('memory');

      // Should be scroll with vbox inside
      expect(saveResult.content).toContain('a.scroll(() => {');
      expect(saveResult.content).toContain('a.label(\'Item 1\')');
    });

    test('vbox to border layout transformation', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Header');
        a.label('Content');
        a.label('Footer');
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const vboxWidget = findWidget(result.metadata, 'vbox');

      // Transform to border layout
      await updateProperty(vboxWidget.id, '_layout', 'border');

      const saveResult = await save('memory');

      // Should be border layout
      expect(saveResult.content).toContain('a.border(');
    });

    test('vbox to tabs transformation', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Tab 1 Content');
        a.label('Tab 2 Content');
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const vboxWidget = findWidget(result.metadata, 'vbox');

      // Transform to tabs
      await updateProperty(vboxWidget.id, '_layout', 'tabs');

      const saveResult = await save('memory');

      // Should be tabs
      expect(saveResult.content).toContain('a.tabs(');
    });
  });

  describe('Layout Transformation Edge Cases', () => {
    test('empty container layout transformation', async () => {
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

      // Transform empty vbox to hbox
      await updateProperty(vboxWidget.id, '_layout', 'hbox');

      const saveResult = await save('memory');

      // Should be empty hbox
      expect(saveResult.content).toContain('a.hbox(() => {})');
    });

    test('single child layout transformation', async () => {
      const original = `import { app } from '../core/src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Only Child');
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const vboxWidget = findWidget(result.metadata, 'vbox');

      // Transform to hbox
      await updateProperty(vboxWidget.id, '_layout', 'hbox');

      const saveResult = await save('memory');

      // Should preserve single child
      expect(saveResult.content).toContain('a.hbox(() => {');
      expect(saveResult.content).toContain('a.label(\'Only Child\')');
    });
  });
});
