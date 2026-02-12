# SVG-to-Cosyne Pipeline

Renders SVG content through Tsyne's canvas primitives. Three entry points:

- **`loadSvg(app, svgString, options?)`** — render SVG strings at runtime
- **`svg(app, options, builder)`** / **`svgBuilder(app)`** — programmatic SVG grammar
- **`transpileSvg()` / `transpileSvgToModule()`** — SVG files to hand-editable TypeScript

All paths are normalized to absolute M/L/C/Z before reaching the Go bridge,
which only supports those four commands.

## Architecture

```
SVG string
  │
  ├─ loadSvg()     ─→ parser ─→ walkNode() ─→ SvgContext methods ─→ app.canvasPath() etc.
  ├─ transpileSvg() ─→ parser ─→ emit TypeScript source using grammar API
  └─ svg() / svgBuilder() ─→ user calls SvgContext directly
                                    │
                            normalizer (path d → M/L/C/Z)
                                    │
                              Go bridge PathRaster
```

## SVG 1.1 Compatibility

Tested against 199 SVG files (15 hand-crafted + 184 from the W3C SVG test suite).
Median MAE ~0.5, 169 below MAE 5.

### Fully Supported

| Feature | Notes |
|---------|-------|
| **`<path>`** | All path commands — see normalizer section below |
| **`<circle>`** | cx, cy, r |
| **`<ellipse>`** | cx, cy, rx, ry |
| **`<rect>`** | x, y, width, height, rx/ry (rounded corners via arc paths) |
| **`<line>`** | x1, y1, x2, y2 |
| **`<polyline>`** | Converted to path (M + L commands) |
| **`<polygon>`** | Converted to closed path (M + L + Z) |
| **`<g>`** | Groups with style + transform inheritance |
| **`<svg>`** | Root element, nested `<svg>` elements |
| **`<defs>` / `<use>`** | Definitions registered, `<use>` clones + renders referenced elements |
| **`<text>`** | Font size/family/weight/style, text-anchor, `<tspan>` children |
| **`<desc>`** | Preserved as comments in transpiler output |
| **viewBox** | Full scaling + centering |
| **preserveAspectRatio** | All alignment values (xMin/xMid/xMax, yMin/yMid/yMax) + meet/slice modes |
| **fill** | Solid colors, `none`, `url(#gradient)` references |
| **stroke** | Color, `stroke-width` |
| **stroke-linecap** | Parsed and inherited, passed to bridge |
| **stroke-linejoin** | Parsed and inherited, passed to bridge |
| **opacity** | `opacity`, `fill-opacity`, `stroke-opacity` — all supported and inherited |
| **transform** | `translate`, `rotate`, `scale`, `matrix`, `skewX`, `skewY` — full affine transform stack |
| **`<linearGradient>`** | Stops, geometry, `userSpaceOnUse` and `objectBoundingBox` units |
| **`<radialGradient>`** | cx, cy, r, fx, fy + both coordinate systems |
| **`<clipPath>`** | Rasterization-based clipping for circles, rects, paths |
| **`style` attribute** | Inline CSS (`style="fill:red"`) parsed and applied |
| **`<style>` element** | CSS class and element selectors (missing: descendant selectors, `!important`) |
| **`class` attribute** | Resolved against `<style>` rules |
| **Style inheritance** | Groups push style onto stack, children override |
| **DTD entity references** | `<!ENTITY>` definitions extracted and `&name;` refs expanded |

### Path Commands (Normalizer)

All SVG path commands are supported and normalized to absolute M/L/C/Z:

| Command | Handling |
|---------|----------|
| **M/m** (moveTo) | Relative converted to absolute. Implicit L after M. |
| **L/l** (lineTo) | Relative converted to absolute |
| **H/h** (horizontal) | Converted to L |
| **V/v** (vertical) | Converted to L |
| **C/c** (cubic bezier) | Relative converted to absolute |
| **S/s** (smooth cubic) | Reflected control point, emitted as C |
| **Q/q** (quadratic bezier) | Promoted to cubic (2/3 rule) |
| **T/t** (smooth quadratic) | Reflected control point, promoted to cubic |
| **A/a** (arc) | Endpoint-to-center parameterization (SVG spec F.6.5), split into <=90-degree segments, approximated as cubic beziers |
| **Z/z** (close) | Passed through |

Edge cases handled: negative-sign separators (`50-30`), implicit L after M,
repeated implicit commands, degenerate arcs (zero radius becomes L),
comma/whitespace separators.

### Not Yet Supported

| Feature | Status |
|---------|--------|
| **`<pattern>`** | Not supported (renders as solid black) |
| **`<filter>`** | Partial — Gaussian blur only; feColorMatrix, feOffset, etc. missing |
| **`<image>`** | Not supported (embedded or external images) |
| **`<symbol>`** | Not supported |
| **`<marker>`** | Not supported (arrowheads, dots on lines/paths) |
| **`<mask>`** | Not supported (distinct from clipPath — uses luminance/alpha) |
| **`<switch>`** | Not supported |
| **`<foreignObject>`** | Not supported |
| **Text stroke** | Stroke color used as fill fallback; true stroke rendering missing |
| **`<tspan>` dx/dy arrays** | Individual glyph positioning not supported |

### Won't Fix (static .svg renderer)

- JavaScript / `<script>`
- SMIL animation (`<animate>`, `<animateTransform>`, `<set>`)
- CSS transitions/animations
- `:hover` / `:active` / `:focus` pseudo-classes
- `<video>` / `<audio>` elements

These are replaced by the programmatic SVG grammar API (see TODO.md).

## Files

| File | Purpose |
|------|---------|
| `types.ts` | Shared types: SvgNode, SvgStyle, PathCommand, etc. |
| `parser.ts` | Regex-based SVG XML parser (no dependencies) |
| `normalizer.ts` | Path d-string normalizer: all commands to absolute M/L/C/Z |
| `transform.ts` | AffineMatrix and `parseTransform()` for SVG transform attributes |
| `grammar.ts` | SvgContext, SvgElement, SvgBuilder, PathBuilder |
| `loader.ts` | Runtime SVG string rendering via parser + grammar |
| `rasterize.ts` | CPU rasterizer for clipPath, gradients, blur |
| `blur.ts` | Gaussian blur implementation |
| `bbox.ts` | Bounding box computation with transform support |
| `transpiler.ts` | SVG string to TypeScript source code |
| `index.ts` | Barrel re-exports |

## Tests

```bash
cd cosyne

# Unit tests (no display needed)
npx jest test/svg-normalizer.test.ts   # 44 tests
npx jest test/svg-parser.test.ts       # 214 tests (all 199 SVGs)
npx jest test/svg-grammar.test.ts      # 39 tests
npx jest test/svg-transpiler.test.ts   # 13 tests
npx jest test/svg-transform.test.ts    # transform stack tests
npx jest test/svg-text.test.ts         # text rendering tests

# Visual comparison (needs display + rsvg-convert)
python3 test/svg-compare.py --no-open  # 199 SVGs, generates svg-conformance.csv
TSYNE_HEADED=1 npx jest test/svg-rendering.test.ts
```
