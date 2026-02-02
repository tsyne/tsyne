import { Context } from '../context';
import { Widget } from './base';

/**
 * Button options
 */
export interface ButtonOptions {
  /** CSS class name for styling */
  className?: string;
  /** Font size in pixels */
  textSize?: number;
}

/**
 * Entry options for declarative configuration
 */
export interface EntryOptions {
  /** Initial text value */
  text?: string;
  /** Placeholder text shown when empty */
  placeholder?: string;
  /** Callback when text changes */
  onChange?: (text: string) => void;
  /** Callback when Enter is pressed */
  onSubmit?: (text: string) => void;
  /** Minimum width in pixels */
  minWidth?: number;
  /** Callback on double-click */
  onDoubleClick?: () => void;
  /** Callback when cursor position changes */
  onCursorChanged?: () => void;
  /** Callback when focus changes */
  onFocus?: (focused: boolean) => void;
}

/**
 * Button widget
 */
export class Button extends Widget {
  constructor(ctx: Context, text: string, classNameOrOptions?: string | ButtonOptions) {
    const id = ctx.generateId('button');
    super(ctx, id);

    // Fast-fail: detect common mistake of passing callback as constructor arg
    if (typeof classNameOrOptions === 'function') {
      throw new Error(
        `❌ Button constructor does not accept a callback as the third argument.\n\n` +
        `You passed a function instead of className/options.\n\n` +
        `WRONG: a.button('Label', handler)\n` +
        `RIGHT: a.button('Label').onClick(handler)\n\n` +
        `See LLM.md "Mental Shift: Fluent Methods vs Constructor Parameters" for details.`
      );
    }

    // Handle both old signature (className string) and new options object
    let options: ButtonOptions = {};
    if (typeof classNameOrOptions === 'object') {
      options = classNameOrOptions;
    } else if (typeof classNameOrOptions === 'string') {
      options = { className: classNameOrOptions };
    }

    const payload: any = { id, text };
    if (options.textSize) {
      payload.textSize = options.textSize;
    }

    ctx.bridge.send('createButton', payload);
    ctx.addToCurrentContainer(id, this);

    if (options.className) {
      this.applyStyles(options.className).catch(() => {});
    } else {
      this.applyStyles('button').catch(() => {});
    }
  }

  onClick(callback: (btn: Button) => void | Promise<void>): this {
    const callbackId = this.ctx.generateId('callback');

    // Register callback, passing the button as argument
    this.ctx.bridge.registerEventHandler(callbackId, async () => {
      await callback(this);
    });

    // Tell the bridge to use this callback ID for this button
    this.ctx.bridge.send('setWidgetCallback', {
      widgetId: this.id,
      callbackId
    }).catch(() => {
      // If send fails, the handler is still registered, just won't be triggered
    });

    return this;
  }

  async disable(): Promise<void> {
    await this.ctx.bridge.send('disableWidget', {
      widgetId: this.id
    });
  }

  async enable(): Promise<void> {
    await this.ctx.bridge.send('enableWidget', {
      widgetId: this.id
    });
  }

  async isEnabled(): Promise<boolean> {
    const result = await this.ctx.bridge.send('isEnabled', {
      widgetId: this.id
    }) as { enabled: boolean };
    return result.enabled;
  }
}

/**
 * Menu item for MenuButton popup menu (internal)
 */
export interface PopupMenuItem {
  label: string;
  onClick: () => void;
}

/**
 * Builder for MenuButton menu items
 * Allows declarative menu construction with loops and conditionals
 */
export class MenuBuilder {
  private items: PopupMenuItem[] = [];

  /**
   * Add a menu item
   * @param label - Display text for the menu item
   * @param onClick - Callback when item is selected
   */
  item(label: string, onClick: () => void): this {
    this.items.push({ label, onClick });
    return this;
  }

  /** @internal Get collected items */
  getItems(): PopupMenuItem[] {
    return this.items;
  }
}

/**
 * MenuButton - a button that shows a popup menu when clicked
 * The menu appears directly below the button, positioned automatically.
 *
 * @example
 * a.menuButton('…', (menu) => {
 *   menu.item('Delete', () => deleteItem());
 *   menu.item('Edit', () => editItem());
 * });
 */
export class MenuButton extends Widget {
  constructor(ctx: Context, text: string, builder: (menu: MenuBuilder) => void, windowId: string) {
    const id = ctx.generateId('menubutton');
    super(ctx, id);

    // Collect menu items via builder
    const menuBuilder = new MenuBuilder();
    builder(menuBuilder);
    const menuItems = menuBuilder.getItems();

    // Build menu items with callbacks
    const items = menuItems.map((item) => {
      const callbackId = ctx.generateId('callback');
      ctx.bridge.registerEventHandler(callbackId, () => {
        item.onClick();
      });
      return {
        label: item.label,
        callbackId
      };
    });

    ctx.bridge.send('createMenuButton', {
      id,
      text,
      windowId,
      menuItems: items
    });
    ctx.addToCurrentContainer(id, this);
  }
}

/**
 * ImageButton widget - displays an image above text, with button-like tap handling.
 * Use this instead of Image with onClick for reliable touch support on mobile.
 */
export class ImageButton extends Widget {
  constructor(
    ctx: Context,
    options: {
      resource?: string;
      text?: string;
      textSize?: number;
    }
  ) {
    const id = ctx.generateId('imageButton');
    super(ctx, id);

    const payload: any = {
      id,
      text: options.text || '',
    };

    if (options.resource) {
      // Apply resource scoping for multi-instance app isolation
      payload.resource = ctx.scopeResourceName(options.resource);
    }

    if (options.textSize) {
      payload.textSize = options.textSize;
    }

    ctx.bridge.send('createImageButton', payload);
    ctx.addToCurrentContainer(id, this);
  }

  onClick(callback: (btn: ImageButton) => void | Promise<void>): this {
    const callbackId = this.ctx.generateId('callback');

    // Register callback, passing the button as argument
    this.ctx.bridge.registerEventHandler(callbackId, async () => {
      await callback(this);
    });

    // Tell the bridge to use this callback ID for this button
    this.ctx.bridge.send('setWidgetCallback', {
      widgetId: this.id,
      callbackId
    }).catch(() => {
      // If send fails, the handler is still registered, just won't be triggered
    });

    return this;
  }

  async disable(): Promise<void> {
    await this.ctx.bridge.send('disableWidget', {
      widgetId: this.id
    });
  }

  async enable(): Promise<void> {
    await this.ctx.bridge.send('enableWidget', {
      widgetId: this.id
    });
  }

  async isEnabled(): Promise<boolean> {
    const result = await this.ctx.bridge.send('isEnabled', {
      widgetId: this.id
    }) as { enabled: boolean };
    return result.enabled;
  }
}

/**
 * Entry (text input) widget
 */
export class Entry extends Widget {
  constructor(
    ctx: Context,
    placeholderOrOptions?: string | EntryOptions,
    onSubmit?: (text: string) => void,
    minWidth?: number,
    onDoubleClick?: () => void,
    onChange?: (text: string) => void,
    onCursorChanged?: () => void,
    onFocus?: (focused: boolean) => void
  ) {
    const id = ctx.generateId('entry');
    super(ctx, id);

    // Normalize arguments: support both options object and positional args
    let opts: EntryOptions;
    if (typeof placeholderOrOptions === 'object' && placeholderOrOptions !== null) {
      opts = placeholderOrOptions;
    } else {
      opts = {
        placeholder: placeholderOrOptions,
        onSubmit,
        minWidth,
        onDoubleClick,
        onChange,
        onCursorChanged,
        onFocus,
      };
    }

    const payload: any = { id, placeholder: opts.placeholder || '' };

    // Set initial text if provided
    if (opts.text) {
      payload.text = opts.text;
    }

    if (opts.onSubmit) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: unknown) => {
        const eventData = data as { text: string };
        opts.onSubmit!(eventData.text);
      });
    }

    if (opts.onDoubleClick) {
      const doubleClickCallbackId = ctx.generateId('callback');
      payload.doubleClickCallbackId = doubleClickCallbackId;
      ctx.bridge.registerEventHandler(doubleClickCallbackId, () => {
        opts.onDoubleClick!();
      });
    }

    if (opts.onChange) {
      const onChangeCallbackId = ctx.generateId('callback');
      payload.onChangeCallbackId = onChangeCallbackId;
      ctx.bridge.registerEventHandler(onChangeCallbackId, (data: unknown) => {
        const eventData = data as { text: string };
        opts.onChange!(eventData.text);
      });
    }

    if (opts.onCursorChanged) {
      const cursorChangedCallbackId = ctx.generateId('callback');
      payload.onCursorChangedCallbackId = cursorChangedCallbackId;
      ctx.bridge.registerEventHandler(cursorChangedCallbackId, () => {
        opts.onCursorChanged!();
      });
    }

    if (opts.onFocus) {
      const onFocusCallbackId = ctx.generateId('callback');
      payload.onFocusCallbackId = onFocusCallbackId;
      ctx.bridge.registerEventHandler(onFocusCallbackId, (data: unknown) => {
        const eventData = data as { focused: boolean };
        opts.onFocus!(eventData.focused);
      });
    }

    if (opts.minWidth !== undefined) {
      payload.minWidth = opts.minWidth;
    }

    ctx.bridge.send('createEntry', payload);
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking)
    this.applyStyles('entry').catch(() => {});
  }

  async disable(): Promise<void> {
    await this.ctx.bridge.send('disableWidget', {
      widgetId: this.id
    });
  }

  async enable(): Promise<void> {
    await this.ctx.bridge.send('enableWidget', {
      widgetId: this.id
    });
  }

  async focus(): Promise<void> {
    await this.ctx.bridge.send('focusWidget', {
      widgetId: this.id
    });
  }

  async submit(): Promise<void> {
    await this.ctx.bridge.send('submitEntry', {
      widgetId: this.id
    });
  }
}

/**
 * Multi-line text entry widget
 */
export class MultiLineEntry extends Widget {
  constructor(ctx: Context, placeholder?: string, wrapping?: 'off' | 'word' | 'break') {
    const id = ctx.generateId('multilineentry');
    super(ctx, id);

    const payload: any = { id, placeholder: placeholder || '' };
    if (wrapping) {
      payload.wrapping = wrapping;
    }

    ctx.bridge.send('createMultiLineEntry', payload);
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking)
    this.applyStyles('multilineentry').catch(() => {});
  }
}

/**
 * Password entry widget (text is masked)
 */
export class PasswordEntry extends Widget {
  constructor(ctx: Context, placeholder?: string, onSubmit?: (text: string) => void) {
    const id = ctx.generateId('passwordentry');
    super(ctx, id);

    const payload: any = { id, placeholder: placeholder || '' };

    if (onSubmit) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onSubmit(data.text);
      });
    }

    ctx.bridge.send('createPasswordEntry', payload);
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking)
    this.applyStyles('passwordentry').catch(() => {});
  }
}
