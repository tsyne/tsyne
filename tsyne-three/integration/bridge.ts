/**
 * TsyneBridge - Communication interface between TypeScript and Go
 *
 * This module provides the interface for communicating with the Tsyne Go bridge.
 * All GL operations are serialized as messages and sent over the bridge.
 *
 * The sendFn should be an async function that returns the response from the bridge.
 */

export interface GLCommand {
  cmd: string;
  args: Record<string, any>;
}

export interface BridgeMessage {
  type: string;
  payload: Record<string, any>;
}

export interface BridgeResponse {
  type: string;
  payload: any;
  error?: string;
}

// Type for the send function - now async and returns response
export type SendFunction = (msg: BridgeMessage) => Promise<any>;

// Mouse event callback type
export type MouseEventCallback = (x: number, y: number) => void;

/**
 * TsyneBridge - Main interface for communicating with the Go backend
 * Uses an async sendFn that directly returns responses from the bridge
 */
export class TsyneBridge {
  // Mouse event handlers per canvas
  private mouseHandlers: Map<string, {
    onMouseMove?: MouseEventCallback;
    onMouseEnter?: MouseEventCallback;
    onMouseLeave?: () => void;
  }> = new Map();

  constructor(private sendFn: SendFunction) {}

  /**
   * Send a message to the bridge and wait for a response
   * The sendFn handles the actual communication and returns the response
   */
  async send(type: string, payload: Record<string, any>): Promise<any> {
    const msg: BridgeMessage = { type, payload };
    // Debug logging disabled for performance
    try {
      const response = await this.sendFn(msg);
      return response;
    } catch (error) {
      console.error(`[TsyneBridge] Error sending ${type}:`, error);
      throw error;
    }
  }

  /**
   * Send a message without waiting for response (fire-and-forget)
   * Used for performance-critical operations like draw calls
   */
  sendAsync(type: string, payload: Record<string, any>): void {
    const msg: BridgeMessage = { type, payload };
    // Fire and forget - don't await
    this.sendFn(msg).catch(err => {
      console.error(`[TsyneBridge] Fire-and-forget error for ${type}:`, err);
    });
  }

  /**
   * Create a GL canvas on the bridge
   * Returns a canvas ID for subsequent GL operations
   * @param interactive - If true, the canvas will receive mouse events
   */
  async createGLCanvas(width: number, height: number, windowId?: string, interactive?: boolean): Promise<string> {
    try {
      const response = await this.send('createGLCanvas', { width, height, windowId, interactive: interactive ?? false });
      return response?.canvasId || response?.Result?.canvasId || 'default_canvas';
    } catch (error) {
      console.error(`[TsyneBridge] createGLCanvas error:`, error);
      return 'error_canvas';
    }
  }

  /**
   * Register mouse event handlers for a canvas
   */
  setMouseHandlers(
    canvasId: string,
    handlers: {
      onMouseMove?: MouseEventCallback;
      onMouseEnter?: MouseEventCallback;
      onMouseLeave?: () => void;
    }
  ): void {
    this.mouseHandlers.set(canvasId, handlers);
  }

  /**
   * Handle an incoming event from the bridge
   * Call this when receiving events from the Go side
   */
  handleEvent(event: { type: string; widgetId?: string; data?: any }): void {
    if (event.type === 'glMouseEvent' && event.widgetId) {
      const handlers = this.mouseHandlers.get(event.widgetId);
      if (handlers) {
        const { event: eventType, x, y } = event.data || {};
        switch (eventType) {
          case 'mousemove':
            handlers.onMouseMove?.(x, y);
            break;
          case 'mouseenter':
            handlers.onMouseEnter?.(x, y);
            break;
          case 'mouseleave':
            handlers.onMouseLeave?.();
            break;
        }
      }
    }
  }

  /**
   * Execute a batch of GL commands
   * This is the main method for sending GL operations
   * Returns the response which may include piggybacked mouse events
   */
  async executeBatch(canvasId: string, commands: GLCommand[]): Promise<any> {
    return await this.send('executeBatch', { canvasId, commands });
  }

  /**
   * Get a GL parameter value from the bridge
   */
  async getParameter(canvasId: string, pname: number): Promise<any> {
    const response = await this.send('getParameter', { canvasId, pname });
    return response?.value || response?.Result?.value;
  }

  /**
   * Get the latest GL error
   */
  async getError(canvasId: string): Promise<number> {
    const response = await this.send('getError', { canvasId });
    return response?.error || response?.Result?.error || 0;
  }
}

/**
 * Get the default bridge instance
 * This would be initialized by the Tsyne CLI when launching the app
 */
let defaultBridge: TsyneBridge | null = null;

export function setDefaultBridge(bridge: TsyneBridge): void {
  defaultBridge = bridge;
}

export function getDefaultBridge(): TsyneBridge {
  if (!defaultBridge) {
    throw new Error('No bridge available. Call setDefaultBridge() first.');
  }
  return defaultBridge;
}
