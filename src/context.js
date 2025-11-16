"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
/**
 * Context holds the current state during declarative UI building
 */
class Context {
    constructor(bridge, resourceMap) {
        this.idCounter = 0;
        this.windowStack = [];
        this.containerStack = [];
        this.resourceMap = new Map();
        this.bridge = bridge;
        if (resourceMap) {
            this.resourceMap = resourceMap;
        }
    }
    /**
     * Resolve a resource path using the resource map
     * Returns the local cached path if available, otherwise returns the original path
     */
    resolveResourcePath(path) {
        return this.resourceMap.get(path) || path;
    }
    /**
     * Update the resource map with new resources
     * This allows updating resources without creating a new Context
     */
    setResourceMap(resourceMap) {
        this.resourceMap = resourceMap;
    }
    generateId(prefix) {
        return `${prefix}_${this.idCounter++}`;
    }
    pushWindow(windowId) {
        this.windowStack.push(windowId);
    }
    popWindow() {
        return this.windowStack.pop();
    }
    getCurrentWindow() {
        return this.windowStack[this.windowStack.length - 1];
    }
    pushContainer() {
        this.containerStack.push([]);
    }
    popContainer() {
        return this.containerStack.pop() || [];
    }
    addToCurrentContainer(widgetId) {
        const current = this.containerStack[this.containerStack.length - 1];
        if (current) {
            current.push(widgetId);
        }
    }
    getCurrentContainer() {
        return this.containerStack[this.containerStack.length - 1];
    }
}
exports.Context = Context;
