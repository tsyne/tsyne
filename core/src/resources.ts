import type { BridgeInterface } from './fynebridge';

/**
 * Interface for resource management - allows IoC injection of scoped implementations
 */
export interface IResourceManager {
  registerResource(name: string, data: string): Promise<void>;
  unregisterResource(name: string): Promise<void>;
  isRegistered(name: string): boolean;
  getRegisteredResources(): string[];
  unregisterAll(): Promise<void>;
  /** Get the actual name to use when referencing a resource (handles scoping) */
  getScopedName(name: string): string;
}

/**
 * Manages reusable image resources to reduce data transfer
 * Resources are registered once on the Go/Fyne side and can be referenced multiple times
 */
export class ResourceManager implements IResourceManager {
  private bridge: BridgeInterface;
  private registeredResources: Set<string> = new Set();

  constructor(bridge: BridgeInterface) {
    this.bridge = bridge;
  }

  /**
   * Register a reusable image resource
   * @param name - Unique resource name (e.g., "chess-light-square", "chess-piece-white-king")
   * @param data - Base64 encoded image data (with or without data URI prefix)
   * @returns Promise that resolves when the resource is registered
   */
  async registerResource(name: string, data: string): Promise<void> {
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
  async unregisterResource(name: string): Promise<void> {
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
  isRegistered(name: string): boolean {
    return this.registeredResources.has(name);
  }

  /**
   * Get all registered resource names
   * @returns Array of registered resource names
   */
  getRegisteredResources(): string[] {
    return Array.from(this.registeredResources);
  }

  /**
   * Unregister all resources
   * @returns Promise that resolves when all resources are unregistered
   */
  async unregisterAll(): Promise<void> {
    const resources = Array.from(this.registeredResources);
    for (const name of resources) {
      await this.unregisterResource(name);
    }
  }

  /**
   * Get the actual name to use when referencing a resource
   * For non-scoped manager, returns the name unchanged
   */
  getScopedName(name: string): string {
    return name;
  }
}

/**
 * Null implementation of IResourceManager for apps that don't need resources.
 * Useful for testing or standalone apps that handle their own resource management.
 */
export class NullResourceManager implements IResourceManager {
  async registerResource(_name: string, _data: string): Promise<void> {
    // No-op
  }

  async unregisterResource(_name: string): Promise<void> {
    // No-op
  }

  isRegistered(_name: string): boolean {
    return false;
  }

  getRegisteredResources(): string[] {
    return [];
  }

  async unregisterAll(): Promise<void> {
    // No-op
  }

  getScopedName(name: string): string {
    return name;
  }
}

/**
 * Scoped ResourceManager that prefixes all resource names with a unique scope.
 * Used by Desktop to give each app instance its own resource namespace.
 * Apps don't need to know about scoping - it's transparent.
 */
export class ScopedResourceManager implements IResourceManager {
  private delegate: ResourceManager;
  private scope: string;
  private scopedResources: Set<string> = new Set();

  constructor(delegate: ResourceManager, scope: string) {
    this.delegate = delegate;
    this.scope = scope;
  }

  private scopedName(name: string): string {
    return `${this.scope}:${name}`;
  }

  async registerResource(name: string, data: string): Promise<void> {
    const scoped = this.scopedName(name);
    await this.delegate.registerResource(scoped, data);
    this.scopedResources.add(name);
  }

  async unregisterResource(name: string): Promise<void> {
    const scoped = this.scopedName(name);
    await this.delegate.unregisterResource(scoped);
    this.scopedResources.delete(name);
  }

  isRegistered(name: string): boolean {
    return this.scopedResources.has(name);
  }

  getRegisteredResources(): string[] {
    return Array.from(this.scopedResources);
  }

  async unregisterAll(): Promise<void> {
    for (const name of this.scopedResources) {
      await this.unregisterResource(name);
    }
  }

  /**
   * Get the scoped name for use in image references
   * Apps should use this when referencing resources in widgets
   */
  getScopedName(name: string): string {
    return this.scopedName(name);
  }
}
