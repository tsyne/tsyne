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
 */
export class InnerWindowAdapter implements ITsyneWindow {
  private ctx: Context;
  private innerWindow: InnerWindow;
  private parentWindow: Window;
  private _id: string;
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
    this.parentWindow = parentWindow;
    this._id = ctx.generateId('tsynewindow');

    // Create the inner window with content from builder
    this.innerWindow = mdiContainer.addWindow(
      options.title,
      () => {
        if (builder) {
          // Push context so widgets are captured
          ctx.pushWindow(this._id);
          ctx.pushContainer();
          builder(this);
          ctx.popContainer();
          ctx.popWindow();
        }
      },
      async () => {
        // On close - check intercept
        if (this.closeInterceptCallback) {
          const shouldClose = await this.closeInterceptCallback();
          if (!shouldClose) {
            // Re-show the window (can't actually prevent close in InnerWindow)
            // This is a limitation - InnerWindow close can't be intercepted
          }
        }
      }
    );
  }

  get id(): string {
    return this._id;
  }

  async setContent(builder: () => void | Promise<void>): Promise<void> {
    // InnerWindow doesn't support dynamic content replacement the same way
    // For now, log a warning
    console.warn('InnerWindowAdapter.setContent() - content replacement not fully supported');
    await builder();
  }

  async show(): Promise<void> {
    await this.innerWindow.show();
  }

  async hide(): Promise<void> {
    await this.innerWindow.hide();
  }

  async close(): Promise<void> {
    await this.innerWindow.close();
  }

  setTitle(title: string): void {
    this.innerWindow.setTitle(title);
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
    // Store callback, but note InnerWindow close can't actually be intercepted
    this.closeInterceptCallback = callback;
    console.warn('InnerWindowAdapter.setCloseIntercept() - close interception is limited in InnerWindow mode');
  }

  async setMainMenu(menuDefinition: Array<{
    label: string;
    items: Array<{ label: string; onClick?: () => void; isSeparator?: boolean }>;
  }>): Promise<void> {
    // Store menu definition - could potentially render as toolbar in future
    this.menuDefinition = menuDefinition;
    // For now, menus are not displayed in InnerWindow mode
    // Future: Could render as a toolbar or dropdown buttons at top of inner window
    console.warn('InnerWindowAdapter.setMainMenu() - menus not yet supported in InnerWindow mode');
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
    // Desktop mode - create InnerWindow
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
