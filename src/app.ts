import { BridgeConnection } from './fynebridge';
import { Context } from './context';
import { Window, WindowOptions } from './window';
import { Button, Label, Entry, MultiLineEntry, PasswordEntry, Separator, Hyperlink, VBox, HBox, Checkbox, Select, Slider, ProgressBar, Scroll, Grid, RadioGroup, Split, Tabs, Toolbar, ToolbarAction, Table, List, Center, Max, Card, Accordion, Form, Tree, RichText, Image, Border, GridWrap, Menu, MenuItem, CanvasLine, CanvasCircle, CanvasRectangle, CanvasText, CanvasRaster, CanvasLinearGradient, Clip, InnerWindow, AdaptiveGrid, Padded, Popup } from './widgets';
import { initializeGlobals } from './globals';
import { ResourceManager } from './resources';

export interface AppOptions {
  title?: string;
}

/**
 * Custom theme color definitions
 * All colors should be hex strings in #RRGGBB or #RRGGBBAA format
 */
export interface CustomThemeColors {
  /** Main background color */
  background?: string;
  /** Main text/foreground color */
  foreground?: string;
  /** Button background color */
  button?: string;
  /** Disabled button background color */
  disabledButton?: string;
  /** General disabled element color */
  disabled?: string;
  /** Hover state color */
  hover?: string;
  /** Focus indicator color */
  focus?: string;
  /** Placeholder text color */
  placeholder?: string;
  /** Primary/accent color */
  primary?: string;
  /** Pressed/active state color */
  pressed?: string;
  /** Scrollbar color */
  scrollBar?: string;
  /** Text selection color */
  selection?: string;
  /** Separator/divider color */
  separator?: string;
  /** Shadow color */
  shadow?: string;
  /** Input field background */
  inputBackground?: string;
  /** Input field border */
  inputBorder?: string;
  /** Menu background */
  menuBackground?: string;
  /** Overlay/modal background */
  overlayBackground?: string;
  /** Error state color */
  error?: string;
  /** Success state color */
  success?: string;
  /** Warning state color */
  warning?: string;
  /** Hyperlink color */
  hyperlink?: string;
  /** Header background color */
  headerBackground?: string;
}

/**
 * Text style variants for custom fonts
 */
export type FontTextStyle = 'regular' | 'bold' | 'italic' | 'boldItalic' | 'monospace' | 'symbol';

/**
 * Font information returned by getAvailableFonts()
 */
export interface FontInfo {
  supportedExtensions: string[];
  commonLocations: {
    linux: string[];
    darwin: string[];
    windows: string[];
  };
  styles: string[];
}

/**
 * App is the main application class
 */
export class App {
  private ctx: Context;
  private windows: Window[] = [];
  private bridge: BridgeConnection;
  public resources: ResourceManager;

  constructor(options?: AppOptions, testMode: boolean = false) {
    // Initialize browser compatibility globals
    initializeGlobals();

    this.bridge = new BridgeConnection(testMode);
    this.ctx = new Context(this.bridge);
    this.resources = new ResourceManager(this.bridge);
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

  button(text: string, onClick?: () => void, className?: string): Button {
    return new Button(this.ctx, text, onClick, className);
  }

  label(text: string, className?: string, alignment?: 'leading' | 'trailing' | 'center', wrapping?: 'off' | 'break' | 'word', textStyle?: { bold?: boolean; italic?: boolean; monospace?: boolean }): Label {
    return new Label(this.ctx, text, className, alignment, wrapping, textStyle);
  }

  entry(placeholder?: string, onSubmit?: (text: string) => void, minWidth?: number, onDoubleClick?: () => void): Entry {
    return new Entry(this.ctx, placeholder, onSubmit, minWidth, onDoubleClick);
  }

  multilineentry(placeholder?: string, wrapping?: 'off' | 'word' | 'break'): MultiLineEntry {
    return new MultiLineEntry(this.ctx, placeholder, wrapping);
  }

  passwordentry(placeholder?: string, onSubmit?: (text: string) => void): PasswordEntry {
    return new PasswordEntry(this.ctx, placeholder, onSubmit);
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

  toolbar(toolbarItems: Array<ToolbarAction | { type: 'separator' | 'spacer' }>): Toolbar {
    return new Toolbar(this.ctx, toolbarItems);
  }

  toolbarAction(label: string, onAction?: () => void): ToolbarAction {
    return new ToolbarAction(label, onAction);
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

  max(builder: () => void): Max {
    return new Max(this.ctx, builder);
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

  image(
    pathOrOptions: string | { path?: string; resource?: string; fillMode?: 'contain' | 'stretch' | 'original'; onClick?: () => void; onDrag?: (x: number, y: number) => void; onDragEnd?: (x: number, y: number) => void; },
    fillMode?: 'contain' | 'stretch' | 'original',
    onClick?: () => void,
    onDrag?: (x: number, y: number) => void,
    onDragEnd?: (x: number, y: number) => void
  ): Image {
    return new Image(this.ctx, pathOrOptions, fillMode, onClick, onDrag, onDragEnd);
  }

  border(config: { top?: () => void; bottom?: () => void; left?: () => void; right?: () => void; center?: () => void; }): Border {
    return new Border(this.ctx, config);
  }

  gridwrap(itemWidth: number, itemHeight: number, builder: () => void): GridWrap {
    return new GridWrap(this.ctx, itemWidth, itemHeight, builder);
  }

  menu(items: MenuItem[]): Menu {
    return new Menu(this.ctx, items);
  }

  // Canvas primitives
  canvasLine(x1: number, y1: number, x2: number, y2: number, options?: { strokeColor?: string; strokeWidth?: number; }): CanvasLine {
    return new CanvasLine(this.ctx, x1, y1, x2, y2, options);
  }

  canvasCircle(options?: { x?: number; y?: number; x2?: number; y2?: number; fillColor?: string; strokeColor?: string; strokeWidth?: number; }): CanvasCircle {
    return new CanvasCircle(this.ctx, options);
  }

  canvasRectangle(options?: { width?: number; height?: number; fillColor?: string; strokeColor?: string; strokeWidth?: number; cornerRadius?: number; }): CanvasRectangle {
    return new CanvasRectangle(this.ctx, options);
  }

  canvasText(text: string, options?: { color?: string; textSize?: number; bold?: boolean; italic?: boolean; monospace?: boolean; alignment?: 'leading' | 'center' | 'trailing'; }): CanvasText {
    return new CanvasText(this.ctx, text, options);
  }

  canvasRaster(width: number, height: number, pixels?: Array<[number, number, number, number]>): CanvasRaster {
    return new CanvasRaster(this.ctx, width, height, pixels);
  }

  canvasLinearGradient(options?: { startColor?: string; endColor?: string; angle?: number; width?: number; height?: number; }): CanvasLinearGradient {
    return new CanvasLinearGradient(this.ctx, options);
  }

  clip(builder: () => void): Clip {
    return new Clip(this.ctx, builder);
  }

  innerWindow(title: string, builder: () => void, onClose?: () => void): InnerWindow {
    return new InnerWindow(this.ctx, title, builder, onClose);
  }

  adaptivegrid(rowcols: number, builder: () => void): AdaptiveGrid {
    return new AdaptiveGrid(this.ctx, rowcols, builder);
  }

  padded(builder: () => void): Padded {
    return new Padded(this.ctx, builder);
  }

  /**
   * Create a popup widget (floating overlay)
   * @param windowId The window ID where the popup will be displayed
   * @param builder Function that builds the popup content (must return one widget)
   */
  popup(windowId: string, builder: () => void): Popup {
    return new Popup(this.ctx, windowId, builder);
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

  /**
   * Set a custom theme with custom colors
   * @param colors - Object with color names and hex values (#RRGGBB or #RRGGBBAA)
   */
  async setCustomTheme(colors: CustomThemeColors): Promise<void> {
    await this.ctx.bridge.send('setCustomTheme', { colors });
  }

  /**
   * Clear custom theme and revert to default
   */
  async clearCustomTheme(): Promise<void> {
    await this.ctx.bridge.send('clearCustomTheme', {});
  }

  /**
   * Set a custom font for a specific text style
   * @param path - Path to the font file (.ttf or .otf)
   * @param style - Which text style to apply the font to
   */
  async setCustomFont(path: string, style?: FontTextStyle): Promise<void> {
    await this.ctx.bridge.send('setCustomFont', { path, style: style || 'regular' });
  }

  /**
   * Clear custom font for a specific style or all styles
   * @param style - Which style to clear, or 'all' to clear all custom fonts
   */
  async clearCustomFont(style?: FontTextStyle | 'all'): Promise<void> {
    await this.ctx.bridge.send('clearCustomFont', { style: style || 'all' });
  }

  /**
   * Get information about available fonts and supported formats
   */
  async getAvailableFonts(): Promise<FontInfo> {
    const result = await this.ctx.bridge.send('getAvailableFonts', {});
    return result as FontInfo;
  }

  /**
   * Set the global font scale
   * @param scale - Font scale factor (0.75 = small, 1.0 = normal, 1.5 = large)
   */
  async setFontScale(scale: number): Promise<void> {
    await this.ctx.bridge.send('setFontScale', { scale });
  }

  getWindows(): Window[] {
    return this.windows;
  }

  /**
   * Show source code of the current application
   * Displays the source file in a dialog window
   * @param filePath - Path to the source file (use __filename or require.main?.filename)
   */
  showSource(filePath?: string): void {
    try {
      const fs = require('fs');
      const path = require('path');

      // Use provided path or try to detect the main file
      let sourceFile = filePath;
      if (!sourceFile && typeof require !== 'undefined' && require.main) {
        sourceFile = require.main.filename;
      }

      if (!sourceFile) {
        console.error('[Show Source] Could not determine source file path');
        return;
      }

      // Read the source file
      const sourceCode = fs.readFileSync(sourceFile, 'utf-8');
      const fileName = path.basename(sourceFile);

      // Create a dialog to show the source
      this.window({ title: `Source Code: ${fileName}`, width: 900, height: 700 }, (win) => {
        // Explicitly set the title to ensure it shows
        win.setTitle(`Source Code - ${fileName}`);

        win.setContent(() => {
          this.border({
            top: () => {
              this.vbox(() => {
                this.label(`File: ${sourceFile}`, undefined, 'leading', 'word', { bold: true });
                this.separator();
              });
            },
            center: () => {
              const sourceEntry = this.multilineentry('', 'off');
              sourceEntry.setText(sourceCode);
            }
          });
        });
        win.show();
      });
    } catch (error) {
      console.error('[Show Source] Error reading source file:', error);
    }
  }

  // ==================== System Tray ====================

  /**
   * System tray menu item
   */


  /**
   * Set up the system tray with an icon and menu
   * @param options System tray configuration
   * @example
   * a.setSystemTray({
   *   iconPath: './icon.png',
   *   menuItems: [
   *     { label: 'Show', onClick: () => win.show() },
   *     { label: 'Quit', onClick: () => a.quit() }
   *   ]
   * });
   */
  async setSystemTray(options: {
    iconPath?: string;
    menuItems: Array<{ label: string; onClick?: () => void; isSeparator?: boolean }>;
  }): Promise<void> {
    const menuItems = options.menuItems.map(item => {
      if (item.isSeparator) {
        return { isSeparator: true };
      }

      const callbackId = this.ctx.generateId('callback');
      if (item.onClick) {
        this.ctx.bridge.registerEventHandler(callbackId, item.onClick);
      }

      return {
        label: item.label,
        callbackId
      };
    });

    await this.ctx.bridge.send('setSystemTray', {
      iconPath: options.iconPath,
      menuItems
    });
  }

  // ==================== Notifications ====================

  /**
   * Send a desktop notification
   * @param title Notification title
   * @param content Notification body content
   * @example
   * a.sendNotification('Reminder', 'Time for your meeting!');
   */
  async sendNotification(title: string, content: string): Promise<void> {
    await this.ctx.bridge.send('sendNotification', { title, content });
  }

  // ==================== Preferences ====================

  /**
   * Get a string preference value
   * @param key Preference key
   * @param defaultValue Default value if key doesn't exist
   */
  async getPreference(key: string, defaultValue?: string): Promise<string> {
    const result = await this.ctx.bridge.send('preferencesGet', {
      key,
      type: 'string',
      default: defaultValue
    });
    return result.value as string;
  }

  /**
   * Get an integer preference value
   * @param key Preference key
   * @param defaultValue Default value if key doesn't exist
   */
  async getPreferenceInt(key: string, defaultValue?: number): Promise<number> {
    const result = await this.ctx.bridge.send('preferencesGet', {
      key,
      type: 'int',
      default: defaultValue
    });
    return result.value as number;
  }

  /**
   * Get a float preference value
   * @param key Preference key
   * @param defaultValue Default value if key doesn't exist
   */
  async getPreferenceFloat(key: string, defaultValue?: number): Promise<number> {
    const result = await this.ctx.bridge.send('preferencesGet', {
      key,
      type: 'float',
      default: defaultValue
    });
    return result.value as number;
  }

  /**
   * Get a boolean preference value
   * @param key Preference key
   * @param defaultValue Default value if key doesn't exist
   */
  async getPreferenceBool(key: string, defaultValue?: boolean): Promise<boolean> {
    const result = await this.ctx.bridge.send('preferencesGet', {
      key,
      type: 'bool',
      default: defaultValue
    });
    return result.value as boolean;
  }

  /**
   * Set a preference value (string, number, or boolean)
   * @param key Preference key
   * @param value Value to store
   * @example
   * await a.setPreference('theme', 'dark');
   * await a.setPreference('volume', 80);
   * await a.setPreference('notifications', true);
   */
  async setPreference(key: string, value: string | number | boolean): Promise<void> {
    await this.ctx.bridge.send('preferencesSet', { key, value });
  }

  /**
   * Remove a preference value
   * @param key Preference key to remove
   */
  async removePreference(key: string): Promise<void> {
    await this.ctx.bridge.send('preferencesRemove', { key });
  }
}
