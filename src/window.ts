import { Context } from './context';
import { registerDialogHandlers } from './globals';

/**
 * ProgressDialog provides control over a progress dialog
 */
export class ProgressDialog {
  private ctx: Context;
  private dialogId: string;
  private closed: boolean = false;
  private onCancelledCallback?: () => void;

  constructor(ctx: Context, dialogId: string) {
    this.ctx = ctx;
    this.dialogId = dialogId;
  }

  /**
   * Updates the progress value (0.0 to 1.0)
   * Only effective for non-infinite progress dialogs
   */
  async setValue(value: number): Promise<void> {
    if (this.closed) return;
    await this.ctx.bridge.send('updateProgressDialog', {
      dialogId: this.dialogId,
      value: Math.max(0, Math.min(1, value))
    });
  }

  /**
   * Hides/closes the progress dialog
   */
  async hide(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.ctx.bridge.send('hideProgressDialog', {
      dialogId: this.dialogId
    });
  }

  /**
   * Registers a callback to be called when the dialog is cancelled
   * @internal Used by Window.showProgress to set up the callback
   */
  _setOnCancelled(callback: () => void): void {
    this.onCancelledCallback = callback;
  }

  /**
   * Called when the dialog is cancelled by the user
   * @internal
   */
  _handleCancelled(): void {
    this.closed = true;
    if (this.onCancelledCallback) {
      this.onCancelledCallback();
    }
  }
}

export interface WindowOptions {
  title: string;
  width?: number;
  height?: number;
  fixedSize?: boolean;
}

/**
 * Window represents a Fyne window
 */
export class Window {
  private ctx: Context;
  public id: string;
  private contentId?: string;
  private contentSent: boolean = false; // Track if content has been sent to bridge

  constructor(ctx: Context, options: WindowOptions, builder?: (win: Window) => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('window');

    const payload: any = {
      id: this.id,
      title: options.title
    };

    if (options.width !== undefined) {
      payload.width = options.width;
    }
    if (options.height !== undefined) {
      payload.height = options.height;
    }
    if (options.fixedSize !== undefined) {
      payload.fixedSize = options.fixedSize;
    }

    ctx.bridge.send('createWindow', payload);

    // Register dialog handlers for browser compatibility globals
    registerDialogHandlers({
      alert: (message: string) => {
        this.showInfo('Alert', message);
      },
      confirm: async (message: string): Promise<boolean> => {
        return await this.showConfirm('Confirm', message);
      },
      prompt: async (message: string, defaultValue?: string): Promise<string | null> => {
        // For now, we don't have a prompt dialog in Fyne, so we return null
        // This can be implemented later with a custom dialog
        console.log('[PROMPT]', message, defaultValue);
        return null;
      }
    });

    if (builder) {
      ctx.pushWindow(this.id);
      ctx.pushContainer();

      builder(this);

      const children = ctx.popContainer();
      if (children.length > 0) {
        // Use the first (and should be only) child as content
        this.contentId = children[0];
      }

      ctx.popWindow();
    }
  }

  async show(): Promise<void> {
    // Only send setContent if we haven't already sent it
    if (this.contentId && !this.contentSent) {
      await this.ctx.bridge.send('setContent', {
        windowId: this.id,
        widgetId: this.contentId
      });
      this.contentSent = true;
    }

    await this.ctx.bridge.send('showWindow', {
      windowId: this.id
    });
  }

  async setContent(builder: () => void): Promise<void> {
    // Mark as sent immediately (synchronously) to prevent duplicate calls
    this.contentSent = true;

    this.ctx.pushWindow(this.id);
    this.ctx.pushContainer();

    builder();

    const children = this.ctx.popContainer();
    if (children.length > 0) {
      this.contentId = children[0];
    }

    this.ctx.popWindow();

    // Actually send the new content to the window
    if (this.contentId) {
      await this.ctx.bridge.send('setContent', {
        windowId: this.id,
        widgetId: this.contentId
      });
    }
  }

  /**
   * Shows an information dialog with a title and message
   */
  async showInfo(title: string, message: string): Promise<void> {
    await this.ctx.bridge.send('showInfo', {
      windowId: this.id,
      title,
      message
    });
  }

  /**
   * Shows an error dialog with a title and message
   */
  async showError(title: string, message: string): Promise<void> {
    await this.ctx.bridge.send('showError', {
      windowId: this.id,
      title,
      message
    });
  }

  /**
   * Shows a confirmation dialog and returns the user's response
   * @returns Promise<boolean> - true if user confirmed, false if cancelled
   */
  async showConfirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const callbackId = this.ctx.generateId('callback');

      this.ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        resolve(data.confirmed);
      });

      this.ctx.bridge.send('showConfirm', {
        windowId: this.id,
        title,
        message,
        callbackId
      });
    });
  }

  /**
   * Shows a file open dialog and returns the selected file path
   * @returns Promise<string | null> - file path if selected, null if cancelled
   */
  async showFileOpen(): Promise<string | null> {
    return new Promise((resolve) => {
      const callbackId = this.ctx.generateId('callback');

      this.ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        if (data.error || !data.filePath) {
          resolve(null);
        } else {
          resolve(data.filePath);
        }
      });

      this.ctx.bridge.send('showFileOpen', {
        windowId: this.id,
        callbackId
      });
    });
  }

  /**
   * Shows a file save dialog and returns the selected file path
   * @returns Promise<string | null> - file path if selected, null if cancelled
   */
  async showFileSave(filename?: string): Promise<string | null> {
    return new Promise((resolve) => {
      const callbackId = this.ctx.generateId('callback');

      this.ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        if (data.error || !data.filePath) {
          resolve(null);
        } else {
          resolve(data.filePath);
        }
      });

      this.ctx.bridge.send('showFileSave', {
        windowId: this.id,
        callbackId,
        filename: filename || 'untitled.txt'
      });
    });
  }

  /**
   * Resize the window to the specified dimensions
   */
  async resize(width: number, height: number): Promise<void> {
    await this.ctx.bridge.send('resizeWindow', {
      windowId: this.id,
      width,
      height
    });
  }

  /**
   * Set the window title
   */
  setTitle(title: string): void {
    this.ctx.bridge.send('setWindowTitle', {
      windowId: this.id,
      title
    });
  }

  /**
   * Center the window on the screen
   */
  async centerOnScreen(): Promise<void> {
    await this.ctx.bridge.send('centerWindow', {
      windowId: this.id
    });
  }

  /**
   * Set fullscreen mode
   */
  async setFullScreen(fullscreen: boolean): Promise<void> {
    await this.ctx.bridge.send('setWindowFullScreen', {
      windowId: this.id,
      fullscreen
    });
  }

  /**
   * Set the main menu for this window
   */
  async setMainMenu(menuDefinition: Array<{
    label: string;
    items: Array<{
      label: string;
      onSelected?: () => void;
      isSeparator?: boolean;
      disabled?: boolean;
      checked?: boolean;
    }>;
  }>): Promise<void> {
    const menuItems = menuDefinition.map(menu => {
      const items = menu.items.map(item => {
        if (item.isSeparator) {
          return { label: '', isSeparator: true };
        }

        const menuItem: any = {
          label: item.label
        };

        if (item.onSelected) {
          const callbackId = this.ctx.generateId('callback');
          menuItem.callbackId = callbackId;
          this.ctx.bridge.registerEventHandler(callbackId, (_data: any) => {
            item.onSelected!();
          });
        }

        if (item.disabled !== undefined) {
          menuItem.disabled = item.disabled;
        }

        if (item.checked !== undefined) {
          menuItem.checked = item.checked;
        }

        return menuItem;
      });

      return {
        label: menu.label,
        items
      };
    });

    await this.ctx.bridge.send('setMainMenu', {
      windowId: this.id,
      menuItems
    });
  }

  /**
   * Captures a screenshot of the window and saves it to a file
   * @param filePath - Path where the screenshot will be saved as PNG
   */
  async screenshot(filePath: string): Promise<void> {
    await this.ctx.bridge.send('captureWindow', {
      windowId: this.id,
      filePath
    });
  }

  /**
   * Shows a progress dialog with a progress bar
   * @param title - Dialog title
   * @param message - Message displayed in the dialog
   * @param options - Optional settings for the progress dialog
   * @returns ProgressDialog instance to control the dialog
   */
  async showProgress(
    title: string,
    message: string,
    options?: {
      infinite?: boolean;
      onCancelled?: () => void;
    }
  ): Promise<ProgressDialog> {
    const dialogId = this.ctx.generateId('progress-dialog');
    const callbackId = this.ctx.generateId('callback');
    const progressDialog = new ProgressDialog(this.ctx, dialogId);

    // Set up cancellation callback if provided
    if (options?.onCancelled) {
      progressDialog._setOnCancelled(options.onCancelled);
    }

    // Register event handler for cancellation
    this.ctx.bridge.registerEventHandler(callbackId, (data: any) => {
      if (data.cancelled) {
        progressDialog._handleCancelled();
      }
    });

    await this.ctx.bridge.send('showProgressDialog', {
      windowId: this.id,
      dialogId,
      title,
      message,
      infinite: options?.infinite || false,
      callbackId
    });

    return progressDialog;
  }
}
