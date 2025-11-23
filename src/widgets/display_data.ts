import { Context } from '../context';
import { Widget } from './base';

/**
 * Represents a clickable action item in a Toolbar
 */
export class ToolbarAction {
  private _id?: string;

  constructor(public label: string, public onAction?: () => void) {}

  /**
   * Assign a unique ID to this toolbar action for testing
   * @param id Custom ID for the action
   * @returns this for method chaining
   */
  withId(id: string): this {
    this._id = id;
    return this;
  }

  get id(): string | undefined {
    return this._id;
  }
}

/**
 * Toolbar widget
 */
export class Toolbar {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, toolbarItems: Array<ToolbarAction | { type: 'separator' | 'spacer' }>) {
    this.ctx = ctx;
    this.id = ctx.generateId('toolbar');

    const items = toolbarItems.map(item => {
      if ('type' in item) { // Separator or Spacer
        return { type: item.type };
      }

      // Action item
      const action = item as ToolbarAction;
      const callbackId = ctx.generateId('callback');
      if (action.onAction) {
        ctx.bridge.registerEventHandler(callbackId, (_data: any) => {
          action.onAction!();
        });
      }

      return {
        type: 'action',
        label: action.label,
        callbackId,
        customId: action.id, // Pass custom ID to the bridge
      };
    });

    ctx.bridge.send('createToolbar', {
      id: this.id,
      items
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Table widget
 */
export class Table {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, headers: string[], data: string[][]) {
    this.ctx = ctx;
    this.id = ctx.generateId('table');

    ctx.bridge.send('createTable', {
      id: this.id,
      headers,
      data
    });

    ctx.addToCurrentContainer(this.id);
  }

  async updateData(data: string[][]): Promise<void> {
    await this.ctx.bridge.send('updateTableData', {
      id: this.id,
      data
    });
  }
}

/**
 * List widget
 */
export class List {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, items: string[], onSelected?: (index: number, item: string) => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('list');

    const payload: any = {
      id: this.id,
      items
    };

    if (onSelected) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onSelected(data.index, data.item);
      });
    }

    ctx.bridge.send('createList', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async updateItems(items: string[]): Promise<void> {
    await this.ctx.bridge.send('updateListData', {
      id: this.id,
      items
    });
  }
}

/**
 * Tree widget for hierarchical data
 */
export class Tree {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, rootLabel: string) {
    this.ctx = ctx;
    this.id = ctx.generateId('tree');

    ctx.bridge.send('createTree', {
      id: this.id,
      rootLabel
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Menu item for standalone Menu widget
 */
export interface MenuItem {
  label: string;
  onSelected: () => void;
  disabled?: boolean;
  checked?: boolean;
  isSeparator?: boolean;
}

/**
 * Menu widget - standalone menu that can be embedded in containers
 * Useful for command palettes, action menus, and in-container menus
 */
export class Menu extends Widget {
  private items: MenuItem[];

  constructor(ctx: Context, items: MenuItem[]) {
    const id = ctx.generateId('menu');
    super(ctx, id);
    this.items = items;

    const menuItems = items.map(item => {
      if (item.isSeparator) {
        return { isSeparator: true };
      }

      const callbackId = ctx.generateId('callback');
      ctx.bridge.registerEventHandler(callbackId, () => item.onSelected());

      return {
        label: item.label,
        callbackId,
        disabled: item.disabled,
        checked: item.checked
      };
    });

    ctx.bridge.send('createMenu', { id, items: menuItems });
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking)
    this.applyStyles('menu').catch(() => {});
  }

  /**
   * Get the current menu items
   */
  getItems(): MenuItem[] {
    return this.items;
  }
}
