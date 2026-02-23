/**
 * TsyneCanvas - Fake HTMLCanvasElement for Tsyne
 *
 * Implements a canvas-like interface that three.js expects.
 * When getContext('webgl2') is called, returns our TsyneGLProxy instead of real WebGL.
 */

import { TsyneBridge } from './bridge';
import { TsyneGLProxy } from './gl-proxy';

export interface CanvasRenderingContext2DSettings {
  alpha?: boolean;
  depth?: boolean;
  stencil?: boolean;
  antialias?: boolean;
  premultipliedAlpha?: boolean;
  preserveDrawingBuffer?: boolean;
}

/**
 * Fake HTMLCanvasElement
 * Provides the canvas API that three.js expects
 */
export class TsyneCanvas {
  // Canvas dimensions
  width = 800;
  height = 600;

  // Style object (minimal)
  style: Partial<CSSStyleDeclaration> = {
    display: 'block',
  };

  // Class name (for CSS styling)
  className = '';
  id = '';

  // Canvas ID on the bridge
  private bridgeCanvasId: string | null = null;

  // GL context (created lazily)
  private glProxy: TsyneGLProxy | null = null;

  // Event listeners
  private eventListeners = new Map<string, Set<EventListener>>();

  // Whether this canvas receives mouse events from the bridge
  private interactive: boolean = false;

  constructor(private bridge: TsyneBridge, options?: { interactive?: boolean }) {
    this.generateCanvasId();
    this.interactive = options?.interactive ?? false;
  }

  /**
   * Generate a unique canvas ID
   */
  private generateCanvasId(): void {
    this.id = `canvas-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get the canvas context
   * Returns WebGL2-compatible proxy on 'webgl2' request
   */
  getContext(
    contextType: string,
    attributes?: CanvasRenderingContext2DSettings
  ): TsyneGLProxy | null {
    // Only support WebGL2
    if (contextType !== 'webgl2' && contextType !== 'webgl') {
      console.warn(`Unsupported context type: ${contextType}`);
      return null;
    }

    // Return existing context if already created
    if (this.glProxy) {
      return this.glProxy;
    }

    // Create new GL proxy context
    // Note: we don't actually create a bridge canvas here - that happens
    // lazily when the first GL operation is performed
    this.glProxy = new TsyneGLProxy(
      this.bridge,
      this,
      attributes || {}
    );

    return this.glProxy;
  }

  /**
   * Get bounding client rect
   * Used by three.js for canvas position/size
   */
  getBoundingClientRect(): DOMRect {
    return {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      top: 0,
      left: 0,
      right: this.width,
      bottom: this.height,
      toJSON: () => ({
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
        top: 0,
        left: 0,
        right: this.width,
        bottom: this.height,
      }),
    };
  }

  /**
   * Add an event listener
   */
  addEventListener(type: string, listener: EventListener, options?: any): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  /**
   * Remove an event listener
   */
  removeEventListener(type: string, listener: EventListener, options?: any): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Dispatch an event
   */
  dispatchEvent(event: Event): boolean {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      }
    }
    return true;
  }

  // Window ID to attach GL canvas to
  private windowId: string = '';

  /**
   * Set the window ID for GL canvas creation
   */
  setWindowId(id: string): void {
    this.windowId = id;
  }

  /**
   * Set a predefined bridge canvas ID.
   * If set, getBridgeCanvasId will return this ID instead of creating a new one.
   */
  setPredefinedId(id: string): void {
    this.bridgeCanvasId = id;
  }

  /**
   * Get actual bridge canvas ID (created on first GL operation)
   */
  async getBridgeCanvasId(): Promise<string> {
    if (!this.bridgeCanvasId) {
      try {
        this.bridgeCanvasId = await this.bridge.createGLCanvas(this.width, this.height, this.windowId, this.interactive);

        // Set up mouse event handlers if interactive
        if (this.interactive) {
          this.setupMouseEventHandlers();
        }
      } catch (error) {
        console.error(`[TsyneCanvas] Failed to create GL canvas:`, error);
        this.bridgeCanvasId = 'error_canvas';
      }
    }
    return this.bridgeCanvasId;
  }

  /**
   * Set up mouse event handlers that dispatch DOM events
   */
  private setupMouseEventHandlers(): void {
    if (!this.bridgeCanvasId) return;

    this.bridge.setMouseHandlers(this.bridgeCanvasId, {
      onMouseMove: (x, y) => {
        this.dispatchMouseEvent('mousemove', x, y);
        this.dispatchMouseEvent('pointermove', x, y);
      },
      onMouseEnter: (x, y) => {
        this.dispatchMouseEvent('mouseenter', x, y);
        this.dispatchMouseEvent('pointerenter', x, y);
      },
      onMouseLeave: () => {
        this.dispatchMouseEvent('mouseleave', 0, 0);
        this.dispatchMouseEvent('pointerleave', 0, 0);
      },
    });
  }

  // Track modifier key state for synthesized events
  private modifierState = { ctrlKey: false, shiftKey: false, altKey: false, metaKey: false };

  /**
   * Dispatch a mouse event to registered listeners
   * Public so gl-proxy can dispatch events from flush response
   * Also dispatches the corresponding pointer event (e.g., mousemove -> pointermove)
   */
  dispatchMouseEvent(type: string, x: number, y: number, button: number = 0): void {
    const mods = this.modifierState;
    // Create a fake MouseEvent-like object
    const createEvent = (eventType: string) => ({
      type: eventType,
      clientX: x,
      clientY: y,
      offsetX: x,
      offsetY: y,
      pageX: x,
      pageY: y,
      screenX: x,
      screenY: y,
      button: button,
      buttons: button === 0 ? 1 : (button === 2 ? 2 : 4),
      ctrlKey: mods.ctrlKey,
      shiftKey: mods.shiftKey,
      altKey: mods.altKey,
      metaKey: mods.metaKey,
      target: this,
      currentTarget: this,
      bubbles: true,
      cancelable: true,
      preventDefault: () => {},
      stopPropagation: () => {},
    } as unknown as MouseEvent);

    // Dispatch the requested event
    this.dispatchEvent(createEvent(type));

    // Also dispatch the corresponding pointer event
    // mousedown -> pointerdown, mouseup -> pointerup, mousemove -> pointermove, etc.
    const pointerType = type.replace('mouse', 'pointer');
    if (pointerType !== type) {
      this.dispatchEvent(createEvent(pointerType));
    }

    // Synthesize 'click' from mouseup (DOM behavior: click fires after mouseup on same target)
    if (type === 'mouseup') {
      this.dispatchEvent(createEvent('click'));
    }
  }

  /**
   * Dispatch a keyboard event to registered listeners
   * Public so gl-proxy can dispatch events from flush response
   */
  dispatchKeyboardEvent(type: string, key: string): void {
    // Update modifier state
    const lk = key.toLowerCase();
    if (lk === 'shift' || lk === 'leftshift' || lk === 'rightshift') {
      this.modifierState.shiftKey = (type === 'keydown');
    } else if (lk === 'control' || lk === 'leftcontrol' || lk === 'rightcontrol') {
      this.modifierState.ctrlKey = (type === 'keydown');
    } else if (lk === 'alt' || lk === 'leftalt' || lk === 'rightalt') {
      this.modifierState.altKey = (type === 'keydown');
    } else if (lk === 'super' || lk === 'leftsuper' || lk === 'rightsuper') {
      this.modifierState.metaKey = (type === 'keydown');
    }

    // Map Fyne key names to DOM key names
    const domKey = this.fyneKeyToDOM(key);

    const mods = this.modifierState;
    const event = {
      type,
      key: domKey,
      code: domKey,
      ctrlKey: mods.ctrlKey,
      shiftKey: mods.shiftKey,
      altKey: mods.altKey,
      metaKey: mods.metaKey,
      repeat: false,
      target: this,
      currentTarget: this,
      bubbles: true,
      cancelable: true,
      preventDefault: () => {},
      stopPropagation: () => {},
    } as unknown as KeyboardEvent;

    this.dispatchEvent(event);
  }

  /**
   * Dispatch a wheel/scroll event to registered listeners
   */
  dispatchWheelEvent(dx: number, dy: number): void {
    const event = {
      type: 'wheel',
      deltaX: dx,
      deltaY: -dy, // Fyne's DY is inverted relative to DOM convention
      deltaZ: 0,
      deltaMode: 0,
      clientX: 0,
      clientY: 0,
      target: this,
      currentTarget: this,
      bubbles: true,
      cancelable: true,
      preventDefault: () => {},
      stopPropagation: () => {},
    } as unknown as WheelEvent;

    this.dispatchEvent(event);
  }

  /**
   * Dispatch a drag event to registered listeners
   * These are custom events (not standard DOM drag events) for camera control
   */
  dispatchDragEvent(type: string, dx: number, dy: number): void {
    const event = {
      type,
      dx,
      dy,
      target: this,
      currentTarget: this,
      bubbles: true,
      cancelable: true,
      preventDefault: () => {},
      stopPropagation: () => {},
    } as unknown as Event;

    this.dispatchEvent(event);
  }

  /**
   * Map Fyne key names to DOM-compatible key names
   */
  private fyneKeyToDOM(key: string): string {
    // Fyne uses names like "Space", "Return", "LeftShift" etc.
    // Single chars are already lowercase from normalizeKey
    const mapping: Record<string, string> = {
      'Space': ' ',
      'Return': 'Enter',
      'BackSpace': 'Backspace',
      'Delete': 'Delete',
      'Escape': 'Escape',
      'Tab': 'Tab',
      'Up': 'ArrowUp',
      'Down': 'ArrowDown',
      'Left': 'ArrowLeft',
      'Right': 'ArrowRight',
      'LeftShift': 'Shift',
      'RightShift': 'Shift',
      'LeftControl': 'Control',
      'RightControl': 'Control',
      'LeftAlt': 'Alt',
      'RightAlt': 'Alt',
      'LeftSuper': 'Meta',
      'RightSuper': 'Meta',
    };
    return mapping[key] ?? key;
  }

  /**
   * Enable or disable interactive mode
   * Must be called before the canvas is created
   */
  setInteractive(interactive: boolean): void {
    if (this.bridgeCanvasId) {
      console.warn('[TsyneCanvas] setInteractive called after canvas was created - has no effect');
      return;
    }
    this.interactive = interactive;
  }

  /**
   * Check if canvas is in interactive mode
   */
  isInteractive(): boolean {
    return this.interactive;
  }

  /**
   * Get the bridge canvas ID (may be null if not yet created)
   */
  getBridgeId(): string | null {
    return this.bridgeCanvasId;
  }

  /**
   * Resize the canvas on both JS and Go sides
   * Updates local dimensions, GL proxy drawing buffer, and tells Go to resize the shader widget
   */
  async resizeBridge(width: number, height: number): Promise<void> {
    this.width = width;
    this.height = height;
    if (this.glProxy) {
      this.glProxy.setSize(width, height);
    }
    if (this.bridgeCanvasId) {
      await this.bridge.resizeGLCanvas(this.bridgeCanvasId, width, height);
    }
  }

  /**
   * Set canvas size
   */
  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (this.glProxy) {
      this.glProxy.setSize(width, height);
    }
  }

  /**
   * Get the GL proxy (internal use)
   */
  getGLProxy(): TsyneGLProxy | null {
    return this.glProxy;
  }

  // Standard canvas properties/methods (minimal stubs)

  toDataURL(type?: string, quality?: number): string {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number): void {
    // Return a 1x1 transparent PNG blob
    const data = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, // PNG signature
      0, 0, 0, 13, // IHDR chunk size
      73, 72, 68, 82, // IHDR
      0, 0, 0, 1, 0, 0, 0, 1, // 1x1 image
      8, 6, // 8-bit RGBA
      0, 0, 0, 144, 87, 83, 222, // CRC
      0, 0, 0, 10, // tRNS chunk size
      116, 82, 78, 83, // tRNS
      0, 255, 0, 0, 0, // transparent
      242, 204, 204, 143, // CRC
      0, 0, 0, 0, // IEND chunk size
      73, 69, 78, 68, 174, 66, 96, 130 // IEND + CRC
    ]);
    const blob = new Blob([Buffer.from(data)], { type: type || 'image/png' });
    setTimeout(() => callback(blob), 0);
  }

  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
    return new ImageData(sw, sh);
  }

  // Make canvas iterable over its properties (for three.js compatibility)
  [Symbol.toStringTag] = 'HTMLCanvasElement';
}
