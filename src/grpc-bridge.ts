import { spawn, ChildProcess } from 'child_process';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import * as fs from 'fs';

// Request type definitions
interface CreateWindowRequest {
  window_id: string;
  title: string;
  width: number;
  height: number;
  fixed_size: boolean;
}

interface ShowWindowRequest {
  window_id: string;
}

interface SetContentRequest {
  window_id: string;
  widget_id: string;
}

interface CreateImageRequest {
  widget_id: string;
  resource_name?: string;
  inline_data?: Buffer;
  width: number;
  height: number;
  callback_id?: string;
}

interface CreateLabelRequest {
  widget_id: string;
  text: string;
  bold: boolean;
  alignment: number;
}

interface CreateButtonRequest {
  widget_id: string;
  text: string;
  callback_id: string;
  important: boolean;
}

interface CreateVBoxRequest {
  widget_id: string;
}

interface CreateHBoxRequest {
  widget_id: string;
}

interface RegisterResourceRequest {
  name: string;
  data: Buffer;
}

interface UnregisterResourceRequest {
  name: string;
}

interface UpdateImageRequest {
  widget_id: string;
  resource_name?: string;
  inline_data?: Buffer;
}

interface SetTextRequest {
  widget_id: string;
  text: string;
}

interface ClickWidgetRequest {
  widget_id: string;
}

interface RegisterCustomIdRequest {
  custom_id: string;
  widget_id: string;
}

interface FindWidgetRequest {
  selector: string;
  type: string;
}

interface QuitRequest {
  // Empty request
}

// Response type definitions
interface GenericResponse {
  success?: boolean;
  error?: string;
}

interface FindWidgetResponse extends GenericResponse {
  widget_ids?: string[];
}

// Type definitions for the generated gRPC client
interface BridgeClient extends grpc.Client {
  CreateWindow: (
    request: CreateWindowRequest,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: GenericResponse) => void
  ) => void;
  ShowWindow: (
    request: ShowWindowRequest,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: GenericResponse) => void
  ) => void;
  SetContent: (
    request: SetContentRequest,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: GenericResponse) => void
  ) => void;
  CreateImage: (
    request: CreateImageRequest,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: GenericResponse) => void
  ) => void;
  CreateLabel: (
    request: CreateLabelRequest,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: GenericResponse) => void
  ) => void;
  CreateButton: (
    request: CreateButtonRequest,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: GenericResponse) => void
  ) => void;
  CreateVBox: (
    request: CreateVBoxRequest,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: GenericResponse) => void
  ) => void;
  CreateHBox: (
    request: CreateHBoxRequest,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: GenericResponse) => void
  ) => void;
  RegisterResource: (
    request: RegisterResourceRequest,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: GenericResponse) => void
  ) => void;
  UnregisterResource: (
    request: UnregisterResourceRequest,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: GenericResponse) => void
  ) => void;
  UpdateImage: (
    request: UpdateImageRequest,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: GenericResponse) => void
  ) => void;
  SetText: (
    request: SetTextRequest,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: GenericResponse) => void
  ) => void;
  ClickWidget: (
    request: ClickWidgetRequest,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: GenericResponse) => void
  ) => void;
  RegisterCustomId: (
    request: RegisterCustomIdRequest,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: GenericResponse) => void
  ) => void;
  FindWidget: (
    request: FindWidgetRequest,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: FindWidgetResponse) => void
  ) => void;
  Quit: (
    request: QuitRequest,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: GenericResponse) => void
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
  // Cached metadata for all requests - avoids allocation per call
  private cachedMetadata?: grpc.Metadata;

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
    // DEBUG: console.log(`[gRPC] Connected to bridge on port ${port}`);
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

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as {
      bridge: {
        BridgeService: new (
          address: string,
          credentials: grpc.ChannelCredentials,
          options?: Record<string, unknown>
        ) => BridgeClient;
      };
    };
    const BridgeService = protoDescriptor.bridge.BridgeService;

    // Performance-optimized channel options
    this.client = new BridgeService(
      `localhost:${port}`,
      grpc.credentials.createInsecure(),
      {
        'grpc.max_receive_message_length': 100 * 1024 * 1024, // 100MB
        'grpc.max_send_message_length': 100 * 1024 * 1024, // 100MB
        'grpc.keepalive_time_ms': 10000,
        'grpc.keepalive_timeout_ms': 5000,
        'grpc.keepalive_permit_without_calls': 1,
        'grpc.tcp_no_delay': true,  // Disable Nagle's algorithm
        'grpc.default_compression_algorithm': 0,  // No compression for local
      }
    ) as BridgeClient;

    // Cache metadata for reuse across all calls
    this.cachedMetadata = new grpc.Metadata();
    this.cachedMetadata.add('authorization', token);
  }

  /**
   * Get metadata with auth token (returns cached instance for performance)
   */
  private getMetadata(): grpc.Metadata {
    // Return cached metadata to avoid allocation on every call
    if (this.cachedMetadata) {
      return this.cachedMetadata;
    }
    // Fallback: create new metadata if not cached
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
      const methodFn = (this.client as unknown as Record<string, Function>)[method];

      if (!methodFn || typeof methodFn !== 'function') {
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
    const request: CreateImageRequest = {
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
    const request: UpdateImageRequest = {
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
    const response = await this.call<FindWidgetRequest, FindWidgetResponse>('FindWidget', {
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
    this.connected = false;
    if (this.process && !this.process.killed) {
      // Send shutdown signal via stdin (with error handling to prevent EPIPE)
      try {
        this.process.stdin?.write('shutdown\n');
      } catch (err) {
        // Ignore EPIPE errors - process may have already closed stdin
      }
      try {
        this.process.kill();
      } catch (err) {
        // Process may already be dead
      }
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}
