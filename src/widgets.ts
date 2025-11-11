import { Context } from './context';
import { applyStyleForWidget, WidgetSelector } from './styles';

/**
 * Context menu item
 */
export interface ContextMenuItem {
  label: string;
  onSelected: () => void;
  disabled?: boolean;
  checked?: boolean;
  isSeparator?: boolean;
}

/**
 * Base class for all widgets
 */
export abstract class Widget {
  protected ctx: Context;
  public id: string;

  constructor(ctx: Context, id: string) {
    this.ctx = ctx;
    this.id = id;
  }

  /**
   * Apply styles from the global stylesheet to this widget
   */
  protected async applyStyles(widgetType: WidgetSelector): Promise<void> {
    await applyStyleForWidget(this.ctx, this.id, widgetType);
  }

  /**
   * Set context menu for this widget (shown on right-click)
   */
  async setContextMenu(items: ContextMenuItem[]): Promise<void> {
    const menuItems = items.map(item => {
      if (item.isSeparator) {
        return { isSeparator: true };
      }

      const callbackId = this.ctx.generateId('callback');
      this.ctx.bridge.registerEventHandler(callbackId, () => item.onSelected());

      return {
        label: item.label,
        callbackId,
        disabled: item.disabled,
        checked: item.checked
      };
    });

    await this.ctx.bridge.send('setWidgetContextMenu', {
      widgetId: this.id,
      items: menuItems
    });
  }

  async setText(text: string): Promise<void> {
    await this.ctx.bridge.send('setText', {
      widgetId: this.id,
      text
    });
  }

  async getText(): Promise<string> {
    const result = await this.ctx.bridge.send('getText', {
      widgetId: this.id
    });
    return result.text;
  }
}

/**
 * Button widget
 */
export class Button extends Widget {
  constructor(ctx: Context, text: string, onClick?: () => void, classNames?: string) {
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

    // Check stylesheet for importance mapping (Fyne limitation workaround)
    if (classNames) {
      const classes = classNames.split(/\s+/).filter(c => c.length > 0);
      const importance = this.getImportanceFromStylesheet(classes);
      if (importance) {
        payload.importance = importance;
      }
    }

    ctx.bridge.send('createButton', payload);
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking) - try class names first, then fall back to 'button'
    if (classNames) {
      this.applyStylesFromClasses(classNames.split(/\s+/).filter(c => c.length > 0)).catch(() => {});
    } else {
      this.applyStyles('button').catch(() => {});
    }
  }

  private getImportanceFromStylesheet(classes: string[]): string | undefined {
    const stylesheet = require('./styles').getStyleSheet();
    if (!stylesheet) return undefined;

    // Check each class for importance, return first match
    for (const className of classes) {
      const style = stylesheet.getStyle(className);
      if (style?.importance) {
        return style.importance;
      }
    }
    return undefined;
  }

  private async applyStylesFromClasses(classes: string[]): Promise<void> {
    // Apply styles from all classes, then fallback to 'button'
    for (const className of classes) {
      await this.applyStyles(className as any).catch(() => {});
    }
    // Also apply generic 'button' styles
    await this.applyStyles('button').catch(() => {});
  }
}

/**
 * Label widget
 */
export class Label extends Widget {
  constructor(ctx: Context, text: string, classNames?: string) {
    const id = ctx.generateId('label');
    super(ctx, id);

    ctx.bridge.send('createLabel', { id, text });
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking) - try class names first, then fall back to 'label'
    if (classNames) {
      this.applyStylesFromClasses(classNames.split(/\s+/).filter(c => c.length > 0)).catch(() => {});
    } else {
      this.applyStyles('label').catch(() => {});
    }
  }

  private async applyStylesFromClasses(classes: string[]): Promise<void> {
    // Apply styles from all classes, then fallback to 'label'
    for (const className of classes) {
      await this.applyStyles(className as any).catch(() => {});
    }
    // Also apply generic 'label' styles
    await this.applyStyles('label').catch(() => {});
  }
}

/**
 * Entry (text input) widget
 */
export class Entry extends Widget {
  constructor(ctx: Context, placeholder?: string) {
    const id = ctx.generateId('entry');
    super(ctx, id);

    ctx.bridge.send('createEntry', { id, placeholder: placeholder || '' });
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking)
    this.applyStyles('entry').catch(() => {});
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
  constructor(ctx: Context, placeholder?: string) {
    const id = ctx.generateId('passwordentry');
    super(ctx, id);

    ctx.bridge.send('createPasswordEntry', { id, placeholder: placeholder || '' });
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking)
    this.applyStyles('passwordentry').catch(() => {});
  }
}

/**
 * Separator widget (horizontal or vertical line)
 */
export class Separator {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context) {
    this.ctx = ctx;
    this.id = ctx.generateId('separator');

    ctx.bridge.send('createSeparator', { id: this.id });
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Hyperlink widget (clickable URL)
 */
export class Hyperlink {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, text: string, url: string) {
    this.ctx = ctx;
    this.id = ctx.generateId('hyperlink');

    ctx.bridge.send('createHyperlink', { id: this.id, text, url });
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * VBox container (vertical box layout)
 */
export class VBox {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('vbox');

    // Push a new container context
    ctx.pushContainer();

    // Execute the builder function to collect children
    builder();

    // Pop the container and get the children
    const children = ctx.popContainer();

    // Create the VBox with the children
    ctx.bridge.send('createVBox', { id: this.id, children });
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * HBox container (horizontal box layout)
 */
export class HBox {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('hbox');

    // Push a new container context
    ctx.pushContainer();

    // Execute the builder function to collect children
    builder();

    // Pop the container and get the children
    const children = ctx.popContainer();

    // Create the HBox with the children
    ctx.bridge.send('createHBox', { id: this.id, children });
    ctx.addToCurrentContainer(this.id);
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
}

/**
 * Scroll container
 */
export class Scroll {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('scroll');

    // Push a new container context
    ctx.pushContainer();

    // Execute the builder function to collect content
    builder();

    // Pop the container and get the single child (content)
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('Scroll container must have exactly one child');
    }

    const contentId = children[0];

    // Create the Scroll with the content
    ctx.bridge.send('createScroll', { id: this.id, contentId });
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Grid layout container
 */
export class Grid {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, columns: number, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('grid');

    // Push a new container context
    ctx.pushContainer();

    // Execute the builder function to collect children
    builder();

    // Pop the container and get the children
    const children = ctx.popContainer();

    // Create the Grid with the children
    ctx.bridge.send('createGrid', { id: this.id, columns, children });
    ctx.addToCurrentContainer(this.id);
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
 * Split container (horizontal or vertical)
 */
export class Split {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, orientation: 'horizontal' | 'vertical', leadingBuilder: () => void, trailingBuilder: () => void, offset?: number) {
    this.ctx = ctx;
    this.id = ctx.generateId('split');

    // Build leading content
    ctx.pushContainer();
    leadingBuilder();
    const leadingChildren = ctx.popContainer();
    if (leadingChildren.length !== 1) {
      throw new Error('Split leading section must have exactly one child');
    }
    const leadingId = leadingChildren[0];

    // Build trailing content
    ctx.pushContainer();
    trailingBuilder();
    const trailingChildren = ctx.popContainer();
    if (trailingChildren.length !== 1) {
      throw new Error('Split trailing section must have exactly one child');
    }
    const trailingId = trailingChildren[0];

    // Create the split container
    const payload: any = {
      id: this.id,
      orientation,
      leadingId,
      trailingId
    };

    if (offset !== undefined) {
      payload.offset = offset;
    }

    ctx.bridge.send('createSplit', payload);
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Tabs container (AppTabs)
 */
export class Tabs {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, tabDefinitions: Array<{title: string, builder: () => void}>, location?: 'top' | 'bottom' | 'leading' | 'trailing') {
    this.ctx = ctx;
    this.id = ctx.generateId('tabs');

    // Build each tab's content
    const tabs: Array<{title: string, contentId: string}> = [];

    for (const tabDef of tabDefinitions) {
      ctx.pushContainer();
      tabDef.builder();
      const children = ctx.popContainer();

      if (children.length !== 1) {
        throw new Error(`Tab "${tabDef.title}" must have exactly one child widget`);
      }

      tabs.push({
        title: tabDef.title,
        contentId: children[0]
      });
    }

    // Create the tabs container
    const payload: any = {
      id: this.id,
      tabs
    };

    if (location) {
      payload.location = location;
    }

    ctx.bridge.send('createTabs', payload);
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Toolbar widget
 */
export class Toolbar {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, toolbarItems: Array<{
    type: 'action' | 'separator' | 'spacer';
    label?: string;
    onAction?: () => void;
  }>) {
    this.ctx = ctx;
    this.id = ctx.generateId('toolbar');

    const items = toolbarItems.map(item => {
      if (item.type === 'separator') {
        return { type: 'separator' };
      }

      if (item.type === 'spacer') {
        return { type: 'spacer' };
      }

      // Action item
      const callbackId = ctx.generateId('callback');
      if (item.onAction) {
        ctx.bridge.registerEventHandler(callbackId, (_data: any) => {
          item.onAction!();
        });
      }

      return {
        type: 'action',
        label: item.label || 'Action',
        callbackId
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
 * Center layout - centers content in the available space
 */
export class Center {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('center');

    // Build child content
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('Center must have exactly one child');
    }

    ctx.bridge.send('createCenter', {
      id: this.id,
      childId: children[0]
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Card container with title, subtitle, and content
 */
export class Card {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, title: string, subtitle: string, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('card');

    // Build card content
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('Card must have exactly one child');
    }

    ctx.bridge.send('createCard', {
      id: this.id,
      title,
      subtitle,
      contentId: children[0]
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Accordion - collapsible sections
 */
export class Accordion {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, items: Array<{title: string, builder: () => void}>) {
    this.ctx = ctx;
    this.id = ctx.generateId('accordion');

    // Build each accordion item's content
    const accordionItems: Array<{title: string, contentId: string}> = [];

    for (const item of items) {
      ctx.pushContainer();
      item.builder();
      const children = ctx.popContainer();

      if (children.length !== 1) {
        throw new Error(`Accordion item "${item.title}" must have exactly one child`);
      }

      accordionItems.push({
        title: item.title,
        contentId: children[0]
      });
    }

    ctx.bridge.send('createAccordion', {
      id: this.id,
      items: accordionItems
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Form widget with labeled fields and submit/cancel buttons
 */
export class Form {
  private ctx: Context;
  public id: string;

  constructor(
    ctx: Context,
    items: Array<{label: string, widget: any}>,
    onSubmit?: () => void,
    onCancel?: () => void
  ) {
    this.ctx = ctx;
    this.id = ctx.generateId('form');

    const formItems = items.map(item => ({
      label: item.label,
      widgetId: item.widget.id
    }));

    const payload: any = {
      id: this.id,
      items: formItems
    };

    if (onSubmit) {
      const submitCallbackId = ctx.generateId('callback');
      payload.submitCallbackId = submitCallbackId;
      ctx.bridge.registerEventHandler(submitCallbackId, (_data: any) => {
        onSubmit();
      });
    }

    if (onCancel) {
      const cancelCallbackId = ctx.generateId('callback');
      payload.cancelCallbackId = cancelCallbackId;
      ctx.bridge.registerEventHandler(cancelCallbackId, (_data: any) => {
        onCancel();
      });
    }

    ctx.bridge.send('createForm', payload);
    ctx.addToCurrentContainer(this.id);
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
 * RichText widget for formatted text
 */
export class RichText {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, segments: Array<{
    text: string;
    bold?: boolean;
    italic?: boolean;
    monospace?: boolean;
  }>) {
    this.ctx = ctx;
    this.id = ctx.generateId('richtext');

    ctx.bridge.send('createRichText', {
      id: this.id,
      segments
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Image widget for displaying images
 */
export class Image {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, path: string, fillMode?: 'contain' | 'stretch' | 'original') {
    this.ctx = ctx;
    this.id = ctx.generateId('image');

    const payload: any = {
      id: this.id,
      path
    };

    if (fillMode) {
      payload.fillMode = fillMode;
    }

    ctx.bridge.send('createImage', payload);
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Border layout - positions widgets at edges and center
 */
export class Border {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, config: {
    top?: () => void;
    bottom?: () => void;
    left?: () => void;
    right?: () => void;
    center?: () => void;
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('border');

    const payload: any = { id: this.id };

    // Build each optional section
    if (config.top) {
      ctx.pushContainer();
      config.top();
      const children = ctx.popContainer();
      if (children.length === 1) {
        payload.topId = children[0];
      }
    }

    if (config.bottom) {
      ctx.pushContainer();
      config.bottom();
      const children = ctx.popContainer();
      if (children.length === 1) {
        payload.bottomId = children[0];
      }
    }

    if (config.left) {
      ctx.pushContainer();
      config.left();
      const children = ctx.popContainer();
      if (children.length === 1) {
        payload.leftId = children[0];
      }
    }

    if (config.right) {
      ctx.pushContainer();
      config.right();
      const children = ctx.popContainer();
      if (children.length === 1) {
        payload.rightId = children[0];
      }
    }

    if (config.center) {
      ctx.pushContainer();
      config.center();
      const children = ctx.popContainer();
      if (children.length === 1) {
        payload.centerId = children[0];
      }
    }

    ctx.bridge.send('createBorder', payload);
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * GridWrap layout - wrapping grid with fixed item sizes
 */
export class GridWrap {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, itemWidth: number, itemHeight: number, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('gridwrap');

    // Build children
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    ctx.bridge.send('createGridWrap', {
      id: this.id,
      itemWidth,
      itemHeight,
      children
    });

    ctx.addToCurrentContainer(this.id);
  }
}
