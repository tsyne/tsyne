/**
 * Event router integration for CosyneContext
 *
 * Provides methods to enable interactive event handling for a Cosyne canvas
 */

import { CosyneContext } from './context';
import { EventRouter } from './events';
import { Primitive } from './primitives/base';

/**
 * Options for enabling event handling on a Cosyne context
 */
export interface EventHandlingOptions {
  width: number;
  height: number;
  onEventRouterCreated?: (router: EventRouter) => void;
}

/**
 * Enable event handling for a Cosyne context
 *
 * Creates a TappableCanvasRaster overlay for event capture and wires it to the EventRouter.
 * This allows primitives to respond to clicks, drag, and mouse movement.
 *
 * @param ctx - The CosyneContext to enable events for
 * @param app - The Tsyne app instance
 * @param options - Configuration for event handling
 * @returns The EventRouter instance (for testing/inspection)
 */
export function enableEventHandling(
  ctx: CosyneContext,
  app: any,
  options: EventHandlingOptions
): EventRouter {
  const router = new EventRouter();

  // Get all primitives from context
  const getAllPrimitives = (): Primitive<any>[] => {
    // This will be accessed via a getter method we'll add to CosyneContext
    return (ctx as any).getAllPrimitives?.() || [];
  };

  // Register hit testers for all primitives
  const registerHitTesters = () => {
    const primitives = getAllPrimitives();
    for (const primitive of primitives) {
      const tester = primitive.getHitTester();
      router.registerHitTester(primitive, tester);
    }
  };

  // Track last processed drag position for distance-based throttling
  let lastDragX = 0;
  let lastDragY = 0;
  const DRAG_THRESHOLD = 4; // Minimum pixels moved before processing drag event

  // Create TappableCanvasRaster for event capture
  console.log(`[enableEventHandling] Creating TappableCanvasRaster ${options.width}x${options.height}`);
  const eventCanvas = app.tappableCanvasRaster(options.width, options.height, {
    onTap: async (x: number, y: number) => {
      // Tapped() is only called for quick tap (not drag)
      console.log(`[EventRouter] onTap received at (${x}, ${y})`);
      registerHitTesters();
      await router.handleClick(getAllPrimitives(), x, y);
    },
    onMouseMove: async (x: number, y: number) => {
      registerHitTesters();
      await router.handleMouseMove(getAllPrimitives(), x, y);
    },
    onDrag: (x: number, y: number, deltaX: number, deltaY: number) => {
      // onDrag is called while dragging (Fyne's Dragged event)
      // x, y is the CURRENT position during drag, deltaX/deltaY is the cumulative delta
      registerHitTesters();
      const primitives = getAllPrimitives();

      // Calculate actual position
      const newX = x + deltaX;
      const newY = y + deltaY;

      // Detect drag start on first drag event (use router's state as source of truth)
      if (!router.isDragging()) {
        // Start drag at the CURRENT position (where we are now)
        // The dial will calculate angle from this position
        console.log(`[EventRouter] Drag starting at (${x}, ${y})`);
        router.handleDragStart(primitives, x, y);
        lastDragX = newX;
        lastDragY = newY;
        return;
      }

      // Distance-based throttling: only process if moved at least DRAG_THRESHOLD pixels
      const dx = newX - lastDragX;
      const dy = newY - lastDragY;
      const distSq = dx * dx + dy * dy;
      if (distSq < DRAG_THRESHOLD * DRAG_THRESHOLD) {
        return; // Skip this event - not enough movement
      }

      // Update last position and process
      lastDragX = newX;
      lastDragY = newY;
      router.handleMouseMove(primitives, newX, newY).catch(() => {});
    },
    onDragEnd: () => {
      // Called when the user releases after dragging (Fyne's DragEnd event)
      console.log(`[EventRouter] onDragEnd received`);
      router.handleDragEnd();
    },
  });

  // Store router and event canvas on context for later access
  (ctx as any)._eventRouter = router;
  (ctx as any)._eventCanvas = eventCanvas;

  // Notify caller that router is ready
  if (options.onEventRouterCreated) {
    options.onEventRouterCreated(router);
  }

  return router;
}

/**
 * Disable event handling for a Cosyne context
 */
export function disableEventHandling(ctx: CosyneContext): void {
  const router = (ctx as any)._eventRouter as EventRouter | undefined;
  if (router) {
    router.reset();
  }

  const eventCanvas = (ctx as any)._eventCanvas;
  if (eventCanvas && eventCanvas.destroy) {
    eventCanvas.destroy();
  }

  delete (ctx as any)._eventRouter;
  delete (ctx as any)._eventCanvas;
}

/**
 * Get the EventRouter for a context (for testing/inspection)
 */
export function getEventRouter(ctx: CosyneContext): EventRouter | undefined {
  return (ctx as any)._eventRouter;
}
