"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Window = void 0;
const globals_1 = require("./globals");
/**
 * Window represents a Fyne window
 */
class Window {
    constructor(ctx, options, builder) {
        this.contentSent = false; // Track if content has been sent to bridge
        this.ctx = ctx;
        this.id = ctx.generateId('window');
        const payload = {
            id: this.id,
            title: options.title
        };
        if (options.width !== undefined) {
            payload.width = options.width;
        }
        if (options.height !== undefined) {
            payload.height = options.height;
        }
        if (options.fixedSize !== undefined) {
            payload.fixedSize = options.fixedSize;
        }
        ctx.bridge.send('createWindow', payload);
        // Register dialog handlers for browser compatibility globals
        (0, globals_1.registerDialogHandlers)({
            alert: (message) => {
                this.showInfo('Alert', message);
            },
            confirm: async (message) => {
                return await this.showConfirm('Confirm', message);
            },
            prompt: async (message, defaultValue) => {
                // For now, we don't have a prompt dialog in Fyne, so we return null
                // This can be implemented later with a custom dialog
                console.log('[PROMPT]', message, defaultValue);
                return null;
            }
        });
        if (builder) {
            ctx.pushWindow(this.id);
            ctx.pushContainer();
            builder(this);
            const children = ctx.popContainer();
            if (children.length > 0) {
                // Use the first (and should be only) child as content
                this.contentId = children[0];
            }
            ctx.popWindow();
        }
    }
    async show() {
        // Only send setContent if we haven't already sent it
        if (this.contentId && !this.contentSent) {
            await this.ctx.bridge.send('setContent', {
                windowId: this.id,
                widgetId: this.contentId
            });
            this.contentSent = true;
        }
        await this.ctx.bridge.send('showWindow', {
            windowId: this.id
        });
    }
    async setContent(builder) {
        // Mark as sent immediately (synchronously) to prevent duplicate calls
        this.contentSent = true;
        this.ctx.pushWindow(this.id);
        this.ctx.pushContainer();
        builder();
        const children = this.ctx.popContainer();
        if (children.length > 0) {
            this.contentId = children[0];
        }
        this.ctx.popWindow();
        // Actually send the new content to the window
        if (this.contentId) {
            await this.ctx.bridge.send('setContent', {
                windowId: this.id,
                widgetId: this.contentId
            });
        }
    }
    /**
     * Shows an information dialog with a title and message
     */
    async showInfo(title, message) {
        await this.ctx.bridge.send('showInfo', {
            windowId: this.id,
            title,
            message
        });
    }
    /**
     * Shows an error dialog with a title and message
     */
    async showError(title, message) {
        await this.ctx.bridge.send('showError', {
            windowId: this.id,
            title,
            message
        });
    }
    /**
     * Shows a confirmation dialog and returns the user's response
     * @returns Promise<boolean> - true if user confirmed, false if cancelled
     */
    async showConfirm(title, message) {
        return new Promise((resolve) => {
            const callbackId = this.ctx.generateId('callback');
            this.ctx.bridge.registerEventHandler(callbackId, (data) => {
                resolve(data.confirmed);
            });
            this.ctx.bridge.send('showConfirm', {
                windowId: this.id,
                title,
                message,
                callbackId
            });
        });
    }
    /**
     * Shows a file open dialog and returns the selected file path
     * @returns Promise<string | null> - file path if selected, null if cancelled
     */
    async showFileOpen() {
        return new Promise((resolve) => {
            const callbackId = this.ctx.generateId('callback');
            this.ctx.bridge.registerEventHandler(callbackId, (data) => {
                if (data.error || !data.filePath) {
                    resolve(null);
                }
                else {
                    resolve(data.filePath);
                }
            });
            this.ctx.bridge.send('showFileOpen', {
                windowId: this.id,
                callbackId
            });
        });
    }
    /**
     * Shows a file save dialog and returns the selected file path
     * @returns Promise<string | null> - file path if selected, null if cancelled
     */
    async showFileSave(filename) {
        return new Promise((resolve) => {
            const callbackId = this.ctx.generateId('callback');
            this.ctx.bridge.registerEventHandler(callbackId, (data) => {
                if (data.error || !data.filePath) {
                    resolve(null);
                }
                else {
                    resolve(data.filePath);
                }
            });
            this.ctx.bridge.send('showFileSave', {
                windowId: this.id,
                callbackId,
                filename: filename || 'untitled.txt'
            });
        });
    }
    /**
     * Resize the window to the specified dimensions
     */
    async resize(width, height) {
        await this.ctx.bridge.send('resizeWindow', {
            windowId: this.id,
            width,
            height
        });
    }
    /**
     * Set the window title
     */
    setTitle(title) {
        this.ctx.bridge.send('setWindowTitle', {
            windowId: this.id,
            title
        });
    }
    /**
     * Center the window on the screen
     */
    async centerOnScreen() {
        await this.ctx.bridge.send('centerWindow', {
            windowId: this.id
        });
    }
    /**
     * Set fullscreen mode
     */
    async setFullScreen(fullscreen) {
        await this.ctx.bridge.send('setWindowFullScreen', {
            windowId: this.id,
            fullscreen
        });
    }
    /**
     * Set the main menu for this window
     */
    async setMainMenu(menuDefinition) {
        const menuItems = menuDefinition.map(menu => {
            const items = menu.items.map(item => {
                if (item.isSeparator) {
                    return { label: '', isSeparator: true };
                }
                const menuItem = {
                    label: item.label
                };
                if (item.onSelected) {
                    const callbackId = this.ctx.generateId('callback');
                    menuItem.callbackId = callbackId;
                    this.ctx.bridge.registerEventHandler(callbackId, (_data) => {
                        item.onSelected();
                    });
                }
                if (item.disabled !== undefined) {
                    menuItem.disabled = item.disabled;
                }
                if (item.checked !== undefined) {
                    menuItem.checked = item.checked;
                }
                return menuItem;
            });
            return {
                label: menu.label,
                items
            };
        });
        await this.ctx.bridge.send('setMainMenu', {
            windowId: this.id,
            menuItems
        });
    }
    /**
     * Captures a screenshot of the window and saves it to a file
     * @param filePath - Path where the screenshot will be saved as PNG
     */
    async screenshot(filePath) {
        await this.ctx.bridge.send('captureWindow', {
            windowId: this.id,
            filePath
        });
    }
}
exports.Window = Window;
