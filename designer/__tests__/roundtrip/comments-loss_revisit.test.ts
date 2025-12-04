/**
 * RoundTrip Test: Comment Loss (_revisit_)
 *
 * KNOWN LIMITATION: Comments are lost during save because the designer
 * regenerates code from the widget model, not the AST.
 *
 * These tests document what we LOSE and are marked with .skip.
 * The _revisit_ suffix indicates this is a known issue to address later.
 *
 * WHY COMMENTS ARE LOST:
 * - Designer parses code into a widget metadata model
 * - Comments don't map to widgets, so they're not stored
 * - On save, code is regenerated from metadata only
 *
 * FUTURE SOLUTIONS:
 * - Use AST-preserving transformations (keep original code structure)
 * - Store comments in metadata with position hints
 * - LLM-based code merging to preserve comments intelligently
 */

import {
  loadFromString,
  save,
  updateWidgetId,
  updateProperty,
  findWidget
} from './helpers';

describe('RoundTrip: Comment Loss (_revisit_)', () => {
  describe('Inline Comments Lost', () => {
    test.skip('inline comment on widget line is lost on save', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Title'); // TODO: make this configurable
        a.button('Click').onClick(() => {}); // FIXME: add validation
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(code);
      expect(result.success).toBe(true);

      const saveResult = await save('memory');

      // FAILS: Inline comments are lost
      expect(saveResult.content).toContain('// TODO: make this configurable');
      expect(saveResult.content).toContain('// FIXME: add validation');
    });

    test.skip('inline comment preserved after property edit', async () => {
      const original = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Old Text').onClick(() => {}); // Important: keep this handler
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const buttonWidget = findWidget(result.metadata, 'button');

      await updateProperty(buttonWidget.id, 'text', 'New Text');

      const saveResult = await save('memory');

      // FAILS: Comment is lost after edit
      expect(saveResult.content).toContain('// Important: keep this handler');
    });

    test.skip('inline comment with special characters is lost', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Submit').onClick(() => {}); // @author: John Doe <john@example.com>
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(code);
      const saveResult = await save('memory');

      // FAILS: Comment with email/special chars is lost
      expect(saveResult.content).toContain('// @author: John Doe <john@example.com>');
    });
  });

  describe('Block Comments Lost', () => {
    test.skip('block comment above widget is lost', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        /**
         * Primary action button
         * Triggers the main workflow
         */
        a.button('Start').onClick(() => {});
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(code);
      const saveResult = await save('memory');

      // FAILS: Block comment is lost
      expect(saveResult.content).toContain('Primary action button');
      expect(saveResult.content).toContain('Triggers the main workflow');
    });

    test.skip('JSDoc comment is lost', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        /**
         * @description Submit button for the form
         * @onClick Validates and submits the form data
         */
        a.button('Submit').onClick(() => {
          validateAndSubmit();
        });
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(code);
      const saveResult = await save('memory');

      // FAILS: JSDoc is lost
      expect(saveResult.content).toContain('@description');
      expect(saveResult.content).toContain('@onClick');
    });

    test.skip('multi-line block comment is lost', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        /*
         * NOTE: This section needs refactoring
         * See issue #123 for details
         * DO NOT MODIFY without approval
         */
        a.label('Legacy Code');
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(code);
      const saveResult = await save('memory');

      // FAILS: Multi-line comment is lost
      expect(saveResult.content).toContain('NOTE: This section needs refactoring');
      expect(saveResult.content).toContain('See issue #123');
      expect(saveResult.content).toContain('DO NOT MODIFY');
    });
  });

  describe('Section Comments Lost', () => {
    test.skip('section divider comments are lost', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // ========== Header Section ==========
        a.label('Title');
        a.label('Subtitle');

        // ========== Actions Section ==========
        a.button('Save').onClick(() => {});
        a.button('Cancel').onClick(() => {});

        // ========== Footer Section ==========
        a.label('Status: OK');
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(code);
      const saveResult = await save('memory');

      // FAILS: Section dividers are lost
      expect(saveResult.content).toContain('========== Header Section ==========');
      expect(saveResult.content).toContain('========== Actions Section ==========');
      expect(saveResult.content).toContain('========== Footer Section ==========');
    });

    test.skip('organizational comments are lost', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Form inputs
        a.entry('Name', () => {});
        a.entry('Email', () => {});

        // Form actions
        a.button('Submit').onClick(() => {});
        a.button('Clear').onClick(() => {});
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(code);
      const saveResult = await save('memory');

      // FAILS: Organizational comments are lost
      expect(saveResult.content).toContain('// Form inputs');
      expect(saveResult.content).toContain('// Form actions');
    });
  });

  describe('Comments in onClick Handlers', () => {
    test.skip('comments inside onClick are lost', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Process').onClick(async () => {
          // Step 1: Validate input
          const isValid = validateInput();

          // Step 2: Process data
          if (isValid) {
            await processData();
          }

          // Step 3: Show result
          showResult();
        });
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(code);
      const saveResult = await save('memory');

      // FAILS: Comments inside onClick are lost
      expect(saveResult.content).toContain('// Step 1: Validate input');
      expect(saveResult.content).toContain('// Step 2: Process data');
      expect(saveResult.content).toContain('// Step 3: Show result');
    });

    test.skip('TODO comments in onClick are lost', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Save').onClick(async () => {
          // TODO: Add validation here
          const data = getData();

          // FIXME: Handle errors properly
          await save(data);

          // NOTE: Need to add success message
          console.log('Saved!');
        });
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(code);
      const saveResult = await save('memory');

      // FAILS: TODO/FIXME/NOTE comments are lost
      expect(saveResult.content).toContain('// TODO: Add validation here');
      expect(saveResult.content).toContain('// FIXME: Handle errors properly');
      expect(saveResult.content).toContain('// NOTE: Need to add success message');
    });
  });

  describe('Top-Level Comments', () => {
    test.skip('file header comment is lost', async () => {
      const code = `/**
 * Main Application Entry Point
 *
 * @file Main application with user interface
 * @author Development Team
 * @version 1.0.0
 */

import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('App');
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(code);
      const saveResult = await save('memory');

      // FAILS: File header comment is lost
      expect(saveResult.content).toContain('Main Application Entry Point');
      expect(saveResult.content).toContain('@author Development Team');
    });

    test.skip('license comment is lost', async () => {
      const code = `// Copyright (c) 2024 Company Name
// Licensed under MIT License
// See LICENSE file for details

import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('App');
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(code);
      const saveResult = await save('memory');

      // FAILS: License comment is lost
      expect(saveResult.content).toContain('Copyright (c) 2024');
      expect(saveResult.content).toContain('Licensed under MIT License');
    });
  });

  describe('Comments After Widget Manipulation', () => {
    test.skip('comments lost after adding withId', async () => {
      const original = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Click').onClick(() => {}); // Important button
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const buttonWidget = findWidget(result.metadata, 'button');

      await updateWidgetId(buttonWidget.id, null, 'myButton');

      const saveResult = await save('memory');

      // FAILS: Comment is lost after adding withId
      expect(saveResult.content).toContain('// Important button');
    });

    test.skip('comments lost after changing property', async () => {
      const original = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // User action button
        a.button('Old').onClick(() => {});
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(original);
      const buttonWidget = findWidget(result.metadata, 'button');

      await updateProperty(buttonWidget.id, 'text', 'New');

      const saveResult = await save('memory');

      // FAILS: Comment is lost after property change
      expect(saveResult.content).toContain('// User action button');
    });
  });

  describe('Disabled Code Comments', () => {
    test.skip('commented-out widget code is lost', async () => {
      const code = `import { app } from '../src';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Active');
        // a.button('Disabled Feature').onClick(() => {});
        // a.label('Coming Soon');
      });
    });
    win.show();
  });
});`;

      const result = await loadFromString(code);
      const saveResult = await save('memory');

      // FAILS: Commented-out code is lost
      expect(saveResult.content).toContain('// a.button(\'Disabled Feature\'');
      expect(saveResult.content).toContain('// a.label(\'Coming Soon\')');
    });
  });
});
