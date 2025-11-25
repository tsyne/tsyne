import { Context } from '../context';
import { Widget } from './base';

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
    }) as { checked: boolean };
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
    }) as { selected: string };
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
    }) as { text: string };
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
    }) as { selected: string };
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
    }) as { selected: string[] };
    return result.selected;
  }
}
