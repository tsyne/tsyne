import { BridgeConnection } from './fynebridge';
import { Context } from './context';
import { Window, WindowOptions } from './window';
import { Button, Label, Entry, MultiLineEntry, PasswordEntry, Separator, Hyperlink, VBox, HBox, Checkbox, Select, Slider, ProgressBar, Scroll, Grid, RadioGroup, Split, Tabs, Toolbar, ToolbarAction, Table, List, Center, Card, Accordion, Form, Tree, RichText, Image, Border, GridWrap } from './widgets';
import { ResourceManager } from './resources';
export interface AppOptions {
    title?: string;
}
/**
 * App is the main application class
 */
export declare class App {
    private ctx;
    private windows;
    private bridge;
    resources: ResourceManager;
    constructor(options?: AppOptions, testMode?: boolean);
    getContext(): Context;
    getBridge(): BridgeConnection;
    window(options: WindowOptions, builder: (win: Window) => void): Window;
    vbox(builder: () => void): VBox;
    hbox(builder: () => void): HBox;
    button(text: string, onClick?: () => void, className?: string): Button;
    label(text: string, className?: string, alignment?: 'leading' | 'trailing' | 'center', wrapping?: 'off' | 'break' | 'word', textStyle?: {
        bold?: boolean;
        italic?: boolean;
        monospace?: boolean;
    }): Label;
    entry(placeholder?: string, onSubmit?: (text: string) => void, minWidth?: number, onDoubleClick?: () => void): Entry;
    multilineentry(placeholder?: string, wrapping?: 'off' | 'word' | 'break'): MultiLineEntry;
    passwordentry(placeholder?: string, onSubmit?: (text: string) => void): PasswordEntry;
    separator(): Separator;
    hyperlink(text: string, url: string): Hyperlink;
    checkbox(text: string, onChanged?: (checked: boolean) => void): Checkbox;
    select(options: string[], onSelected?: (selected: string) => void): Select;
    slider(min: number, max: number, initialValue?: number, onChanged?: (value: number) => void): Slider;
    progressbar(initialValue?: number, infinite?: boolean): ProgressBar;
    scroll(builder: () => void): Scroll;
    grid(columns: number, builder: () => void): Grid;
    radiogroup(options: string[], initialSelected?: string, onSelected?: (selected: string) => void): RadioGroup;
    hsplit(leadingBuilder: () => void, trailingBuilder: () => void, offset?: number): Split;
    vsplit(leadingBuilder: () => void, trailingBuilder: () => void, offset?: number): Split;
    tabs(tabDefinitions: Array<{
        title: string;
        builder: () => void;
    }>, location?: 'top' | 'bottom' | 'leading' | 'trailing'): Tabs;
    toolbar(toolbarItems: Array<ToolbarAction | {
        type: 'separator' | 'spacer';
    }>): Toolbar;
    toolbarAction(label: string, onAction?: () => void): ToolbarAction;
    table(headers: string[], data: string[][]): Table;
    list(items: string[], onSelected?: (index: number, item: string) => void): List;
    center(builder: () => void): Center;
    card(title: string, subtitle: string, builder: () => void): Card;
    accordion(items: Array<{
        title: string;
        builder: () => void;
    }>): Accordion;
    form(items: Array<{
        label: string;
        widget: any;
    }>, onSubmit?: () => void, onCancel?: () => void): Form;
    tree(rootLabel: string): Tree;
    richtext(segments: Array<{
        text: string;
        bold?: boolean;
        italic?: boolean;
        monospace?: boolean;
    }>): RichText;
    image(pathOrOptions: string | {
        path?: string;
        resource?: string;
        fillMode?: 'contain' | 'stretch' | 'original';
        onClick?: () => void;
        onDrag?: (x: number, y: number) => void;
        onDragEnd?: (x: number, y: number) => void;
    }, fillMode?: 'contain' | 'stretch' | 'original', onClick?: () => void, onDrag?: (x: number, y: number) => void, onDragEnd?: (x: number, y: number) => void): Image;
    border(config: {
        top?: () => void;
        bottom?: () => void;
        left?: () => void;
        right?: () => void;
        center?: () => void;
    }): Border;
    gridwrap(itemWidth: number, itemHeight: number, builder: () => void): GridWrap;
    run(): Promise<void>;
    quit(): void;
    setTheme(theme: 'dark' | 'light'): Promise<void>;
    getTheme(): Promise<'dark' | 'light'>;
    getWindows(): Window[];
}
