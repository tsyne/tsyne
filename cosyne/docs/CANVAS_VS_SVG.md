# CosyneContext (Classic) vs CvgContext (CVG)

Cosyne has two independent drawing systems that share the same Go bridge but are otherwise separate widget trees. They can also coexist in the same `canvasStack` (see `cosyne/demos/canvas-interop-experiment.ts`).

## API Model

| | **CosyneContext** (`cosyne/src/context.ts`) | **CvgContext** (`cosyne/src/cvg/grammar.ts`) |
|---|---|---|
| **Vocabulary** | Canvas-native: `circle(x, y, r)`, `rect(x, y, w, h)` | SVG-inspired: `circle({ cx, cy, r })`, `rect({ x, y, width, height })` |
| **Parameters** | Positional args + options object | Single attributes object (mirrors SVG DOM) |
| **Grouping** | `ctx.group(x, y, fn)` / `ctx.transform({ translate, scale }, fn)` | `s.g({ transform: 'translate(...) scale(...)' }, fn)` — SVG transform strings or typed object |
| **Paths** | `CosynePath` with custom options | `s.path({ d: '...' })` with full SVG path normalizer (all commands to M/L/C/Z) |

## Architecture

| | **CosyneContext** | **CvgContext** |
|---|---|---|
| **Rendering** | Wraps Tsyne `canvasStack` — each primitive is a separate Fyne canvas widget | Calls `app.canvasPath()`, `app.canvasCircle()` etc. directly — bypasses CosyneContext entirely |
| **Coordinates** | Transform stack (affine matrix) applied to points at creation time | viewBox to canvas affine mapping; SVG transforms parsed and composed through the tree |

## Reactivity / Data Binding

| | **CosyneContext** | **CvgContext** |
|---|---|---|
| **Binding model** | Separate `BindingRegistry` — stores `() => T` functions per primitive, evaluated on `refreshBindings()` with deep-equality diffing | Inline on `CvgElement`: `.bindFill(() => color)`, `.bindPos(() => coords)`, `.bindOpacity(() => n)` |
| **Update trigger** | `refreshBindings()` (manual) or via `poll(interval)` | `poll(interval)` calls internal refresh; `resize()` does full rebuild |
| **Collections** | `CirclesCollection`, `RectsCollection`, `LinesCollection` — typed batch primitives | `.bindTo(items, render, { trackBy, update })` — D3-style enter/update/exit |

## Features Unique to Each

### CosyneContext only

- 3D pipeline (projections, raycaster, 3D primitives)
- Particle systems, trails
- Scales, axes, line charts (data-viz)
- Gradients, clipping, effects (drop shadow, glow) as separate modules
- Symmetry helpers, zoom-pan, markers
- Foreign objects (embed Fyne widgets)

### CvgContext only

- SVG parser (XML to AST)
- SVG normalizer (all path commands to absolute M/L/C/Z)
- `loadSvg()` — render SVG strings at runtime
- `transpileSvg()` — SVG files to editable TypeScript
- Full SVG 1.1 feature set (gradients, clipPath, `<use>`/`<defs>`, `<text>`, CSS `<style>`)
- CPU rasterizer for clipping and blur
- Rich interactivity: click, hover, drag, scroll, tooltips, cursor, double-click, right-click
- Animation system with easing, transitions, keyframes (built into CvgElement)
- `s.g({ transform })` — true SVG transform composition
- W3C SVG test suite conformance (199 SVGs, median MAE ~0.5)

## When to Use Which

**Use CosyneContext** when you need canvas-native primitives, 3D projections, particle systems, data-visualization (scales/axes/charts), or fine-grained per-primitive binding with a typed API.

**Use CvgContext** when you want SVG-style semantics (viewBox, transform groups, path `d` strings), need to load/render `.svg` files, want D3-style data binding, or want to compose reusable vector components via `s.g({ transform })`. The svg-clock and Big Ben demos are examples of this pattern.

## Relationship

Both systems call the same Tsyne bridge primitives (`canvasPath`, `canvasCircle`, etc.) underneath. CvgContext explicitly bypasses CosyneContext — they are parallel branches of the widget tree, not layers. The main `cosyne/src/index.ts` re-exports both via `export * from './cvg'`.
