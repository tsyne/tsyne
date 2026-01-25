import { Context } from '../context';
import { Widget } from './base';

/**
 * Button widget
 */
export class Button extends Widget {
  constructor(ctx: Context, text: string, className?: string) {
    const id = ctx.generateId('button');
    super(ctx, id);

    const payload: any = { id, text };

    ctx.bridge.send('createButton', payload);
    ctx.addToCurrentContainer(id, this);

    if (className) {
      this.applyStyles(className).catch(() => {});
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
 * Entry (text input) widget
 */
export class Entry extends Widget {
  constructor(
    ctx: Context,
    placeholder?: string,
    onSubmit?: (text: string) => void,
    minWidth?: number,
    onDoubleClick?: () => void,
    onChange?: (text: string) => void,
    onCursorChanged?: () => void,
    onFocus?: (focused: boolean) => void
  ) {
    const id = ctx.generateId('entry');
    super(ctx, id);

    const payload: any = { id, placeholder: placeholder || '' };

    if (onSubmit) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: unknown) => {
        const eventData = data as { text: string };
        onSubmit(eventData.text);
      });
    }

    if (onDoubleClick) {
      const doubleClickCallbackId = ctx.generateId('callback');
      payload.doubleClickCallbackId = doubleClickCallbackId;
      ctx.bridge.registerEventHandler(doubleClickCallbackId, () => {
        onDoubleClick();
      });
    }

    if (onChange) {
      const onChangeCallbackId = ctx.generateId('callback');
      payload.onChangeCallbackId = onChangeCallbackId;
      ctx.bridge.registerEventHandler(onChangeCallbackId, (data: unknown) => {
        const eventData = data as { text: string };
        onChange(eventData.text);
      });
    }

    if (onCursorChanged) {
      const cursorChangedCallbackId = ctx.generateId('callback');
      payload.onCursorChangedCallbackId = cursorChangedCallbackId;
      ctx.bridge.registerEventHandler(cursorChangedCallbackId, () => {
        onCursorChanged();
      });
    }

    if (onFocus) {
      const onFocusCallbackId = ctx.generateId('callback');
      payload.onFocusCallbackId = onFocusCallbackId;
      ctx.bridge.registerEventHandler(onFocusCallbackId, (data: unknown) => {
        const eventData = data as { focused: boolean };
        onFocus(eventData.focused);
      });
    }

    if (minWidth !== undefined) {
      payload.minWidth = minWidth;
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
