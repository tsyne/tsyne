/**
 * Dynamic SVG Loader
 *
 * Parses SVG strings at runtime and renders them using the SVG grammar.
 * Uses parseSvg() → walkNode() → SvgContext methods.
 */

import { SvgNode } from './types';
import { parseSvg, parseViewBox } from './parser';
import { SvgContext, svg } from './grammar';
import { computeContentBounds } from './bbox';

/**
 * Load and render an SVG string into a Tsyne canvas.
 *
 * ```ts
 * a.canvasStack(() => {
 *   loadSvg(a, '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>');
 * });
 * ```
 */
export function loadSvg(
  app: any,
  svgString: string,
  options?: { width?: number; height?: number },
): SvgContext {
  const root = parseSvg(svgString);

  // Extract viewBox from root svg element
  // Per SVG spec: when viewBox is absent, use width/height as the coordinate system
  const viewBoxStr = root.attrs.viewBox || root.attrs.viewbox;
  const svgW = parseNumAttr(root.attrs.width);
  const svgH = parseNumAttr(root.attrs.height);
  const canvasW = options?.width ?? parseNumAttr(root.attrs.width) ?? 400;
  const canvasH = options?.height ?? parseNumAttr(root.attrs.height) ?? 400;

  // Determine viewBox: explicit > content bounds > fallback to canvas size
  let viewBox: string;
  if (viewBoxStr) {
    viewBox = viewBoxStr;
  } else if (svgW !== undefined && svgH !== undefined) {
    viewBox = `0 0 ${svgW} ${svgH}`;
  } else {
    // No viewBox or dimensions — compute from content bounding box.
    // Use the bbox with its origin so the content exactly fills the viewport
    // (matching browser behavior: no clipping, no dead space).
    const bounds = computeContentBounds(root);
    if (bounds) {
      const bw = bounds.maxX - bounds.minX;
      const bh = bounds.maxY - bounds.minY;
      if (bw > 0 && bh > 0) {
        viewBox = `${bounds.minX} ${bounds.minY} ${bw} ${bh}`;
      } else {
        viewBox = `0 0 ${canvasW} ${canvasH}`;
      }
    } else {
      viewBox = `0 0 ${canvasW} ${canvasH}`;
    }
  }

  return svg(
    app,
    {
      viewBox,
      width: canvasW,
      height: canvasH,
      rootAttrs: root.attrs,
    },
    (s) => {
      s.indexNodes(root);
      s.setWalkNode(walkNode);
      for (const child of root.children) {
        walkNode(s, child);
      }
    },
  );
}

/** Recursively walk an SvgNode tree and call SvgContext methods. */
function walkNode(s: SvgContext, node: SvgNode): void {
  const attrs = { ...node.attrs, _tag: node.tag };

  switch (node.tag) {
    case 'g':
      s.g(attrs, () => {
        for (const child of node.children) {
          walkNode(s, child);
        }
      });
      break;
    case 'path':
      s.path(attrs);
      break;
    case 'circle':
      s.circle(attrs);
      break;
    case 'ellipse':
      s.ellipse(attrs);
      break;
    case 'rect':
      s.rect(attrs);
      break;
    case 'line':
      s.line(attrs);
      break;
    case 'polyline':
      s.polyline(attrs);
      break;
    case 'polygon':
      s.polygon(attrs);
      break;
    case 'desc':
      s.desc(attrs);
      break;
    case 'defs':
      s.defs(attrs, () => {
        for (const child of node.children) {
          walkNode(s, child);
        }
      });
      break;
    case 'linearGradient':
    case 'radialGradient':
      s.linearGradient(node);
      break;
    case 'filter':
      s.filter(node);
      break;
    case 'clipPath':
      s.clipPath(node);
      break;
    case 'feGaussianBlur':
      // Handled as child of <filter>, no-op here
      break;
    case 'style':
      // CSS <style> block — extract text and register rules
      if (node.text) s.registerCssStyle(node.text);
      break;
    case 'text': {
      const tspans = node.children.filter(c => c.tag === 'tspan');
      if (tspans.length > 0) {
        s.text(attrs, undefined, tspans);
      } else {
        s.text(attrs, node.text);
      }
      break;
    }
    case 'use':
      s.use(attrs);
      break;
    case 'svg':
      s.nestedSvg(attrs, node.children, () => {
        for (const child of node.children) {
          walkNode(s, child);
        }
      });
      break;
    default:
      // Unknown element — try walking children
      for (const child of node.children) {
        walkNode(s, child);
      }
      break;
  }
}

function parseNumAttr(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const s = v.trim();
  const n = parseFloat(s);
  if (isNaN(n)) return undefined;
  if (s.endsWith('cm')) return n * 37.7953;
  if (s.endsWith('mm')) return n * 3.77953;
  if (s.endsWith('in')) return n * 96;
  if (s.endsWith('pt')) return n * 1.333;
  if (s.endsWith('pc')) return n * 16;
  return n;
}
