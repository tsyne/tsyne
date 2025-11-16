"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceManager = void 0;
/**
 * Manages reusable image resources to reduce data transfer
 * Resources are registered once on the Go/Fyne side and can be referenced multiple times
 */
class ResourceManager {
    constructor(bridge) {
        this.registeredResources = new Set();
        this.bridge = bridge;
    }
    /**
     * Register a reusable image resource
     * @param name - Unique resource name (e.g., "chess-light-square", "chess-piece-white-king")
     * @param data - Base64 encoded image data (with or without data URI prefix)
     * @returns Promise that resolves when the resource is registered
     */
    async registerResource(name, data) {
        if (this.registeredResources.has(name)) {
            throw new Error(`Resource already registered: ${name}`);
        }
        await this.bridge.send('registerResource', {
            name,
            data
        });
        this.registeredResources.add(name);
    }
    /**
     * Unregister a resource to free memory on the Go/Fyne side
     * @param name - Resource name to unregister
     * @returns Promise that resolves when the resource is unregistered
     */
    async unregisterResource(name) {
        if (!this.registeredResources.has(name)) {
            return; // Already unregistered or never registered
        }
        await this.bridge.send('unregisterResource', {
            name
        });
        this.registeredResources.delete(name);
    }
    /**
     * Check if a resource is registered
     * @param name - Resource name to check
     * @returns true if the resource is registered, false otherwise
     */
    isRegistered(name) {
        return this.registeredResources.has(name);
    }
    /**
     * Get all registered resource names
     * @returns Array of registered resource names
     */
    getRegisteredResources() {
        return Array.from(this.registeredResources);
    }
    /**
     * Unregister all resources
     * @returns Promise that resolves when all resources are unregistered
     */
    async unregisterAll() {
        const resources = Array.from(this.registeredResources);
        for (const name of resources) {
            await this.unregisterResource(name);
        }
    }
}
exports.ResourceManager = ResourceManager;
