import { Context } from '../context';
import { Widget } from './base';

/**
 * Label widget
 */
export class Label extends Widget {
  constructor(ctx: Context, text: string, className?: string, alignment?: 'leading' | 'trailing' | 'center', wrapping?: 'off' | 'break' | 'word', textStyle?: { bold?: boolean; italic?: boolean; monospace?: boolean }) {
    const id = ctx.generateId('label');
    super(ctx, id);

    const payload: any = { id, text };

    if (alignment) {
      payload.alignment = alignment;
    }

    if (wrapping) {
      payload.wrapping = wrapping;
    }

    if (textStyle) {
      payload.textStyle = textStyle;
    }

    ctx.bridge.send('createLabel', payload);
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking) - try class names first, then fall back to 'label'
    if (className) {
      this.applyStyles(className).catch(() => {});
    } else {
      this.applyStyles('label').catch(() => {});
    }
  }
}

/**
 * Separator widget (horizontal or vertical line)
 */
export class Separator {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context) {
    this.ctx = ctx;
    this.id = ctx.generateId('separator');

    ctx.bridge.send('createSeparator', { id: this.id });
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Hyperlink widget (clickable URL)
 */
export class Hyperlink {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, text: string, url: string) {
    this.ctx = ctx;
    this.id = ctx.generateId('hyperlink');

    ctx.bridge.send('createHyperlink', { id: this.id, text, url });
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * ProgressBar widget
 */
export class ProgressBar extends Widget {
  constructor(ctx: Context, initialValue?: number, infinite?: boolean) {
    const id = ctx.generateId('progressbar');
    super(ctx, id);

    const payload: any = { id, infinite: infinite || false };

    if (!infinite && initialValue !== undefined) {
      payload.value = initialValue;
    }

    ctx.bridge.send('createProgressBar', payload);
    ctx.addToCurrentContainer(id);
  }

  async setProgress(value: number): Promise<void> {
    await this.ctx.bridge.send('setProgress', {
      widgetId: this.id,
      value
    });
  }

  async getProgress(): Promise<number> {
    const result = await this.ctx.bridge.send('getProgress', {
      widgetId: this.id
    });
    return result.value;
  }

  // Aliases to match Slider API naming convention
  async setValue(value: number): Promise<void> {
    await this.setProgress(value);
  }

  async getValue(): Promise<number> {
    return await this.getProgress();
  }
}

/**
 * ProgressBarInfinite widget - indeterminate progress indicator
 *
 * Shows an animated progress bar that indicates activity without showing
 * specific progress. Useful for operations with unknown duration.
 */
export class ProgressBarInfinite extends Widget {
  constructor(ctx: Context) {
    const id = ctx.generateId('progressbarinfinite');
    super(ctx, id);

    ctx.bridge.send('createProgressBar', { id, infinite: true });
    ctx.addToCurrentContainer(id);
  }

  /**
   * Start the progress bar animation
   */
  async start(): Promise<void> {
    await this.ctx.bridge.send('startProgressInfinite', {
      widgetId: this.id
    });
  }

  /**
   * Stop the progress bar animation
   */
  async stop(): Promise<void> {
    await this.ctx.bridge.send('stopProgressInfinite', {
      widgetId: this.id
    });
  }

  /**
   * Check if the progress bar animation is currently running
   */
  async isRunning(): Promise<boolean> {
    const result = await this.ctx.bridge.send('isProgressRunning', {
      widgetId: this.id
    });
    return result.running;
  }
}

/**
 * Activity widget - loading/busy spinner
 * Displays an animated spinner to indicate loading or processing state
 */
export class Activity extends Widget {
  constructor(ctx: Context) {
    const id = ctx.generateId('activity');
    super(ctx, id);

    ctx.bridge.send('createActivity', { id });
    ctx.addToCurrentContainer(id);
  }

  /**
   * Start the activity animation
   */
  async start(): Promise<void> {
    await this.ctx.bridge.send('startActivity', {
      widgetId: this.id
    });
  }

  /**
   * Stop the activity animation
   */
  async stop(): Promise<void> {
    await this.ctx.bridge.send('stopActivity', {
      widgetId: this.id
    });
  }
}

/**
 * Represents a clickable action item in a Toolbar
 */
export class ToolbarAction {
  private _id?: string;

  constructor(public label: string, public onAction?: () => void) {}

  /**
   * Assign a unique ID to this toolbar action for testing
   * @param id Custom ID for the action
   * @returns this for method chaining
   */
  withId(id: string): this {
    this._id = id;
    return this;
  }

  get id(): string | undefined {
    return this._id;
  }
}

/**
 * Toolbar widget
 */
export class Toolbar {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, toolbarItems: Array<ToolbarAction | { type: 'separator' | 'spacer' }>) {
    this.ctx = ctx;
    this.id = ctx.generateId('toolbar');

    const items = toolbarItems.map(item => {
      if ('type' in item) { // Separator or Spacer
        return { type: item.type };
      }

      // Action item
      const action = item as ToolbarAction;
      const callbackId = ctx.generateId('callback');
      if (action.onAction) {
        ctx.bridge.registerEventHandler(callbackId, (_data: any) => {
          action.onAction!();
        });
      }

      return {
        type: 'action',
        label: action.label,
        callbackId,
        customId: action.id, // Pass custom ID to the bridge
      };
    });

    ctx.bridge.send('createToolbar', {
      id: this.id,
      items
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Table widget
 */
export class Table {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, headers: string[], data: string[][]) {
    this.ctx = ctx;
    this.id = ctx.generateId('table');

    ctx.bridge.send('createTable', {
      id: this.id,
      headers,
      data
    });

    ctx.addToCurrentContainer(this.id);
  }

  async updateData(data: string[][]): Promise<void> {
    await this.ctx.bridge.send('updateTableData', {
      id: this.id,
      data
    });
  }
}

/**
 * List widget
 */
export class List {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, items: string[], onSelected?: (index: number, item: string) => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('list');

    const payload: any = {
      id: this.id,
      items
    };

    if (onSelected) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onSelected(data.index, data.item);
      });
    }

    ctx.bridge.send('createList', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async updateItems(items: string[]): Promise<void> {
    await this.ctx.bridge.send('updateListData', {
      id: this.id,
      items
    });
  }
}

/**
 * Tree widget for hierarchical data
 */
export class Tree {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, rootLabel: string) {
    this.ctx = ctx;
    this.id = ctx.generateId('tree');

    ctx.bridge.send('createTree', {
      id: this.id,
      rootLabel
    });

    ctx.addToCurrentContainer(this.id);
  }
}

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
        payload.resource = options.resource;
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
      await this.ctx.bridge.send('updateImage', {
        widgetId: this.id,
        path: imageSource.path,
        resource: imageSource.resource,
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
 * Menu item for standalone Menu widget
 */
export interface MenuItem {
  label: string;
  onSelected: () => void;
  disabled?: boolean;
  checked?: boolean;
  isSeparator?: boolean;
}

/**
 * Menu widget - standalone menu that can be embedded in containers
 * Useful for command palettes, action menus, and in-container menus
 */
export class Menu extends Widget {
  private items: MenuItem[];

  constructor(ctx: Context, items: MenuItem[]) {
    const id = ctx.generateId('menu');
    super(ctx, id);
    this.items = items;

    const menuItems = items.map(item => {
      if (item.isSeparator) {
        return { isSeparator: true };
      }

      const callbackId = ctx.generateId('callback');
      ctx.bridge.registerEventHandler(callbackId, () => item.onSelected());

      return {
        label: item.label,
        callbackId,
        disabled: item.disabled,
        checked: item.checked
      };
    });

    ctx.bridge.send('createMenu', { id, items: menuItems });
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking)
    this.applyStyles('menu').catch(() => {});
  }

  /**
   * Get the current menu items
   */
  getItems(): MenuItem[] {
    return this.items;
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
    });
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
