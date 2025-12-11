/**
 * Inspector - DOM-inspector style widget tree viewer
 *
 * Queries the Go/Fyne side for the widget tree on demand.
 * Does not maintain state - each call fetches fresh data.
 */

import { BridgeInterface } from './fynebridge';

/**
 * Represents a node in the widget tree
 */
export interface WidgetNode {
  /** Internal widget ID (e.g., "_vbox_abc123") */
  id: string;
  /** Custom ID if set via withId() */
  customId?: string;
  /** Fyne type name (e.g., "Container", "Label", "Image") */
  type: string;
  /** Widget type from metadata (e.g., "vbox", "label", "padded") */
  widgetType?: string;
  /** Text content if applicable */
  text?: string;
  /** X position relative to parent */
  x: number;
  /** Y position relative to parent */
  y: number;
  /** Width */
  w: number;
  /** Height */
  h: number;
  /** Minimum width */
  minW: number;
  /** Minimum height */
  minH: number;
  /** Padding if set */
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** Child widgets (for containers) */
  children?: WidgetNode[];
}

/**
 * Inspector class for exploring widget trees
 */
export class Inspector {
  private bridge: BridgeInterface;

  constructor(bridge: BridgeInterface) {
    this.bridge = bridge;
  }

  /**
   * Get the widget tree starting from a root widget ID
   * @param rootWidgetId The ID of the root widget to explore
   * @returns Promise resolving to the widget tree
   */
  async getTree(rootWidgetId: string): Promise<WidgetNode> {
    const response = await this.bridge.send('getWidgetTree', {
      widgetId: rootWidgetId
    }) as { tree: WidgetNode };

    return response.tree;
  }

  /**
   * Find a widget by its custom ID in the tree
   * @param tree The tree to search
   * @param customId The custom ID to find
   * @returns The widget node or undefined if not found
   */
  findByCustomId(tree: WidgetNode, customId: string): WidgetNode | undefined {
    if (tree.customId === customId) {
      return tree;
    }
    if (tree.children) {
      for (const child of tree.children) {
        const found = this.findByCustomId(child, customId);
        if (found) return found;
      }
    }
    return undefined;
  }

  /**
   * Find a widget by its internal ID in the tree
   * @param tree The tree to search
   * @param id The internal ID to find
   * @returns The widget node or undefined if not found
   */
  findById(tree: WidgetNode, id: string): WidgetNode | undefined {
    if (tree.id === id) {
      return tree;
    }
    if (tree.children) {
      for (const child of tree.children) {
        const found = this.findById(child, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  /**
   * Find all widgets of a given type
   * @param tree The tree to search
   * @param widgetType The widget type (e.g., "label", "button", "padded")
   * @returns Array of matching widget nodes
   */
  findByType(tree: WidgetNode, widgetType: string): WidgetNode[] {
    const results: WidgetNode[] = [];
    this.findByTypeRecursive(tree, widgetType, results);
    return results;
  }

  private findByTypeRecursive(node: WidgetNode, widgetType: string, results: WidgetNode[]): void {
    if (node.widgetType === widgetType) {
      results.push(node);
    }
    if (node.children) {
      for (const child of node.children) {
        this.findByTypeRecursive(child, widgetType, results);
      }
    }
  }

  /**
   * Find all widgets containing specific text
   * @param tree The tree to search
   * @param text The text to search for (case-insensitive partial match)
   * @returns Array of matching widget nodes
   */
  findByText(tree: WidgetNode, text: string): WidgetNode[] {
    const results: WidgetNode[] = [];
    const lowerText = text.toLowerCase();
    this.findByTextRecursive(tree, lowerText, results);
    return results;
  }

  private findByTextRecursive(node: WidgetNode, lowerText: string, results: WidgetNode[]): void {
    if (node.text && node.text.toLowerCase().includes(lowerText)) {
      results.push(node);
    }
    if (node.children) {
      for (const child of node.children) {
        this.findByTextRecursive(child, lowerText, results);
      }
    }
  }

  /**
   * Count total widgets in the tree
   * @param tree The tree to count
   * @returns Total number of widgets
   */
  count(tree: WidgetNode): number {
    let count = 1;
    if (tree.children) {
      for (const child of tree.children) {
        count += this.count(child);
      }
    }
    return count;
  }

  /**
   * Get the depth of the tree
   * @param tree The tree to measure
   * @returns Maximum depth
   */
  depth(tree: WidgetNode): number {
    if (!tree.children || tree.children.length === 0) {
      return 1;
    }
    let maxChildDepth = 0;
    for (const child of tree.children) {
      maxChildDepth = Math.max(maxChildDepth, this.depth(child));
    }
    return 1 + maxChildDepth;
  }

  /**
   * Format the tree as a string for display
   * @param tree The tree to format
   * @param indent Current indentation level
   * @returns Formatted string representation
   */
  format(tree: WidgetNode, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    const idStr = tree.customId ? tree.customId : tree.id;
    const typeStr = tree.widgetType || tree.type;
    const textStr = tree.text ? ` "${tree.text}"` : '';
    const paddingStr = tree.padding
      ? ` p=${tree.padding.top},${tree.padding.right},${tree.padding.bottom},${tree.padding.left}`
      : '';

    let result = `${spaces}${typeStr} id=${idStr}${textStr} (${tree.x},${tree.y} ${tree.w}x${tree.h})${paddingStr}\n`;

    if (tree.children) {
      for (const child of tree.children) {
        result += this.format(child, indent + 1);
      }
    }

    return result;
  }

  /**
   * Print the tree to console
   * @param tree The tree to print
   */
  print(tree: WidgetNode): void {
    console.log(this.format(tree));
  }

  /**
   * Open the visual inspector window for a specific window
   * @param windowId The ID of the window to inspect
   * @returns Promise resolving when the inspector is opened
   */
  async openVisualInspector(windowId: string): Promise<void> {
    await this.bridge.send('openInspector', { windowId });
  }

  /**
   * Get the widget tree for a window (alternative to getTree that uses window ID)
   * @param windowId The ID of the window to inspect
   * @returns Promise resolving to the widget tree
   */
  async getWindowTree(windowId: string): Promise<WidgetNode> {
    const response = await this.bridge.send('getInspectorTree', {
      windowId
    }) as { tree: WidgetNode };

    return response.tree;
  }

  /**
   * List all window IDs
   * @returns Promise resolving to array of window IDs
   */
  async listWindows(): Promise<string[]> {
    const response = await this.bridge.send('listWindows', {}) as { windows: string[] };
    return response.windows;
  }
}
