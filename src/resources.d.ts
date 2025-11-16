import type { BridgeConnection } from './fynebridge';
/**
 * Manages reusable image resources to reduce data transfer
 * Resources are registered once on the Go/Fyne side and can be referenced multiple times
 */
export declare class ResourceManager {
    private bridge;
    private registeredResources;
    constructor(bridge: BridgeConnection);
    /**
     * Register a reusable image resource
     * @param name - Unique resource name (e.g., "chess-light-square", "chess-piece-white-king")
     * @param data - Base64 encoded image data (with or without data URI prefix)
     * @returns Promise that resolves when the resource is registered
     */
    registerResource(name: string, data: string): Promise<void>;
    /**
     * Unregister a resource to free memory on the Go/Fyne side
     * @param name - Resource name to unregister
     * @returns Promise that resolves when the resource is unregistered
     */
    unregisterResource(name: string): Promise<void>;
    /**
     * Check if a resource is registered
     * @param name - Resource name to check
     * @returns true if the resource is registered, false otherwise
     */
    isRegistered(name: string): boolean;
    /**
     * Get all registered resource names
     * @returns Array of registered resource names
     */
    getRegisteredResources(): string[];
    /**
     * Unregister all resources
     * @returns Promise that resolves when all resources are unregistered
     */
    unregisterAll(): Promise<void>;
}
