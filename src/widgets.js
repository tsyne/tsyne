"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GridWrap = exports.Border = exports.Image = exports.RichText = exports.Tree = exports.Form = exports.Accordion = exports.Card = exports.Center = exports.List = exports.Table = exports.Toolbar = exports.ToolbarAction = exports.Tabs = exports.Split = exports.RadioGroup = exports.Grid = exports.Scroll = exports.ProgressBar = exports.Slider = exports.Select = exports.Checkbox = exports.HBox = exports.VBox = exports.ModelBoundList = exports.Hyperlink = exports.Separator = exports.PasswordEntry = exports.MultiLineEntry = exports.Entry = exports.Label = exports.Button = exports.Widget = void 0;
const styles_1 = require("./styles");
/**
 * Base class for all widgets
 */
class Widget {
    constructor(ctx, id) {
        this.ctx = ctx;
        this.id = id;
    }
    /**
     * Apply styles from the global stylesheet to this widget
     */
    async applyStyles(widgetType) {
        await (0, styles_1.applyStyleForWidget)(this.ctx, this.id, widgetType);
    }
    /**
     * Set context menu for this widget (shown on right-click)
     */
    async setContextMenu(items) {
        const menuItems = items.map(item => {
            if (item.isSeparator) {
                return { isSeparator: true };
            }
            const callbackId = this.ctx.generateId('callback');
            this.ctx.bridge.registerEventHandler(callbackId, () => item.onSelected());
            return {
                label: item.label,
                callbackId,
                disabled: item.disabled,
                checked: item.checked
            };
        });
        await this.ctx.bridge.send('setWidgetContextMenu', {
            widgetId: this.id,
            items: menuItems
        });
    }
    async setText(text) {
        await this.ctx.bridge.send('setText', {
            widgetId: this.id,
            text
        });
    }
    async getText() {
        const result = await this.ctx.bridge.send('getText', {
            widgetId: this.id
        });
        return result.text;
    }
    async hide() {
        await this.ctx.bridge.send('hideWidget', {
            widgetId: this.id
        });
    }
    async show() {
        await this.ctx.bridge.send('showWidget', {
            widgetId: this.id
        });
    }
    /**
     * Register a custom ID for this widget (for test framework getByID)
     * @param customId Custom ID to register
     * @returns this for method chaining
     * @example
     * const statusLabel = a.label('').withId('statusLabel');
     * // In tests: ctx.getByID('statusLabel')
     */
    withId(customId) {
        this.ctx.bridge.send('registerCustomId', {
            widgetId: this.id,
            customId
        });
        return this;
    }
    /**
     * AngularJS-style ng-show directive for declarative visibility
     * @param conditionFn Function that returns whether widget should be visible
     * @returns this for method chaining
     */
    ngShow(conditionFn) {
        const updateVisibility = async () => {
            const shouldShow = conditionFn();
            if (shouldShow) {
                await this.show();
            }
            else {
                await this.hide();
            }
        };
        // Store for reactive re-evaluation
        this.visibilityCondition = updateVisibility;
        updateVisibility(); // Initial evaluation
        return this;
    }
    /**
     * Refresh the widget - re-evaluates visibility conditions
     */
    async refresh() {
        if (this.visibilityCondition) {
            await this.visibilityCondition();
        }
    }
}
exports.Widget = Widget;
/**
 * Button widget
 */
class Button extends Widget {
    constructor(ctx, text, onClick, className) {
        const id = ctx.generateId('button');
        super(ctx, id);
        const payload = { id, text };
        if (onClick) {
            const callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, () => {
                onClick();
            });
        }
        ctx.bridge.send('createButton', payload);
        ctx.addToCurrentContainer(id);
        if (className) {
            this.applyStyles(className).catch(() => { });
        }
        else {
            this.applyStyles('button').catch(() => { });
        }
    }
    async disable() {
        await this.ctx.bridge.send('disableWidget', {
            widgetId: this.id
        });
    }
    async enable() {
        await this.ctx.bridge.send('enableWidget', {
            widgetId: this.id
        });
    }
    async isEnabled() {
        const result = await this.ctx.bridge.send('isEnabled', {
            widgetId: this.id
        });
        return result.enabled;
    }
}
exports.Button = Button;
/**
 * Label widget
 */
class Label extends Widget {
    constructor(ctx, text, className, alignment, wrapping, textStyle) {
        const id = ctx.generateId('label');
        super(ctx, id);
        const payload = { id, text };
        if (alignment) {
            payload.alignment = alignment;
        }
        if (wrapping) {
            payload.wrapping = wrapping;
        }
        if (textStyle) {
            payload.textStyle = textStyle;
        }
        ctx.bridge.send('createLabel', payload);
        ctx.addToCurrentContainer(id);
        // Apply styles from stylesheet (non-blocking) - try class names first, then fall back to 'label'
        if (className) {
            this.applyStyles(className).catch(() => { });
        }
        else {
            this.applyStyles('label').catch(() => { });
        }
    }
}
exports.Label = Label;
/**
 * Entry (text input) widget
 */
class Entry extends Widget {
    constructor(ctx, placeholder, onSubmit, minWidth, onDoubleClick) {
        const id = ctx.generateId('entry');
        super(ctx, id);
        const payload = { id, placeholder: placeholder || '' };
        if (onSubmit) {
            const callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, (data) => {
                onSubmit(data.text);
            });
        }
        if (onDoubleClick) {
            const doubleClickCallbackId = ctx.generateId('callback');
            payload.doubleClickCallbackId = doubleClickCallbackId;
            ctx.bridge.registerEventHandler(doubleClickCallbackId, () => {
                onDoubleClick();
            });
        }
        if (minWidth !== undefined) {
            payload.minWidth = minWidth;
        }
        ctx.bridge.send('createEntry', payload);
        ctx.addToCurrentContainer(id);
        // Apply styles from stylesheet (non-blocking)
        this.applyStyles('entry').catch(() => { });
    }
    async disable() {
        await this.ctx.bridge.send('disableWidget', {
            widgetId: this.id
        });
    }
    async enable() {
        await this.ctx.bridge.send('enableWidget', {
            widgetId: this.id
        });
    }
    async focus() {
        await this.ctx.bridge.send('focusWidget', {
            widgetId: this.id
        });
    }
    async submit() {
        await this.ctx.bridge.send('submitEntry', {
            widgetId: this.id
        });
    }
}
exports.Entry = Entry;
/**
 * Multi-line text entry widget
 */
class MultiLineEntry extends Widget {
    constructor(ctx, placeholder, wrapping) {
        const id = ctx.generateId('multilineentry');
        super(ctx, id);
        const payload = { id, placeholder: placeholder || '' };
        if (wrapping) {
            payload.wrapping = wrapping;
        }
        ctx.bridge.send('createMultiLineEntry', payload);
        ctx.addToCurrentContainer(id);
        // Apply styles from stylesheet (non-blocking)
        this.applyStyles('multilineentry').catch(() => { });
    }
}
exports.MultiLineEntry = MultiLineEntry;
/**
 * Password entry widget (text is masked)
 */
class PasswordEntry extends Widget {
    constructor(ctx, placeholder, onSubmit) {
        const id = ctx.generateId('passwordentry');
        super(ctx, id);
        const payload = { id, placeholder: placeholder || '' };
        if (onSubmit) {
            const callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, (data) => {
                onSubmit(data.text);
            });
        }
        ctx.bridge.send('createPasswordEntry', payload);
        ctx.addToCurrentContainer(id);
        // Apply styles from stylesheet (non-blocking)
        this.applyStyles('passwordentry').catch(() => { });
    }
}
exports.PasswordEntry = PasswordEntry;
/**
 * Separator widget (horizontal or vertical line)
 */
class Separator {
    constructor(ctx) {
        this.ctx = ctx;
        this.id = ctx.generateId('separator');
        ctx.bridge.send('createSeparator', { id: this.id });
        ctx.addToCurrentContainer(this.id);
    }
}
exports.Separator = Separator;
/**
 * Hyperlink widget (clickable URL)
 */
class Hyperlink {
    constructor(ctx, text, url) {
        this.ctx = ctx;
        this.id = ctx.generateId('hyperlink');
        ctx.bridge.send('createHyperlink', { id: this.id, text, url });
        ctx.addToCurrentContainer(this.id);
    }
}
exports.Hyperlink = Hyperlink;
/**
 * ModelBoundList - Smart list binding for containers (inspired by AngularJS ng-repeat)
 * Efficiently manages a list of items with intelligent diffing to avoid full rebuilds
 */
class ModelBoundList {
    constructor(ctx, container, items) {
        this.keyFn = (item) => item;
        this.trackedItems = new Map();
        this.ctx = ctx;
        this.container = container;
        this.items = items;
    }
    /**
     * Track items by key (like ng-repeat track by)
     * @param fn Function to extract unique key from item
     */
    trackBy(fn) {
        this.keyFn = fn;
        return this;
    }
    /**
     * Builder function for each item (called once per item)
     * @param builder Function that creates the view for an item
     */
    each(builder) {
        this.builderFn = builder;
        // Initial render - create views for all items
        for (const item of this.items) {
            const key = this.keyFn(item);
            const widget = this.createItemView(item);
            this.trackedItems.set(key, widget);
        }
    }
    /**
     * Update the model - performs smart diff and only updates changed items
     * @param newItems New list of items
     */
    update(newItems) {
        if (!this.builderFn) {
            throw new Error('Must call each() before update()');
        }
        const newKeys = new Set(newItems.map(item => this.keyFn(item)));
        const oldKeys = new Set(this.trackedItems.keys());
        // Find items to remove (in old but not in new)
        const toRemove = Array.from(oldKeys).filter(key => !newKeys.has(key));
        // Find items to add (in new but not in old)
        const toAdd = newItems.filter(item => !oldKeys.has(this.keyFn(item)));
        // If there are changes, rebuild the list
        // Future optimization: only add/remove changed items instead of full rebuild
        if (toRemove.length > 0 || toAdd.length > 0) {
            this.trackedItems.clear();
            this.container.removeAll();
            for (const item of newItems) {
                const key = this.keyFn(item);
                const widget = this.createItemView(item);
                this.trackedItems.set(key, widget);
            }
            this.container.refresh();
        }
        this.items = newItems;
    }
    /**
     * Refresh visibility of all items (re-evaluates ngShow conditions)
     */
    async refreshVisibility() {
        for (const widget of this.trackedItems.values()) {
            if (widget && widget.refreshVisibility) {
                await widget.refreshVisibility();
            }
        }
    }
    createItemView(item) {
        let widget;
        this.container.add(() => {
            widget = this.builderFn(item);
        });
        return widget;
    }
}
exports.ModelBoundList = ModelBoundList;
/**
 * VBox container (vertical box layout)
 */
class VBox {
    constructor(ctx, builder) {
        this.ctx = ctx;
        this.id = ctx.generateId('vbox');
        // Push a new container context
        ctx.pushContainer();
        // Execute the builder function to collect children
        builder();
        // Pop the container and get the children
        const children = ctx.popContainer();
        // Create the VBox with the children
        ctx.bridge.send('createVBox', { id: this.id, children });
        ctx.addToCurrentContainer(this.id);
    }
    /**
     * Dynamically add a widget to this container (Fyne container.Add)
     * @param builder Function that creates the widget to add
     */
    add(builder) {
        // Push this container as the current context
        this.ctx.pushContainer();
        // Execute builder to create the widget
        builder();
        // Get the widget IDs that were just created
        const newChildren = this.ctx.popContainer();
        // Send add command to bridge for each child
        for (const childId of newChildren) {
            this.ctx.bridge.send('containerAdd', {
                containerId: this.id,
                childId
            });
        }
    }
    /**
     * Remove all widgets from this container (Fyne container.Objects = nil)
     */
    removeAll() {
        this.ctx.bridge.send('containerRemoveAll', {
            containerId: this.id
        });
    }
    /**
     * Refresh the container display (Fyne container.Refresh)
     */
    refresh() {
        this.ctx.bridge.send('containerRefresh', {
            containerId: this.id
        });
    }
    /**
     * Create a model-bound list for smart list rendering (AngularJS ng-repeat style)
     * @param items Initial array of items
     * @returns ModelBoundList instance for chaining trackBy() and each()
     */
    model(items) {
        return new ModelBoundList(this.ctx, this, items);
    }
    async hide() {
        await this.ctx.bridge.send('hideWidget', {
            widgetId: this.id
        });
    }
    async show() {
        await this.ctx.bridge.send('showWidget', {
            widgetId: this.id
        });
    }
    /**
     * AngularJS-style ng-show directive for declarative visibility
     * @param conditionFn Function that returns whether container should be visible
     * @returns this for method chaining
     */
    ngShow(conditionFn) {
        const updateVisibility = async () => {
            const shouldShow = conditionFn();
            if (shouldShow) {
                await this.show();
            }
            else {
                await this.hide();
            }
        };
        // Store for reactive re-evaluation
        this.visibilityCondition = updateVisibility;
        updateVisibility(); // Initial evaluation
        return this;
    }
    /**
     * Refresh the container - re-evaluates visibility conditions
     */
    async refreshVisibility() {
        if (this.visibilityCondition) {
            await this.visibilityCondition();
        }
    }
}
exports.VBox = VBox;
/**
 * HBox container (horizontal box layout)
 */
class HBox {
    constructor(ctx, builder) {
        this.ctx = ctx;
        this.id = ctx.generateId('hbox');
        // Push a new container context
        ctx.pushContainer();
        // Execute the builder function to collect children
        builder();
        // Pop the container and get the children
        const children = ctx.popContainer();
        // Create the HBox with the children
        ctx.bridge.send('createHBox', { id: this.id, children });
        ctx.addToCurrentContainer(this.id);
    }
    /**
     * Dynamically add a widget to this container (Fyne container.Add)
     * @param builder Function that creates the widget to add
     */
    add(builder) {
        // Push this container as the current context
        this.ctx.pushContainer();
        // Execute builder to create the widget
        builder();
        // Get the widget IDs that were just created
        const newChildren = this.ctx.popContainer();
        // Send add command to bridge for each child
        for (const childId of newChildren) {
            this.ctx.bridge.send('containerAdd', {
                containerId: this.id,
                childId
            });
        }
    }
    /**
     * Remove all widgets from this container (Fyne container.Objects = nil)
     */
    removeAll() {
        this.ctx.bridge.send('containerRemoveAll', {
            containerId: this.id
        });
    }
    /**
     * Refresh the container display (Fyne container.Refresh)
     */
    refresh() {
        this.ctx.bridge.send('containerRefresh', {
            containerId: this.id
        });
    }
    async hide() {
        await this.ctx.bridge.send('hideWidget', {
            widgetId: this.id
        });
    }
    async show() {
        await this.ctx.bridge.send('showWidget', {
            widgetId: this.id
        });
    }
    /**
     * AngularJS-style ng-show directive for declarative visibility
     * @param conditionFn Function that returns whether container should be visible
     * @returns this for method chaining
     */
    ngShow(conditionFn) {
        const updateVisibility = async () => {
            const shouldShow = conditionFn();
            if (shouldShow) {
                await this.show();
            }
            else {
                await this.hide();
            }
        };
        // Store for reactive re-evaluation
        this.visibilityCondition = updateVisibility;
        updateVisibility(); // Initial evaluation
        return this;
    }
    /**
     * Refresh the container - re-evaluates visibility conditions
     */
    async refreshVisibility() {
        if (this.visibilityCondition) {
            await this.visibilityCondition();
        }
    }
}
exports.HBox = HBox;
/**
 * Checkbox widget
 */
class Checkbox extends Widget {
    constructor(ctx, text, onChanged) {
        const id = ctx.generateId('checkbox');
        super(ctx, id);
        const payload = { id, text };
        if (onChanged) {
            const callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, (data) => {
                onChanged(data.checked);
            });
        }
        ctx.bridge.send('createCheckbox', payload);
        ctx.addToCurrentContainer(id);
    }
    async setChecked(checked) {
        await this.ctx.bridge.send('setChecked', {
            widgetId: this.id,
            checked
        });
    }
    async getChecked() {
        const result = await this.ctx.bridge.send('getChecked', {
            widgetId: this.id
        });
        return result.checked;
    }
}
exports.Checkbox = Checkbox;
/**
 * Select (dropdown) widget
 */
class Select extends Widget {
    constructor(ctx, options, onSelected) {
        const id = ctx.generateId('select');
        super(ctx, id);
        const payload = { id, options };
        if (onSelected) {
            const callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, (data) => {
                onSelected(data.selected);
            });
        }
        ctx.bridge.send('createSelect', payload);
        ctx.addToCurrentContainer(id);
    }
    async setSelected(selected) {
        await this.ctx.bridge.send('setSelected', {
            widgetId: this.id,
            selected
        });
    }
    async getSelected() {
        const result = await this.ctx.bridge.send('getSelected', {
            widgetId: this.id
        });
        return result.selected;
    }
}
exports.Select = Select;
/**
 * Slider widget
 */
class Slider extends Widget {
    constructor(ctx, min, max, initialValue, onChanged) {
        const id = ctx.generateId('slider');
        super(ctx, id);
        const payload = { id, min, max };
        if (initialValue !== undefined) {
            payload.value = initialValue;
        }
        if (onChanged) {
            const callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, (data) => {
                onChanged(data.value);
            });
        }
        ctx.bridge.send('createSlider', payload);
        ctx.addToCurrentContainer(id);
    }
    async setValue(value) {
        await this.ctx.bridge.send('setValue', {
            widgetId: this.id,
            value
        });
    }
    async getValue() {
        const result = await this.ctx.bridge.send('getValue', {
            widgetId: this.id
        });
        return result.value;
    }
}
exports.Slider = Slider;
/**
 * ProgressBar widget
 */
class ProgressBar extends Widget {
    constructor(ctx, initialValue, infinite) {
        const id = ctx.generateId('progressbar');
        super(ctx, id);
        const payload = { id, infinite: infinite || false };
        if (!infinite && initialValue !== undefined) {
            payload.value = initialValue;
        }
        ctx.bridge.send('createProgressBar', payload);
        ctx.addToCurrentContainer(id);
    }
    async setProgress(value) {
        await this.ctx.bridge.send('setProgress', {
            widgetId: this.id,
            value
        });
    }
    async getProgress() {
        const result = await this.ctx.bridge.send('getProgress', {
            widgetId: this.id
        });
        return result.value;
    }
    // Aliases to match Slider API naming convention
    async setValue(value) {
        await this.setProgress(value);
    }
    async getValue() {
        return await this.getProgress();
    }
}
exports.ProgressBar = ProgressBar;
/**
 * Scroll container
 */
class Scroll {
    constructor(ctx, builder) {
        this.ctx = ctx;
        this.id = ctx.generateId('scroll');
        // Push a new container context
        ctx.pushContainer();
        // Execute the builder function to collect content
        builder();
        // Pop the container and get the single child (content)
        const children = ctx.popContainer();
        if (children.length !== 1) {
            throw new Error('Scroll container must have exactly one child');
        }
        const contentId = children[0];
        // Create the Scroll with the content
        ctx.bridge.send('createScroll', { id: this.id, contentId });
        ctx.addToCurrentContainer(this.id);
    }
}
exports.Scroll = Scroll;
/**
 * Grid layout container
 */
class Grid {
    constructor(ctx, columns, builder) {
        this.ctx = ctx;
        this.id = ctx.generateId('grid');
        // Push a new container context
        ctx.pushContainer();
        // Execute the builder function to collect children
        builder();
        // Pop the container and get the children
        const children = ctx.popContainer();
        // Create the Grid with the children
        ctx.bridge.send('createGrid', { id: this.id, columns, children });
        ctx.addToCurrentContainer(this.id);
    }
}
exports.Grid = Grid;
/**
 * RadioGroup widget
 */
class RadioGroup extends Widget {
    constructor(ctx, options, initialSelected, onSelected) {
        const id = ctx.generateId('radiogroup');
        super(ctx, id);
        const payload = { id, options };
        if (initialSelected !== undefined) {
            payload.selected = initialSelected;
        }
        if (onSelected) {
            const callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, (data) => {
                onSelected(data.selected);
            });
        }
        ctx.bridge.send('createRadioGroup', payload);
        ctx.addToCurrentContainer(id);
    }
    async setSelected(selected) {
        await this.ctx.bridge.send('setRadioSelected', {
            widgetId: this.id,
            selected
        });
    }
    async getSelected() {
        const result = await this.ctx.bridge.send('getRadioSelected', {
            widgetId: this.id
        });
        return result.selected;
    }
}
exports.RadioGroup = RadioGroup;
/**
 * Split container (horizontal or vertical)
 */
class Split {
    constructor(ctx, orientation, leadingBuilder, trailingBuilder, offset) {
        this.ctx = ctx;
        this.id = ctx.generateId('split');
        // Build leading content
        ctx.pushContainer();
        leadingBuilder();
        const leadingChildren = ctx.popContainer();
        if (leadingChildren.length !== 1) {
            throw new Error('Split leading section must have exactly one child');
        }
        const leadingId = leadingChildren[0];
        // Build trailing content
        ctx.pushContainer();
        trailingBuilder();
        const trailingChildren = ctx.popContainer();
        if (trailingChildren.length !== 1) {
            throw new Error('Split trailing section must have exactly one child');
        }
        const trailingId = trailingChildren[0];
        // Create the split container
        const payload = {
            id: this.id,
            orientation,
            leadingId,
            trailingId
        };
        if (offset !== undefined) {
            payload.offset = offset;
        }
        ctx.bridge.send('createSplit', payload);
        ctx.addToCurrentContainer(this.id);
    }
}
exports.Split = Split;
/**
 * Tabs container (AppTabs)
 */
class Tabs {
    constructor(ctx, tabDefinitions, location) {
        this.ctx = ctx;
        this.id = ctx.generateId('tabs');
        // Build each tab's content
        const tabs = [];
        for (const tabDef of tabDefinitions) {
            ctx.pushContainer();
            tabDef.builder();
            const children = ctx.popContainer();
            if (children.length !== 1) {
                throw new Error(`Tab "${tabDef.title}" must have exactly one child widget`);
            }
            tabs.push({
                title: tabDef.title,
                contentId: children[0]
            });
        }
        // Create the tabs container
        const payload = {
            id: this.id,
            tabs
        };
        if (location) {
            payload.location = location;
        }
        ctx.bridge.send('createTabs', payload);
        ctx.addToCurrentContainer(this.id);
    }
}
exports.Tabs = Tabs;
/**
 * Represents a clickable action item in a Toolbar
 */
class ToolbarAction {
    constructor(label, onAction) {
        this.label = label;
        this.onAction = onAction;
    }
    /**
     * Assign a unique ID to this toolbar action for testing
     * @param id Custom ID for the action
     * @returns this for method chaining
     */
    withId(id) {
        this._id = id;
        return this;
    }
    get id() {
        return this._id;
    }
}
exports.ToolbarAction = ToolbarAction;
/**
 * Toolbar widget
 */
class Toolbar {
    constructor(ctx, toolbarItems) {
        this.ctx = ctx;
        this.id = ctx.generateId('toolbar');
        const items = toolbarItems.map(item => {
            if ('type' in item) { // Separator or Spacer
                return { type: item.type };
            }
            // Action item
            const action = item;
            const callbackId = ctx.generateId('callback');
            if (action.onAction) {
                ctx.bridge.registerEventHandler(callbackId, (_data) => {
                    action.onAction();
                });
            }
            return {
                type: 'action',
                label: action.label,
                callbackId,
                customId: action.id, // Pass custom ID to the bridge
            };
        });
        ctx.bridge.send('createToolbar', {
            id: this.id,
            items
        });
        ctx.addToCurrentContainer(this.id);
    }
}
exports.Toolbar = Toolbar;
/**
 * Table widget
 */
class Table {
    constructor(ctx, headers, data) {
        this.ctx = ctx;
        this.id = ctx.generateId('table');
        ctx.bridge.send('createTable', {
            id: this.id,
            headers,
            data
        });
        ctx.addToCurrentContainer(this.id);
    }
    async updateData(data) {
        await this.ctx.bridge.send('updateTableData', {
            id: this.id,
            data
        });
    }
}
exports.Table = Table;
/**
 * List widget
 */
class List {
    constructor(ctx, items, onSelected) {
        this.ctx = ctx;
        this.id = ctx.generateId('list');
        const payload = {
            id: this.id,
            items
        };
        if (onSelected) {
            const callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, (data) => {
                onSelected(data.index, data.item);
            });
        }
        ctx.bridge.send('createList', payload);
        ctx.addToCurrentContainer(this.id);
    }
    async updateItems(items) {
        await this.ctx.bridge.send('updateListData', {
            id: this.id,
            items
        });
    }
}
exports.List = List;
/**
 * Center layout - centers content in the available space
 */
class Center {
    constructor(ctx, builder) {
        this.ctx = ctx;
        this.id = ctx.generateId('center');
        // Build child content
        ctx.pushContainer();
        builder();
        const children = ctx.popContainer();
        if (children.length !== 1) {
            throw new Error('Center must have exactly one child');
        }
        ctx.bridge.send('createCenter', {
            id: this.id,
            childId: children[0]
        });
        ctx.addToCurrentContainer(this.id);
    }
}
exports.Center = Center;
/**
 * Card container with title, subtitle, and content
 */
class Card {
    constructor(ctx, title, subtitle, builder) {
        this.ctx = ctx;
        this.id = ctx.generateId('card');
        // Build card content
        ctx.pushContainer();
        builder();
        const children = ctx.popContainer();
        if (children.length !== 1) {
            throw new Error('Card must have exactly one child');
        }
        ctx.bridge.send('createCard', {
            id: this.id,
            title,
            subtitle,
            contentId: children[0]
        });
        ctx.addToCurrentContainer(this.id);
    }
}
exports.Card = Card;
/**
 * Accordion - collapsible sections
 */
class Accordion {
    constructor(ctx, items) {
        this.ctx = ctx;
        this.id = ctx.generateId('accordion');
        // Build each accordion item's content
        const accordionItems = [];
        for (const item of items) {
            ctx.pushContainer();
            item.builder();
            const children = ctx.popContainer();
            if (children.length !== 1) {
                throw new Error(`Accordion item "${item.title}" must have exactly one child`);
            }
            accordionItems.push({
                title: item.title,
                contentId: children[0]
            });
        }
        ctx.bridge.send('createAccordion', {
            id: this.id,
            items: accordionItems
        });
        ctx.addToCurrentContainer(this.id);
    }
}
exports.Accordion = Accordion;
/**
 * Form widget with labeled fields and submit/cancel buttons
 */
class Form {
    constructor(ctx, items, onSubmit, onCancel) {
        this.ctx = ctx;
        this.id = ctx.generateId('form');
        const formItems = items.map(item => ({
            label: item.label,
            widgetId: item.widget.id
        }));
        const payload = {
            id: this.id,
            items: formItems
        };
        if (onSubmit) {
            const submitCallbackId = ctx.generateId('callback');
            payload.submitCallbackId = submitCallbackId;
            ctx.bridge.registerEventHandler(submitCallbackId, (_data) => {
                onSubmit();
            });
        }
        if (onCancel) {
            const cancelCallbackId = ctx.generateId('callback');
            payload.cancelCallbackId = cancelCallbackId;
            ctx.bridge.registerEventHandler(cancelCallbackId, (_data) => {
                onCancel();
            });
        }
        ctx.bridge.send('createForm', payload);
        ctx.addToCurrentContainer(this.id);
    }
}
exports.Form = Form;
/**
 * Tree widget for hierarchical data
 */
class Tree {
    constructor(ctx, rootLabel) {
        this.ctx = ctx;
        this.id = ctx.generateId('tree');
        ctx.bridge.send('createTree', {
            id: this.id,
            rootLabel
        });
        ctx.addToCurrentContainer(this.id);
    }
}
exports.Tree = Tree;
/**
 * RichText widget for formatted text
 */
class RichText {
    constructor(ctx, segments) {
        this.ctx = ctx;
        this.id = ctx.generateId('richtext');
        ctx.bridge.send('createRichText', {
            id: this.id,
            segments
        });
        ctx.addToCurrentContainer(this.id);
    }
}
exports.RichText = RichText;
/**
 * Image widget for displaying images
 */
class Image {
    constructor(ctx, pathOrOptions, fillMode, onClick, onDrag, onDragEnd) {
        this.ctx = ctx;
        this.id = ctx.generateId('image');
        const payload = {
            id: this.id
        };
        // Support both string path (legacy) and options object (new)
        if (typeof pathOrOptions === 'string') {
            // Legacy: path as first parameter
            const resolvedPath = ctx.resolveResourcePath(pathOrOptions);
            payload.path = resolvedPath;
            if (fillMode) {
                payload.fillMode = fillMode;
            }
        }
        else {
            // New: options object
            const options = pathOrOptions;
            if (options.resource) {
                payload.resource = options.resource;
            }
            else if (options.path) {
                const resolvedPath = ctx.resolveResourcePath(options.path);
                payload.path = resolvedPath;
            }
            if (options.fillMode) {
                payload.fillMode = options.fillMode;
            }
            // Override with options if provided
            onClick = options.onClick || onClick;
            onDrag = options.onDrag || onDrag;
            onDragEnd = options.onDragEnd || onDragEnd;
        }
        if (onClick) {
            const callbackId = ctx.generateId('callback');
            payload.callbackId = callbackId;
            ctx.bridge.registerEventHandler(callbackId, () => {
                onClick();
            });
        }
        if (onDrag) {
            const dragCallbackId = ctx.generateId('callback');
            payload.onDragCallbackId = dragCallbackId;
            ctx.bridge.registerEventHandler(dragCallbackId, (data) => {
                onDrag(data.x, data.y);
            });
        }
        if (onDragEnd) {
            const dragEndCallbackId = ctx.generateId('callback');
            payload.onDragEndCallbackId = dragEndCallbackId;
            ctx.bridge.registerEventHandler(dragEndCallbackId, (data) => {
                onDragEnd(data.x, data.y);
            });
        }
        ctx.bridge.send('createImage', payload);
        ctx.addToCurrentContainer(this.id);
    }
    /**
     * Updates the image widget with new image data
     * @param imageData - Base64-encoded image data (with or without data URL prefix)
     */
    async updateImage(imageData) {
        await this.ctx.bridge.send('updateImage', {
            widgetId: this.id,
            imageData: imageData
        });
    }
    /**
     * Register a custom ID for this image widget (for test framework getByID)
     * @param customId Custom ID to register
     * @returns this for method chaining
     * @example
     * const cardImage = a.image('card.png').withId('draw3-card');
     * // In tests: ctx.getByID('draw3-card').click()
     */
    withId(customId) {
        this.ctx.bridge.send('registerCustomId', {
            widgetId: this.id,
            customId
        });
        return this;
    }
}
exports.Image = Image;
/**
 * Border layout - positions widgets at edges and center
 */
class Border {
    constructor(ctx, config) {
        this.ctx = ctx;
        this.id = ctx.generateId('border');
        const payload = { id: this.id };
        // Build each optional section
        if (config.top) {
            ctx.pushContainer();
            config.top();
            const children = ctx.popContainer();
            if (children.length === 1) {
                payload.topId = children[0];
            }
        }
        if (config.bottom) {
            ctx.pushContainer();
            config.bottom();
            const children = ctx.popContainer();
            if (children.length === 1) {
                payload.bottomId = children[0];
            }
        }
        if (config.left) {
            ctx.pushContainer();
            config.left();
            const children = ctx.popContainer();
            if (children.length === 1) {
                payload.leftId = children[0];
            }
        }
        if (config.right) {
            ctx.pushContainer();
            config.right();
            const children = ctx.popContainer();
            if (children.length === 1) {
                payload.rightId = children[0];
            }
        }
        if (config.center) {
            ctx.pushContainer();
            config.center();
            const children = ctx.popContainer();
            if (children.length === 1) {
                payload.centerId = children[0];
            }
        }
        ctx.bridge.send('createBorder', payload);
        ctx.addToCurrentContainer(this.id);
    }
}
exports.Border = Border;
/**
 * GridWrap layout - wrapping grid with fixed item sizes
 */
class GridWrap {
    constructor(ctx, itemWidth, itemHeight, builder) {
        this.ctx = ctx;
        this.id = ctx.generateId('gridwrap');
        // Build children
        ctx.pushContainer();
        builder();
        const children = ctx.popContainer();
        ctx.bridge.send('createGridWrap', {
            id: this.id,
            itemWidth,
            itemHeight,
            children
        });
        ctx.addToCurrentContainer(this.id);
    }
}
exports.GridWrap = GridWrap;
