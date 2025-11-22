import { Context } from './context';
import { registerDialogHandlers } from './globals';

export interface WindowOptions {
  title: string;
  width?: number;
  height?: number;
  fixedSize?: boolean;
  icon?: string;  // Resource name registered via ResourceManager
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
    if (options.icon !== undefined) {
      payload.icon = options.icon;
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
   * Set the window icon
   * @param resourceName - Name of a resource registered via ResourceManager
   */
  async setIcon(resourceName: string): Promise<void> {
    await this.ctx.bridge.send('setWindowIcon', {
      windowId: this.id,
      resourceName
    });
  }

  /**
   * Set a close intercept handler that is called before the window closes
   * Return true from the callback to allow close, false to prevent it
   * @param callback - Function called when user tries to close the window
   */
  setCloseIntercept(callback: () => Promise<boolean> | boolean): void {
    const callbackId = this.ctx.generateId('callback');

    this.ctx.bridge.registerEventHandler(callbackId, async (_data: any) => {
      const allowClose = await callback();
      // Send response back to Go bridge
      this.ctx.bridge.send('closeInterceptResponse', {
        windowId: this.id,
        allowClose
      });
    });

    this.ctx.bridge.send('setWindowCloseIntercept', {
      windowId: this.id,
      callbackId
    });
  }

  /**
   * Close the window programmatically
   */
  async close(): Promise<void> {
    await this.ctx.bridge.send('closeWindow', {
      windowId: this.id
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
   * Shows a custom dialog with arbitrary content
   * @param title - Dialog title
   * @param contentBuilder - Function that builds the dialog content using the app context
   * @param options - Optional configuration for the dialog
   * @returns Promise that resolves when the dialog is closed
   */
  async showCustom(
    title: string,
    contentBuilder: () => void,
    options?: {
      dismissText?: string;
      onClosed?: () => void;
    }
  ): Promise<void> {
    return new Promise((resolve) => {
      // Build the content widget
      this.ctx.pushWindow(this.id);
      this.ctx.pushContainer();

      contentBuilder();

      const children = this.ctx.popContainer();
      this.ctx.popWindow();

      if (children.length === 0) {
        resolve();
        return;
      }

      const contentId = children[0];
      const callbackId = this.ctx.generateId('callback');

      this.ctx.bridge.registerEventHandler(callbackId, (_data: any) => {
        if (options?.onClosed) {
          options.onClosed();
        }
        resolve();
      });

      this.ctx.bridge.send('showCustom', {
        windowId: this.id,
        title,
        contentId,
        dismissText: options?.dismissText || 'Close',
        callbackId
      });
    });
  }

  /**
   * Shows a custom dialog with confirm/cancel buttons
   * @param title - Dialog title
   * @param contentBuilder - Function that builds the dialog content using the app context
   * @param options - Optional configuration for the dialog
   * @returns Promise<boolean> - true if user confirmed, false if cancelled
   */
  async showCustomConfirm(
    title: string,
    contentBuilder: () => void,
    options?: {
      confirmText?: string;
      dismissText?: string;
    }
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // Build the content widget
      this.ctx.pushWindow(this.id);
      this.ctx.pushContainer();

      contentBuilder();

      const children = this.ctx.popContainer();
      this.ctx.popWindow();

      if (children.length === 0) {
        resolve(false);
        return;
      }

      const contentId = children[0];
      const callbackId = this.ctx.generateId('callback');

      this.ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        resolve(data.confirmed);
      });

      this.ctx.bridge.send('showCustomConfirm', {
        windowId: this.id,
        title,
        contentId,
        confirmText: options?.confirmText || 'OK',
        dismissText: options?.dismissText || 'Cancel',
        callbackId
      });
    });
  }

  // ==================== Clipboard ====================

  /**
   * Get the current clipboard content
   * @returns The text content of the clipboard
   */
  async getClipboard(): Promise<string> {
    const result = await this.ctx.bridge.send('clipboardGet', {
      windowId: this.id
    });
    return result.content as string;
  }

  /**
   * Set the clipboard content
   * @param content The text to copy to clipboard
   */
  async setClipboard(content: string): Promise<void> {
    await this.ctx.bridge.send('clipboardSet', {
      windowId: this.id,
      content
    });
  }
}
