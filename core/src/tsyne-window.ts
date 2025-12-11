/**
 * TsyneWindow - Abstraction layer for Window/InnerWindow
 *
 * Allows apps to be written once and run either:
 * - Standalone (using fyne.Window)
 * - In desktop environment (using container.InnerWindow)
 *
 * Window-specific methods like centerOnScreen() become no-ops in InnerWindow mode.
 */

import { Context } from './context';
import { Window, WindowOptions } from './window';
import { InnerWindow, MultipleWindows, DesktopMDI } from './widgets';

/**
 * Common interface for both Window and InnerWindow
 */
export interface ITsyneWindow {
  readonly id: string;

  // Content management
  setContent(builder: () => void | Promise<void>): Promise<void>;
  show(): Promise<void>;
  hide(): Promise<void>;
  close(): Promise<void>;

  // Title
  setTitle(title: string): void;

  // Window-specific (no-op in InnerWindow)
  resize(width: number, height: number): Promise<void>;
  centerOnScreen(): Promise<void>;
  setFullScreen(fullscreen: boolean): Promise<void>;
  setIcon(resourceName: string): Promise<void>;
  setCloseIntercept(callback: () => Promise<boolean> | boolean): void;

  // Menus (may be limited in InnerWindow)
  setMainMenu(menuDefinition: Array<{
    label: string;
    items: Array<{ label: string; onClick?: () => void; isSeparator?: boolean }>;
  }>): Promise<void>;

  // Dialogs - delegate to parent window in InnerWindow mode
  showInfo(title: string, message: string): Promise<void>;
  showError(title: string, message: string): Promise<void>;
  showConfirm(title: string, message: string): Promise<boolean>;
  showFileOpen(): Promise<string | null>;
  showFileSave(filename?: string): Promise<string | null>;
  showFolderOpen(): Promise<string | null>;
  showEntryDialog(title: string, message: string): Promise<string | null>;
}

/**
 * Adapter that wraps InnerWindow to implement ITsyneWindow interface.
 * Window-only methods become no-ops or delegate to parent window.
 *
 * Key difference from Window: InnerWindow content is set via setContent(),
 * and the actual InnerWindow is created at that point (not in constructor).
 */
export class InnerWindowAdapter implements ITsyneWindow {
  private ctx: Context;
  private mdiContainer: MultipleWindows | null;
  private desktopMDI: DesktopMDI | null;
  private innerWindow: InnerWindow | null = null;
  private parentWindow: Window;
  private _id: string;
  private _title: string;
  private closeInterceptCallback?: () => Promise<boolean> | boolean;
  private onWindowClosed?: (window: ITsyneWindow) => void;
  private hasClosed = false;
  private menuDefinition?: Array<{
    label: string;
    items: Array<{ label: string; onClick?: () => void; isSeparator?: boolean }>;
  }>;

  constructor(
    ctx: Context,
    mdiContainerOrDesktopMDI: MultipleWindows | DesktopMDI,
    parentWindow: Window,
    options: WindowOptions,
    builder?: (win: ITsyneWindow) => void,
    onWindowClosed?: (window: ITsyneWindow) => void
  ) {
    this.ctx = ctx;
    // Determine which container type we have
    if ((mdiContainerOrDesktopMDI as any).addWindowWithContent) {
      this.desktopMDI = mdiContainerOrDesktopMDI as DesktopMDI;
      this.mdiContainer = null;
    } else {
      this.mdiContainer = mdiContainerOrDesktopMDI as MultipleWindows;
      this.desktopMDI = null;
    }
    this.parentWindow = parentWindow;
    this._id = ctx.generateId('tsynewindow');
    this._title = options.title;
    this.onWindowClosed = onWindowClosed;

    // If builder is provided, call it - it will typically call setContent()
    if (builder) {
      builder(this);
    }
  }

  get id(): string {
    return this._id;
  }

  /**
   * Set the content of the inner window.
   * This is when we actually create the InnerWindow.
   */
  async setContent(builder: () => void | Promise<void>): Promise<void> {
    const closeHandler = async () => {
      // On close callback - user clicked X button
      if (this.closeInterceptCallback) {
        const shouldClose = await this.closeInterceptCallback();
        if (shouldClose === false) {
          return; // Don't close if callback returns false
        }
      }
      await this.closeInnerWindow();
    };

    // Create the InnerWindow now with the actual content
    // Use whichever container type we have
    if (this.desktopMDI) {
      this.innerWindow = this.desktopMDI.addWindowWithContent(
        this._title,
        () => { builder(); },
        closeHandler
      );
    } else if (this.mdiContainer) {
      this.innerWindow = this.mdiContainer.addWindow(
        this._title,
        () => { builder(); },
        closeHandler
      );
    } else {
      throw new Error('No MDI container available');
    }
  }

  async show(): Promise<void> {
    if (this.innerWindow) {
      await this.innerWindow.show();
    }
  }

  async hide(): Promise<void> {
    if (this.innerWindow) {
      await this.innerWindow.hide();
    }
  }

  async close(): Promise<void> {
    await this.closeInnerWindow();
  }

  setTitle(title: string): void {
    this._title = title;
    if (this.innerWindow) {
      this.innerWindow.setTitle(title);
    }
  }

  // === Window-specific methods (no-op in InnerWindow) ===

  async resize(_width: number, _height: number): Promise<void> {
    // No-op: InnerWindow sizing is managed by MDI container
  }

  async centerOnScreen(): Promise<void> {
    // No-op: Doesn't apply to inner windows
  }

  async setFullScreen(_fullscreen: boolean): Promise<void> {
    // No-op: Doesn't apply to inner windows
  }

  async setIcon(_resourceName: string): Promise<void> {
    // No-op: InnerWindow doesn't have an icon
  }

  setCloseIntercept(callback: () => Promise<boolean> | boolean): void {
    this.closeInterceptCallback = callback;
  }

  private async closeInnerWindow(): Promise<void> {
    if (this.hasClosed) {
      return;
    }
    this.hasClosed = true;
    if (this.innerWindow) {
      await this.innerWindow.close();
    }
    if (this.onWindowClosed) {
      this.onWindowClosed(this);
    }
  }

  async setMainMenu(menuDefinition: Array<{
    label: string;
    items: Array<{ label: string; onClick?: () => void; isSeparator?: boolean }>;
  }>): Promise<void> {
    // Store menu definition - could potentially render as toolbar in future
    this.menuDefinition = menuDefinition;
    // Menus are not displayed in InnerWindow mode (silent - don't warn on every app)
  }

  // === Dialogs - delegate to parent window ===

  async showInfo(title: string, message: string): Promise<void> {
    return this.parentWindow.showInfo(title, message);
  }

  async showError(title: string, message: string): Promise<void> {
    return this.parentWindow.showError(title, message);
  }

  async showConfirm(title: string, message: string): Promise<boolean> {
    return this.parentWindow.showConfirm(title, message);
  }

  async showFileOpen(): Promise<string | null> {
    return this.parentWindow.showFileOpen();
  }

  async showFileSave(filename?: string): Promise<string | null> {
    return this.parentWindow.showFileSave(filename);
  }

  async showFolderOpen(): Promise<string | null> {
    return this.parentWindow.showFolderOpen();
  }

  async showEntryDialog(title: string, message: string): Promise<string | null> {
    return this.parentWindow.showEntryDialog(title, message);
  }
}

/**
 * Adapter that renders window content as a stack pane (full-screen layer).
 * Used by PhoneTop for phone-style app rendering.
 */
export class StackPaneAdapter implements ITsyneWindow {
  private ctx: Context;
  private parentWindow: Window;
  private _id: string;
  private _title: string;
  private _contentBuilder: (() => void) | null = null;
  private closeInterceptCallback?: () => Promise<boolean> | boolean;
  private onShow?: (adapter: StackPaneAdapter) => void;
  private onClose?: (adapter: StackPaneAdapter) => void;

  constructor(
    ctx: Context,
    parentWindow: Window,
    options: WindowOptions,
    callbacks: {
      onShow?: (adapter: StackPaneAdapter) => void;
      onClose?: (adapter: StackPaneAdapter) => void;
    },
    builder?: (win: ITsyneWindow) => void
  ) {
    this.ctx = ctx;
    this.parentWindow = parentWindow;
    this._id = ctx.generateId('stackpane');
    this._title = options.title;
    this.onShow = callbacks.onShow;
    this.onClose = callbacks.onClose;

    // If builder is provided, call it - it will typically call setContent()
    if (builder) {
      builder(this);
    }

    // In phone mode, automatically notify that the adapter was created
    // (most apps don't explicitly call show())
    if (this.onShow) {
      this.onShow(this);
    }
  }

  get id(): string {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  /**
   * Get the captured content builder
   */
  get contentBuilder(): (() => void) | null {
    return this._contentBuilder;
  }

  /**
   * Set the content - captures the builder for later rendering
   */
  async setContent(builder: () => void | Promise<void>): Promise<void> {
    this._contentBuilder = builder as () => void;
  }

  async show(): Promise<void> {
    if (this.onShow) {
      this.onShow(this);
    }
  }

  async hide(): Promise<void> {
    // Stack panes don't hide - they switch away
  }

  async close(): Promise<void> {
    if (this.closeInterceptCallback) {
      const shouldClose = await this.closeInterceptCallback();
      if (shouldClose === false) {
        return;
      }
    }
    if (this.onClose) {
      this.onClose(this);
    }
  }

  setTitle(title: string): void {
    this._title = title;
  }

  // === Window-specific methods (no-op in stack pane) ===

  async resize(_width: number, _height: number): Promise<void> {}
  async centerOnScreen(): Promise<void> {}
  async setFullScreen(_fullscreen: boolean): Promise<void> {}
  async setIcon(_resourceName: string): Promise<void> {}

  setCloseIntercept(callback: () => Promise<boolean> | boolean): void {
    this.closeInterceptCallback = callback;
  }

  async setMainMenu(_menuDefinition: Array<{
    label: string;
    items: Array<{ label: string; onClick?: () => void; isSeparator?: boolean }>;
  }>): Promise<void> {
    // Menus not displayed in stack pane mode
  }

  // === Dialogs - delegate to parent window ===

  async showInfo(title: string, message: string): Promise<void> {
    return this.parentWindow.showInfo(title, message);
  }

  async showError(title: string, message: string): Promise<void> {
    return this.parentWindow.showError(title, message);
  }

  async showConfirm(title: string, message: string): Promise<boolean> {
    return this.parentWindow.showConfirm(title, message);
  }

  async showFileOpen(): Promise<string | null> {
    return this.parentWindow.showFileOpen();
  }

  async showFileSave(filename?: string): Promise<string | null> {
    return this.parentWindow.showFileSave(filename);
  }

  async showFolderOpen(): Promise<string | null> {
    return this.parentWindow.showFolderOpen();
  }

  async showEntryDialog(title: string, message: string): Promise<string | null> {
    return this.parentWindow.showEntryDialog(title, message);
  }
}

/**
 * Desktop context for creating windows as InnerWindows
 */
export interface DesktopContext {
  /** MDI container (legacy approach with layering issues) */
  mdiContainer?: MultipleWindows;
  /** Desktop MDI container (unified approach - preferred) */
  desktopMDI?: DesktopMDI;
  parentWindow: Window;
  /** The desktop's App instance - sub-apps should use this instead of creating new ones */
  desktopApp: any;  // Use 'any' to avoid circular import with App
  /** Notify desktop when an inner window closes */
  onWindowClosed?: (window: ITsyneWindow) => void;
}

/**
 * PhoneTop context for creating windows as stack panes
 */
export interface PhoneTopContext {
  parentWindow: Window;
  phoneApp: any;  // The PhoneTop's App instance
  onShow: (adapter: StackPaneAdapter) => void;
  onClose: (adapter: StackPaneAdapter) => void;
}

/**
 * Global desktop context - set when running in desktop mode
 */
let desktopContext: DesktopContext | null = null;

/**
 * Global phone context - set when running in phone mode
 */
let phoneContext: PhoneTopContext | null = null;

/**
 * Enable desktop mode - subsequent window() calls create InnerWindows
 */
export function enableDesktopMode(ctx: DesktopContext): void {
  desktopContext = ctx;
  phoneContext = null;  // Mutually exclusive
}

/**
 * Disable desktop mode - window() calls create real Windows
 */
export function disableDesktopMode(): void {
  desktopContext = null;
}

/**
 * Enable phone mode - subsequent window() calls create StackPanes
 */
export function enablePhoneMode(ctx: PhoneTopContext): void {
  phoneContext = ctx;
  desktopContext = null;  // Mutually exclusive
}

/**
 * Disable phone mode
 */
export function disablePhoneMode(): void {
  phoneContext = null;
}

/**
 * Check if currently in desktop mode
 */
export function isDesktopMode(): boolean {
  return desktopContext !== null;
}

/**
 * Check if currently in phone mode
 */
export function isPhoneMode(): boolean {
  return phoneContext !== null;
}

/**
 * Get the current desktop context (if in desktop mode)
 */
export function getDesktopContext(): DesktopContext | null {
  return desktopContext;
}

/**
 * Get the current phone context (if in phone mode)
 */
export function getPhoneContext(): PhoneTopContext | null {
  return phoneContext;
}

/**
 * Create a TsyneWindow - either a real Window, InnerWindowAdapter, or StackPaneAdapter
 * based on the current runtime mode.
 */
export function createTsyneWindow(
  ctx: Context,
  options: WindowOptions,
  builder?: (win: ITsyneWindow) => void
): ITsyneWindow {
  if (phoneContext) {
    // Phone mode - create StackPaneAdapter
    return new StackPaneAdapter(
      ctx,
      phoneContext.parentWindow,
      options,
      {
        onShow: phoneContext.onShow,
        onClose: phoneContext.onClose
      },
      builder
    );
  } else if (desktopContext) {
    // Desktop mode - create InnerWindowAdapter
    // Use desktopMDI if available (preferred), otherwise fall back to mdiContainer
    const container = desktopContext.desktopMDI || desktopContext.mdiContainer;
    if (!container) {
      throw new Error('Desktop mode enabled but no MDI container available');
    }
    return new InnerWindowAdapter(
      ctx,
      container,
      desktopContext.parentWindow,
      options,
      builder,
      desktopContext.onWindowClosed
    );
  } else {
    // Standalone mode - create real Window
    // Window already implements most of ITsyneWindow
    return new Window(ctx, options, builder as any) as unknown as ITsyneWindow;
  }
}
