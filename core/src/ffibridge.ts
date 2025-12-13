import * as path from 'path';
import { BridgeInterface, Event } from './fynebridge';

// Import koffi at runtime
let koffi: any;

/**
 * FFI Bridge Connection - calls Go library directly via koffi
 *
 * This is the fastest transport option:
 * - No process spawning or IPC overhead
 * - Direct function calls into the Go shared library
 * - Same memory space (no serialization for complex types)
 *
 * Note: Events are polled rather than pushed, since Go runs in a separate thread
 */
export class FfiBridgeConnection implements BridgeInterface {
  private lib: any;
  private eventHandlers = new Map<string, (data: unknown) => void>();
  private readyPromise: Promise<void>;
  private readyResolve?: () => void;
  private messageId = 0;
  private eventPollInterval?: NodeJS.Timeout;
  private isShutdown = false;
  private onExitCallback?: () => void; // Callback when bridge exits

  constructor(testMode: boolean = false) {
    // Load koffi dynamically
    try {
      koffi = require('koffi');
    } catch (err) {
      throw new Error('koffi not installed. Run: npm install koffi');
    }

    // Find library path
    const isPkg = typeof (process as unknown as { pkg?: unknown }).pkg !== 'undefined';
    let libPath: string;

    if (isPkg) {
      const execDir = path.dirname(process.execPath);
      libPath = path.join(execDir, 'libtsyne.so');
    } else {
      const isCompiled = __dirname.includes(path.sep + 'dist' + path.sep);
      const projectRoot = isCompiled
        ? path.join(__dirname, '..', '..')
        : path.join(__dirname, '..');
      libPath = path.join(projectRoot, 'bin', 'libtsyne.so');
    }

    // Load the shared library
    this.lib = koffi.load(libPath);

    // Define function signatures
    const TsyneInit = this.lib.func('TsyneInit', 'int', ['int']);
    const TsyneSendMessage = this.lib.func('TsyneSendMessage', 'str', ['str']);
    const TsyneFreeString = this.lib.func('TsyneFreeString', 'void', ['str']);
    const TsyneGetNextEvent = this.lib.func('TsyneGetNextEvent', 'str', []);
    const TsyneGetEventQueueLength = this.lib.func('TsyneGetEventQueueLength', 'int', []);
    const TsyneShutdown = this.lib.func('TsyneShutdown', 'void', []);

    // Store references
    this._TsyneInit = TsyneInit;
    this._TsyneSendMessage = TsyneSendMessage;
    this._TsyneFreeString = TsyneFreeString;
    this._TsyneGetNextEvent = TsyneGetNextEvent;
    this._TsyneGetEventQueueLength = TsyneGetEventQueueLength;
    this._TsyneShutdown = TsyneShutdown;

    // Create ready promise
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    // Initialize the bridge
    const headless = testMode ? 1 : 0;
    const result = this._TsyneInit(headless);
    if (result !== 0) {
      throw new Error('Failed to initialize FFI bridge');
    }

    // Start event polling
    this.startEventPolling();

    // Signal ready immediately since FFI is synchronous
    if (this.readyResolve) {
      this.readyResolve();
    }
  }

  private _TsyneInit: (headless: number) => number;
  private _TsyneSendMessage: (json: string) => string;
  private _TsyneFreeString: (str: string) => void;
  private _TsyneGetNextEvent: () => string | null;
  private _TsyneGetEventQueueLength: () => number;
  private _TsyneShutdown: () => void;

  private startEventPolling(): void {
    // Poll for events every 10ms
    this.eventPollInterval = setInterval(() => {
      if (this.isShutdown) return;

      // Check event queue
      const queueLength = this._TsyneGetEventQueueLength();
      for (let i = 0; i < queueLength; i++) {
        const eventJson = this._TsyneGetNextEvent();
        if (eventJson) {
          try {
            const event = JSON.parse(eventJson) as Event;
            this.handleEvent(event);
          } catch (err) {
            console.error('Failed to parse FFI event:', err);
          }
        }
      }
    }, 10);
  }

  private handleEvent(event: Event): void {
    if (event.type === 'callback' && event.data?.callbackId && typeof event.data.callbackId === 'string') {
      const handler = this.eventHandlers.get(event.data.callbackId);
      if (handler) {
        handler(event.data);
      }
    } else {
      const handlerKey = event.widgetId ? `${event.type}:${event.widgetId}` : event.type;
      const handler = this.eventHandlers.get(handlerKey) || this.eventHandlers.get(event.type);

      if (handler) {
        const eventData = { ...event.data };
        if (event.widgetId) {
          eventData.widgetId = event.widgetId;
        }
        handler(eventData);
      }
    }
  }

  async waitUntilReady(): Promise<void> {
    return this.readyPromise;
  }

  async send(type: string, payload: Record<string, unknown>): Promise<unknown> {
    await this.readyPromise;

    if (this.isShutdown) {
      return Promise.resolve({});
    }

    const id = `msg_${this.messageId++}`;
    const message = { id, type, payload };
    const messageJson = JSON.stringify(message);

    // Call the FFI function
    const responseJson = this._TsyneSendMessage(messageJson);

    try {
      const response = JSON.parse(responseJson);
      if (response.success) {
        return response.result || {};
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error(`Invalid JSON response from FFI: ${responseJson}`);
      }
      throw err;
    }
  }

  registerEventHandler(callbackId: string, handler: (data: unknown) => void): void {
    this.eventHandlers.set(callbackId, handler);
  }

  on(eventType: string, handler: (data: unknown) => void): void {
    this.eventHandlers.set(eventType, handler);
  }

  off(eventType: string, handler?: (data: unknown) => void): void {
    this.eventHandlers.delete(eventType);
  }

  /**
   * Register a callback to be called when the bridge exits
   * Note: In FFI mode, the bridge runs in the same process, so this is called on shutdown
   */
  setOnExit(callback: () => void): void {
    this.onExitCallback = callback;
  }

  async registerCustomId(widgetId: string, customId: string): Promise<unknown> {
    return this.send('registerCustomId', { widgetId, customId });
  }

  async getParent(widgetId: string): Promise<string> {
    const result = await this.send('getParent', { widgetId }) as { parentId: string };
    return result.parentId;
  }

  async clickToolbarAction(toolbarId: string, actionLabel: string): Promise<unknown> {
    return this.send('clickToolbarAction', { toolbarId, actionLabel });
  }

  quit(): void {
    this.send('quit', {}).catch(() => {
      // Ignore errors during quit
    });
    setTimeout(() => {
      this.shutdown();
    }, 1000);
  }

  async waitForPendingRequests(timeoutMs: number = 1000): Promise<boolean> {
    // FFI is synchronous, so there are no pending requests
    return true;
  }

  shutdown(): void {
    this.isShutdown = true;

    // Stop event polling
    if (this.eventPollInterval) {
      clearInterval(this.eventPollInterval);
      this.eventPollInterval = undefined;
    }

    // Clear handlers
    this.eventHandlers.clear();

    // Shutdown the FFI bridge
    try {
      this._TsyneShutdown();
    } catch (err) {
      // Ignore shutdown errors
    }

    // Call exit callback if registered
    if (this.onExitCallback) {
      this.onExitCallback();
    }
  }
}
