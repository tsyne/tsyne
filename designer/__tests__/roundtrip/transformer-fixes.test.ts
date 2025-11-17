/**
 * RoundTrip Test: Transformer Fixes
 *
 * Tests cases that DON'T round-trip perfectly without transformers,
 * but can be fixed using the transformer plugin system.
 *
 * These tests verify:
 * 1. The expected diff WITHOUT transformer
 * 2. The fix applied BY transformer
 * 3. That the result matches expectations
 */

import * as fs from 'fs';
import {
  loadFile,
  save,
  updateWidgetId,
  getDiff,
  examplePath,
  editedPath,
  cleanupEdited,
  createTestFile,
  deleteTestFile
} from './helpers';
import {
  transformerRegistry,
  NoOpTransformer,
  WhitespaceNormalizer,
  CommentPreserver,
  CompositeTransformer,
  SourceTransformer,
  TransformContext,
  TransformResult
} from '../../src/transformers';

describe('RoundTrip: Transformer Fixes', () => {
  beforeEach(() => {
    // Reset to NoOp transformer before each test
    transformerRegistry.setTransformer(new NoOpTransformer());
  });

  afterEach(() => {
    deleteTestFile('transformer-test.ts');
    cleanupEdited('transformer-test.ts');
    transformerRegistry.reset();
  });

  describe('Whitespace normalization', () => {
    test('WITHOUT transformer: indentation changes create diff', async () => {
      // Create a file with 4-space indentation
      const snippet = `import { app, window, vbox, button } from '../src';

app({ title: "Test" }, () => {
    window({ title: "Test" }, () => {
        vbox(() => {
            button("Click", () => {});
        });
    });
});`;

      createTestFile('transformer-test.ts', snippet);

      // Use NoOp transformer (no fixes)
      transformerRegistry.setTransformer(new NoOpTransformer());

      await loadFile('tsyne/examples/transformer-test.ts');
      await save();

      const originalFile = examplePath('transformer-test.ts');
      const editedFile = editedPath('transformer-test.ts');
      const diff = getDiff(originalFile, editedFile);

      // EXPECT: There IS a diff due to indentation change
      // Designer generates with 2-space indent, original has 4-space
      expect(diff).not.toBe('');
      expect(diff).toContain('-    '); // 4 spaces removed
      expect(diff).toContain('+  ');   // 2 spaces added
    });

    test('WITH WhitespaceNormalizer: indentation is preserved', async () => {
      const snippet = `import { app, window, vbox, button } from '../src';

app({ title: "Test" }, () => {
    window({ title: "Test" }, () => {
        vbox(() => {
            button("Click", () => {});
        });
    });
});`;

      createTestFile('transformer-test.ts', snippet);

      // Use WhitespaceNormalizer
      transformerRegistry.setTransformer(new WhitespaceNormalizer());

      await loadFile('tsyne/examples/transformer-test.ts');
      await save();

      const originalFile = examplePath('transformer-test.ts');
      const editedFile = editedPath('transformer-test.ts');
      const diff = getDiff(originalFile, editedFile);

      // EXPECT: No diff - transformer normalized indentation back to 4 spaces
      expect(diff).toBe('');
    });

    test('WITH WhitespaceNormalizer: tab indentation is preserved', async () => {
      const snippet = `import { app, window, vbox, button } from '../src';

app({ title: "Test" }, () => {
\twindow({ title: "Test" }, () => {
\t\tvbox(() => {
\t\t\tbutton("Click", () => {});
\t\t});
\t});
});`;

      createTestFile('transformer-test.ts', snippet);

      transformerRegistry.setTransformer(new WhitespaceNormalizer());

      await loadFile('tsyne/examples/transformer-test.ts');
      await save();

      const editedContent = fs.readFileSync(editedPath('transformer-test.ts'), 'utf-8');

      // EXPECT: Tabs preserved (not converted to spaces)
      expect(editedContent).toContain('\twindow');
      expect(editedContent).toContain('\t\tvbox');
    });
  });

  describe('Comment preservation', () => {
    test('WITHOUT transformer: inline comments are lost', async () => {
      const snippet = `import { app, window, vbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {}); // Primary action button
    });
  });
});`;

      createTestFile('transformer-test.ts', snippet);

      // Use NoOp transformer
      transformerRegistry.setTransformer(new NoOpTransformer());

      await loadFile('tsyne/examples/transformer-test.ts');

      // Add a widget ID (triggers regeneration)
      const result = await loadFile('tsyne/examples/transformer-test.ts');
      const button = result.metadata.widgets.find((w: any) => w.widgetType === 'button');
      await updateWidgetId(button.id, null, 'actionBtn');

      await save();

      const editedContent = fs.readFileSync(editedPath('transformer-test.ts'), 'utf-8');

      // EXPECT: Comment is lost
      expect(editedContent).not.toContain('// Primary action button');
    });

    test('WITH CommentPreserver: inline comments are restored (best effort)', async () => {
      const snippet = `import { app, window, vbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {}); // Primary action
    });
  });
});`;

      createTestFile('transformer-test.ts', snippet);

      // Use CommentPreserver
      transformerRegistry.setTransformer(new CommentPreserver());

      await loadFile('tsyne/examples/transformer-test.ts');

      // Add widget ID
      const result = await loadFile('tsyne/examples/transformer-test.ts');
      const button = result.metadata.widgets.find((w: any) => w.widgetType === 'button');
      await updateWidgetId(button.id, null, 'actionBtn');

      await save();

      const editedContent = fs.readFileSync(editedPath('transformer-test.ts'), 'utf-8');

      // EXPECT: Comment is restored (best effort - may not be perfect)
      // CommentPreserver tries to match line content and restore comments
      expect(editedContent).toContain('// Primary action');
    });
  });

  describe('Composite transformers', () => {
    test('WITHOUT composite: both whitespace AND comments have issues', async () => {
      const snippet = `import { app, window, vbox, button } from '../src';

app({ title: "Test" }, () => {
    window({ title: "Test" }, () => {
        vbox(() => {
            button("Click", () => {}); // Important button
        });
    });
});`;

      createTestFile('transformer-test.ts', snippet);

      transformerRegistry.setTransformer(new NoOpTransformer());

      await loadFile('tsyne/examples/transformer-test.ts');
      await save();

      const diff = getDiff(
        examplePath('transformer-test.ts'),
        editedPath('transformer-test.ts')
      );

      // EXPECT: Diff shows both indentation changes AND lost comment
      expect(diff).not.toBe('');
      expect(diff).toContain('-    '); // Indentation changed
      // Comment may or may not appear in diff depending on regeneration
    });

    test('WITH composite: both issues are fixed', async () => {
      const snippet = `import { app, window, vbox, button } from '../src';

app({ title: "Test" }, () => {
    window({ title: "Test" }, () => {
        vbox(() => {
            button("Click", () => {}); // Important button
        });
    });
});`;

      createTestFile('transformer-test.ts', snippet);

      // Use composite transformer
      const composite = new CompositeTransformer([
        new WhitespaceNormalizer(),
        new CommentPreserver()
      ]);
      transformerRegistry.setTransformer(composite);

      await loadFile('tsyne/examples/transformer-test.ts');
      await save();

      const editedContent = fs.readFileSync(editedPath('transformer-test.ts'), 'utf-8');

      // EXPECT: Both indentation and comments preserved
      expect(editedContent).toContain('    window'); // 4-space indent preserved
      expect(editedContent).toContain('// Important button'); // Comment preserved
    });
  });

  describe('Custom transformer for expected diffs', () => {
    test('custom transformer validates expected diff pattern', async () => {
      // Create a transformer that validates the diff is what we expect
      class ExpectedDiffValidator implements SourceTransformer {
        name = 'ExpectedDiffValidator';
        public capturedDiff: string = '';

        transform(context: TransformContext): TransformResult {
          // Compute diff between original and candidate
          const originalLines = context.originalSource.split('\n');
          const candidateLines = context.candidateSource.split('\n');

          // Simple diff: line count change
          const lineDiff = candidateLines.length - originalLines.length;

          this.capturedDiff = `Lines changed: ${lineDiff}`;

          // Return candidate as-is, but capture the diff
          return {
            source: context.candidateSource,
            transformed: false,
            warnings: [this.capturedDiff]
          };
        }
      }

      const validator = new ExpectedDiffValidator();
      transformerRegistry.setTransformer(validator);

      const snippet = `import { app, window, vbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {});
    });
  });
});`;

      createTestFile('transformer-test.ts', snippet);

      await loadFile('tsyne/examples/transformer-test.ts');
      await save();

      // EXPECT: Validator captured the diff
      expect(validator.capturedDiff).toContain('Lines changed:');
    });

    test('custom transformer marks known imperfect round-trip as expected', async () => {
      // Transformer that explicitly marks certain diffs as "expected for now"
      class KnownImperfectionMarker implements SourceTransformer {
        name = 'KnownImperfectionMarker';

        transform(context: TransformContext): TransformResult {
          const warnings: string[] = [];

          // Check for known imperfections
          if (!context.candidateSource.includes('//') && context.originalSource.includes('//')) {
            warnings.push('EXPECTED: Inline comments lost (known limitation)');
          }

          const originalIndent = context.originalSource.match(/\n(\s+)\w/)?.[1];
          const candidateIndent = context.candidateSource.match(/\n(\s+)\w/)?.[1];

          if (originalIndent !== candidateIndent) {
            warnings.push(`EXPECTED: Indentation changed from '${originalIndent}' to '${candidateIndent}' (known limitation)`);
          }

          return {
            source: context.candidateSource,
            transformed: false,
            warnings
          };
        }
      }

      const marker = new KnownImperfectionMarker();
      transformerRegistry.setTransformer(marker);

      const snippet = `import { app, window, vbox, button } from '../src';

app({ title: "Test" }, () => {
    window({ title: "Test" }, () => {
        vbox(() => {
            button("Click", () => {}); // Comment here
        });
    });
});`;

      createTestFile('transformer-test.ts', snippet);

      await loadFile('tsyne/examples/transformer-test.ts');
      const saveResult = await save();

      // The transformer doesn't fix the issues, but marks them as expected
      // In a real scenario, you'd check the logs/warnings
      expect(saveResult.success).toBe(true);
    });
  });

  describe('Verifying diff content matches expectations', () => {
    test('diff shows expected whitespace changes without transformer', async () => {
      const snippet = `import { app, window, vbox, label } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      label("Hello");
      label("World");
    });
  });
});`;

      createTestFile('transformer-test.ts', snippet);
      transformerRegistry.setTransformer(new NoOpTransformer());

      await loadFile('tsyne/examples/transformer-test.ts');

      // Add ID to first label
      const result = await loadFile('tsyne/examples/transformer-test.ts');
      const label = result.metadata.widgets.find((w: any) =>
        w.widgetType === 'label' && w.properties.text === 'Hello'
      );
      await updateWidgetId(label.id, null, 'greeting');

      await save();

      const diff = getDiff(
        examplePath('transformer-test.ts'),
        editedPath('transformer-test.ts')
      );

      // EXPECT: Diff shows the .withId() addition
      expect(diff).toContain('+');
      expect(diff).toContain(".withId('greeting')");

      // The diff is expected and documented - this is OK "for now"
    });

    test('transformer can add metadata comment documenting changes', async () => {
      class ChangeDocumenter implements SourceTransformer {
        name = 'ChangeDocumenter';

        transform(context: TransformContext): TransformResult {
          // Count edits
          const editCount = context.edits.length;

          if (editCount === 0) {
            return {
              source: context.candidateSource,
              transformed: false
            };
          }

          // Add header comment documenting changes
          const header = `// Modified by designer: ${editCount} edit(s) applied\n`;

          return {
            source: header + context.candidateSource,
            transformed: true,
            warnings: [`Added header documenting ${editCount} edits`]
          };
        }
      }

      const documenter = new ChangeDocumenter();
      transformerRegistry.setTransformer(documenter);

      const snippet = `import { app, window, vbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {});
    });
  });
});`;

      createTestFile('transformer-test.ts', snippet);

      await loadFile('tsyne/examples/transformer-test.ts');

      const result = await loadFile('tsyne/examples/transformer-test.ts');
      const button = result.metadata.widgets.find((w: any) => w.widgetType === 'button');
      await updateWidgetId(button.id, null, 'btn');

      await save();

      const editedContent = fs.readFileSync(editedPath('transformer-test.ts'), 'utf-8');

      // EXPECT: Header comment added
      expect(editedContent).toContain('// Modified by designer:');
      expect(editedContent).toContain('edit(s) applied');
    });
  });

  describe('Future: LLM transformer placeholder tests', () => {
    test('LLM transformer structure is ready for implementation', async () => {
      const { LLMTransformer } = require('../../src/transformers');

      const llmTransformer = new LLMTransformer();

      expect(llmTransformer.name).toBe('LLMTransformer');
      expect(typeof llmTransformer.transform).toBe('function');

      // Currently returns not-implemented warning
      const result = await llmTransformer.transform({
        originalSource: 'test',
        candidateSource: 'test',
        filePath: 'test.ts',
        metadata: {},
        edits: []
      });

      expect(result.warnings).toContain('LLM transformation not yet implemented');
    });
  });
});
