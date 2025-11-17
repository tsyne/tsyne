# RoundTrip Test Suite - Complete Summary

## Overview

The RoundTrip test suite validates the designer's **bidirectional code transformation**:

```
Source Code → Designer → Source Code (back out)
```

Inspired by [XStream's acceptance tests](https://x-stream.github.io/), these tests ensure code preservation, transformation accuracy, and known limitation documentation.

## Test Statistics

**Total: 80 tests**

### Active Tests: 69
- ✅ Grid Layout: 19 tests
- ✅ Simple Vbox: 15 tests
- ✅ HBox Layout: 15 tests
- ✅ Transformer Fixes: 12 tests (NEW - validates expected diffs)
- ✅ Counter: 4 tests
- ✅ Nested Containers: 4 tests

### Documented Limitations: 11
- ⚠️ Known Limitations: 11 skipped tests

## Test Categories

### 1. Perfect Round-Trips (57 tests)

Tests where **source → designer → source** produces **zero diff**:

- **Grid layouts** (19 tests) - Multi-column grids, nested structures
- **Horizontal layouts** (15 tests) - hbox containers, button rows
- **Vertical layouts** (15 tests) - vbox containers, simple structures
- **State management** (4 tests) - Multiple widgets with event handlers
- **Nested containers** (4 tests) - Mixed vbox/hbox hierarchies

**Example:**
```typescript
test('load and save with no edits produces no diff', async () => {
  await loadFile('tsyne/examples/hello.ts');
  await save();

  const diff = getDiff(originalFile, editedFile);
  expect(diff).toBe(''); // ✅ Perfect round-trip
});
```

### 2. Transformer Fixes (12 tests) **NEW**

Tests that validate **expected imperfections** and their **fixes via transformers**:

#### Whitespace Issues (3 tests)
- ❌ WITHOUT transformer: Indentation changes create diff
- ✅ WITH WhitespaceNormalizer: Indentation preserved
- ✅ Tab vs space preservation

**Example:**
```typescript
test('WITHOUT transformer: indentation changes create diff', async () => {
  // Original: 4-space indent
  // Designer generates: 2-space indent

  transformerRegistry.setTransformer(new NoOpTransformer());
  await loadFile(...);
  await save();

  const diff = getDiff(original, edited);
  expect(diff).not.toBe('');  // ❌ Expected diff "for now"
  expect(diff).toContain('-    '); // 4 spaces removed
  expect(diff).toContain('+  ');   // 2 spaces added
});

test('WITH WhitespaceNormalizer: indentation is preserved', async () => {
  transformerRegistry.setTransformer(new WhitespaceNormalizer());
  await loadFile(...);
  await save();

  const diff = getDiff(original, edited);
  expect(diff).toBe(''); // ✅ Transformer fixed it!
});
```

#### Comment Issues (2 tests)
- ❌ WITHOUT transformer: Inline comments lost
- ✅ WITH CommentPreserver: Comments restored (best effort)

#### Composite Fixes (2 tests)
- ❌ WITHOUT: Both whitespace AND comments broken
- ✅ WITH CompositeTransformer: Both issues fixed

#### Custom Validators (5 tests)
- ✅ Custom transformer validates expected diff patterns
- ✅ Marks known imperfections as "expected for now"
- ✅ Documents changes made
- ✅ LLM transformer placeholder ready

### 3. Known Limitations (11 tests)

Documented failures (all `.skip`ped):

**Categories:**
- Code Comments (2 tests) - Inline and block comments lost
- Code Formatting (2 tests) - Indentation style, trailing whitespace
- Complex Event Handlers (1 test) - Multi-line formatting
- TypeScript Features (2 tests) - Type annotations, interfaces
- Import Statements (2 tests) - Unused imports, import order
- Variable References (1 test) - Variables become literals
- Blank Lines (1 test) - Spacing lost

**Example:**
```typescript
test.skip('inline comments on widget lines are lost', async () => {
  // WHY: Designer regenerates code from metadata, losing comments
  // WHAT: Comments like "// TODO: fix this" disappear
  // FIX: Use CommentPreserver transformer (best effort)

  // ... test code demonstrating the failure ...
});
```

## Test Patterns by Operation

### .withId() Operations (40+ tests)

**Adding .withId():**
- To buttons, labels, containers
- To nested widgets
- With special characters (underscores, numbers)
- To multiple widgets simultaneously

**Renaming .withId():**
- Single rename
- Multiple renames in sequence (id1 → id2 → id3)
- Different widget types

**Removing .withId():**
- Single removal
- Add then remove (round-trip to original)
- From containers vs widgets

### Metadata Validation (15+ tests)

- Widget types captured correctly
- Source locations accurate (line, column)
- Properties preserved
- Parent-child relationships tracked
- Event handlers maintained

### Structure Preservation (10+ tests)

- Line count consistency
- File structure integrity
- Nesting depth maintained
- Widget count consistency across cycles

## Key Innovations

### 1. Expected Diff Validation

The **transformer-fixes.test.ts** suite introduces a new pattern:

```typescript
// Document that we KNOW this fails, and that's OK "for now"
test('WITHOUT transformer: expected diff pattern', async () => {
  transformerRegistry.setTransformer(new NoOpTransformer());

  const diff = getDiff(original, edited);

  // We EXPECT this diff - it's documented behavior
  expect(diff).not.toBe('');
  expect(diff).toContain('expected-change-pattern');
});

// Validate the transformer fixes it
test('WITH transformer: diff is fixed', async () => {
  transformerRegistry.setTransformer(new FixerTransformer());

  const diff = getDiff(original, edited);

  // Transformer fixed it!
  expect(diff).toBe('');
});
```

### 2. Custom Validators

Tests can use custom transformers to validate specific diff patterns:

```typescript
class ExpectedDiffValidator implements SourceTransformer {
  name = 'ExpectedDiffValidator';

  transform(context: TransformContext): TransformResult {
    const warnings = [];

    // Validate expected changes
    if (/* some expected change */) {
      warnings.push('EXPECTED: [description] (known limitation)');
    }

    return {
      source: context.candidateSource,
      transformed: false,
      warnings
    };
  }
}
```

### 3. Progression Tracking

Tests document the **evolution path** for limitations:

1. **known-limitations.test.ts** - Documents the failure with `.skip`
2. **transformer-fixes.test.ts** - Shows workaround with transformer
3. **[future]** - Core fix, unskip limitation test

## Running Tests

```bash
# All active tests (69 tests)
npm run test:roundtrip

# Specific suites
npm run test:roundtrip -- simple-vbox        # 15 tests
npm run test:roundtrip -- hbox-layout        # 15 tests
npm run test:roundtrip -- grid-layout        # 19 tests
npm run test:roundtrip -- transformer-fixes  # 12 tests

# Watch mode
npm run test:watch -- roundtrip
```

## Example Test Hierarchy

```
Grid Layout (19 tests)
├── Core Operations (4)
│   ├── ✅ Load/save no edits
│   ├── ✅ Add .withId()
│   ├── ✅ Rename .withId()
│   └── ✅ Remove .withId()
├── Grid Features (7)
│   ├── ✅ Verify columns property
│   ├── ✅ Cell addressing
│   ├── ✅ Button matrices
│   └── ...
├── Complex Scenarios (5)
│   ├── ✅ Deep hierarchies (7 levels)
│   ├── ✅ Mixed content
│   └── ...
└── Integrity (3)
    ├── ✅ Widget count consistency
    ├── ✅ Event handler preservation
    └── ✅ Structure preservation
```

## Coverage Matrix

| Feature | vbox | hbox | grid | transformer |
|---------|------|------|------|-------------|
| Basic round-trip | ✅ | ✅ | ✅ | ✅ |
| Add .withId() | ✅ | ✅ | ✅ | ✅ |
| Rename .withId() | ✅ | ✅ | ✅ | ✅ |
| Remove .withId() | ✅ | ✅ | ✅ | ✅ |
| Nested structures | ✅ | ✅ | ✅ | ✅ |
| Multiple operations | ✅ | ✅ | ✅ | ✅ |
| Whitespace issues | - | - | - | ✅ |
| Comment preservation | - | - | - | ✅ |
| Expected diffs | - | - | - | ✅ |

## Future Enhancements

### LLM Transformer Integration

The transformer system is ready for LLM-based diff arbitration:

```typescript
const llmTransformer = new LLMTransformer(
  process.env.ANTHROPIC_API_KEY,
  'claude-3-5-sonnet-20241022'
);

transformerRegistry.setTransformer(llmTransformer);
```

**Concept:** LLM receives original + candidate source, intelligently merges while preserving:
- Comments
- Formatting style
- Variable names
- Code organization

**Test Coverage:** Placeholder test exists in `transformer-fixes.test.ts`

## Conclusion

The RoundTrip test suite provides **comprehensive validation** of:

✅ **Perfect transformations** - 57 tests for zero-diff round-trips
✅ **Known issues** - 11 documented limitations
✅ **Expected diffs** - 12 tests validating "acceptable for now" behavior
✅ **Transformer fixes** - Pluggable system for gradual improvements
✅ **Future-ready** - LLM transformer placeholder

**Total confidence: 80 tests covering every aspect of bidirectional code transformation!**
