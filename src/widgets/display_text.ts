import { Context } from '../context';
import { Widget } from './base';

/**
 * RichText widget for formatted text
 */
export class RichText {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, segments: Array<{
    text: string;
    bold?: boolean;
    italic?: boolean;
    monospace?: boolean;
  }>) {
    this.ctx = ctx;
    this.id = ctx.generateId('richtext');

    ctx.bridge.send('createRichText', {
      id: this.id,
      segments
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Image widget for displaying images
 */
export class Image {
  private ctx: Context;
  public id: string;
  /** Injected resource scope - stored at creation time for app instance isolation */
  private injectedScope: string | null;

  constructor(
    ctx: Context,
    pathOrOptions: string | { path?: string; resource?: string; fillMode?: 'contain' | 'stretch' | 'original'; onClick?: () => void; onDrag?: (x: number, y: number) => void; onDragEnd?: (x: number, y: number) => void; },
    fillMode?: 'contain' | 'stretch' | 'original',
    onClick?: () => void,
    onDrag?: (x: number, y: number) => void,
    onDragEnd?: (x: number, y: number) => void
  ) {
    this.ctx = ctx;
    this.id = ctx.generateId('image');
    // Store injected scope for use in future resource lookups (e.g., updateImage)
    this.injectedScope = ctx.resourceScope;

    const payload: any = {
      id: this.id
    };

    // Support both string path (legacy) and options object (new)
    if (typeof pathOrOptions === 'string') {
      // Legacy: path as first parameter
      const resolvedPath = ctx.resolveResourcePath(pathOrOptions);
      payload.path = resolvedPath;

      if (fillMode) {
        payload.fillMode = fillMode;
      }
    } else {
      // New: options object
      const options = pathOrOptions;

      if (options.resource) {
        // Apply resource scoping if a scope is set (for multi-instance app isolation)
        payload.resource = ctx.scopeResourceName(options.resource);
      } else if (options.path) {
        const resolvedPath = ctx.resolveResourcePath(options.path);
        payload.path = resolvedPath;
      }

      if (options.fillMode) {
        payload.fillMode = options.fillMode;
      }

      // Override with options if provided
      onClick = options.onClick || onClick;
      onDrag = options.onDrag || onDrag;
      onDragEnd = options.onDragEnd || onDragEnd;
    }

    if (onClick) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, () => {
        onClick();
      });
    }

    if (onDrag) {
      const dragCallbackId = ctx.generateId('callback');
      payload.onDragCallbackId = dragCallbackId;
      ctx.bridge.registerEventHandler(dragCallbackId, (data: any) => {
        onDrag(data.x, data.y);
      });
    }

    if (onDragEnd) {
      const dragEndCallbackId = ctx.generateId('callback');
      payload.onDragEndCallbackId = dragEndCallbackId;
      ctx.bridge.registerEventHandler(dragEndCallbackId, (data: any) => {
        onDragEnd(data.x, data.y);
      });
    }

    ctx.bridge.send('createImage', payload);
    ctx.addToCurrentContainer(this.id);
  }

  /**
   * Apply the injected scope to a resource name
   */
  private applyInjectedScope(name: string): string {
    return this.injectedScope ? `${this.injectedScope}:${name}` : name;
  }

  /**
   * Updates the image widget with new image data
   * @param imageData - Base64-encoded image data (with or without data URL prefix)
   */
  /**
   * Update the image displayed in this widget
   * @param imageSource - Image source, can be:
   *   - String: Base64 data URI (e.g., 'data:image/png;base64,...')
   *   - Object with path: File path to image (e.g., { path: '/path/to/image.svg' })
   *   - Object with resource: Resource name (e.g., { resource: 'my-resource' })
   *   - Object with svg: Raw SVG string (e.g., { svg: '<svg>...</svg>' })
   *   - Object with url: Remote image URL (e.g., { url: 'https://example.com/image.png' })
   */
  async updateImage(imageSource: string | { path?: string; resource?: string; svg?: string; url?: string }): Promise<void> {
    if (typeof imageSource === 'string') {
      // Backwards compatible: string is base64 data URI
      await this.ctx.bridge.send('updateImage', {
        widgetId: this.id,
        imageData: imageSource
      });
    } else {
      // New object-based API
      // Use injected scope for app instance resource isolation
      const scopedResource = imageSource.resource
        ? this.applyInjectedScope(imageSource.resource)
        : undefined;
      await this.ctx.bridge.send('updateImage', {
        widgetId: this.id,
        path: imageSource.path,
        resource: scopedResource,
        svg: imageSource.svg,
        url: imageSource.url
      });
    }
  }

  /**
   * Register a custom ID for this image widget (for test framework getByID)
   * @param customId Custom ID to register
   * @returns this for method chaining
   * @example
   * const cardImage = a.image('card.png').withId('draw3-card');
   * // In tests: ctx.getByID('draw3-card').click()
   */
  withId(customId: string): this {
    this.ctx.bridge.send('registerCustomId', {
      widgetId: this.id,
      customId
    });
    return this;
  }
}

/**
 * Style options for TextGrid cells
 */
export interface TextGridStyle {
  /** Foreground (text) color - hex string like "#ff0000" or named color like "red" */
  fgColor?: string;
  /** Background color - hex string like "#00ff00" or named color like "green" */
  bgColor?: string;
  /** Bold text */
  bold?: boolean;
  /** Italic text */
  italic?: boolean;
  /** Monospace font */
  monospace?: boolean;
}

/**
 * Options for creating a TextGrid
 */
export interface TextGridOptions {
  /** Initial text content */
  text?: string;
  /** Show line numbers on the left */
  showLineNumbers?: boolean;
  /** Show whitespace characters (spaces, tabs) */
  showWhitespace?: boolean;
  /** Callback for typed characters (requires focus) */
  onTyped?: (char: string) => void;
  /** Callback for key down events (for special keys like arrows, enter, etc.) */
  onKeyDown?: (key: string, modifiers: { shift?: boolean; ctrl?: boolean; alt?: boolean }) => void;
  /** Callback for key up events */
  onKeyUp?: (key: string, modifiers: { shift?: boolean; ctrl?: boolean; alt?: boolean }) => void;
  /** Callback for focus change */
  onFocus?: (focused: boolean) => void;
}

/**
 * TextGrid widget - monospace text grid with per-cell styling
 * Ideal for terminal emulators, code editors, and text-based displays
 */
export class TextGrid extends Widget {
  constructor(ctx: Context, options?: TextGridOptions | string) {
    const id = ctx.generateId('textgrid');
    super(ctx, id);

    const payload: any = { id };

    // Support both string (legacy) and options object
    if (typeof options === 'string') {
      payload.text = options;
    } else if (options) {
      if (options.text !== undefined) payload.text = options.text;
      if (options.showLineNumbers !== undefined) payload.showLineNumbers = options.showLineNumbers;
      if (options.showWhitespace !== undefined) payload.showWhitespace = options.showWhitespace;

      // Register keyboard callbacks
      if (options.onTyped) {
        const callbackId = ctx.generateId('callback');
        payload.onTypedCallbackId = callbackId;
        ctx.bridge.registerEventHandler(callbackId, (data: any) => {
          options.onTyped!(data.char);
        });
      }

      if (options.onKeyDown) {
        const callbackId = ctx.generateId('callback');
        payload.onKeyDownCallbackId = callbackId;
        ctx.bridge.registerEventHandler(callbackId, (data: any) => {
          options.onKeyDown!(data.key, {
            shift: data.shift,
            ctrl: data.ctrl,
            alt: data.alt
          });
        });
      }

      if (options.onKeyUp) {
        const callbackId = ctx.generateId('callback');
        payload.onKeyUpCallbackId = callbackId;
        ctx.bridge.registerEventHandler(callbackId, (data: any) => {
          options.onKeyUp!(data.key, {
            shift: data.shift,
            ctrl: data.ctrl,
            alt: data.alt
          });
        });
      }

      if (options.onFocus) {
        const callbackId = ctx.generateId('callback');
        payload.onFocusCallbackId = callbackId;
        ctx.bridge.registerEventHandler(callbackId, (data: any) => {
          options.onFocus!(data.focused);
        });
      }
    }

    ctx.bridge.send('createTextGrid', payload);
    ctx.addToCurrentContainer(id);
  }

  /**
   * Set the entire text content of the grid
   * @param text Text content (can include newlines for multiple rows)
   */
  async setText(text: string): Promise<void> {
    await this.ctx.bridge.send('setTextGridText', {
      widgetId: this.id,
      text
    });
  }

  /**
   * Get the entire text content of the grid
   * @returns The current text content
   */
  async getText(): Promise<string> {
    const result = await this.ctx.bridge.send('getTextGridText', {
      widgetId: this.id
    }) as { text: string };
    return result.text;
  }

  /**
   * Set a single cell's character and/or style
   * @param row Row index (0-based)
   * @param col Column index (0-based)
   * @param char Single character to set (optional)
   * @param style Style to apply (optional)
   */
  async setCell(row: number, col: number, char?: string, style?: TextGridStyle): Promise<void> {
    const payload: any = {
      widgetId: this.id,
      row,
      col
    };

    if (char !== undefined) {
      payload.char = char;
    }
    if (style !== undefined) {
      payload.style = style;
    }

    await this.ctx.bridge.send('setTextGridCell', payload);
  }

  /**
   * Set an entire row's content and optionally style
   * @param row Row index (0-based)
   * @param text Text content for the row
   * @param style Style to apply to all cells in the row (optional)
   */
  async setRow(row: number, text: string, style?: TextGridStyle): Promise<void> {
    const payload: any = {
      widgetId: this.id,
      row,
      text
    };

    if (style !== undefined) {
      payload.style = style;
    }

    await this.ctx.bridge.send('setTextGridRow', payload);
  }

  /**
   * Set the style of a single cell (without changing its character)
   * @param row Row index (0-based)
   * @param col Column index (0-based)
   * @param style Style to apply
   */
  async setStyle(row: number, col: number, style: TextGridStyle): Promise<void> {
    await this.ctx.bridge.send('setTextGridStyle', {
      widgetId: this.id,
      row,
      col,
      style
    });
  }

  /**
   * Set the style of a range of cells
   * @param startRow Starting row index (0-based)
   * @param startCol Starting column index (0-based)
   * @param endRow Ending row index (inclusive)
   * @param endCol Ending column index (inclusive)
   * @param style Style to apply to all cells in the range
   */
  async setStyleRange(startRow: number, startCol: number, endRow: number, endCol: number, style: TextGridStyle): Promise<void> {
    await this.ctx.bridge.send('setTextGridStyleRange', {
      widgetId: this.id,
      startRow,
      startCol,
      endRow,
      endCol,
      style
    });
  }

  /**
   * Append text to the grid (adds to the end)
   * @param text Text to append
   */
  async append(text: string): Promise<void> {
    const currentText = await this.getText();
    await this.setText(currentText + text);
  }

  /**
   * Clear all content from the grid
   */
  async clear(): Promise<void> {
    await this.setText('');
  }
}
