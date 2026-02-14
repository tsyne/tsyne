/**
 * CVG (Cosyne Vector Graphics) pipeline
 *
 * Entry points:
 *  - cvg()        — standalone factory: cvg(app, { viewBox: '...' }, (s) => { ... })
 *  - cvgBuilder() — builder-style: const s = cvgBuilder(app); s.svg({...}, () => { ... })
 *  - loadSvg()    — render SVG string at runtime (SVG → CVG)
 *  - transpileSvg() / transpileSvgToModule() — SVG → TypeScript source code
 */

// Types
export type {
  SvgNode,
  SvgStyle,
  PathCommand,
  NormalizedCommand,
  ViewBox,
  CvgOptions,
  CvgElementAttrs,
  TransformSpec,
  CosynePerspective,
} from './types';

// Parser
export { parseSvg, parseViewBox } from './parser';

// Normalizer
export { parsePath, normalizeCommands, normalizePath, serializeCommands } from './normalizer';

// Grammar
export { CvgContext, CvgElement, CvgBuilder, PathBuilder, cvg, cvgBuilder, parseStyleAttr, AnimationHandle, Easing, type CvgEvent, type AnimationOptions, type EasingFn } from './grammar';

// Loader
export { loadSvg } from './loader';

// Transform
export { AffineMatrix, parseTransform, ProjectiveMatrix, composeTransforms, transformFromSpec, type Transform2D } from './transform';

// Transpiler
export { transpileSvg, transpileSvgToModule } from './transpiler';
