# Fyne Canvas Dirty Mechanism Hypothesis

## STATUS: PARTIALLY DISPROVED

**Date tested:** 2026-02-02
**Test code:** `cmd/dirty_test/main.go`

### What Was Correct
- Window-level dirty flag exists (single boolean)
- Slider.MouseIn()/MouseOut() call Refresh()
- Refresh() sets the canvas dirty flag

### What Was WRONG
- **Dirty canvas does NOT cause all widgets to regenerate**
- **Other widgets' `Renderer.Refresh()` is NOT called**
- **Textures are CACHED - only the refreshing widget regenerates**

### Test Results
```
Slider hover events:     In: 9, Moved: 310+, Out: 9  (MANY events)
RepaintCounter.Refresh:  3 (only initial setup - NEVER increased)
RasterTracker.generate:  2 (only initial setup - NEVER increased)
```

The slider's Refresh() did NOT cause the RepaintCounter or RasterTracker to refresh.

---

## Original Observed Behavior

In a Fyne app with a slider and a custom canvas object in the same window:
- Mouse movement over the **slider** causes the canvas object to repaint
- Mouse movement over the **canvas object** (if it doesn't implement Hoverable) causes no repaint
- Unrelated widgets trigger repaints of each other simply by being in the same window

**NOTE:** The above observations may have been misinterpreted. See "Actual Mechanism" below.

## Original Hypothesis (DISPROVED)

~~Fyne uses **window-level dirty tracking**, not widget-level:~~

1. ~~Each window has one GL rendering surface (`glCanvas`)~~
2. ~~When ANY widget in that window calls `Refresh()`, the entire window canvas is marked dirty~~
3. ~~A dirty window = full repaint of all canvas objects~~  **<-- THIS IS WRONG**
4. ~~The shader gets repainted with fresh `u_time` only during window repaints~~

## Actual Mechanism (Discovered Through Testing)

### What Really Happens

**When Slider.MouseIn() is called:**
1. Slider calls `self.Refresh()`
2. Slider is added to the `refreshQueue`
3. Canvas `dirty` flag is set to `true`
4. On next paint tick:
   - `CheckDirtyAndClear()` returns `true`
   - **Only objects in `refreshQueue` have textures freed** (via `freeObject()`)
   - Paint loop walks all objects
   - For each object, `getTexture()` checks the cache
   - **If cached (not freed), texture is reused - Generator NOT called**
   - Only the Slider's texture is regenerated

**Key insight:** "Dirty" means "do a paint pass", NOT "regenerate all textures".

### The Caching Layer

`internal/painter/gl/texture.go:60-65`:
```go
texture, ok := cache.GetTexture(object)

if !ok {
    texture = cache.TextureType(creator(object))  // Generator called HERE
    cache.SetTexture(object, texture, p.canvas)
}
```

Textures are cached per-object. The Generator/creator is only invoked when:
1. Object is not in cache (first render), OR
2. Object's texture was explicitly freed (object called Refresh())

### The Refresh Queue

`internal/driver/common/canvas.go:280-283`:
```go
func (c *Canvas) Refresh(obj fyne.CanvasObject) {
    c.refreshQueue.In(obj)      // <-- object enters queue
    async.EnsureMain(c.SetDirty)
}
```

`internal/driver/common/canvas.go:230-232`:
```go
for object := c.refreshQueue.Out(); object != nil; object = c.refreshQueue.Out() {
    c.freeObject(object)  // <-- only queued objects get texture freed
}
```

## Evidence from Fyne Source

### Dirty Check (stock Fyne)
`internal/driver/glfw/loop.go:71`:
```go
if !w.visible || !w.canvas.CheckDirtyAndClear() {
    // skip repaint
}
```

### Slider Hover (stock Fyne)
`widget/slider.go:168-172`:
```go
func (s *Slider) MouseIn(_ *desktop.MouseEvent) {
    s.hovered = true
    if !s.disabled {
        s.Refresh()  // <-- marks window canvas dirty, BUT only slider texture freed
    }
}
```

**Note:** `widget/slider.go:178-179` - `MouseMoved()` is **EMPTY**. No refresh on continuous movement.

### Canvas Objects Without Hoverable
Stock Fyne canvas objects like `canvas.Rectangle`, `canvas.Circle`, etc. do not implement `desktop.Hoverable`, so mouse movement over them triggers no events and no repaints.

### Dirty Flag is Boolean - No Spatial Info (stock Fyne)

The dirty tracking is a simple boolean, not a region list:

`internal/driver/common/canvas.go`:
```go
type Canvas struct {
    // ...
    dirty bool  // <-- single boolean, no spatial information
}

func (c *Canvas) SetDirty() {
    c.dirty = true  // <-- just sets true, doesn't record WHERE
}

func (c *Canvas) CheckDirtyAndClear() bool {
    dirty := c.dirty
    c.dirty = false
    return dirty  // <-- returns true/false, no info about what changed
}
```

## Corrected Implications

1. **Shaders/Rasters do NOT auto-refresh** when other widgets refresh
2. **For continuous animation**, you MUST call `shader.Refresh()` yourself:
   - Use `fyne.NewAnimation()` for timed updates
   - Use a goroutine with ticker calling `Refresh()`
   - Use `canvas.Refresh(obj)` from your update loop
3. **The original "observed behavior" was likely misdiagnosed** - if a shader appeared to update on slider hover, something else was causing it

## Why Original Observation May Have Been Wrong

Possible explanations for the original "slider causes shader repaint" observation:
1. Window resize during testing (causes all objects to re-layout and refresh)
2. Initial render settling (multiple refreshes during startup)
3. The shader WAS calling its own Refresh() somewhere
4. Animation was already running

## Test Code

See `dirty_test/main.go` for the complete test that disproves the hypothesis.

Run with:
```bash
go run ./dirty_test/
```

Then hover over the slider and observe:
- Slider hover counters increase (events ARE firing)
- Widget Refresh counter stays at 3 (other widgets NOT refreshed)
- Raster only regenerates when "Refresh Raster" button clicked

---

## TSYNE SHADER EXCEPTION (Added 2026-02-02)

### Why Tsyne Shaders ARE Affected by Dirty

While stock Fyne widgets use texture caching (Generators only run when the widget itself refreshes), **Tsyne's Shader implementation bypasses this caching**.

### The Difference

**Stock Fyne Raster:**
```
paint pass → getTexture(raster) → cache hit → reuse cached image → no Generator call
```

**Tsyne Shader:**
```
paint pass → drawShader() → set u_time uniform → draw triangles → ALWAYS renders fresh
```

### Why This Matters

Our shader painter (`shader_painter.go`) calls `drawShader()` on every paint pass, which:
1. Binds the shader program
2. Sets `u_time = time.Since(shaderStartTime).Seconds()` **<-- always fresh!**
3. Draws the triangles

There's no texture cache lookup. Every paint pass = fresh u_time = animation appears.

### Test Confirmation

`dirty_test/dirty-test-tsyne.ts` confirms:
- Slider hover → canvas dirty → paint pass → shader animates
- Shader hover → no dirty → no paint pass → shader frozen

### Solution for Continuous Animation

If you want a shader to animate continuously (not just during other widget activity):
```typescript
// Option 1: Use setInterval to refresh
setInterval(() => shader.setUniform('u_dummy', Date.now()), 16);

// Option 2: Use Fyne animation (not exposed in Tsyne yet)
```

This is different from stock Fyne where you'd call `canvas.Refresh(raster)` to trigger Generator regeneration.
