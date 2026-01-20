/**
 * WebRendererBridge - Bridge implementation for Tauri/Web rendering
 *
 * Sends widget commands via WebSocket to a web renderer instead of Go/Fyne.
 * Used for Tauri packaging where the UI is rendered in HTML/CSS.
 */

import { WebSocket, WebSocketServer } from 'ws';
import { BridgeInterface, Event } from './fynebridge';

export class WebRendererBridge implements BridgeInterface {
  private wss: WebSocketServer;
  private client: WebSocket | null = null;
  private messageId = 0;
  private pendingRequests = new Map<string, {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private eventHandlers = new Map<string, (data: unknown) => void>();
  private globalEventHandlers = new Map<string, Set<(data: unknown) => void>>();
  private readyPromise: Promise<void>;
  private readyResolve?: () => void;
  private onExitCallback?: () => void;
  private isShuttingDown = false;

  constructor(private port: number = 9876) {
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    this.wss = new WebSocketServer({ port });
    console.log(`[WebRendererBridge] WebSocket server listening on port ${port}`);

    this.wss.on('connection', (ws) => {
      console.log('[WebRendererBridge] Web renderer connected');
      this.client = ws;

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleMessage(msg);
        } catch (e) {
          console.error('[WebRendererBridge] Failed to parse message:', e);
        }
      });

      ws.on('close', () => {
        console.log('[WebRendererBridge] Web renderer disconnected');
        this.client = null;
      });

      ws.on('error', (err) => {
        console.error('[WebRendererBridge] WebSocket error:', err);
      });
    });

    this.wss.on('error', (err) => {
      console.error('[WebRendererBridge] Server error:', err);
    });
  }

  private handleMessage(msg: Record<string, unknown>) {
    const { type, id } = msg;

    // Response to a request we sent
    if (id && this.pendingRequests.has(id as string)) {
      const pending = this.pendingRequests.get(id as string)!;
      this.pendingRequests.delete(id as string);

      if (msg.error) {
        pending.reject(new Error(msg.error as string));
      } else {
        pending.resolve(msg.result);
      }
      return;
    }

    // Special messages
    if (type === 'renderer_ready') {
      console.log('[WebRendererBridge] Renderer ready');
      if (this.readyResolve) {
        this.readyResolve();
      }
      return;
    }

    // Callback from widget event
    if (type === 'callback') {
      const callbackId = msg.callbackId as string;
      const handler = this.eventHandlers.get(callbackId);
      if (handler) {
        handler(msg.data);
      }
      return;
    }

    // Generic event
    if (type === 'event') {
      const eventType = msg.eventType as string;
      const handlers = this.globalEventHandlers.get(eventType);
      if (handlers) {
        for (const handler of handlers) {
          handler(msg.data);
        }
      }
      return;
    }
  }

  async waitUntilReady(): Promise<void> {
    return this.readyPromise;
  }

  async send(type: string, payload: Record<string, unknown>, _callerFn?: Function): Promise<unknown> {
    if (!this.client || this.client.readyState !== WebSocket.OPEN) {
      // Queue or wait for connection
      await this.waitUntilReady();
    }

    const id = `msg_${++this.messageId}`;
    const msg = { id, type, payload };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      if (this.client && this.client.readyState === WebSocket.OPEN) {
        this.client.send(JSON.stringify(msg));
      } else {
        // Resolve immediately for commands that don't need response
        // This is a simplification - in production, we'd queue and retry
        this.pendingRequests.delete(id);
        resolve({});
      }

      // Auto-resolve after timeout to prevent hanging
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          resolve({});
        }
      }, 100);
    });
  }

  /**
   * Send a message without waiting for response (fire and forget)
   */
  sendFireAndForget(type: string, payload: Record<string, unknown>): void {
    this.send(type, payload).catch(() => {});
  }

  registerEventHandler(callbackId: string, handler: (data: unknown) => void): void {
    this.eventHandlers.set(callbackId, handler);
  }

  on(eventType: string, handler: (data: unknown) => void): void {
    if (!this.globalEventHandlers.has(eventType)) {
      this.globalEventHandlers.set(eventType, new Set());
    }
    this.globalEventHandlers.get(eventType)!.add(handler);
  }

  off(eventType: string, handler?: (data: unknown) => void): void {
    if (!handler) {
      this.globalEventHandlers.delete(eventType);
    } else {
      this.globalEventHandlers.get(eventType)?.delete(handler);
    }
  }

  async registerCustomId(widgetId: string, customId: string): Promise<unknown> {
    return this.send('registerCustomId', { widgetId, customId });
  }

  async getParent(widgetId: string): Promise<string> {
    const result = await this.send('getParent', { widgetId }) as { parentId?: string };
    return result?.parentId || '';
  }

  async clickToolbarAction(toolbarId: string, actionLabel: string): Promise<unknown> {
    return this.send('clickToolbarAction', { toolbarId, actionLabel });
  }

  quit(): void {
    this.send('quit', {}).catch(() => {});
    setTimeout(() => this.shutdown(), 100);
  }

  async waitForPendingRequests(timeoutMs: number = 5000): Promise<boolean> {
    const start = Date.now();
    while (this.pendingRequests.size > 0) {
      if (Date.now() - start > timeoutMs) {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return true;
  }

  shutdown(): void {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log('[WebRendererBridge] Shutting down...');

    if (this.client) {
      this.client.close();
    }

    this.wss.close();

    if (this.onExitCallback) {
      this.onExitCallback();
    }
  }

  setOnExit(callback: () => void): void {
    this.onExitCallback = callback;
  }
}

/**
 * Create and start the web renderer bridge
 */
export function createWebRendererBridge(port: number = 9876): BridgeInterface {
  return new WebRendererBridge(port);
}
