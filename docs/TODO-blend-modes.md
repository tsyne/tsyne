# TODO: OpenGL Blend Modes for Cosyne Canvas

## Problem

Fyne uses OpenGL for rendering but doesn't expose blend modes. This prevents effects like:
- **Additive blending** (`GL_ONE, GL_ONE`) - lines/shapes "emit light", overlapping areas get brighter
- **Multiply blending** - darkening composites
- **Screen blending** - lightening composites

Example use case: The spiral demo (ported from [hakimel's CodePen](https://codepen.io/hakimel/pen/QdWpRv)) uses `globalCompositeOperation = 'lighter'` for a glowing effect that we can't currently replicate.

## Solution: AST Patch + Minimal Hook (#1 + #4)

Rather than forking all of Fyne, we:
1. Use **AST transformation** to programmatically inject a small hook into Fyne's painter
2. Keep all blend logic in **our code** (survives Fyne upgrades)

```
┌─────────────────────────────────────────────────────────┐
│  Fyne's painter.go (after patching)                     │
├─────────────────────────────────────────────────────────┤
│  func (p *painter) paint(obj CanvasObject) {            │
│      renderhook.Before(obj)  // ← INJECTED             │
│      defer renderhook.After(obj)  // ← INJECTED        │
│      // ... existing Fyne code unchanged               │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Our renderhook package (bridge/renderhook/)            │
├─────────────────────────────────────────────────────────┤
│  func Before(obj CanvasObject) {                        │
│      if b, ok := obj.(BlendModeSupport); ok {           │
│          gl.BlendFunc(blendToGL(b.BlendMode()))         │
│      }                                                  │
│  }                                                      │
│                                                         │
│  func After(obj CanvasObject) {                         │
│      gl.BlendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA) │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

## Getting Started

Clone Fyne source locally to explore its internals:

```bash
# Clone Fyne to /tmp for exploration
git clone --depth 1 --branch v2.7.0 https://github.com/fyne-io/fyne.git /tmp/fyne

# Find the exact paint function to patch
grep -rn "func.*painter.*paint" /tmp/fyne/internal/driver/glfw/

# Explore the painter structure
cat /tmp/fyne/internal/driver/glfw/painter.go
```

This helps ground the AST transformation in Fyne's actual code structure.

## Tasks

### Phase 1: Infrastructure

- [ ] **Create AST patch tool** (`core/bridge/tools/patch-fyne/main.go`)
  - Parse Go source with `go/ast`, `go/parser`
  - Find target function by name (not line number)
  - Inject hook calls at function entry
  - Output modified source to `./fyne-patched/`

- [ ] **Define BlendMode types** (`core/bridge/blendmode.go`)
  ```go
  type BlendMode int
  const (
      BlendNormal BlendMode = iota
      BlendAdditive    // GL_ONE, GL_ONE
      BlendMultiply    // GL_DST_COLOR, GL_ZERO
      BlendScreen      // GL_ONE, GL_ONE_MINUS_SRC_COLOR
  )

  type BlendModeSupport interface {
      BlendMode() BlendMode
  }
  ```

- [ ] **Create renderhook package** (`core/bridge/renderhook/`)
  - `Before(obj)` - set GL blend state based on object's blend mode
  - `After(obj)` - restore default blend state
  - Must be safe for objects that don't support blend modes

### Phase 2: Patch Integration

- [ ] **Write declarative patch spec** (`core/bridge/tools/patch-fyne/patches/blend-hook.yaml`)
  ```yaml
  - file: internal/driver/glfw/painter.go
    function: "(*painter).paint"
    inject: before_body
    code: |
      renderhook.Before(obj)
      defer renderhook.After(obj)
    imports:
      - "tsyne-bridge/renderhook"
  ```

- [ ] **AST transformer implementation**
  - Parse YAML patch specs
  - Find function in AST by receiver + name
  - Inject statements at correct position
  - Add imports if needed
  - Write modified file preserving formatting

- [ ] **Makefile integration**
  ```makefile
  FYNE_VERSION := v2.7.0

  .PHONY: patch-fyne
  patch-fyne:
      go run ./tools/patch-fyne \
          --fyne-version=$(FYNE_VERSION) \
          --output=./fyne-patched

  build: patch-fyne
      go build -mod=mod .
  ```

- [ ] **go.mod replace directive**
  ```go
  replace fyne.io/fyne/v2/internal/driver/glfw => ./fyne-patched/internal/driver/glfw
  ```

### Phase 3: TypeScript/Cosyne API

- [ ] **Extend canvas primitives in bridge** (`core/bridge/canvas.go`)
  - Add `blendMode` field to TsyneLine, TsyneCircle, etc.
  - Implement `BlendModeSupport` interface
  - Handle blend mode in msgpack protocol

- [ ] **TypeScript API** (`core/src/app.ts`)
  ```typescript
  a.canvasLine(x1, y1, x2, y2, {
      strokeColor: '#fff',
      blendMode: 'additive',  // NEW
  });
  ```

- [ ] **Cosyne primitive support** (`cosyne/src/primitives/base.ts`)
  ```typescript
  // Replace the throwing stub with working implementation
  blendMode(mode: 'normal' | 'additive' | 'multiply' | 'screen'): this {
      this._blendMode = mode;
      this.applyBlendMode();
      return this;
  }
  ```

### Phase 4: Validation

- [ ] **Update spiral demo** (`ported-apps/spiral/spiral.ts`)
  ```typescript
  c.line(x1, y1, x2, y2, { strokeColor: '#fff' })
      .blendMode('additive')  // Enables glow effect
      .bindEndpoint(() => ...)
  ```

- [ ] **Test blend modes**
  - Additive: overlapping white lines → brighter
  - Multiply: overlapping colors → darker
  - Screen: overlapping colors → lighter
  - Normal: standard alpha compositing (default)

- [ ] **Document upgrade strategy** (`docs/fyne-patching.md`)
  - How to update FYNE_VERSION
  - What to check when Fyne releases new version
  - How AST patching fails safely (build error, not runtime)

## Future Enhancements

After blend modes work, consider:

- [ ] **Shadow/blur effects** - Requires FBO (framebuffer object) rendering
- [ ] **Custom shaders** - For advanced effects like Gaussian blur
- [ ] **Upstream PR** - Propose `RenderHook` interface to Fyne project

## Related Cosyne Feature Requests

- [ ] **Animated SVG paths** - Support `bindPath()` on `CosynePath` to animate path strings (quadratic/cubic curves via `Q`/`C` commands). Currently wave2 demo uses 2x points with line segments to approximate curves. See [wave2.ts](../ported-apps/wave2/wave2.ts).
- [ ] **Line caps/joins** - Canvas2D has `lineJoin: 'round'` and `lineCap: 'round'` for smoother line rendering. Would help line-segment approximations look better.

## References

- [OpenGL Blend Functions](https://www.khronos.org/opengl/wiki/Blending)
- [Go AST Package](https://pkg.go.dev/go/ast)
- [Fyne Canvas Architecture](https://developer.fyne.io/canvas/)
- [hakimel's Spiral CodePen](https://codepen.io/hakimel/pen/QdWpRv)
