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

We will instead make equivalent functions for pure Cosyne Typescript: onClick:({}) onXxx({}) attrs, .when()
