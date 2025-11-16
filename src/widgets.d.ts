import { Context } from './context';
import { WidgetSelector } from './styles';
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
export declare abstract class Widget {
    protected ctx: Context;
    id: string;
    private visibilityCondition?;
    constructor(ctx: Context, id: string);
    /**
     * Apply styles from the global stylesheet to this widget
     */
    protected applyStyles(widgetType: WidgetSelector): Promise<void>;
    /**
     * Set context menu for this widget (shown on right-click)
     */
    setContextMenu(items: ContextMenuItem[]): Promise<void>;
    setText(text: string): Promise<void>;
    getText(): Promise<string>;
    hide(): Promise<void>;
    show(): Promise<void>;
    /**
     * Register a custom ID for this widget (for test framework getByID)
     * @param customId Custom ID to register
     * @returns this for method chaining
     * @example
     * const statusLabel = a.label('').withId('statusLabel');
     * // In tests: ctx.getByID('statusLabel')
     */
    withId(customId: string): this;
    /**
     * AngularJS-style ng-show directive for declarative visibility
     * @param conditionFn Function that returns whether widget should be visible
     * @returns this for method chaining
     */
    ngShow(conditionFn: () => boolean): this;
    /**
     * Refresh the widget - re-evaluates visibility conditions
     */
    refresh(): Promise<void>;
}
/**
 * Button widget
 */
export declare class Button extends Widget {
    constructor(ctx: Context, text: string, onClick?: () => void, className?: string);
    disable(): Promise<void>;
    enable(): Promise<void>;
    isEnabled(): Promise<boolean>;
}
/**
 * Label widget
 */
export declare class Label extends Widget {
    constructor(ctx: Context, text: string, className?: string, alignment?: 'leading' | 'trailing' | 'center', wrapping?: 'off' | 'break' | 'word', textStyle?: {
        bold?: boolean;
        italic?: boolean;
        monospace?: boolean;
    });
}
/**
 * Entry (text input) widget
 */
export declare class Entry extends Widget {
    constructor(ctx: Context, placeholder?: string, onSubmit?: (text: string) => void, minWidth?: number, onDoubleClick?: () => void);
    disable(): Promise<void>;
    enable(): Promise<void>;
    focus(): Promise<void>;
    submit(): Promise<void>;
}
/**
 * Multi-line text entry widget
 */
export declare class MultiLineEntry extends Widget {
    constructor(ctx: Context, placeholder?: string, wrapping?: 'off' | 'word' | 'break');
}
/**
 * Password entry widget (text is masked)
 */
export declare class PasswordEntry extends Widget {
    constructor(ctx: Context, placeholder?: string, onSubmit?: (text: string) => void);
}
/**
 * Separator widget (horizontal or vertical line)
 */
export declare class Separator {
    private ctx;
    id: string;
    constructor(ctx: Context);
}
/**
 * Hyperlink widget (clickable URL)
 */
export declare class Hyperlink {
    private ctx;
    id: string;
    constructor(ctx: Context, text: string, url: string);
}
/**
 * ModelBoundList - Smart list binding for containers (inspired by AngularJS ng-repeat)
 * Efficiently manages a list of items with intelligent diffing to avoid full rebuilds
 */
export declare class ModelBoundList<T> {
    private ctx;
    private container;
    private items;
    private keyFn;
    private builderFn?;
    private trackedItems;
    constructor(ctx: Context, container: VBox, items: T[]);
    /**
     * Track items by key (like ng-repeat track by)
     * @param fn Function to extract unique key from item
     */
    trackBy(fn: (item: T) => any): ModelBoundList<T>;
    /**
     * Builder function for each item (called once per item)
     * @param builder Function that creates the view for an item
     */
    each(builder: (item: T) => any): void;
    /**
     * Update the model - performs smart diff and only updates changed items
     * @param newItems New list of items
     */
    update(newItems: T[]): void;
    /**
     * Refresh visibility of all items (re-evaluates ngShow conditions)
     */
    refreshVisibility(): Promise<void>;
    private createItemView;
}
/**
 * VBox container (vertical box layout)
 */
export declare class VBox {
    private ctx;
    id: string;
    private visibilityCondition?;
    constructor(ctx: Context, builder: () => void);
    /**
     * Dynamically add a widget to this container (Fyne container.Add)
     * @param builder Function that creates the widget to add
     */
    add(builder: () => void): void;
    /**
     * Remove all widgets from this container (Fyne container.Objects = nil)
     */
    removeAll(): void;
    /**
     * Refresh the container display (Fyne container.Refresh)
     */
    refresh(): void;
    /**
     * Create a model-bound list for smart list rendering (AngularJS ng-repeat style)
     * @param items Initial array of items
     * @returns ModelBoundList instance for chaining trackBy() and each()
     */
    model<T>(items: T[]): ModelBoundList<T>;
    hide(): Promise<void>;
    show(): Promise<void>;
    /**
     * AngularJS-style ng-show directive for declarative visibility
     * @param conditionFn Function that returns whether container should be visible
     * @returns this for method chaining
     */
    ngShow(conditionFn: () => boolean): this;
    /**
     * Refresh the container - re-evaluates visibility conditions
     */
    refreshVisibility(): Promise<void>;
}
/**
 * HBox container (horizontal box layout)
 */
export declare class HBox {
    private ctx;
    id: string;
    private visibilityCondition?;
    constructor(ctx: Context, builder: () => void);
    /**
     * Dynamically add a widget to this container (Fyne container.Add)
     * @param builder Function that creates the widget to add
     */
    add(builder: () => void): void;
    /**
     * Remove all widgets from this container (Fyne container.Objects = nil)
     */
    removeAll(): void;
    /**
     * Refresh the container display (Fyne container.Refresh)
     */
    refresh(): void;
    hide(): Promise<void>;
    show(): Promise<void>;
    /**
     * AngularJS-style ng-show directive for declarative visibility
     * @param conditionFn Function that returns whether container should be visible
     * @returns this for method chaining
     */
    ngShow(conditionFn: () => boolean): this;
    /**
     * Refresh the container - re-evaluates visibility conditions
     */
    refreshVisibility(): Promise<void>;
}
/**
 * Checkbox widget
 */
export declare class Checkbox extends Widget {
    constructor(ctx: Context, text: string, onChanged?: (checked: boolean) => void);
    setChecked(checked: boolean): Promise<void>;
    getChecked(): Promise<boolean>;
}
/**
 * Select (dropdown) widget
 */
export declare class Select extends Widget {
    constructor(ctx: Context, options: string[], onSelected?: (selected: string) => void);
    setSelected(selected: string): Promise<void>;
    getSelected(): Promise<string>;
}
/**
 * Slider widget
 */
export declare class Slider extends Widget {
    constructor(ctx: Context, min: number, max: number, initialValue?: number, onChanged?: (value: number) => void);
    setValue(value: number): Promise<void>;
    getValue(): Promise<number>;
}
/**
 * ProgressBar widget
 */
export declare class ProgressBar extends Widget {
    constructor(ctx: Context, initialValue?: number, infinite?: boolean);
    setProgress(value: number): Promise<void>;
    getProgress(): Promise<number>;
    setValue(value: number): Promise<void>;
    getValue(): Promise<number>;
}
/**
 * Scroll container
 */
export declare class Scroll {
    private ctx;
    id: string;
    constructor(ctx: Context, builder: () => void);
}
/**
 * Grid layout container
 */
export declare class Grid {
    private ctx;
    id: string;
    constructor(ctx: Context, columns: number, builder: () => void);
}
/**
 * RadioGroup widget
 */
export declare class RadioGroup extends Widget {
    constructor(ctx: Context, options: string[], initialSelected?: string, onSelected?: (selected: string) => void);
    setSelected(selected: string): Promise<void>;
    getSelected(): Promise<string>;
}
/**
 * Split container (horizontal or vertical)
 */
export declare class Split {
    private ctx;
    id: string;
    constructor(ctx: Context, orientation: 'horizontal' | 'vertical', leadingBuilder: () => void, trailingBuilder: () => void, offset?: number);
}
/**
 * Tabs container (AppTabs)
 */
export declare class Tabs {
    private ctx;
    id: string;
    constructor(ctx: Context, tabDefinitions: Array<{
        title: string;
        builder: () => void;
    }>, location?: 'top' | 'bottom' | 'leading' | 'trailing');
}
/**
 * Represents a clickable action item in a Toolbar
 */
export declare class ToolbarAction {
    label: string;
    onAction?: (() => void) | undefined;
    private _id?;
    constructor(label: string, onAction?: (() => void) | undefined);
    /**
     * Assign a unique ID to this toolbar action for testing
     * @param id Custom ID for the action
     * @returns this for method chaining
     */
    withId(id: string): this;
    get id(): string | undefined;
}
/**
 * Toolbar widget
 */
export declare class Toolbar {
    private ctx;
    id: string;
    constructor(ctx: Context, toolbarItems: Array<ToolbarAction | {
        type: 'separator' | 'spacer';
    }>);
}
/**
 * Table widget
 */
export declare class Table {
    private ctx;
    id: string;
    constructor(ctx: Context, headers: string[], data: string[][]);
    updateData(data: string[][]): Promise<void>;
}
/**
 * List widget
 */
export declare class List {
    private ctx;
    id: string;
    constructor(ctx: Context, items: string[], onSelected?: (index: number, item: string) => void);
    updateItems(items: string[]): Promise<void>;
}
/**
 * Center layout - centers content in the available space
 */
export declare class Center {
    private ctx;
    id: string;
    constructor(ctx: Context, builder: () => void);
}
/**
 * Card container with title, subtitle, and content
 */
export declare class Card {
    private ctx;
    id: string;
    constructor(ctx: Context, title: string, subtitle: string, builder: () => void);
}
/**
 * Accordion - collapsible sections
 */
export declare class Accordion {
    private ctx;
    id: string;
    constructor(ctx: Context, items: Array<{
        title: string;
        builder: () => void;
    }>);
}
/**
 * Form widget with labeled fields and submit/cancel buttons
 */
export declare class Form {
    private ctx;
    id: string;
    constructor(ctx: Context, items: Array<{
        label: string;
        widget: any;
    }>, onSubmit?: () => void, onCancel?: () => void);
}
/**
 * Tree widget for hierarchical data
 */
export declare class Tree {
    private ctx;
    id: string;
    constructor(ctx: Context, rootLabel: string);
}
/**
 * RichText widget for formatted text
 */
export declare class RichText {
    private ctx;
    id: string;
    constructor(ctx: Context, segments: Array<{
        text: string;
        bold?: boolean;
        italic?: boolean;
        monospace?: boolean;
    }>);
}
/**
 * Image widget for displaying images
 */
export declare class Image {
    private ctx;
    id: string;
    constructor(ctx: Context, pathOrOptions: string | {
        path?: string;
        resource?: string;
        fillMode?: 'contain' | 'stretch' | 'original';
        onClick?: () => void;
        onDrag?: (x: number, y: number) => void;
        onDragEnd?: (x: number, y: number) => void;
    }, fillMode?: 'contain' | 'stretch' | 'original', onClick?: () => void, onDrag?: (x: number, y: number) => void, onDragEnd?: (x: number, y: number) => void);
    /**
     * Updates the image widget with new image data
     * @param imageData - Base64-encoded image data (with or without data URL prefix)
     */
    updateImage(imageData: string): Promise<void>;
    /**
     * Register a custom ID for this image widget (for test framework getByID)
     * @param customId Custom ID to register
     * @returns this for method chaining
     * @example
     * const cardImage = a.image('card.png').withId('draw3-card');
     * // In tests: ctx.getByID('draw3-card').click()
     */
    withId(customId: string): this;
}
/**
 * Border layout - positions widgets at edges and center
 */
export declare class Border {
    private ctx;
    id: string;
    constructor(ctx: Context, config: {
        top?: () => void;
        bottom?: () => void;
        left?: () => void;
        right?: () => void;
        center?: () => void;
    });
}
/**
 * GridWrap layout - wrapping grid with fixed item sizes
 */
export declare class GridWrap {
    private ctx;
    id: string;
    constructor(ctx: Context, itemWidth: number, itemHeight: number, builder: () => void);
}
