/**
 * Bridge Connection Helper for Three.js Examples
 *
 * Uses Tsyne's native app factory to connect to the Go bridge.
 * Creates a visible Tsyne window for three.js rendering.
 *
 * Usage:
 *   const bridge = await BridgeConnection.connect({ width: 1920, height: 1080 });
 *   const sendFn = (msg) => bridge.send(msg);
 *   const { bridge: tsyneBridge, THREE } = await setupTsyneThreeJS(sendFn);
 */

import type { ITsyneContext } from 'tsyne';

// Global app instance for bridge connection
let tsyneAppInstance: any = null;
let tsyneContext: ITsyneContext | null = null;
let tsyneWindow: any = null;
let windowId: string = '';

interface ConnectOptions {
  width?: number;
  height?: number;
  title?: string;
}

/**
 * Bridge connection wrapper around Tsyne's bridge
 */
export class BridgeConnection {
  private static instance: BridgeConnection | null = null;
  private bridge: any;
  private context: any;

  private constructor(bridge: any, context: any) {
    this.bridge = bridge;
    this.context = context;
  }

  /**
   * Connect to the Tsyne bridge and create a visible rendering window
   */
  static async connect(options: ConnectOptions = {}): Promise<BridgeConnection> {
    if (BridgeConnection.instance) {
      return BridgeConnection.instance;
    }

    const width = options.width || 1920;
    const height = options.height || 1080;
    const title = options.title || 'Three.js Rendering';

    try {
      // Import Tsyne app factory using the proper pattern
      const { app, resolveTransport, standaloneShutdownStrategy } = await import('../../core/dist/src/index.js');

      // Create bridge connection via a promise that resolves when window is ready
      const bridgePromise = new Promise<{ bridge: any; context: any }>((resolve, reject) => {
        try {
          tsyneAppInstance = app(resolveTransport(), { title }, (context: any) => {
            tsyneContext = context;

            // Get the bridge from the context
            const bridge = context.getBridge();
            if (!bridge) {
              reject(new Error('Failed to get bridge from Tsyne context'));
              return;
            }

            // Create a visible window for three.js rendering
            context.window({ title, width, height }, (win: any) => {
              tsyneWindow = win;
              windowId = win.id || 'three_window';

              // Set placeholder content - will be replaced by GL canvas
              win.setContent(() => {
                context.label('Initializing Three.js...');
              });

              // Show the window
              win.show();

              console.log(`[Bridge] Created window: ${title} (${width}x${height})`);

              // Resolve after window is shown
              setTimeout(() => {
                resolve({ bridge, context });
              }, 100);
            });
          });

          // Set shutdown strategy for standalone mode
          if (tsyneAppInstance && tsyneAppInstance.setOnLastWindowClose) {
            tsyneAppInstance.setOnLastWindowClose(standaloneShutdownStrategy(tsyneAppInstance));
          }
        } catch (error) {
          reject(error);
        }
      });

      const { bridge, context } = await bridgePromise;

      const connection = new BridgeConnection(bridge, context);
      BridgeConnection.instance = connection;

      console.log('[Bridge] Connected to Tsyne bridge via app factory');
      return connection;
    } catch (error) {
      console.error('[Bridge] Connection error:', error);
      throw error;
    }
  }

  /**
   * Get the window ID for GL canvas creation
   */
  getWindowId(): string {
    return windowId;
  }

  /**
   * Send a message to the bridge and return the response
   * Tsyne bridge's send() is async and returns the response directly
   */
  async send(msg: any): Promise<any> {
    try {
      const response = await this.bridge.send(msg.type, msg.payload || {});
      return response;
    } catch (error) {
      console.error('[Bridge] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Send a message without waiting for response (fire-and-forget)
   */
  sendFireAndForget(msg: any): void {
    try {
      // Fire and forget - don't await the promise
      this.bridge.send(msg.type, msg.payload || {}).catch((err: Error) => {
        console.error('[Bridge] Fire-and-forget error:', err);
      });
    } catch (error) {
      console.error('[Bridge] Failed to send message:', error);
    }
  }

  /**
   * Disconnect from the bridge
   */
  disconnect(): void {
    BridgeConnection.instance = null;
    tsyneAppInstance = null;
    tsyneContext = null;
    tsyneWindow = null;
    windowId = '';
  }
}

/**
 * Create a message sender function that sends GL commands to the bridge
 */
export async function createBridgeSender(): Promise<(msg: any) => void> {
  const connection = await BridgeConnection.connect();
  return (msg: any) => {
    connection.send(msg);
  };
}

/**
 * Initialize Tsyne with real bridge connection
 * This is the main entry point for examples
 */
export async function initTsyneWithBridge(): Promise<{
  bridge: any;
  THREE: any;
  sender: (msg: any) => void;
}> {
  const sender = await createBridgeSender();

  // Import and setup three.js
  const { setupTsyneThreeJS } = await import('./init');
  const { bridge, THREE } = await setupTsyneThreeJS(sender, {
    width: 1920,
    height: 1080,
  });

  return { bridge, THREE, sender };
}

export default {
  BridgeConnection,
  createBridgeSender,
  initTsyneWithBridge,
};
