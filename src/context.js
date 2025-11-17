"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
/**
 * Context holds the current state during declarative UI building
 */
var Context = /** @class */ (function () {
    function Context(bridge, resourceMap) {
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
    Context.prototype.resolveResourcePath = function (path) {
        return this.resourceMap.get(path) || path;
    };
    /**
     * Update the resource map with new resources
     * This allows updating resources without creating a new Context
     */
    Context.prototype.setResourceMap = function (resourceMap) {
        this.resourceMap = resourceMap;
    };
    Context.prototype.generateId = function (prefix) {
        return "".concat(prefix, "_").concat(this.idCounter++);
    };
    Context.prototype.pushWindow = function (windowId) {
        this.windowStack.push(windowId);
    };
    Context.prototype.popWindow = function () {
        return this.windowStack.pop();
    };
    Context.prototype.getCurrentWindow = function () {
        return this.windowStack[this.windowStack.length - 1];
    };
    Context.prototype.pushContainer = function () {
        this.containerStack.push([]);
    };
    Context.prototype.popContainer = function () {
        return this.containerStack.pop() || [];
    };
    Context.prototype.addToCurrentContainer = function (widgetId) {
        var current = this.containerStack[this.containerStack.length - 1];
        if (current) {
            current.push(widgetId);
        }
    };
    Context.prototype.getCurrentContainer = function () {
        return this.containerStack[this.containerStack.length - 1];
    };
    return Context;
}());
exports.Context = Context;
