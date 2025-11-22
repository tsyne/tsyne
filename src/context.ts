import { BridgeConnection } from './fynebridge';

/**
 * Context holds the current state during declarative UI building
 */
export class Context {
  bridge: BridgeConnection;
  private idCounter = 0;
  private windowStack: string[] = [];
  private containerStack: string[][] = [];
  private resourceMap: Map<string, string> = new Map();

  constructor(bridge: BridgeConnection, resourceMap?: Map<string, string>) {
    this.bridge = bridge;
    if (resourceMap) {
      this.resourceMap = resourceMap;
    }
  }

  /**
   * Resolve a resource path using the resource map
   * Returns the local cached path if available, otherwise returns the original path
   */
  resolveResourcePath(path: string): string {
    return this.resourceMap.get(path) || path;
  }

  /**
   * Update the resource map with new resources
   * This allows updating resources without creating a new Context
   */
  setResourceMap(resourceMap: Map<string, string>): void {
    this.resourceMap = resourceMap;
  }

  generateId(prefix: string): string {
    return `${prefix}_${this.idCounter++}`;
  }

  pushWindow(windowId: string): void {
    this.windowStack.push(windowId);
  }

  popWindow(): string | undefined {
    return this.windowStack.pop();
  }

  getCurrentWindow(): string | undefined {
    return this.windowStack[this.windowStack.length - 1];
  }

  pushContainer(): void {
    this.containerStack.push([]);
  }

  popContainer(): string[] {
    return this.containerStack.pop() || [];
  }

  addToCurrentContainer(widgetId: string): void {
    const current = this.containerStack[this.containerStack.length - 1];
    if (current) {
      current.push(widgetId);
    }
  }

  getCurrentContainer(): string[] | undefined {
    return this.containerStack[this.containerStack.length - 1];
  }
}
