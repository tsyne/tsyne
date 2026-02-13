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
  opacity?: number;
  fillOpacity?: number;
  strokeOpacity?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAnchor?: string;
  fillRule?: 'nonzero' | 'evenodd';
  filterId?: string;
  clipPathId?: string;
}

/** Filter definition — stores blur parameters for url(#id) resolution. */
export interface FilterDef {
  id: string;
  regionX: number;
  regionY: number;
  regionWidth: number;
  regionHeight: number;
  blur?: { stdDeviationX: number; stdDeviationY: number };
}

/** Shape inside a clipPath definition. */
export interface ClipPathShape {
  type: 'rect' | 'circle';
  x?: number; y?: number; width?: number; height?: number;  // rect
  cx?: number; cy?: number; r?: number;                      // circle
}

/** ClipPath definition — stores shapes for clipping. */
export interface ClipPathDef {
  id: string;
  shapes: ClipPathShape[];
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

/** Perspective projection — Cosyne extension (not part of SVG). */
export interface CosynePerspective {
  rotateY?: number;              // degrees — rotation around vertical axis
  rotateX?: number;              // degrees — rotation around horizontal axis
  distance: number;              // camera distance (larger = subtler effect)
  origin?: [number, number];     // rotation center in local coordinates (default [0, 0])
}

/** Typed transform specification — alternative to SVG transform strings. */
export interface TransformSpec {
  translate?: [number, number];
  scale?: number | [number, number];
  rotate?: number | [number, number, number];  // degrees | [degrees, cx, cy]
  skewX?: number;
  skewY?: number;
  cosynePerspective?: CosynePerspective;
}

/** Attributes passed to grammar element methods */
export interface SvgElementAttrs {
  transform?: string | TransformSpec;
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
  points?: string | [number, number][];
  fill?: string;
  stroke?: string;
  'stroke-width'?: number | string;
  'stroke-linecap'?: string;
  'stroke-linejoin'?: string;
  onClick?: (e: { x: number; y: number }) => void;
  onHover?: (hovered: boolean) => void;
  onDrag?: (e: { x: number; y: number; deltaX: number; deltaY: number }) => void;
  onDragEnd?: () => void;
  onScroll?: (e: { deltaX: number; deltaY: number; x: number; y: number }) => void;
  onDoubleClick?: (e: { x: number; y: number }) => void;
  onRightClick?: (e: { x: number; y: number }) => void;
  tooltip?: string;
  when?: () => boolean;
  cursor?: 'default' | 'pointer' | 'text' | 'crosshair' | 'hResize' | 'vResize';
  bindFill?: () => string;
  bindStroke?: () => { color: string; width?: number };
  bindOpacity?: () => number;
  bindPos?: () => Record<string, number>;
  [key: string]: any;
}
