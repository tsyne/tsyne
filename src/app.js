"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const fynebridge_1 = require("./fynebridge");
const context_1 = require("./context");
const window_1 = require("./window");
const widgets_1 = require("./widgets");
const globals_1 = require("./globals");
const resources_1 = require("./resources");
/**
 * App is the main application class
 */
class App {
    constructor(options, testMode = false) {
        this.windows = [];
        // Initialize browser compatibility globals
        (0, globals_1.initializeGlobals)();
        this.bridge = new fynebridge_1.BridgeConnection(testMode);
        this.ctx = new context_1.Context(this.bridge);
        this.resources = new resources_1.ResourceManager(this.bridge);
    }
    getContext() {
        return this.ctx;
    }
    getBridge() {
        return this.bridge;
    }
    window(options, builder) {
        const win = new window_1.Window(this.ctx, options, builder);
        this.windows.push(win);
        return win;
    }
    // Scoped declarative API methods - these use the app's context (proper IoC/DI)
    vbox(builder) {
        return new widgets_1.VBox(this.ctx, builder);
    }
    hbox(builder) {
        return new widgets_1.HBox(this.ctx, builder);
    }
    button(text, onClick, className) {
        return new widgets_1.Button(this.ctx, text, onClick, className);
    }
    label(text, className, alignment, wrapping, textStyle) {
        return new widgets_1.Label(this.ctx, text, className, alignment, wrapping, textStyle);
    }
    entry(placeholder, onSubmit, minWidth, onDoubleClick) {
        return new widgets_1.Entry(this.ctx, placeholder, onSubmit, minWidth, onDoubleClick);
    }
    multilineentry(placeholder, wrapping) {
        return new widgets_1.MultiLineEntry(this.ctx, placeholder, wrapping);
    }
    passwordentry(placeholder, onSubmit) {
        return new widgets_1.PasswordEntry(this.ctx, placeholder, onSubmit);
    }
    separator() {
        return new widgets_1.Separator(this.ctx);
    }
    hyperlink(text, url) {
        return new widgets_1.Hyperlink(this.ctx, text, url);
    }
    checkbox(text, onChanged) {
        return new widgets_1.Checkbox(this.ctx, text, onChanged);
    }
    select(options, onSelected) {
        return new widgets_1.Select(this.ctx, options, onSelected);
    }
    slider(min, max, initialValue, onChanged) {
        return new widgets_1.Slider(this.ctx, min, max, initialValue, onChanged);
    }
    progressbar(initialValue, infinite) {
        return new widgets_1.ProgressBar(this.ctx, initialValue, infinite);
    }
    scroll(builder) {
        return new widgets_1.Scroll(this.ctx, builder);
    }
    grid(columns, builder) {
        return new widgets_1.Grid(this.ctx, columns, builder);
    }
    radiogroup(options, initialSelected, onSelected) {
        return new widgets_1.RadioGroup(this.ctx, options, initialSelected, onSelected);
    }
    hsplit(leadingBuilder, trailingBuilder, offset) {
        return new widgets_1.Split(this.ctx, 'horizontal', leadingBuilder, trailingBuilder, offset);
    }
    vsplit(leadingBuilder, trailingBuilder, offset) {
        return new widgets_1.Split(this.ctx, 'vertical', leadingBuilder, trailingBuilder, offset);
    }
    tabs(tabDefinitions, location) {
        return new widgets_1.Tabs(this.ctx, tabDefinitions, location);
    }
    toolbar(toolbarItems) {
        return new widgets_1.Toolbar(this.ctx, toolbarItems);
    }
    toolbarAction(label, onAction) {
        return new widgets_1.ToolbarAction(label, onAction);
    }
    table(headers, data) {
        return new widgets_1.Table(this.ctx, headers, data);
    }
    list(items, onSelected) {
        return new widgets_1.List(this.ctx, items, onSelected);
    }
    center(builder) {
        return new widgets_1.Center(this.ctx, builder);
    }
    card(title, subtitle, builder) {
        return new widgets_1.Card(this.ctx, title, subtitle, builder);
    }
    accordion(items) {
        return new widgets_1.Accordion(this.ctx, items);
    }
    form(items, onSubmit, onCancel) {
        return new widgets_1.Form(this.ctx, items, onSubmit, onCancel);
    }
    tree(rootLabel) {
        return new widgets_1.Tree(this.ctx, rootLabel);
    }
    richtext(segments) {
        return new widgets_1.RichText(this.ctx, segments);
    }
    image(pathOrOptions, fillMode, onClick, onDrag, onDragEnd) {
        return new widgets_1.Image(this.ctx, pathOrOptions, fillMode, onClick, onDrag, onDragEnd);
    }
    border(config) {
        return new widgets_1.Border(this.ctx, config);
    }
    gridwrap(itemWidth, itemHeight, builder) {
        return new widgets_1.GridWrap(this.ctx, itemWidth, itemHeight, builder);
    }
    async run() {
        // Show all windows
        for (const win of this.windows) {
            await win.show();
        }
    }
    quit() {
        this.ctx.bridge.quit();
    }
    async setTheme(theme) {
        await this.ctx.bridge.send('setTheme', { theme });
    }
    async getTheme() {
        const result = await this.ctx.bridge.send('getTheme', {});
        return result.theme;
    }
    getWindows() {
        return this.windows;
    }
}
exports.App = App;
