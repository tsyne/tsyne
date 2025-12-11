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
    ctx.addToCurrentContainer(id);

    if (className) {
      this.applyStyles(className).catch(() => {});
    } else {
      this.applyStyles('button').catch(() => {});
    }
  }

  onClick(callback: (this: Button) => void | Promise<void>): this {
    const callbackId = this.ctx.generateId('callback');

    // Register callback with 'this' bound to the button instance
    this.ctx.bridge.registerEventHandler(callbackId, async () => {
      await callback.call(this);
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
    placeholder?: string,
    onSubmit?: (text: string) => void,
    minWidth?: number,
    onDoubleClick?: () => void,
    onChange?: (text: string) => void,
    onCursorChanged?: () => void
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
