import { App, AppOptions } from './app';
import { Context } from './context';
import {
  // Inputs
  Button,
  Checkbox,
  CheckGroup,
  DateEntry,
  Entry,
  MultiLineEntry,
  PasswordEntry,
  RadioGroup,
  Select,
  SelectEntry,
  Slider,
  // Display
  Activity,
  Hyperlink,
  Image,
  Label,
  ProgressBar,
  ProgressBarInfinite,
  RichText,
  Separator,
  Spacer,
  TextGrid,
  // Data
  List,
  Menu,
  MenuItem,
  Table,
  Toolbar,
  ToolbarAction,
  Tree,
  // Containers - Layout
  AdaptiveGrid,
  Border,
  Center,
  Clip,
  Grid,
  GridWrap,
  HBox,
  Padded,
  Scroll,
  Split,
  VBox,
  // Containers - Organizational
  Accordion,
  Card,
  DocTabs,
  Form,
  InnerWindow,
  MultipleWindows,
  Navigation,
  NavigationOptions,
  Popup,
  Tabs,
  ThemeOverride,
  // Canvas
  CanvasCircle,
  CanvasLine,
  CanvasLinearGradient,
  CanvasRaster,
  CanvasRectangle,
  CanvasText,
} from './widgets';
import { Window, WindowOptions, ProgressDialog } from './window';

// Global context for the declarative API
let globalApp: App | null = null;
let globalContext: Context | null = null;

/**
 * Set the global app and context (used by test framework)
 * @internal
 */
export function __setGlobalContext(app: App | null, context: Context | null): void {
  globalApp = app;
  globalContext = context;
}

/**
 * Create and run a Tsyne desktop application with declarative syntax.
 *
 * This is the main entry point for Tsyne applications. The builder function receives
 * the app instance, providing a scoped declarative API following IoC/DI principles.
 *
 * @param options - Application configuration options (title, bridge mode, etc.)
 * @param builder - Builder function that receives the app instance and constructs the UI
 * @returns The created App instance
 *
 * @example
 * ```typescript
 * import { app } from 'tsyne';
 *
 * app({ title: 'My App' }, (a) => {
 *   a.window({ title: 'Hello', width: 400, height: 300 }, (win) => {
 *     win.setContent(() => {
 *       a.vbox(() => {
 *         a.label('Hello, World!');
 *         a.button('Click Me', () => console.log('Clicked!'));
 *       });
 *     });
 *     win.show();
 *   });
 * });
 * ```
 */
export function app(options: AppOptions, builder: (app: App) => void): App {
  const appInstance = new App(options);

  // For backward compatibility, also set global context
  globalApp = appInstance;
  globalContext = (appInstance as any).ctx;

  builder(appInstance);

  appInstance.run();

  return appInstance;
}

/**
 * Create a window in the current app context.
 *
 * @param options - Window configuration (title, width, height, fixedSize, etc.)
 * @param builder - Builder function that receives the window instance
 * @returns The created Window instance
 *
 * @throws Error if called outside of an app() context
 *
 * @example
 * ```typescript
 * window({ title: 'Settings', width: 600, height: 400 }, (win) => {
 *   win.setContent(() => {
 *     vbox(() => {
 *       label('Application Settings');
 *       // ... more widgets
 *     });
 *   });
 *   win.show();
 * });
 * ```
 */
export function window(options: WindowOptions, builder: (win: Window) => void): Window {
  if (!globalApp) {
    throw new Error('window() must be called within an app() context');
  }
  return globalApp.window(options, builder);
}

/**
 * Create a vertical box container that stacks child widgets vertically.
 *
 * @param builder - Builder function that creates child widgets
 * @returns The created VBox container
 * @throws Error if called outside of an app context
 *
 * @example
 * ```typescript
 * vbox(() => {
 *   label('Item 1');
 *   label('Item 2');
 *   button('Click', () => {});
 * });
 * ```
 */
export function vbox(builder: () => void): VBox {
  if (!globalContext) {
    throw new Error('vbox() must be called within an app context');
  }
  return new VBox(globalContext, builder);
}

/**
 * Create a horizontal box container that arranges child widgets horizontally.
 *
 * @param builder - Builder function that creates child widgets
 * @returns The created HBox container
 * @throws Error if called outside of an app context
 *
 * @example
 * ```typescript
 * hbox(() => {
 *   button('OK', () => {});
 *   button('Cancel', () => {});
 * });
 * ```
 */
export function hbox(builder: () => void): HBox {
  if (!globalContext) {
    throw new Error('hbox() must be called within an app context');
  }
  return new HBox(globalContext, builder);
}

/**
 * Create a clickable button widget.
 *
 * @param text - The button label text
 * @param onClick - Optional callback function executed when button is clicked
 * @returns The created Button widget
 * @throws Error if called outside of an app context
 *
 * @example
 * ```typescript
 * button('Submit', () => {
 *   console.log('Form submitted!');
 * });
 * ```
 */
export function button(text: string): Button {
  if (!globalContext) {
    throw new Error('button() must be called within an app context');
  }
  return new Button(globalContext, text);
}

/**
 * Create a text label widget for displaying static or dynamic text.
 *
 * @param text - The text to display
 * @returns The created Label widget
 * @throws Error if called outside of an app context
 *
 * @example
 * ```typescript
 * const statusLabel = label('Ready');
 * // Later: statusLabel.setText('Processing...');
 * ```
 */
export function label(text: string): Label {
  if (!globalContext) {
    throw new Error('label() must be called within an app context');
  }
  return new Label(globalContext, text);
}

/**
 * Create an entry (text input) widget
 */
export function entry(placeholder?: string, onSubmit?: () => void): Entry {
  if (!globalContext) {
    throw new Error('entry() must be called within an app context');
  }
  return new Entry(globalContext, placeholder, onSubmit);
}

/**
 * Create a multi-line entry (text area) widget
 */
export function multilineentry(
  placeholder?: string,
  wrapping?: 'off' | 'word' | 'break'
): MultiLineEntry {
  if (!globalContext) {
    throw new Error('multilineentry() must be called within an app context');
  }
  return new MultiLineEntry(globalContext, placeholder, wrapping);
}

/**
 * Create a password entry widget (masked text input)
 */
export function passwordentry(placeholder?: string): PasswordEntry {
  if (!globalContext) {
    throw new Error('passwordentry() must be called within an app context');
  }
  return new PasswordEntry(globalContext, placeholder);
}

/**
 * Create a separator widget (horizontal line)
 */
export function separator(): Separator {
  if (!globalContext) {
    throw new Error('separator() must be called within an app context');
  }
  return new Separator(globalContext);
}

/**
 * Create a spacer widget (expanding empty space)
 * Uses Fyne's layout.NewSpacer() to create flexible spacing in layouts
 */
export function spacer(): Spacer {
  if (!globalContext) {
    throw new Error('spacer() must be called within an app context');
  }
  return new Spacer(globalContext);
}

/**
 * Create a hyperlink widget (clickable URL)
 */
export function hyperlink(text: string, url: string): Hyperlink {
  if (!globalContext) {
    throw new Error('hyperlink() must be called within an app context');
  }
  return new Hyperlink(globalContext, text, url);
}

/**
 * Create a checkbox widget
 */
export function checkbox(text: string, onChanged?: (checked: boolean) => void): Checkbox {
  if (!globalContext) {
    throw new Error('checkbox() must be called within an app context');
  }
  return new Checkbox(globalContext, text, onChanged);
}

/**
 * Create a select (dropdown) widget
 */
export function select(options: string[], onSelected?: (selected: string) => void): Select {
  if (!globalContext) {
    throw new Error('select() must be called within an app context');
  }
  return new Select(globalContext, options, onSelected);
}

/**
 * Create a searchable dropdown (SelectEntry) widget
 */
export function selectentry(
  options: string[],
  placeholder?: string,
  onChanged?: (text: string) => void,
  onSubmitted?: (text: string) => void,
  onSelected?: (selected: string) => void
): SelectEntry {
  if (!globalContext) {
    throw new Error('selectentry() must be called within an app context');
  }
  return new SelectEntry(globalContext, options, placeholder, onChanged, onSubmitted, onSelected);
}

/**
 * Create a slider widget
 */
export function slider(
  min: number,
  max: number,
  initialValue?: number,
  onChanged?: (value: number) => void
): Slider {
  if (!globalContext) {
    throw new Error('slider() must be called within an app context');
  }
  return new Slider(globalContext, min, max, initialValue, onChanged);
}

/**
 * Create a progress bar widget
 */
export function progressbar(initialValue?: number, infinite?: boolean): ProgressBar {
  if (!globalContext) {
    throw new Error('progressbar() must be called within an app context');
  }
  return new ProgressBar(globalContext, initialValue, infinite);
}

/**
 * Create an activity (loading spinner) widget
 */
export function activity(): Activity {
  if (!globalContext) {
    throw new Error('activity() must be called within an app context');
  }
  return new Activity(globalContext);
}

/**
 * Create a scroll container
 */
export function scroll(builder: () => void): Scroll {
  if (!globalContext) {
    throw new Error('scroll() must be called within an app context');
  }
  return new Scroll(globalContext, builder);
}

/**
 * Create a grid layout container
 */
export function grid(columns: number, builder: () => void): Grid {
  if (!globalContext) {
    throw new Error('grid() must be called within an app context');
  }
  return new Grid(globalContext, columns, builder);
}

/**
 * Create a radio group widget
 */
export function radiogroup(
  options: string[],
  initialSelected?: string,
  onSelected?: (selected: string) => void
): RadioGroup {
  if (!globalContext) {
    throw new Error('radiogroup() must be called within an app context');
  }
  return new RadioGroup(globalContext, options, initialSelected, onSelected);
}

/**
 * Create a horizontal split container
 */
export function hsplit(
  leadingBuilder: () => void,
  trailingBuilder: () => void,
  offset?: number
): Split {
  if (!globalContext) {
    throw new Error('hsplit() must be called within an app context');
  }
  return new Split(globalContext, 'horizontal', leadingBuilder, trailingBuilder, offset);
}

/**
 * Create a vertical split container
 */
export function vsplit(
  leadingBuilder: () => void,
  trailingBuilder: () => void,
  offset?: number
): Split {
  if (!globalContext) {
    throw new Error('vsplit() must be called within an app context');
  }
  return new Split(globalContext, 'vertical', leadingBuilder, trailingBuilder, offset);
}

/**
 * Create a tabs container
 */
export function tabs(
  tabDefinitions: Array<{ title: string; builder: () => void }>,
  location?: 'top' | 'bottom' | 'leading' | 'trailing'
): Tabs {
  if (!globalContext) {
    throw new Error('tabs() must be called within an app context');
  }
  return new Tabs(globalContext, tabDefinitions, location);
}

/**
 * Create a toolbar
 */
export function toolbar(
  toolbarItems: Array<{
    type: 'action' | 'separator' | 'spacer';
    label?: string;
    onAction?: () => void;
  }>
): Toolbar {
  if (!globalContext) {
    throw new Error('toolbar() must be called within an app context');
  }

  // Convert plain action objects to ToolbarAction instances
  const processedItems = toolbarItems.map((item) => {
    if (item.type === 'action') {
      return new ToolbarAction(item.label || '', item.onAction);
    }
    return item;
  });

  return new Toolbar(
    globalContext,
    processedItems as (ToolbarAction | { type: 'separator' | 'spacer' })[]
  );
}

/**
 * Create a table
 */
export function table(headers: string[], data: string[][]): Table {
  if (!globalContext) {
    throw new Error('table() must be called within an app context');
  }
  return new Table(globalContext, headers, data);
}

/**
 * Create a list
 */
export function list(items: string[], onSelected?: (index: number, item: string) => void): List {
  if (!globalContext) {
    throw new Error('list() must be called within an app context');
  }
  return new List(globalContext, items, onSelected);
}

/**
 * Create a center layout (centers content)
 */
export function center(builder: () => void): Center {
  if (!globalContext) {
    throw new Error('center() must be called within an app context');
  }
  return new Center(globalContext, builder);
}

/**
 * Create a card container with title, subtitle, and content
 */
export function card(title: string, subtitle: string, builder: () => void): Card {
  if (!globalContext) {
    throw new Error('card() must be called within an app context');
  }
  return new Card(globalContext, title, subtitle, builder);
}

/**
 * Create an accordion (collapsible sections)
 */
export function accordion(items: Array<{ title: string; builder: () => void }>): Accordion {
  if (!globalContext) {
    throw new Error('accordion() must be called within an app context');
  }
  return new Accordion(globalContext, items);
}

/**
 * Create a form with labeled fields and submit/cancel buttons
 */
export function form(
  items: Array<{ label: string; widget: any }>,
  onSubmit?: () => void,
  onCancel?: () => void
): Form {
  if (!globalContext) {
    throw new Error('form() must be called within an app context');
  }
  return new Form(globalContext, items, onSubmit, onCancel);
}

/**
 * Create a tree widget for hierarchical data
 */
export function tree(rootLabel: string): Tree {
  if (!globalContext) {
    throw new Error('tree() must be called within an app context');
  }
  return new Tree(globalContext, rootLabel);
}

/**
 * Create a rich text widget with formatted text segments
 */
export function richtext(
  segments: Array<{
    text: string;
    bold?: boolean;
    italic?: boolean;
    monospace?: boolean;
  }>
): RichText {
  if (!globalContext) {
    throw new Error('richtext() must be called within an app context');
  }
  return new RichText(globalContext, segments);
}

/**
 * Create an image widget
 */
export function image(path: string, fillMode?: 'contain' | 'stretch' | 'original'): Image {
  if (!globalContext) {
    throw new Error('image() must be called within an app context');
  }
  return new Image(globalContext, path, fillMode);
}

/**
 * Create a border layout
 */
export function border(config: {
  top?: () => void;
  bottom?: () => void;
  left?: () => void;
  right?: () => void;
  center?: () => void;
}): Border {
  if (!globalContext) {
    throw new Error('border() must be called within an app context');
  }
  return new Border(globalContext, config);
}

/**
 * Create a grid wrap layout
 */
export function gridwrap(itemWidth: number, itemHeight: number, builder: () => void): GridWrap {
  if (!globalContext) {
    throw new Error('gridwrap() must be called within an app context');
  }
  return new GridWrap(globalContext, itemWidth, itemHeight, builder);
}

/**
 * Create a standalone menu widget
 * Useful for command palettes, action menus, and embedded menus
 */
export function menu(items: MenuItem[]): Menu {
  if (!globalContext) {
    throw new Error('menu() must be called within an app context');
  }
  return new Menu(globalContext, items);
}

/**
 * Create a clip container that clips any content extending beyond its bounds
 */
export function clip(builder: () => void): Clip {
  if (!globalContext) {
    throw new Error('clip() must be called within an app context');
  }
  return new Clip(globalContext, builder);
}

/**
 * Create an inner window (window within canvas for MDI applications)
 */
export function innerWindow(title: string, builder: () => void, onClose?: () => void): InnerWindow {
  if (!globalContext) {
    throw new Error('innerWindow() must be called within an app context');
  }
  return new InnerWindow(globalContext, title, builder, onClose);
}

/**
 * Create an adaptive grid layout (responsive columns)
 */
export function adaptivegrid(rowcols: number, builder: () => void): AdaptiveGrid {
  if (!globalContext) {
    throw new Error('adaptivegrid() must be called within an app context');
  }
  return new AdaptiveGrid(globalContext, rowcols, builder);
}

/**
 * Create a padded container (adds theme-aware padding)
 */
export function padded(builder: () => void): Padded {
  if (!globalContext) {
    throw new Error('padded() must be called within an app context');
  }
  return new Padded(globalContext, builder);
}

/**
 * Create a popup (floating overlay)
 * @param windowId The window ID where the popup will be displayed
 * @param builder Function that builds the popup content (must return one widget)
 */
export function popup(windowId: string, builder: () => void): Popup {
  if (!globalContext) {
    throw new Error('popup() must be called within an app context');
  }
  return new Popup(globalContext, windowId, builder);
}

/**
 * Set the application theme
 */
export async function setTheme(theme: 'dark' | 'light'): Promise<void> {
  if (!globalApp) {
    throw new Error('setTheme() must be called within an app context');
  }
  await globalApp.setTheme(theme);
}

/**
 * Get the current application theme
 */
export async function getTheme(): Promise<'dark' | 'light'> {
  if (!globalApp) {
    throw new Error('getTheme() must be called within an app context');
  }
  return await globalApp.getTheme();
}

import type { CustomThemeColors, FontTextStyle, FontInfo } from './app';

/**
 * Set a custom theme with custom colors
 * @param colors - Object with color names and hex values (#RRGGBB or #RRGGBBAA)
 */
export async function setCustomTheme(colors: CustomThemeColors): Promise<void> {
  if (!globalApp) {
    throw new Error('setCustomTheme() must be called within an app context');
  }
  await globalApp.setCustomTheme(colors);
}

/**
 * Clear custom theme and revert to default
 */
export async function clearCustomTheme(): Promise<void> {
  if (!globalApp) {
    throw new Error('clearCustomTheme() must be called within an app context');
  }
  await globalApp.clearCustomTheme();
}

/**
 * Set a custom font for a specific text style
 * @param path - Path to the font file (.ttf or .otf)
 * @param style - Which text style to apply the font to
 */
export async function setCustomFont(path: string, style?: FontTextStyle): Promise<void> {
  if (!globalApp) {
    throw new Error('setCustomFont() must be called within an app context');
  }
  await globalApp.setCustomFont(path, style);
}

/**
 * Clear custom font for a specific style or all styles
 * @param style - Which style to clear, or 'all' to clear all custom fonts
 */
export async function clearCustomFont(style?: FontTextStyle | 'all'): Promise<void> {
  if (!globalApp) {
    throw new Error('clearCustomFont() must be called within an app context');
  }
  await globalApp.clearCustomFont(style);
}

/**
 * Get information about available fonts and supported formats
 */
export async function getAvailableFonts(): Promise<FontInfo> {
  if (!globalApp) {
    throw new Error('getAvailableFonts() must be called within an app context');
  }
  return await globalApp.getAvailableFonts();
}

/**
 * Set the global font scale
 * @param scale - Font scale factor (0.75 = small, 1.0 = normal, 1.5 = large)
 */
export async function setFontScale(scale: number): Promise<void> {
  if (!globalApp) {
    throw new Error('setFontScale() must be called within an app context');
  }
  await globalApp.setFontScale(scale);
}

// Export classes for advanced usage
export {
  App,
  Window,
  ProgressDialog,
  Button,
  Label,
  Entry,
  MultiLineEntry,
  PasswordEntry,
  Separator,
  Hyperlink,
  VBox,
  HBox,
  Checkbox,
  Select,
  SelectEntry,
  Slider,
  ProgressBar,
  ProgressBarInfinite,
  Activity,
  Scroll,
  Grid,
  RadioGroup,
  CheckGroup,
  Split,
  Tabs,
  DocTabs,
  Toolbar,
  Table,
  List,
  Center,
  Card,
  Accordion,
  Form,
  Tree,
  RichText,
  Image,
  Border,
  GridWrap,
  Menu,
  CanvasLine,
  CanvasCircle,
  CanvasRectangle,
  CanvasText,
  CanvasRaster,
  CanvasLinearGradient,
  Clip,
  InnerWindow,
  MultipleWindows,
  AdaptiveGrid,
  Padded,
  Popup,
  ThemeOverride,
  DateEntry,
  TextGrid,
  Navigation,
};
export type { AppOptions, WindowOptions, MenuItem, NavigationOptions };

// Export theming types
export type { CustomThemeColors, FontTextStyle, FontInfo } from './app';

// Export state management utilities
export {
  ObservableState,
  ComputedState,
  StateStore,
  TwoWayBinding,
  DialogResult,
  ViewModel,
  Model,
} from './state';
export type { BindingOptions } from './state';

// Export styling system
export { styles, clearStyles, getStyleSheet, StyleSheet, FontFamily, FontStyle } from './styles';
export type { WidgetStyle, WidgetSelector } from './styles';

// Export context menu
export type { ContextMenuItem } from './widgets';

// Export data binding
export {
  StringBinding,
  BoolBinding,
  NumberBinding,
  IntBinding,
  FloatBinding,
  ComputedBinding,
  ListBinding,
  StringListBinding,
  createFormBindings,
  bindEntryToString,
  syncToBinding,
} from './binding';
export type { Binding, BindingListener } from './binding';

// Export validation
export { validators, ValidatedField, FormValidator, createFormValidator } from './validation';
export type { ValidationResult, Validator, ValidatorFn } from './validation';

// Export accessibility
export {
  getAccessibilityManager,
  enableAccessibility,
  disableAccessibility,
  toggleAccessibility,
  AccessibilityManager,
} from './accessibility';
export type { AccessibilityOptions } from './widgets';

// Export browser system
export { Browser, createBrowser } from './browser';
export type { BrowserContext, PageMenuItem } from './browser';

// Export browser testing
export {
  TsyneBrowserTest,
  browserTest,
  describeBrowser,
  runBrowserTests,
} from './tsyne-browser-test';
export type { BrowserTestOptions, TestPage } from './tsyne-browser-test';

// Export browser compatibility globals
export {
  initializeGlobals,
  setBrowserGlobals,
  registerDialogHandlers,
  TsyneStorage,
} from './globals';
export type { TsyneLocation, TsyneHistory, TsyneNavigator } from './globals';

// Export screenshot helper (useful for demos and testing)
export { screenshotIfRequested } from './screenshot-helper';

// Export desktop metadata utilities (for building desktop environments)
export {
  parseAppMetadata,
  scanForApps,
  loadAppBuilder,
  loadContentBuilder,
} from './desktop-metadata';
export type { AppMetadata } from './desktop-metadata';

// Export TsyneWindow abstraction (for apps that work in both standalone and desktop modes)
export {
  createTsyneWindow,
  enableDesktopMode,
  disableDesktopMode,
  isDesktopMode,
  getDesktopContext,
  InnerWindowAdapter,
} from './tsyne-window';
export type { ITsyneWindow, DesktopContext } from './tsyne-window';
