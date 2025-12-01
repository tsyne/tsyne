import { BridgeInterface } from './fynebridge';

// Forward declaration to avoid circular dependency
// The actual AccessibilityManager is imported lazily
type AccessibilityManagerType = import('./accessibility').AccessibilityManager;

/**
 * Interface for test harness that can mock dialogs
 */
export interface TestHarness {
  hasMockedFileDialog(type: 'open' | 'save'): boolean;
  popMockedFileDialog(type: 'open' | 'save'): string | null | undefined;
}

/**
 * Context holds the current state during declarative UI building
 */
export class Context {
  bridge: BridgeInterface;
  private idCounter = 0;
  private windowStack: string[] = [];
  private containerStack: string[][] = [];
  private resourceMap: Map<string, string> = new Map();
  private _accessibilityManager: AccessibilityManagerType | null = null;
  private _testHarness: TestHarness | null = null;
  private pendingRegistrations: Promise<void>[] = [];

  constructor(bridge: BridgeInterface, resourceMap?: Map<string, string>) {
    this.bridge = bridge;
    if (resourceMap) {
      this.resourceMap = resourceMap;
    }
  }

  /**
   * Track a widget ID registration promise
   */
  trackRegistration(promise: Promise<void>): void {
    this.pendingRegistrations.push(promise);
  }

  /**
   * Wait for all pending widget ID registrations to complete
   */
  async waitForRegistrations(): Promise<void> {
    await Promise.all(this.pendingRegistrations);
    this.pendingRegistrations = []; // Clear after waiting
  }

  /**
   * Set test harness for mocking dialogs during testing
   */
  setTestHarness(harness: TestHarness): void {
    this._testHarness = harness;
  }

  /**
   * Get the test harness (null in production)
   */
  get testHarness(): TestHarness | null {
    return this._testHarness;
  }

  /**
   * Get the accessibility manager for this context (lazy-initialized)
   * This provides proper IoC - each context has its own manager instance
   */
  get accessibilityManager(): AccessibilityManagerType {
    if (!this._accessibilityManager) {
      // Lazy import to avoid circular dependency
      const { AccessibilityManager } = require('./accessibility');
      this._accessibilityManager = new AccessibilityManager(this);
    }
    return this._accessibilityManager!;
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
