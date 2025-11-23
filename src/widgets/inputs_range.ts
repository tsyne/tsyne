import { Context } from '../context';
import { Widget } from './base';

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
