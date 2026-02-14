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

## Running

```bash
# Raw canvasPath version
./scripts/tsyne ported-apps/tumbling-cube/index.ts

# CVG version
./scripts/tsyne ported-apps/tumbling-cube/index-cvg.ts
```
