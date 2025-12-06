/**
 * Desktop Canvas and Draggable Icon widgets
 *
 * These widgets provide a desktop-like environment with:
 * - Absolute positioning of icons
 * - Drag and drop support
 * - Double-click to launch
 *
 * Based on bridge/cmd/draggable-icons demo - solves Fyne Stack click limitation
 * by using a single custom widget with absolute positioning.
 */

import { Context } from '../context';
import { Widget } from './base';
import { InnerWindow } from './containers_advanced';

/**
 * Options for creating a desktop icon
 */
export interface DesktopIconOptions {
  /** Unique ID for the icon */
  id: string;
  /** Display label */
  label: string;
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Icon color (hex string like "#ff0000") */
  color?: string;
  /** Called when icon is clicked */
  onClick?: (iconId: string, x: number, y: number) => void;
  /** Called when icon is double-clicked */
  onDoubleClick?: (iconId: string, x: number, y: number) => void;
  /** Called during drag */
  onDrag?: (iconId: string, x: number, y: number, dx: number, dy: number) => void;
  /** Called when drag ends */
  onDragEnd?: (iconId: string, x: number, y: number) => void;
}

/**
 * A draggable desktop icon
 */
export class DesktopIcon {
  public readonly id: string;
  private ctx: Context;
  private desktopId: string;

  constructor(ctx: Context, desktopId: string, options: DesktopIconOptions) {
    this.ctx = ctx;
    this.id = options.id;
    this.desktopId = desktopId;

    const payload: any = {
      id: options.id,
      desktopId,
      label: options.label,
      x: options.x,
      y: options.y,
    };

    if (options.color) {
      payload.color = options.color;
    }

    // Register callbacks
    if (options.onClick) {
      const callbackId = ctx.generateId('callback');
      payload.onClickCallbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        options.onClick!(data.iconId, data.x, data.y);
      });
    }

    if (options.onDoubleClick) {
      const callbackId = ctx.generateId('callback');
      payload.onDblClickCallbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        options.onDoubleClick!(data.iconId, data.x, data.y);
      });
    }

    if (options.onDrag) {
      const callbackId = ctx.generateId('callback');
      payload.onDragCallbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        options.onDrag!(data.iconId, data.x, data.y, data.dx, data.dy);
      });
    }

    if (options.onDragEnd) {
      const callbackId = ctx.generateId('callback');
      payload.onDragEndCallbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        options.onDragEnd!(data.iconId, data.x, data.y);
      });
    }

    ctx.bridge.send('createDesktopIcon', payload);
  }

  /**
   * Move the icon to a new position
   */
  async move(x: number, y: number): Promise<void> {
    await this.ctx.bridge.send('moveDesktopIcon', {
      iconId: this.id,
      x,
      y,
    });
  }

  /**
   * Update the icon's label
   */
  async setLabel(label: string): Promise<void> {
    await this.ctx.bridge.send('updateDesktopIconLabel', {
      iconId: this.id,
      label,
    });
  }

  /**
   * Update the icon's color
   */
  async setColor(color: string): Promise<void> {
    await this.ctx.bridge.send('updateDesktopIconColor', {
      iconId: this.id,
      color,
    });
  }
}

/**
 * Options for creating a desktop canvas
 */
export interface DesktopCanvasOptions {
  /** Background color (hex string like "#1e3c5a") */
  bgColor?: string;
}

/**
 * A canvas container that allows free positioning of draggable icons.
 * Solves Fyne's Stack click limitation by using a single widget with
 * absolute positioning instead of layered containers.
 */
export class DesktopCanvas extends Widget {
  private icons: Map<string, DesktopIcon> = new Map();

  constructor(ctx: Context, options?: DesktopCanvasOptions) {
    const id = ctx.generateId('desktopCanvas');
    super(ctx, id);

    const payload: any = { id };
    if (options?.bgColor) {
      payload.bgColor = options.bgColor;
    }

    ctx.bridge.send('createDesktopCanvas', payload);
    ctx.addToCurrentContainer(id);
  }

  /**
   * Add an icon to the desktop canvas
   */
  addIcon(options: DesktopIconOptions): DesktopIcon {
    const icon = new DesktopIcon(this.ctx, this.id, options);
    this.icons.set(options.id, icon);
    return icon;
  }

  /**
   * Get an icon by ID
   */
  getIcon(id: string): DesktopIcon | undefined {
    return this.icons.get(id);
  }

  /**
   * Get all icons
   */
  getAllIcons(): DesktopIcon[] {
    return Array.from(this.icons.values());
  }
}

/**
 * Options for creating a DesktopMDI container
 */
export interface DesktopMDIOptions {
  /** Background color (hex string like "#2d5a87") */
  bgColor?: string;
}

/**
 * A draggable desktop icon for use in DesktopMDI
 */
export class DesktopMDIIcon {
  public readonly id: string;
  private ctx: Context;
  private desktopId: string;

  constructor(ctx: Context, desktopId: string, options: DesktopIconOptions) {
    this.ctx = ctx;
    this.id = options.id;
    this.desktopId = desktopId;

    const payload: any = {
      id: options.id,
      desktopId,
      label: options.label,
      x: options.x,
      y: options.y,
    };

    if (options.color) {
      payload.color = options.color;
    }

    // Register callbacks
    if (options.onClick) {
      const callbackId = ctx.generateId('callback');
      payload.onClickCallbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        options.onClick!(data.iconId, data.x, data.y);
      });
    }

    if (options.onDoubleClick) {
      const callbackId = ctx.generateId('callback');
      payload.onDblClickCallbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        options.onDoubleClick!(data.iconId, data.x, data.y);
      });
    }

    if (options.onDrag) {
      const callbackId = ctx.generateId('callback');
      payload.onDragCallbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        options.onDrag!(data.iconId, data.x, data.y, data.dx, data.dy);
      });
    }

    if (options.onDragEnd) {
      const callbackId = ctx.generateId('callback');
      payload.onDragEndCallbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        options.onDragEnd!(data.iconId, data.x, data.y);
      });
    }

    // Use desktopMDIAddIcon instead of createDesktopIcon
    ctx.bridge.send('desktopMDIAddIcon', payload);
  }

  /**
   * Move the icon to a new position
   */
  async move(x: number, y: number): Promise<void> {
    await this.ctx.bridge.send('moveDesktopIcon', {
      iconId: this.id,
      x,
      y,
    });
  }

  /**
   * Update the icon's label
   */
  async setLabel(label: string): Promise<void> {
    await this.ctx.bridge.send('updateDesktopIconLabel', {
      iconId: this.id,
      label,
    });
  }

  /**
   * Update the icon's color
   */
  async setColor(color: string): Promise<void> {
    await this.ctx.bridge.send('updateDesktopIconColor', {
      iconId: this.id,
      color,
    });
  }
}

/**
 * A combined desktop canvas and MDI container.
 * Solves the layering problem by managing both desktop icons and inner windows
 * in a single widget that properly routes events.
 *
 * Features:
 * - Desktop icons with drag and drop support
 * - Double-click to launch apps
 * - Inner windows for running apps
 * - Proper event routing (icons work even with windows open)
 */
export class DesktopMDI extends Widget {
  private icons: Map<string, DesktopMDIIcon> = new Map();
  private windowIds: Set<string> = new Set();

  constructor(ctx: Context, options?: DesktopMDIOptions) {
    const id = ctx.generateId('desktopMDI');
    super(ctx, id);

    const payload: any = { id };
    if (options?.bgColor) {
      payload.bgColor = options.bgColor;
    }

    ctx.bridge.send('createDesktopMDI', payload);
    ctx.addToCurrentContainer(id);
  }

  /**
   * Add an icon to the desktop
   */
  addIcon(options: DesktopIconOptions): DesktopMDIIcon {
    const icon = new DesktopMDIIcon(this.ctx, this.id, options);
    this.icons.set(options.id, icon);
    return icon;
  }

  /**
   * Get an icon by ID
   */
  getIcon(id: string): DesktopMDIIcon | undefined {
    return this.icons.get(id);
  }

  /**
   * Get all icons
   */
  getAllIcons(): DesktopMDIIcon[] {
    return Array.from(this.icons.values());
  }

  /**
   * Add an inner window to the desktop MDI (low-level API)
   * @param windowId - The ID of an existing InnerWindow widget
   * @param x - Optional X position (centered if not provided)
   * @param y - Optional Y position (centered if not provided)
   */
  async addWindow(windowId: string, x?: number, y?: number): Promise<void> {
    const payload: any = {
      containerId: this.id,
      windowId,
    };
    if (x !== undefined) payload.x = x;
    if (y !== undefined) payload.y = y;

    await this.ctx.bridge.send('desktopMDIAddWindow', payload);
    this.windowIds.add(windowId);
  }

  /**
   * Create and add a new inner window to the desktop MDI
   * @param title - Window title
   * @param builder - Function to build window content
   * @param onClose - Optional callback when window is closed
   * @returns The created InnerWindow
   */
  addWindowWithContent(title: string, builder: () => void, onClose?: () => void): InnerWindow {
    const innerWin = new InnerWindow(this.ctx, title, builder, onClose);
    this.windowIds.add(innerWin.id);

    // Add to the container
    this.ctx.bridge.send('desktopMDIAddWindow', {
      containerId: this.id,
      windowId: innerWin.id
    });

    return innerWin;
  }

  /**
   * Remove an inner window from the desktop MDI
   * @param windowId - The ID of the InnerWindow widget to remove
   */
  async removeWindow(windowId: string): Promise<void> {
    await this.ctx.bridge.send('desktopMDIRemoveWindow', {
      containerId: this.id,
      windowId,
    });
    this.windowIds.delete(windowId);
  }

  /**
   * Get all window IDs currently in this container
   */
  getWindowIds(): string[] {
    return Array.from(this.windowIds);
  }

  /**
   * Update an icon's position
   */
  async updateIconPosition(iconId: string, x: number, y: number): Promise<void> {
    const icon = this.icons.get(iconId);
    if (icon) {
      await icon.move(x, y);
    }
  }
}
