# RoundTrip Tests

## What are RoundTrip Tests?

Inspired by [XStream's acceptance tests](https://x-stream.github.io/), RoundTrip tests verify that the designer preserves the **full contract** of bidirectional code transformation:

```
Source Code → Internal Representation → Source Code (back out)
```

These tests ensure that:
1. Loading code into the designer doesn't lose information
2. Editing in the designer produces correct source modifications
3. Saving back produces clean, diff-able code without unintended changes

## XStream-Style Testing

Like XStream, these tests use:
- **Inline code fragments** - No external files, code embedded in tests
- **Exact equality assertions** - `.toBe()` instead of `.toContain()`
- **Self-contained examples** - Each test is fully readable in isolation

## Test Structure

Each test file focuses on a specific **code pattern** or **example application**:

### XStream-Style Tests (Inline Code, Exact Assertions)
- **inline-exact.test.ts** - Self-contained tests with inline code fragments - 9 tests
  - Uses `loadFromString()` instead of `loadFile()`
  - Uses `expect().toBe()` for exact equality instead of `.toContain()`
  - Uses `save('memory')` - no filesystem I/O
  - Each test is fully self-documenting

### File-Based Tests (Expected to Succeed)
- **simple-vbox-with-button.test.ts** - Tests basic layout (hello.ts) - 15 tests
- **counter-with-state.test.ts** - Tests state management with multiple buttons (02-counter.ts) - 4 tests
- **nested-containers.test.ts** - Tests nested layout containers (03-button-spacer.ts) - 4 tests
- **hbox-layout.test.ts** - Tests horizontal layouts (hbox-example.ts) - 15 tests
- **grid-layout.test.ts** - Tests grid layouts with multiple columns (grid-example.ts) - 19 tests
- **property-edits.test.ts** - Tests property changes (text, className, etc.) - 15 tests

### Known Limitations (Expected to Fail)
- **known-limitations.test.ts** - Documents code patterns that DON'T survive round-trip - 11 tests
  - All tests marked with `.skip` to prevent CI failures
  - Each test documents WHY it fails, WHAT is lost, and potential FIX
  - Categories: Comments, Formatting, Event Handlers, TypeScript Features, Imports, etc.

### Transformer Fixes (Expected Imperfections)
- **transformer-fixes.test.ts** - Tests imperfect round-trips WITH and WITHOUT transformers - 12 tests
  - Tests cases that DON'T round-trip perfectly without transformers
  - Validates transformer plugins can fix known issues
  - Documents "expected for now" diff patterns
  - Categories: Whitespace, Comments, Composite fixes, Custom validators

## Common Patterns

All tests verify four core operations:

1. **Load/Save with no edits** - Produces zero diff
2. **Adding .withId()** - Cleanly adds widget IDs
3. **Renaming .withId()** - Updates IDs without breaking code
4. **Removing .withId()** - Cleanly removes IDs

## Helpers

The `helpers.ts` module provides shared utilities:

- `loadFromString(code)` - Load inline code into designer (XStream-style)
- `loadFile(path)` - Load a file into the designer
- `save(writer)` - Save changes: `'memory'` (no disk) or `'disk'` (default)
- `updateProperty(id, property, value)` - Modify widget properties
- `updateWidgetId(id, oldId, newId)` - Modify widget IDs
- `getDiff(original, edited)` - Compute file differences
- `findWidget(metadata, type, property)` - Locate widgets in metadata
- `cleanupEdited(filename)` - Remove temporary .edited.ts files

## Adding New Tests

### XStream-Style (Recommended)

```typescript
test('round-trip: description', async () => {
  const original = `import { app, window, vbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Click", () => {});
    });
  });
});`;

  const result = await loadFromString(original);

  // Make edits...
  const buttonWidget = findWidget(result.metadata, 'button');
  await updateProperty(buttonWidget.id, 'text', 'Updated');

  const saveResult = await save('memory');

  const expected = `import { app, window, vbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      button("Updated", () => {});
    });
  });
});`;

  expect(saveResult.content).toBe(expected);  // Exact match!
});
```

### File-Based (Legacy)

1. Choose an example file that demonstrates a specific pattern
2. Create a descriptive test file: `pattern-description.test.ts`
3. Use helpers to eliminate boilerplate
4. Test all four core operations
5. Update this README

## Why "RoundTrip"?

The name emphasizes the bidirectional nature of the designer:
- Code flows **in** (parsing/execution)
- Gets transformed in the designer (editing)
- Flows **back out** (code generation)

Just like XStream's XML ↔ Object tests, we verify the full round trip produces correct results.

## Known Limitations

The `known-limitations.test.ts` file is crucial for:

1. **Transparency** - Users know what to expect
2. **Future Work** - Tracks improvements needed
3. **Regression Prevention** - When we fix a limitation, we unskip the test

Each skipped test includes:
```typescript
test.skip('description of what fails', async () => {
  // WHY: Explanation of root cause
  // WHAT: Specific thing that gets lost/changed
  // FIX: Potential solution approach

  // ... test code that demonstrates the failure ...
});
```

When implementing fixes:
1. Find the relevant `.skip` test
2. Implement the fix
3. Remove `.skip` to enable the test
4. Verify it passes consistently
