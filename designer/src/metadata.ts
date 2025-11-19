/**
 * Metadata captured during design-time execution
 */

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
}

export interface WidgetMetadata {
  widgetId: string;
  widgetType: string;
  sourceLocation: SourceLocation;
  properties: Record<string, any>;
  eventHandlers: Record<string, string>;
  children: string[];  // Child widget IDs
  parent: string | null;  // Parent widget ID
  accessibility?: {  // Accessibility options
    label?: string;
    description?: string;
    role?: string;
    hint?: string;
  };
}

export class MetadataStore {
  private metadata: Map<string, WidgetMetadata> = new Map();

  set(widgetId: string, data: WidgetMetadata): void {
    this.metadata.set(widgetId, data);
  }

  get(widgetId: string): WidgetMetadata | undefined {
    return this.metadata.get(widgetId);
  }

  getAll(): WidgetMetadata[] {
    return Array.from(this.metadata.values());
  }

  clear(): void {
    this.metadata.clear();
  }

  /**
   * Get widget tree as a hierarchical structure
   */
  getTree(): WidgetMetadata[] {
    // Find root widgets (those without a parent)
    return this.getAll().filter(w => !w.parent);
  }

  /**
   * Get children of a widget
   */
  getChildren(widgetId: string): WidgetMetadata[] {
    return this.getAll().filter(w => w.parent === widgetId);
  }

  /**
   * Export metadata as JSON
   */
  toJSON(): any {
    return {
      widgets: Array.from(this.metadata.entries()).map(([id, data]) => ({
        id,
        ...data
      }))
    };
  }
}
