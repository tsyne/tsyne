# GrandPerspective Usage Guide

## Running the Application

### Basic Usage

```bash
# Start with default directory (auto-detects in this order):
# 1. /home/user/tsyne/ported-apps
# 2. /home/user/tsyne
# 3. $HOME
# 4. /tmp
npx tsx grand-perspective.ts
```

### Specify a Directory

```bash
# Scan a specific directory
npx tsx grand-perspective.ts /path/to/directory
npx tsx grand-perspective.ts /home/user/Downloads
npx tsx grand-perspective.ts /var/log
npx tsx grand-perspective.ts .

# Current directory
npx tsx grand-perspective.ts .
```

### In Desktop Environment

```bash
# Launch from Tsyne desktop (adds to app launcher)
npx tsx examples/desktop-demo.ts
# Then double-click GrandPerspective icon
```

## Running Tests

### Unit Tests (Jest)

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### UI Tests (TsyneTest)

```bash
# Run without visual display (headless)
pnpm test grand-perspective.tsyne.test.ts

# Run with visual display
TSYNE_HEADED=1 pnpm test grand-perspective.tsyne.test.ts

# Run with screenshot capture
TSYNE_HEADED=1 TAKE_SCREENSHOTS=1 pnpm test grand-perspective.tsyne.test.ts
```

### Screenshots

Screenshots are captured when `TAKE_SCREENSHOTS=1` is set:

```bash
# Capture screenshots for all color schemes
TSYNE_HEADED=1 TAKE_SCREENSHOTS=1 pnpm test grand-perspective.tsyne.test.ts
```

Generated screenshots:
- `grand-perspective-initial.png` - Initial application state
- `grand-perspective-bysize.png` - By Size color scheme
- `grand-perspective-bydepth.png` - By Depth color scheme
- `grand-perspective-bytype.png` - By Type color scheme

## Controls Reference

| Control | Action |
|---------|--------|
| **Left Click** | Select file/folder; drill into folders |
| **Hover** | Highlight rectangle and brighten color |
| **Parent** | Navigate to parent directory |
| **by Size** | Color by file/folder size (logarithmic) |
| **by Depth** | Color by directory nesting level |
| **by Type** | Color by file extension |

## Tips

### Exploring Large Directories

For directories with many files (10k+), initial scan may take a few seconds:

```bash
# Scan Downloads folder
npx tsx grand-perspective.ts ~/Downloads

# Scan entire home directory (may be slow)
npx tsx grand-perspective.ts ~

# Scan /var for system logs and caches
npx tsx grand-perspective.ts /var
```

### Understanding Color Schemes

**By Size** - Size-based coloring makes large files easy to spot:
- Small files → cool blues
- Medium files → greens and yellows
- Large files → reds and oranges

**By Depth** - Depth-based coloring shows directory nesting:
- Top-level → red
- Nested deeper → shifts through rainbow (orange, green, cyan, blue, magenta)
- Useful for detecting deep directory structures

**By Type** - Type-based coloring groups files by extension:
- `.ts/.tsx` → red (TypeScript)
- `.js/.jsx` → orange (JavaScript)
- `.json` → yellow
- `.md` → green (Markdown)
- `.png/.jpg` → cyan (Images)
- `.mp4` → blue (Video)
- `.pdf` → magenta (Documents)

### Performance Tips

1. **Set depth limit** in code for very large trees (default: 5 levels)
2. **Use smaller directories** for faster initial scanning
3. **Try `/tmp`** for testing without deep directory structures

## Troubleshooting

### "Directory not found" message

If you specify a path that doesn't exist:
```bash
# Wrong path
npx tsx grand-perspective.ts /nonexistent/path
# Falls back to /tmp

# Check the path exists first
ls -d /path/to/check
npx tsx grand-perspective.ts /path/to/check
```

### Slow scanning

- Large directories (100k+ files) take longer to scan
- Use smaller directories for testing:
  ```bash
  npx tsx grand-perspective.ts /tmp
  npx tsx grand-perspective.ts ~/.local
  ```

### Empty canvas

If no rectangles appear:
- Directory is empty
- Directory is inaccessible (permissions)
- Try another directory or use `/tmp`

## Integration with Tsyne Apps

### Desktop Application Launch

The app integrates with Tsyne's desktop environment:

```typescript
import { buildGrandPerspectiveApp } from './grand-perspective';

// Launch in desktop
export function buildMyDesktop(a: any) {
  const nav = a.navigation('Home', () => {
    buildGrandPerspectiveApp(a, '/home/user');  // Pass initial path
  });
}
```

### Programmatic Use

```typescript
import { buildGrandPerspectiveApp, GrandPerspectiveStore } from './grand-perspective';

// Use from another app
const store = new GrandPerspectiveStore();
await store.scanDirectory('/path/to/scan');
const state = store.getState();

// Subscribe to changes
store.subscribe(() => {
  console.log('Directory tree updated');
});
```

## Advanced Options

### Modifying Depth Limit

In `grand-perspective.ts`, line ~502:

```typescript
// Default: 5 levels
store.scanDirectory(startingDir, 5);  // Change 5 to desired depth

// Examples:
store.scanDirectory(startingDir, 3);  // Shallow scan (fast)
store.scanDirectory(startingDir, 10); // Deep scan (slow)
```

### Adjusting Bevel Size

In canvas rendering (line ~459):

```typescript
// Smaller bevel for tiny rectangles
renderShadedRect(c, rect, bgColor, isSelected, rect.width < 30 ? 1 : 3);

// Increase for more pronounced 3D effect:
renderShadedRect(c, rect, bgColor, isSelected, rect.width < 30 ? 2 : 5);
```

### Minimum File Size Filter

In `layoutTreemap()` function (line ~284):

```typescript
// Minimum 5KB (default: 5000 bytes)
const filtered = items.filter(item => getTotalSize(item) >= 5000);

// Examples:
const filtered = items.filter(item => getTotalSize(item) >= 1000);   // 1KB
const filtered = items.filter(item => getTotalSize(item) >= 1024 * 1024);  // 1MB
```
