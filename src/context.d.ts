import { BridgeConnection } from './fynebridge';
/**
 * Context holds the current state during declarative UI building
 */
export declare class Context {
    bridge: BridgeConnection;
    private idCounter;
    private windowStack;
    private containerStack;
    private resourceMap;
    constructor(bridge: BridgeConnection, resourceMap?: Map<string, string>);
    /**
     * Resolve a resource path using the resource map
     * Returns the local cached path if available, otherwise returns the original path
     */
    resolveResourcePath(path: string): string;
    /**
     * Update the resource map with new resources
     * This allows updating resources without creating a new Context
     */
    setResourceMap(resourceMap: Map<string, string>): void;
    generateId(prefix: string): string;
    pushWindow(windowId: string): void;
    popWindow(): string | undefined;
    getCurrentWindow(): string | undefined;
    pushContainer(): void;
    popContainer(): string[];
    addToCurrentContainer(widgetId: string): void;
    getCurrentContainer(): string[] | undefined;
}
