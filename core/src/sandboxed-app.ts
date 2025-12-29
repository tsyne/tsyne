/**
 * Sandboxed App Interface and Implementation
 *
 * Provides app isolation for desktop environment:
 * - Apps receive IApp interface, not the real App class
 * - Widget IDs are scoped to prevent cross-app access
 * - Preferences are scoped per app
 * - Dangerous methods (getContext, getBridge) are not exposed
 *
 * This is "good citizenship" sandboxing - apps in the same Node.js process
 * are trusted, but the API boundary prevents accidental cross-app interference.
 */

import { Context } from './context';
import { Window, WindowOptions } from './window';
import { ITsyneWindow, createTsyneWindow, isDesktopMode } from './tsyne-window';
import {
  Button, Checkbox, CheckGroup, DateEntry, Entry, MultiLineEntry,
  PasswordEntry, RadioGroup, Select, SelectEntry, Slider,
  Activity, Calendar, FileIcon, Hyperlink, Icon, Image, Label,
  ProgressBar, ProgressBarInfinite, RichText, Separator, Spacer, TextGrid,
  List, Menu, MenuItem, Table, Toolbar, ToolbarAction, Tree,
  AdaptiveGrid, Border, Center, Clip, Grid, GridWrap, WithoutLayout,
  HBox, Max, Padded, PaddedOptions, Scroll, Split, Stack, VBox, CanvasStack,
  Accordion, Card, DocTabs, Form, InnerWindow, MultipleWindows,
  Navigation, Popup, Tabs, ThemeOverride,
  CanvasArc, CanvasCircle, CanvasLine, CanvasLinearGradient,
  CanvasPolygon, CanvasRadialGradient, CanvasRaster, CanvasRectangle, CanvasText,
  TappableCanvasRaster, TappableCanvasRasterOptions,
  DesktopCanvas, DesktopMDI,
  ThemeIconName, TextGridOptions, NavigationOptions,
  DesktopCanvasOptions, DesktopMDIOptions,
} from './widgets';
import { App, CustomThemeColors, CustomThemeOptions, FontTextStyle, FontInfo } from './app';
import { IResourceManager } from './resources';

/**
 * Interface for app-facing API
 * This is what sandboxed apps receive - a subset of App functionality
 * that prevents cross-app interference
 */
export interface IApp {
  // Window creation
  window(options: WindowOptions, builder: (win: Window) => void): Window;
  window(options: WindowOptions, builder: (win: ITsyneWindow) => void): ITsyneWindow;

  // Containers
  vbox(builder: () => void): VBox;
  hbox(builder: () => void): HBox;
  stack(builder: () => void): Stack;
  canvasStack(builder: () => void): CanvasStack;
  scroll(builder: () => void): Scroll;
  grid(columns: number, builder: () => void): Grid;
  center(builder: () => void): Center;
  max(builder: () => void): Max;
  border(config: { top?: () => void; bottom?: () => void; left?: () => void; right?: () => void; center?: () => void }): Border;
  gridwrap(itemWidth: number, itemHeight: number, builder: () => void): GridWrap;
  withoutLayout(builder: () => void): WithoutLayout;
  hsplit(leadingBuilder: () => void, trailingBuilder: () => void, offset?: number): Split;
  vsplit(leadingBuilder: () => void, trailingBuilder: () => void, offset?: number): Split;
  padded(builder: () => void, options?: PaddedOptions): Padded;
  clip(builder: () => void): Clip;
  adaptivegrid(rowcols: number, builder: () => void): AdaptiveGrid;

  // Widgets - Inputs
  button(text: string, className?: string): Button;
  entry(placeholder?: string, onSubmit?: (text: string) => void, minWidth?: number, onDoubleClick?: () => void, onChange?: (text: string) => void, onCursorChanged?: () => void): Entry;
  multilineentry(placeholder?: string, wrapping?: 'off' | 'word' | 'break'): MultiLineEntry;
  passwordentry(placeholder?: string, onSubmit?: (text: string) => void): PasswordEntry;
  checkbox(text: string, onChanged?: (checked: boolean) => void, onFocus?: () => void, onBlur?: () => void): Checkbox;
  select(options: string[], onSelected?: (selected: string) => void, onFocus?: () => void, onBlur?: () => void): Select;
  selectentry(options: string[], placeholder?: string, onChanged?: (text: string) => void, onSubmitted?: (text: string) => void, onSelected?: (selected: string) => void): SelectEntry;
  slider(min: number, max: number, initialValue?: number, onChanged?: (value: number) => void, onFocus?: () => void, onBlur?: () => void): Slider;
  radiogroup(options: string[], initialSelected?: string, onSelected?: (selected: string) => void, horizontal?: boolean): RadioGroup;
  checkgroup(options: string[], initialSelected?: string[], onChanged?: (selected: string[]) => void): CheckGroup;
  dateentry(initialDate?: string, onChanged?: (date: string) => void): DateEntry;

  // Widgets - Display
  label(text: string, className?: string, alignment?: 'leading' | 'trailing' | 'center', wrapping?: 'off' | 'break' | 'word', textStyle?: { bold?: boolean; italic?: boolean; monospace?: boolean }): Label;
  separator(): Separator;
  spacer(): Spacer;
  hyperlink(text: string, url: string): Hyperlink;
  progressbar(initialValue?: number, infinite?: boolean): ProgressBar;
  progressbarInfinite(): ProgressBarInfinite;
  activity(): Activity;
  calendar(initialDate?: string, onSelected?: (date: string) => void): Calendar;
  icon(iconName: ThemeIconName): Icon;
  fileicon(path: string): FileIcon;
  image(pathOrOptions: string | { path?: string; resource?: string; fillMode?: 'contain' | 'stretch' | 'original'; onClick?: () => void; onDrag?: (x: number, y: number) => void; onDragEnd?: (x: number, y: number) => void }, fillMode?: 'contain' | 'stretch' | 'original', onClick?: () => void, onDrag?: (x: number, y: number) => void, onDragEnd?: (x: number, y: number) => void): Image;
  richtext(segments: Array<{ text: string; bold?: boolean; italic?: boolean; monospace?: boolean }>): RichText;
  textgrid(options?: TextGridOptions | string): TextGrid;

  // Widgets - Data/Organization
  tabs(tabDefinitions: Array<{ title: string; builder: () => void }>, location?: 'top' | 'bottom' | 'leading' | 'trailing'): Tabs;
  doctabs(tabDefinitions: Array<{ title: string; builder: () => void }>, options?: { location?: 'top' | 'bottom' | 'leading' | 'trailing'; onClosed?: (tabIndex: number, tabTitle: string) => void }): DocTabs;
  toolbar(toolbarItems: Array<ToolbarAction | { type: 'separator' | 'spacer' }>): Toolbar;
  toolbarAction(label: string, onAction?: () => void): ToolbarAction;
  table(headers: string[], data: string[][]): Table;
  list(items: string[], onSelected?: (index: number, item: string) => void, onUnselected?: (index: number, item: string) => void): List;
  tree(rootLabel: string): Tree;
  card(title: string, subtitle: string, builder: () => void): Card;
  accordion(items: Array<{ title: string; builder: () => void }>): Accordion;
  form(items: Array<{ label: string; widget: any }>, onSubmit?: () => void, onCancel?: () => void): Form;
  menu(items: MenuItem[]): Menu;
  navigation(rootBuilder: () => void, options?: NavigationOptions): Navigation;
  themeoverride(variantOrOptions: 'dark' | 'light' | CustomThemeOptions, builder: () => void): ThemeOverride;
  popup(windowId: string, builder: () => void): Popup;
  innerWindow(title: string, builder: () => void, onClose?: () => void): InnerWindow;
  multipleWindows(builder?: () => void): MultipleWindows;

  // Canvas
  canvasLine(x1: number, y1: number, x2: number, y2: number, options?: { strokeColor?: string; strokeWidth?: number }): CanvasLine;
  canvasCircle(options?: { x?: number; y?: number; x2?: number; y2?: number; fillColor?: string; strokeColor?: string; strokeWidth?: number }): CanvasCircle;
  canvasRectangle(options?: { width?: number; height?: number; fillColor?: string; strokeColor?: string; strokeWidth?: number; cornerRadius?: number; onClick?: (x: number, y: number) => void }): CanvasRectangle;
  canvasText(text: string, options?: { color?: string; textSize?: number; bold?: boolean; italic?: boolean; monospace?: boolean; alignment?: 'leading' | 'center' | 'trailing' }): CanvasText;
  canvasRaster(width: number, height: number, pixels?: Array<[number, number, number, number]>): CanvasRaster;
  tappableCanvasRaster(width: number, height: number, options?: TappableCanvasRasterOptions): TappableCanvasRaster;
  canvasLinearGradient(options?: { startColor?: string; endColor?: string; angle?: number; width?: number; height?: number }): CanvasLinearGradient;
  canvasArc(options?: { x?: number; y?: number; x2?: number; y2?: number; startAngle?: number; endAngle?: number; fillColor?: string; strokeColor?: string; strokeWidth?: number }): CanvasArc;
  canvasPolygon(options?: { points?: Array<{ x: number; y: number }>; fillColor?: string; strokeColor?: string; strokeWidth?: number }): CanvasPolygon;
  canvasRadialGradient(options?: { startColor?: string; endColor?: string; centerOffsetX?: number; centerOffsetY?: number; width?: number; height?: number }): CanvasRadialGradient;

  // Simple canvas aliases
  rectangle(color: string, width?: number, height?: number): CanvasRectangle;
  circle(color: string, radius?: number): CanvasCircle;
  line(color: string, strokeWidth?: number): CanvasLine;
  linearGradient(startColor: string, endColor: string, angle?: number): CanvasLinearGradient;
  radialGradient(centerColor: string, edgeColor: string): CanvasRadialGradient;
  text(content: string, size?: number, color?: string): CanvasText;

  // App lifecycle
  run(): Promise<void>;
  quit(): void;
  registerCleanup(callback: () => void | Promise<void>): void;

  // Theme
  setTheme(theme: 'dark' | 'light'): Promise<void>;
  getTheme(): Promise<'dark' | 'light'>;
  setCustomTheme(colors: CustomThemeColors): Promise<void>;
  clearCustomTheme(): Promise<void>;
  setCustomFont(path: string, style?: FontTextStyle): Promise<void>;
  clearCustomFont(style?: FontTextStyle | 'all'): Promise<void>;
  getAvailableFonts(): Promise<FontInfo>;
  setFontScale(scale: number): Promise<void>;

  // Preferences (scoped in sandbox)
  getPreference(key: string, defaultValue?: string): Promise<string>;
  getPreferenceInt(key: string, defaultValue?: number): Promise<number>;
  getPreferenceFloat(key: string, defaultValue?: number): Promise<number>;
  getPreferenceBool(key: string, defaultValue?: boolean): Promise<boolean>;
  setPreference(key: string, value: string | number | boolean): Promise<void>;
  removePreference(key: string): Promise<void>;

  // System features
  setSystemTray(options: { iconPath?: string; menuItems: Array<{ label: string; onClick?: () => void; isSeparator?: boolean }> }): Promise<void>;
  sendNotification(title: string, content: string): Promise<void>;
  showSource(filePath?: string): void;

  // Widget manipulation
  moveWidget(widgetId: string, x: number, y: number): Promise<void>;
}

/**
 * Sandboxed App wrapper
 * Wraps a real App instance and scopes widget IDs and preferences
 */
export class SandboxedApp implements IApp {
  private realApp: App;
  private scope: string;
  private ctx: Context;

  constructor(realApp: App, scope: string) {
    this.realApp = realApp;
    this.scope = scope;
    // Create a scoped context that prefixes widget IDs
    this.ctx = realApp.getContext().createScopedContext(scope);
  }

  // ============================================================================
  // Window creation - uses real app but content built with scoped context
  // ============================================================================

  window(options: WindowOptions, builder: (win: any) => void): any {
    // Delegate to real app - window creation is OK
    // The builder will use this.ctx methods which are scoped
    return this.realApp.window(options, builder);
  }

  // ============================================================================
  // Containers - all use scoped context
  // ============================================================================

  vbox(builder: () => void): VBox {
    return new VBox(this.ctx, builder);
  }

  hbox(builder: () => void): HBox {
    return new HBox(this.ctx, builder);
  }

  stack(builder: () => void): Stack {
    return new Stack(this.ctx, builder);
  }

  canvasStack(builder: () => void): CanvasStack {
    return new CanvasStack(this.ctx, builder);
  }

  scroll(builder: () => void): Scroll {
    return new Scroll(this.ctx, builder);
  }

  grid(columns: number, builder: () => void): Grid {
    return new Grid(this.ctx, columns, builder);
  }

  center(builder: () => void): Center {
    return new Center(this.ctx, builder);
  }

  max(builder: () => void): Max {
    return new Max(this.ctx, builder);
  }

  border(config: { top?: () => void; bottom?: () => void; left?: () => void; right?: () => void; center?: () => void }): Border {
    return new Border(this.ctx, config);
  }

  gridwrap(itemWidth: number, itemHeight: number, builder: () => void): GridWrap {
    return new GridWrap(this.ctx, itemWidth, itemHeight, builder);
  }

  withoutLayout(builder: () => void): WithoutLayout {
    return new WithoutLayout(this.ctx, builder);
  }

  hsplit(leadingBuilder: () => void, trailingBuilder: () => void, offset?: number): Split {
    return new Split(this.ctx, 'horizontal', leadingBuilder, trailingBuilder, offset);
  }

  vsplit(leadingBuilder: () => void, trailingBuilder: () => void, offset?: number): Split {
    return new Split(this.ctx, 'vertical', leadingBuilder, trailingBuilder, offset);
  }

  padded(builder: () => void, options?: PaddedOptions): Padded {
    return new Padded(this.ctx, builder, options);
  }

  clip(builder: () => void): Clip {
    return new Clip(this.ctx, builder);
  }

  adaptivegrid(rowcols: number, builder: () => void): AdaptiveGrid {
    return new AdaptiveGrid(this.ctx, rowcols, builder);
  }

  // ============================================================================
  // Widgets - Inputs
  // ============================================================================

  button(text: string, className?: string): Button {
    return new Button(this.ctx, text, className);
  }

  entry(placeholder?: string, onSubmit?: (text: string) => void, minWidth?: number, onDoubleClick?: () => void, onChange?: (text: string) => void, onCursorChanged?: () => void): Entry {
    return new Entry(this.ctx, placeholder, onSubmit, minWidth, onDoubleClick, onChange, onCursorChanged);
  }

  multilineentry(placeholder?: string, wrapping?: 'off' | 'word' | 'break'): MultiLineEntry {
    return new MultiLineEntry(this.ctx, placeholder, wrapping);
  }

  passwordentry(placeholder?: string, onSubmit?: (text: string) => void): PasswordEntry {
    return new PasswordEntry(this.ctx, placeholder, onSubmit);
  }

  checkbox(text: string, onChanged?: (checked: boolean) => void, onFocus?: () => void, onBlur?: () => void): Checkbox {
    return new Checkbox(this.ctx, text, onChanged, onFocus, onBlur);
  }

  select(options: string[], onSelected?: (selected: string) => void, onFocus?: () => void, onBlur?: () => void): Select {
    return new Select(this.ctx, options, onSelected, onFocus, onBlur);
  }

  selectentry(options: string[], placeholder?: string, onChanged?: (text: string) => void, onSubmitted?: (text: string) => void, onSelected?: (selected: string) => void): SelectEntry {
    return new SelectEntry(this.ctx, options, placeholder, onChanged, onSubmitted, onSelected);
  }

  slider(min: number, max: number, initialValue?: number, onChanged?: (value: number) => void, onFocus?: () => void, onBlur?: () => void): Slider {
    return new Slider(this.ctx, min, max, initialValue, onChanged, onFocus, onBlur);
  }

  radiogroup(options: string[], initialSelected?: string, onSelected?: (selected: string) => void, horizontal?: boolean): RadioGroup {
    return new RadioGroup(this.ctx, options, initialSelected, onSelected, horizontal);
  }

  checkgroup(options: string[], initialSelected?: string[], onChanged?: (selected: string[]) => void): CheckGroup {
    return new CheckGroup(this.ctx, options, initialSelected, onChanged);
  }

  dateentry(initialDate?: string, onChanged?: (date: string) => void): DateEntry {
    return new DateEntry(this.ctx, initialDate, onChanged);
  }

  // ============================================================================
  // Widgets - Display
  // ============================================================================

  label(text: string, className?: string, alignment?: 'leading' | 'trailing' | 'center', wrapping?: 'off' | 'break' | 'word', textStyle?: { bold?: boolean; italic?: boolean; monospace?: boolean }): Label {
    return new Label(this.ctx, text, className, alignment, wrapping, textStyle);
  }

  separator(): Separator {
    return new Separator(this.ctx);
  }

  spacer(): Spacer {
    return new Spacer(this.ctx);
  }

  hyperlink(text: string, url: string): Hyperlink {
    return new Hyperlink(this.ctx, text, url);
  }

  progressbar(initialValue?: number, infinite?: boolean): ProgressBar {
    return new ProgressBar(this.ctx, initialValue, infinite);
  }

  progressbarInfinite(): ProgressBarInfinite {
    return new ProgressBarInfinite(this.ctx);
  }

  activity(): Activity {
    return new Activity(this.ctx);
  }

  calendar(initialDate?: string, onSelected?: (date: string) => void): Calendar {
    return new Calendar(this.ctx, initialDate, onSelected);
  }

  icon(iconName: ThemeIconName): Icon {
    return new Icon(this.ctx, iconName);
  }

  fileicon(path: string): FileIcon {
    return new FileIcon(this.ctx, path);
  }

  image(pathOrOptions: string | { path?: string; resource?: string; fillMode?: 'contain' | 'stretch' | 'original'; onClick?: () => void; onDrag?: (x: number, y: number) => void; onDragEnd?: (x: number, y: number) => void }, fillMode?: 'contain' | 'stretch' | 'original', onClick?: () => void, onDrag?: (x: number, y: number) => void, onDragEnd?: (x: number, y: number) => void): Image {
    return new Image(this.ctx, pathOrOptions, fillMode, onClick, onDrag, onDragEnd);
  }

  richtext(segments: Array<{ text: string; bold?: boolean; italic?: boolean; monospace?: boolean }>): RichText {
    return new RichText(this.ctx, segments);
  }

  textgrid(options?: TextGridOptions | string): TextGrid {
    return new TextGrid(this.ctx, options);
  }

  // ============================================================================
  // Widgets - Data/Organization
  // ============================================================================

  tabs(tabDefinitions: Array<{ title: string; builder: () => void }>, location?: 'top' | 'bottom' | 'leading' | 'trailing'): Tabs {
    return new Tabs(this.ctx, tabDefinitions, location);
  }

  doctabs(tabDefinitions: Array<{ title: string; builder: () => void }>, options?: { location?: 'top' | 'bottom' | 'leading' | 'trailing'; onClosed?: (tabIndex: number, tabTitle: string) => void }): DocTabs {
    return new DocTabs(this.ctx, tabDefinitions, options);
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

  list(items: string[], onSelected?: (index: number, item: string) => void, onUnselected?: (index: number, item: string) => void): List {
    return new List(this.ctx, items, onSelected, onUnselected);
  }

  tree(rootLabel: string): Tree {
    return new Tree(this.ctx, rootLabel);
  }

  card(title: string, subtitle: string, builder: () => void): Card {
    return new Card(this.ctx, title, subtitle, builder);
  }

  accordion(items: Array<{ title: string; builder: () => void }>): Accordion {
    return new Accordion(this.ctx, items);
  }

  form(items: Array<{ label: string; widget: any }>, onSubmit?: () => void, onCancel?: () => void): Form {
    return new Form(this.ctx, items, onSubmit, onCancel);
  }

  menu(items: MenuItem[]): Menu {
    return new Menu(this.ctx, items);
  }

  navigation(rootBuilder: () => void, options?: NavigationOptions): Navigation {
    return new Navigation(this.ctx, rootBuilder, options);
  }

  themeoverride(variantOrOptions: 'dark' | 'light' | CustomThemeOptions, builder: () => void): ThemeOverride {
    return new ThemeOverride(this.ctx, variantOrOptions, builder);
  }

  popup(windowId: string, builder: () => void): Popup {
    return new Popup(this.ctx, windowId, builder);
  }

  innerWindow(title: string, builder: () => void, onClose?: () => void): InnerWindow {
    return InnerWindow.createSync(this.ctx, title, builder, onClose);
  }

  multipleWindows(builder?: () => void): MultipleWindows {
    return new MultipleWindows(this.ctx, builder);
  }

  // ============================================================================
  // Canvas
  // ============================================================================

  canvasLine(x1: number, y1: number, x2: number, y2: number, options?: { strokeColor?: string; strokeWidth?: number }): CanvasLine {
    return new CanvasLine(this.ctx, x1, y1, x2, y2, options);
  }

  canvasCircle(options?: { x?: number; y?: number; x2?: number; y2?: number; fillColor?: string; strokeColor?: string; strokeWidth?: number }): CanvasCircle {
    return new CanvasCircle(this.ctx, options);
  }

  canvasRectangle(options?: { width?: number; height?: number; fillColor?: string; strokeColor?: string; strokeWidth?: number; cornerRadius?: number; onClick?: (x: number, y: number) => void }): CanvasRectangle {
    return new CanvasRectangle(this.ctx, options);
  }

  canvasText(text: string, options?: { color?: string; textSize?: number; bold?: boolean; italic?: boolean; monospace?: boolean; alignment?: 'leading' | 'center' | 'trailing' }): CanvasText {
    return new CanvasText(this.ctx, text, options);
  }

  canvasRaster(width: number, height: number, pixels?: Array<[number, number, number, number]>): CanvasRaster {
    return new CanvasRaster(this.ctx, width, height, pixels);
  }

  tappableCanvasRaster(width: number, height: number, options?: TappableCanvasRasterOptions): TappableCanvasRaster {
    return new TappableCanvasRaster(this.ctx, width, height, options);
  }

  canvasLinearGradient(options?: { startColor?: string; endColor?: string; angle?: number; width?: number; height?: number }): CanvasLinearGradient {
    return new CanvasLinearGradient(this.ctx, options);
  }

  canvasArc(options?: { x?: number; y?: number; x2?: number; y2?: number; startAngle?: number; endAngle?: number; fillColor?: string; strokeColor?: string; strokeWidth?: number }): CanvasArc {
    return new CanvasArc(this.ctx, options);
  }

  canvasPolygon(options?: { points?: Array<{ x: number; y: number }>; fillColor?: string; strokeColor?: string; strokeWidth?: number }): CanvasPolygon {
    return new CanvasPolygon(this.ctx, options);
  }

  canvasRadialGradient(options?: { startColor?: string; endColor?: string; centerOffsetX?: number; centerOffsetY?: number; width?: number; height?: number }): CanvasRadialGradient {
    return new CanvasRadialGradient(this.ctx, options);
  }

  // Simple canvas aliases
  rectangle(color: string, width?: number, height?: number): CanvasRectangle {
    return new CanvasRectangle(this.ctx, { fillColor: color, width, height });
  }

  circle(color: string, radius?: number): CanvasCircle {
    const size = radius ? radius * 2 : undefined;
    return new CanvasCircle(this.ctx, { fillColor: color, x2: size, y2: size });
  }

  line(color: string, strokeWidth?: number): CanvasLine {
    return new CanvasLine(this.ctx, 0, 0, 100, 0, { strokeColor: color, strokeWidth });
  }

  linearGradient(startColor: string, endColor: string, angle?: number): CanvasLinearGradient {
    return new CanvasLinearGradient(this.ctx, { startColor, endColor, angle });
  }

  radialGradient(centerColor: string, edgeColor: string): CanvasRadialGradient {
    return new CanvasRadialGradient(this.ctx, { startColor: centerColor, endColor: edgeColor });
  }

  text(content: string, size?: number, color?: string): CanvasText {
    return new CanvasText(this.ctx, content, { textSize: size, color });
  }

  // ============================================================================
  // App lifecycle - delegate to real app
  // ============================================================================

  async run(): Promise<void> {
    return this.realApp.run();
  }

  quit(): void {
    this.realApp.quit();
  }

  registerCleanup(callback: () => void | Promise<void>): void {
    this.realApp.registerCleanup(callback);
  }

  // ============================================================================
  // Theme - delegate to real app (global setting is OK)
  // ============================================================================

  async setTheme(theme: 'dark' | 'light'): Promise<void> {
    return this.realApp.setTheme(theme);
  }

  async getTheme(): Promise<'dark' | 'light'> {
    return this.realApp.getTheme();
  }

  async setCustomTheme(colors: CustomThemeColors): Promise<void> {
    return this.realApp.setCustomTheme(colors);
  }

  async clearCustomTheme(): Promise<void> {
    return this.realApp.clearCustomTheme();
  }

  async setCustomFont(path: string, style?: FontTextStyle): Promise<void> {
    return this.realApp.setCustomFont(path, style);
  }

  async clearCustomFont(style?: FontTextStyle | 'all'): Promise<void> {
    return this.realApp.clearCustomFont(style);
  }

  async getAvailableFonts(): Promise<FontInfo> {
    return this.realApp.getAvailableFonts();
  }

  async setFontScale(scale: number): Promise<void> {
    return this.realApp.setFontScale(scale);
  }

  // ============================================================================
  // Preferences - SCOPED to this app
  // ============================================================================

  private scopedKey(key: string): string {
    return `${this.scope}:${key}`;
  }

  async getPreference(key: string, defaultValue?: string): Promise<string> {
    return this.realApp.getPreference(this.scopedKey(key), defaultValue);
  }

  async getPreferenceInt(key: string, defaultValue?: number): Promise<number> {
    return this.realApp.getPreferenceInt(this.scopedKey(key), defaultValue);
  }

  async getPreferenceFloat(key: string, defaultValue?: number): Promise<number> {
    return this.realApp.getPreferenceFloat(this.scopedKey(key), defaultValue);
  }

  async getPreferenceBool(key: string, defaultValue?: boolean): Promise<boolean> {
    return this.realApp.getPreferenceBool(this.scopedKey(key), defaultValue);
  }

  async setPreference(key: string, value: string | number | boolean): Promise<void> {
    return this.realApp.setPreference(this.scopedKey(key), value);
  }

  async removePreference(key: string): Promise<void> {
    return this.realApp.removePreference(this.scopedKey(key));
  }

  // ============================================================================
  // System features - delegate to real app
  // ============================================================================

  async setSystemTray(options: { iconPath?: string; menuItems: Array<{ label: string; onClick?: () => void; isSeparator?: boolean }> }): Promise<void> {
    return this.realApp.setSystemTray(options);
  }

  async sendNotification(title: string, content: string): Promise<void> {
    return this.realApp.sendNotification(title, content);
  }

  showSource(filePath?: string): void {
    this.realApp.showSource(filePath);
  }

  // ============================================================================
  // Widget manipulation - scoped widget IDs
  // ============================================================================

  async moveWidget(widgetId: string, x: number, y: number): Promise<void> {
    // Only allow moving widgets that belong to this app's scope
    const scopedId = widgetId.startsWith(this.scope + ':') ? widgetId : `${this.scope}:${widgetId}`;
    return this.realApp.moveWidget(scopedId, x, y);
  }

  // ============================================================================
  // Context access - returns scoped context (maintains sandbox)
  // ============================================================================

  /**
   * Get the scoped context for this sandbox.
   * Returns the scoped context, not the real app's context, maintaining isolation.
   */
  getContext(): Context {
    return this.ctx;
  }

  // ============================================================================
  // NOT EXPOSED - these would allow escaping the sandbox:
  // - getBridge()
  // - getWindows()
  // - createResourceManager()
  // - resources (property)
  // - desktopCanvas() - desktop-only widget
  // - desktopMDI() - desktop-only widget
  // ============================================================================
}
