/**
 * Cosyne Context - Main builder for declarative canvas compositions
 *
 * The CosyneContext wraps a Tsyne canvasStack and provides a fluent API
 * for creating and binding canvas primitives.
 */

import { BindingRegistry, PositionBinding } from './binding';
import { CosyneCircle, CircleOptions } from './primitives/circle';
import { CosyneEllipse, EllipseOptions } from './primitives/ellipse';
import { CosyneRect, RectOptions } from './primitives/rect';
import { CosyneLine, LineOptions, LineEndpoints } from './primitives/line';
import { CosyneText, TextOptions } from './primitives/text';
import { CosynePath, PathOptions } from './primitives/path';
import { CosyneArc, ArcOptions } from './primitives/arc';
import { CosyneWedge, WedgeOptions } from './primitives/wedge';
import { CosyneGrid, GridOptions } from './primitives/grid';
import { CosyneHeatmap, HeatmapOptions, HeatmapData } from './primitives/heatmap';
import { CosynePolygon, PolygonOptions, Point } from './primitives/polygon';
import { CosyneStar, StarOptions } from './primitives/star';
import { CosyneGauge, GaugeOptions } from './primitives/gauge';
import { CosyneDial, DialOptions } from './primitives/dial';
import { CosyneSphericalPatch, SphericalPatchOptions } from './primitives/spherical-patch';
import { Primitive } from './primitives/base';
import { CirclesCollection, RectsCollection, LinesCollection } from './collections';
import { TransformStack, TransformOptions } from './transforms';
import { ForeignObject, ForeignObjectCollection } from './foreign';
import { AnimationManager } from './animation-manager';
import { MarkerConfig, isCustomMarker, BuiltInMarkerType, CustomMarker } from './markers';

/**
 * Options for creating a CosyneContext
 */
export interface CosyneContextOptions {
  animationManager?: AnimationManager;
}

/**
 * Main Cosyne builder context
 */
export class CosyneContext {
  private bindingRegistry: BindingRegistry;
  private primitives: Map<string | undefined, Primitive<any>> = new Map();
  private allPrimitives: Primitive<any>[] = [];
  private transformStack: TransformStack = new TransformStack();
  private foreignObjects: ForeignObjectCollection = new ForeignObjectCollection();
  private animationManager: AnimationManager;
  private builder?: (context: CosyneContext) => void;
  private containerId?: string;
  private container?: any;  // Reference to the CanvasStack container for removeAll()

  constructor(private app: any, options?: CosyneContextOptions) {
    this.bindingRegistry = new BindingRegistry();
    this.animationManager = options?.animationManager ?? new AnimationManager();
  }

  /**
   * Set the builder function for this context (used for rebuild)
   */
  setBuilder(builder: (context: CosyneContext) => void): void {
    this.builder = builder;
  }

  /**
   * Set the container ID this context renders into (for clearing on rebuild)
   */
  setContainerId(containerId: string): void {
    this.containerId = containerId;
  }

  /**
   * Set the container reference (for removeAll on rebuild)
   */
  setContainer(container: any): void {
    this.container = container;
    if (container?.id) {
      this.containerId = container.id;
    }
  }

  /**
   * Clear all primitives and rebuild the context from scratch
   * Use this when state changes require creating different primitives
   */
  rebuild(): void {
    if (!this.builder) return;
    if (!this.containerId || !this.app?.ctx?.bridge) {
      // Can't rebuild without container reference
      return;
    }

    // Get the event canvas ID before clearing (set by enableEventHandling)
    const eventCanvas = (this as any)._eventCanvas;
    const eventCanvasId = eventCanvas?.id;

    // Clear existing Fyne widgets from the container
    this.app.ctx.bridge.send('containerRemoveAll', { containerId: this.containerId });

    // Clear existing primitives from our tracking
    this.primitives.clear();
    this.allPrimitives = [];

    // Push container onto stack so new widgets get collected
    this.app.ctx.pushContainerById(this.containerId);

    // Re-run the builder to create new primitives
    this.builder(this);

    // Pop container to get the new child IDs
    const childIds = this.app.ctx.popContainer();

    // Add each new child to the container
    for (const childId of childIds) {
      this.app.ctx.bridge.send('containerAdd', {
        containerId: this.containerId,
        childId
      });
    }

    // Re-add the event canvas on top (must be last for proper z-order)
    if (eventCanvasId) {
      this.app.ctx.bridge.send('containerAdd', {
        containerId: this.containerId,
        childId: eventCanvasId
      });
    }

    // Render markers for lines and refresh bindings (same as initial build)
    this.renderLineMarkers();
    this.refreshBindings();
  }

  /**
   * Get the animation manager for this context
   */
  getAnimationManager(): AnimationManager {
    return this.animationManager;
  }

  /**
   * Apply current transform stack to a point
   */
  private applyTransform(x: number, y: number): [number, number] {
    return this.transformStack.current().transformPoint(x, y);
  }

  /**
   * Create a group with a local coordinate system (translate only)
   * Children use coordinates relative to (x, y)
   */
  group(x: number, y: number, builder: (ctx: CosyneContext) => void): this {
    return this.transform({ translate: [x, y] }, builder);
  }

  /**
   * Create a circle primitive
   */
  circle(x: number, y: number, radius: number, options?: CircleOptions): CosyneCircle {
    // Apply current transform to center point
    const [tx, ty] = this.applyTransform(x, y);

    // Apply scale to radius (for non-uniform scale, use average to create ellipse-like effect)
    const [scaleX, scaleY] = this.transformStack.current().getScale();
    const radiusX = radius * scaleX;
    const radiusY = radius * scaleY;

    // Create the underlying Tsyne canvas circle
    // x, y is the CENTER of the circle, convert to bounding box for Fyne
    // Using different radiusX/radiusY creates an ellipse for non-uniform scaling
    const underlying = this.app.canvasCircle({
      x: tx - radiusX,
      y: ty - radiusY,
      x2: tx + radiusX,
      y2: ty + radiusY,
      fillColor: options?.fillColor || 'black',
      strokeColor: options?.strokeColor,
      strokeWidth: options?.strokeWidth || 1,
      blendMode: options?.blendMode,
    });

    // Store the average scaled radius for hit testing
    const scaledRadius = (radiusX + radiusY) / 2;
    const primitive = new CosyneCircle(tx, ty, scaledRadius, underlying, {
      ...options,
      animationManager: this.animationManager,
    });
    this.trackPrimitive(primitive);
    return primitive;
  }

  /**
   * Create an ellipse primitive
   *
   * Use ellipse() when you need independent x and y radii (non-uniform scaling).
   * For uniform circles, use circle() instead.
   *
   * @param x - Center x coordinate
   * @param y - Center y coordinate
   * @param radiusX - Horizontal radius
   * @param radiusY - Vertical radius
   * @param options - Fill, stroke, and other options
   */
  ellipse(x: number, y: number, radiusX: number, radiusY: number, options?: EllipseOptions): CosyneEllipse {
    // Apply current transform to center point
    const [tx, ty] = this.applyTransform(x, y);

    // Apply scale to radii
    const [scaleX, scaleY] = this.transformStack.current().getScale();
    const scaledRadiusX = radiusX * scaleX;
    const scaledRadiusY = radiusY * scaleY;

    // Create the underlying Tsyne canvas ellipse
    // Tsyne expects top-left position + width/height, so convert from center + radii
    const underlying = this.app.canvasEllipse({
      x: tx - scaledRadiusX,
      y: ty - scaledRadiusY,
      width: scaledRadiusX * 2,
      height: scaledRadiusY * 2,
      fillColor: options?.fillColor || 'black',
    });

    const primitive = new CosyneEllipse(tx, ty, scaledRadiusX, scaledRadiusY, underlying, {
      ...options,
      animationManager: this.animationManager,
    });
    this.trackPrimitive(primitive);
    return primitive;
  }

  /**
   * Create a rectangle primitive
   */
  rect(x: number, y: number, width: number, height: number, options?: RectOptions): CosyneRect {
    // Apply current transform to position
    const [tx, ty] = this.applyTransform(x, y);

    // Apply scale to dimensions
    const [scaleX, scaleY] = this.transformStack.current().getScale();
    const scaledWidth = width * scaleX;
    const scaledHeight = height * scaleY;

    const fillColor = options?.fillColor || 'black';
    // Create the underlying Tsyne canvas rectangle
    const underlying = this.app.canvasRectangle({
      x: tx,
      y: ty,
      x2: tx + scaledWidth,
      y2: ty + scaledHeight,
      fillColor,
      strokeColor: options?.strokeColor,
      strokeWidth: options?.strokeWidth || 1,
      cornerRadius: options?.cornerRadius,
      blendMode: options?.blendMode,
    });

    const primitive = new CosyneRect(tx, ty, scaledWidth, scaledHeight, underlying, {
      ...options,
      animationManager: this.animationManager,
    });
    this.trackPrimitive(primitive);
    return primitive;
  }

  /**
   * Create a line primitive
   */
  line(x1: number, y1: number, x2: number, y2: number, options?: LineOptions): CosyneLine {
    // Apply current transform to both endpoints
    const [tx1, ty1] = this.applyTransform(x1, y1);
    const [tx2, ty2] = this.applyTransform(x2, y2);

    // Create the underlying Tsyne canvas line
    const underlying = this.app.canvasLine(tx1, ty1, tx2, ty2, {
      strokeColor: options?.strokeColor || 'black',
      strokeWidth: options?.strokeWidth || 1,
      blendMode: options?.blendMode,
    });

    const primitive = new CosyneLine(tx1, ty1, tx2, ty2, underlying, {
      ...options,
      animationManager: this.animationManager,
    });
    this.trackPrimitive(primitive);
    return primitive;
  }

  /**
   * Shape descriptor for connector endpoints
   */
  /**
   * Create a connector line between two shapes that stops at their edges.
   * Useful for diagrams, flowcharts, and network graphs where lines should
   * connect to shape perimeters rather than centers.
   *
   * @param from - Start shape: { x, y, radius } for circles, { x, y, width, height } for rects
   * @param to - End shape: same format as 'from'
   * @param options - Line styling options
   * @returns CosyneLine with endpoints adjusted to touch shape edges
   *
   * @example
   * // Connect two circular nodes
   * c.connector(
   *   { x: 100, y: 100, radius: 20 },
   *   { x: 200, y: 150, radius: 20 },
   *   { strokeColor: '#333', strokeWidth: 2 }
   * ).endMarker('arrow', 10, '#333');
   *
   * @example
   * // Connect rectangular nodes
   * c.connector(
   *   { x: 50, y: 50, width: 80, height: 40 },
   *   { x: 200, y: 100, width: 80, height: 40 }
   * );
   */
  connector(
    from: { x: number; y: number; radius?: number; width?: number; height?: number },
    to: { x: number; y: number; radius?: number; width?: number; height?: number },
    options?: LineOptions
  ): CosyneLine {
    // Calculate direction vector
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) {
      // Degenerate case: same point
      return this.line(from.x, from.y, to.x, to.y, options);
    }

    // Unit vector from 'from' to 'to'
    const ux = dx / len;
    const uy = dy / len;

    // Calculate edge offset for 'from' shape
    let fromOffset = 0;
    if (from.radius !== undefined) {
      // Circle: offset by radius
      fromOffset = from.radius;
    } else if (from.width !== undefined && from.height !== undefined) {
      // Rectangle: find intersection with edge
      fromOffset = this.rectEdgeOffset(from.width, from.height, ux, uy);
    }

    // Calculate edge offset for 'to' shape
    let toOffset = 0;
    if (to.radius !== undefined) {
      // Circle: offset by radius
      toOffset = to.radius;
    } else if (to.width !== undefined && to.height !== undefined) {
      // Rectangle: find intersection with edge (reverse direction)
      toOffset = this.rectEdgeOffset(to.width, to.height, -ux, -uy);
    }

    // Calculate adjusted endpoints
    const x1 = from.x + ux * fromOffset;
    const y1 = from.y + uy * fromOffset;
    const x2 = to.x - ux * toOffset;
    const y2 = to.y - uy * toOffset;

    return this.line(x1, y1, x2, y2, options);
  }

  /**
   * Calculate the distance from rectangle center to edge in a given direction
   */
  private rectEdgeOffset(width: number, height: number, ux: number, uy: number): number {
    // For a rectangle centered at origin with given width/height,
    // find where a ray in direction (ux, uy) intersects the edge
    const halfW = width / 2;
    const halfH = height / 2;

    if (Math.abs(ux) < 0.0001) {
      // Vertical line
      return halfH;
    }
    if (Math.abs(uy) < 0.0001) {
      // Horizontal line
      return halfW;
    }

    // Time to hit vertical edges (x = ±halfW)
    const tx = halfW / Math.abs(ux);
    // Time to hit horizontal edges (y = ±halfH)
    const ty = halfH / Math.abs(uy);

    // Take the smaller time (first intersection)
    const t = Math.min(tx, ty);

    // Distance is t (since direction is unit vector)
    return t;
  }

  /**
   * Render markers for all lines that have them configured
   * Called after the builder completes to ensure all fluent API calls have been processed
   */
  renderLineMarkers(): void {
    for (const primitive of this.allPrimitives) {
      if (primitive instanceof CosyneLine) {
        const markers = primitive.getMarkers();
        const endpoints = primitive.getEndpoints();

        // Calculate line angle
        const dx = endpoints.x2 - endpoints.x1;
        const dy = endpoints.y2 - endpoints.y1;
        const angle = Math.atan2(dy, dx);

        // Render start marker
        const startMarker = markers.getStartMarker();
        if (startMarker) {
          this.renderMarker(endpoints.x1, endpoints.y1, angle + Math.PI, startMarker);
        }

        // Render end marker
        const endMarker = markers.getEndMarker();
        if (endMarker) {
          this.renderMarker(endpoints.x2, endpoints.y2, angle, endMarker);
        }
      }
    }
  }

  /**
   * Compute bounding box of an SVG path string
   */
  private computePathBounds(pathString: string): { width: number; height: number; minX: number; minY: number } {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    // Extract all numbers from path
    const numbers = pathString.match(/-?\d+\.?\d*/g) || [];
    for (let i = 0; i < numbers.length; i += 2) {
      const x = parseFloat(numbers[i]);
      const y = parseFloat(numbers[i + 1] || '0');
      if (!isNaN(x) && !isNaN(y)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }

    if (minX === Infinity) {
      return { width: 0, height: 0, minX: 0, minY: 0 };
    }

    return {
      width: maxX - minX,
      height: maxY - minY,
      minX,
      minY,
    };
  }

  /**
   * Render a single marker at the given position and angle
   */
  /**
   * Parse a simple SVG path string into polygon points
   * Supports: M (moveto), L (lineto), Z (closepath)
   * Ignores curves (Q, A) - approximates them with straight lines
   */
  private parseSvgPathToPoints(path: string, scale: number, refX: number, refY: number, width: number, height: number): Point[][] {
    const polygons: Point[][] = [];
    let currentPolygon: Point[] = [];
    let currentX = 0;
    let currentY = 0;

    // Simple tokenizer - split by commands
    const commands = path.match(/[MLQAHVCSTZ][^MLQAHVCSTZ]*/gi) || [];

    // Find bounding box of path to map refX/refY correctly
    let minX = Infinity, minY = Infinity;

    // First pass: find min coordinates
    for (const cmd of commands) {
      const type = cmd[0].toUpperCase();
      const args = cmd.slice(1).trim().split(/[\s,]+/).filter(s => s).map(parseFloat);

      if (type === 'M' || type === 'L') {
        if (args[0] < minX) minX = args[0];
        if (args[1] < minY) minY = args[1];
      } else if (type === 'Q' && args.length >= 4) {
        if (args[2] < minX) minX = args[2];
        if (args[3] < minY) minY = args[3];
      }
    }

    // Calculate anchor point: refX/refY are in viewBox coordinates (0 to width/height)
    // Map to path coordinates
    const anchorX = minX + (refX / width) * width;
    const anchorY = minY + (refY / height) * height;

    for (const cmd of commands) {
      const type = cmd[0].toUpperCase();
      const args = cmd.slice(1).trim().split(/[\s,]+/).filter(s => s).map(parseFloat);

      switch (type) {
        case 'M': // Move to
          if (currentPolygon.length > 0) {
            polygons.push(currentPolygon);
            currentPolygon = [];
          }
          // Translate so anchor point is at origin, then scale
          currentX = (args[0] - anchorX) * scale;
          currentY = (args[1] - anchorY) * scale;
          currentPolygon.push({ x: currentX, y: currentY });
          break;

        case 'L': // Line to
          currentX = (args[0] - anchorX) * scale;
          currentY = (args[1] - anchorY) * scale;
          currentPolygon.push({ x: currentX, y: currentY });
          break;

        case 'H': // Horizontal line
          currentX = (args[0] - anchorX) * scale;
          currentPolygon.push({ x: currentX, y: currentY });
          break;

        case 'V': // Vertical line
          currentY = (args[0] - anchorY) * scale;
          currentPolygon.push({ x: currentX, y: currentY });
          break;

        case 'Q': // Quadratic curve - approximate with endpoint
          if (args.length >= 4) {
            currentX = (args[2] - anchorX) * scale;
            currentY = (args[3] - anchorY) * scale;
            currentPolygon.push({ x: currentX, y: currentY });
          }
          break;

        case 'A': // Arc - approximate with endpoint
          if (args.length >= 7) {
            currentX = (args[5] - anchorX) * scale;
            currentY = (args[6] - anchorY) * scale;
            currentPolygon.push({ x: currentX, y: currentY });
          }
          break;

        case 'Z': // Close path
          if (currentPolygon.length > 0) {
            polygons.push(currentPolygon);
            currentPolygon = [];
          }
          break;
      }
    }

    // Add any remaining polygon
    if (currentPolygon.length > 0) {
      polygons.push(currentPolygon);
    }

    return polygons;
  }

  private renderMarker(x: number, y: number, angle: number, config: MarkerConfig): void {
    const size = config.size ?? 10;
    const color = config.color ?? '#000000';

    // Calculate rotated points for the marker (relative to origin)
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Returns relative coordinates (polygon will add x,y)
    const rotatePoint = (px: number, py: number): Point => ({
      x: px * cos - py * sin,
      y: px * sin + py * cos,
    });

    if (isCustomMarker(config.type)) {
      // Render custom marker using SVG path
      const customMarker = config.type as CustomMarker;
      const scale = size / Math.max(customMarker.width, customMarker.height);

      // Parse SVG path to polygons
      const polygons = this.parseSvgPathToPoints(
        customMarker.path,
        scale,
        customMarker.refX,
        customMarker.refY,
        customMarker.width,
        customMarker.height
      );

      // Render each polygon (rotated) using lines since polygon fill has issues
      for (const polygon of polygons) {
        if (polygon.length >= 2) {
          const rotatedPoints = polygon.map(p => rotatePoint(p.x, p.y));
          const strokeWidth = Math.max(2, size / 4);

          // Draw lines connecting all points
          for (let i = 0; i < rotatedPoints.length; i++) {
            const p1 = rotatedPoints[i];
            const p2 = rotatedPoints[(i + 1) % rotatedPoints.length];
            this.line(x + p1.x, y + p1.y, x + p2.x, y + p2.y, { strokeColor: color, strokeWidth })
              .withId(`marker-line-${Date.now()}-${Math.random()}`);
          }
        }
      }
      return;
    }

    const markerType = config.type as BuiltInMarkerType;

    switch (markerType) {
      case 'arrow': {
        // Solid triangle arrow pointing in direction of angle
        // Use lines to draw filled arrow (polygons have rendering issues)
        const tip = rotatePoint(0, 0);
        const backLeft = rotatePoint(-size, -size / 2);
        const backRight = rotatePoint(-size, size / 2);
        // Draw as three lines forming triangle, with thick stroke
        const strokeWidth = Math.max(2, size / 3);
        this.line(x + tip.x, y + tip.y, x + backLeft.x, y + backLeft.y, { strokeColor: color, strokeWidth })
          .withId(`marker-${Date.now()}-${Math.random()}`);
        this.line(x + backLeft.x, y + backLeft.y, x + backRight.x, y + backRight.y, { strokeColor: color, strokeWidth })
          .withId(`marker-${Date.now()}-${Math.random()}`);
        this.line(x + backRight.x, y + backRight.y, x + tip.x, y + tip.y, { strokeColor: color, strokeWidth })
          .withId(`marker-${Date.now()}-${Math.random()}`);
        break;
      }
      case 'circle': {
        // Position circle so its edge touches the line endpoint
        const cx = x - cos * size / 2;
        const cy = y - sin * size / 2;
        this.circle(cx, cy, size / 2, { fillColor: color }).withId(`marker-${Date.now()}-${Math.random()}`);
        break;
      }
      case 'square': {
        const halfSize = size / 2;
        const points = [
          rotatePoint(-size, -halfSize),
          rotatePoint(0, -halfSize),
          rotatePoint(0, halfSize),
          rotatePoint(-size, halfSize),
        ];
        this.polygon(x, y, points, { fillColor: color }).withId(`marker-${Date.now()}-${Math.random()}`);
        break;
      }
      case 'triangle': {
        // Use lines to draw filled triangle (polygons have rendering issues)
        const p1 = rotatePoint(0, 0);
        const p2 = rotatePoint(-size, size / 2);
        const p3 = rotatePoint(-size / 2, -size / 2);
        const strokeWidth = Math.max(2, size / 3);
        this.line(x + p1.x, y + p1.y, x + p2.x, y + p2.y, { strokeColor: color, strokeWidth })
          .withId(`marker-${Date.now()}-${Math.random()}`);
        this.line(x + p2.x, y + p2.y, x + p3.x, y + p3.y, { strokeColor: color, strokeWidth })
          .withId(`marker-${Date.now()}-${Math.random()}`);
        this.line(x + p3.x, y + p3.y, x + p1.x, y + p1.y, { strokeColor: color, strokeWidth })
          .withId(`marker-${Date.now()}-${Math.random()}`);
        break;
      }
      case 'diamond': {
        // Use lines to draw diamond (polygons have rendering issues with non-axis-aligned shapes)
        const p1 = rotatePoint(0, 0);
        const p2 = rotatePoint(-size / 2, size / 2);
        const p3 = rotatePoint(-size, 0);
        const p4 = rotatePoint(-size / 2, -size / 2);
        const strokeWidth = Math.max(2, size / 3);
        this.line(x + p1.x, y + p1.y, x + p2.x, y + p2.y, { strokeColor: color, strokeWidth })
          .withId(`marker-${Date.now()}-${Math.random()}`);
        this.line(x + p2.x, y + p2.y, x + p3.x, y + p3.y, { strokeColor: color, strokeWidth })
          .withId(`marker-${Date.now()}-${Math.random()}`);
        this.line(x + p3.x, y + p3.y, x + p4.x, y + p4.y, { strokeColor: color, strokeWidth })
          .withId(`marker-${Date.now()}-${Math.random()}`);
        this.line(x + p4.x, y + p4.y, x + p1.x, y + p1.y, { strokeColor: color, strokeWidth })
          .withId(`marker-${Date.now()}-${Math.random()}`);
        break;
      }
      case 'bar': {
        const points = [
          rotatePoint(-size / 4, -size / 2),
          rotatePoint(size / 4, -size / 2),
          rotatePoint(size / 4, size / 2),
          rotatePoint(-size / 4, size / 2),
        ];
        this.polygon(x, y, points, { fillColor: color }).withId(`marker-${Date.now()}-${Math.random()}`);
        break;
      }
    }
  }

  /**
   * Refresh all bindings - re-evaluates binding functions and updates primitives
   * Only iterates primitives that actually have bindings
   */
  refreshBindings(): void {
    for (const primitive of this.allPrimitives) {
      // Skip primitives with no bindings (fast check)
      if (!primitive.hasAnyBinding()) continue;
      // Refresh position bindings
      const posBinding = primitive.getPositionBinding();
      if (posBinding) {
        const pos = posBinding.evaluate();
        primitive.updatePosition(pos);
      }

      // Handle line endpoint bindings specifically (with change detection)
      if (primitive instanceof CosyneLine) {
        const endBinding = primitive.getEndpointBinding();
        if (endBinding) {
          const endpoints = endBinding.evaluate();
          const current = primitive.getEndpoints();
          if (endpoints.x1 !== current.x1 || endpoints.y1 !== current.y1 ||
              endpoints.x2 !== current.x2 || endpoints.y2 !== current.y2) {
            primitive.updateEndpoints(endpoints);
          }
        }
      }

      // Refresh fill color bindings
      const fillBinding = primitive.getFillBinding();
      if (fillBinding) {
        const color = fillBinding.evaluate();
        primitive.updateFill(color);
      }

      // Refresh stroke color bindings (with change detection)
      const strokeBinding = primitive.getStrokeBinding();
      if (strokeBinding) {
        const color = strokeBinding.evaluate();
        const currentStroke = primitive.getStrokeColor();
        if (color !== currentStroke) {
          primitive.updateStroke(color);
        }
      }

      // Refresh alpha bindings
      const alphaBinding = primitive.getAlphaBinding();
      if (alphaBinding) {
        const alpha = alphaBinding.evaluate();
        primitive.updateAlpha(alpha);
      }

      // Refresh blend mode bindings
      const blendModeBinding = primitive.getBlendModeBinding();
      if (blendModeBinding) {
        const mode = blendModeBinding.evaluate();
        primitive.updateBlendMode(mode);
      }

      // Refresh visibility bindings
      const visBinding = primitive.getVisibleBinding();
      if (visBinding) {
        const visible = visBinding.evaluate();
        primitive.updateVisibility(visible);
      }

      // Handle gauge value bindings specifically
      if (primitive instanceof CosyneGauge) {
        const valueBinding = primitive.getValueBinding();
        if (valueBinding) {
          const value = valueBinding.evaluate();
          primitive.setValue(value);
          // Also update the underlying canvas gauge
          if (primitive.getUnderlying()?.update) {
            primitive.getUnderlying().update({ value });
          }
        }
      }

      // Handle dial value bindings
      if (primitive instanceof CosyneDial) {
        const valueBinding = primitive.getValueBinding();
        if (valueBinding) {
          const value = valueBinding.evaluate();
          primitive.setValue(value);
        }
      }

      // Handle spherical patch Y-axis rotation bindings
      if (primitive instanceof CosyneSphericalPatch) {
        const rotBinding = primitive.getYAxisRotationBinding();
        if (rotBinding) {
          const rotation = rotBinding.evaluate();
          primitive.updateRotationValue(rotation);
        }
      }

      // Handle text content bindings
      if (primitive instanceof CosyneText) {
        const textBinding = primitive.getTextBinding();
        if (textBinding) {
          const text = textBinding.evaluate();
          primitive.updateText(text);
        }
      }
    }
  }

  /**
   * Get a primitive by ID
   */
  getPrimitiveById(id: string): Primitive<any> | undefined {
    // Search through all primitives for the matching ID
    // (IDs can be set after primitive creation via withId())
    return this.allPrimitives.find(p => p.getId() === id);
  }

  /**
   * Get all primitives of a specific type
   */
  getPrimitivesByType<T extends Primitive<any>>(type: typeof CosyneCircle | typeof CosyneRect | typeof CosyneLine): T[] {
    return this.allPrimitives.filter(p => p instanceof type) as T[];
  }

  /**
   * Get all primitives
   */
  getAllPrimitives(): Primitive<any>[] {
    return [...this.allPrimitives];
  }

  /**
   * Clear all primitives and bindings
   */
  clear(): void {
    this.allPrimitives = [];
    this.primitives.clear();
    this.bindingRegistry.clear();
  }

  /**
   * Create a text primitive at specified canvas coordinates
   */
  text(x: number, y: number, text: string, options?: any): CosyneText {
    // Apply current transform to position
    const [tx, ty] = this.applyTransform(x, y);

    // Create the underlying Tsyne canvas text with x,y positioning
    const underlying = this.app.canvasText(text, {
      x: tx,
      y: ty,
      color: options?.fillColor || 'black',
      textSize: options?.fontSize || 12,
    });

    const primitive = new CosyneText(tx, ty, text, underlying, {
      ...options,
      animationManager: this.animationManager,
    });
    this.trackPrimitive(primitive);
    return primitive;
  }

  /**
   * Create a path primitive
   */
  path(pathString: string, options?: any): CosynePath {
    // Create the underlying Tsyne canvas path
    // CanvasPath requires width/height - use the max extent of the path coordinates
    // since path commands use absolute coordinates
    const bounds = this.computePathBounds(pathString);
    // Use max coordinate + margin to ensure path fits, or explicit options
    const width = options?.width || Math.max(bounds.minX + bounds.width + 10, 500);
    const height = options?.height || Math.max(bounds.minY + bounds.height + 10, 500);

    const underlying = this.app.canvasPath({
      path: pathString,
      width,
      height,
      fillColor: options?.fillColor || 'black',
      strokeColor: options?.strokeColor,
      strokeWidth: options?.strokeWidth || 1,
    });

    const primitive = new CosynePath(pathString, underlying, {
      ...options,
      animationManager: this.animationManager,
    });
    this.trackPrimitive(primitive);
    return primitive;
  }

  /**
   * Create an arc primitive
   */
  arc(x: number, y: number, radius: number, options?: any): CosyneArc {
    // Apply current transform to center
    const [tx, ty] = this.applyTransform(x, y);

    // Create the underlying Tsyne canvas arc
    const underlying = this.app.canvasArc({
      x: tx,
      y: ty,
      radius,
      startAngle: options?.startAngle || 0,
      endAngle: options?.endAngle || Math.PI / 2,
      fillColor: options?.fillColor || 'black',
      strokeColor: options?.strokeColor,
      strokeWidth: options?.strokeWidth || 1,
    });

    const primitive = new CosyneArc(tx, ty, radius, underlying, {
      ...options,
      animationManager: this.animationManager,
    });
    this.trackPrimitive(primitive);
    return primitive;
  }

  /**
   * Create a wedge primitive
   */
  wedge(x: number, y: number, radius: number, options?: any): CosyneWedge {
    // Apply current transform to center
    const [tx, ty] = this.applyTransform(x, y);

    // Create the underlying Tsyne canvas wedge
    const underlying = this.app.canvasWedge({
      x: tx,
      y: ty,
      radius,
      startAngle: options?.startAngle || 0,
      endAngle: options?.endAngle || Math.PI / 2,
      fillColor: options?.fillColor || 'black',
      strokeColor: options?.strokeColor,
      strokeWidth: options?.strokeWidth || 1,
    });

    const primitive = new CosyneWedge(tx, ty, radius, underlying, {
      ...options,
      animationManager: this.animationManager,
    });
    this.trackPrimitive(primitive);
    return primitive;
  }

  /**
   * Create a grid primitive (Phase 7)
   */
  grid(x: number, y: number, options?: GridOptions): CosyneGrid {
    // Apply current transform to origin
    const [tx, ty] = this.applyTransform(x, y);

    const underlying = this.app.canvasGrid({
      x: tx,
      y: ty,
      rows: options?.rows || 5,
      cols: options?.cols || 5,
      cellWidth: options?.cellWidth || 40,
      cellHeight: options?.cellHeight || 30,
      gridColor: options?.gridColor || '#cccccc',
      gridWidth: options?.gridWidth || 1,
    });

    const primitive = new CosyneGrid(tx, ty, underlying, {
      ...options,
      animationManager: this.animationManager,
    });
    this.trackPrimitive(primitive);
    return primitive;
  }

  /**
   * Create a heatmap primitive (Phase 7)
   */
  heatmap(x: number, y: number, options?: HeatmapOptions): CosyneHeatmap {
    // Apply current transform to origin
    const [tx, ty] = this.applyTransform(x, y);

    const underlying = this.app.canvasHeatmap({
      x: tx,
      y: ty,
      cellWidth: options?.cellWidth || 30,
      cellHeight: options?.cellHeight || 30,
      colorScheme: options?.colorScheme || 'viridis',
      minValue: options?.minValue || 0,
      maxValue: options?.maxValue || 1,
    });

    const primitive = new CosyneHeatmap(tx, ty, underlying, {
      ...options,
      animationManager: this.animationManager,
    });
    this.trackPrimitive(primitive);
    return primitive;
  }

  /**
   * Create a polygon primitive (Phase 7)
   */
  polygon(x: number, y: number, vertices: Point[], options?: PolygonOptions): CosynePolygon {
    // Apply current transform to origin
    const [tx, ty] = this.applyTransform(x, y);

    // Transform relative vertices to absolute points using transformed origin
    const points = vertices.map(v => ({ x: tx + v.x, y: ty + v.y }));
    const underlying = this.app.canvasPolygon({
      points,
      fillColor: options?.fillColor || 'black',
      strokeColor: options?.strokeColor,
      strokeWidth: options?.strokeWidth || 1,
    });

    const primitive = new CosynePolygon(tx, ty, vertices, underlying, {
      ...options,
      animationManager: this.animationManager,
    });
    this.trackPrimitive(primitive);
    return primitive;
  }

  /**
   * Create a star primitive (Phase 7)
   */
  star(x: number, y: number, options?: StarOptions): CosyneStar {
    // Apply current transform to center
    const [tx, ty] = this.applyTransform(x, y);

    const underlying = this.app.canvasStar({
      x: tx,
      y: ty,
      points: options?.points || 5,
      innerRadius: options?.innerRadius || 10,
      outerRadius: options?.outerRadius || 20,
      fillColor: options?.fillColor || 'gold',
      strokeColor: options?.strokeColor,
      strokeWidth: options?.strokeWidth || 1,
    });

    const primitive = new CosyneStar(tx, ty, underlying, {
      ...options,
      animationManager: this.animationManager,
    });
    this.trackPrimitive(primitive);
    return primitive;
  }

  /**
   * Create a gauge primitive (Phase 7)
   * Note: x, y are stored for Cosyne but CanvasGauge auto-centers based on radius
   */
  gauge(x: number, y: number, options?: GaugeOptions): CosyneGauge {
    // Apply current transform to position (stored on primitive, gauge auto-centers)
    const [tx, ty] = this.applyTransform(x, y);

    const radius = options?.radius || 50;
    const underlying = this.app.canvasGauge({
      // Let CanvasGauge auto-center based on radius
      minValue: options?.minValue || 0,
      maxValue: options?.maxValue || 100,
      value: options?.value || 50,
      radius,
      trackColor: options?.fillColor || '#e0e0e0',
      valueColor: (options as any)?.valueColor,  // Pass through custom color
      needleColor: options?.strokeColor || '#333333',
      showValue: (options as any)?.showValue,  // Pass through showValue option
      // Convert degrees to radians for CanvasGauge
      startAngle: ((options?.startAngle ?? 225) * Math.PI) / 180,
      endAngle: ((options?.endAngle ?? 315) * Math.PI) / 180,
    });

    const primitive = new CosyneGauge(tx, ty, underlying, {
      ...options,
      animationManager: this.animationManager,
    });
    this.trackPrimitive(primitive);
    return primitive;
  }

  /**
   * Create a dial primitive - interactive rotary knob control
   * Supports multiple styles, tick marks, value binding, and drag interaction
   *
   * @example
   * ```typescript
   * c.dial(100, 100, {
   *   minValue: 0,
   *   maxValue: 100,
   *   value: 50,
   *   style: 'vintage',
   *   showTicks: true,
   *   onValueChange: (v) => console.log('Value:', v),
   * }).withId('volume-dial');
   * ```
   */
  dial(x: number, y: number, options?: DialOptions): CosyneDial {
    const radius = options?.radius ?? 40;

    // Create a mock underlying widget for Cosyne-only rendering
    // Dial is rendered via Cosyne canvas primitives, not a native widget
    const underlying = {
      update: (_data: any) => {
        // Dial updates are handled by Cosyne refresh cycle
      },
    };

    const primitive = new CosyneDial(x, y, underlying, {
      ...options,
      animationManager: this.animationManager,
    });
    this.trackPrimitive(primitive);

    // Render the dial using canvas primitives
    this.renderDial(primitive);

    return primitive;
  }

  /**
   * Render a dial primitive using canvas primitives with bindings for interactivity
   */
  private renderDial(dial: CosyneDial): void {
    const initialData = dial.getRenderData();
    const { x, y, radius, knobRadius, trackWidth, startAngle, endAngle } = initialData;
    const trackRadius = radius - trackWidth / 2;
    const segments = 32;
    const angleRange = endAngle - startAngle;

    // Draw arc segments with color bindings that switch between track and accent color
    // All visual components are passthrough so the dial itself handles hit testing
    for (let i = 0; i < segments; i++) {
      const segmentStartAngle = startAngle + (i / segments) * angleRange;
      const segmentEndAngle = startAngle + ((i + 1) / segments) * angleRange;
      const segmentMidAngle = (segmentStartAngle + segmentEndAngle) / 2;

      const x1 = x + Math.cos(segmentStartAngle) * trackRadius;
      const y1 = y + Math.sin(segmentStartAngle) * trackRadius;
      const x2 = x + Math.cos(segmentEndAngle) * trackRadius;
      const y2 = y + Math.sin(segmentEndAngle) * trackRadius;

      // Create line with stroke binding that checks if this segment is in the value range
      this.line(x1, y1, x2, y2, { strokeWidth: trackWidth })
        .passthrough()
        .bindStroke(() => {
          const data = dial.getRenderData();
          // Segment is "filled" if its midpoint is before the value angle
          return segmentMidAngle <= data.valueAngle ? data.accentColor : data.trackColor;
        });
    }

    // Draw tick marks (static - they don't change)
    if (initialData.showTicks) {
      for (const tick of initialData.ticks) {
        this.line(tick.x1, tick.y1, tick.x2, tick.y2, {
          strokeColor: initialData.tickColor,
          strokeWidth: tick.isMajor ? 2 : 1,
        }).passthrough();
      }
    }

    // Draw center knob (static) - passthrough for events
    this.circle(x, y, knobRadius).fill(initialData.knobColor).stroke(initialData.trackColor, 1).passthrough();

    // Draw indicator line with endpoint binding for dynamic position
    const indicatorStartRadius = knobRadius * 0.5;
    const indicatorEndRadius = radius - trackWidth - 4;
    this.line(x, y, x, y, { strokeColor: initialData.indicatorColor, strokeWidth: 3 })
      .passthrough()
      .bindEndpoint(() => {
        const data = dial.getRenderData();
        const angle = data.valueAngle;
        return {
          x1: x + Math.cos(angle) * indicatorStartRadius,
          y1: y + Math.sin(angle) * indicatorStartRadius,
          x2: x + Math.cos(angle) * indicatorEndRadius,
          y2: y + Math.sin(angle) * indicatorEndRadius,
        };
      });

    // Draw value text with binding for dynamic value display
    if (initialData.showValue) {
      this.text(x, y + radius + 15, initialData.formattedValue, {
        alignment: 'center',
        size: 11,
        color: initialData.textColor,
      }).passthrough().bindText(() => dial.getRenderData().formattedValue);
    }
  }

  /**
   * Create a spherical patch primitive (for Amiga Boing Ball style spheres)
   * A spherical patch is a curved quadrilateral on a sphere surface bounded by lat/lon lines
   */
  sphericalPatch(cx: number, cy: number, radius: number, options: SphericalPatchOptions): CosyneSphericalPatch {
    const underlying = this.app.canvasSphericalPatch({
      cx,
      cy,
      radius,
      latStart: options.latStart,
      latEnd: options.latEnd,
      lonStart: options.lonStart,
      lonEnd: options.lonEnd,
      rotation: options.rotation ?? 0,
      fillColor: options.fillColor || 'red',
    });

    const primitive = new CosyneSphericalPatch(cx, cy, radius, underlying, {
      ...options,
      animationManager: this.animationManager,
    });
    this.trackPrimitive(primitive);
    return primitive;
  }

  /**
   * Create a collection builder for circles
   */
  circles(): CirclesCollection {
    return new CirclesCollection(this);
  }

  /**
   * Create a collection builder for rectangles
   */
  rects(): RectsCollection {
    return new RectsCollection(this);
  }

  /**
   * Create a collection builder for lines
   */
  lines(): LinesCollection {
    return new LinesCollection(this);
  }

  /**
   * Apply a transform to nested content
   */
  transform(options: TransformOptions, builder: (ctx: CosyneContext) => void): this {
    this.transformStack.push(options);
    builder(this);
    this.transformStack.pop();
    return this;
  }

  /**
   * Get current transform stack
   */
  getTransformStack(): TransformStack {
    return this.transformStack;
  }

  /**
   * Embed a Tsyne widget at canvas coordinates
   */
  foreign(x: number, y: number, builder: (app: any) => void, options?: any): ForeignObject {
    const foreign = new ForeignObject(x, y, builder, this.app, options);
    this.foreignObjects.add(foreign);
    return foreign;
  }

  /**
   * Get foreign object by ID
   */
  getForeignById(id: string): ForeignObject | undefined {
    return this.foreignObjects.getById(id);
  }

  /**
   * Get all foreign objects
   */
  getAllForeignObjects(): ForeignObject[] {
    return this.foreignObjects.getAll();
  }

  /**
   * Internal: Track a primitive for later lookup and binding management
   */
  private trackPrimitive(primitive: Primitive<any>): void {
    this.allPrimitives.push(primitive);
    const id = primitive.getId();
    if (id) {
      this.primitives.set(id, primitive);
    }
  }

}

/**
 * Factory function to create a Cosyne context within a Tsyne canvasStack
 *
 * Usage:
 * ```typescript
 * a.canvasStack(() => {
 *   cosyne(a, (c) => {
 *     c.circle(100, 100, 20).fill('#ff0000');
 *     c.rect(50, 50, 100, 80).fill('#0000ff');
 *   });
 * });
 * ```
 */

// Global registry of Cosyne contexts
let contextRegistry: CosyneContext[] = [];

export function cosyne(app: any, builder: (context: CosyneContext) => void, container?: any): CosyneContext {
  const context = new CosyneContext(app);
  context.setBuilder(builder);
  if (container) {
    context.setContainer(container);
  }
  // Get current container ID from context (set by CanvasStack constructor)
  if (!container && app?.ctx?.getCurrentContainerId) {
    const containerId = app.ctx.getCurrentContainerId();
    if (containerId) {
      context.setContainerId(containerId);
    }
  }
  registerCosyneContext(context);
  builder(context);
  // Render markers for all lines after builder completes
  context.renderLineMarkers();
  // Immediately evaluate all bindings to ensure initial state is rendered correctly
  context.refreshBindings();
  return context;
}

/**
 * Register a Cosyne context in the global registry
 * Allows external code to refresh bindings
 */
export function registerCosyneContext(context: CosyneContext): void {
  contextRegistry.push(context);
}

/**
 * Refresh all registered Cosyne contexts
 * Call this after updating state to propagate changes through bindings
 * Note: This only updates existing primitives. Use rebuildAllCosyneContexts()
 * if you need to create different primitives based on new state.
 */
let refreshPending = false;
let lastRefreshTime = 0;

export function refreshAllCosyneContexts(): void {
  // Throttle: skip if refresh is pending or was done very recently
  const now = performance.now();
  if (refreshPending || (now - lastRefreshTime) < 16) { // ~60fps max
    return;
  }

  refreshPending = true;
  lastRefreshTime = now;

  // Use requestAnimationFrame-style scheduling via setImmediate/setTimeout
  setTimeout(() => {
    const start = performance.now();
    for (const context of contextRegistry) {
      context.refreshBindings();
    }
    const elapsed = performance.now() - start;
    if (elapsed > 10) {
      console.log(`[refreshAllCosyneContexts] took ${elapsed.toFixed(1)}ms`);
    }
    refreshPending = false;
  }, 0);
}

/**
 * Rebuild all registered Cosyne contexts from scratch
 * Call this when state changes require creating different primitives
 * (e.g., switching between different visualization modes)
 */
export function rebuildAllCosyneContexts(): void {
  for (const context of contextRegistry) {
    context.rebuild();
  }
}

/**
 * Clear all registered Cosyne contexts
 * Useful for cleanup or testing
 */
export function clearAllCosyneContexts(): void {
  contextRegistry = [];
}
