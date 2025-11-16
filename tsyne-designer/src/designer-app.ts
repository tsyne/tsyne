import { App, AppOptions } from '../../src/app';
import { Context } from '../../src/context';
import { Button, Label, Entry, VBox, HBox } from '../../src/widgets';
import { MetadataStore, WidgetMetadata } from './metadata';
import { StackTraceParser } from './stack-trace-parser';

/**
 * DesignerApp extends App to intercept widget creation and capture metadata
 */
export class DesignerApp extends App {
  public metadata: MetadataStore = new MetadataStore();
  private currentParent: string | null = null;
  private parentStack: string[] = [];

  constructor(options?: AppOptions, testMode: boolean = false) {
    super(options, testMode);
  }

  /**
   * Capture metadata from widget creation
   */
  private captureMetadata(
    widget: any,
    widgetType: string,
    properties: Record<string, any>,
    eventHandlers: Record<string, any>
  ): void {
    const stack = new Error().stack || '';
    const sourceLocation = StackTraceParser.parseStackTrace(stack, 3);

    const eventHandlerSources: Record<string, string> = {};
    for (const [name, handler] of Object.entries(eventHandlers)) {
      if (typeof handler === 'function') {
        eventHandlerSources[name] = handler.toString();
      }
    }

    const metadata: WidgetMetadata = {
      widgetId: widget.id,
      widgetType,
      sourceLocation: sourceLocation || { file: 'unknown', line: 0, column: 0 },
      properties,
      eventHandlers: eventHandlerSources,
      children: [],
      parent: this.currentParent
    };

    this.metadata.set(widget.id, metadata);

    // Update parent's children list
    if (this.currentParent) {
      const parentMetadata = this.metadata.get(this.currentParent);
      if (parentMetadata) {
        parentMetadata.children.push(widget.id);
      }
    }
  }

  /**
   * Helper to execute a builder with parent context
   */
  private withParent<T>(widgetId: string, builder: () => T): T {
    this.parentStack.push(this.currentParent || '');
    this.currentParent = widgetId;
    try {
      return builder();
    } finally {
      this.currentParent = this.parentStack.pop() || null;
    }
  }

  // Override widget methods to capture metadata

  vbox(builder: () => void): VBox {
    const widget = super.vbox(() => {
      this.withParent(widget.id, builder);
    });
    this.captureMetadata(widget, 'vbox', {}, {});
    return widget;
  }

  hbox(builder: () => void): HBox {
    const widget = super.hbox(() => {
      this.withParent(widget.id, builder);
    });
    this.captureMetadata(widget, 'hbox', {}, {});
    return widget;
  }

  button(text: string, onClick?: () => void, className?: string): Button {
    const widget = super.button(text, onClick, className);
    this.captureMetadata(
      widget,
      'button',
      { text, className },
      onClick ? { onClick } : {}
    );
    return widget;
  }

  label(text: string, className?: string, alignment?: 'leading' | 'trailing' | 'center', wrapping?: 'off' | 'break' | 'word', textStyle?: { bold?: boolean; italic?: boolean; monospace?: boolean }): Label {
    const widget = super.label(text, className, alignment, wrapping, textStyle);
    this.captureMetadata(
      widget,
      'label',
      { text, className, alignment, wrapping, textStyle },
      {}
    );
    return widget;
  }

  entry(placeholder?: string, onSubmit?: (text: string) => void, minWidth?: number, onDoubleClick?: () => void): Entry {
    const widget = super.entry(placeholder, onSubmit, minWidth, onDoubleClick);
    this.captureMetadata(
      widget,
      'entry',
      { placeholder, minWidth },
      onSubmit ? { onSubmit } : {}
    );
    return widget;
  }

  /**
   * Export metadata as JSON
   */
  exportMetadata(): any {
    return this.metadata.toJSON();
  }

  /**
   * Get widget tree for visualization
   */
  getWidgetTree(): WidgetMetadata[] {
    return this.metadata.getTree();
  }
}
