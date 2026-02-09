/**
 * SVG-to-Cosyne pipeline
 *
 * Entry points:
 *  - svg()        — standalone factory: svg(app, { viewBox: '...' }, (s) => { ... })
 *  - svgBuilder() — builder-style: const s = svgBuilder(app); s.svg({...}, () => { ... })
 *  - loadSvg()    — render SVG string at runtime
 *  - transpileSvg() / transpileSvgToModule() — SVG → TypeScript source code
 */

// Types
export type {
  SvgNode,
  SvgStyle,
  PathCommand,
  NormalizedCommand,
  ViewBox,
  SvgOptions,
  SvgElementAttrs,
} from './types';

// Parser
export { parseSvg, parseViewBox } from './parser';

// Normalizer
export { parsePath, normalizeCommands, normalizePath, serializeCommands } from './normalizer';

// Grammar
export { SvgContext, SvgElement, SvgBuilder, PathBuilder, svg, svgBuilder, parseStyleAttr } from './grammar';

// Loader
export { loadSvg } from './loader';

// Transform
export { AffineMatrix, parseTransform } from './transform';

// Transpiler
export { transpileSvg, transpileSvgToModule } from './transpiler';
