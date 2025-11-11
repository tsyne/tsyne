import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as readline from 'readline';

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

  constructor(testMode: boolean = false) {
    // Detect if running from pkg
    const isPkg = typeof (process as any).pkg !== 'undefined';

    let bridgePath: string;
    if (isPkg) {
      // When running from pkg, look for bridge next to the executable
      const execDir = path.dirname(process.execPath);
      bridgePath = path.join(execDir, 'tsyne-bridge');
    } else {
      // Normal mode: look in bin/ directory relative to project root
      // __dirname will be dist/src, so go up two levels to get to project root
      bridgePath = path.join(__dirname, '..', '..', 'bin', 'tsyne-bridge');
    }

    const args = testMode ? ['--headless'] : [];
    this.process = spawn(bridgePath, args, {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    // Create promise that resolves when bridge is ready
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    const rl = readline.createInterface({
      input: this.process.stdout!,
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      try {
        const data = JSON.parse(line);

        if ('type' in data && data.type === 'callback') {
          // This is an event
          this.handleEvent(data as Event);
        } else {
          // This is a response
          this.handleResponse(data as Response);
        }
      } catch (err) {
        console.error('Error parsing bridge message:', err);
      }
    });

    this.process.on('error', (err) => {
      console.error('Bridge process error:', err);
    });

    this.process.on('exit', (code) => {
      console.log(`Bridge process exited with code ${code}`);
    });
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
      this.process.stdin!.write(JSON.stringify(message) + '\n');
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
