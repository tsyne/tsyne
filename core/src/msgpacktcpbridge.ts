import * as net from 'net';
import * as tls from 'tls';
import * as fs from 'fs';
import { encode, decode } from '@msgpack/msgpack';
import { BridgeInterface } from './fynebridge';

interface Event {
  type: string;
  widgetId: string;
  data?: Record<string, unknown>;
}

class BufferPool {
  private pool: Buffer[] = [];
  private readonly maxSize = 10;
  private readonly bufferSize = 8192;

  acquire(minSize: number): Buffer {
    if (this.pool.length > 0) {
      const buf = this.pool.pop()!;
      if (buf.length >= minSize) {
        return buf;
      }
    }
    return Buffer.allocUnsafe(Math.max(this.bufferSize, minSize));
  }

  release(buf: Buffer): void {
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

export interface ReconnectConfig {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export interface MsgpackTlsConfig {
  tls?: boolean;
  caCertPath?: string;
}

/**
 * MsgpackTcpBridgeConnection - Connects to a standalone tsyne-bridge over TCP
 *
 * Unlike MsgpackBridgeConnection which spawns the bridge as a child process,
 * this connects to an already-running bridge server over TCP. This enables
 * the "remote bridge" architecture where the bridge runs on a machine with
 * a display/GPU and the driver connects over the network.
 *
 * Supports transparent reconnection: if the socket drops unexpectedly, the
 * connection enters a RECONNECTING state with exponential backoff. send()
 * calls block until the connection is re-established. Event handlers survive
 * across reconnections.
 *
 * Configuration via environment variables:
 * - TSYNE_BRIDGE_HOST: hostname/IP (default: localhost)
 * - TSYNE_BRIDGE_PORT: port number (default: 9800)
 * - TSYNE_TOKEN: shared secret for auth (optional for localhost)
 */
export class MsgpackTcpBridgeConnection implements BridgeInterface {
  private socket?: net.Socket;
  private eventHandlers = new Map<string, (data: Record<string, unknown>) => void>();
  private connectionPromise: Promise<void>;
  private connectionResolve?: () => void;
  private connectionReject?: (err: Error) => void;
  private readyPromise: Promise<void>;
  private messageId = 0;
  private pendingRequests = new Map<string, {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private receiveBuffer = Buffer.allocUnsafe(65536);
  private receiveLength = 0;
  private bufferPool = new BufferPool();
  private onExitCallback?: () => void;
  public bridgeExiting = false;

  private host: string;
  private port: number;
  private token: string;
  private tlsConfig?: MsgpackTlsConfig;

  // Reconnection state
  private reconnecting = false;
  private intentionalShutdown = false;
  private reconnectMaxAttempts: number;
  private reconnectBaseDelayMs: number;
  private reconnectMaxDelayMs: number;

  constructor(
    _testMode: boolean = false,
    host?: string,
    port?: number,
    token?: string,
    reconnectConfig?: ReconnectConfig,
    tlsConfig?: MsgpackTlsConfig,
  ) {
    this.host = host || process.env.TSYNE_BRIDGE_HOST || 'localhost';
    this.port = port || parseInt(process.env.TSYNE_BRIDGE_PORT || '9800', 10);
    this.token = token || process.env.TSYNE_TOKEN || '';
    this.tlsConfig = tlsConfig;

    this.reconnectMaxAttempts = reconnectConfig?.maxAttempts ?? 10;
    this.reconnectBaseDelayMs = reconnectConfig?.baseDelayMs ?? 500;
    this.reconnectMaxDelayMs = reconnectConfig?.maxDelayMs ?? 10000;

    this.connectionPromise = new Promise((resolve, reject) => {
      this.connectionResolve = resolve;
      this.connectionReject = reject;
    });
    // Alias for backward compat with waitUntilReady()
    this.readyPromise = this.connectionPromise;

    // Initial connection — chain result to connectionPromise
    this.connectToHost().then(
      () => { if (this.connectionResolve) this.connectionResolve(); },
      (err) => { if (this.connectionReject) this.connectionReject(err); },
    );
  }

  private connectToHost(): Promise<void> {
    const debug = process.env.TSYNE_DEBUG === '1';
    if (debug) {
      console.error(`[msgpack-tcp] Connecting to ${this.host}:${this.port}`);
    }

    return new Promise<void>((resolve, reject) => {
      const CONNECT_TIMEOUT_MS = 5000;
      let timeoutHandle: NodeJS.Timeout | null = null;
      let settled = false;

      if (this.tlsConfig?.tls) {
        const tlsOpts: tls.ConnectionOptions = { host: this.host, port: this.port };
        if (this.tlsConfig.caCertPath) {
          tlsOpts.ca = fs.readFileSync(this.tlsConfig.caCertPath);
        }
        this.socket = tls.connect(tlsOpts);
      } else {
        this.socket = net.createConnection({ host: this.host, port: this.port });
      }

      const connectEvent = this.tlsConfig?.tls ? 'secureConnect' : 'connect';

      const onError = (err: Error) => {
        if (settled) return;
        settled = true;
        if (timeoutHandle) clearTimeout(timeoutHandle);
        // TODO: Log connection failures for remote bridge mode (security auditing).
        // Localhost failures are just "bridge not ready yet", but remote TCP
        // connections should log failed attempts to detect unauthorized access.
        reject(err);
      };

      this.socket.once('error', onError);

      timeoutHandle = setTimeout(() => {
        try { this.socket?.destroy(); } catch { /* ignore */ }
        onError(new Error(`TCP connect timeout after ${CONNECT_TIMEOUT_MS}ms (${this.host}:${this.port})`));
      }, CONNECT_TIMEOUT_MS);

      this.socket.once(connectEvent, async () => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        // Remove the one-shot error handler — ongoing errors handled below
        this.socket!.removeListener('error', onError);
        if (debug) {
          console.error('[msgpack-tcp] Connected');
        }

        // Set up data handling
        this.socket!.on('data', (chunk: Buffer) => this.handleData(chunk));
        this.socket!.on('close', () => {
          if (debug) console.error('[msgpack-tcp] Socket closed');
          this.handleSocketClose();
        });
        this.socket!.on('error', (err: Error) => {
          // Log but don't crash — the 'close' event follows and triggers reconnect
          if (debug) console.error(`[msgpack-tcp] Socket error: ${err.message}`);
        });

        // Perform auth handshake if token is set
        if (this.token) {
          try {
            await this.authenticate();
          } catch (err) {
            if (!settled) {
              settled = true;
              reject(err as Error);
            }
            return;
          }
        }

        if (!settled) {
          settled = true;
          resolve();
        }
      });
    });
  }

  private handleSocketClose(): void {
    if (this.intentionalShutdown) {
      if (this.onExitCallback) {
        this.onExitCallback();
      }
      return;
    }
    this.startReconnect();
  }

  private async startReconnect(): Promise<void> {
    if (this.reconnecting) return;
    this.reconnecting = true;

    const debug = process.env.TSYNE_DEBUG === '1';
    if (debug) {
      console.error('[msgpack-tcp] Connection lost, starting reconnection...');
    }

    // Reject all pending requests — their responses will never arrive
    const lostErr = new Error('Connection lost, reconnecting');
    for (const [, pending] of this.pendingRequests) {
      pending.reject(lostErr);
    }
    this.pendingRequests.clear();

    // Destroy old socket, reset receive buffer
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = undefined;
    }
    this.receiveLength = 0;

    // Create new connectionPromise — send() will await this
    this.resetConnectionPromise();

    let delay = this.reconnectBaseDelayMs;
    for (let attempt = 1; attempt <= this.reconnectMaxAttempts; attempt++) {
      if (this.intentionalShutdown) {
        this.reconnecting = false;
        return;
      }

      if (debug) {
        console.error(`[msgpack-tcp] Reconnect attempt ${attempt}/${this.reconnectMaxAttempts} (delay: ${delay}ms)`);
      }

      await new Promise(r => setTimeout(r, delay));

      if (this.intentionalShutdown) {
        this.reconnecting = false;
        return;
      }

      try {
        await this.connectToHost();
        // Success — resolve connectionPromise so blocked send() calls proceed
        if (debug) {
          console.error('[msgpack-tcp] Reconnected successfully');
        }
        if (this.connectionResolve) this.connectionResolve();
        this.reconnecting = false;
        return;
      } catch {
        // Failed — double delay and try again
        delay = Math.min(delay * 2, this.reconnectMaxDelayMs);
      }
    }

    // Max retries exhausted — permanent failure
    if (debug) {
      console.error('[msgpack-tcp] Reconnection failed after max retries');
    }
    this.reconnecting = false;
    this.intentionalShutdown = true;
    this.bridgeExiting = true;
    if (this.connectionReject) {
      this.connectionReject(new Error(`Reconnection failed after ${this.reconnectMaxAttempts} attempts`));
    }
    if (this.onExitCallback) {
      this.onExitCallback();
    }
  }

  private resetConnectionPromise(): void {
    this.connectionPromise = new Promise((resolve, reject) => {
      this.connectionResolve = resolve;
      this.connectionReject = reject;
    });
    this.readyPromise = this.connectionPromise;
  }

  private authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      const authId = `auth_${this.messageId++}`;
      const message: MsgpackMessage = {
        id: authId,
        type: 'auth',
        payload: { token: this.token },
      };

      // Register handler for auth response
      this.pendingRequests.set(authId, {
        resolve: () => resolve(),
        reject: (err) => reject(err),
      });

      // Send auth message
      const msgBuf = Buffer.from(encode(message));
      const frame = Buffer.allocUnsafe(4 + msgBuf.length);
      frame.writeUInt32BE(msgBuf.length, 0);
      msgBuf.copy(frame, 4);
      this.socket!.write(frame);
    });
  }

  private handleData(chunk: Buffer): void {
    // Ensure buffer has enough space
    if (this.receiveLength + chunk.length > this.receiveBuffer.length) {
      const newSize = Math.max(this.receiveBuffer.length * 2, this.receiveLength + chunk.length);
      const newBuffer = Buffer.allocUnsafe(newSize);
      this.receiveBuffer.copy(newBuffer, 0, 0, this.receiveLength);
      this.receiveBuffer = newBuffer;
    }

    chunk.copy(this.receiveBuffer, this.receiveLength);
    this.receiveLength += chunk.length;

    // Process complete messages
    let offset = 0;
    while (offset + 4 <= this.receiveLength) {
      const length = this.receiveBuffer.readUInt32BE(offset);

      if (offset + 4 + length > this.receiveLength) {
        break;
      }

      const msgBuf = this.receiveBuffer.slice(offset + 4, offset + 4 + length);
      offset += 4 + length;

      try {
        const data = decode(msgBuf) as MsgpackResponse | Event;

        if ('id' in data && 'success' in data) {
          const response = data as MsgpackResponse;
          if (!response.success && this.isAuthError(response.error)) {
            this.fatalAuthError(response.error || 'authentication failed');
            return;
          }
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
          this.handleEvent(data as Event);
        }
      } catch (err) {
        console.error('Failed to decode MessagePack:', err);
      }
    }

    // Compact buffer
    if (offset > 0) {
      if (offset < this.receiveLength) {
        this.receiveBuffer.copy(this.receiveBuffer, 0, offset, this.receiveLength);
      }
      this.receiveLength -= offset;
    }

    // Shrink if grown too large
    if (this.receiveBuffer.length > 262144 && this.receiveLength < this.receiveBuffer.length / 4) {
      const newBuffer = Buffer.allocUnsafe(65536);
      this.receiveBuffer.copy(newBuffer, 0, 0, this.receiveLength);
      this.receiveBuffer = newBuffer;
    }
  }

  private handleEvent(event: Event): void {
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

  private isAuthError(errorMsg?: string): boolean {
    if (!errorMsg) return false;
    return errorMsg.includes('auth') || errorMsg.includes('token');
  }

  private fatalAuthError(errorMsg: string): void {
    const fullMsg = `Bridge authentication failed (${this.host}:${this.port}): ${errorMsg}. `
      + `Check the --bridge URL — wrong host/port, missing #token, or wrong token`;
    console.error(`[msgpack-tcp] ${fullMsg}`);
    // Reject all pending requests with the auth error
    const authErr = new Error(fullMsg);
    for (const [, pending] of this.pendingRequests) {
      pending.reject(authErr);
    }
    this.pendingRequests.clear();
    this.shutdown();
  }

  async waitUntilReady(): Promise<void> {
    return this.readyPromise;
  }

  async send(type: string, payload: Record<string, unknown>): Promise<unknown> {
    if (this.intentionalShutdown) {
      return {};
    }

    try {
      await this.connectionPromise;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Bridge connection failed (${this.host}:${this.port}): ${msg}`);
    }

    if (!this.socket) {
      if (this.intentionalShutdown) {
        return {};
      }
      throw new Error('Socket not connected');
    }

    return this.sendMsgpackMessage(type, payload);
  }

  sendFireAndForget(type: string, payload: Record<string, unknown>): void {
    if (this.intentionalShutdown || this.reconnecting || !this.socket) {
      return;
    }

    const id = `ff_${this.messageId++}`;
    const message: MsgpackMessage = { id, type, payload };
    const msgBuf = Buffer.from(encode(message));
    const frameSize = 4 + msgBuf.length;
    const frame = this.bufferPool.acquire(frameSize);
    frame.writeUInt32BE(msgBuf.length, 0);
    msgBuf.copy(frame, 4);
    this.socket.write(frame.slice(0, frameSize), () => {
      this.bufferPool.release(frame);
    });
  }

  private sendMsgpackMessage(type: string, payload: Record<string, unknown>): Promise<unknown> {
    const id = `msg_${this.messageId++}`;
    const message: MsgpackMessage = { id, type, payload };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      const msgBuf = Buffer.from(encode(message));
      const frameSize = 4 + msgBuf.length;
      const frame = this.bufferPool.acquire(frameSize);
      frame.writeUInt32BE(msgBuf.length, 0);
      msgBuf.copy(frame, 4);
      this.socket!.write(frame.slice(0, frameSize), () => {
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

  off(eventType: string, _handler?: (data: unknown) => void): void {
    this.eventHandlers.delete(eventType);
  }

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
    this.intentionalShutdown = true;
    this.bridgeExiting = true;
    this.send('quit', {}).catch(() => {});
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
    this.intentionalShutdown = true;
    this.bridgeExiting = true;
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = undefined;
    }
    this.receiveLength = 0;
    this.bufferPool.clear();
  }
}
