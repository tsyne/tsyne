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
  icon?: string;  // Resource name registered via ResourceManager
  padded?: boolean;  // Whether to add padding around content (default true, set false for fullscreen)
}

/**
 * Window represents a Fyne window
 */
export class Window {
  private ctx: Context;
  public id: string;
  private contentId?: string;
  private contentSent: boolean = false; // Track if content has been sent to bridge
  private creationPromise: Promise<unknown>; // Track window creation for proper sequencing
  private setContentPromise: Promise<void> | null = null; // Track pending setContent() calls

  constructor(ctx: Context, options: WindowOptions, builder?: (win: Window) => void | Promise<void>) {
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
    if (options.padded !== undefined) {
      payload.padded = options.padded;
    }
    // Pass inspector enabled state to Go side
    payload.inspectorEnabled = ctx.isInspectorEnabled();

    // Store the creation promise to ensure window exists before subsequent operations
    this.creationPromise = ctx.bridge.send('createWindow', payload);

    // Register dialog handlers for browser compatibility globals
    registerDialogHandlers({
      alert: (message: string) => {
        this.showInfo('Alert', message);
      },
      confirm: async (message: string): Promise<boolean> => {
        return await this.showConfirm('Confirm', message);
      },
      prompt: async (message: string, _defaultValue?: string): Promise<string | null> => {
        return await this.showEntryDialog('Input', message);
      }
    });

    if (builder) {
      // Note: We can't use await here because constructors can't be async
      // For async initialization, users should call setContent() separately
      ctx.pushWindow(this.id);
      ctx.pushContainer();

      const result = builder(this);
      // If builder returns a Promise, this is a problem - we can't await in constructor
      // Log a warning if the builder is async
      if (result && typeof (result as any).then === 'function') {
        console.warn('Window constructor received async builder - async operations may not complete. Use window.setContent() instead for async builders.');
      }

      const children = ctx.popContainer();
      if (children.length > 0) {
        // Use the first (and should be only) child as content
        this.contentId = children[0];
      }

      ctx.popWindow();
    }
  }

  /**
   * Show the window on screen.
   * If content has been set but not yet sent to the bridge, it will be sent before showing.
   */
  async show(): Promise<void> {
    // Ensure window creation has completed before showing
    await this.creationPromise;

    // Wait for any pending setContent() to complete
    if (this.setContentPromise) {
      await this.setContentPromise;
    }

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

  /**
   * Set or replace the window's content.
   * @param builder - Function that creates the content widgets
   * @example
   * ```typescript
   * win.setContent(() => {
   *   a.vbox(() => {
   *     a.label('New content');
   *     a.button('Click', () => {});
   *   });
   * });
   * ```
   */
  async setContent(builder: () => void | Promise<void>): Promise<void> {
    // Store the promise so show() can wait for it to complete
    this.setContentPromise = this._doSetContent(builder);
    return this.setContentPromise;
  }

  /**
   * Internal method that actually performs setContent
   */
  private async _doSetContent(builder: () => void | Promise<void>): Promise<void> {
    // Mark as sent immediately (synchronously) to prevent duplicate calls
    this.contentSent = true;

    // Build widgets synchronously first - this must happen before any awaits
    // so widgets are registered in the current execution context
    this.ctx.pushWindow(this.id);
    this.ctx.pushContainer();

    await builder();

    const children = this.ctx.popContainer();
    if (children.length > 0) {
      this.contentId = children[0];
    }

    this.ctx.popWindow();

    // Wait for all withId() registrations to complete before sending content
    // This ensures getById() works immediately after setContent() returns
    await this.ctx.waitForRegistrations();

    // Now ensure window creation has completed before sending to bridge
    await this.creationPromise;

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
    // Check for mocked response in test harness
    const testHarness = this.ctx.testHarness;
    if (testHarness && testHarness.hasMockedFileDialog('open')) {
      const mockedResponse = testHarness.popMockedFileDialog('open');
      return mockedResponse === undefined ? null : mockedResponse;
    }

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
    // Check for mocked response in test harness
    const testHarness = this.ctx.testHarness;
    if (testHarness && testHarness.hasMockedFileDialog('save')) {
      const mockedResponse = testHarness.popMockedFileDialog('save');
      return mockedResponse === undefined ? null : mockedResponse;
    }

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
   * Shows a folder open dialog and returns the selected folder path
   * @returns Promise<string | null> - folder path if selected, null if cancelled
   */
  async showFolderOpen(): Promise<string | null> {
    return new Promise((resolve) => {
      const callbackId = this.ctx.generateId('callback');

      this.ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        if (data.error || !data.folderPath) {
          resolve(null);
        } else {
          resolve(data.folderPath);
        }
      });

      this.ctx.bridge.send('showFolderOpen', {
        windowId: this.id,
        callbackId
      });
    });
  }

  /**
   * Shows a form dialog with customizable fields
   * @param title - Dialog title
   * @param fields - Array of form field definitions
   * @param options - Optional confirm/dismiss button text
   * @returns Promise with submitted status and field values
   * @example
   * const result = await win.showForm('Add Contact', [
   *   { name: 'firstName', label: 'First Name', placeholder: 'John' },
   *   { name: 'lastName', label: 'Last Name', placeholder: 'Doe' },
   *   { name: 'email', label: 'Email', type: 'entry', hint: 'e.g. john@example.com' },
   *   { name: 'category', label: 'Category', type: 'select', options: ['Work', 'Personal', 'Family'] }
   * ]);
   * if (result.submitted) {
   *   console.log('Name:', result.values.firstName, result.values.lastName);
   * }
   */
  async showForm(
    title: string,
    fields: Array<{
      name: string;
      label: string;
      type?: 'entry' | 'password' | 'multiline' | 'select' | 'check';
      placeholder?: string;
      value?: string;
      hint?: string;
      options?: string[]; // For select type
    }>,
    options?: {
      confirmText?: string;
      dismissText?: string;
    }
  ): Promise<{ submitted: boolean; values: Record<string, string | boolean> }> {
    return new Promise((resolve) => {
      const callbackId = this.ctx.generateId('callback');

      this.ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        resolve({
          submitted: data.submitted,
          values: data.values || {}
        });
      });

      this.ctx.bridge.send('showForm', {
        windowId: this.id,
        title,
        confirmText: options?.confirmText || 'Submit',
        dismissText: options?.dismissText || 'Cancel',
        callbackId,
        fields
      });
    });
  }

  /**
   * Shows a color picker dialog and returns the selected color
   * @param title - Title for the color picker dialog
   * @param initialColor - Initial color as hex string (e.g., "#ff0000")
   * @returns Promise with color info (hex, r, g, b, a) or null if cancelled
   */
  async showColorPicker(title: string = 'Pick a Color', initialColor?: string): Promise<{
    hex: string;
    r: number;
    g: number;
    b: number;
    a: number;
  } | null> {
    return new Promise((resolve) => {
      const callbackId = this.ctx.generateId('callback');

      this.ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        if (data.cancelled) {
          resolve(null);
        } else {
          resolve({
            hex: data.hex,
            r: data.r,
            g: data.g,
            b: data.b,
            a: data.a
          });
        }
      });

      this.ctx.bridge.send('showColorPicker', {
        windowId: this.id,
        title,
        callbackId,
        initialColor: initialColor || '#000000'
      });
    });
  }

  /**
   * Show a dialog with a text input field for quick text input.
   * @param title - Dialog title
   * @param message - Prompt message to display
   * @returns Promise resolving to the entered text, or null if cancelled/empty
   * @example
   * ```typescript
   * const name = await win.showEntryDialog('Name', 'Enter your name:');
   * if (name) {
   *   console.log(`Hello, ${name}!`);
   * }
   * ```
   */
  async showEntryDialog(title: string, message: string): Promise<string | null> {
    return new Promise((resolve) => {
      const callbackId = this.ctx.generateId('callback');

      this.ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        if (data.cancelled || data.text === '') {
          resolve(null);
        } else {
          resolve(data.text);
        }
      });

      this.ctx.bridge.send('showEntryDialog', {
        windowId: this.id,
        title,
        message,
        callbackId
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
   * Move the window to a specific position
   */
  async move(x: number, y: number): Promise<void> {
    await this.ctx.bridge.send('moveWindow', {
      windowId: this.id,
      x,
      y
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
      // Send response back to Go bridge - ignore errors since bridge may be shutting down
      this.ctx.bridge.send('closeInterceptResponse', {
        windowId: this.id,
        allowClose
      }).catch(() => {});
    });

    this.ctx.bridge.send('setWindowCloseIntercept', {
      windowId: this.id,
      callbackId
    });
  }

  /**
   * Hide the window (minimize or make invisible)
   */
  async hide(): Promise<void> {
    await this.ctx.bridge.send('hideWindow', {
      windowId: this.id
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
   * Bring the window to the front (request focus)
   */
  async bringToFront(): Promise<void> {
    await this.ctx.bridge.send('requestFocusWindow', {
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

  /**
   * Shows a custom dialog without any buttons (no dismiss/confirm)
   * Useful for non-dismissable loading overlays or modal content that must be closed programmatically
   * @param title - Dialog title
   * @param contentBuilder - Function that builds the dialog content
   * @returns Object with hide() method to close the dialog programmatically
   */
  async showCustomWithoutButtons(
    title: string,
    contentBuilder: () => void
  ): Promise<{ hide: () => Promise<void> }> {
    // Build the content widget
    this.ctx.pushWindow(this.id);
    this.ctx.pushContainer();

    contentBuilder();

    const children = this.ctx.popContainer();
    this.ctx.popWindow();

    if (children.length === 0) {
      return { hide: async () => {} };
    }

    const contentId = children[0];
    const dialogId = this.ctx.generateId('dialog');

    await this.ctx.bridge.send('showCustomWithoutButtons', {
      windowId: this.id,
      dialogId,
      title,
      contentId
    });

    return {
      hide: async () => {
        await this.ctx.bridge.send('hideCustomDialog', {
          dialogId
        });
      }
    };
  }

  // ==================== Clipboard ====================

  /**
   * Get the current clipboard content
   * @returns The text content of the clipboard
   */
  async getClipboard(): Promise<string> {
    const result = await this.ctx.bridge.send('clipboardGet', {
      windowId: this.id
    }) as { content: string };
    return result.content;
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

  // ==================== Resize ====================

  /**
   * Register a callback for when this window's size changes.
   * The callback receives the new width and height.
   * @param callback Function called with new width and height when window resizes
   * @returns this for method chaining
   */
  onResize(callback: (width: number, height: number) => void): this {
    const callbackId = this.ctx.generateId('resize');
    this.ctx.bridge.registerEventHandler(callbackId, (data: any) => {
      callback(data.width, data.height);
    });
    this.ctx.bridge.send('setWindowOnResize', {
      windowId: this.id,
      callbackId
    });
    return this;
  }

  /**
   * Get the current window size.
   * @returns Object with width and height properties
   */
  getSize(): { width: number; height: number } {
    // For now, return cached size or default
    // TODO: Could call bridge synchronously or cache from onResize
    return this._cachedSize || { width: 800, height: 600 };
  }

  private _cachedSize?: { width: number; height: number };
}
