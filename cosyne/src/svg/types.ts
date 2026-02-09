/**
 * Shared types for the SVG-to-Cosyne pipeline
 */

/** Parsed XML node from SVG */
export interface SvgNode {
  tag: string;
  attrs: Record<string, string>;
  children: SvgNode[];
  text?: string;
}

/** Resolved style properties (inherited through groups) */
export interface SvgStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAnchor?: string;
}

/** Raw parsed SVG path command */
export interface PathCommand {
  type: string;    // M, m, L, l, H, h, V, v, C, c, S, s, Q, q, T, t, A, a, Z, z
  args: number[];
}

/** Normalized path command — absolute M/L/C/Z only (Go bridge compatible) */
export interface NormalizedCommand {
  type: 'M' | 'L' | 'C' | 'Z';
  args: number[];
}

/** SVG viewBox definition */
export interface ViewBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

/** Options for the svg() factory */
export interface SvgOptions {
  viewBox?: string | ViewBox;
  width?: number;
  height?: number;
  /** Attributes from root <svg> element to cascade as initial inherited style */
  rootAttrs?: Record<string, string>;
}

/** Attributes passed to grammar element methods */
export interface SvgElementAttrs {
  d?: string;
  cx?: number | string;
  cy?: number | string;
  r?: number | string;
  rx?: number | string;
  ry?: number | string;
  x?: number | string;
  y?: number | string;
  x1?: number | string;
  y1?: number | string;
  x2?: number | string;
  y2?: number | string;
  width?: number | string;
  height?: number | string;
  points?: string;
  fill?: string;
  stroke?: string;
  'stroke-width'?: number | string;
  'stroke-linecap'?: string;
  'stroke-linejoin'?: string;
  [key: string]: any;
}
