import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

export interface GrpcConnectionInfo {
  grpcPort: number;
  token: string;
  protocol: string;
}

export interface Event {
  type: string;
  widgetId: string;
  data?: Record<string, any>;
}

/**
 * GrpcBridgeConnection - Connects to tsyne-bridge via gRPC protocol
 *
 * Flow:
 * 1. Spawn bridge with --mode=grpc
 * 2. Bridge sends {grpcPort, token, protocol} via stdout
 * 3. Connect to gRPC server with auth token
 * 4. All subsequent communication via gRPC
 */
export class GrpcBridgeConnection {
  private process: ChildProcess;
  private client: any;
  private eventHandlers = new Map<string, (data: any) => void>();
  private readyPromise: Promise<void>;
  private readyResolve?: () => void;
  private connectionInfo?: GrpcConnectionInfo;
  private eventStream?: grpc.ClientReadableStream<any>;

  constructor(testMode: boolean = false) {
    // Detect if running from pkg
    const isPkg = typeof (process as any).pkg !== 'undefined';

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

    // Start bridge in gRPC mode
    const args = ['--mode=grpc'];
    if (testMode) {
      args.push('--headless');
    }

    this.process = spawn(bridgePath, args, {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    // Create promise that resolves when gRPC is connected
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    // Read connection info from stdout (single JSON line)
    let buffer = '';
    this.process.stdout!.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');

      // Look for newline - connection info is sent as single line
      const newlineIdx = buffer.indexOf('\n');
      if (newlineIdx !== -1) {
        const jsonLine = buffer.substring(0, newlineIdx);
        buffer = buffer.substring(newlineIdx + 1);

        try {
          const info = JSON.parse(jsonLine) as GrpcConnectionInfo;
          if (info.protocol === 'grpc' && info.grpcPort && info.token) {
            this.connectionInfo = info;
            this.connectGrpc(info);
          }
        } catch (err) {
          console.error('Error parsing gRPC connection info:', err);
        }
      }
    });

    this.process.on('error', (err) => {
      console.error('Bridge process error:', err);
    });

    this.process.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Bridge process exited with code ${code}`);
      }
    });
  }

  private async connectGrpc(info: GrpcConnectionInfo): Promise<void> {
    // Load proto definition
    const isCompiled = __dirname.includes(path.sep + 'dist' + path.sep);
    const projectRoot = isCompiled
      ? path.join(__dirname, '..', '..')
      : path.join(__dirname, '..');
    const protoPath = path.join(projectRoot, 'bridge', 'proto', 'bridge.proto');

    const packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: false,  // Convert snake_case to camelCase
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    const BridgeService = protoDescriptor.bridge.BridgeService;

    // Create client with insecure credentials
    // Auth token will be passed via metadata on each call
    this.client = new BridgeService(
      `localhost:${info.grpcPort}`,
      grpc.credentials.createInsecure()
    );

    // Store token for use in calls
    (this as any).authToken = info.token;

    // Subscribe to events
    this.subscribeToEvents();

    // Signal ready
    if (this.readyResolve) {
      this.readyResolve();
    }
  }

  private subscribeToEvents(): void {
    if (!this.client) return;

    const request = { eventTypes: [] }; // Subscribe to all events

    // Create metadata with auth token
    const metadata = new grpc.Metadata();
    metadata.add('authorization', (this as any).authToken);

    const stream = this.client.subscribeEvents(request, metadata);
    this.eventStream = stream;

    stream.on('data', (event: any) => {
      this.handleEvent({
        type: event.type,
        widgetId: event.widgetId,
        data: event.data ? Object.fromEntries(Object.entries(event.data)) : {}
      });
    });

    stream.on('error', (err: Error) => {
      // Stream errors are expected on shutdown
      if (!err.message.includes('CANCELLED')) {
        console.error('Event stream error:', err);
      }
    });

    stream.on('end', () => {
      // Stream ended
    });
  }

  private handleEvent(event: Event): void {
    if (event.type === 'callback' && event.data?.callbackId) {
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

  /**
   * Send a message via gRPC - maps message types to gRPC methods
   */
  async send(type: string, payload: Record<string, any>): Promise<any> {
    await this.readyPromise;

    if (!this.client) {
      throw new Error('gRPC client not connected');
    }

    return new Promise((resolve, reject) => {
      // Map message type to gRPC method and request
      const { method, request } = this.mapMessageToGrpc(type, payload);

      if (!method) {
        // Fall back - this message type isn't implemented in gRPC yet
        console.warn(`gRPC method not implemented for: ${type}`);
        resolve({});
        return;
      }

      // Create metadata with auth token
      const metadata = new grpc.Metadata();
      metadata.add('authorization', (this as any).authToken);

      this.client[method](request, metadata, (err: Error | null, response: any) => {
        if (err) {
          reject(err);
        } else {
          if (response && !response.success && response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response?.result || {});
          }
        }
      });
    });
  }

  /**
   * Maps JSON-RPC message types to gRPC method calls
   */
  private mapMessageToGrpc(type: string, payload: Record<string, any>): { method: string | null; request: any } {
    switch (type) {
      // Window operations
      case 'createWindow':
        return {
          method: 'createWindow',
          request: {
            windowId: payload.windowId,
            title: payload.title,
            width: payload.width,
            height: payload.height,
            fixedSize: payload.fixedSize || false
          }
        };
      case 'showWindow':
        return { method: 'showWindow', request: { windowId: payload.windowId } };
      case 'setContent':
        return {
          method: 'setContent',
          request: { windowId: payload.windowId, widgetId: payload.widgetId }
        };
      case 'resizeWindow':
        return {
          method: 'resizeWindow',
          request: { windowId: payload.windowId, width: payload.width, height: payload.height }
        };
      case 'setWindowTitle':
        return {
          method: 'setWindowTitle',
          request: { windowId: payload.windowId, title: payload.title }
        };
      case 'centerWindow':
        return { method: 'centerWindow', request: { windowId: payload.windowId } };
      case 'setWindowFullScreen':
        return {
          method: 'setWindowFullScreen',
          request: { windowId: payload.windowId, fullscreen: payload.fullScreen }
        };

      // Widget creation
      case 'createLabel':
        return {
          method: 'createLabel',
          request: {
            widgetId: payload.widgetId || payload.id,
            text: payload.text,
            bold: payload.bold || false,
            alignment: payload.alignment || 0
          }
        };
      case 'createButton':
        return {
          method: 'createButton',
          request: {
            widgetId: payload.widgetId || payload.id,
            text: payload.text,
            callbackId: payload.callbackId || '',
            important: payload.important || false
          }
        };
      case 'createEntry':
        return {
          method: 'createEntry',
          request: {
            widgetId: payload.widgetId || payload.id,
            placeholder: payload.placeholder || '',
            callbackId: payload.callbackId || '',
            width: payload.width || 0,
            multiline: false,
            password: false
          }
        };
      case 'createMultiLineEntry':
        return {
          method: 'createEntry',
          request: {
            widgetId: payload.widgetId || payload.id,
            placeholder: payload.placeholder || '',
            callbackId: payload.callbackId || '',
            width: payload.width || 0,
            multiline: true,
            password: false
          }
        };
      case 'createPasswordEntry':
        return {
          method: 'createEntry',
          request: {
            widgetId: payload.widgetId || payload.id,
            placeholder: payload.placeholder || '',
            callbackId: payload.callbackId || '',
            width: payload.width || 0,
            multiline: false,
            password: true
          }
        };
      case 'createVBox':
        return { method: 'createVBox', request: { widgetId: payload.widgetId || payload.id } };
      case 'createHBox':
        return { method: 'createHBox', request: { widgetId: payload.widgetId || payload.id } };
      case 'createCheckbox':
        return {
          method: 'createCheckbox',
          request: {
            widgetId: payload.widgetId || payload.id,
            text: payload.text,
            checked: payload.checked || false,
            callbackId: payload.callbackId || ''
          }
        };
      case 'createSelect':
        return {
          method: 'createSelect',
          request: {
            widgetId: payload.widgetId || payload.id,
            options: payload.options || [],
            selected: payload.selected || 0,
            callbackId: payload.callbackId || ''
          }
        };
      case 'createImage':
        const imgRequest: any = {
          widgetId: payload.widgetId || payload.id,
          width: payload.width || 0,
          height: payload.height || 0,
          callbackId: payload.callbackId || '',
          dragCallbackId: payload.dragCallbackId || '',
          doubleTapCallbackId: payload.doubleTapCallbackId || ''
        };
        if (payload.resource) {
          imgRequest.resourceName = payload.resource;
        } else if (payload.source) {
          // Handle base64 inline data
          if (payload.source.startsWith('data:')) {
            const base64Data = payload.source.split(',')[1];
            imgRequest.inlineData = Buffer.from(base64Data, 'base64');
          }
        }
        return { method: 'createImage', request: imgRequest };

      // Resources
      case 'registerResource':
        return {
          method: 'registerResource',
          request: {
            name: payload.name,
            data: Buffer.from(payload.data, 'base64')
          }
        };
      case 'unregisterResource':
        return { method: 'unregisterResource', request: { name: payload.name } };

      // Widget updates
      case 'setText':
        return {
          method: 'setText',
          request: { widgetId: payload.widgetId, text: payload.text }
        };
      case 'getText':
        return { method: 'getText', request: { widgetId: payload.widgetId } };
      case 'setProgress':
        return {
          method: 'setProgress',
          request: { widgetId: payload.widgetId, value: payload.value }
        };
      case 'getProgress':
        return { method: 'getProgress', request: { widgetId: payload.widgetId } };
      case 'setChecked':
        return {
          method: 'setChecked',
          request: { widgetId: payload.widgetId, checked: payload.checked }
        };
      case 'getChecked':
        return { method: 'getChecked', request: { widgetId: payload.widgetId } };

      // Interactions
      case 'clickWidget':
        return { method: 'clickWidget', request: { widgetId: payload.widgetId } };
      case 'typeText':
        return {
          method: 'typeText',
          request: { widgetId: payload.widgetId, text: payload.text }
        };
      case 'doubleTapWidget':
        return { method: 'doubleTapWidget', request: { widgetId: payload.widgetId } };
      case 'rightClickWidget':
        return { method: 'rightClickWidget', request: { widgetId: payload.widgetId } };
      case 'dragWidget':
        return {
          method: 'dragWidget',
          request: { widgetId: payload.widgetId, deltaX: payload.deltaX, deltaY: payload.deltaY }
        };

      // Custom IDs
      case 'registerCustomId':
        return {
          method: 'registerCustomId',
          request: { customId: payload.customId, widgetId: payload.widgetId }
        };

      // Queries
      case 'findWidget':
        return {
          method: 'findWidget',
          request: { selector: payload.selector, type: payload.type }
        };
      case 'getWidgetInfo':
        return { method: 'getWidgetInfo', request: { widgetId: payload.widgetId } };
      case 'getAllWidgets':
        return { method: 'getAllWidgets', request: {} };

      // Lifecycle
      case 'quit':
        return { method: 'quit', request: {} };

      // Update image
      case 'updateImage':
        const updateRequest: any = { widgetId: payload.widgetId };
        if (payload.resource) {
          updateRequest.resourceName = payload.resource;
        } else if (payload.source) {
          if (payload.source.startsWith('data:')) {
            const base64Data = payload.source.split(',')[1];
            updateRequest.inlineData = Buffer.from(base64Data, 'base64');
          }
        }
        return { method: 'updateImage', request: updateRequest };

      default:
        // Not implemented in gRPC
        return { method: null, request: null };
    }
  }

  registerEventHandler(callbackId: string, handler: (data: any) => void): void {
    this.eventHandlers.set(callbackId, handler);
  }

  on(eventType: string, handler: (data: any) => void): void {
    this.eventHandlers.set(eventType, handler);
  }

  off(eventType: string, handler?: (data: any) => void): void {
    this.eventHandlers.delete(eventType);
  }

  async registerCustomId(widgetId: string, customId: string): Promise<any> {
    return this.send('registerCustomId', { widgetId, customId });
  }

  async getParent(widgetId: string): Promise<string> {
    // Not implemented in gRPC proto yet - would need to add
    console.warn('getParent not implemented in gRPC mode');
    return '';
  }

  async clickToolbarAction(toolbarId: string, actionLabel: string): Promise<any> {
    // Not implemented in gRPC proto yet
    console.warn('clickToolbarAction not implemented in gRPC mode');
    return {};
  }

  quit(): void {
    this.send('quit', {}).catch(() => {});
    setTimeout(() => {
      this.shutdown();
    }, 1000);
  }

  async waitForPendingRequests(timeoutMs: number = 1000): Promise<boolean> {
    // gRPC is synchronous request/response, no pending requests to wait for
    return true;
  }

  shutdown(): void {
    // Cancel event stream
    if (this.eventStream) {
      this.eventStream.cancel();
    }

    // Close gRPC client
    if (this.client) {
      grpc.closeClient(this.client);
    }

    // Clear handlers
    this.eventHandlers.clear();

    // Send shutdown signal to bridge
    if (this.process && this.process.stdin) {
      this.process.stdin.write('shutdown\n');
    }

    // Kill process if still alive
    if (this.process && !this.process.killed) {
      try {
        this.process.kill();
      } catch (err) {
        // Process might already be dead
      }
    }
  }
}
