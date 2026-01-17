# SVG Graphics Demo: Effects, Gradients, Clipping

**Interactive showcase of drop shadows, glows, gradients, and clipping paths**

Three advanced SVG-inspired graphics features in one unified demo.

## Features

### Effects
- **Drop Shadow** - Offset blurred shadows
- **Glow** - Inner and outer glowing effects
- **Blend Modes** - Multiply, screen, and other compositing
- **Stroke Dash** - Solid, dashed, dotted, and custom patterns

### Gradients
- **Linear Gradients** - 6 preset themes (sunset, ocean, forest, sky, flame, cool)
- **Radial Gradients** - Center-point radiating colors
- **Custom Stops** - Define arbitrary color interpolation
- **Transparency** - Alpha blending in gradients

### Clipping
- **Circle Clipping** - Mask content in circular regions
- **Rectangular Clipping** - With optional rounded corners
- **Polygon Clipping** - Triangles, stars, custom shapes
- **Point-in-Clip Detection** - Ray casting algorithm

## Usage

Run the demo:

```bash
npx tsx phone-apps/effects-gradients-clipping-demo/demo.ts
```

## Controls

| Tab | Options |
|-----|---------|
| **Effects** | Shadow / Glow / Blend Mode / Dash Pattern |
| **Gradients** | Linear / Radial preset themes |
| **Clipping** | Circle / Rectangle / Polygon shapes |

## Code Examples

### Drop Shadow

```typescript
import { cosyne } from 'cosyne';

c.circle(100, 100, 50)
  .fill('#FF6B6B')
  .dropShadow({
    dx: 4,
    dy: 4,
    blur: 8,
    color: '#000000',
    alpha: 0.5
  });
```

### Glow Effect

```typescript
c.rect(50, 50, 100, 100)
  .fill('#FFD93D')
  .glow({
    color: '#FF6B6B',
    blur: 12,
    alpha: 0.7,
    mode: 'outer'  // or 'inner'
  });
```

### Blend Mode

```typescript
c.rect(50, 50, 100, 100)
  .fill('#4ECDC4')
  .blendMode('multiply')  // 'screen', 'overlay', etc.
  .alpha(0.7);
```

### Stroke Dash

```typescript
c.line(0, 0, 200, 0)
  .stroke('#333333', 2)
  .strokeDash([10, 5])      // 10px on, 5px off
  .strokeDashOffset(0);
```

### Linear Gradient

```typescript
import { LinearGradient, PRESET_GRADIENTS } from 'cosyne';

// Using preset
const grad = PRESET_GRADIENTS.sunset();

c.rect(50, 50, 200, 100)
  .fill(grad)
  .stroke('#333333', 2);

// Custom gradient
const custom = new LinearGradient(0, 0, 100, 0)
  .addStop(0, '#FF0000')
  .addStop(0.5, '#FFFF00')
  .addStop(1, '#00FF00');

c.circle(200, 200, 50)
  .fill(custom);
```

### Radial Gradient

```typescript
import { RadialGradient } from 'cosyne';

const radial = new RadialGradient(100, 100, 80)
  .addStop(0, '#FFFFFF')
  .addStop(1, '#000000');

c.circle(100, 100, 80)
  .fill(radial);
```

### Clipping

```typescript
import { ClippingRegion } from 'cosyne';

// Circle clipping
const clip = new ClippingRegion();
clip.setCircleClip(100, 100, 50);

// Check if point is in clipped region
if (clip.containsPoint(100, 100)) {
  console.log('Point is inside clip region');
}

// Apply clipping in render (at context level)
// ctx.save();
// clip.applyClip(ctx);
// ... draw content ...
// ctx.restore();
```

## Preset Gradients

| Name | Colors | Direction |
|------|--------|-----------|
| **sunset** | Red → Yellow → Orange | Horizontal |
| **ocean** | Dark Blue → Cyan → Light Blue | Vertical |
| **forest** | Dark Green → Green → Light Green | Diagonal |
| **sky** | Light Blue → White | Vertical |
| **flame** | Yellow → Red → Dark Red | Top to Bottom |
| **cool** | Cyan → Purple → Light Purple | Horizontal |
| **sunsetRadial** | Yellow → Red → Dark Red | Radial |

## Blend Modes

| Mode | Effect |
|------|--------|
| `multiply` | Darkens by multiplying colors |
| `screen` | Lightens additively |
| `overlay` | Darkens/lightens depending on base |
| `darken` | Keeps darkest color |
| `lighten` | Keeps lightest color |
| `color-dodge` | Brightens with high contrast |
| `color-burn` | Darkens with high contrast |
| `soft-light` | Subtle blending |
| `hard-light` | Strong blending |

## Stroke Dash Patterns

```typescript
// Examples
.strokeDash([10, 5])        // 10px line, 5px gap
.strokeDash([3, 5])         // Dotted: 3px dot, 5px gap
.strokeDash([10, 5, 5, 5])  // Complex: on, gap, on, gap
.strokeDashOffset(5)        // Phase shift by 5px
```

## Performance

| Feature | Perf | Notes |
|---------|------|-------|
| Drop shadow | ✅ Fast | Canvas native |
| Glow | ✅ Fast | Shadow + blur |
| Blend mode | ✅ Very fast | Canvas native |
| Dash pattern | ✅ Fast | Canvas native |
| Linear gradient | ✅ Very fast | Canvas native |
| Radial gradient | ✅ Very fast | Canvas native |
| Clipping circle | ✅ Fast | Native arc clip |
| Clipping polygon | ⚠️ Moderate | Ray casting |

## Files

- `demo.ts` - Interactive demo app (3 tabs)
- `README.md` - This file

## API Reference

### DropShadowOptions

```typescript
interface DropShadowOptions {
  dx?: number;        // Horizontal offset
  dy?: number;        // Vertical offset
  blur?: number;      // Blur radius
  color?: string;     // Shadow color
  alpha?: number;     // Opacity (0-1)
}
```

### GlowOptions

```typescript
interface GlowOptions {
  color?: string;
  blur?: number;
  alpha?: number;
  mode?: 'inner' | 'outer';
}
```

### LinearGradient

```typescript
new LinearGradient(x1?, y1?, x2?, y2?)
  .addStop(offset: 0-1, color: string, alpha?: 0-1)
  .setDirection(x1, y1, x2, y2)
  .setAngle(degrees, length?)
  .getStops()
  .clone()
  .createCanvasGradient(ctx)
```

### RadialGradient

```typescript
new RadialGradient(cx?, cy?, r?, focalX?, focalY?)
  .addStop(offset, color, alpha?)
  .setCenter(cx, cy)
  .setRadius(r)
  .setFocalPoint(fx, fy)
  .getStops()
  .clone()
  .createCanvasGradient(ctx)
```

### ClippingRegion

```typescript
new ClippingRegion()
  .setCircleClip(cx, cy, r)
  .setRectClip(x, y, width, height, radius?)
  .setPolygonClip(points)
  .setPathClip(pathString)
  .clearClip()
  .setEnabled(enabled)
  .containsPoint(x, y)
  .applyClip(ctx)
```

## Real-World Use Cases

✅ **Dashboard widgets** - Shadow/glow for depth
✅ **Data visualization** - Gradient fills for heatmaps
✅ **Interactive graphics** - Glowing buttons/indicators
✅ **Complex layouts** - Clipping for custom shapes
✅ **Animated effects** - Bind effects to state
✅ **Themed UI** - Preset gradients for branding
✅ **Spotlights** - Circular clipping for focus
✅ **Network diagrams** - Dashed connectors

## Integration with Cosyne

All features integrate with:
- ✅ Existing primitives (circle, rect, polygon, path, text)
- ✅ Reactive bindings (state-driven effects)
- ✅ Collections (apply effects to collections)
- ✅ Transforms (effects respect transforms)
- ✅ Events (effects on hover, click, etc.)

## See Also

- [Effects Documentation](../../cosyne/EFFECTS_GRADIENTS_CLIPPING.md)
- [Jest Tests](../../cosyne/test/effects-gradients-clipping.test.ts)
- [Cosyne Main README](../../cosyne/README.md)
