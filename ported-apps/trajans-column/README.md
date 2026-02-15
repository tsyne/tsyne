# Trajan's Column - Interactive Diagram

An interactive exploded-view diagram of Trajan's Column (lower section), showing how the stone blocks fit together with hidden wireframe construction lines revealed on click.

Ported from a standalone SVG file (`cosyne/test/svg/Trajans-Column-lower-animated.svg`) that used SMIL animations for interactivity.

## How It Works

The column is divided into 10 clickable blocks (1a, 1b, 2a, 2b, 3a, 3b, 4a, 4b, 5, 6). Clicking a block reveals its internal wireframe construction lines. Click the same block again to hide them.

```
┌──────────────────────┐
│      Block 6         │  ← Capital/top section
│      Block 5         │  ← Column drum with base
├──────────────────────┤
│   Block 4a │ 4b      │  ← Paired blocks
│   Block 3a │ 3b      │
│   Block 2a │ 2b      │
│   Block 1a │ 1b      │  ← Foundation blocks
└──────────────────────┘
```

## SVG Transpilation: What Changed

The original SVG used **SMIL animations** for interactivity. CVG's `loadSvg()` transpiler handles the static geometry but skips SMIL elements. The interactive behaviour was recreated using CVG's programmatic API.

### What the Transpiler Handled Natively

| SVG Feature | CVG Output |
|---|---|
| `<path d="...">` | `s.path({ d: '...' })` |
| `<g>` groups with style inheritance | `s.g({ style: '...' }, () => { ... })` |
| `<linearGradient>`, `<radialGradient>` | `s.registerGradient(id, { ... })` |
| `transform="translate(...)"` / `matrix(...)` | `s.g({ transform: '...' }, () => { ... })` |
| `cursor="pointer"` | Preserved on group attrs |
| Style attributes (fill, stroke, opacity) | Passed through as `style` strings |

### What the Transpiler Skipped (SMIL Animation)

The original SVG used no JavaScript. All interactivity was declarative SMIL:

**1. Click-triggered block motion** (`<animateMotion>`)
```xml
<!-- Original: clicking block1a moves it along a path for 5 seconds -->
<animateMotion begin="block1a.click" dur="5s"
  keyPoints="0; 1; 1; 0" keyTimes="0; 0.1; 0.9; 1"
  restart="whenNotActive" fill="remove"
  xlink:href="#block1a">
  <mpath xlink:href="#path1a"/>
</animateMotion>
```

**2. Timed wireframe visibility** (`<set>`)
```xml
<!-- Original: wires appear for 5 seconds when block is clicked -->
<g id="wire1a" visibility="hidden">...</g>
<set attributeName="visibility" to="visible"
  begin="block1a.click" dur="5s" fill="remove"
  xlink:href="#wire1a"/>
```

### CVG Equivalents Used

**Click handlers** replace SMIL `.click` event triggers:
```typescript
// SMIL: begin="block1a.click" on <animateMotion>
// CVG:
s.path({ d: '...', onClick: () => onBlockClick('block1a') });
```

**`when()` predicates** replace SMIL `<set visibility>`:
```typescript
// SMIL: <set attributeName="visibility" to="visible" begin="block1a.click">
// CVG:
s.g({
  style: 'fill:none;stroke:#444;stroke-width:0.5;...',
  when: () => state.activeBlock === 'block1a',
}, () => {
  s.path({ d: '...' }); // wireframe lines
});
```

**State + `refresh()`** replace SMIL's automatic animation lifecycle:
```typescript
// SMIL: automatic 5s duration with auto-reverse
// CVG: explicit toggle with manual refresh
function handleBlockClick(blockId: string) {
  if (state.activeBlock === blockId) {
    state.activeBlock = null;   // toggle off
  } else {
    state.activeBlock = blockId; // activate
  }
  cvgCtx.refresh(); // re-evaluate all when() predicates
}
```

### Behaviour Differences from Original

| Aspect | Original SVG (SMIL) | This Port (CVG) |
|---|---|---|
| Wire visibility | Temporary (5s then auto-hides) | Persistent (toggle on/off) |
| Block motion | Blocks slide out along a path | No motion (static toggle) |
| Animation timing | Ease-in/ease-out over 5s | Instant show/hide |
| Multiple blocks | Can trigger overlapping animations | One block active at a time |

CVG does have a `.transition()` API that could animate block motion, but the port uses simple state toggling for clarity.

## Running

```bash
./scripts/tsyne ported-apps/trajans-column/index.ts
```

## Testing

```bash
# Unit tests (mock-based, no bridge needed)
cd ported-apps/trajans-column && pnpm test

# Visual tests (requires bridge + display)
TSYNE_HEADED=1 pnpm test ported-apps/trajans-column/index.tsyne.test.ts
```

## Files

- `column-geometry.ts` - All 10 blocks with paths, gradients, onClick handlers, and when() wireframes (657 lines, transpiled from SVG)
- `index.ts` - App shell with state management, block toggle logic, status label
- `index.test.ts` - 15 unit tests (geometry rendering, state logic, click handlers)
- `index.tsyne.test.ts` - Visual CosyneTest (renders diagram, tests wireframe toggling)

## Attribution

Original SVG diagram: [Trajans-Column-lower-animated.svg](https://commons.wikimedia.org/wiki/File:Trajans-Column-lower-animated.svg) by [Hk kng](https://commons.wikimedia.org/wiki/User:Hk_kng), licensed under the [Creative Commons Attribution-Share Alike 3.0 Unported](https://creativecommons.org/licenses/by-sa/3.0/deed.en) license. The SVG used SMIL animations which are a W3C standard but have limited browser support (deprecated in Chrome, re-enabled later). This port demonstrates that CVG's `onClick` + `when()` pattern provides a more portable equivalent.
