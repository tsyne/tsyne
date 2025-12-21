import { BridgeConnection, BridgeInterface } from './fynebridge';
import { GrpcBridgeConnection } from './grpcbridge';
import { MsgpackBridgeConnection } from './msgpackbridge';
import { FfiBridgeConnection } from './ffibridge';
import { Context } from './context';
import { Window, WindowOptions } from './window';
import { ITsyneWindow, createTsyneWindow, isDesktopMode, isPhoneMode } from './tsyne-window';
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
  Calendar,
  ColorCell,
  ColorCellOptions,
  FileIcon,
  Hyperlink,
  Icon,
  Image,
  Label,
  ProgressBar,
  ProgressBarInfinite,
  RichText,
  Separator,
  Spacer,
  TextGrid,
  TextGridOptions,
  TextGridStyle,
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
  GridOptions,
  GridWrap,
  WithoutLayout,
  HBox,
  HBoxOptions,
  Max,
  Padded,
  PaddedOptions,
  Scroll,
  Split,
  Stack,
  CanvasStack,
  VBox,
  VBoxOptions,
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
  CanvasArc,
  CanvasCircle,
  CanvasLine,
  CanvasLinearGradient,
  CanvasPolygon,
  CanvasRadialGradient,
  CanvasRaster,
  CanvasRectangle,
  CanvasText,
  TappableCanvasRaster,
  TappableCanvasRasterOptions,
  // Desktop
  DesktopCanvas,
  DesktopCanvasOptions,
  DesktopMDI,
  DesktopMDIOptions,
  // Types
  ThemeIconName,
} from './widgets';
export type { TextGridOptions, TextGridStyle, NavigationOptions, ThemeIconName, VBoxOptions, HBoxOptions, GridOptions };
import { initializeGlobals } from './globals';
import { ResourceManager } from './resources';

export type BridgeMode = 'stdio' | 'grpc' | 'msgpack-uds' | 'ffi';

export interface AppOptions {
  title?: string;
  /** Bridge communication mode: 'stdio' (default), 'grpc' (binary protocol), or 'msgpack-uds' (fastest) */
  bridgeMode?: BridgeMode;
  /** Enable/disable the Ctrl+Shift+I inspector shortcut (default: true) */
  inspector?: boolean;
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
 * Custom theme size definitions
 * All sizes are in pixels (float32)
 */
export interface CustomThemeSizes {
  /** Caption/helper text size */
  captionText?: number;
  /** Inline icon size */
  inlineIcon?: number;
  /** Inner padding for widgets */
  innerPadding?: number;
  /** Line spacing between text */
  lineSpacing?: number;
  /** Standard padding around elements */
  padding?: number;
  /** Scrollbar width */
  scrollBar?: number;
  /** Small/minimized scrollbar width */
  scrollBarSmall?: number;
  /** Separator line thickness */
  separatorThickness?: number;
  /** Regular text size */
  text?: number;
  /** Heading text size */
  headingText?: number;
  /** Sub-heading text size */
  subHeadingText?: number;
  /** Input field border width */
  inputBorder?: number;
  /** Input field corner radius */
  inputRadius?: number;
  /** Selection highlight corner radius */
  selectionRadius?: number;
  /** Scrollbar corner radius */
  scrollBarRadius?: number;
}

/**
 * Complete theme configuration (for save/load)
 */
export interface ThemeConfig {
  variant: 'light' | 'dark';
  fontScale: number;
  colors?: CustomThemeColors;
  sizes?: CustomThemeSizes;
}

/**
 * Get bridge mode from environment variable or options
 */
function getBridgeMode(options?: AppOptions): BridgeMode {
  // Environment variable takes precedence
  const envMode = process.env.TSYNE_BRIDGE_MODE;
  if (envMode === 'grpc' || envMode === 'stdio' || envMode === 'msgpack-uds' || envMode === 'ffi') {
    return envMode;
  }
  // Fall back to options or default
  return options?.bridgeMode || 'stdio';
}

/**
 * Factory function to create the appropriate bridge implementation
 * based on the specified mode
 */
function createBridge(mode: BridgeMode, testMode: boolean): BridgeInterface {
  switch (mode) {
    case 'grpc':
      return new GrpcBridgeConnection(testMode);
    case 'msgpack-uds':
      return new MsgpackBridgeConnection(testMode);
    case 'ffi':
      return new FfiBridgeConnection(testMode);
    default:
      return new BridgeConnection(testMode);
  }
}

/**
 * App is the main application class
 */
export class App {
  private ctx: Context;
  private windows: Window[] = [];
  private bridge: BridgeInterface;
  public resources: ResourceManager;
  private cleanupCallbacks: Array<() => void | Promise<void>> = [];

  constructor(options?: AppOptions, testMode: boolean = false) {
    // Initialize browser compatibility globals
    initializeGlobals();

    // Create bridge using factory
    this.bridge = createBridge(getBridgeMode(options), testMode);

    this.ctx = new Context(this.bridge);
    this.resources = new ResourceManager(this.bridge);

    // Set inspector enabled state (defaults to true if not specified)
    if (options?.inspector === false) {
      this.ctx.setInspectorEnabled(false);
    }
  }

  getContext(): Context {
    return this.ctx;
  }

  getBridge(): BridgeInterface {
    return this.bridge;
  }

  /**
   * Create a new ResourceManager instance backed by this app's bridge.
   * Use this for IoC when you need to pass resources explicitly rather than using a.resources.
   */
  createResourceManager(): ResourceManager {
    return new ResourceManager(this.bridge);
  }

  /**
   * Get the ID of the first created window
   * Used by test harness to query dialogs
   */
  getFirstWindowId(): string | undefined {
    return this.windows[0]?.id;
  }

  /**
   * Register a cleanup callback to be called before app shutdown
   * Use this to clean up timers, intervals, event listeners, etc.
   */
  registerCleanup(callback: () => void | Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Run all registered cleanup callbacks
   * Called by TsyneTest before shutting down the bridge
   */
  async runCleanupCallbacks(): Promise<void> {
    for (const callback of this.cleanupCallbacks) {
      await callback();
    }
    this.cleanupCallbacks = [];
  }

  /**
   * Create a new window.
   * In standalone mode, creates a real OS window (fyne.Window).
   * In desktop mode, creates an inner window (container.InnerWindow).
   * @param options - Window configuration (title, size, etc.)
   * @param builder - Function to build window content
   * @returns The created Window instance (or ITsyneWindow in desktop mode)
   */
  window(options: WindowOptions, builder: (win: Window) => void): Window;
  window(options: WindowOptions, builder: (win: ITsyneWindow) => void): ITsyneWindow;
  window(options: WindowOptions, builder: (win: any) => void): Window | ITsyneWindow {
    if (isDesktopMode() || isPhoneMode()) {
      // Desktop/Phone mode - create InnerWindow or StackPane via factory
      const win = createTsyneWindow(this.ctx, options, builder);
      return win;
    } else {
      // Standalone mode - create real Window
      const win = new Window(this.ctx, options, builder);
      this.windows.push(win);
      return win;
    }
  }

  // Scoped declarative API methods - these use the app's context (proper IoC/DI)

  /**
   * Create a vertical box container that stacks children vertically.
   * @param builder - Function to create child widgets
   * @param options - Optional settings (spacing)
   * @returns VBox container
   * @example
   * // Default spacing (theme-based)
   * a.vbox(() => { ... });
   * // No spacing between items
   * a.vbox(() => { ... }, { spacing: 0 });
   */
  vbox(builder: () => void, options?: VBoxOptions): VBox {
    return new VBox(this.ctx, builder, options);
  }

  /**
   * Create a horizontal box container that arranges children horizontally.
   * @param builder - Function to create child widgets
   * @param options - Optional settings (spacing)
   * @returns HBox container
   * @example
   * // Default spacing (theme-based)
   * a.hbox(() => { ... });
   * // No spacing between items
   * a.hbox(() => { ... }, { spacing: 0 });
   */
  hbox(builder: () => void, options?: HBoxOptions): HBox {
    return new HBox(this.ctx, builder, options);
  }

  /**
   * Create a stack container that stacks children on top of each other.
   * Useful for creating overlapping UI elements.
   * @param builder - Function to create child widgets
   * @returns Stack container
   */
  stack(builder: () => void): Stack {
    return new Stack(this.ctx, builder);
  }

  /**
   * Create a canvas stack container specifically for layering canvas primitives.
   * Unlike regular stack (which resizes children), this preserves absolute
   * Position coordinates for canvas.Line, canvas.Circle, etc.
   * Use this for clock faces, analog gauges, and other canvas-based graphics.
   * @param builder - Function to create canvas child widgets
   * @returns CanvasStack container
   */
  canvasStack(builder: () => void): CanvasStack {
    return new CanvasStack(this.ctx, builder);
  }

  /**
   * Create a clickable button.
   * @param text - Button label
   * @param className - Optional CSS class name for styling
   * @returns Button widget
   */
  button(text: string, className?: string): Button {
    return new Button(this.ctx, text, className);
  }

  /**
   * Create a text label.
   * @param text - Text to display
   * @param className - Optional CSS class name
   * @param alignment - Text alignment ('leading', 'center', 'trailing')
   * @param wrapping - Text wrapping mode ('off', 'break', 'word')
   * @param textStyle - Text styling options (bold, italic, monospace)
   * @returns Label widget
   */
  label(
    text: string,
    className?: string,
    alignment?: 'leading' | 'trailing' | 'center',
    wrapping?: 'off' | 'break' | 'word',
    textStyle?: { bold?: boolean; italic?: boolean; monospace?: boolean }
  ): Label {
    return new Label(this.ctx, text, className, alignment, wrapping, textStyle);
  }

  /**
   * Create a single-line text input.
   * @param placeholder - Placeholder text
   * @param onSubmit - Submit handler (Enter key pressed)
   * @param minWidth - Minimum width in pixels
   * @param onDoubleClick - Double-click handler
   * @param onChange - Called when text changes
   * @param onCursorChanged - Called when cursor position changes
   * @param onFocus - Called when focus state changes (focused: boolean)
   * @returns Entry widget
   */
  entry(
    placeholder?: string,
    onSubmit?: (text: string) => void,
    minWidth?: number,
    onDoubleClick?: () => void,
    onChange?: (text: string) => void,
    onCursorChanged?: () => void,
    onFocus?: (focused: boolean) => void
  ): Entry {
    return new Entry(this.ctx, placeholder, onSubmit, minWidth, onDoubleClick, onChange, onCursorChanged, onFocus);
  }

  /**
   * Create a multi-line text input (text area).
   * @param placeholder - Placeholder text
   * @param wrapping - Text wrapping mode ('off', 'word', 'break')
   * @returns MultiLineEntry widget
   */
  multilineentry(placeholder?: string, wrapping?: 'off' | 'word' | 'break'): MultiLineEntry {
    return new MultiLineEntry(this.ctx, placeholder, wrapping);
  }

  /**
   * Create a password input (masked text).
   * @param placeholder - Placeholder text
   * @param onSubmit - Submit handler (Enter key pressed)
   * @returns PasswordEntry widget
   */
  passwordentry(placeholder?: string, onSubmit?: (text: string) => void): PasswordEntry {
    return new PasswordEntry(this.ctx, placeholder, onSubmit);
  }

  /**
   * Create a horizontal separator line.
   * @returns Separator widget
   */
  separator(): Separator {
    return new Separator(this.ctx);
  }

  /**
   * Create a flexible spacer for layout.
   * @returns Spacer widget
   */
  spacer(): Spacer {
    return new Spacer(this.ctx);
  }

  /**
   * Create a clickable hyperlink.
   * @param text - Link text to display
   * @param url - URL to open when clicked
   * @returns Hyperlink widget
   */
  hyperlink(text: string, url: string): Hyperlink {
    return new Hyperlink(this.ctx, text, url);
  }

  /**
   * Create a checkbox.
   * @param text - Checkbox label
   * @param onChanged - Handler called when checkbox state changes
   * @returns Checkbox widget
   */
  checkbox(
    text: string,
    onChanged?: (checked: boolean) => void,
    onFocus?: () => void,
    onBlur?: () => void
  ): Checkbox {
    return new Checkbox(this.ctx, text, onChanged, onFocus, onBlur);
  }

  /**
   * Create a dropdown select.
   * @param options - Array of option strings
   * @param onSelected - Handler called when selection changes
   * @returns Select widget
   */
  select(
    options: string[],
    onSelected?: (selected: string) => void,
    onFocus?: () => void,
    onBlur?: () => void
  ): Select {
    return new Select(this.ctx, options, onSelected, onFocus, onBlur);
  }

  selectentry(
    options: string[],
    placeholder?: string,
    onChanged?: (text: string) => void,
    onSubmitted?: (text: string) => void,
    onSelected?: (selected: string) => void
  ): SelectEntry {
    return new SelectEntry(this.ctx, options, placeholder, onChanged, onSubmitted, onSelected);
  }

  slider(
    min: number,
    max: number,
    initialValue?: number,
    onChanged?: (value: number) => void,
    onFocus?: () => void,
    onBlur?: () => void
  ): Slider {
    return new Slider(this.ctx, min, max, initialValue, onChanged, onFocus, onBlur);
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

  scroll(builder: () => void): Scroll {
    return new Scroll(this.ctx, builder);
  }

  /**
   * Create a grid layout container.
   * @param columns - Number of columns
   * @param builder - Function to create child widgets
   * @param options - Optional settings (spacing)
   * @returns Grid container
   * @example
   * // Default spacing (theme-based)
   * a.grid(3, () => { ... });
   * // No spacing between items (for chess boards, etc.)
   * a.grid(8, () => { ... }, { spacing: 0 });
   */
  grid(columns: number, builder: () => void, options?: GridOptions): Grid {
    return new Grid(this.ctx, columns, builder, options);
  }

  radiogroup(
    options: string[],
    initialSelected?: string,
    onSelected?: (selected: string) => void,
    horizontal?: boolean
  ): RadioGroup {
    return new RadioGroup(this.ctx, options, initialSelected, onSelected, horizontal);
  }

  checkgroup(
    options: string[],
    initialSelected?: string[],
    onChanged?: (selected: string[]) => void
  ): CheckGroup {
    return new CheckGroup(this.ctx, options, initialSelected, onChanged);
  }

  dateentry(initialDate?: string, onChanged?: (date: string) => void): DateEntry {
    return new DateEntry(this.ctx, initialDate, onChanged);
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

  /**
   * Create a color cell widget - tappable cell with colored background and centered text.
   * Useful for game boards (Sudoku, chess), spreadsheets, color pickers, etc.
   * @param options - Configuration options (width, height, text, fillColor, textColor, onClick)
   * @returns ColorCell widget
   * @example
   * a.colorCell({ width: 36, height: 36, text: '5', fillColor: '#FFFFFF', onClick: () => selectCell() });
   */
  colorCell(options?: ColorCellOptions): ColorCell {
    return new ColorCell(this.ctx, options);
  }

  hsplit(leadingBuilder: () => void, trailingBuilder: () => void, offset?: number, fixed?: boolean): Split {
    return new Split(this.ctx, 'horizontal', leadingBuilder, trailingBuilder, offset, fixed);
  }

  vsplit(leadingBuilder: () => void, trailingBuilder: () => void, offset?: number, fixed?: boolean): Split {
    return new Split(this.ctx, 'vertical', leadingBuilder, trailingBuilder, offset, fixed);
  }

  tabs(
    tabDefinitions: Array<{ title: string; builder: () => void }>,
    location?: 'top' | 'bottom' | 'leading' | 'trailing'
  ): Tabs {
    return new Tabs(this.ctx, tabDefinitions, location);
  }

  doctabs(
    tabDefinitions: Array<{ title: string; builder: () => void }>,
    options?: {
      location?: 'top' | 'bottom' | 'leading' | 'trailing';
      onClosed?: (tabIndex: number, tabTitle: string) => void;
    }
  ): DocTabs {
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

  list(
    items: string[],
    onSelected?: (index: number, item: string) => void,
    onUnselected?: (index: number, item: string) => void
  ): List {
    return new List(this.ctx, items, onSelected, onUnselected);
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

  accordion(items: Array<{ title: string; open?: boolean; builder: () => void }>): Accordion {
    return new Accordion(this.ctx, items);
  }

  form(
    items: Array<{ label: string; widget: any }>,
    onSubmit?: () => void,
    onCancel?: () => void
  ): Form {
    return new Form(this.ctx, items, onSubmit, onCancel);
  }

  tree(rootLabel: string): Tree {
    return new Tree(this.ctx, rootLabel);
  }

  richtext(
    segments: Array<{ text: string; bold?: boolean; italic?: boolean; monospace?: boolean }>
  ): RichText {
    return new RichText(this.ctx, segments);
  }

  image(
    pathOrOptions:
      | string
      | {
          path?: string;
          resource?: string;
          fillMode?: 'contain' | 'stretch' | 'original';
          onClick?: () => void;
          onDrag?: (x: number, y: number) => void;
          onDragEnd?: (x: number, y: number) => void;
        },
    fillMode?: 'contain' | 'stretch' | 'original',
    onClick?: () => void,
    onDrag?: (x: number, y: number) => void,
    onDragEnd?: (x: number, y: number) => void
  ): Image {
    return new Image(this.ctx, pathOrOptions, fillMode, onClick, onDrag, onDragEnd);
  }

  border(config: {
    top?: () => void;
    bottom?: () => void;
    left?: () => void;
    right?: () => void;
    center?: () => void;
  }): Border {
    return new Border(this.ctx, config);
  }

  gridwrap(itemWidth: number, itemHeight: number, builder: () => void): GridWrap {
    return new GridWrap(this.ctx, itemWidth, itemHeight, builder);
  }

  /**
   * Create a container with no automatic layout.
   * Children must be manually positioned using moveWidget().
   */
  withoutLayout(builder: () => void): WithoutLayout {
    return new WithoutLayout(this.ctx, builder);
  }

  /**
   * Move a widget to a specific position (only works inside withoutLayout containers)
   */
  async moveWidget(widgetId: string, x: number, y: number): Promise<void> {
    await this.ctx.bridge.send('moveWidget', { widgetId, x, y });
  }

  menu(items: MenuItem[]): Menu {
    return new Menu(this.ctx, items);
  }

  // Canvas primitives
  canvasLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options?: { strokeColor?: string; strokeWidth?: number }
  ): CanvasLine {
    return new CanvasLine(this.ctx, x1, y1, x2, y2, options);
  }

  canvasCircle(options?: {
    x?: number;
    y?: number;
    x2?: number;
    y2?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }): CanvasCircle {
    return new CanvasCircle(this.ctx, options);
  }

  canvasRectangle(options?: {
    width?: number;
    height?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    cornerRadius?: number;
    onClick?: (x: number, y: number) => void;
  }): CanvasRectangle {
    return new CanvasRectangle(this.ctx, options);
  }

  canvasText(
    text: string,
    options?: {
      color?: string;
      textSize?: number;
      bold?: boolean;
      italic?: boolean;
      monospace?: boolean;
      alignment?: 'leading' | 'center' | 'trailing';
    }
  ): CanvasText {
    return new CanvasText(this.ctx, text, options);
  }

  canvasRaster(
    width: number,
    height: number,
    pixels?: Array<[number, number, number, number]>
  ): CanvasRaster {
    return new CanvasRaster(this.ctx, width, height, pixels);
  }

  tappableCanvasRaster(
    width: number,
    height: number,
    options?: TappableCanvasRasterOptions
  ): TappableCanvasRaster {
    return new TappableCanvasRaster(this.ctx, width, height, options);
  }

  canvasLinearGradient(options?: {
    startColor?: string;
    endColor?: string;
    angle?: number;
    width?: number;
    height?: number;
  }): CanvasLinearGradient {
    return new CanvasLinearGradient(this.ctx, options);
  }

  canvasArc(options?: {
    x?: number;
    y?: number;
    x2?: number;
    y2?: number;
    startAngle?: number;
    endAngle?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }): CanvasArc {
    return new CanvasArc(this.ctx, options);
  }

  canvasPolygon(options?: {
    points?: Array<{ x: number; y: number }>;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }): CanvasPolygon {
    return new CanvasPolygon(this.ctx, options);
  }

  canvasRadialGradient(options?: {
    startColor?: string;
    endColor?: string;
    centerOffsetX?: number;
    centerOffsetY?: number;
    width?: number;
    height?: number;
  }): CanvasRadialGradient {
    return new CanvasRadialGradient(this.ctx, options);
  }

  // Simple canvas primitive aliases for common use cases
  /**
   * Create a colored rectangle - simplified API for backgrounds, dividers, and placeholder boxes
   * @param color Fill color (hex string like '#ff0000' or color name)
   * @param width Optional width in pixels
   * @param height Optional height in pixels
   */
  rectangle(color: string, width?: number, height?: number): CanvasRectangle {
    return new CanvasRectangle(this.ctx, { fillColor: color, width, height });
  }

  /**
   * Create a colored circle - simplified API for decorative elements
   * @param color Fill color (hex string like '#ff0000' or color name)
   * @param radius Optional radius - sets both x2 and y2 to create a circle of this size
   */
  circle(color: string, radius?: number): CanvasCircle {
    const size = radius ? radius * 2 : undefined;
    return new CanvasCircle(this.ctx, { fillColor: color, x2: size, y2: size });
  }

  /**
   * Create a colored line - simplified API for dividers and decoration
   * @param color Stroke color (hex string like '#ff0000' or color name)
   * @param strokeWidth Optional line thickness
   */
  line(color: string, strokeWidth?: number): CanvasLine {
    // Default to a horizontal line; position/size handled by container
    return new CanvasLine(this.ctx, 0, 0, 100, 0, { strokeColor: color, strokeWidth });
  }

  /**
   * Create a linear gradient background
   * @param startColor Starting color of the gradient
   * @param endColor Ending color of the gradient
   * @param angle Optional angle in degrees (0 = horizontal left-to-right)
   */
  linearGradient(startColor: string, endColor: string, angle?: number): CanvasLinearGradient {
    return new CanvasLinearGradient(this.ctx, { startColor, endColor, angle });
  }

  /**
   * Create a radial gradient background
   * @param centerColor Color at the center of the gradient
   * @param edgeColor Color at the edges of the gradient
   */
  radialGradient(centerColor: string, edgeColor: string): CanvasRadialGradient {
    return new CanvasRadialGradient(this.ctx, { startColor: centerColor, endColor: edgeColor });
  }

  /**
   * Create canvas text - low-level text rendering (label is usually better for UI)
   * @param content The text to display
   * @param size Optional font size
   * @param color Optional text color
   */
  text(content: string, size?: number, color?: string): CanvasText {
    return new CanvasText(this.ctx, content, { textSize: size, color });
  }

  clip(builder: () => void): Clip {
    return new Clip(this.ctx, builder);
  }

  innerWindow(title: string, builder: () => void, onClose?: () => void): InnerWindow {
    return new InnerWindow(this.ctx, title, builder, onClose);
  }

  /**
   * Create a MultipleWindows container (MDI)
   * @param builder Optional function to build initial inner windows
   */
  multipleWindows(builder?: () => void): MultipleWindows {
    return new MultipleWindows(this.ctx, builder);
  }

  adaptivegrid(rowcols: number, builder: () => void): AdaptiveGrid {
    return new AdaptiveGrid(this.ctx, rowcols, builder);
  }

  padded(builder: () => void, options?: PaddedOptions): Padded {
    return new Padded(this.ctx, builder, options);
  }

  themeoverride(variant: 'dark' | 'light', builder: () => void): ThemeOverride {
    return new ThemeOverride(this.ctx, variant, builder);
  }

  navigation(rootBuilder: () => void, options?: NavigationOptions): Navigation {
    return new Navigation(this.ctx, rootBuilder, options);
  }

  textgrid(options?: TextGridOptions | string): TextGrid {
    return new TextGrid(this.ctx, options);
  }

  /**
   * Create a desktop canvas for draggable icons
   * Solves Fyne Stack click limitation with single-widget absolute positioning
   */
  desktopCanvas(options?: DesktopCanvasOptions): DesktopCanvas {
    return new DesktopCanvas(this.ctx, options);
  }

  /**
   * Create a DesktopMDI container that combines desktop icons with MDI window management.
   * This solves the layering problem by managing both in a single widget.
   * @param options - Optional configuration
   * @returns DesktopMDI widget instance
   */
  desktopMDI(options?: DesktopMDIOptions): DesktopMDI {
    return new DesktopMDI(this.ctx, options);
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
    // Wait for all widget ID registrations to complete
    await this.ctx.waitForRegistrations();
  }

  quit(): void {
    this.ctx.bridge.quit();
  }

  async setTheme(theme: 'dark' | 'light'): Promise<void> {
    await this.ctx.bridge.send('setTheme', { theme });
  }

  async getTheme(): Promise<'dark' | 'light'> {
    const result = await this.ctx.bridge.send('getTheme', {}) as { theme: 'dark' | 'light' };
    return result.theme;
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
   * Set custom theme sizes
   * @param sizes - Object with size names and pixel values
   */
  async setCustomSizes(sizes: CustomThemeSizes): Promise<void> {
    await this.ctx.bridge.send('setCustomSizes', { sizes });
  }

  /**
   * Clear custom sizes and revert to default
   */
  async clearCustomSizes(): Promise<void> {
    await this.ctx.bridge.send('clearCustomSizes', {});
  }

  /**
   * Get current theme configuration (colors, sizes, variant, fontScale)
   * Useful for theme editor or saving themes
   */
  async getThemeConfig(): Promise<ThemeConfig> {
    const result = await this.ctx.bridge.send('getThemeConfig', {}) as ThemeConfig;
    return result;
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

  /**
   * Get all windows created by this application.
   * @returns Array of Window instances
   */
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
            },
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
    const menuItems = options.menuItems.map((item) => {
      if (item.isSeparator) {
        return { isSeparator: true };
      }

      const callbackId = this.ctx.generateId('callback');
      if (item.onClick) {
        this.ctx.bridge.registerEventHandler(callbackId, item.onClick);
      }

      return {
        label: item.label,
        callbackId,
      };
    });

    await this.ctx.bridge.send('setSystemTray', {
      iconPath: options.iconPath,
      menuItems,
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
      default: defaultValue,
    }) as { value: string };
    return result.value;
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
      default: defaultValue,
    }) as { value: number };
    return result.value;
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
      default: defaultValue,
    }) as { value: number };
    return result.value;
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
      default: defaultValue,
    }) as { value: boolean };
    return result.value;
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
