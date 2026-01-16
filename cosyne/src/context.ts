/**
 * Cosyne Context - Main builder for declarative canvas compositions
 *
 * The CosyneContext wraps a Tsyne canvasStack and provides a fluent API
 * for creating and binding canvas primitives.
 */

import { BindingRegistry, PositionBinding } from './binding';
import { CosyneCircle, CircleOptions } from './primitives/circle';
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
import { Primitive } from './primitives/base';
import { CirclesCollection, RectsCollection, LinesCollection } from './collections';
import { TransformStack, TransformOptions } from './transforms';
import { ForeignObject, ForeignObjectCollection } from './foreign';
import { AnimationManager } from './animation-manager';

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

  constructor(private app: any, options?: CosyneContextOptions) {
    this.bindingRegistry = new BindingRegistry();
    this.animationManager = options?.animationManager ?? new AnimationManager();
  }

  /**
   * Get the animation manager for this context
   */
  getAnimationManager(): AnimationManager {
    return this.animationManager;
  }

  /**
   * Create a circle primitive
   */
  circle(x: number, y: number, radius: number, options?: CircleOptions): CosyneCircle {
    // Create the underlying Tsyne canvas circle
    // x, y is the CENTER of the circle, convert to bounding box for Fyne
    const underlying = this.app.canvasCircle({
      x: x - radius,
      y: y - radius,
      x2: x + radius,
      y2: y + radius,
      fillColor: options?.fillColor || 'black',
      strokeColor: options?.strokeColor,
      strokeWidth: options?.strokeWidth || 1,
    });

    const primitive = new CosyneCircle(x, y, radius, underlying, {
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
    // Create the underlying Tsyne canvas rectangle
    const underlying = this.app.canvasRectangle({
      x,
      y,
      x2: x + width,
      y2: y + height,
      fillColor: options?.fillColor || 'black',
      strokeColor: options?.strokeColor,
      strokeWidth: options?.strokeWidth || 1,
    });

    const primitive = new CosyneRect(x, y, width, height, underlying, {
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
    // Create the underlying Tsyne canvas line
    const underlying = this.app.canvasLine(x1, y1, x2, y2, {
      strokeColor: options?.strokeColor || 'black',
      strokeWidth: options?.strokeWidth || 1,
    });

    const primitive = new CosyneLine(x1, y1, x2, y2, underlying, {
      ...options,
      animationManager: this.animationManager,
    });
    this.trackPrimitive(primitive);
    return primitive;
  }

  /**
   * Refresh all bindings - re-evaluates binding functions and updates primitives
   */
  refreshBindings(): void {
    for (const primitive of this.allPrimitives) {
      // Refresh position bindings
      const posBinding = primitive.getPositionBinding();
      if (posBinding) {
        const pos = posBinding.evaluate();
        primitive.updatePosition(pos);
      }

      // Handle line endpoint bindings specifically
      if (primitive instanceof CosyneLine) {
        const endBinding = primitive.getEndpointBinding();
        if (endBinding) {
          const endpoints = endBinding.evaluate();
          primitive.updateEndpoints(endpoints);
        }
      }

      // Refresh fill color bindings
      const fillBinding = primitive.getFillBinding();
      if (fillBinding) {
        const color = fillBinding.evaluate();
        primitive.updateFill(color);
      }

      // Refresh stroke color bindings
      const strokeBinding = primitive.getStrokeBinding();
      if (strokeBinding) {
        const color = strokeBinding.evaluate();
        primitive.updateStroke(color);
      }

      // Refresh alpha bindings
      const alphaBinding = primitive.getAlphaBinding();
      if (alphaBinding) {
        const alpha = alphaBinding.evaluate();
        primitive.updateAlpha(alpha);
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
   * Create a text primitive
   * Note: Tsyne CanvasText doesn't support x,y positioning directly -
   * text is positioned by the canvas stack layout. The x,y here are stored
   * for Cosyne's coordinate system but not passed to the underlying widget.
   */
  text(x: number, y: number, text: string, options?: any): CosyneText {
    // Create the underlying Tsyne canvas text
    // Note: canvasText(text, options) - text is first arg, not in options
    const underlying = this.app.canvasText(text, {
      color: options?.fillColor || 'black',
      textSize: options?.fontSize || 12,
    });

    const primitive = new CosyneText(x, y, text, underlying, {
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
    const underlying = this.app.canvasPath({
      pathString,
      x: options?.x || 0,
      y: options?.y || 0,
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
    // Create the underlying Tsyne canvas arc
    const underlying = this.app.canvasArc({
      x,
      y,
      radius,
      startAngle: options?.startAngle || 0,
      endAngle: options?.endAngle || Math.PI / 2,
      fillColor: options?.fillColor || 'black',
      strokeColor: options?.strokeColor,
      strokeWidth: options?.strokeWidth || 1,
    });

    const primitive = new CosyneArc(x, y, radius, underlying, {
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
    // Create the underlying Tsyne canvas wedge
    const underlying = this.app.canvasWedge({
      x,
      y,
      radius,
      startAngle: options?.startAngle || 0,
      endAngle: options?.endAngle || Math.PI / 2,
      fillColor: options?.fillColor || 'black',
      strokeColor: options?.strokeColor,
      strokeWidth: options?.strokeWidth || 1,
    });

    const primitive = new CosyneWedge(x, y, radius, underlying, {
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
    const underlying = this.app.canvasGrid({
      x,
      y,
      rows: options?.rows || 5,
      cols: options?.cols || 5,
      cellWidth: options?.cellWidth || 40,
      cellHeight: options?.cellHeight || 30,
      gridColor: options?.gridColor || '#cccccc',
      gridWidth: options?.gridWidth || 1,
    });

    const primitive = new CosyneGrid(x, y, underlying, {
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
    const underlying = this.app.canvasHeatmap({
      x,
      y,
      cellWidth: options?.cellWidth || 30,
      cellHeight: options?.cellHeight || 30,
      colorScheme: options?.colorScheme || 'viridis',
      minValue: options?.minValue || 0,
      maxValue: options?.maxValue || 1,
    });

    const primitive = new CosyneHeatmap(x, y, underlying, {
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
    const underlying = this.app.canvasPolygon({
      x,
      y,
      vertices,
      fillColor: options?.fillColor || 'black',
      strokeColor: options?.strokeColor,
      strokeWidth: options?.strokeWidth || 1,
    });

    const primitive = new CosynePolygon(x, y, vertices, underlying, {
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
    const underlying = this.app.canvasStar({
      x,
      y,
      points: options?.points || 5,
      innerRadius: options?.innerRadius || 10,
      outerRadius: options?.outerRadius || 20,
      fillColor: options?.fillColor || 'gold',
      strokeColor: options?.strokeColor,
      strokeWidth: options?.strokeWidth || 1,
    });

    const primitive = new CosyneStar(x, y, underlying, {
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
    });

    const primitive = new CosyneGauge(x, y, underlying, {
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

export function cosyne(app: any, builder: (context: CosyneContext) => void): CosyneContext {
  const context = new CosyneContext(app);
  registerCosyneContext(context);
  builder(context);
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
 */
export function refreshAllCosyneContexts(): void {
  for (const context of contextRegistry) {
    context.refreshBindings();
  }
}

/**
 * Clear all registered Cosyne contexts
 * Useful for cleanup or testing
 */
export function clearAllCosyneContexts(): void {
  contextRegistry = [];
}
