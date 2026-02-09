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

Tested against 193 SVG files (15 hand-crafted + 178 from the W3C SVG test suite).

### Fully Supported

| Feature | Notes |
|---------|-------|
| **`<path>`** | All path commands — see normalizer section below |
| **`<circle>`** | cx, cy, r |
| **`<ellipse>`** | cx, cy, rx, ry |
| **`<rect>`** | x, y, width, height |
| **`<line>`** | x1, y1, x2, y2 |
| **`<polyline>`** | Converted to path (M + L commands) |
| **`<polygon>`** | Converted to closed path (M + L + Z) |
| **`<g>`** | Groups with style inheritance |
| **`<svg>`** | Root element, nested `<svg>` elements |
| **`<desc>`** | Preserved as comments in transpiler output |
| **viewBox** | Full xMidYMid meet scaling + centering |
| **fill** | Solid colors, `none` |
| **stroke** | Color, `stroke-width` |
| **stroke-linecap** | Parsed and inherited, passed to bridge |
| **stroke-linejoin** | Parsed and inherited, passed to bridge |
| **Style inheritance** | Groups push style onto stack, children override |

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

These SVG 1.1 features are parsed without error but are not rendered:

| Feature | Status |
|---------|--------|
| **`<text>`** | Parsed, stub in grammar (no-op) |
| **`<defs>` / `<use>`** | `<defs>` is a no-op; `<use>` references not resolved |
| **`<clipPath>`** | Parsed as a group, clipping not applied |
| **`<mask>`** | Parsed, not applied |
| **`<linearGradient>`** | Parsed within defs, not applied to fills |
| **`<radialGradient>`** | Parsed within defs, not applied to fills |
| **`<pattern>`** | Not supported |
| **`<filter>`** | Not supported (gaussianBlur, feColorMatrix, etc.) |
| **`<image>`** | Not supported |
| **`<symbol>`** | Not supported |
| **`<marker>`** | Not supported |
| **`<switch>`** | Not supported |
| **`<foreignObject>`** | Not supported |
| **opacity** | Not supported (`fill-opacity`, `stroke-opacity`, `opacity`) |
| **transform** | Not supported (`translate`, `rotate`, `scale`, `matrix`) |
| **`style` attribute** | Inline CSS (`style="fill:red"`) not parsed — use presentation attributes |
| **`<style>` element** | CSS stylesheets not supported |
| **`class` attribute** | Not resolved |
| **rx/ry on `<rect>`** | Rounded corners not rendered |
| **`preserveAspectRatio`** | Only `xMidYMid meet` (the default) — other values ignored |
| **`font-*` attributes** | No text rendering |
| **DTD entity references** | DOCTYPE with `<!ENTITY>` definitions is stripped; entity refs (`&name;`) are not expanded |

### What This Means in Practice

For SVGs consisting of **paths, basic shapes, groups, fills, and strokes**, rendering
is accurate — the original 15 test SVGs scored 12 pixel-perfect and 3 within excellent
tolerance (max MAE 5.2/255) against librsvg reference renders.

SVGs that rely on gradients, filters, transforms, text, clipping, or CSS will parse
and display their basic geometry but will be missing visual effects.

## Files

| File | Purpose |
|------|---------|
| `types.ts` | Shared types: SvgNode, SvgStyle, PathCommand, etc. |
| `parser.ts` | Regex-based SVG XML parser (no dependencies) |
| `normalizer.ts` | Path d-string normalizer: all commands to absolute M/L/C/Z |
| `grammar.ts` | SvgContext, SvgElement, SvgBuilder, PathBuilder |
| `loader.ts` | Runtime SVG string rendering via parser + grammar |
| `transpiler.ts` | SVG string to TypeScript source code |
| `index.ts` | Barrel re-exports |

## Tests

```bash
cd cosyne

# Unit tests (no display needed)
npx jest test/svg-normalizer.test.ts   # 44 tests
npx jest test/svg-parser.test.ts       # 214 tests (all 193 SVGs)
npx jest test/svg-grammar.test.ts      # 39 tests
npx jest test/svg-transpiler.test.ts   # 13 tests

# Visual comparison (needs display + rsvg-convert)
TSYNE_HEADED=1 npx jest test/svg-rendering.test.ts
```
