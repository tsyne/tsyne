# SVG Rendering Example

This example demonstrates advanced SVG rendering techniques using `@resvg/resvg-js` to convert SVG files to PNG format at runtime.

## ⚠️ Important Note

**In most cases, you should NOT use this approach.** Fyne has built-in SVG support that works perfectly through the bridge. Simply use:

```typescript
app.image({ path: 'icon.svg' });
```

Fyne will load and render the SVG natively, which is:
- ✅ Faster (no conversion overhead)
- ✅ Simpler (less code)
- ✅ Better quality (vector rendering)

## When to Use SVG Rendering

Use the utilities in this example ONLY when you need to:

1. **Create composite images** - Layer multiple SVGs programmatically
   ```typescript
   const composite = createCompositeSVG(100, 100, [
     { type: 'rect', attrs: { width: 100, height: 100, fill: '#f0d9b5' } },
     { type: 'image', attrs: { href: pieceData, x: 10, y: 10, width: 80, height: 80 } }
   ]);
   ```

2. **Pre-render at specific sizes** - When you need exact pixel dimensions
   ```typescript
   const png = renderSVGToBase64('icon.svg', 32, 32);
   ```

3. **Manipulate SVG content** - When you need to modify SVG programmatically

## Performance Comparison

| Method | Speed | Use Case |
|--------|-------|----------|
| Native SVG | Instant | Default - use this! |
| Pre-rendered | ~90ms per file | Special cases only |
| Composite | ~100ms per image | Layering multiple SVGs |

## Files

- `svg-renderer.ts` - Core SVG rendering utilities
- `svg-renderer.test.ts` - Tests for rendering functions
- `example.ts` - Demo app showing all three methods
- `README.md` - This file

## Running the Example

```bash
npm test -- svg-renderer.test.ts  # Run tests
npx ts-node examples/svg-rendering/example.ts  # Run demo
```

## History

This code was originally part of the chess example (`examples/chess/chess.ts`) where it was used to create composite images of chess board squares with pieces. The chess example has since been simplified to use Fyne's native SVG support with Z-layering (Max containers), which is faster and simpler.

This capability is preserved here for reference and for the rare cases where runtime SVG manipulation is needed.
