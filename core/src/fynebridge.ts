import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as crc32 from 'buffer-crc32';

export interface Message {
  id: string;
  type: string;
  payload: Record<string, unknown>;
}

export interface Response {
  id: string;
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}

export interface Event {
  type: string;
  widgetId: string;
  data?: Record<string, unknown>;
}

/**
 * Common interface for bridge implementations (stdio and gRPC)
 */
export interface BridgeInterface {
  waitUntilReady(): Promise<void>;
  send(type: string, payload: Record<string, unknown>, callerFn?: Function): Promise<unknown>;
  registerEventHandler(callbackId: string, handler: (data: unknown) => void): void;
  on(eventType: string, handler: (data: unknown) => void): void;
  off(eventType: string, handler?: (data: unknown) => void): void;
  registerCustomId(widgetId: string, customId: string): Promise<unknown>;
  getParent(widgetId: string): Promise<string>;
  clickToolbarAction(toolbarId: string, actionLabel: string): Promise<unknown>;
  quit(): void;
  waitForPendingRequests(timeoutMs?: number): Promise<boolean>;
  shutdown(): void;
}

export class BridgeConnection implements BridgeInterface {
  private process: ChildProcess;
  private messageId = 0;
  private pendingRequests = new Map<string, {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    callerStack: string;
  }>();
  private eventHandlers = new Map<string, (data: unknown) => void>();
  private readyPromise: Promise<void>;
  private readyResolve?: () => void;
  private buffer = Buffer.alloc(0); // Accumulate incoming data
  private readingFrame = false;
  private quitTimeout?: NodeJS.Timeout;
  private bridgeExiting = false; // Track when bridge is shutting down
  private stdinClosed = false; // Track when stdin pipe is closed

  constructor(testMode: boolean = false) {
    // Detect if running from pkg
    const isPkg = typeof (process as unknown as { pkg?: unknown }).pkg !== 'undefined';

    let bridgePath: string;
    // First check TSYNE_BRIDGE_PATH environment variable (set by scripts/tsyne)
    if (process.env.TSYNE_BRIDGE_PATH) {
      bridgePath = process.env.TSYNE_BRIDGE_PATH;
    } else if (isPkg) {
      // When running from pkg, look for bridge next to the executable
      const execDir = path.dirname(process.execPath);
      bridgePath = path.join(execDir, 'tsyne-bridge');
    } else {
      // Find project root by detecting if running from compiled code or ts-node
      // __dirname could be either dist/src (compiled) or src (ts-node)
      const isCompiled = __dirname.includes(path.sep + 'dist' + path.sep);
      const projectRoot = isCompiled
        ? path.join(__dirname, '..', '..') // dist/src -> up 2 levels
        : path.join(__dirname, '..'); // src -> up 1 level
      bridgePath = path.join(projectRoot, 'bin', 'tsyne-bridge');
    }

    const args = testMode ? ['--headless'] : [];
    this.process = spawn(bridgePath, args, {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    // Create promise that resolves when bridge is ready
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    // IPC Safeguard: Read framed messages with length-prefix and CRC32 validation
    // Frame format: [uint32 length][uint32 crc32][json bytes]
    this.process.stdout!.on('data', (chunk: Buffer) => {
      // Accumulate data in buffer
      this.buffer = Buffer.concat([this.buffer, chunk]);

      // Try to read complete frames
      while (this.tryReadFrame()) {
        // Keep reading frames until buffer is exhausted
      }
    });

    this.process.on('error', (err) => {
      console.error('Bridge process error:', err);
    });

    this.process.on('exit', (code) => {
      // Mark bridge as exiting to prevent further writes
      this.bridgeExiting = true;
      // Only log non-zero exit codes (errors)
      if (code !== 0) {
        console.error(`Bridge process exited with code ${code}`);
      }
      // Reject any pending requests since bridge is gone
      for (const pending of this.pendingRequests.values()) {
        pending.reject(new Error('Bridge process exited'));
      }
      this.pendingRequests.clear();
    });

    // Handle stdin errors (EPIPE when bridge closes unexpectedly)
    this.process.stdin!.on('error', (err: NodeJS.ErrnoException) => {
      this.stdinClosed = true;
      if (err.code === 'EPIPE') {
        // Bridge process closed stdin - reject pending requests gracefully
        for (const pending of this.pendingRequests.values()) {
          pending.reject(new Error('Bridge stdin closed (EPIPE)'));
        }
        this.pendingRequests.clear();
      } else {
        console.error('Bridge stdin error:', err);
      }
    });
  }

  /**
   * Try to read one complete framed message from the buffer
   * Returns true if a message was read, false if more data is needed
   */
  private tryReadFrame(): boolean {
    // Need at least 8 bytes for length + crc32
    if (this.buffer.length < 8) {
      return false;
    }

    // Read length prefix (4 bytes, big-endian)
    const length = this.buffer.readUInt32BE(0);

    // Sanity check: reject unreasonably large messages (> 10MB)
    if (length > 10 * 1024 * 1024) {
      console.error(`Message too large: ${length} bytes`);
      // Skip the corrupt frame by discarding buffer
      this.buffer = Buffer.alloc(0);
      return false;
    }

    // Check if we have the complete frame
    const frameSize = 8 + length; // 4 bytes length + 4 bytes crc32 + payload
    if (this.buffer.length < frameSize) {
      return false; // Wait for more data
    }

    // Read CRC32 checksum (4 bytes, big-endian)
    const expectedChecksum = this.buffer.readUInt32BE(4);

    // Read JSON payload
    const payload = this.buffer.slice(8, 8 + length);

    // Validate CRC32 checksum
    const actualChecksum = crc32.unsigned(payload);
    if (actualChecksum !== expectedChecksum) {
      console.error(`Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
      // Try to recover by skipping this frame
      this.buffer = this.buffer.slice(frameSize);
      return false;
    }

    // Parse JSON message
    try {
      const jsonString = payload.toString('utf8');
      const data = JSON.parse(jsonString);

      // Distinguish between Event (has 'type') and Response (has 'id')
      // Events have a 'type' field but no 'id' field
      // Responses have an 'id' field but no 'type' field
      if ('type' in data && !('id' in data)) {
        // This is an event
        this.handleEvent(data as Event);
      } else {
        // This is a response
        this.handleResponse(data as Response);
      }
    } catch (err) {
      console.error('Error parsing bridge message:', err);
    }

    // Remove the frame from buffer
    this.buffer = this.buffer.slice(frameSize);

    return true; // Successfully read a frame
  }

  private handleResponse(response: Response): void {
    // Handle ready signal
    if (response.id === 'ready' && this.readyResolve) {
      this.readyResolve();
      return;
    }

    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      this.pendingRequests.delete(response.id);
      if (response.success) {
        pending.resolve(response.result || {});
      } else {
        // Create error with the original caller's stack trace for better debugging
        const error = new Error(response.error || 'Unknown error');
        if (pending.callerStack) {
          // Use the caller's stack directly - it already has internal frames removed
          error.stack = `Error: ${response.error || 'Unknown error'}\n${pending.callerStack}`;
        }
        pending.reject(error);
      }
    }
  }

  private handleEvent(event: Event): void {
    if (event.type === 'callback' && event.data?.callbackId && typeof event.data.callbackId === 'string') {
      const handler = this.eventHandlers.get(event.data.callbackId);
      if (handler) {
        handler(event.data);
      }
    } else {
      // For events like mouseIn, mouseOut, mouseMove - try both with and without widgetId
      // First try: eventType:widgetId (e.g., "mouseIn:hoverable_9")
      // Second try: just eventType (e.g., "mouseIn" for global handlers)
      const handlerKey = event.widgetId ? `${event.type}:${event.widgetId}` : event.type;
      const handler = this.eventHandlers.get(handlerKey) || this.eventHandlers.get(event.type);

      if (handler) {
        // Pass both data and widgetId for events like pointerEnter
        // Only override widgetId if event.widgetId is set (some events send it in data)
        const eventData = { ...event.data };
        if (event.widgetId) {
          eventData.widgetId = event.widgetId;
        }
        handler(eventData);
      }
    }
  }

  /**
   * Wait for the bridge to be ready to receive commands
   */
  async waitUntilReady(): Promise<void> {
    return this.readyPromise;
  }

  async send(type: string, payload: Record<string, unknown>, callerFn?: Function): Promise<unknown> {
    // Wait for bridge to be ready before sending commands
    await this.readyPromise;

    // Check if bridge is still available before attempting to send
    // During shutdown, silently resolve instead of rejecting to avoid unhandled rejections
    // The bridge is going away anyway, so attempting to send is a no-op, not an error
    if (this.bridgeExiting || this.stdinClosed || this.process.killed) {
      return Promise.resolve({});
    }

    const id = `msg_${this.messageId++}`;
    const message: Message = { id, type, payload };

    // Capture stack trace at call site for better error reporting
    // Skip internal frames up to callerFn (or this.send if not provided) to point to actual caller
    const stackCapture = {} as { stack?: string };
    Error.captureStackTrace(stackCapture, callerFn || this.send);
    const callerStack = stackCapture.stack || '';

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, callerStack });

      // IPC Safeguard: Write framed message with length-prefix and CRC32 validation
      // Frame format: [uint32 length][uint32 crc32][json bytes]
      const jsonBuffer = Buffer.from(JSON.stringify(message), 'utf8');
      const checksum = crc32.unsigned(jsonBuffer);

      // Create frame buffer: length (4 bytes) + crc32 (4 bytes) + json
      const frame = Buffer.alloc(8 + jsonBuffer.length);
      frame.writeUInt32BE(jsonBuffer.length, 0); // Write length
      frame.writeUInt32BE(checksum, 4); // Write CRC32
      jsonBuffer.copy(frame, 8); // Copy JSON payload

      // Double-check state before write (race condition protection)
      if (this.bridgeExiting || this.stdinClosed) {
        this.pendingRequests.delete(id);
        resolve({}); // Silently resolve during shutdown
        return;
      }

      this.process.stdin!.write(frame);
    });
  }

  registerEventHandler(callbackId: string, handler: (data: unknown) => void): void {
    this.eventHandlers.set(callbackId, handler);
  }

  /**
   * Register an event handler (alias for registerEventHandler)
   */
  on(eventType: string, handler: (data: unknown) => void): void {
    this.eventHandlers.set(eventType, handler);
  }

  /**
   * Unregister an event handler
   */
  off(eventType: string, handler?: (data: unknown) => void): void {
    this.eventHandlers.delete(eventType);
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
    // Mark as exiting to prevent new requests during shutdown
    this.bridgeExiting = true;
    this.send('quit', {}).catch(() => {
      // Ignore errors during quit - bridge may already be closing
    });
    this.quitTimeout = setTimeout(() => {
      this.shutdown();
    }, 1000);
  }

  /**
   * Wait for all pending requests to complete (with timeout)
   * Returns true if all requests completed, false if timeout reached
   */
  async waitForPendingRequests(timeoutMs: number = 1000): Promise<boolean> {
    const startTime = Date.now();
    while (this.pendingRequests.size > 0 && Date.now() - startTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return this.pendingRequests.size === 0;
  }

  /**
   * Forcefully shutdown the bridge and clean up all resources
   * This removes all event listeners, clears handlers, and kills the process
   * Note: This sends SIGTERM. For SIGKILL fallback, use the cleanup() method in TsyneTest.
   */
  shutdown(): void {
    // Mark as exiting immediately to prevent any further writes
    this.bridgeExiting = true;
    this.stdinClosed = true;

    // Clear the timeout if it's still pending
    if (this.quitTimeout) {
      clearTimeout(this.quitTimeout);
      this.quitTimeout = undefined;
    }

    // Remove all event listeners from the process to allow it to be GC'd
    if (this.process) {
      this.process.removeAllListeners();
      this.process.stdout?.removeAllListeners();
      this.process.stderr?.removeAllListeners();
      this.process.stdin?.removeAllListeners();
    }

    // Clear all pending requests - don't reject them to avoid noise in tests
    // These requests are abandoned during shutdown and their results don't matter
    // We just clear them silently to allow cleanup to proceed
    this.pendingRequests.clear();

    // Clear all registered event handlers
    this.eventHandlers.clear();

    // Clear the buffer
    this.buffer = Buffer.alloc(0);

    // Kill the process if still alive (SIGTERM first)
    // The TsyneTest.cleanup() method handles SIGKILL escalation if needed
    if (this.process && !this.process.killed) {
      try {
        this.process.kill('SIGTERM');
      } catch (err) {
        // Process might already be dead
      }
    }
  }
}
