import { Context } from '../context';

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

  /**
   * Select a tab by index
   * @param tabIndex Index of the tab to select (0-based)
   */
  async select(tabIndex: number): Promise<void> {
    await this.ctx.bridge.send('tabsSelect', {
      id: this.id,
      tabIndex
    });
  }
}

/**
 * DocTabs container (tabs with close buttons)
 * Suitable for document-style interfaces like text editors
 */
export class DocTabs {
  private ctx: Context;
  public id: string;
  private tabInfos: Array<{title: string, contentId: string}> = [];

  constructor(
    ctx: Context,
    tabDefinitions: Array<{title: string, builder: () => void}>,
    options?: {
      location?: 'top' | 'bottom' | 'leading' | 'trailing';
      onClosed?: (tabIndex: number, tabTitle: string) => void;
    }
  ) {
    this.ctx = ctx;
    this.id = ctx.generateId('doctabs');

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

    this.tabInfos = tabs;

    // Create the doctabs container
    const payload: any = {
      id: this.id,
      tabs
    };

    if (options?.location) {
      payload.location = options.location;
    }

    // Register close callback if provided
    if (options?.onClosed) {
      const closeCallbackId = ctx.generateId('callback');
      ctx.bridge.registerEventHandler(closeCallbackId, (data: any) => {
        options.onClosed!(data.tabIndex, data.tabTitle);
      });
      payload.closeCallbackId = closeCallbackId;
    }

    ctx.bridge.send('createDocTabs', payload);
    ctx.addToCurrentContainer(this.id);
  }

  /**
   * Append a new tab to the DocTabs
   * @param title Tab title
   * @param builder Function to build the tab content
   * @param select Whether to select the new tab after adding
   */
  async append(title: string, builder: () => void, select: boolean = true): Promise<void> {
    this.ctx.pushContainer();
    builder();
    const children = this.ctx.popContainer();

    if (children.length !== 1) {
      throw new Error(`Tab "${title}" must have exactly one child widget`);
    }

    const contentId = children[0];
    this.tabInfos.push({ title, contentId });

    await this.ctx.bridge.send('docTabsAppend', {
      id: this.id,
      title,
      contentId,
      select
    });
  }

  /**
   * Remove a tab by index
   * @param tabIndex Index of the tab to remove
   */
  async remove(tabIndex: number): Promise<void> {
    await this.ctx.bridge.send('docTabsRemove', {
      id: this.id,
      tabIndex
    });
    this.tabInfos.splice(tabIndex, 1);
  }

  /**
   * Select a tab by index
   * @param tabIndex Index of the tab to select
   */
  async select(tabIndex: number): Promise<void> {
    await this.ctx.bridge.send('docTabsSelect', {
      id: this.id,
      tabIndex
    });
  }

  /**
   * Get the number of tabs
   */
  getTabCount(): number {
    return this.tabInfos.length;
  }

  /**
   * Get tab titles
   */
  getTabTitles(): string[] {
    return this.tabInfos.map(t => t.title);
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
