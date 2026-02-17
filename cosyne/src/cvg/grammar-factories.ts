/**
 * CVG Grammar — Factory functions and builder class.
 *
 * Extracted from grammar.ts to reduce file size.
 */

import { CvgOptions, CvgElementAttrs, SvgNode, SvgStyle } from './types';
import { AffineMatrix } from './transform';
import { parseViewBox } from './parser';
import { ViewBoxMapping } from './grammar-types';
import { parseNum, parseLengthToPx, parsePreserveAspectRatio } from './grammar-utils';
import { CvgElement } from './grammar-element';
import { CvgContext } from './grammar-context';
import { PathBuilder } from './grammar-defs';

// ─── CvgBuilder — builder-style entry point ─────────────────────

/**
 * Builder-style SVG context. Use `cvgBuilder(app)` to create, then call `.svg()`.
 *
 * ```ts
 * const s = cvgBuilder(app);
 * s.svg({ viewBox: "0 0 100 100" }, () => {
 *   s.path({ d: "M19,16a46,46 0,1,0 62,0...", fill: "#069" });
 *   s.circle({ r: 15, cx: 50, cy: 18 }).fill("#900");
 * });
 * ```
 */
export class CvgBuilder {
  private app: any;
  private ctx: CvgContext | null = null;

  constructor(app: any) {
    this.app = app;
  }

  /** Create an SVG context with viewBox and run the builder. */
  cvg(options: CvgOptions, builder: (s: CvgContext) => void): CvgContext;
  cvg(options: CvgOptions, builder: () => void): CvgContext;
  cvg(options: CvgOptions, builder: ((s: CvgContext) => void) | (() => void)): CvgContext {
    const ctx = createCvgContext(this.app, options);
    this.ctx = ctx;
    // Call builder — if it takes args, pass the context; otherwise `this` methods delegate to ctx
    if (builder.length > 0) {
      (builder as (s: CvgContext) => void)(ctx);
    } else {
      (builder as () => void)();
    }
    return ctx;
  }

  // ─── Delegate element methods to active context ──────────────

  g(attrs: CvgElementAttrs, builder: () => void): void {
    this.ctx!.g(attrs, builder);
  }

  path(attrs: CvgElementAttrs): CvgElement {
    return this.ctx!.path(attrs);
  }

  circle(attrs: CvgElementAttrs): CvgElement {
    return this.ctx!.circle(attrs);
  }

  ellipse(attrs: CvgElementAttrs): CvgElement {
    return this.ctx!.ellipse(attrs);
  }

  rect(attrs: CvgElementAttrs): CvgElement {
    return this.ctx!.rect(attrs);
  }

  line(attrs: CvgElementAttrs): CvgElement {
    return this.ctx!.line(attrs);
  }

  polyline(attrs: CvgElementAttrs): CvgElement {
    return this.ctx!.polyline(attrs);
  }

  polygon(attrs: CvgElementAttrs): CvgElement {
    return this.ctx!.polygon(attrs);
  }

  text(attrs: CvgElementAttrs, content?: string, tspans?: SvgNode[]): CvgElement {
    return this.ctx!.text(attrs, content, tspans);
  }

  desc(attrs?: CvgElementAttrs): void {
    this.ctx?.desc(attrs);
  }

  defs(attrs?: CvgElementAttrs, builder?: () => void): void {
    this.ctx?.defs(attrs, builder);
  }

  pathBuilder(): PathBuilder {
    return this.ctx!.pathBuilder();
  }
}

/**
 * Create an CvgBuilder for builder-style usage.
 *
 * ```ts
 * const s = cvgBuilder(app);
 * s.svg({ viewBox: "0 0 100 100" }, () => {
 *   s.circle({ r: 15, cx: 50, cy: 18 }).fill("#900");
 * });
 * ```
 */
export function cvgBuilder(app: any): CvgBuilder {
  return new CvgBuilder(app);
}

// ─── cvg() Factory (standalone) ─────────────────────────────────

/**
 * Create a CVG rendering context (standalone factory).
 *
 * ```ts
 * cvg(app, { viewBox: '0 0 100 100', width: 400, height: 400 }, (s) => {
 *   s.path({ d: 'M50,30c9-22...', fill: '#F00' });
 * });
 * ```
 */
export function cvg(
  app: any,
  options: CvgOptions,
  builder: (s: CvgContext) => void,
): CvgContext {
  const ctx = createCvgContext(app, options);
  const canvasWidth = options.width ?? 400;
  const canvasHeight = options.height ?? 400;
  const clip = app.clip(() => {
    app.stack(() => {
      // Sizing shim: rect with MinSize gives the Stack (and thus the Clip) proper bounds.
      // canvasStack uses NewWithoutLayout which has MinSize(0,0), so we need a regular
      // Stack parent with a sized child to establish the clip region.
      ctx.setSizingShim(app.canvasRectangle({ width: canvasWidth, height: canvasHeight, fillColor: 'transparent' }));
      app.canvasStack(() => {
        builder(ctx);
      });
    });
  });
  ctx.setClipContainer(clip);
  return ctx;
}

/** Shared: create an CvgContext from options. */
export function createCvgContext(app: any, options: CvgOptions): CvgContext {
  const canvasWidth = options.width ?? 400;
  const canvasHeight = options.height ?? 400;

  let vb: import('./types').ViewBox;
  if (!options.viewBox) {
    vb = { minX: 0, minY: 0, width: canvasWidth, height: canvasHeight };
  } else if (typeof options.viewBox === 'string') {
    const parsed = parseViewBox(options.viewBox);
    vb = parsed ?? { minX: 0, minY: 0, width: canvasWidth, height: canvasHeight };
  } else {
    vb = options.viewBox;
  }

  // Two-step mapping: viewBox → SVG viewport → canvas
  // Step 1: viewBox maps to the SVG's intrinsic viewport (width/height attrs)
  // Step 2: the viewport scales to fit in the canvas
  const ra = options.rootAttrs;
  const rawW = ra?.width ? String(ra.width) : '';
  const rawH = ra?.height ? String(ra.height) : '';
  const svgW = rawW && !rawW.includes('%') ? parseLengthToPx(rawW) : 0;
  const svgH = rawH && !rawH.includes('%') ? parseLengthToPx(rawH) : 0;
  const vpW = svgW > 0 ? svgW : canvasWidth;
  const vpH = svgH > 0 ? svgH : canvasHeight;

  const parStr = ra?.preserveAspectRatio || 'xMidYMid meet';
  const par = parsePreserveAspectRatio(parStr);

  // Step 1: viewBox → viewport (using preserveAspectRatio)
  const scaleXvb = vpW / vb.width;
  const scaleYvb = vpH / vb.height;
  const scaleVB = par.meetOrSlice === 'slice'
    ? Math.max(scaleXvb, scaleYvb)
    : Math.min(scaleXvb, scaleYvb);
  let txVB = 0, tyVB = 0;
  if (par.alignX === 'Mid') txVB = (vpW - vb.width * scaleVB) / 2;
  else if (par.alignX === 'Max') txVB = vpW - vb.width * scaleVB;
  if (par.alignY === 'Mid') tyVB = (vpH - vb.height * scaleVB) / 2;
  else if (par.alignY === 'Max') tyVB = vpH - vb.height * scaleVB;

  // Step 2: viewport → canvas (uniform scale, centered)
  const scaleXc = canvasWidth / vpW;
  const scaleYc = canvasHeight / vpH;
  const scaleC = Math.min(scaleXc, scaleYc);
  const txC = (canvasWidth - vpW * scaleC) / 2;
  const tyC = (canvasHeight - vpH * scaleC) / 2;

  // Combined: canvas_pt = (txC + scaleC*txVB, tyC + scaleC*tyVB) + scaleC*scaleVB*(pt - vb.min)
  const scale = scaleC * scaleVB;
  const offsetX = txC + scaleC * txVB;
  const offsetY = tyC + scaleC * tyVB;

  const transform = AffineMatrix.translate(offsetX, offsetY)
    .multiply(AffineMatrix.scale(scale))
    .multiply(AffineMatrix.translate(-vb.minX, -vb.minY));
  const mapping: ViewBoxMapping = { vb, canvasWidth, canvasHeight, scale, offsetX, offsetY, transform };

  // Build initial inherited style from root <svg> attributes
  let rootStyle: SvgStyle | undefined;
  if (ra) {
    rootStyle = {};
    if (ra.fill) rootStyle.fill = ra.fill;
    if (ra.stroke) rootStyle.stroke = ra.stroke;
    if (ra['stroke-width']) rootStyle.strokeWidth = parseNum(ra['stroke-width']);
    if (ra['stroke-linecap']) rootStyle.strokeLinecap = ra['stroke-linecap'] as any;
    if (ra['stroke-linejoin']) rootStyle.strokeLinejoin = ra['stroke-linejoin'] as any;
    if (ra['font-size']) rootStyle.fontSize = parseNum(ra['font-size']);
    if (ra['font-family']) rootStyle.fontFamily = ra['font-family'];
  }

  return new CvgContext(app, mapping, rootStyle);
}
