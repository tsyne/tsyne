import { Context } from '../context';
import { Widget } from './base';

/**
 * Button widget
 */
export class Button extends Widget {
  constructor(ctx: Context, text: string, onClick?: () => void, className?: string) {
    const id = ctx.generateId('button');
    super(ctx, id);

    const payload: any = { id, text };

    if (onClick) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, () => {
        onClick();
      });
    }

    ctx.bridge.send('createButton', payload);
    ctx.addToCurrentContainer(id);

    if (className) {
      this.applyStyles(className).catch(() => {});
    } else {
      this.applyStyles('button').catch(() => {});
    }
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
    });
    return result.enabled;
  }
}

/**
 * Entry (text input) widget
 */
export class Entry extends Widget {
  constructor(ctx: Context, placeholder?: string, onSubmit?: (text: string) => void, minWidth?: number, onDoubleClick?: () => void) {
    const id = ctx.generateId('entry');
    super(ctx, id);

    const payload: any = { id, placeholder: placeholder || '' };

    if (onSubmit) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onSubmit(data.text);
      });
    }

    if (onDoubleClick) {
      const doubleClickCallbackId = ctx.generateId('callback');
      payload.doubleClickCallbackId = doubleClickCallbackId;
      ctx.bridge.registerEventHandler(doubleClickCallbackId, () => {
        onDoubleClick();
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

/**
 * Checkbox widget
 */
export class Checkbox extends Widget {
  constructor(ctx: Context, text: string, onChanged?: (checked: boolean) => void) {
    const id = ctx.generateId('checkbox');
    super(ctx, id);

    const payload: any = { id, text };

    if (onChanged) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onChanged(data.checked);
      });
    }

    ctx.bridge.send('createCheckbox', payload);
    ctx.addToCurrentContainer(id);
  }

  async setChecked(checked: boolean): Promise<void> {
    await this.ctx.bridge.send('setChecked', {
      widgetId: this.id,
      checked
    });
  }

  async getChecked(): Promise<boolean> {
    const result = await this.ctx.bridge.send('getChecked', {
      widgetId: this.id
    });
    return result.checked;
  }
}

/**
 * Select (dropdown) widget
 */
export class Select extends Widget {
  constructor(ctx: Context, options: string[], onSelected?: (selected: string) => void) {
    const id = ctx.generateId('select');
    super(ctx, id);

    const payload: any = { id, options };

    if (onSelected) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onSelected(data.selected);
      });
    }

    ctx.bridge.send('createSelect', payload);
    ctx.addToCurrentContainer(id);
  }

  async setSelected(selected: string): Promise<void> {
    await this.ctx.bridge.send('setSelected', {
      widgetId: this.id,
      selected
    });
  }

  async getSelected(): Promise<string> {
    const result = await this.ctx.bridge.send('getSelected', {
      widgetId: this.id
    });
    return result.selected;
  }
}

/**
 * SelectEntry widget - a searchable dropdown that combines a text entry with a dropdown menu.
 * Users can type to filter options or select from the dropdown list.
 */
export class SelectEntry extends Widget {
  constructor(
    ctx: Context,
    options: string[],
    placeholder?: string,
    onChanged?: (text: string) => void,
    onSubmitted?: (text: string) => void,
    onSelected?: (selected: string) => void
  ) {
    const id = ctx.generateId('selectentry');
    super(ctx, id);

    const payload: any = { id, options, placeholder: placeholder || '' };

    if (onChanged) {
      const callbackId = ctx.generateId('callback');
      payload.onChangedCallbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onChanged(data.text);
      });
    }

    if (onSubmitted) {
      const callbackId = ctx.generateId('callback');
      payload.onSubmittedCallbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onSubmitted(data.text);
      });
    }

    if (onSelected) {
      const callbackId = ctx.generateId('callback');
      payload.onSelectedCallbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onSelected(data.selected);
      });
    }

    ctx.bridge.send('createSelectEntry', payload);
    ctx.addToCurrentContainer(id);
  }

  /**
   * Set the text value of the entry
   */
  async setText(text: string): Promise<void> {
    await this.ctx.bridge.send('setText', {
      widgetId: this.id,
      text
    });
  }

  /**
   * Get the current text value
   */
  async getText(): Promise<string> {
    const result = await this.ctx.bridge.send('getText', {
      widgetId: this.id
    });
    return result.text;
  }

  /**
   * Update the dropdown options
   */
  async setOptions(options: string[]): Promise<void> {
    await this.ctx.bridge.send('setSelectEntryOptions', {
      widgetId: this.id,
      options
    });
  }
}

/**
 * Slider widget
 */
export class Slider extends Widget {
  constructor(
    ctx: Context,
    min: number,
    max: number,
    initialValue?: number,
    onChanged?: (value: number) => void
  ) {
    const id = ctx.generateId('slider');
    super(ctx, id);

    const payload: any = { id, min, max };

    if (initialValue !== undefined) {
      payload.value = initialValue;
    }

    if (onChanged) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onChanged(data.value);
      });
    }

    ctx.bridge.send('createSlider', payload);
    ctx.addToCurrentContainer(id);
  }

  async setValue(value: number): Promise<void> {
    await this.ctx.bridge.send('setValue', {
      widgetId: this.id,
      value
    });
  }

  async getValue(): Promise<number> {
    const result = await this.ctx.bridge.send('getValue', {
      widgetId: this.id
    });
    return result.value;
  }
}

/**
 * RadioGroup widget
 */
export class RadioGroup extends Widget {
  constructor(ctx: Context, options: string[], initialSelected?: string, onSelected?: (selected: string) => void) {
    const id = ctx.generateId('radiogroup');
    super(ctx, id);

    const payload: any = { id, options };

    if (initialSelected !== undefined) {
      payload.selected = initialSelected;
    }

    if (onSelected) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onSelected(data.selected);
      });
    }

    ctx.bridge.send('createRadioGroup', payload);
    ctx.addToCurrentContainer(id);
  }

  async setSelected(selected: string): Promise<void> {
    await this.ctx.bridge.send('setRadioSelected', {
      widgetId: this.id,
      selected
    });
  }

  async getSelected(): Promise<string> {
    const result = await this.ctx.bridge.send('getRadioSelected', {
      widgetId: this.id
    });
    return result.selected;
  }
}

/**
 * CheckGroup widget - multiple checkbox selection
 */
export class CheckGroup extends Widget {
  constructor(ctx: Context, options: string[], initialSelected?: string[], onChanged?: (selected: string[]) => void) {
    const id = ctx.generateId('checkgroup');
    super(ctx, id);

    const payload: any = { id, options };

    if (initialSelected !== undefined) {
      payload.selected = initialSelected;
    }

    if (onChanged) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onChanged(data.selected);
      });
    }

    ctx.bridge.send('createCheckGroup', payload);
    ctx.addToCurrentContainer(id);
  }

  async setSelected(selected: string[]): Promise<void> {
    await this.ctx.bridge.send('setCheckGroupSelected', {
      widgetId: this.id,
      selected
    });
  }

  async getSelected(): Promise<string[]> {
    const result = await this.ctx.bridge.send('getCheckGroupSelected', {
      widgetId: this.id
    });
    return result.selected;
  }
}

/**
 * DateEntry widget - Date input field with calendar picker
 * Allows users to select a date either by typing or using a calendar popup
 */
export class DateEntry extends Widget {
  constructor(ctx: Context, initialDate?: string, onChanged?: (date: string) => void) {
    const id = ctx.generateId('dateentry');
    super(ctx, id);

    const payload: any = { id };

    if (initialDate) {
      payload.date = initialDate;
    }

    if (onChanged) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onChanged(data.date);
      });
    }

    ctx.bridge.send('createDateEntry', payload);
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking)
    this.applyStyles('dateentry').catch(() => {});
  }

  /**
   * Set the date value
   * @param date Date in ISO format (YYYY-MM-DD) or empty string to clear
   */
  async setDate(date: string): Promise<void> {
    await this.ctx.bridge.send('setDate', {
      widgetId: this.id,
      date
    });
  }

  /**
   * Get the current date value
   * @returns Date in ISO format (YYYY-MM-DD) or empty string if not set
   */
  async getDate(): Promise<string> {
    const result = await this.ctx.bridge.send('getDate', {
      widgetId: this.id
    });
    return result.date;
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
}

/**
 * Calendar widget - Standalone calendar for date selection
 * Displays a full calendar month view for selecting dates
 * Unlike DateEntry, this shows the calendar inline without an input field
 */
export class Calendar extends Widget {
  constructor(ctx: Context, initialDate?: string, onSelected?: (date: string) => void) {
    const id = ctx.generateId('calendar');
    super(ctx, id);

    const payload: any = { id };

    if (initialDate) {
      payload.date = initialDate;
    }

    if (onSelected) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onSelected(data.date);
      });
    }

    ctx.bridge.send('createCalendar', payload);
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking)
    this.applyStyles('calendar').catch(() => {});
  }
}
