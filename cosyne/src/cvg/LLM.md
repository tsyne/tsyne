# Cosyne Vector Graphics (CVG) LLM Reference

CVG is a TypeScript-first vector graphics library for Tsyne. It uses SVG vocabulary (`path`, `rect`, `circle`) but provides a native builder API with reactivity and event handling.

## Core API Patterns

**Entry Point:** `cvg(app, { width, height, viewBox }, (s) => { ... })`
- `width`/`height`: Logical canvas pixels.
- `viewBox`: String `"minX minY width height"`. Maps internal coordinates to logical pixels.

**Element Style:** All elements take an attributes object as the first parameter.
- ❌ `s.path().d("...")` — *Legacy/Incorrect*
- ✅ `s.path({ d: "..." })` — *Preferred*

## Element Cheatsheet

| Element | Attributes (`CvgElementAttrs`) |
| :--- | :--- |
| `path` | `{ d: string, fill?, stroke?, strokeWidth? }` |
| `rect` | `{ x, y, width, height, rx?, ry?, fill?, stroke? }` |
| `circle` | `{ cx, cy, r, fill?, stroke? }` |
| `ellipse`| `{ cx, cy, rx, ry, fill?, stroke? }` |
| `line` | `{ x1, y1, x2, y2, stroke?, strokeWidth? }` |
| `text` | `{ x, y, fill?, fontSize?, fontFamily?, textAnchor? }` |
| `g` | `{ transform?, opacity?, when?, style? }` |
| `use` | `{ href: string, x?, y? }` (References `<defs>`) |

**Attribute Rules:**
- `fill`, `stroke`: Hex strings (`"#ff0000"`, `"#ff0000aa"`) or color names.
- `transform`: SVG-style strings (`"translate(10,20) rotate(45)"`).

## TypeScript-First Extensions (Non-SVG)

CVG elements return a `CvgElement` wrapper that supports fluent chaining for features SVG doesn't have:

### 1. Reactive Bindings
Bindings are re-evaluated whenever `ctx.refresh()` is called (usually inside an `updateUI` loop).
```typescript
s.rect({ x: 10, y: 10, width: 50, height: 50 })
 .bindFill(() => isWarning ? "#ff0000" : "#00ff00")
 .bindPos(() => ({ x: mouseX, y: mouseY }))
 .bindOpacity(() => currentOpacity);
```

### 2. Event Handling
Hit-testing is automatic based on the element's geometry.
```typescript
s.circle({ cx: 50, cy: 50, r: 20 })
 .onClick((e) => console.log(`Clicked at ${e.x}, ${e.y}`))
 .onHover((hovered) => el.fill(hovered ? "red" : "blue"))
 .cursor("pointer");
```

### 3. Conditional Rendering
```typescript
s.g({ when: () => store.showAdvancedLayer }, () => {
  s.path({ d: "..." });
});
```

### 4. Animations
Native lerping for colors and numeric properties.
```typescript
const el = s.rect({ x: 0, y: 0, width: 10, height: 10 });
el.transition({ x: 100, fill: "#0000ff" }, { duration: 500, easing: "easeOut" });
```

## Coordinate Systems & ViewBox

1.  **ViewBox Space:** Coordinates used inside `s.path({ d: "..." })` or attributes like `cx`, `x`, `y`.
2.  **Mapping:** CVG automatically scales and translates ViewBox space to fit the `width`/`height` logical pixels provided in the entry point.
3.  **Preserve Aspect Ratio:** Defaults to `xMidYMid meet` (uniform scaling, centered).
4.  **Perspective:** Use `cosynePerspective` in a group transform to enable 3D-like effects on 2D elements.

## Common Traps

- **Refreshing:** After changing state that bindings depend on, you MUST call `refreshAllCosyneContexts()` or `win.setContent()` to trigger the updates.
- **IDs:** Use `.name("my-element")` for debugging/testing instead of SVG `id` attributes.
- **Paths:** Always use absolute `M/L/C/Z` commands where possible for best performance in the transpiler/rasterizer.
