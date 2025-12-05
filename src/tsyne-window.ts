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
import { InnerWindow, MultipleWindows } from './widgets';

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
  private mdiContainer: MultipleWindows;
  private innerWindow: InnerWindow | null = null;
  private parentWindow: Window;
  private _id: string;
  private _title: string;
  private closeInterceptCallback?: () => Promise<boolean> | boolean;
  private menuDefinition?: Array<{
    label: string;
    items: Array<{ label: string; onClick?: () => void; isSeparator?: boolean }>;
  }>;

  constructor(
    ctx: Context,
    mdiContainer: MultipleWindows,
    parentWindow: Window,
    options: WindowOptions,
    builder?: (win: ITsyneWindow) => void
  ) {
    this.ctx = ctx;
    this.mdiContainer = mdiContainer;
    this.parentWindow = parentWindow;
    this._id = ctx.generateId('tsynewindow');
    this._title = options.title;

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
    // Create the InnerWindow now with the actual content
    this.innerWindow = this.mdiContainer.addWindow(
      this._title,
      () => {
        // Build the content directly
        builder();
      },
      async () => {
        // On close callback - user clicked X button
        if (this.closeInterceptCallback) {
          const shouldClose = await this.closeInterceptCallback();
          if (shouldClose === false) {
            return; // Don't close if callback returns false
          }
        }
        // Actually close the window by sending innerWindowClose to Go
        if (this.innerWindow) {
          await this.innerWindow.close();
        }
      }
    );
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
    if (this.innerWindow) {
      await this.innerWindow.close();
    }
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
 * Desktop context for creating windows as InnerWindows
 */
export interface DesktopContext {
  mdiContainer: MultipleWindows;
  parentWindow: Window;
  /** The desktop's App instance - sub-apps should use this instead of creating new ones */
  desktopApp: any;  // Use 'any' to avoid circular import with App
}

/**
 * Global desktop context - set when running in desktop mode
 */
let desktopContext: DesktopContext | null = null;

/**
 * Enable desktop mode - subsequent window() calls create InnerWindows
 */
export function enableDesktopMode(ctx: DesktopContext): void {
  desktopContext = ctx;
}

/**
 * Disable desktop mode - window() calls create real Windows
 */
export function disableDesktopMode(): void {
  desktopContext = null;
}

/**
 * Check if currently in desktop mode
 */
export function isDesktopMode(): boolean {
  return desktopContext !== null;
}

/**
 * Get the current desktop context (if in desktop mode)
 */
export function getDesktopContext(): DesktopContext | null {
  return desktopContext;
}

/**
 * Create a TsyneWindow - either a real Window or an InnerWindowAdapter
 * based on the current runtime mode.
 */
export function createTsyneWindow(
  ctx: Context,
  options: WindowOptions,
  builder?: (win: ITsyneWindow) => void
): ITsyneWindow {
  if (desktopContext) {
    // Desktop mode - create InnerWindowAdapter
    return new InnerWindowAdapter(
      ctx,
      desktopContext.mdiContainer,
      desktopContext.parentWindow,
      options,
      builder
    );
  } else {
    // Standalone mode - create real Window
    // Window already implements most of ITsyneWindow
    return new Window(ctx, options, builder as any) as unknown as ITsyneWindow;
  }
}
