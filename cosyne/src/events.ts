/**
 * Event handling and routing for Cosyne primitives
 *
 * Implements hit testing, event routing, and dispatch
 */

import { Primitive } from './primitives/base';

/**
 * Hit test function - determines if a point is within/on a primitive
 */
export type HitTester = (x: number, y: number) => boolean;

/**
 * Result of hit testing at a point
 */
export interface HitTestResult {
  primitive: Primitive<any>;
  x: number;
  y: number;
}

/**
 * Tracking state for mouse hover
 */
interface HoverState {
  primitive: Primitive<any>;
  x: number;
  y: number;
}

/**
 * Tracking state for drag
 */
interface DragState {
  primitive: Primitive<any>;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

/**
 * Hit testers for different primitive types
 * Each function returns true if point (x, y) is inside/on the shape
 */
export const DefaultHitTesters = {
  /**
   * Circle hit test: distance from center <= radius (boundary is inside)
   */
  circle: (x: number, y: number, cx: number, cy: number, radius: number): boolean => {
    const dx = x - cx;
    const dy = y - cy;
    return Math.sqrt(dx * dx + dy * dy) <= radius;
  },

  /**
   * Rectangle hit test: point in bounding box (with stroke width padding)
   */
  rect: (x: number, y: number, x1: number, y1: number, x2: number, y2: number, strokeWidth: number = 1): boolean => {
    const padding = strokeWidth / 2;
    return x >= x1 - padding && x <= x2 + padding && y >= y1 - padding && y <= y2 + padding;
  },

  /**
   * Line hit test: distance from line segment <= stroke width / 2
   */
  line: (x: number, y: number, x1: number, y1: number, x2: number, y2: number, strokeWidth: number = 1): boolean => {
    const tolerance = Math.max(strokeWidth / 2, 5); // At least 5px tolerance for easier clicking
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      // Line is a point
      const pdx = x - x1;
      const pdy = y - y1;
      return Math.sqrt(pdx * pdx + pdy * pdy) <= tolerance;
    }

    // t is the parameter of the closest point on the line segment [0, 1]
    let t = ((x - x1) * dx + (y - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    // Closest point on the line segment
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    // Distance from point to line
    const pdx = x - closestX;
    const pdy = y - closestY;
    return Math.sqrt(pdx * pdx + pdy * pdy) <= tolerance;
  },

  /**
   * Polygon hit test: point-in-polygon using ray casting
   */
  polygon: (x: number, y: number, vertices: Array<{ x: number; y: number }>): boolean => {
    if (vertices.length < 3) return false;

    let inside = false;
    let j = vertices.length - 1;

    for (let i = 0; i < vertices.length; i++) {
      const xi = vertices[i].x;
      const yi = vertices[i].y;
      const xj = vertices[j].x;
      const yj = vertices[j].y;

      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;

      j = i;
    }

    return inside;
  },

  /**
   * Arc/Wedge hit test: radial distance and angle
   */
  arc: (
    x: number,
    y: number,
    cx: number,
    cy: number,
    innerRadius: number,
    outerRadius: number,
    startAngle: number,
    endAngle: number
  ): boolean => {
    const dx = x - cx;
    const dy = y - cy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < innerRadius || distance > outerRadius) {
      return false;
    }

    // Normalize angles to [0, 2π)
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += Math.PI * 2;

    // Normalize start and end angles
    let start = startAngle % (Math.PI * 2);
    let end = endAngle % (Math.PI * 2);
    if (start < 0) start += Math.PI * 2;
    if (end < 0) end += Math.PI * 2;

    // Handle angle range
    if (start <= end) {
      return angle >= start && angle <= end;
    } else {
      // Wraps around 0°
      return angle >= start || angle <= end;
    }
  },
};

/**
 * Router for dispatching events to primitives based on hit testing
 */
export class EventRouter {
  private hoverState: HoverState | undefined;
  private dragState: DragState | undefined;
  private hitTesters: Map<Primitive<any>, HitTester> = new Map();

  constructor() {}

  /**
   * Check if a drag operation is currently in progress
   */
  isDragging(): boolean {
    return this.dragState !== undefined;
  }

  /**
   * Register a hit tester for a primitive
   * Used for custom hit detection (e.g., more efficient tests)
   */
  registerHitTester(primitive: Primitive<any>, tester: HitTester): void {
    this.hitTesters.set(primitive, tester);
  }

  /**
   * Test if a point hits a primitive
   * Uses registered tester if available, otherwise returns false
   */
  testHit(primitive: Primitive<any>, x: number, y: number): boolean {
    const tester = this.hitTesters.get(primitive);
    return tester ? tester(x, y) : false;
  }

  /**
   * Find all primitives that contain the point (in reverse order for proper z-ordering)
   * Skips passthrough primitives (they don't participate in hit testing)
   */
  hitTestAll(primitives: Primitive<any>[], x: number, y: number): Primitive<any>[] {
    const results: Primitive<any>[] = [];

    // Test in reverse order (last added = topmost)
    for (let i = primitives.length - 1; i >= 0; i--) {
      const primitive = primitives[i];
      // Skip passthrough primitives - they don't intercept events
      if (primitive.isPassthroughEnabled()) {
        continue;
      }
      if (this.testHit(primitive, x, y)) {
        results.push(primitive);
      }
    }

    return results;
  }

  /**
   * Get the topmost primitive at the point (if any)
   */
  hitTestTop(primitives: Primitive<any>[], x: number, y: number): Primitive<any> | undefined {
    const hits = this.hitTestAll(primitives, x, y);
    return hits.length > 0 ? hits[0] : undefined;
  }

  /**
   * Handle mouse move event
   */
  async handleMouseMove(primitives: Primitive<any>[], x: number, y: number): Promise<void> {
    const topHit = this.hitTestTop(primitives, x, y);

    // Handle mouse leave for previously hovered primitive
    if (this.hoverState && this.hoverState.primitive !== topHit) {
      const leaveHandler = this.hoverState.primitive.getMouseLeaveHandler();
      if (leaveHandler) {
        leaveHandler();
      }
    }

    // Handle mouse enter for newly hovered primitive
    if (topHit && topHit !== this.hoverState?.primitive) {
      const enterHandler = topHit.getMouseEnterHandler();
      if (enterHandler) {
        enterHandler({ x, y });
      }
    }

    // Update hover state
    if (topHit) {
      this.hoverState = { primitive: topHit, x, y };

      // Fire mouse move handler
      const moveHandler = topHit.getMouseMoveHandler();
      if (moveHandler) {
        moveHandler({ x, y });
      }
    } else {
      this.hoverState = undefined;
    }

    // Handle drag movement
    if (this.dragState) {
      const deltaX = x - this.dragState.currentX;
      const deltaY = y - this.dragState.currentY;

      const dragHandler = this.dragState.primitive.getDragHandler();
      console.log(`[EventRouter.handleMouseMove] dragState exists, primitive=${(this.dragState.primitive as any)._id || this.dragState.primitive.constructor.name}, hasDragHandler=${!!dragHandler}, pos=(${x}, ${y}), delta=(${deltaX.toFixed(2)}, ${deltaY.toFixed(2)})`);
      if (dragHandler) {
        dragHandler({ x, y, deltaX, deltaY });
      }

      this.dragState.currentX = x;
      this.dragState.currentY = y;
    }
  }

  /**
   * Handle click/tap event
   */
  async handleClick(primitives: Primitive<any>[], x: number, y: number): Promise<void> {
    const topHit = this.hitTestTop(primitives, x, y);

    if (topHit) {
      const clickHandler = topHit.getClickHandler();
      if (clickHandler) {
        await clickHandler({ x, y });
      }
    }
  }

  /**
   * Handle drag start event
   */
  handleDragStart(primitives: Primitive<any>[], x: number, y: number): void {
    console.log(`[EventRouter.handleDragStart] at (${x}, ${y}), testing ${primitives.length} primitives`);
    const topHit = this.hitTestTop(primitives, x, y);
    console.log(`[EventRouter.handleDragStart] topHit: ${topHit ? (topHit as any)._id || topHit.constructor.name : 'null'}`);

    if (topHit) {
      const dragStartHandler = topHit.getDragStartHandler();
      console.log(`[EventRouter.handleDragStart] has dragStartHandler: ${!!dragStartHandler}`);
      if (dragStartHandler) {
        dragStartHandler({ x, y });
      }

      // Only start drag if there's a drag handler or drag end handler
      const hasDragHandler = topHit.getDragHandler() || topHit.getDragEndHandler();
      console.log(`[EventRouter.handleDragStart] has drag/dragEnd handler: ${!!hasDragHandler}`);
      if (hasDragHandler) {
        this.dragState = {
          primitive: topHit,
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
        };
        console.log(`[EventRouter.handleDragStart] dragState set`);
      }
    } else {
      console.log(`[EventRouter.handleDragStart] No hit at (${x}, ${y})`);
    }
  }

  /**
   * Handle drag end event
   */
  handleDragEnd(): void {
    if (this.dragState) {
      const dragEndHandler = this.dragState.primitive.getDragEndHandler();
      if (dragEndHandler) {
        dragEndHandler();
      }

      this.dragState = undefined;
    }
  }

  /**
   * Clear all state (call when context is destroyed)
   */
  reset(): void {
    this.hoverState = undefined;
    this.dragState = undefined;
    this.hitTesters.clear();
  }
}
