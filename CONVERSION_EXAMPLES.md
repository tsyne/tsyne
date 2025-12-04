# Button Conversion Examples

## Before and After Samples

### Example 1: Simple Callback
```typescript
// BEFORE
a.button('Click Me', () => {
  console.log('clicked');
});

// AFTER
a.button('Click Me').onClick(() => {
  console.log('clicked');
});
```

### Example 2: Async Callback
```typescript
// BEFORE
a.button('Save', async () => {
  await saveData();
});

// AFTER
a.button('Save').onClick(async () => {
  await saveData();
});
```

### Example 3: With ClassName
```typescript
// BEFORE
a.button('Submit', handleSubmit, 'primary');

// AFTER
a.button('Submit', 'primary').onClick(handleSubmit);
```

### Example 4: Function Reference
```typescript
// BEFORE
a.button('Start', start);
a.button('Stop', stop);

// AFTER
a.button('Start').onClick(start);
a.button('Stop').onClick(stop);
```

### Example 5: Dynamic Text (Ternary)
```typescript
// BEFORE
a.button(useMetric ? '✓ Metric' : 'Metric', () => {
  useMetric = true;
});

// AFTER
a.button(useMetric ? '✓ Metric' : 'Metric').onClick(() => {
  useMetric = true;
});
```

### Example 6: forEach Loop
```typescript
// BEFORE
[..."789"].forEach(n => a.button(n, () => handleNumber(n)));

// AFTER
[..."789"].forEach(n => a.button(n).onClick(() => handleNumber(n)));
```

### Example 7: Multi-line Callback
```typescript
// BEFORE
a.button('Complex Action', async () => {
  const result = await fetchData();
  processResult(result);
  updateUI();
});

// AFTER
a.button('Complex Action').onClick(async () => {
  const result = await fetchData();
  processResult(result);
  updateUI();
});
```

### Example 8: Chained Methods
```typescript
// BEFORE
a.button('Action', callback).withId('action-btn');

// AFTER
a.button('Action').onClick(callback).withId('action-btn');
```

## Statistics

- **Total Files Modified**: 135
- **Total Conversions**: 716
- **TypeScript/TSX**: 672 conversions
- **Markdown**: 44 conversions
- **Build Status**: ✅ PASSED

## Files by Category

### Examples (110+ files)
- All counter, calculator, todo, and demo files
- All test files for examples
- Accessibility demos
- UI component demos

### Designer (11 files)
- All designer roundtrip tests
- UI editor components

### Ported Apps (6 files)
- fyles, game-of-life, image-viewer
- pixeledit, slydes, solitaire

### Test Apps (4 files)
- calculator-advanced
- test-designer

### Documentation (8 files)
- README.md, LLM.md, HISTORICAL.md
- docs/ACCESSIBILITY.md, docs/reference.md
- And more...
