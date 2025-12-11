/**
 * RoundTrip Test: Known Limitations
 *
 * Documents code patterns that currently DON'T survive round-trip transformation.
 * These are important to track as they represent:
 * 1. Future improvements to the designer
 * 2. Limitations users should be aware of
 * 3. Edge cases that need special handling
 *
 * Each test is marked with .skip and includes:
 * - WHY it fails
 * - WHAT gets lost/changed
 * - Potential FIX approach
 */

import * as fs from 'fs';
import { loadFile, save, getDiff, createTestFile, deleteTestFile, cleanupEdited } from './helpers';

describe('RoundTrip: Known Limitations', () => {
  afterEach(() => {
    deleteTestFile('test-limitation.ts');
    cleanupEdited('test-limitation.ts');
  });

  describe('Code Comments', () => {
    test.skip('inline comments on widget lines are lost', async () => {
      // WHY: The designer regenerates widget code from metadata, losing comments
      // WHAT: Comments like "// TODO: fix this" disappear
      // FIX: Store comments in metadata or use AST-preserving approach

      const snippet = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {}).withId('btn1'); // TODO: change this text later
    });
  });
});`;

      createTestFile('test-limitation.ts', snippet);

      const result = await loadFile('tsyne/examples/test-limitation.ts');
      expect(result.success).toBe(true);

      const saveResult = await save();
      expect(saveResult.success).toBe(true);

      const editedContent = fs.readFileSync(
        '/home/paul/scm/tsyne/examples/test-limitation.edited.ts',
        'utf-8'
      );

      // This FAILS - comment is lost
      expect(editedContent).toContain('// TODO: change this text later');
    });

    test.skip('block comments above widgets are lost', async () => {
      // WHY: Designer doesn't track comment associations with widgets
      // WHAT: JSDoc-style comments disappear
      // FIX: Parse and preserve comment nodes in AST

      const snippet = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      /**
       * Primary action button
       * Triggers the main workflow
       */
      button("Click", () => {});
    });
  });
});`;

      createTestFile('test-limitation.ts', snippet);

      await loadFile('tsyne/examples/test-limitation.ts');
      await save();

      const editedContent = fs.readFileSync(
        '/home/paul/scm/tsyne/examples/test-limitation.edited.ts',
        'utf-8'
      );

      // This FAILS - block comment is lost
      expect(editedContent).toContain('Primary action button');
    });
  });

  describe('Code Formatting', () => {
    test.skip('custom indentation style is not preserved', async () => {
      // WHY: Designer uses fixed indentation when regenerating code
      // WHAT: User's 4-space or tab preferences get normalized
      // FIX: Detect and preserve indentation style from source

      const snippet = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
    window({ title: "Test" }, () => {
        vbox(() => {
            button("Click", () => {});
        });
    });
});`;

      createTestFile('test-limitation.ts', snippet);

      await loadFile('tsyne/examples/test-limitation.ts');
      await save();

      const originalContent = fs.readFileSync(
        '/home/paul/scm/tsyne/examples/test-limitation.ts',
        'utf-8'
      );
      const editedContent = fs.readFileSync(
        '/home/paul/scm/tsyne/examples/test-limitation.edited.ts',
        'utf-8'
      );

      // This FAILS - 4-space indent becomes 2-space (or vice versa)
      const originalIndent = originalContent.match(/\n(    )vbox/)?.[1];
      const editedIndent = editedContent.match(/\n(\s+)vbox/)?.[1];
      expect(editedIndent).toBe(originalIndent);
    });

    test.skip('trailing whitespace is not preserved', async () => {
      // WHY: Code regeneration trims whitespace
      // WHAT: Trailing spaces/tabs on lines are removed
      // FIX: May not be worth preserving - often undesirable

      const snippet = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {});
    });
  });
});`;

      createTestFile('test-limitation.ts', snippet);

      await loadFile('tsyne/examples/test-limitation.ts');
      await save();

      const editedContent = fs.readFileSync(
        '/home/paul/scm/tsyne/examples/test-limitation.edited.ts',
        'utf-8'
      );

      // This FAILS (and maybe SHOULD fail) - trailing spaces removed
      expect(editedContent).toContain('() => {  \n');
    });
  });

  describe('Complex Event Handlers', () => {
    test.skip('multi-line arrow functions lose formatting', async () => {
      // WHY: Event handlers are stored as .toString() then regenerated
      // WHAT: Original formatting of multi-line callbacks is lost
      // FIX: Use AST to preserve original handler code

      const snippet = `import { app, window, vbox, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", async () => {
        const data = await fetchData();

        if (data.success) {
          console.log('Success!');
        } else {
          console.error('Failed!');
        }
      });
    });
  });
});`;

      createTestFile('test-limitation.ts', snippet);

      await loadFile('tsyne/examples/test-limitation.ts');
      await save();

      const editedContent = fs.readFileSync(
        '/home/paul/scm/tsyne/examples/test-limitation.edited.ts',
        'utf-8'
      );

      // This FAILS - formatting is lost, code becomes one line or poorly formatted
      expect(editedContent).toContain('const data = await fetchData();');
    });
  });

  describe('TypeScript Features', () => {
    test.skip('type annotations on variables are lost', async () => {
      // WHY: Designer executes transpiled JS, losing type information
      // WHAT: Type annotations like `: string` disappear
      // FIX: Parse and preserve type annotations during editing

      const snippet = `import { app, window, vbox, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    const message: string = "Hello";

    vbox(() => {
      label(message);
    });
  });
});`;

      createTestFile('test-limitation.ts', snippet);

      await loadFile('tsyne/examples/test-limitation.ts');
      await save();

      const editedContent = fs.readFileSync(
        '/home/paul/scm/tsyne/examples/test-limitation.edited.ts',
        'utf-8'
      );

      // This FAILS - `: string` is lost
      expect(editedContent).toContain('const message: string');
    });

    test.skip('interface definitions are lost if not used', async () => {
      // WHY: Designer only tracks widget-related code
      // WHAT: Unused interfaces/types are removed
      // FIX: Preserve all top-level type definitions

      const snippet = `import { app, window, vbox, label } from '../core/src';

interface User {
  name: string;
  age: number;
}

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Hello");
    });
  });
});`;

      createTestFile('test-limitation.ts', snippet);

      await loadFile('tsyne/examples/test-limitation.ts');
      await save();

      const editedContent = fs.readFileSync(
        '/home/paul/scm/tsyne/examples/test-limitation.edited.ts',
        'utf-8'
      );

      // This FAILS - interface is lost
      expect(editedContent).toContain('interface User');
    });
  });

  describe('Import Statements', () => {
    test.skip('unused imports are removed', async () => {
      // WHY: Designer regenerates imports based on widgets actually used
      // WHAT: Imports for widgets that aren't in the tree disappear
      // FIX: Preserve all original imports or use smart import management

      const snippet = `import { app, window, vbox, hbox, label, button, entry } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Hello");
      // Note: button, entry, hbox not used
    });
  });
});`;

      createTestFile('test-limitation.ts', snippet);

      await loadFile('tsyne/examples/test-limitation.ts');
      await save();

      const editedContent = fs.readFileSync(
        '/home/paul/scm/tsyne/examples/test-limitation.edited.ts',
        'utf-8'
      );

      // This FAILS - unused imports removed
      expect(editedContent).toContain('button');
      expect(editedContent).toContain('entry');
    });

    test.skip('import order is not preserved', async () => {
      // WHY: Designer regenerates imports in alphabetical or usage order
      // WHAT: Original import ordering is lost
      // FIX: Preserve original import statement exactly

      const snippet = `import { window, vbox, label, button, app } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Hello");
    });
  });
});`;

      createTestFile('test-limitation.ts', snippet);

      await loadFile('tsyne/examples/test-limitation.ts');
      await save();

      const originalContent = fs.readFileSync(
        '/home/paul/scm/tsyne/examples/test-limitation.ts',
        'utf-8'
      );
      const editedContent = fs.readFileSync(
        '/home/paul/scm/tsyne/examples/test-limitation.edited.ts',
        'utf-8'
      );

      const originalImport = originalContent.match(/import \{[^}]+\}/)?.[0];
      const editedImport = editedContent.match(/import \{[^}]+\}/)?.[0];

      // This FAILS - order changes to alphabetical or different ordering
      expect(editedImport).toBe(originalImport);
    });
  });

  describe('Variable References', () => {
    test.skip('variable references in widget properties are lost', async () => {
      // WHY: Designer captures property VALUES, not the expressions
      // WHAT: `label(message)` becomes `label("Hello")` if message = "Hello"
      // FIX: Preserve original source expressions for properties

      const snippet = `import { app, window, vbox, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    const greeting = "Hello, World!";

    vbox(() => {
      label(greeting);
    });
  });
});`;

      createTestFile('test-limitation.ts', snippet);

      await loadFile('tsyne/examples/test-limitation.ts');
      await save();

      const editedContent = fs.readFileSync(
        '/home/paul/scm/tsyne/examples/test-limitation.edited.ts',
        'utf-8'
      );

      // This FAILS - `greeting` becomes `"Hello, World!"`
      expect(editedContent).toContain('label(greeting)');
    });
  });

  describe('Blank Lines and Spacing', () => {
    test.skip('blank lines between widgets are not preserved', async () => {
      // WHY: Designer generates compact widget code
      // WHAT: Visual spacing/grouping via blank lines is lost
      // FIX: Store "spacing hints" in metadata or preserve original line positions

      const snippet = `import { app, window, vbox, label, separator } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Section 1");


      separator();


      label("Section 2");
    });
  });
});`;

      createTestFile('test-limitation.ts', snippet);

      await loadFile('tsyne/examples/test-limitation.ts');
      await save();

      const editedContent = fs.readFileSync(
        '/home/paul/scm/tsyne/examples/test-limitation.edited.ts',
        'utf-8'
      );

      // This FAILS - multiple blank lines become single or removed
      expect(editedContent).toMatch(/label\("Section 1"\);\n\n\n      separator/);
    });
  });
});
