import { Context } from '../context';
import { Widget } from './base';

/**
 * ProgressBar widget
 */
export class ProgressBar extends Widget {
  constructor(ctx: Context, initialValue?: number, infinite?: boolean) {
    const id = ctx.generateId('progressbar');
    super(ctx, id);

    const payload: any = { id, infinite: infinite || false };

    if (!infinite && initialValue !== undefined) {
      payload.value = initialValue;
    }

    ctx.bridge.send('createProgressBar', payload);
    ctx.addToCurrentContainer(id);
  }

  async setProgress(value: number): Promise<void> {
    await this.ctx.bridge.send('setProgress', {
      widgetId: this.id,
      value
    });
  }

  async getProgress(): Promise<number> {
    const result = await this.ctx.bridge.send('getProgress', {
      widgetId: this.id
    });
    return result.value;
  }

  // Aliases to match Slider API naming convention
  async setValue(value: number): Promise<void> {
    await this.setProgress(value);
  }

  async getValue(): Promise<number> {
    return await this.getProgress();
  }
}

/**
 * ProgressBarInfinite widget - indeterminate progress indicator
 *
 * Shows an animated progress bar that indicates activity without showing
 * specific progress. Useful for operations with unknown duration.
 */
export class ProgressBarInfinite extends Widget {
  constructor(ctx: Context) {
    const id = ctx.generateId('progressbarinfinite');
    super(ctx, id);

    ctx.bridge.send('createProgressBar', { id, infinite: true });
    ctx.addToCurrentContainer(id);
  }

  /**
   * Start the progress bar animation
   */
  async start(): Promise<void> {
    await this.ctx.bridge.send('startProgressInfinite', {
      widgetId: this.id
    });
  }

  /**
   * Stop the progress bar animation
   */
  async stop(): Promise<void> {
    await this.ctx.bridge.send('stopProgressInfinite', {
      widgetId: this.id
    });
  }

  /**
   * Check if the progress bar animation is currently running
   */
  async isRunning(): Promise<boolean> {
    const result = await this.ctx.bridge.send('isProgressRunning', {
      widgetId: this.id
    });
    return result.running;
  }
}

/**
 * Activity widget - loading/busy spinner
 * Displays an animated spinner to indicate loading or processing state
 */
export class Activity extends Widget {
  constructor(ctx: Context) {
    const id = ctx.generateId('activity');
    super(ctx, id);

    ctx.bridge.send('createActivity', { id });
    ctx.addToCurrentContainer(id);
  }

  /**
   * Start the activity animation
   */
  async start(): Promise<void> {
    await this.ctx.bridge.send('startActivity', {
      widgetId: this.id
    });
  }

  /**
   * Stop the activity animation
   */
  async stop(): Promise<void> {
    await this.ctx.bridge.send('stopActivity', {
      widgetId: this.id
    });
  }
}
