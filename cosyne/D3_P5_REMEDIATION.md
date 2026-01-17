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

### 2. Markers Demo Crashes

**Problem**: Bridge panic on checkbox creation - `interface conversion: interface {} is bool, not string`

**Location**: `core/bridge/widget_creators_inputs.go:236`

**Root Cause**: The demo passes a boolean where the bridge expects a string, or vice versa.

**Remediation**: Debug the checkbox payload in markers-demo.ts and fix type mismatch.

### 3. TypeScript Errors in Cosyne Modules

Running `npx tsc --noEmit` in cosyne shows errors:

```
src/effects.ts - Missing CanvasRenderingContext2D type
src/gradients.ts - Missing CanvasRenderingContext2D, CanvasGradient types
src/clipping.ts - Missing CanvasRenderingContext2D, Path2D types
src/markers.ts - Missing CanvasRenderingContext2D, Path2D types
src/particle-system.ts - Missing requestAnimationFrame, cancelAnimationFrame
src/axes.ts - Type mismatch string|number vs number
src/line-chart.ts - Wrong number of arguments, protected property access
```

**Remediation**:
- Add `/// <reference lib="dom" />` or install `@types/node` with DOM lib
- Fix actual type errors in axes.ts, line-chart.ts, particle-system.ts

### 4. Scales/Line-Chart/Particles Demos Untested

These may work but weren't fully tested due to time constraints.

**Remediation**: Test each demo, fix any runtime errors.

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
