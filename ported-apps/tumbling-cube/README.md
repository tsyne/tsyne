# Tumbling Cube

A 3D cube with Rubik's-colored faces (3 opaque, 3 translucent) continuously rotating with perspective projection. Two implementations demonstrate different approaches.

## `index.ts` — Raw canvasPath (0% CVG)

`index.ts` is imperative through and through. It creates 6 `canvasPath` widgets and an `edgesPath`, then every 16ms manually builds SVG path strings, picks fill colors, and calls `.update()` on each one. The animation loop *is* the rendering logic — it knows about path syntax (`M`, `L`, `Z`), coordinate formatting (`.toFixed(1)`), and widget update semantics. The builder (`canvasStack`) is just a scaffold; all the intelligence lives in the `setInterval`.

## `index-cvg.ts` — Cosyne bindVertices (100% CVG)

`index-cvg.ts` separates *what* from *when*. The `cosyne()` builder declares 6 polygons with `bindVertices()` and `bindFill()`, plus 12 lines with `bindEndpoint()`. The animation loop only does two things: update the rotation state (`updateFrame(t)`) and call `refreshAllCosyneContexts()`. It knows nothing about widgets, points, or colors — those are the bindings' concern.

## Three things stand out

**1. Declarative intent vs. imperative mechanics.** The CVG version reads as "this polygon's vertices come from *here*, its color comes from *here*" — which is the pseudo-declarative ideal. The raw version reads as "build this string, set these properties, on this object, every frame." The binding callbacks are pure functions of state; the raw version is procedural mutation.

**2. The animation loop shrinks to almost nothing.** In `index.ts` the loop is 30+ lines of projection, sorting, path construction, and widget updates. In `index-cvg.ts` it's 4 lines: compute time, call `updateFrame`, call `refreshAllCosyneContexts`. This is the payoff of the binding pattern — the framework handles change detection and widget updates.

**3. No SVG path string gymnastics.** The raw version has to construct `M ... L ... Z` strings and manage `strokeColor`/`fillColor` on every update call. The CVG version just returns `{x, y}` arrays and color strings. The polygon primitive and refresh system handle the serialization to the bridge. This is the right layer boundary — app code thinks in geometry, not in serialization format.

## Caveat

The CVG version creates its polygons at `(0, 0)` with vertices in absolute screen coordinates, which is a slight abuse of the relative-vertex model. It works because `x=0, y=0` means the offset is zero. A purist might want the vertices relative to a center point, but for a rotating cube where every vertex changes every frame, absolute coordinates are simpler and there's no meaningful "center" to be relative to.

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 3/10 | Single `canvasStack` scaffold. No widget chrome |
| **Core declarative** | Fluent method chaining | 1/10 | No `.withId()`, no `.when()`. `index.ts` is purely imperative |
| **Core declarative** | Programmatic generation | 6/10 | Loop + map for 6 face paths and 12 edge lines |
| **State architecture** | Observable store | 2/10 | No Observable store. Rotation state in local variables |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | `index.ts`: no bindings, manual `.update()` per frame. `index-cvg.ts`: uses `bindVertices()`, `bindFill()`, `bindEndpoint()` — full reactive bindings (see README sections above for comparison) |
| **Anti-declarative** | No `removeAll()`/`setContent()` | -1 | 1 `setContent()` call |
| **Testing** | `.withId()` coverage | 1/10 | No IDs |
| **Design** | Separation of concerns | 5/10 | Two implementations showcase imperative vs. declarative approaches. CVG version cleanly separates state from rendering |
| | **Overall** | **3/10** | Scored for `index.ts` (imperative baseline). The companion `index-cvg.ts` would score ~7/10 — it's a textbook example of the binding pattern. Together they demonstrate the delta between imperative and pseudo-declarative approaches |

## Running

```bash
# Raw canvasPath version
./scripts/tsyne ported-apps/tumbling-cube/index.ts

# CVG version
./scripts/tsyne ported-apps/tumbling-cube/index-cvg.ts
```
