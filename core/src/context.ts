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
  private usedIds: Set<string> = new Set();
  private windowStack: string[] = [];
  private containerStack: string[][] = [];
  private widgetStack: any[][] = [];  // Track widget objects alongside IDs
  private resourceMap: Map<string, string> = new Map();
  private _accessibilityManager: AccessibilityManagerType | null = null;
  private _testHarness: TestHarness | null = null;
  private pendingRegistrations: Promise<void>[] = [];
  private _resourceScope: string | null = null;
  private _layoutScale: number = 1.0;
  private _inspectorEnabled: boolean = true;

  constructor(bridge: BridgeInterface, resourceMap?: Map<string, string>) {
    this.bridge = bridge;
    if (resourceMap) {
      this.resourceMap = resourceMap;
    }
  }

  /**
   * Set resource scope for this context (used by Desktop for app instance isolation)
   * When set, all resource names are prefixed with the scope
   */
  setResourceScope(scope: string | null): void {
    this._resourceScope = scope;
  }

  /**
   * Get the current resource scope (null = no scoping)
   */
  get resourceScope(): string | null {
    return this._resourceScope;
  }

  /**
   * Apply resource scope to a resource name
   * Returns scoped name if scope is set, otherwise returns original name
   */
  scopeResourceName(name: string): string {
    return this._resourceScope ? `${this._resourceScope}:${name}` : name;
  }

  /**
   * Set layout scale for responsive sizing.
   * 1.0 = desktop (default), 0.5 = phone, 0.7 = tablet, etc.
   * Apps can use this to scale UI elements proportionally.
   */
  setLayoutScale(scale: number): void {
    this._layoutScale = scale;
  }

  /**
   * Get the current layout scale.
   * Returns 1.0 for desktop, smaller values for phone/tablet.
   */
  getLayoutScale(): number {
    return this._layoutScale;
  }

  /**
   * Scale a value by the current layout scale.
   * Convenience method: scale(100) returns 50 when layoutScale is 0.5
   */
  scale(value: number): number {
    return Math.round(value * this._layoutScale);
  }

  /**
   * Set whether the Ctrl+Shift+I inspector shortcut is enabled.
   * Default is true.
   */
  setInspectorEnabled(enabled: boolean): void {
    this._inspectorEnabled = enabled;
  }

  /**
   * Get whether the inspector shortcut is enabled.
   */
  isInspectorEnabled(): boolean {
    return this._inspectorEnabled;
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

  /**
   * Generate a unique internal widget ID.
   * Format: _${type}_${random} (e.g., "_label_k7m2z9")
   * The underscore prefix indicates this is an internal ID, not for test queries.
   * Use widget.withId('myId') to set explicit IDs for testing.
   */
  generateId(prefix: string): string {
    let id: string;
    do {
      // 6 chars base36 ≈ 2 billion combinations, plenty for any app session
      const random = Math.random().toString(36).slice(2, 8);
      id = `_${prefix}_${random}`;
    } while (this.usedIds.has(id));
    this.usedIds.add(id);
    return id;
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
    this.widgetStack.push([]);
  }

  popContainer(): string[] {
    this.widgetStack.pop();
    return this.containerStack.pop() || [];
  }

  /**
   * Pop container and return both IDs and widget objects
   */
  popContainerWithWidgets(): { ids: string[], widgets: any[] } {
    const widgets = this.widgetStack.pop() || [];
    const ids = this.containerStack.pop() || [];
    return { ids, widgets };
  }

  addToCurrentContainer(widgetId: string, widget?: any): void {
    const currentIds = this.containerStack[this.containerStack.length - 1];
    const currentWidgets = this.widgetStack[this.widgetStack.length - 1];
    if (currentIds) {
      currentIds.push(widgetId);
    }
    if (currentWidgets && widget) {
      currentWidgets.push(widget);
    }
  }

  getCurrentContainer(): string[] | undefined {
    return this.containerStack[this.containerStack.length - 1];
  }

  /**
   * Create a scoped context for sandboxed apps.
   * Widget IDs are prefixed with the scope to prevent cross-app access.
   */
  createScopedContext(scope: string): Context {
    return new ScopedContext(this, scope);
  }
}

/**
 * Scoped Context for sandboxed apps.
 * Delegates to parent context but prefixes widget IDs with scope.
 */
class ScopedContext extends Context {
  private parentCtx: Context;
  private scope: string;

  constructor(parent: Context, scope: string) {
    // Share the same bridge
    super(parent.bridge);
    this.parentCtx = parent;
    this.scope = scope;
    // Set resource scope to match
    this.setResourceScope(scope);
  }

  /**
   * Generate scoped widget ID
   * Format: ${scope}:_${type}_${random}
   */
  override generateId(prefix: string): string {
    const baseId = super.generateId(prefix);
    return `${this.scope}:${baseId}`;
  }

  /**
   * Track registration in parent context
   */
  override trackRegistration(promise: Promise<void>): void {
    this.parentCtx.trackRegistration(promise);
  }

  /**
   * Wait uses parent's pending registrations
   */
  override async waitForRegistrations(): Promise<void> {
    return this.parentCtx.waitForRegistrations();
  }

  /**
   * Test harness comes from parent
   */
  override get testHarness() {
    return this.parentCtx.testHarness;
  }

  /**
   * Layout scale comes from parent
   */
  override getLayoutScale(): number {
    return this.parentCtx.getLayoutScale();
  }

  /**
   * Scale using parent's layout scale
   */
  override scale(value: number): number {
    return this.parentCtx.scale(value);
  }

  // ============================================================================
  // Container stack operations - delegate to parent so InnerWindow works
  // ============================================================================

  /**
   * Push a new container onto parent's stack
   */
  override pushContainer(): void {
    this.parentCtx.pushContainer();
  }

  /**
   * Pop from parent's container stack
   */
  override popContainer(): string[] {
    return this.parentCtx.popContainer();
  }

  /**
   * Pop container with widgets from parent's stack
   */
  override popContainerWithWidgets(): { ids: string[], widgets: any[] } {
    return this.parentCtx.popContainerWithWidgets();
  }

  /**
   * Add to parent's current container
   */
  override addToCurrentContainer(id: string, widget?: any): void {
    this.parentCtx.addToCurrentContainer(id, widget);
  }
}
