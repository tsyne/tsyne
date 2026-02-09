/**
 * SVG → TypeScript Source Code Transpiler
 *
 * Converts SVG strings into hand-editable TypeScript source code that
 * uses the SVG grammar API. Path `d` attributes are normalized during
 * transpilation so the generated code works without the runtime normalizer.
 */

import { SvgNode } from './types';
import { parseSvg } from './parser';
import { normalizePath } from './normalizer';

/** Attributes to omit from generated code (not meaningful for rendering). */
const OMIT_ATTRS = new Set(['xmlns', 'xmlns:xlink', 'version', 'xml:space', 'id']);

/**
 * Transpile an SVG string to a TypeScript source code string.
 *
 * Returns an importable module with a function that renders the SVG:
 *
 * ```ts
 * import { svg } from 'cosyne/svg';
 * export function mySvg(app: any, width = 400, height = 400) {
 *   return svg(app, { viewBox: '0 0 100 100', width, height }, (s) => {
 *     s.path({ d: 'M 50 30 C 59 8 ...', fill: '#F00' });
 *   });
 * }
 * ```
 */
export function transpileSvgToModule(
  svgString: string,
  opts?: { functionName?: string },
): string {
  const root = parseSvg(svgString);
  const fnName = opts?.functionName ?? 'renderSvg';

  const viewBox = root.attrs.viewBox || root.attrs.viewbox || '0 0 100 100';
  const lines: string[] = [];

  lines.push(`import { svg } from 'cosyne/svg';`);
  lines.push('');
  lines.push(`export function ${fnName}(app: any, width = 400, height = 400) {`);
  lines.push(`  return svg(app, { viewBox: '${escapeStr(viewBox)}', width, height }, (s) => {`);

  for (const child of root.children) {
    emitNode(lines, child, 2);
  }

  lines.push('  });');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

/**
 * Transpile an SVG string to an inline builder snippet (no imports/function wrapper).
 *
 * Returns the content of the svg() builder callback:
 * ```
 * s.path({ d: 'M 50 30 C ...', fill: '#F00' });
 * s.circle({ cx: 50, cy: 50, r: 20 });
 * ```
 */
export function transpileSvg(svgString: string): string {
  const root = parseSvg(svgString);
  const lines: string[] = [];

  for (const child of root.children) {
    emitNode(lines, child, 0);
  }

  return lines.join('\n');
}

/** Emit TypeScript for a single SvgNode and its children. */
function emitNode(lines: string[], node: SvgNode, indent: number): void {
  const pad = '  '.repeat(indent);

  switch (node.tag) {
    case 'desc':
      // Emit as a comment
      if (node.text) {
        lines.push(`${pad}// ${node.text}`);
      }
      break;

    case 'defs': {
      const attrs = formatAttrs(node.attrs);
      lines.push(`${pad}s.defs(${attrs}, () => {`);
      for (const child of node.children) {
        emitNode(lines, child, indent + 1);
      }
      lines.push(`${pad}});`);
      break;
    }

    case 'linearGradient':
    case 'radialGradient': {
      // Emit as a comment showing the gradient definition
      const id = node.attrs.id || '?';
      const stops = node.children.filter(c => c.tag === 'stop');
      const stopDescs = stops.map(c => {
        const color = c.attrs['stop-color'] || '?';
        const offset = c.attrs.offset || '0';
        return `${offset}: ${color}`;
      });
      lines.push(`${pad}// gradient #${id}: ${stopDescs.join(', ')}`);
      break;
    }

    case 'g': {
      const attrs = formatAttrs(node.attrs);
      lines.push(`${pad}s.g(${attrs}, () => {`);
      for (const child of node.children) {
        emitNode(lines, child, indent + 1);
      }
      lines.push(`${pad}});`);
      break;
    }

    case 'path': {
      const attrs = formatAttrs(node.attrs, true);
      lines.push(`${pad}s.path(${attrs});`);
      break;
    }

    case 'circle': {
      const attrs = formatAttrs(node.attrs);
      lines.push(`${pad}s.circle(${attrs});`);
      break;
    }

    case 'ellipse': {
      const attrs = formatAttrs(node.attrs);
      lines.push(`${pad}s.ellipse(${attrs});`);
      break;
    }

    case 'rect': {
      const attrs = formatAttrs(node.attrs);
      lines.push(`${pad}s.rect(${attrs});`);
      break;
    }

    case 'line': {
      const attrs = formatAttrs(node.attrs);
      lines.push(`${pad}s.line(${attrs});`);
      break;
    }

    case 'polyline': {
      const attrs = formatAttrs(node.attrs);
      lines.push(`${pad}s.polyline(${attrs});`);
      break;
    }

    case 'polygon': {
      const attrs = formatAttrs(node.attrs);
      lines.push(`${pad}s.polygon(${attrs});`);
      break;
    }

    case 'text': {
      const attrs = formatAttrs(node.attrs);
      const content = node.text ? `, '${escapeStr(node.text)}'` : '';
      lines.push(`${pad}s.text(${attrs}${content});`);
      break;
    }

    default:
      // Unknown element — emit children if any
      for (const child of node.children) {
        emitNode(lines, child, indent);
      }
      break;
  }
}

/** Format attributes as a TypeScript object literal. */
function formatAttrs(attrs: Record<string, string>, normalizePaths = false): string {
  const entries: string[] = [];

  for (const [key, value] of Object.entries(attrs)) {
    if (OMIT_ATTRS.has(key)) continue;

    let formattedKey = key;
    // Hyphenated keys need quoting
    if (key.includes('-')) {
      formattedKey = `'${key}'`;
    }

    let formattedValue: string;
    if (key === 'd' && normalizePaths) {
      // Normalize path data at transpile time
      const normalized = normalizePath(value);
      formattedValue = `'${escapeStr(normalized)}'`;
    } else if (isNumeric(value)) {
      formattedValue = value;
    } else {
      formattedValue = `'${escapeStr(value)}'`;
    }

    entries.push(`${formattedKey}: ${formattedValue}`);
  }

  return `{ ${entries.join(', ')} }`;
}

function isNumeric(s: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(s.trim());
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
