import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { BridgeInterface } from './fynebridge';

export interface GrpcConnectionInfo {
  grpcPort: number;
  token: string;
  protocol: string;
}

export interface Event {
  type: string;
  widgetId: string;
  data?: Record<string, unknown>;
}

// Type for gRPC event stream data
interface GrpcEvent {
  type: string;
  widgetId: string;
  data?: Record<string, unknown>;
}

// Type for the gRPC client methods
interface GrpcClient {
  [methodName: string]: Function;
  subscribeEvents: (
    request: { eventTypes: string[] },
    metadata: grpc.Metadata
  ) => grpc.ClientReadableStream<GrpcEvent>;
}

// ==================== PERFORMANCE OPTIMIZATION ====================
// Cache proto definition at module level - loaded once, reused across all connections
let cachedProtoDescriptor: {
  bridge: {
    BridgeService: new (
      address: string,
      credentials: grpc.ChannelCredentials,
      options?: Record<string, unknown>
    ) => GrpcClient;
  };
} | null = null;

function getProtoDescriptor() {
  if (cachedProtoDescriptor) {
    return cachedProtoDescriptor;
  }

  // Determine proto path
  const isCompiled = __dirname.includes(path.sep + 'dist' + path.sep);
  const projectRoot = isCompiled
    ? path.join(__dirname, '..', '..')
    : path.join(__dirname, '..');
  const protoPath = path.join(projectRoot, 'bridge', 'proto', 'bridge.proto');

  // Load synchronously once at startup
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: false,  // Convert snake_case to camelCase
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

  cachedProtoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as typeof cachedProtoDescriptor;
  return cachedProtoDescriptor;
}

// gRPC client channel options for low-latency communication
const GRPC_CLIENT_OPTIONS = {
  // Larger buffers reduce syscalls
  'grpc.max_receive_message_length': 100 * 1024 * 1024,  // 100MB
  'grpc.max_send_message_length': 100 * 1024 * 1024,     // 100MB
  // Keepalive to prevent connection drops
  'grpc.keepalive_time_ms': 10000,
  'grpc.keepalive_timeout_ms': 5000,
  'grpc.keepalive_permit_without_calls': 1,
  // Enable TCP_NODELAY for lower latency (disable Nagle's algorithm)
  'grpc.tcp_no_delay': true,
  // Default compression disabled for speed on local connections
  'grpc.default_compression_algorithm': 0,  // GRPC_COMPRESS_NONE
};
// ===================================================================

/**
 * GrpcBridgeConnection - Connects to tsyne-bridge via gRPC protocol
 *
 * Flow:
 * 1. Spawn bridge with --mode=grpc
 * 2. Bridge sends {grpcPort, token, protocol} via stdout
 * 3. Connect to gRPC server with auth token
 * 4. All subsequent communication via gRPC
 */
export class GrpcBridgeConnection implements BridgeInterface {
  private process: ChildProcess;
  private client?: GrpcClient;
  private eventHandlers = new Map<string, (data: Record<string, unknown>) => void>();
  private readyPromise: Promise<void>;
  private readyResolve?: () => void;
  private connectionInfo?: GrpcConnectionInfo;
  private eventStream?: grpc.ClientReadableStream<GrpcEvent>;
  private authToken?: string;
  // Cached metadata object - reused for all requests
  private cachedMetadata?: grpc.Metadata;
  // Message queue to ensure sequential processing (preserves ordering like stdio/msgpack)
  private messageQueue: Promise<unknown> = Promise.resolve();

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
      // Only log non-zero exit codes (errors)
      // code can be null when process is killed
      if (code !== null && code !== 0) {
        console.error(`Bridge process exited with code ${code}`);
      }
    });
  }

  private async connectGrpc(info: GrpcConnectionInfo): Promise<void> {
    // Use cached proto descriptor for faster startup
    const protoDescriptor = getProtoDescriptor();
    if (!protoDescriptor) {
      throw new Error('Failed to load proto descriptor');
    }
    const BridgeService = protoDescriptor.bridge.BridgeService;

    // Create client with performance-optimized channel options
    this.client = new BridgeService(
      `localhost:${info.grpcPort}`,
      grpc.credentials.createInsecure(),
      GRPC_CLIENT_OPTIONS
    );

    // Store token and create cached metadata for all requests
    this.authToken = info.token;
    this.cachedMetadata = new grpc.Metadata();
    this.cachedMetadata.add('authorization', info.token);

    // Subscribe to events
    this.subscribeToEvents();

    // Signal ready
    if (this.readyResolve) {
      this.readyResolve();
    }
  }

  private subscribeToEvents(): void {
    if (!this.client || !this.cachedMetadata) return;

    const request = { eventTypes: [] }; // Subscribe to all events

    // Use cached metadata for better performance
    const stream = this.client.subscribeEvents(request, this.cachedMetadata);
    this.eventStream = stream;

    stream.on('data', (event: GrpcEvent) => {
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
      const callbackId = String(event.data.callbackId);
      const handler = this.eventHandlers.get(callbackId);
      if (handler) {
        handler(event.data);
      }
    } else {
      const handlerKey = event.widgetId ? `${event.type}:${event.widgetId}` : event.type;
      const handler = this.eventHandlers.get(handlerKey) || this.eventHandlers.get(event.type);

      if (handler) {
        const eventData: Record<string, unknown> = { ...(event.data || {}) };
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
   * Messages are queued and processed sequentially to preserve ordering (like stdio/msgpack)
   */
  async send(type: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.readyPromise;

    if (!this.client || !this.cachedMetadata) {
      throw new Error('gRPC client not connected');
    }

    // Queue this message to ensure sequential processing
    const messagePromise = this.messageQueue.then(() => this.sendGrpcCall(type, payload));
    // Update queue to wait for this message (but catch errors to prevent queue breakage)
    this.messageQueue = messagePromise.catch(() => {});
    return messagePromise;
  }

  /**
   * Internal method to make the actual gRPC call
   */
  private sendGrpcCall(type: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      // Map message type to gRPC method and request
      const { method, request } = this.mapMessageToGrpc(type, payload);

      if (!method || !request) {
        // Fall back - this message type isn't implemented in gRPC yet
        console.warn(`gRPC method not implemented for: ${type}`);
        resolve({});
        return;
      }

      // Use cached metadata for better performance (no allocation per call)
      const methodFn = this.client![method];
      if (typeof methodFn !== 'function') {
        reject(new Error(`Method ${method} not found on client`));
        return;
      }

      // Bind method to client to preserve 'this' context
      methodFn.call(this.client, request, this.cachedMetadata, (err: Error | null, response: Record<string, unknown>) => {
        if (err) {
          reject(err);
        } else {
          if (response && !response.success && response.error) {
            reject(new Error(String(response.error)));
          } else {
            // Return the relevant response fields based on response type
            // For responses with specific fields (widgetIds, text, etc.) return those directly
            // For generic responses with result map, return result
            // Note: Check WidgetInfoResponse FIRST because it has text/id/type fields too
            if (response?.width !== undefined || response?.height !== undefined) {
              // WidgetInfoResponse (has width/height which are unique to it)
              resolve({
                id: response.id,
                type: response.type,
                text: response.text,
                x: response.x,
                y: response.y,
                width: response.width,
                height: response.height
              });
            } else if (response?.widgetIds !== undefined) {
              resolve({ widgetIds: response.widgetIds });
            } else if (response?.text !== undefined) {
              resolve({ text: response.text });
            } else if (response?.value !== undefined) {
              resolve({ value: response.value });
            } else if (response?.checked !== undefined) {
              resolve({ checked: response.checked });
            } else if (response?.widgets !== undefined) {
              resolve({ widgets: response.widgets });
            } else {
              resolve((response as { result?: Record<string, unknown> })?.result || {});
            }
          }
        }
      });
    });
  }

  /**
   * Maps JSON-RPC message types to gRPC method calls
   */
  private mapMessageToGrpc(type: string, payload: Record<string, unknown>): { method: string | null; request: Record<string, unknown> | null } {
    switch (type) {
      // Window operations
      case 'createWindow':
        return {
          method: 'createWindow',
          request: {
            windowId: payload.id || payload.windowId,  // Window sends 'id', gRPC proto expects windowId
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
        return {
          method: 'createVBox',
          request: {
            widgetId: payload.widgetId || payload.id,
            children: payload.children || []
          }
        };
      case 'createHBox':
        return {
          method: 'createHBox',
          request: {
            widgetId: payload.widgetId || payload.id,
            children: payload.children || []
          }
        };
      case 'createScroll':
        return {
          method: 'createScroll',
          request: { widgetId: payload.widgetId || payload.id, contentId: payload.contentId }
        };
      case 'setScrollMinHeight':
        return {
          method: 'setScrollMinHeight',
          request: { widgetId: payload.id, minHeight: payload.minHeight }
        };
      case 'setScrollMinSize':
        return {
          method: 'setScrollMinSize',
          request: { widgetId: payload.id, minWidth: payload.minWidth, minHeight: payload.minHeight }
        };
      case 'createGrid':
        return {
          method: 'createGrid',
          request: {
            widgetId: payload.widgetId || payload.id,
            columns: payload.columns || 1,
            children: payload.children || []
          }
        };
      case 'createCenter':
        return {
          method: 'createCenter',
          request: { widgetId: payload.widgetId || payload.id, childId: payload.childId }
        };
      case 'createClip':
        return {
          method: 'createClip',
          request: { widgetId: payload.widgetId || payload.id, childId: payload.childId }
        };
      case 'createMax':
        return {
          method: 'createMax',
          request: { widgetId: payload.widgetId || payload.id, childIds: payload.childIds || [] }
        };
      case 'createStack':
        return {
          method: 'createStack',
          request: { widgetId: payload.widgetId || payload.id, childIds: payload.childIds || [] }
        };
      case 'createPadded':
        return {
          method: 'createPadded',
          request: { widgetId: payload.widgetId || payload.id, childId: payload.childId }
        };
      case 'createBorder':
        return {
          method: 'createBorder',
          request: {
            widgetId: payload.widgetId || payload.id,
            topId: payload.topId || '',
            bottomId: payload.bottomId || '',
            leftId: payload.leftId || '',
            rightId: payload.rightId || '',
            centerId: payload.centerId || ''
          }
        };
      case 'createGridWrap':
        return {
          method: 'createGridWrap',
          request: {
            widgetId: payload.widgetId || payload.id,
            itemWidth: payload.itemWidth || 0,
            itemHeight: payload.itemHeight || 0,
            children: payload.children || []
          }
        };
      case 'createAdaptiveGrid':
        return {
          method: 'createAdaptiveGrid',
          request: {
            widgetId: payload.widgetId || payload.id,
            rowcols: payload.rowcols || 1,
            children: payload.children || []
          }
        };
      case 'createSplit':
        return {
          method: 'createSplit',
          request: {
            widgetId: payload.widgetId || payload.id,
            orientation: payload.orientation === 'horizontal' ? 1 : 0,
            leadingId: payload.leadingId || '',
            trailingId: payload.trailingId || '',
            offset: payload.offset || 0.5
          }
        };
      case 'createCard':
        return {
          method: 'createCard',
          request: {
            widgetId: payload.widgetId || payload.id,
            title: payload.title || '',
            subtitle: payload.subtitle || '',
            contentId: payload.contentId || ''
          }
        };
      case 'createAccordion':
        return {
          method: 'createAccordion',
          request: {
            widgetId: payload.widgetId || payload.id,
            items: (payload.items as Array<{title: string; contentId: string}>) || []
          }
        };
      case 'createForm':
        return {
          method: 'createForm',
          request: {
            widgetId: payload.widgetId || payload.id,
            items: (payload.items as Array<{label: string; widgetId: string}>) || [],
            submitCallbackId: payload.submitCallbackId || '',
            cancelCallbackId: payload.cancelCallbackId || ''
          }
        };
      case 'createTabs':
        return {
          method: 'createTabs',
          request: {
            widgetId: payload.widgetId || payload.id,
            tabs: (payload.tabs as Array<{title: string; contentId: string}>) || [],
            location: payload.location === 'bottom' ? 1 : payload.location === 'leading' ? 2 : payload.location === 'trailing' ? 3 : 0
          }
        };
      case 'createDocTabs':
        return {
          method: 'createDocTabs',
          request: {
            widgetId: payload.widgetId || payload.id,
            tabs: (payload.tabs as Array<{title: string; contentId: string}>) || [],
            closeCallbackId: payload.closeCallbackId || '',
            location: payload.location === 'bottom' ? 1 : payload.location === 'leading' ? 2 : payload.location === 'trailing' ? 3 : 0
          }
        };
      case 'createThemeOverride':
        return {
          method: 'createThemeOverride',
          request: {
            widgetId: payload.widgetId || payload.id,
            childId: payload.childId || '',
            variant: payload.variant === 'dark' ? 1 : 0
          }
        };
      case 'createInnerWindow':
        return {
          method: 'createInnerWindow',
          request: {
            widgetId: payload.widgetId || payload.id,
            title: payload.title || '',
            contentId: payload.contentId || '',
            onCloseCallbackId: payload.onCloseCallbackId || ''
          }
        };
      case 'createNavigation':
        return {
          method: 'createNavigation',
          request: {
            widgetId: payload.widgetId || payload.id,
            rootId: payload.rootId || '',
            title: payload.title || '',
            onBackCallbackId: payload.onBackCallbackId || '',
            onForwardCallbackId: payload.onForwardCallbackId || ''
          }
        };
      case 'createPopup':
        return {
          method: 'createPopup',
          request: {
            widgetId: payload.widgetId || payload.id,
            contentId: payload.contentId || '',
            windowId: payload.windowId || ''
          }
        };
      case 'createMultipleWindows':
        return {
          method: 'createMultipleWindows',
          request: {
            widgetId: payload.widgetId || payload.id,
            children: payload.children || []
          }
        };
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
        const imgRequest: Record<string, unknown> = {
          widgetId: payload.widgetId || payload.id,
          width: payload.width || 0,
          height: payload.height || 0,
          callbackId: payload.callbackId || '',
          dragCallbackId: payload.dragCallbackId || '',
          doubleTapCallbackId: payload.doubleTapCallbackId || ''
        };
        if (payload.resource) {
          imgRequest.resourceName = payload.resource;
        } else if (payload.source && typeof payload.source === 'string') {
          // Handle base64 inline data
          if (payload.source.startsWith('data:')) {
            const base64Data = payload.source.split(',')[1];
            imgRequest.inlineData = Buffer.from(base64Data, 'base64');
          }
        }
        return { method: 'createImage', request: imgRequest };

      // Display widgets
      case 'createSeparator':
        return { method: 'createSeparator', request: { widgetId: payload.widgetId || payload.id } };
      case 'createSpacer':
        return { method: 'createSpacer', request: { widgetId: payload.widgetId || payload.id } };
      case 'createHyperlink':
        return {
          method: 'createHyperlink',
          request: {
            widgetId: payload.widgetId || payload.id,
            text: payload.text || '',
            url: payload.url || ''
          }
        };
      case 'createProgressBar':
        return {
          method: 'createProgressBar',
          request: {
            widgetId: payload.widgetId || payload.id,
            value: payload.value || 0,
            infinite: payload.infinite || false
          }
        };
      case 'createActivity':
        return { method: 'createActivity', request: { widgetId: payload.widgetId || payload.id } };
      case 'createRichText':
        return {
          method: 'createRichText',
          request: {
            widgetId: payload.widgetId || payload.id,
            segments: (payload.segments as Array<{text: string; bold?: boolean; italic?: boolean; monospace?: boolean; hyperlink?: string}>) || []
          }
        };
      case 'createIcon':
        return {
          method: 'createIcon',
          request: {
            widgetId: payload.widgetId || payload.id,
            iconName: payload.iconName || payload.name || ''
          }
        };
      case 'createFileIcon':
        return {
          method: 'createFileIcon',
          request: {
            widgetId: payload.widgetId || payload.id,
            path: payload.path || ''
          }
        };
      case 'createCalendar':
        return {
          method: 'createCalendar',
          request: {
            widgetId: payload.widgetId || payload.id,
            callbackId: payload.callbackId || '',
            date: payload.date || ''
          }
        };

      // Input widgets
      case 'createSlider':
        return {
          method: 'createSlider',
          request: {
            widgetId: payload.widgetId || payload.id,
            min: payload.min || 0,
            max: payload.max || 100,
            value: payload.value || 0,
            step: payload.step || 1,
            callbackId: payload.callbackId || ''
          }
        };
      case 'createRadioGroup':
        return {
          method: 'createRadioGroup',
          request: {
            widgetId: payload.widgetId || payload.id,
            options: payload.options || [],
            selected: payload.selected || '',
            callbackId: payload.callbackId || '',
            horizontal: payload.horizontal || false
          }
        };
      case 'createCheckGroup':
        return {
          method: 'createCheckGroup',
          request: {
            widgetId: payload.widgetId || payload.id,
            options: payload.options || [],
            selected: payload.selected || [],
            callbackId: payload.callbackId || '',
            horizontal: payload.horizontal || false
          }
        };
      case 'createSelectEntry':
        return {
          method: 'createSelectEntry',
          request: {
            widgetId: payload.widgetId || payload.id,
            options: payload.options || [],
            placeholder: payload.placeholder || '',
            onChangedCallbackId: payload.onChangedCallbackId || '',
            onSubmittedCallbackId: payload.onSubmittedCallbackId || '',
            onSelectedCallbackId: payload.onSelectedCallbackId || ''
          }
        };
      case 'createDateEntry':
        return {
          method: 'createDateEntry',
          request: {
            widgetId: payload.widgetId || payload.id,
            callbackId: payload.callbackId || '',
            date: payload.date || ''
          }
        };

      // Data widgets
      case 'createTree':
        return {
          method: 'createTree',
          request: {
            widgetId: payload.widgetId || payload.id,
            rootLabel: payload.rootLabel || ''
          }
        };
      case 'createTable':
        return {
          method: 'createTable',
          request: {
            widgetId: payload.widgetId || payload.id,
            headers: payload.headers || [],
            data: (payload.data as Array<{cells: string[]}>) || []
          }
        };
      case 'createList':
        return {
          method: 'createList',
          request: {
            widgetId: payload.widgetId || payload.id,
            items: payload.items || [],
            callbackId: payload.callbackId || '',
            onUnselectedCallbackId: payload.onUnselectedCallbackId || ''
          }
        };
      case 'createMenu':
        return {
          method: 'createMenu',
          request: {
            widgetId: payload.widgetId || payload.id,
            items: (payload.items as Array<{label: string; callbackId?: string; isSeparator?: boolean}>) || []
          }
        };
      case 'createToolbar':
        return {
          method: 'createToolbar',
          request: {
            widgetId: payload.widgetId || payload.id,
            items: (payload.items as Array<{label: string; iconResource?: string; callbackId?: string; isSeparator?: boolean; isSpacer?: boolean}>) || []
          }
        };
      case 'createTextGrid':
        return {
          method: 'createTextGrid',
          request: {
            widgetId: payload.widgetId || payload.id,
            text: payload.text || '',
            showLineNumbers: payload.showLineNumbers || false,
            showWhitespace: payload.showWhitespace || false,
            onKeyDownCallbackId: payload.onKeyDownCallbackId || '',
            onKeyUpCallbackId: payload.onKeyUpCallbackId || '',
            onTypedCallbackId: payload.onTypedCallbackId || '',
            onFocusCallbackId: payload.onFocusCallbackId || ''
          }
        };

      // Canvas widgets
      case 'createCanvasLine':
        return {
          method: 'createCanvasLine',
          request: {
            widgetId: payload.widgetId || payload.id,
            x1: payload.x1 || 0,
            y1: payload.y1 || 0,
            x2: payload.x2 || 0,
            y2: payload.y2 || 0,
            strokeColor: payload.strokeColor || '',
            strokeWidth: payload.strokeWidth || 1
          }
        };
      case 'createCanvasCircle':
        return {
          method: 'createCanvasCircle',
          request: {
            widgetId: payload.widgetId || payload.id,
            x: payload.x || 0,
            y: payload.y || 0,
            x2: payload.x2 || 0,
            y2: payload.y2 || 0,
            fillColor: payload.fillColor || '',
            strokeColor: payload.strokeColor || '',
            strokeWidth: payload.strokeWidth || 0
          }
        };
      case 'createCanvasRectangle':
        return {
          method: 'createCanvasRectangle',
          request: {
            widgetId: payload.widgetId || payload.id,
            width: payload.width || 0,
            height: payload.height || 0,
            fillColor: payload.fillColor || '',
            strokeColor: payload.strokeColor || '',
            strokeWidth: payload.strokeWidth || 0,
            cornerRadius: payload.cornerRadius || 0
          }
        };
      case 'createCanvasText':
        return {
          method: 'createCanvasText',
          request: {
            widgetId: payload.widgetId || payload.id,
            text: payload.text || '',
            color: payload.color || '',
            textSize: payload.textSize || 12,
            bold: payload.bold || false,
            italic: payload.italic || false,
            monospace: payload.monospace || false,
            alignment: payload.alignment || 0
          }
        };
      case 'createCanvasRaster':
        return {
          method: 'createCanvasRaster',
          request: {
            widgetId: payload.widgetId || payload.id,
            width: payload.width || 0,
            height: payload.height || 0,
            pixels: payload.pixels ? Buffer.from(String(payload.pixels), 'base64') : Buffer.alloc(0)
          }
        };
      case 'createCanvasLinearGradient':
        return {
          method: 'createCanvasLinearGradient',
          request: {
            widgetId: payload.widgetId || payload.id,
            startColor: payload.startColor || '',
            endColor: payload.endColor || '',
            angle: payload.angle || 0,
            width: payload.width || 0,
            height: payload.height || 0
          }
        };
      case 'createCanvasRadialGradient':
        return {
          method: 'createCanvasRadialGradient',
          request: {
            widgetId: payload.widgetId || payload.id,
            startColor: payload.startColor || '',
            endColor: payload.endColor || '',
            centerOffsetX: payload.centerOffsetX || 0,
            centerOffsetY: payload.centerOffsetY || 0,
            width: payload.width || 0,
            height: payload.height || 0
          }
        };
      case 'createCanvasArc':
        return {
          method: 'createCanvasArc',
          request: {
            widgetId: payload.widgetId || payload.id,
            x: payload.x || 0,
            y: payload.y || 0,
            x2: payload.x2 || 0,
            y2: payload.y2 || 0,
            startAngle: payload.startAngle || 0,
            endAngle: payload.endAngle || 0,
            fillColor: payload.fillColor || '',
            strokeColor: payload.strokeColor || '',
            strokeWidth: payload.strokeWidth || 0
          }
        };
      case 'createCanvasPolygon':
        return {
          method: 'createCanvasPolygon',
          request: {
            widgetId: payload.widgetId || payload.id,
            points: (payload.points as Array<{x: number; y: number}>) || [],
            fillColor: payload.fillColor || '',
            strokeColor: payload.strokeColor || '',
            strokeWidth: payload.strokeWidth || 0
          }
        };
      case 'createTappableCanvasRaster':
        return {
          method: 'createTappableCanvasRaster',
          request: {
            widgetId: payload.widgetId || payload.id,
            width: payload.width || 0,
            height: payload.height || 0,
            pixels: payload.pixels ? Buffer.from(String(payload.pixels), 'base64') : Buffer.alloc(0),
            callbackId: payload.callbackId || ''
          }
        };

      // Desktop widgets
      case 'createDesktopCanvas':
        return {
          method: 'createDesktopCanvas',
          request: {
            widgetId: payload.widgetId || payload.id,
            bgColor: payload.bgColor || ''
          }
        };
      case 'createDesktopIcon':
        return {
          method: 'createDesktopIcon',
          request: {
            widgetId: payload.widgetId || payload.id,
            desktopId: payload.desktopId || '',
            label: payload.label || '',
            x: payload.x || 0,
            y: payload.y || 0,
            color: payload.color || '',
            onClickCallbackId: payload.onClickCallbackId || '',
            onDblClickCallbackId: payload.onDblClickCallbackId || '',
            dragCallbackId: payload.dragCallbackId || '',
            dragEndCallbackId: payload.dragEndCallbackId || ''
          }
        };

      // Resources
      case 'registerResource':
        return {
          method: 'registerResource',
          request: {
            name: payload.name,
            data: Buffer.from(String(payload.data), 'base64')
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
        const updateRequest: Record<string, unknown> = { widgetId: payload.widgetId };
        if (payload.resource) {
          updateRequest.resourceName = payload.resource;
        } else if (payload.source && typeof payload.source === 'string') {
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

  registerEventHandler(callbackId: string, handler: (data: Record<string, unknown>) => void): void {
    this.eventHandlers.set(callbackId, handler);
  }

  on(eventType: string, handler: (data: Record<string, unknown>) => void): void {
    this.eventHandlers.set(eventType, handler);
  }

  off(eventType: string, handler?: (data: Record<string, unknown>) => void): void {
    this.eventHandlers.delete(eventType);
  }

  async registerCustomId(widgetId: string, customId: string): Promise<Record<string, unknown>> {
    return this.send('registerCustomId', { widgetId, customId });
  }

  async getParent(widgetId: string): Promise<string> {
    // Not implemented in gRPC proto yet - would need to add
    console.warn('getParent not implemented in gRPC mode');
    return '';
  }

  async clickToolbarAction(toolbarId: string, actionLabel: string): Promise<Record<string, unknown>> {
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
      grpc.closeClient(this.client as unknown as grpc.Client);
    }

    // Clear handlers
    this.eventHandlers.clear();

    // Send shutdown signal to bridge
    if (this.process && this.process.stdin) {
      this.process.stdin.write('shutdown\n');
    }

    // Kill process if still alive (SIGTERM first)
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
