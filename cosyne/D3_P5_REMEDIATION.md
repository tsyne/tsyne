# D3/P5 Expansion Remediation Plan

## Summary

The D3/P5 expansion work created APIs and demos that partially work. This document tracks what was fixed and what still needs work.

## Fixed Issues

### 1. Demo Import Paths (All 5 demos)
- **Problem**: Used `'../../src/index'` instead of `'../../core/src/index'`
- **Status**: Fixed

### 2. App Function Signature (All 5 demos)
- **Problem**: Called `app(options, builder)` instead of `app(resolveTransport(), options, builder)`
- **Status**: Fixed

### 3. Invented API: `label().withBold()` (All 5 demos)
- **Problem**: `Label` doesn't have a `.withBold()` method
- **Fix**: Changed to `a.label(text, undefined, undefined, undefined, { bold: true })`
- **Status**: Fixed

### 4. Effects/Gradients/Clipping API Not Integrated
- **Problem**: `EffectsAnchor`, `LinearGradient`, `RadialGradient`, `ClippingRegion` classes existed but weren't connected to `Primitive` base class
- **Fix**: Added fluent methods to `Primitive`: `.dropShadow()`, `.glow()`, `.blendMode()`, `.strokeDash()`, `.linearGradient()`, `.radialGradient()`, `.clipCircle()`, `.clipRect()`, `.clipPolygon()`, `.clipPath()`
- **Status**: Fixed (API integrated)

## Remaining Issues

### 1. Effects Don't Render (Fundamental Architecture Issue)

**Problem**: The effects system was designed for HTML5 Canvas (`CanvasRenderingContext2D`), but Tsyne/Cosyne renders via Fyne native widgets.

**Fyne doesn't support**:
- Drop shadows
- Glow effects
- Blend modes (multiply, screen, overlay, etc.)
- Arbitrary clipping paths
- Complex gradients

**Impact**: The `effects-gradients-clipping-demo` runs without crashing but shows no visual effects.

**Remediation Options**:
1. **Software canvas renderer**: Implement a raster-based renderer that draws to an image buffer, then displays that image in Fyne. This would support all Canvas2D features but at a performance cost.
2. **Shader-based effects**: For Fyne/OpenGL, implement effects via shaders. Complex but performant.
3. **Scope reduction**: Document that these APIs are for future use when a Canvas2D-compatible renderer exists.
4. **Remove demos**: Delete the demos that showcase non-functional features.

**Recommendation**: Option 3 for now - mark as future work, keep the APIs for when rendering improves.

### 2. Markers Demo Checkbox (Fixed by Cloud Sibling)

**Problem**: Bridge panic on checkbox creation - `interface conversion: interface {} is bool, not string`

**Status**: Fixed in commit `fa18c56` by cloud sibling.

### 3. TypeScript Errors in Cosyne Modules (Fixed by Cloud Sibling)

**Problem**: Missing DOM types (CanvasRenderingContext2D, Path2D, requestAnimationFrame, etc.)

**Status**: Fixed in commit `09196f7` by cloud sibling - added `"DOM"` to tsconfig lib.

**Note**: The DOM lib provides only TYPE DEFINITIONS, not actual implementations. Code using these types will compile but won't work at runtime since Fyne doesn't provide a DOM or Canvas2D context. The effects/gradients/clipping APIs now throw descriptive errors explaining this limitation.

### 4. LineChart Uses Line Segments Instead of Paths

**Problem**: `LineChart.render()` originally used `ctx.path()` for SVG-style path rendering, but `canvasPath` is not implemented in the Fyne bridge.

**Workaround**: Changed `LineChart` to use simple line segments connecting points instead of SVG paths.

**Impact**: Curved interpolation modes (`catmull-rom`, `monotone`) don't render as smooth curves - they fall back to straight line segments between points.

**Future Fix**: Implement `canvasPath` in the core:
1. Create `CanvasPath` class in `core/src/widgets/canvas.ts`
2. Add `canvasPath()` method to `App`
3. Implement Go bridge handler for path rendering (SVG path parsing)
4. Restore original `LineChart.render()` using `ctx.path()`

### 5. Demos Fixed and Working

All D3/P5 demos now launch without crashing:
- `scales-demo` - Fixed nested canvasStack, render context parameter
- `markers-demo` - Removed invented `.fontSize()` API calls
- `particles-advanced-demo` - Fixed nested canvasStack, render context parameter
- `line-chart-demo` - Fixed render context parameter, uses line segments workaround
- `effects-gradients-clipping-demo` - Runs but effects don't render (see issue #1)

## Files Modified in This Fix

- `cosyne/src/primitives/base.ts` - Added effects/gradients/clipping API
- `phone-apps/effects-gradients-clipping-demo/demo.ts` - Fixed imports, app signature, withBold
- `phone-apps/scales-demo/scales-demo.ts` - Fixed imports, app signature, withBold
- `phone-apps/particles-advanced-demo/particles-advanced-demo.ts` - Fixed imports, app signature, withBold
- `phone-apps/markers-demo/markers-demo.ts` - Fixed imports, app signature, withBold
- `phone-apps/line-chart-demo/line-chart-demo.ts` - Fixed imports, app signature, withBold

## Lessons for Future Claude Sessions

### Pitfalls to Avoid

1. **Test imports**: Always verify import paths exist before using them
2. **Check function signatures**: Look at existing working examples before calling APIs
3. **Don't invent APIs**: Check if methods like `.withBold()` actually exist
4. **Consider rendering backend**: Fyne is not HTML5 Canvas - not all Canvas2D features are available
5. **Run demos**: Actually execute demos before claiming they work

### Patterns to Follow

**Correct app entry point**:
```typescript
if (require.main === module) {
  const { resolveTransport } = require('../../core/src');
  app(resolveTransport(), { title: 'Demo' }, buildDemoApp);
}
```

**Correct import path**:
```typescript
import { app } from '../../core/src/index';  // NOT '../../src/index'
```

**Bold label**:
```typescript
a.label('Text', undefined, undefined, undefined, { bold: true });  // NOT .withBold()
```
