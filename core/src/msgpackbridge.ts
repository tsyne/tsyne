import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as net from 'net';
import { encode, decode } from '@msgpack/msgpack';
import { BridgeInterface } from './fynebridge';
import { PROTOCOL_VERSION, TSYNE_VERSION, isCompatibleHandshake } from './version';

export interface MsgpackConnectionInfo {
  socketPath: string;
  protocol: string;
  /** Bridge protocol version (added in handshake) */
  protocolVersion?: number;
  /** Bridge version string */
  bridgeVersion?: string;
}

export interface Event {
  type: string;
  widgetId: string;
  data?: Record<string, unknown>;
}

/**
 * Simple buffer pool to reduce allocations during message sending
 */
class BufferPool {
  private pool: Buffer[] = [];
  private readonly maxSize = 10;
  private readonly bufferSize = 8192; // 8KB buffers

  acquire(minSize: number): Buffer {
    // Try to reuse a buffer from the pool if it's big enough
    if (this.pool.length > 0) {
      const buf = this.pool.pop()!;
      if (buf.length >= minSize) {
        return buf;
      }
    }
    // Allocate new buffer (either bufferSize or minSize, whichever is larger)
    return Buffer.allocUnsafe(Math.max(this.bufferSize, minSize));
  }

  release(buf: Buffer): void {
    // Only keep reasonably-sized buffers in the pool
    if (this.pool.length < this.maxSize && buf.length <= this.bufferSize * 2) {
      this.pool.push(buf);
    }
  }

  clear(): void {
    this.pool = [];
  }
}

interface MsgpackMessage {
  id: string;
  type: string;
  payload: Record<string, unknown>;
}

interface MsgpackResponse {
  id: string;
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}

/**
 * MsgpackBridgeConnection - Connects to tsyne-bridge via MessagePack over Unix Domain Sockets
 *
 * This is the fastest IPC option for local communication:
 * - Unix Domain Sockets avoid TCP overhead
 * - MessagePack is ~10x faster than JSON for serialization
 * - Length-prefixed framing for efficient message handling
 *
 * Flow:
 * 1. Spawn bridge with --mode=msgpack-uds
 * 2. Bridge sends {socketPath, protocol} via stdout
 * 3. Connect to Unix socket
 * 4. All subsequent communication via MessagePack over UDS
 */
export class MsgpackBridgeConnection implements BridgeInterface {
  private process?: ChildProcess;
  private socket?: net.Socket;
  private eventHandlers = new Map<string, (data: Record<string, unknown>) => void>();
  private readyPromise: Promise<void>;
  private readyResolve?: () => void;
  private connectionInfo?: MsgpackConnectionInfo;
  private messageId = 0;
  private pendingRequests = new Map<string, {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private receiveBuffer = Buffer.allocUnsafe(65536); // Pre-allocated 64KB buffer
  private receiveLength = 0; // Track how much data is in the buffer
  private bufferPool = new BufferPool(); // Pool for send frame buffers
  // Message queue to ensure sequential processing (preserves ordering)
  private messageQueue: Promise<unknown> = Promise.resolve();
  private onExitCallback?: () => void; // Callback when bridge process exits
  public bridgeExiting = false; // Track when bridge is shutting down

  constructor(testMode: boolean = false) {
    // Create promise that resolves when connected
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    // Check if socket path is already provided (Android/embedded mode)
    const existingSocketPath = process.env.TSYNE_SOCKET_PATH;
    if (existingSocketPath) {
      // Connect directly to existing socket (bridge already running in-process)
      this.connectionInfo = { socketPath: existingSocketPath, protocol: 'msgpack-uds' };
      this.connectToSocket(existingSocketPath);
      return;
    }

    // Detect if running from pkg
    const isPkg = typeof (process as unknown as { pkg?: unknown }).pkg !== 'undefined';

    let bridgePath: string;
    if (isPkg) {
      const execDir = path.dirname(process.execPath);
      bridgePath = path.join(execDir, 'tsyne-bridge');
    } else {
      const isCompiled = __dirname.includes(path.sep + 'dist' + path.sep);
      const projectRoot = isCompiled
        ? path.join(__dirname, '..', '..')
        : path.join(__dirname, '..');
      bridgePath = path.join(projectRoot, 'bin', 'tsyne-bridge');
    }

    // Start bridge in msgpack-uds mode
    const args = ['--mode=msgpack-uds'];
    if (testMode) {
      args.push('--headless');
    }

    this.process = spawn(bridgePath, args, {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    // Parse connection info from stdout
    let buffer = '';
    this.process.stdout!.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();

      // Look for complete JSON line
      const newlineIdx = buffer.indexOf('\n');
      if (newlineIdx !== -1 && !this.connectionInfo) {
        const jsonLine = buffer.slice(0, newlineIdx);
        buffer = buffer.slice(newlineIdx + 1);

        try {
          const info = JSON.parse(jsonLine) as MsgpackConnectionInfo;
          if (info.protocol === 'msgpack-uds') {
            this.connectionInfo = info;

            // Validate protocol version if provided
            if (info.protocolVersion !== undefined) {
              const compat = isCompatibleHandshake(
                {
                  protocol: info.protocolVersion,
                  bridgeVersion: info.bridgeVersion || 'unknown',
                  compatible: true,
                },
                PROTOCOL_VERSION
              );
              if (!compat.compatible) {
                console.error(`Bridge version mismatch: ${compat.reason}`);
                console.error(`  TypeScript: tsyne ${TSYNE_VERSION}, protocol ${PROTOCOL_VERSION}`);
                console.error(`  Bridge: ${info.bridgeVersion}, protocol ${info.protocolVersion}`);
              }
            }

            this.connectToSocket(info.socketPath);
          }
        } catch (err) {
          console.error('Failed to parse connection info:', err);
        }
      }
    });

    this.process.on('exit', (code) => {
      if (code !== null && code !== 0) {
        console.error(`Bridge process exited with code ${code}`);
      }
      // Call exit callback if registered (allows app to cleanup and exit)
      if (this.onExitCallback) {
        this.onExitCallback();
      }
    });
  }

  private async connectToSocket(socketPath: string): Promise<void> {
    const debug = process.env.TSYNE_DEBUG === '1';
    if (debug) {
      console.error(`[msgpack-uds] Connecting to ${socketPath}`);
    }

    // Enforce a client connect timeout so tests fail fast instead of hanging
    const CONNECT_TIMEOUT_MS = 2000;
    let timeoutHandle: NodeJS.Timeout | null = null;

    await new Promise<void>((resolve, reject) => {
      try {
        this.socket = net.createConnection({ path: socketPath });
      } catch (err) {
        return reject(err);
      }

      const onConnect = () => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (debug) {
          console.error('[msgpack-uds] Connected');
        }
        if (this.readyResolve) this.readyResolve();
        resolve();
      };

      const onError = (err: Error) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (debug) {
          console.error('[msgpack-uds] Socket error:', err.message);
        }
        reject(err);
      };

      this.socket!.once('connect', onConnect);
      this.socket!.once('error', onError);

      timeoutHandle = setTimeout(() => {
        // Avoid hanging forever on connect() if server isn’t accepting
        try { this.socket?.destroy(); } catch { /* ignore */ }
        onError(new Error(`UDS connect timeout after ${CONNECT_TIMEOUT_MS}ms (${socketPath})`));
      }, CONNECT_TIMEOUT_MS);

      // After connection, rewire handlers for normal operation
      this.socket!.on('data', (chunk: Buffer) => this.handleData(chunk));
      this.socket!.on('close', () => {
        if (debug) console.error('[msgpack-uds] Socket closed');
        // Call exit callback if registered (allows app to cleanup and exit)
        if (this.onExitCallback) {
          this.onExitCallback();
        }
      });
    });
  }

  private handleData(chunk: Buffer): void {
    // Ensure buffer has enough space for new chunk
    if (this.receiveLength + chunk.length > this.receiveBuffer.length) {
      // Need to expand buffer - double size or fit chunk, whichever is larger
      const newSize = Math.max(this.receiveBuffer.length * 2, this.receiveLength + chunk.length);
      const newBuffer = Buffer.allocUnsafe(newSize);
      this.receiveBuffer.copy(newBuffer, 0, 0, this.receiveLength);
      this.receiveBuffer = newBuffer;
    }

    // Copy chunk into buffer (no allocation!)
    chunk.copy(this.receiveBuffer, this.receiveLength);
    this.receiveLength += chunk.length;

    // Process complete messages
    let offset = 0;
    while (offset + 4 <= this.receiveLength) {
      // Read length prefix (4 bytes, big-endian)
      const length = this.receiveBuffer.readUInt32BE(offset);

      if (offset + 4 + length > this.receiveLength) {
        // Not enough data yet
        break;
      }

      // Extract message (create slice view, no copy)
      const msgBuf = this.receiveBuffer.slice(offset + 4, offset + 4 + length);
      offset += 4 + length;

      // Decode MessagePack
      try {
        const data = decode(msgBuf) as MsgpackResponse | Event;

        // Check if it's a response (has 'id' and 'success') or an event
        if ('id' in data && 'success' in data) {
          const response = data as MsgpackResponse;
          const pending = this.pendingRequests.get(response.id);
          if (pending) {
            this.pendingRequests.delete(response.id);
            if (response.success) {
              pending.resolve(response.result || {});
            } else {
              pending.reject(new Error(response.error || 'Unknown error'));
            }
          }
        } else if ('type' in data) {
          // It's an event
          this.handleEvent(data as Event);
        }
      } catch (err) {
        console.error('Failed to decode MessagePack:', err);
      }
    }

    // Compact buffer: move remaining data to start
    if (offset > 0) {
      if (offset < this.receiveLength) {
        this.receiveBuffer.copy(this.receiveBuffer, 0, offset, this.receiveLength);
      }
      this.receiveLength -= offset;
    }

    // Shrink buffer if it's grown too large and mostly empty (> 256KB and < 25% used)
    if (this.receiveBuffer.length > 262144 && this.receiveLength < this.receiveBuffer.length / 4) {
      const newBuffer = Buffer.allocUnsafe(65536);
      this.receiveBuffer.copy(newBuffer, 0, 0, this.receiveLength);
      this.receiveBuffer = newBuffer;
    }
  }

  private handleEvent(event: Event): void {
    // Try to find handler by callback ID, widget ID, type, or composite type:widgetId key
    const handlerKey = event.data?.callbackId as string || event.widgetId;
    const compositeKey = event.widgetId ? `${event.type}:${event.widgetId}` : null;
    const handler = this.eventHandlers.get(handlerKey)
      || this.eventHandlers.get(event.type)
      || (compositeKey && this.eventHandlers.get(compositeKey));

    if (handler) {
      const eventData = { ...event.data };
      if (event.widgetId) {
        eventData.widgetId = event.widgetId;
      }
      handler(eventData);
    }
  }

  async waitUntilReady(): Promise<void> {
    return this.readyPromise;
  }

  /**
   * Send a message via MessagePack over UDS
   * Messages are queued and processed sequentially to preserve ordering
   */
  async send(type: string, payload: Record<string, unknown>): Promise<unknown> {
    // During shutdown, silently return empty result to prevent errors
    if (this.bridgeExiting) {
      return {};
    }

    await this.readyPromise;

    if (!this.socket) {
      // If bridge is exiting (socket destroyed), silently return empty result
      if (this.bridgeExiting) {
        return {};
      }
      throw new Error('Socket not connected');
    }

    // Queue this message to ensure sequential processing
    const messagePromise = this.messageQueue.then(() => this.sendMsgpackMessage(type, payload));
    // Update queue to wait for this message (but catch errors to prevent queue breakage)
    this.messageQueue = messagePromise.catch(() => {});
    return messagePromise;
  }

  /**
   * Send a message without queuing or waiting for response (fire and forget)
   * Used for high-frequency updates like canvas line updates during drag
   * CAUTION: Does not preserve ordering with other messages
   */
  sendFireAndForget(type: string, payload: Record<string, unknown>): void {
    // During shutdown, silently return
    if (this.bridgeExiting || !this.socket) {
      return;
    }

    // Send directly without waiting for readyPromise (assume ready if socket exists)
    const id = `ff_${this.messageId++}`;
    const message: MsgpackMessage = { id, type, payload };

    // Encode to MessagePack
    const msgBuf = Buffer.from(encode(message));

    // Acquire buffer from pool (reduces allocations)
    const frameSize = 4 + msgBuf.length;
    const frame = this.bufferPool.acquire(frameSize);

    // Write length prefix and message
    frame.writeUInt32BE(msgBuf.length, 0);
    msgBuf.copy(frame, 4);

    // Write only the used portion of the buffer
    this.socket.write(frame.slice(0, frameSize), () => {
      // Return buffer to pool after write completes
      this.bufferPool.release(frame);
    });

    // Don't wait for response - just discard it when it arrives
  }

  /**
   * Internal method to send the actual MessagePack message
   */
  private sendMsgpackMessage(type: string, payload: Record<string, unknown>): Promise<unknown> {
    const id = `msg_${this.messageId++}`;
    const message: MsgpackMessage = { id, type, payload };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Encode to MessagePack
      const msgBuf = Buffer.from(encode(message));

      // Acquire buffer from pool (reduces allocations)
      const frameSize = 4 + msgBuf.length;
      const frame = this.bufferPool.acquire(frameSize);

      // Write length prefix and message
      frame.writeUInt32BE(msgBuf.length, 0);
      msgBuf.copy(frame, 4);

      // Write only the used portion of the buffer
      this.socket!.write(frame.slice(0, frameSize), () => {
        // Return buffer to pool after write completes
        this.bufferPool.release(frame);
      });
    });
  }

  registerEventHandler(callbackId: string, handler: (data: unknown) => void): void {
    this.eventHandlers.set(callbackId, handler as (data: Record<string, unknown>) => void);
  }

  on(eventType: string, handler: (data: unknown) => void): void {
    this.eventHandlers.set(eventType, handler as (data: Record<string, unknown>) => void);
  }

  off(eventType: string, handler?: (data: unknown) => void): void {
    this.eventHandlers.delete(eventType);
  }

  /**
   * Register a callback to be called when the bridge process exits
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
    // Mark bridge as exiting to prevent new requests during quit
    this.bridgeExiting = true;

    this.send('quit', {}).catch(() => {
      // Ignore errors during quit
    });
    setTimeout(() => {
      this.shutdown();
    }, 1000);
  }

  async waitForPendingRequests(timeoutMs: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    while (this.pendingRequests.size > 0) {
      if (Date.now() - startTime > timeoutMs) {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return true;
  }

  shutdown(): void {
    // Mark bridge as exiting to prevent new requests during shutdown
    this.bridgeExiting = true;

    if (this.socket) {
      this.socket.destroy();
      this.socket = undefined;
    }
    // Reset buffer state
    this.receiveLength = 0;
    this.bufferPool.clear();
    if (this.process && !this.process.killed) {
      // Send shutdown signal via stdin
      try {
        this.process.stdin?.write('shutdown\n');
      } catch (err) {
        // Ignore errors
      }
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGTERM');
        }
      }, 500);
    }
  }
}
