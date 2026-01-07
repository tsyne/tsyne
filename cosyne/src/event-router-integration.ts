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

  // Create TappableCanvasRaster for event capture
  const eventCanvas = app.tappableCanvasRaster(options.width, options.height, {
    onTap: async (x: number, y: number) => {
      registerHitTesters();
      await router.handleClick(getAllPrimitives(), x, y);
    },
    onMouseMove: async (x: number, y: number) => {
      registerHitTesters();
      await router.handleMouseMove(getAllPrimitives(), x, y);
    },
    onDrag: (x: number, y: number, deltaX: number, deltaY: number) => {
      // onDrag is called while dragging
      // We handle the drag continuation in handleMouseMove instead
      registerHitTesters();
      router.handleMouseMove(getAllPrimitives(), x, y).catch(() => {});
    },
  });

  // Handle drag start and end through mouse events
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  // Override tap to detect drag start
  const originalOnTap = eventCanvas.onTapCallback;
  if (eventCanvas) {
    (eventCanvas as any).onTapCallback = async (x: number, y: number) => {
      registerHitTesters();
      dragStartX = x;
      dragStartY = y;
      isDragging = true;

      const primitives = getAllPrimitives();
      const topHit = router.hitTestTop(primitives, x, y);

      if (topHit?.getDragStartHandler() || topHit?.getDragHandler()) {
        router.handleDragStart(primitives, x, y);
      }

      // Then handle the click
      await router.handleClick(primitives, x, y);
    };
  }

  // Detect drag end by checking if dragging and then stopping
  // This is handled implicitly - when drag handlers aren't present, it won't drag
  // For explicit drag end, we'd need to hook into the underlying canvas pointer events

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
