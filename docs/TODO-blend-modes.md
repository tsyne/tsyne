# WebGL-like Canvas Features via Fyne Augmentation

Tsyne's Fyne fork patching enables WebGL-equivalent canvas features for desktop/mobile apps. This document tracks completed work and future OpenGL features to expose through our pseudo-declarative API.

## Completed

- [x] **Blend modes** - `normal`, `additive`, `multiply`, `screen`
- [x] **Render hook injection** - AST patching of Fyne's painter.go
- [x] **Safe GL callback pattern** - BlendFunc set after gl.Init() to prevent CGO crashes
- [x] **draw.go patching** - Removed hardcoded BlendFunc overrides
- [x] **Integration test** - Pixel-level verification of additive color mixing (R+G=Yellow, etc.)
- [x] **Demo app** - `cosyne/demos/blend-mode-comparison.ts`

## WebGL Feature Parity Roadmap

<!--
CLAUDE-HAIKU NOTES:
- Each feature below maps to WebGL/Canvas2D APIs that web developers expect
- Implementation follows the same pattern: patch Fyne fork, expose in bridge, add TS API
- All features should work with Tsyne's pseudo-declarative composition style
- Priority is based on common use in web canvas apps (games, visualizations, graphics editors)
-->

### Priority 1: Core Rendering (WebGL equivalents)

| Feature | WebGL Equivalent | OpenGL Calls | Status |
|---------|------------------|--------------|--------|
| Blend modes | `gl.blendFunc()` | `glBlendFunc` | ✅ Done |
| Global alpha | `ctx.globalAlpha` | Per-vertex alpha or uniform | ⬜ TODO |
| Line caps/joins | `ctx.lineCap`, `ctx.lineJoin` | Geometry generation | ⬜ TODO |
| Dashed lines | `ctx.setLineDash()` | Geometry or shader | ⬜ TODO |

### Priority 2: Transforms (WebGL mat4 equivalents)

<!--
CLAUDE-HAIKU: These transform the coordinate system before drawing.
In Fyne, we'd need to manipulate the model-view matrix or inject transform uniforms.
The pseudo-declarative API would look like:
  c.transform({ rotate: 45, scale: 2, translate: [10, 20] }, () => {
    c.rect(0, 0, 100, 100).fill('#ff0000');
  });
-->

| Feature | WebGL Equivalent | OpenGL Calls | Status |
|---------|------------------|--------------|--------|
| Rotation | `mat4.rotate()` | Model matrix uniform | ⬜ TODO |
| Scale | `mat4.scale()` | Model matrix uniform | ⬜ TODO |
| Translate | `mat4.translate()` | Model matrix uniform | ⬜ TODO |
| Transform stack | `ctx.save()`/`ctx.restore()` | Push/pop matrix | ⬜ TODO |
| Skew/shear | `ctx.transform()` | Custom matrix | ⬜ TODO |

### Priority 3: Clipping & Masking

<!--
CLAUDE-HAIKU: Clipping restricts drawing to a region.
Fyne has basic scissor support but we need arbitrary path clipping.
Options: stencil buffer, shader-based masking, or FBO compositing.
Pseudo-declarative:
  c.clip(clipPath, () => {
    c.image(src, 0, 0);  // Only visible inside clipPath
  });
-->

| Feature | WebGL Equivalent | OpenGL Calls | Status |
|---------|------------------|--------------|--------|
| Scissor rect | N/A (Fyne has this) | `glScissor` | ✅ Exists |
| Arbitrary clip path | `ctx.clip()` | Stencil buffer | ⬜ TODO |
| Compositing modes | `ctx.globalCompositeOperation` | Various blend modes | Partial |

### Priority 4: Shadows & Effects

<!--
CLAUDE-HAIKU: These require multi-pass rendering or FBOs.
Shadow: render to offscreen buffer, blur, composite under main render.
Blur: Gaussian blur shader on FBO texture.
Glow: Similar to shadow but additive blend.
These are more complex - may need custom shader programs.
-->

| Feature | WebGL Equivalent | OpenGL Calls | Status |
|---------|------------------|--------------|--------|
| Drop shadow | `ctx.shadowBlur`, `ctx.shadowColor` | FBO + blur shader | ⬜ TODO |
| Gaussian blur | Custom shader | FBO + separable blur | ⬜ TODO |
| Glow effect | Custom shader | FBO + additive blend | ⬜ TODO |

### Priority 5: Gradients & Patterns

<!--
CLAUDE-HAIKU: Fyne has basic gradient support but we may need to extend it.
Linear/radial gradients need shader uniforms for stops and colors.
Pattern fill requires texture sampling with repeat modes.
-->

| Feature | WebGL Equivalent | OpenGL Calls | Status |
|---------|------------------|--------------|--------|
| Linear gradient | `ctx.createLinearGradient()` | Shader uniform | Partial (Fyne) |
| Radial gradient | `ctx.createRadialGradient()` | Shader uniform | Partial (Fyne) |
| Pattern fill | `ctx.createPattern()` | Texture with GL_REPEAT | ⬜ TODO |
| Conic gradient | CSS `conic-gradient` | Custom shader | ⬜ TODO |

### Priority 6: Text Rendering

<!--
CLAUDE-HAIKU: Fyne's text rendering is basic.
WebGL apps often use SDF (signed distance field) fonts for crisp scaling.
Text stroke requires geometry generation or shader tricks.
-->

| Feature | WebGL Equivalent | OpenGL Calls | Status |
|---------|------------------|--------------|--------|
| Text stroke | `ctx.strokeText()` | Geometry or shader | ⬜ TODO |
| Text baseline | `ctx.textBaseline` | Layout calculation | ⬜ TODO |
| Custom fonts | `ctx.font` | Font atlas texture | Partial (Fyne) |
| SDF text | N/A (advanced) | SDF shader | ⬜ TODO |

### Priority 7: Image Operations

<!--
CLAUDE-HAIKU: Pixel manipulation requires reading back from GPU or using compute shaders.
getImageData equivalent needs glReadPixels or render-to-texture.
putImageData needs texture upload.
-->

| Feature | WebGL Equivalent | OpenGL Calls | Status |
|---------|------------------|--------------|--------|
| Image smoothing | `ctx.imageSmoothingEnabled` | GL_LINEAR/GL_NEAREST | ⬜ TODO |
| Pixel read | `ctx.getImageData()` | `glReadPixels` | ⬜ TODO |
| Pixel write | `ctx.putImageData()` | `glTexSubImage2D` | ⬜ TODO |

### Priority 8: Advanced (WebGL2 / Compute)

<!--
CLAUDE-HAIKU: These are stretch goals requiring significant architecture.
Custom shaders need GLSL compilation infrastructure.
Instancing needs careful buffer management.
Only pursue if there's strong user demand.
-->

| Feature | WebGL Equivalent | OpenGL Calls | Status |
|---------|------------------|--------------|--------|
| Custom shaders | GLSL programs | `glCreateShader` etc | ⬜ Future |
| Instanced drawing | `gl.drawArraysInstanced()` | `glDrawArraysInstanced` | ⬜ Future |
| Framebuffer objects | `gl.createFramebuffer()` | FBO API | ⬜ Future |

## Pseudo-Declarative API Design

All features should integrate with Tsyne's builder pattern:

```typescript
// Blend modes (implemented)
c.rect(0, 0, 100, 100, { blendMode: 'additive' })
  .fill('#ff0000');

// Future: transforms
c.transform({ rotate: 45, origin: [50, 50] }, () => {
  c.rect(0, 0, 100, 100).fill('#00ff00');
});

// Future: clipping
c.clip(() => c.circle(50, 50, 40), () => {
  c.image(src, 0, 0, 100, 100);
});

// Future: shadows
c.rect(10, 10, 80, 80, {
  shadow: { blur: 10, color: '#000000', offsetX: 5, offsetY: 5 }
}).fill('#ffffff');
```

## Architecture Notes

<!--
CLAUDE-HAIKU: Key implementation patterns established with blend modes:

1. **Fyne fork patching** (`setup-fyne-fork.sh`):
   - Copy Fyne source from Go module cache
   - Inject fields/methods into canvas primitives
   - Create internal packages (like `renderhook`)
   - AST-patch painter.go for hook injection
   - Patch draw.go to remove hardcoded overrides

2. **Safe GL access**:
   - Never call GL functions before gl.Init()
   - Use callback pattern: store function pointer after Init
   - Check for nil before calling GL functions

3. **Bridge integration**:
   - Add field to CreateCanvas* proto messages
   - Parse in widget_creators_canvas*.go
   - Pass to Fyne primitive constructor

4. **TypeScript API**:
   - Add option to widget factory method
   - Type definitions in widgets/canvas.ts
   - Cosyne wraps in fluent API

5. **Testing**:
   - Unit tests for color math / API
   - Integration tests with TsyneTest screenshots
   - Pixel sampling to verify GPU behavior
-->

The blend mode implementation established patterns for future features:

1. **Fyne patching**: `setup-fyne-fork.sh` orchestrates all modifications
2. **Render hooks**: `internal/renderhook/` provides pre/post paint callbacks
3. **Safe GL**: Callback pattern prevents CGO crashes from early GL calls
4. **Proto→Go→TS**: Field flows from proto message to bridge to TypeScript API

## References

- [WebGL Specification](https://www.khronos.org/registry/webgl/specs/latest/1.0/)
- [Canvas 2D Context](https://html.spec.whatwg.org/multipage/canvas.html)
- [OpenGL ES 2.0 Reference](https://www.khronos.org/opengles/sdk/docs/man/)
- [Fyne Canvas Architecture](https://developer.fyne.io/canvas/)
- [Tsyne Pseudo-Declarative UI](/docs/pseudo-declarative-ui-composition.md)
