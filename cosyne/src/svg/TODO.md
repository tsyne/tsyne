# Cosyne SVG Renderer — TODO

199 test SVGs, median MAE ~0.5, 169 below MAE 5.

## Missing Features

### `<pattern>` fills
No support. Renders as solid black.
- pservers-grad-03-b.svg (39.6), juanmontoya_lingerie.svg (32.9), rg1024_metal_effect.svg (11.5)

### `<image>` element
No support for embedded or external images.

### `<marker>` element
No support for line/path markers (arrowheads, dots).

### `<mask>` element
No support (distinct from clipPath — masks use luminance/alpha channel).

### Viewport clipping
Content beyond the viewBox not clipped (overflow:hidden default).
- circles1.svg (47.0)

### Text improvements
- **stroke on text** — bloglines.svg (54.1) — partial fix: stroke color used as fill when no explicit fill
- **font metrics precision** — baseline positioning off by a few pixels on large text
- **`<tspan>` dx/dy arrays** — individual glyph positioning

### Gradient precision
- **Radial focal point clamping** — fx/fy outside circle
- **sRGB vs linearRGB interpolation** — minor color differences on metallic gradients

## Partially Working

### `<clipPath>`
Basic support via rasterization. Missing: clipPath on arbitrary elements, objectBoundingBox units.

### CSS `<style>` blocks
Basic class/element selectors work. Missing: descendant selectors, `!important`.

### `preserveAspectRatio`
Two-step viewBox→viewport→canvas mapping implemented. Handles meet/slice modes and all alignment combos.
- compuserver_msn_Ford_Focus.svg: 85.5 → 3.1
- faux-art.svg: 35.2 → 0.1
- gump-bench.svg: 60.9 → 6.7

## Won't Fix for static renderer loading from .svg files.

- JavaScript / `<script>` — mouseEvents.svg, Steps.svg, photos.svg
- SMIL animation — `<animate>`, `<animateTransform>`, `<set>`
- CSS transitions/animations
- `:hover` / `:active` / `:focus` pseudo-classes
- `<video>` / `<audio>` elements

These are replaced by the programmatic SVG grammar API below.

---

# Programmatic SVG Interactivity & Reactivity Roadmap

Equivalent functions for pure Cosyne TypeScript, following the
[pseudo-declarative UI composition](../../../docs/pseudo-declarative-ui-composition.md) patterns.

## Done

### Events — per-element
- `onClick`, `onHover`, `onDrag`, `onDragEnd`, `onScroll`
- `onDoubleClick`, `onRightClick`, `tooltip`
- Both options-object (`s.rect({ onClick: ... })`) and fluent (`.onClick(...)`) patterns

### Events — scene-wide
- `onKeyDown`, `onKeyUp` (on SvgContext, no hit-testing)
- `onScroll` fallback (on SvgContext, fires when no element under cursor)

### Fluent styling
- `.fill(color)`, `.stroke(color, width?)`, `.opacity(value)`, `.name(n)`, `.tooltip(text)`

### Event dispatch (for testing)
- `dispatchTap`, `dispatchHover`, `dispatchDrag`, `dispatchDragEnd`
- `dispatchScroll`, `dispatchKeyDown`, `dispatchKeyUp`
- `dispatchDoubleTap`, `dispatchSecondaryTap`

### TestJournal
- Auto-logs all event types with element names and coordinates
- Intercepts Jest `expect()` assertions and logs PASS/FAIL to journal
- Header shows test file + describe/it chain from Jest context

### Reactive visibility: `.when()`
- `.when(predicate)` stores a predicate on SvgElement, evaluates immediately
- `svgCtx.refresh()` re-evaluates all `.when()` conditions, shows/hides elements
- Hidden elements excluded from hit-testing
- Emits `when-show` / `when-hide` events

### Cursor changes
- `.cursor(type)` fluent method + `cursor` option in SvgElementAttrs
- `dispatchHover()` sets cursor from topmost hovered element via `setCursor` bridge call
- Go bridge: `desktop.Cursorable` on TappableCanvasRaster
- Supported cursors: `default`, `pointer`, `text`, `crosshair`, `hResize`, `vResize`

### Property bindings
- `.bindFill(fn)`, `.bindStroke(fn)`, `.bindOpacity(fn)`, `.bindPos(fn)`
- Re-evaluated on `svgCtx.refresh()` — incremental update (no full scene redraw)
- Both fluent and options-object patterns supported
- Hidden elements skip binding evaluation

### Animation & Transitions
- `.transition(props, opts)` — animate from current to target values (color interpolation + numeric lerp)
- `.animate(fn, opts)` — custom callback receives normalized `t` (0→1)
- Built-in easing: `linear`, `easeIn`, `easeOut`, `easeInOut`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`
- `AnimationOptions`: `duration`, `delay`, `loop`, `yoyo`, `easing`, `onComplete`
- `AnimationHandle` with `.stop()` and `.then()` (promise-based completion)
- Animation manager on SvgContext: 16ms timer, auto-start/stop, `stopAllAnimations()`, `isAnimating()`
- Multiple concurrent animations on different elements supported

### Dynamic element lists: `.bindTo()`
- `svgCtx.bindTo({ items, render, trackBy, update? })` — data-driven element regions
- Diff on `refresh()`: new items rendered, removed items destroyed + untracked, existing items updated
- `trackBy` key-based diffing preserves existing elements (no re-render for unchanged keys)
- Optional `update` callback for existing items; can also use `.bindFill()` etc. on rendered elements
- Multiple `.bindTo()` regions coexist in one SvgContext
- `SvgElement.destroy()` hides and marks element as permanently removed from hit-testing

### SVG-semantic coordinate translation
- `el.setShapeInfo(type, mapping, svgAttrs)` stores shape type + viewBox mapping at creation time
- `el.updateSvgProps({ cx, cy, r })` translates SVG-space props to canvas pixel coords automatically
- `el.getSvgAttr('cx')` reads current SVG-level attribute value
- Supported shapes: **circle** (cx, cy, r), **rect** (x, y, width, height), **line** (x1, y1, x2, y2)
- `bindPos()`, `transition()`, and `animate()` all route through `updateSvgProps()` — bounds + hit-testing stay in sync
- Wired automatically at circle(), rect(), and line() creation sites

