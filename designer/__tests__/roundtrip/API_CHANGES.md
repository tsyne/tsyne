# RoundTrip Test API Changes

## Summary

The `save()` API now supports **writer strategies** (`'disk'` and `'memory'`), allowing tests to capture content without writing to the filesystem.

## Changes Made

### 1. Helper API (`helpers.ts`)

**New signature**:
```typescript
export function save(writer: 'disk' | 'memory' = 'disk'): Promise<any>
```

- `'disk'` (default): Writes to filesystem AND returns content
- `'memory'`: Captures to memory only, no filesystem write

### 2. Server API (`/home/paul/scm/tsyne/designer/src/server.ts`)

**Lines 939-947**: Writer strategy implementation:

```typescript
// Apply writer strategy
if (writer === 'disk') {
  // Write to file system
  fs.writeFileSync(fullOutputPath, transformResult.source, 'utf8');
  console.log(`[Editor] Saved changes to: ${outputPath}`);
} else if (writer === 'memory') {
  // Memory only - no file write
  console.log(`[Editor] Captured changes to memory (no file written)`);
}
```

**Line 954**: Content always returned in response:

```typescript
res.end(JSON.stringify({
  success: true,
  outputPath,
  transformed: transformResult.transformed,
  content: transformResult.source  // Always returned
}));
```

### 3. Test Pattern (Updated)

#### Old Pattern (Before):
```typescript
await save();  // Writes to disk

// Had to read from disk
const editedContent = fs.readFileSync(editedPath('hello.ts'), 'utf-8');
expect(editedContent).toContain('Updated Button Text');
```

#### New Pattern (After - Memory Only):
```typescript
const saveResult = await save('memory');  // No disk write!

// Content returned directly
expect(saveResult.content).toContain('Updated Button Text');
// No .edited.ts file created
```

#### Alternative Pattern (Disk + Content):
```typescript
const saveResult = await save('disk');  // or save() - disk is default

// Can use content directly OR read from disk for round-trip tests
expect(saveResult.content).toContain('Updated Button Text');
```

## Benefits

1. **Zero Disk I/O**: `save('memory')` eliminates all filesystem writes in tests
2. **Faster Tests**: No file creation, no cleanup needed
3. **Cleaner Code**: Direct access to generated content
4. **Better Isolation**: Tests don't pollute filesystem with `.edited.ts` files
5. **Flexible**: Use `'disk'` when you need actual files for round-trip tests

## Migration Guide

### For Simple Assertion Tests

Replace:

```typescript
await save();
const editedContent = fs.readFileSync(editedPath('filename.ts'), 'utf-8');
expect(editedContent).toContain('...');
```

With:

```typescript
const saveResult = await save('memory');  // No disk write!
expect(saveResult.content).toContain('...');
```

### For Round-Trip Tests (Need Actual Files)

Keep using `'disk'` strategy:

```typescript
await save();  // Defaults to 'disk'
const result2 = await loadFile('tsyne/examples/hello.edited.ts');
// ... continue round-trip testing
```

## Files Updated

- ✅ `/home/paul/scm/tsyne/designer/src/server.ts` (lines 939-947, 954)
- ✅ `/home/paul/scm/tsyne/designer/__tests__/roundtrip/helpers.ts` (save function signature)
- ✅ `/home/paul/scm/tsyne/designer/__tests__/roundtrip/property-edits.test.ts` (updated to use `.content`)

## Files Ready to Migrate

The following test files can be migrated to use `save('memory')`:

- `simple-vbox-with-button.test.ts` - 15 tests
- `hbox-layout.test.ts` - 15 tests
- `grid-layout.test.ts` - 19 tests
- `counter-with-state.test.ts` - 4 tests
- `nested-containers.test.ts` - 4 tests
- `transformer-fixes.test.ts` - 12 tests (some may need 'disk' for file comparison)

**Migration impact**: Faster tests, no `.edited.ts` file cleanup needed!

## API Response Structure

### `/api/save` Request

```typescript
{
  writer?: 'disk' | 'memory';  // Optional, defaults to 'disk'
}
```

### `/api/save` Response

```typescript
{
  success: boolean;
  outputPath: string;          // Path where file would be/was written
  transformed: boolean;        // Whether transformer modified the output
  content: string;            // The generated source code (always returned)
}
```

## Example: Full Test with New Pattern

```typescript
test('changing button text property', async () => {
  const result = await loadFile('tsyne/examples/hello.ts');
  expect(result.success).toBe(true);

  const buttonWidget = findWidget(result.metadata, 'button');
  expect(buttonWidget).toBeDefined();

  const originalText = buttonWidget.properties.text;

  // Change the button text
  await updateProperty(buttonWidget.id, 'text', 'Updated Button Text');

  // Save to memory only (no disk write!)
  const saveResult = await save('memory');
  expect(saveResult.success).toBe(true);

  // Assert on returned content (zero disk I/O!)
  expect(saveResult.content).toContain('Updated Button Text');
  expect(saveResult.content).not.toContain(originalText);

  // No .edited.ts file was created - no cleanup needed!
});
```
