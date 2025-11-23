import { Context } from '../context';

/**
 * Card container with title, subtitle, and content
 */
export class Card {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, title: string, subtitle: string, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('card');

    // Build card content
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('Card must have exactly one child');
    }

    ctx.bridge.send('createCard', {
      id: this.id,
      title,
      subtitle,
      contentId: children[0]
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Form widget with labeled fields and submit/cancel buttons
 */
export class Form {
  private ctx: Context;
  public id: string;

  constructor(
    ctx: Context,
    items: Array<{label: string, widget: any}>,
    onSubmit?: () => void,
    onCancel?: () => void
  ) {
    this.ctx = ctx;
    this.id = ctx.generateId('form');

    const formItems = items.map(item => ({
      label: item.label,
      widgetId: item.widget.id
    }));

    const payload: any = {
      id: this.id,
      items: formItems
    };

    if (onSubmit) {
      const submitCallbackId = ctx.generateId('callback');
      payload.submitCallbackId = submitCallbackId;
      ctx.bridge.registerEventHandler(submitCallbackId, (_data: any) => {
        onSubmit();
      });
    }

    if (onCancel) {
      const cancelCallbackId = ctx.generateId('callback');
      payload.cancelCallbackId = cancelCallbackId;
      ctx.bridge.registerEventHandler(cancelCallbackId, (_data: any) => {
        onCancel();
      });
    }

    ctx.bridge.send('createForm', payload);
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * InnerWindow - a window-like container that can be placed inside a canvas
 * Useful for MDI (Multiple Document Interface) applications
 */
export class InnerWindow {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, title: string, builder: () => void, onClose?: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('innerwindow');

    // Build content
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('InnerWindow must have exactly one child');
    }

    const contentId = children[0];

    const payload: any = {
      id: this.id,
      title,
      contentId
    };

    if (onClose) {
      const closeCallbackId = ctx.generateId('callback');
      payload.onCloseCallbackId = closeCallbackId;
      ctx.bridge.registerEventHandler(closeCallbackId, () => {
        onClose();
      });
    }

    ctx.bridge.send('createInnerWindow', payload);
    ctx.addToCurrentContainer(this.id);
  }

  /**
   * Close the inner window
   */
  async close(): Promise<void> {
    await this.ctx.bridge.send('innerWindowClose', {
      widgetId: this.id
    });
  }

  /**
   * Set the title of the inner window
   */
  async setTitle(title: string): Promise<void> {
    await this.ctx.bridge.send('setInnerWindowTitle', {
      widgetId: this.id,
      title
    });
  }

  /**
   * Hide the inner window
   */
  async hide(): Promise<void> {
    await this.ctx.bridge.send('hideWidget', {
      widgetId: this.id
    });
  }

  /**
   * Show the inner window
   */
  async show(): Promise<void> {
    await this.ctx.bridge.send('showWidget', {
      widgetId: this.id
    });
  }

  /**
   * Register a custom ID for this inner window (for test framework getByID)
   * @param customId Custom ID to register
   * @returns this for method chaining
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
 * ThemeOverride container - applies a specific theme (dark/light) to its contents
 * This allows different regions of the UI to have different themes
 */
export class ThemeOverride {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, variant: 'dark' | 'light', builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('themeoverride');

    // Build child content
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('ThemeOverride must have exactly one child');
    }

    ctx.bridge.send('createThemeOverride', {
      id: this.id,
      childId: children[0],
      variant
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Navigation options for creating a navigation container
 */
export interface NavigationOptions {
  /** Optional title for the root level */
  title?: string;
  /** Callback when back button is pressed */
  onBack?: () => void;
  /** Callback when forward button is pressed */
  onForward?: () => void;
}

/**
 * Navigation container - stack-based navigation with back/forward controls
 * Provides a navigation bar with title and manages a stack of content views
 */
export class Navigation {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, rootBuilder: () => void, options?: NavigationOptions) {
    this.ctx = ctx;
    this.id = ctx.generateId('navigation');

    // Build root content
    ctx.pushContainer();
    rootBuilder();
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('Navigation must have exactly one root child');
    }

    const rootId = children[0];

    const payload: any = {
      id: this.id,
      rootId
    };

    if (options?.title) {
      payload.title = options.title;
    }

    if (options?.onBack) {
      const onBackCallbackId = ctx.generateId('callback');
      payload.onBackCallbackId = onBackCallbackId;
      ctx.bridge.registerEventHandler(onBackCallbackId, () => {
        options.onBack!();
      });
    }

    if (options?.onForward) {
      const onForwardCallbackId = ctx.generateId('callback');
      payload.onForwardCallbackId = onForwardCallbackId;
      ctx.bridge.registerEventHandler(onForwardCallbackId, () => {
        options.onForward!();
      });
    }

    ctx.bridge.send('createNavigation', payload);
    ctx.addToCurrentContainer(this.id);
  }

  /**
   * Push a new view onto the navigation stack
   * @param builder Function that creates the content to push
   * @param title Optional title for the new view
   */
  push(builder: () => void, title?: string): void {
    // Build the content to push
    this.ctx.pushContainer();
    builder();
    const children = this.ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('Navigation.push() must create exactly one child');
    }

    const contentId = children[0];

    const payload: any = {
      navigationId: this.id,
      contentId
    };

    if (title) {
      payload.title = title;
    }

    this.ctx.bridge.send('navigationPush', payload);
  }

  /**
   * Go back to the previous view
   */
  async back(): Promise<void> {
    await this.ctx.bridge.send('navigationBack', {
      navigationId: this.id
    });
  }

  /**
   * Go forward to the next view (if available after going back)
   */
  async forward(): Promise<void> {
    await this.ctx.bridge.send('navigationForward', {
      navigationId: this.id
    });
  }

  /**
   * Set the root-level navigation title
   * @param title The new title
   */
  async setTitle(title: string): Promise<void> {
    await this.ctx.bridge.send('navigationSetTitle', {
      navigationId: this.id,
      title,
      current: false
    });
  }

  /**
   * Set the title for the current navigation level
   * @param title The new title
   */
  async setCurrentTitle(title: string): Promise<void> {
    await this.ctx.bridge.send('navigationSetTitle', {
      navigationId: this.id,
      title,
      current: true
    });
  }
}

/**
 * Popup widget - floating overlay that can be positioned anywhere on the canvas
 * Useful for tooltips, popovers, context menus, and floating panels
 */
export class Popup {
  private ctx: Context;
  public id: string;
  private windowId: string;

  constructor(ctx: Context, windowId: string, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('popup');
    this.windowId = windowId;

    // Build popup content
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('Popup must have exactly one child widget');
    }

    const contentId = children[0];

    // Create the popup (initially hidden)
    ctx.bridge.send('createPopup', {
      id: this.id,
      contentId,
      windowId
    });

    // Note: Popup is NOT added to current container - it's a floating overlay
  }

  /**
   * Show the popup centered on the canvas
   */
  async show(): Promise<void> {
    await this.ctx.bridge.send('showPopup', {
      widgetId: this.id
    });
  }

  /**
   * Show the popup at a specific position
   * @param x X coordinate
   * @param y Y coordinate
   */
  async showAt(x: number, y: number): Promise<void> {
    await this.ctx.bridge.send('showPopup', {
      widgetId: this.id,
      x,
      y
    });
  }

  /**
   * Hide the popup
   */
  async hide(): Promise<void> {
    await this.ctx.bridge.send('hidePopup', {
      widgetId: this.id
    });
  }

  /**
   * Move the popup to a new position
   * @param x X coordinate
   * @param y Y coordinate
   */
  async move(x: number, y: number): Promise<void> {
    await this.ctx.bridge.send('movePopup', {
      widgetId: this.id,
      x,
      y
    });
  }
}

/**
 * MultipleWindows container - MDI (Multiple Document Interface) container
 * Manages multiple InnerWindows with drag/resize support
 */
export class MultipleWindows {
  private ctx: Context;
  public id: string;
  private innerWindowIds: string[] = [];

  constructor(ctx: Context, builder?: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('multiplewindows');

    let children: string[] = [];
    if (builder) {
      // Build initial inner windows
      ctx.pushContainer();
      builder();
      children = ctx.popContainer();
      this.innerWindowIds = [...children];
    }

    ctx.bridge.send('createMultipleWindows', {
      id: this.id,
      children
    });

    ctx.addToCurrentContainer(this.id);
  }

  /**
   * Add a new inner window to the container
   * @param title Window title
   * @param builder Function to build window content
   * @param onClose Optional callback when window is closed
   * @returns The created InnerWindow
   */
  addWindow(title: string, builder: () => void, onClose?: () => void): InnerWindow {
    const innerWin = new InnerWindow(this.ctx, title, builder, onClose);
    this.innerWindowIds.push(innerWin.id);

    // Add to the container
    this.ctx.bridge.send('multipleWindowsAddWindow', {
      containerId: this.id,
      windowId: innerWin.id
    });

    return innerWin;
  }

  /**
   * Remove an inner window from the container
   * @param innerWindow The InnerWindow to remove
   */
  async removeWindow(innerWindow: InnerWindow): Promise<void> {
    const idx = this.innerWindowIds.indexOf(innerWindow.id);
    if (idx !== -1) {
      this.innerWindowIds.splice(idx, 1);
    }
    await this.ctx.bridge.send('multipleWindowsRemoveWindow', {
      containerId: this.id,
      windowId: innerWindow.id
    });
  }

  /**
   * Hide the container
   */
  async hide(): Promise<void> {
    await this.ctx.bridge.send('hideWidget', {
      widgetId: this.id
    });
  }

  /**
   * Show the container
   */
  async show(): Promise<void> {
    await this.ctx.bridge.send('showWidget', {
      widgetId: this.id
    });
  }
}
