/**
 * Resource Discovery Context
 *
 * A null implementation of the Tsyne API that records resource references
 * without actually rendering anything. Used in the first pass of dual-execution
 * to discover what resources (images, etc.) need to be fetched from the server.
 */

/**
 * Discovered resources from a page execution
 */
export interface DiscoveredResources {
  images: string[];
  // Future: stylesheets, fonts, scripts, etc.
}

/**
 * Null widget classes - returned by discovery context but do nothing
 */
class NullWidget {
  id = 'null';
}

class NullLabel extends NullWidget {}
class NullButton extends NullWidget {}
class NullEntry extends NullWidget {}
class NullMultiLineEntry extends NullWidget {}
class NullPasswordEntry extends NullWidget {}
class NullCheckbox extends NullWidget {}
class NullSelect extends NullWidget {}
class NullSlider extends NullWidget {}
class NullProgressBar extends NullWidget {}
class NullRadioGroup extends NullWidget {}
class NullVBox extends NullWidget {}
class NullHBox extends NullWidget {}
class NullScroll extends NullWidget {}
class NullGrid extends NullWidget {}
class NullSeparator extends NullWidget {}
class NullSpacer extends NullWidget {}
class NullHyperlink extends NullWidget {}
class NullSplit extends NullWidget {}
class NullTabs extends NullWidget {}
class NullToolbar extends NullWidget {}
class NullCard extends NullWidget {}
class NullAccordion extends NullWidget {}
class NullForm extends NullWidget {}
class NullTree extends NullWidget {}
class NullRichText extends NullWidget {}
class NullCenter extends NullWidget {}
class NullImage extends NullWidget {}
class NullBorder extends NullWidget {}
class NullGridWrap extends NullWidget {}
class NullTable extends NullWidget {}
class NullList extends NullWidget {}

/**
 * Resource Discovery Context
 * Implements the full Tsyne API but tracks resource references instead of rendering
 */
export class ResourceDiscoveryContext {
  private discoveredImages: Set<string> = new Set();

  // Track current container stack (but don't actually use it)
  private containerStack: NullWidget[] = [];

  /**
   * Get all discovered resources
   */
  getDiscoveredResources(): DiscoveredResources {
    return {
      images: Array.from(this.discoveredImages)
    };
  }

  /**
   * Clear discovered resources
   */
  reset(): void {
    this.discoveredImages.clear();
    this.containerStack = [];
  }

  // ===== Widget Creation Methods =====
  // All return null widgets but track resources where applicable

  label(text: string): NullLabel {
    return new NullLabel();
  }

  button(text: string, onClick?: () => void): NullButton {
    return new NullButton();
  }

  entry(text?: string, placeholder?: string, onChange?: (text: string) => void): NullEntry {
    return new NullEntry();
  }

  multilineentry(placeholder?: string, wrapping?: 'off' | 'word' | 'break'): NullEntry {
    return new NullEntry();
  }

  passwordentry(placeholder?: string, onChange?: (text: string) => void): NullEntry {
    return new NullEntry();
  }

  checkbox(label: string, checked?: boolean, onChange?: (checked: boolean) => void): NullCheckbox {
    return new NullCheckbox();
  }

  select(options: string[], selected?: number, onChange?: (index: number) => void): NullSelect {
    return new NullSelect();
  }

  slider(min: number, max: number, value?: number, onChange?: (value: number) => void): NullSlider {
    return new NullSlider();
  }

  progressbar(value?: number): NullProgressBar {
    return new NullProgressBar();
  }

  radiogroup(options: string[], selected?: string, onChange?: (selected: string) => void): NullRadioGroup {
    return new NullRadioGroup();
  }

  separator(): NullSeparator {
    return new NullSeparator();
  }

  spacer(): NullSpacer {
    return new NullSpacer();
  }

  hyperlink(text: string, url: string): NullHyperlink {
    return new NullHyperlink();
  }

  /**
   * Image widget - RECORDS the image path for fetching
   */
  image(path: string, mode?: 'contain' | 'stretch' | 'original'): NullImage {
    // This is the key method - record that this image is needed
    this.discoveredImages.add(path);
    return new NullImage();
  }

  table(headers: string[], data: string[][]): NullTable {
    return new NullTable();
  }

  list(items: string[], onSelected?: (index: number, item: string) => void): NullList {
    return new NullList();
  }

  /**
   * Container widgets - execute the builder but don't actually create containers
   */
  vbox(builder: () => void): NullVBox {
    const container = new NullVBox();
    this.containerStack.push(container);
    builder();  // Execute the builder to discover resources within
    this.containerStack.pop();
    return container;
  }

  hbox(builder: () => void): NullHBox {
    const container = new NullHBox();
    this.containerStack.push(container);
    builder();
    this.containerStack.pop();
    return container;
  }

  scroll(builder: () => void): NullScroll {
    const container = new NullScroll();
    this.containerStack.push(container);
    builder();
    this.containerStack.pop();
    return container;
  }

  center(builder: () => void): NullCenter {
    const container = new NullCenter();
    this.containerStack.push(container);
    builder();
    this.containerStack.pop();
    return container;
  }

  card(title: string, subtitle: string, builder: () => void): NullCard {
    const container = new NullCard();
    this.containerStack.push(container);
    builder();
    this.containerStack.pop();
    return container;
  }

  accordion(items: Array<{title: string, builder: () => void}>): NullAccordion {
    const container = new NullAccordion();
    // Execute each item's builder to discover resources
    for (const item of items) {
      this.containerStack.push(container);
      item.builder();
      this.containerStack.pop();
    }
    return container;
  }

  richtext(segments: Array<{text: string; bold?: boolean; italic?: boolean; monospace?: boolean}>): NullRichText {
    return new NullRichText();
  }

  tabs(tabDefinitions: Array<{title: string, builder: () => void}>, location?: 'top' | 'bottom' | 'leading' | 'trailing'): NullTabs {
    const container = new NullTabs();
    // Execute each tab's builder to discover resources
    for (const tabDef of tabDefinitions) {
      this.containerStack.push(container);
      tabDef.builder();
      this.containerStack.pop();
    }
    return container;
  }

  toolbar(toolbarItems: Array<{type: 'action' | 'separator' | 'spacer'; label?: string; onAction?: () => void}>): NullToolbar {
    return new NullToolbar();
  }

  grid(columns: number, builder: () => void): NullGrid {
    const container = new NullGrid();
    this.containerStack.push(container);
    builder();
    this.containerStack.pop();
    return container;
  }

  hsplit(leadingBuilder: () => void, trailingBuilder: () => void, offset?: number): NullSplit {
    const container = new NullSplit();
    this.containerStack.push(container);
    leadingBuilder();
    this.containerStack.pop();
    this.containerStack.push(container);
    trailingBuilder();
    this.containerStack.pop();
    return container;
  }

  vsplit(leadingBuilder: () => void, trailingBuilder: () => void, offset?: number): NullSplit {
    const container = new NullSplit();
    this.containerStack.push(container);
    leadingBuilder();
    this.containerStack.pop();
    this.containerStack.push(container);
    trailingBuilder();
    this.containerStack.pop();
    return container;
  }

  form(items: Array<{label: string, widget: any}>, onSubmit?: () => void, onCancel?: () => void): NullForm {
    return new NullForm();
  }

  tree(rootLabel: string): NullTree {
    return new NullTree();
  }

  border(config: {top?: () => void; bottom?: () => void; left?: () => void; right?: () => void; center?: () => void}): NullBorder {
    const container = new NullBorder();
    // Execute each section's builder to discover resources
    if (config.top) {
      this.containerStack.push(container);
      config.top();
      this.containerStack.pop();
    }
    if (config.bottom) {
      this.containerStack.push(container);
      config.bottom();
      this.containerStack.pop();
    }
    if (config.left) {
      this.containerStack.push(container);
      config.left();
      this.containerStack.pop();
    }
    if (config.right) {
      this.containerStack.push(container);
      config.right();
      this.containerStack.pop();
    }
    if (config.center) {
      this.containerStack.push(container);
      config.center();
      this.containerStack.pop();
    }
    return container;
  }

  gridwrap(itemWidth: number, itemHeight: number, builder: () => void): NullGridWrap {
    const container = new NullGridWrap();
    this.containerStack.push(container);
    builder();
    this.containerStack.pop();
    return container;
  }
}

/**
 * Create a discovery context that can be used as a drop-in replacement
 * for the tsyne API during the discovery pass
 */
export function createDiscoveryAPI(context: ResourceDiscoveryContext) {
  return {
    label: (text: string) => context.label(text),
    button: (text: string, onClick?: () => void) => context.button(text, onClick),
    entry: (text?: string, placeholder?: string, onChange?: (text: string) => void) =>
      context.entry(text, placeholder, onChange),
    multilineentry: (placeholder?: string, wrapping?: 'off' | 'word' | 'break') =>
      context.multilineentry(placeholder, wrapping),
    passwordentry: (placeholder?: string, onChange?: (text: string) => void) =>
      context.passwordentry(placeholder, onChange),
    checkbox: (label: string, checked?: boolean, onChange?: (checked: boolean) => void) =>
      context.checkbox(label, checked, onChange),
    select: (options: string[], selected?: number, onChange?: (index: number) => void) =>
      context.select(options, selected, onChange),
    slider: (min: number, max: number, value?: number, onChange?: (value: number) => void) =>
      context.slider(min, max, value, onChange),
    progressbar: (value?: number) => context.progressbar(value),
    radiogroup: (options: string[], selected?: string, onChange?: (selected: string) => void) =>
      context.radiogroup(options, selected, onChange),
    separator: () => context.separator(),
    spacer: () => context.spacer(),
    hyperlink: (text: string, url: string) => context.hyperlink(text, url),
    image: (path: string, mode?: 'contain' | 'stretch' | 'original') => context.image(path, mode),
    table: (headers: string[], data: string[][]) => context.table(headers, data),
    list: (items: string[], onSelected?: (index: number, item: string) => void) =>
      context.list(items, onSelected),
    vbox: (builder: () => void) => context.vbox(builder),
    hbox: (builder: () => void) => context.hbox(builder),
    scroll: (builder: () => void) => context.scroll(builder),
    center: (builder: () => void) => context.center(builder),
    card: (title: string, subtitle: string, builder: () => void) =>
      context.card(title, subtitle, builder),
    accordion: (items: Array<{title: string, builder: () => void}>) =>
      context.accordion(items),
    richtext: (segments: Array<{text: string; bold?: boolean; italic?: boolean; monospace?: boolean}>) =>
      context.richtext(segments),
    tabs: (tabDefinitions: Array<{title: string, builder: () => void}>, location?: 'top' | 'bottom' | 'leading' | 'trailing') =>
      context.tabs(tabDefinitions, location),
    toolbar: (toolbarItems: Array<{type: 'action' | 'separator' | 'spacer'; label?: string; onAction?: () => void}>) =>
      context.toolbar(toolbarItems),
    grid: (columns: number, builder: () => void) => context.grid(columns, builder),
    hsplit: (leadingBuilder: () => void, trailingBuilder: () => void, offset?: number) =>
      context.hsplit(leadingBuilder, trailingBuilder, offset),
    vsplit: (leadingBuilder: () => void, trailingBuilder: () => void, offset?: number) =>
      context.vsplit(leadingBuilder, trailingBuilder, offset),
    form: (items: Array<{label: string, widget: any}>, onSubmit?: () => void, onCancel?: () => void) =>
      context.form(items, onSubmit, onCancel),
    tree: (rootLabel: string) => context.tree(rootLabel),
    border: (config: {top?: () => void; bottom?: () => void; left?: () => void; right?: () => void; center?: () => void}) =>
      context.border(config),
    gridwrap: (itemWidth: number, itemHeight: number, builder: () => void) =>
      context.gridwrap(itemWidth, itemHeight, builder)
  };
}
