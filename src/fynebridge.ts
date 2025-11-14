import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as crc32 from 'buffer-crc32';

export interface Message {
  id: string;
  type: string;
  payload: Record<string, any>;
}

export interface Response {
  id: string;
  success: boolean;
  result?: Record<string, any>;
  error?: string;
}

export interface Event {
  type: string;
  widgetId: string;
  data?: Record<string, any>;
}

export class BridgeConnection {
  private process: ChildProcess;
  private messageId = 0;
  private pendingRequests = new Map<string, {
    resolve: (result: any) => void;
    reject: (error: Error) => void;
  }>();
  private eventHandlers = new Map<string, (data: any) => void>();
  private readyPromise: Promise<void>;
  private readyResolve?: () => void;
  private buffer = Buffer.alloc(0); // Accumulate incoming data
  private readingFrame = false;

  constructor(testMode: boolean = false) {
    // Detect if running from pkg
    const isPkg = typeof (process as any).pkg !== 'undefined';

    let bridgePath: string;
    if (isPkg) {
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
      // Only log non-zero exit codes (errors)
      if (code !== 0) {
        console.error(`Bridge process exited with code ${code}`);
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
        pending.reject(new Error(response.error || 'Unknown error'));
      }
    }
  }

  private handleEvent(event: Event): void {
    if (event.type === 'callback' && event.data?.callbackId) {
      const handler = this.eventHandlers.get(event.data.callbackId);
      if (handler) {
        handler(event.data);
      }
    } else {
      // Handle other event types (e.g., hyperlinkNavigation)
      const handler = this.eventHandlers.get(event.type);
      if (handler) {
        handler(event.data);
      }
    }
  }

  /**
   * Wait for the bridge to be ready to receive commands
   */
  async waitUntilReady(): Promise<void> {
    return this.readyPromise;
  }

  async send(type: string, payload: Record<string, any>): Promise<any> {
    // Wait for bridge to be ready before sending commands
    await this.readyPromise;

    const id = `msg_${this.messageId++}`;
    const message: Message = { id, type, payload };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // IPC Safeguard: Write framed message with length-prefix and CRC32 validation
      // Frame format: [uint32 length][uint32 crc32][json bytes]
      const jsonBuffer = Buffer.from(JSON.stringify(message), 'utf8');
      const checksum = crc32.unsigned(jsonBuffer);

      // Create frame buffer: length (4 bytes) + crc32 (4 bytes) + json
      const frame = Buffer.alloc(8 + jsonBuffer.length);
      frame.writeUInt32BE(jsonBuffer.length, 0); // Write length
      frame.writeUInt32BE(checksum, 4); // Write CRC32
      jsonBuffer.copy(frame, 8); // Copy JSON payload

      this.process.stdin!.write(frame);
    });
  }

  registerEventHandler(callbackId: string, handler: (data: any) => void): void {
    this.eventHandlers.set(callbackId, handler);
  }

  quit(): void {
    this.send('quit', {});
    setTimeout(() => {
      if (!this.process.killed) {
        this.process.kill();
      }
    }, 1000);
  }
}
