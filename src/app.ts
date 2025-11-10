import { BridgeConnection } from './bridge';
import { Context } from './context';
import { Window, WindowOptions } from './window';
import { Button, Label, Entry, MultiLineEntry, PasswordEntry, Separator, Hyperlink, VBox, HBox, Checkbox, Select, Slider, ProgressBar, Scroll, Grid, RadioGroup, Split, Tabs, Toolbar, Table, List, Center, Card, Accordion, Form, Tree, RichText, Image, Border, GridWrap } from './widgets';

export interface AppOptions {
  title?: string;
}

/**
 * App is the main application class
 */
export class App {
  private ctx: Context;
  private windows: Window[] = [];
  private bridge: BridgeConnection;

  constructor(options?: AppOptions, testMode: boolean = false) {
    this.bridge = new BridgeConnection(testMode);
    this.ctx = new Context(this.bridge);
  }

  getContext(): Context {
    return this.ctx;
  }

  getBridge(): BridgeConnection {
    return this.bridge;
  }

  window(options: WindowOptions, builder: (win: Window) => void): Window {
    const win = new Window(this.ctx, options, builder);
    this.windows.push(win);
    return win;
  }

  // Scoped declarative API methods - these use the app's context (proper IoC/DI)
  vbox(builder: () => void): VBox {
    return new VBox(this.ctx, builder);
  }

  hbox(builder: () => void): HBox {
    return new HBox(this.ctx, builder);
  }

  button(text: string, onClick?: () => void, classNames?: string): Button {
    return new Button(this.ctx, text, onClick, classNames);
  }

  label(text: string, classNames?: string): Label {
    return new Label(this.ctx, text, classNames);
  }

  entry(placeholder?: string): Entry {
    return new Entry(this.ctx, placeholder);
  }

  multilineentry(placeholder?: string, wrapping?: 'off' | 'word' | 'break'): MultiLineEntry {
    return new MultiLineEntry(this.ctx, placeholder, wrapping);
  }

  passwordentry(placeholder?: string): PasswordEntry {
    return new PasswordEntry(this.ctx, placeholder);
  }

  separator(): Separator {
    return new Separator(this.ctx);
  }

  hyperlink(text: string, url: string): Hyperlink {
    return new Hyperlink(this.ctx, text, url);
  }

  checkbox(text: string, onChanged?: (checked: boolean) => void): Checkbox {
    return new Checkbox(this.ctx, text, onChanged);
  }

  select(options: string[], onSelected?: (selected: string) => void): Select {
    return new Select(this.ctx, options, onSelected);
  }

  slider(min: number, max: number, initialValue?: number, onChanged?: (value: number) => void): Slider {
    return new Slider(this.ctx, min, max, initialValue, onChanged);
  }

  progressbar(initialValue?: number, infinite?: boolean): ProgressBar {
    return new ProgressBar(this.ctx, initialValue, infinite);
  }

  scroll(builder: () => void): Scroll {
    return new Scroll(this.ctx, builder);
  }

  grid(columns: number, builder: () => void): Grid {
    return new Grid(this.ctx, columns, builder);
  }

  radiogroup(options: string[], initialSelected?: string, onSelected?: (selected: string) => void): RadioGroup {
    return new RadioGroup(this.ctx, options, initialSelected, onSelected);
  }

  hsplit(leadingBuilder: () => void, trailingBuilder: () => void, offset?: number): Split {
    return new Split(this.ctx, 'horizontal', leadingBuilder, trailingBuilder, offset);
  }

  vsplit(leadingBuilder: () => void, trailingBuilder: () => void, offset?: number): Split {
    return new Split(this.ctx, 'vertical', leadingBuilder, trailingBuilder, offset);
  }

  tabs(tabDefinitions: Array<{title: string, builder: () => void}>, location?: 'top' | 'bottom' | 'leading' | 'trailing'): Tabs {
    return new Tabs(this.ctx, tabDefinitions, location);
  }

  toolbar(toolbarItems: Array<{ type: 'action' | 'separator' | 'spacer'; label?: string; onAction?: () => void; }>): Toolbar {
    return new Toolbar(this.ctx, toolbarItems);
  }

  table(headers: string[], data: string[][]): Table {
    return new Table(this.ctx, headers, data);
  }

  list(items: string[], onSelected?: (index: number, item: string) => void): List {
    return new List(this.ctx, items, onSelected);
  }

  center(builder: () => void): Center {
    return new Center(this.ctx, builder);
  }

  card(title: string, subtitle: string, builder: () => void): Card {
    return new Card(this.ctx, title, subtitle, builder);
  }

  accordion(items: Array<{title: string, builder: () => void}>): Accordion {
    return new Accordion(this.ctx, items);
  }

  form(items: Array<{label: string, widget: any}>, onSubmit?: () => void, onCancel?: () => void): Form {
    return new Form(this.ctx, items, onSubmit, onCancel);
  }

  tree(rootLabel: string): Tree {
    return new Tree(this.ctx, rootLabel);
  }

  richtext(segments: Array<{ text: string; bold?: boolean; italic?: boolean; monospace?: boolean; }>): RichText {
    return new RichText(this.ctx, segments);
  }

  image(path: string, fillMode?: 'contain' | 'stretch' | 'original'): Image {
    return new Image(this.ctx, path, fillMode);
  }

  border(config: { top?: () => void; bottom?: () => void; left?: () => void; right?: () => void; center?: () => void; }): Border {
    return new Border(this.ctx, config);
  }

  gridwrap(itemWidth: number, itemHeight: number, builder: () => void): GridWrap {
    return new GridWrap(this.ctx, itemWidth, itemHeight, builder);
  }

  async run(): Promise<void> {
    // Show all windows
    for (const win of this.windows) {
      await win.show();
    }
  }

  quit(): void {
    this.ctx.bridge.quit();
  }

  async setTheme(theme: 'dark' | 'light'): Promise<void> {
    await this.ctx.bridge.send('setTheme', { theme });
  }

  async getTheme(): Promise<'dark' | 'light'> {
    const result = await this.ctx.bridge.send('getTheme', {});
    return result.theme as 'dark' | 'light';
  }

  getWindows(): Window[] {
    return this.windows;
  }
}
