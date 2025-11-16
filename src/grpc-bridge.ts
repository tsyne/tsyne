import { spawn, ChildProcess } from 'child_process';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import * as fs from 'fs';

// Type definitions for the generated gRPC client
interface BridgeClient extends grpc.Client {
  CreateWindow: (
    request: any,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  ShowWindow: (
    request: any,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  SetContent: (
    request: any,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  CreateImage: (
    request: any,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  CreateLabel: (
    request: any,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  CreateButton: (
    request: any,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  CreateVBox: (
    request: any,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  CreateHBox: (
    request: any,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  RegisterResource: (
    request: any,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  UnregisterResource: (
    request: any,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  UpdateImage: (
    request: any,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  SetText: (
    request: any,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  ClickWidget: (
    request: any,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  RegisterCustomId: (
    request: any,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  FindWidget: (
    request: any,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  Quit: (
    request: any,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
}

/**
 * GrpcBridge provides high-performance binary protocol communication with the Fyne bridge
 * instead of JSON-RPC over stdio.
 *
 * Usage:
 *   const bridge = new GrpcBridge();
 *   await bridge.connect();
 *   await bridge.createWindow({ windowId: 'win1', title: 'My App', width: 800, height: 600 });
 *   bridge.shutdown();
 */
export class GrpcBridge {
  private client?: BridgeClient;
  private process?: ChildProcess;
  private token?: string;
  private port?: number;
  private connected = false;

  /**
   * Connect to the bridge by spawning the tsyne-bridge process in gRPC mode
   */
  async connect(bridgePath?: string): Promise<void> {
    // Determine bridge path
    const defaultBridgePath = path.join(__dirname, '..', 'bin', 'tsyne-bridge');
    const actualBridgePath = bridgePath || defaultBridgePath;

    // Check if bridge exists
    if (!fs.existsSync(actualBridgePath)) {
      throw new Error(`Bridge not found at: ${actualBridgePath}`);
    }

    // Start bridge process in gRPC mode
    this.process = spawn(actualBridgePath, ['--mode=grpc']);

    // Wait for connection info on stdout
    const initPromise = new Promise<{ port: number; token: string }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for bridge connection info'));
      }, 5000);

      this.process!.stdout!.once('data', (data) => {
        clearTimeout(timeout);
        try {
          const init = JSON.parse(data.toString().trim());
          if (init.protocol === 'grpc' && init.grpcPort && init.token) {
            resolve({ port: init.grpcPort, token: init.token });
          } else {
            reject(new Error('Invalid connection info from bridge'));
          }
        } catch (err) {
          reject(new Error(`Failed to parse bridge connection info: ${err}`));
        }
      });

      this.process!.stderr!.on('data', (data) => {
        console.error('[Bridge stderr]', data.toString());
      });

      this.process!.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Bridge process error: ${err.message}`));
      });

      this.process!.on('exit', (code, signal) => {
        if (code !== null && code !== 0) {
          console.error(`[Bridge] Process exited with code ${code}`);
        }
        if (signal) {
          console.error(`[Bridge] Process killed with signal ${signal}`);
        }
      });
    });

    const { port, token } = await initPromise;
    this.port = port;
    this.token = token;

    // Create gRPC client
    await this.createGrpcClient(port, token);

    this.connected = true;
    console.log(`[gRPC] Connected to bridge on port ${port}`);
  }

  /**
   * Create the gRPC client
   */
  private async createGrpcClient(port: number, token: string): Promise<void> {
    // Load proto file
    const protoPath = path.join(__dirname, '..', 'bridge', 'proto', 'bridge.proto');

    if (!fs.existsSync(protoPath)) {
      throw new Error(`Proto file not found at: ${protoPath}`);
    }

    const packageDefinition = await protoLoader.load(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    const BridgeService = protoDescriptor.bridge.BridgeService;

    this.client = new BridgeService(
      `localhost:${port}`,
      grpc.credentials.createInsecure(),
      {
        'grpc.max_receive_message_length': 100 * 1024 * 1024, // 100MB
        'grpc.max_send_message_length': 100 * 1024 * 1024, // 100MB
      }
    ) as BridgeClient;
  }

  /**
   * Get metadata with auth token
   */
  private getMetadata(): grpc.Metadata {
    const metadata = new grpc.Metadata();
    if (this.token) {
      metadata.add('authorization', this.token);
    }
    return metadata;
  }

  /**
   * Generic RPC call wrapper
   */
  private async call<TRequest, TResponse>(
    method: string,
    request: TRequest
  ): Promise<TResponse> {
    if (!this.client) {
      throw new Error('gRPC client not connected');
    }

    return new Promise((resolve, reject) => {
      const metadata = this.getMetadata();
      const methodFn = (this.client as any)[method];

      if (!methodFn) {
        reject(new Error(`Method ${method} not found on client`));
        return;
      }

      methodFn.call(
        this.client,
        request,
        metadata,
        (error: grpc.ServiceError | null, response: TResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Create a window
   */
  async createWindow(params: {
    windowId: string;
    title: string;
    width: number;
    height: number;
    fixedSize?: boolean;
  }): Promise<void> {
    await this.call('CreateWindow', {
      window_id: params.windowId,
      title: params.title,
      width: params.width,
      height: params.height,
      fixed_size: params.fixedSize || false,
    });
  }

  /**
   * Show a window
   */
  async showWindow(windowId: string): Promise<void> {
    await this.call('ShowWindow', {
      window_id: windowId,
    });
  }

  /**
   * Set window content
   */
  async setContent(windowId: string, widgetId: string): Promise<void> {
    await this.call('SetContent', {
      window_id: windowId,
      widget_id: widgetId,
    });
  }

  /**
   * Create an image widget
   */
  async createImage(params: {
    widgetId: string;
    source?: { resource?: string; inlineData?: Buffer };
    width?: number;
    height?: number;
    callbackId?: string;
  }): Promise<void> {
    const request: any = {
      widget_id: params.widgetId,
      width: params.width || 0,
      height: params.height || 0,
    };

    if (params.source?.resource) {
      request.resource_name = params.source.resource;
    } else if (params.source?.inlineData) {
      request.inline_data = params.source.inlineData;
    }

    if (params.callbackId) {
      request.callback_id = params.callbackId;
    }

    await this.call('CreateImage', request);
  }

  /**
   * Create a label widget
   */
  async createLabel(params: {
    widgetId: string;
    text: string;
    bold?: boolean;
    alignment?: number;
  }): Promise<void> {
    await this.call('CreateLabel', {
      widget_id: params.widgetId,
      text: params.text,
      bold: params.bold || false,
      alignment: params.alignment || 0,
    });
  }

  /**
   * Create a button widget
   */
  async createButton(params: {
    widgetId: string;
    text: string;
    callbackId?: string;
    important?: boolean;
  }): Promise<void> {
    await this.call('CreateButton', {
      widget_id: params.widgetId,
      text: params.text,
      callback_id: params.callbackId || '',
      important: params.important || false,
    });
  }

  /**
   * Create a VBox container
   */
  async createVBox(widgetId: string): Promise<void> {
    await this.call('CreateVBox', {
      widget_id: widgetId,
    });
  }

  /**
   * Create an HBox container
   */
  async createHBox(widgetId: string): Promise<void> {
    await this.call('CreateHBox', {
      widget_id: widgetId,
    });
  }

  /**
   * Register a reusable resource (image)
   */
  async registerResource(name: string, data: Buffer): Promise<void> {
    await this.call('RegisterResource', {
      name,
      data, // Raw bytes, not base64!
    });
  }

  /**
   * Unregister a resource
   */
  async unregisterResource(name: string): Promise<void> {
    await this.call('UnregisterResource', {
      name,
    });
  }

  /**
   * Update an image widget
   */
  async updateImage(params: {
    widgetId: string;
    source?: { resource?: string; inlineData?: Buffer };
  }): Promise<void> {
    const request: any = {
      widget_id: params.widgetId,
    };

    if (params.source?.resource) {
      request.resource_name = params.source.resource;
    } else if (params.source?.inlineData) {
      request.inline_data = params.source.inlineData;
    }

    await this.call('UpdateImage', request);
  }

  /**
   * Set widget text
   */
  async setText(widgetId: string, text: string): Promise<void> {
    await this.call('SetText', {
      widget_id: widgetId,
      text,
    });
  }

  /**
   * Click a widget (for testing)
   */
  async clickWidget(widgetId: string): Promise<void> {
    await this.call('ClickWidget', {
      widget_id: widgetId,
    });
  }

  /**
   * Register a custom ID for a widget
   */
  async registerCustomId(customId: string, widgetId: string): Promise<void> {
    await this.call('RegisterCustomId', {
      custom_id: customId,
      widget_id: widgetId,
    });
  }

  /**
   * Find widgets by selector
   */
  async findWidget(selector: string, type: string): Promise<string[]> {
    const response: any = await this.call('FindWidget', {
      selector,
      type,
    });
    return response.widget_ids || [];
  }

  /**
   * Quit the application
   */
  async quit(): Promise<void> {
    await this.call('Quit', {});
  }

  /**
   * Shutdown the bridge
   */
  shutdown(): void {
    if (this.process && !this.process.killed) {
      // Send shutdown signal via stdin
      this.process.stdin?.write('shutdown\n');
      this.process.kill();
    }
    this.connected = false;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}
