import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as net from 'net';
import { encode, decode } from '@msgpack/msgpack';
import { BridgeInterface } from './fynebridge';

export interface MsgpackConnectionInfo {
  socketPath: string;
  protocol: string;
}

export interface Event {
  type: string;
  widgetId: string;
  data?: Record<string, unknown>;
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
  private process: ChildProcess;
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
  private receiveBuffer = Buffer.alloc(0);

  constructor(testMode: boolean = false) {
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

    // Create promise that resolves when connected
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
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
      });
    });
  }

  private handleData(chunk: Buffer): void {
    // Append to buffer
    this.receiveBuffer = Buffer.concat([this.receiveBuffer, chunk]);

    // Process complete messages
    while (this.receiveBuffer.length >= 4) {
      // Read length prefix (4 bytes, big-endian)
      const length = this.receiveBuffer.readUInt32BE(0);

      if (this.receiveBuffer.length < 4 + length) {
        // Not enough data yet
        break;
      }

      // Extract message
      const msgBuf = this.receiveBuffer.slice(4, 4 + length);
      this.receiveBuffer = this.receiveBuffer.slice(4 + length);

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
  }

  private handleEvent(event: Event): void {
    // Try to find handler by callback ID or event type
    const handlerKey = event.data?.callbackId as string || event.widgetId;
    const handler = this.eventHandlers.get(handlerKey) || this.eventHandlers.get(event.type);

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

  async send(type: string, payload: Record<string, unknown>): Promise<unknown> {
    await this.readyPromise;

    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    const id = `msg_${this.messageId++}`;
    const message: MsgpackMessage = { id, type, payload };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Encode to MessagePack
      const msgBuf = Buffer.from(encode(message));

      // Create frame: length (4 bytes) + message
      const frame = Buffer.alloc(4 + msgBuf.length);
      frame.writeUInt32BE(msgBuf.length, 0);
      msgBuf.copy(frame, 4);

      this.socket!.write(frame);
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
    if (this.socket) {
      this.socket.destroy();
      this.socket = undefined;
    }
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
