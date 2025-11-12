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
class NullCheckbox extends NullWidget {}
class NullSelect extends NullWidget {}
class NullSlider extends NullWidget {}
class NullProgressBar extends NullWidget {}
class NullRadioGroup extends NullWidget {}
class NullVBox extends NullWidget {}
class NullHBox extends NullWidget {}
class NullScroll extends NullWidget {}
class NullSeparator extends NullWidget {}
class NullCard extends NullWidget {}
class NullCenter extends NullWidget {}
class NullImage extends NullWidget {}
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
    image: (path: string, mode?: 'contain' | 'stretch' | 'original') => context.image(path, mode),
    table: (headers: string[], data: string[][]) => context.table(headers, data),
    list: (items: string[], onSelected?: (index: number, item: string) => void) =>
      context.list(items, onSelected),
    vbox: (builder: () => void) => context.vbox(builder),
    hbox: (builder: () => void) => context.hbox(builder),
    scroll: (builder: () => void) => context.scroll(builder),
    center: (builder: () => void) => context.center(builder),
    card: (title: string, subtitle: string, builder: () => void) =>
      context.card(title, subtitle, builder)
  };
}
