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

  // Track drag state - Fyne calls Dragged() during drag, not Tapped()
  let dragStarted = false;

  // Create TappableCanvasRaster for event capture
  const eventCanvas = app.tappableCanvasRaster(options.width, options.height, {
    onTap: async (x: number, y: number) => {
      // Tapped() is only called for quick tap (not drag)
      registerHitTesters();
      await router.handleClick(getAllPrimitives(), x, y);
    },
    onMouseMove: async (x: number, y: number) => {
      registerHitTesters();
      await router.handleMouseMove(getAllPrimitives(), x, y);
    },
    onDrag: (x: number, y: number, deltaX: number, deltaY: number) => {
      // onDrag is called while dragging (Fyne's Dragged event)
      registerHitTesters();
      const primitives = getAllPrimitives();

      // Detect drag start on first drag event
      if (!dragStarted) {
        dragStarted = true;
        router.handleDragStart(primitives, x, y);
      }

      // Continue drag - handleMouseMove processes drag movement
      router.handleMouseMove(primitives, x, y).catch(() => {});
    },
    onDragEnd: () => {
      // Called when the user releases after dragging (Fyne's DragEnd event)
      if (dragStarted) {
        router.handleDragEnd();
        dragStarted = false;
      }
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
