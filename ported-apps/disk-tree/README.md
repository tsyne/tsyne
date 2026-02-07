# Disk Tree App

A cross-platform disk usage visualizer using an interactive squarified cushion treemap. Inspired by GrandPerspective and WinDirStat.

## Features

- **Cushion treemap rendering** - Pixel-buffer shaded rectangles with 3D pillow appearance via `TappableCanvasRaster.setPixelBuffer()`
- **Recursive subdivision** - Directories subdivide into their children with nesting insets, drilling as deep as screen space allows
- **Four color schemes** - Type (by file extension), Size (by file size ratio), Depth (by nesting level), Age (by modification date)
- **Scheme-aware legend panel** - Right-hand panel shows extensions (Type), size ranges (Size), depth levels (Depth), or age ranges (Age) with matching color swatches
- **Drill-down navigation** - Double-click directories to zoom in, clickable breadcrumb path segments, Up/Root buttons
- **Hover and selection** - Hover highlights tiles, click selects with red border, info bar shows relative path
- **Ghost buttons** - Up and Root buttons disable via `.ghostWhen()` when already at root
- **Cosyne text overlay** - File names and sizes rendered on large-enough tiles via `canvasStack` layering

## How to Use

1. Launch the app: `./scripts/tsyne ported-apps/disk-tree/disk-tree.ts`
2. Click **Open Folder** to select a directory to scan
3. Explore the treemap: hover for details, click to select, double-click directories to drill in
4. Switch color schemes with the **Type** / **Size** / **Depth** / **Age** buttons
5. Navigate with **Up** (parent directory), **Root** (back to scan root), or click path segments in the info bar

## Architecture

1,627 lines. Observable store (MVC) with pixel-buffer rendering.

- **Model**: `DiskTreeStore` — observable store with `subscribe()`, holds `FileEntry` tree, `TreemapRect[]` layout, navigation breadcrumbs, color scheme
- **View**: `DiskTreeUI` — builds Tsyne widget tree, renders cushion treemap to `Uint8Array` pixel buffer, manages Cosyne text overlay via `canvasStack`
- **Rendering**: `renderCushionBuffer()` — pure function computing RGBA pixels with parabolic cushion shading per rect
- **Layout**: `computeSquarifiedLayout()` + `subdivideRects()` — squarified treemap algorithm with recursive directory subdivision
- **Hit testing**: `hitTestRects()` — coordinate-based reverse iteration (no Cosyne event routing needed)

## Pseudo-Declarative Scorecard

How well does this app follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

The core win of pseudo-declarative UI is that code structure IS UI structure — `vbox(() => { hbox(() => { label(); button(); }) })` reads as a layout spec, not a construction sequence. Unlike HTML, there's no paradigm cliff when you need a loop or a condition — a `for` inside a `vbox` closure is still declarative. You never leave TypeScript, never switch from markup to code. That's why the builder pattern is weighted most heavily here.

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 8/10 | Clean `vbox > hbox > canvasStack` nesting. `buildUI()` reads as a layout spec. Loses a point for `canvasStack.rebuild()` imperatively tearing down/recreating the overlay |
| **Core declarative** | Fluent method chaining | 8/10 | `.withId()` (20 uses), `.onClick()`, `.ghostWhen()`, `.withMinSize()` — widget configuration without leaving the declaration |
| **Core declarative** | Programmatic generation | 7/10 | Color scheme buttons and extension list items generated in loops. Treemap labels generated from data. Not as strong as clock's `for` loop for hour markers |
| **State architecture** | Observable store | 7/10 | `DiskTreeStore` with `subscribe()`/`notifyChange()` and unsubscriber. But mutates in-place rather than replacing immutably |
| **State architecture** | Store-driven updates | 6/10 | Button handlers call store methods, store notifies → `updateUI()`. But `updateUI()` then does 9x imperative `setText()` — the reactive chain stops at the store boundary |
| **State architecture** | Defensive copying | 2/10 | `getState()` returns `Readonly<AppState>` — TypeScript annotation only, no runtime copy. State mutated in-place |
| **Declarative updates** | `.ghostWhen()` / `.when()` | 4/10 | 2x `.ghostWhen()` (new framework primitive debuted here). Zero `.when()`. Extension panel scheme-switching is done imperatively |
| **Declarative updates** | Reactive bindings | 1/10 | Zero `.bindText()`, `.bindTo()`, `.bindFillColor()`. Labels updated via `setText()`, lists via `removeAll()`/`add()` |
| **Anti-declarative** | `removeAll()`/`add()` | -2 | 6x `removeAll()` — tears down widget trees and rebuilds from scratch. This is the opposite of declarative: the framework can't diff, can't optimize, can't reason about what changed. Extension list and info bar should use `.bindTo()` |
| **Testing** | `.withId()` coverage | 9/10 | 20 IDs across all interactive widgets — enables 16 TsyneTest tests. Among the best in the repo |
| **Testing** | Counter-based IDs | 10/10 | `this.nextId++` — exactly the recommended pattern |
| **Design** | Separation of concerns | 8/10 | Pure functions (`renderCushionBuffer`, `hitTestRects`, `computeExtensionTotals`) cleanly separated from UI and state |
| | **Overall** | **5/10** | Strong declarative structure at the layout level — `buildUI()` genuinely reads as a spec. Falls apart at the update level: `setText()`, `removeAll()`/`add()`, and in-place mutation mean the app escapes to imperative for every state change. The layout is declared once well; it's the ongoing updates where declarative discipline is lost |

### Context: repo-wide adherence

No app in the repo scores 10/10. Across 51 ported apps: 89% use `setText()` over `.bindText()`, only 17% use `.bindTo()` or `.when()`, zero do defensive state copying. The closest to the documented ideal are **ebooks**, **expense-tracker**, **element**, **wikipedia**, and **sokol-arcade** (~7/10) which combine `bindTo()` + `.when()` + `subscribe()`.

### Where disk-tree excels

- **Builder nesting** in `buildUI()` reads as a visual layout spec — the core pseudo-declarative win
- **`.withId()` coverage** is among the best in the repo — 20 IDs, 16 passing tests
- **`.ghostWhen()`** is a new framework primitive that debuted in this app
- **Pure rendering functions** (`renderCushionBuffer`, `hitTestRects`) are cleanly separated from UI state

### Where it breaks declarative

- 9x `setText()` where `.bindText()` should be used — every label update is an imperative escape
- 6x `removeAll()`/`add()` where `.bindTo()` + `trackBy` should be used — tears down and rebuilds widget trees, the anti-pattern the framework was designed to prevent
- State mutated in-place rather than replaced immutably — prevents the framework from detecting changes

## Testing

16 TsyneTest integration tests covering:

```bash
cd ported-apps/disk-tree
npx jest
```

- Initial UI state (controls rendered, buttons ghosted)
- Directory scanning (treemap rects generated, title/stats updated)
- Navigation (drill-down unghosts buttons, drillUp, goToRoot, navigateToPath)
- Color schemes (all four switchable via button clicks)
- Store logic (tree structure, selection/hover, breadcrumb trail)

## Files

- `disk-tree.ts` — Main implementation (1,627 lines)
- `disk-tree-tsyne.test.ts` — TsyneTest integration tests (311 lines, 16 tests)

## License

MIT License

Portions copyright original team and portions copyright Paul Hammant 2025

This is a port of the Disk Tree application (https://github.com/Roemer/disk-tree) to Tsyne, substantially rewritten with cushion treemap rendering.
