/**
 * Tsyne Focus Trap
 *
 * Adapted from focus-trap (https://github.com/focus-trap/focus-trap)
 * Original is DOM-centric; this version works with Tsyne's widget tree
 */

import { Context } from '../context';

export interface FocusTrapOptions {
  /**
   * Widget to receive focus when trap activates
   */
  initialFocus?: string | (() => string);

  /**
   * Widget to receive focus when trap deactivates
   */
  fallbackFocus?: string;

  /**
   * Allow clicks outside trap to deactivate it
   */
  clickOutsideDeactivates?: boolean;

  /**
   * Allow Escape key to deactivate trap
   */
  escapeDeactivates?: boolean;

  /**
   * Return focus to previously focused widget on deactivate
   */
  returnFocusOnDeactivate?: boolean;

  /**
   * Called when trap activates
   */
  onActivate?: () => void;

  /**
   * Called when trap deactivates
   */
  onDeactivate?: () => void;

  /**
   * Called before deactivate - can prevent deactivation
   */
  checkCanDeactivate?: () => boolean;
}

interface WidgetInfo {
  id: string;
  type: string;
  disabled?: boolean;
  visible?: boolean;
  tabIndex?: number;
  children?: string[];
}

export class FocusTrap {
  private ctx: Context;
  private containerWidgetId: string;
  private options: FocusTrapOptions;
  private active: boolean = false;
  private tabbableWidgets: string[] = [];
  private previouslyFocused: string | null = null;
  private keydownHandler: ((event: any) => void) | null = null;

  constructor(
    ctx: Context,
    containerWidgetId: string,
    options: FocusTrapOptions = {}
  ) {
    this.ctx = ctx;
    this.containerWidgetId = containerWidgetId;
    this.options = {
      escapeDeactivates: true,
      returnFocusOnDeactivate: true,
      clickOutsideDeactivates: false,
      ...options
    };
  }

  /**
   * Activate the focus trap
   */
  activate(): void {
    if (this.active) return;

    // Store currently focused widget
    this.previouslyFocused = this.getCurrentFocus();

    // Find all tabbable widgets in container
    this.updateTabbableWidgets();

    // Set initial focus
    this.setInitialFocus();

    // Setup keyboard event listeners
    this.setupKeyboardHandlers();

    this.active = true;
    this.options.onActivate?.();
  }

  /**
   * Deactivate the focus trap
   */
  deactivate(): void {
    if (!this.active) return;

    // Check if deactivation is allowed
    if (this.options.checkCanDeactivate && !this.options.checkCanDeactivate()) {
      return;
    }

    // Remove keyboard handlers
    this.removeKeyboardHandlers();

    // Return focus to previous widget
    if (this.options.returnFocusOnDeactivate && this.previouslyFocused) {
      this.setFocus(this.previouslyFocused);
    }

    this.active = false;
    this.options.onDeactivate?.();
  }

  /**
   * Check if trap is active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Update the list of tabbable widgets (call when container changes)
   */
  updateTabbableWidgets(): void {
    this.tabbableWidgets = this.getTabbableWidgets(this.containerWidgetId);
  }

  private setInitialFocus(): void {
    let initialFocusWidget: string | undefined;

    if (typeof this.options.initialFocus === 'function') {
      initialFocusWidget = this.options.initialFocus();
    } else if (this.options.initialFocus) {
      initialFocusWidget = this.options.initialFocus;
    }

    // If no initial focus specified, use first tabbable widget
    if (!initialFocusWidget && this.tabbableWidgets.length > 0) {
      initialFocusWidget = this.tabbableWidgets[0];
    }

    // Fallback to container or specified fallback
    if (!initialFocusWidget) {
      initialFocusWidget = this.options.fallbackFocus || this.containerWidgetId;
    }

    this.setFocus(initialFocusWidget);
  }

  private setupKeyboardHandlers(): void {
    this.keydownHandler = (event: any) => {
      // Handle Escape key
      if (this.options.escapeDeactivates && event.key === 'Escape') {
        event.preventDefault();
        this.deactivate();
        return;
      }

      // Handle Tab navigation
      if (event.key === 'Tab') {
        event.preventDefault();
        this.handleTab(event.shiftKey);
      }
    };

    // Register handler with bridge
    this.ctx.bridge.on('keydown', this.keydownHandler);
  }

  private removeKeyboardHandlers(): void {
    if (this.keydownHandler) {
      this.ctx.bridge.off('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
  }

  private handleTab(shiftKey: boolean): void {
    if (this.tabbableWidgets.length === 0) return;

    const currentFocus = this.getCurrentFocus();
    const currentIndex = currentFocus
      ? this.tabbableWidgets.indexOf(currentFocus)
      : -1;

    let nextIndex: number;

    if (currentIndex === -1) {
      // No widget focused, or focused widget not in list
      nextIndex = shiftKey ? this.tabbableWidgets.length - 1 : 0;
    } else if (shiftKey) {
      // Shift+Tab: move backwards
      nextIndex = currentIndex === 0
        ? this.tabbableWidgets.length - 1
        : currentIndex - 1;
    } else {
      // Tab: move forwards
      nextIndex = currentIndex === this.tabbableWidgets.length - 1
        ? 0
        : currentIndex + 1;
    }

    this.setFocus(this.tabbableWidgets[nextIndex]);
  }

  private getTabbableWidgets(containerWidgetId: string): string[] {
    // Request widget tree from bridge
    // In a real implementation, this would query the bridge for child widgets
    // For now, we'll use a simplified approach

    const widgets = this.queryWidgetsInContainer(containerWidgetId);

    return widgets
      .filter(w => this.isTabbable(w))
      .sort((a, b) => {
        const aIndex = a.tabIndex ?? 0;
        const bIndex = b.tabIndex ?? 0;

        // Widgets with tabindex > 0 come first, sorted by tabindex
        if (aIndex > 0 && bIndex > 0) return aIndex - bIndex;
        if (aIndex > 0) return -1;
        if (bIndex > 0) return 1;

        // Then widgets with tabindex 0 (or undefined) in DOM order
        return 0;
      })
      .map(w => w.id);
  }

  private isTabbable(widget: WidgetInfo): boolean {
    // Not tabbable if disabled
    if (widget.disabled) return false;

    // Not tabbable if not visible
    if (widget.visible === false) return false;

    // Not tabbable if tabindex < 0
    if (widget.tabIndex !== undefined && widget.tabIndex < 0) return false;

    // Check if widget type is naturally focusable
    const focusableTypes = [
      'Button',
      'Entry',
      'Check',
      'Radio',
      'Select',
      'Slider',
      'Hyperlink'
    ];

    if (focusableTypes.includes(widget.type)) return true;

    // Widget is focusable if it has tabindex >= 0
    if (widget.tabIndex !== undefined && widget.tabIndex >= 0) return true;

    return false;
  }

  private queryWidgetsInContainer(containerWidgetId: string): WidgetInfo[] {
    // This would query the bridge for widget information
    // For now, return empty array - real implementation would use bridge
    // to get actual widget tree
    return [];
  }

  private getCurrentFocus(): string | null {
    // Query bridge for currently focused widget
    // Real implementation would track this through bridge events
    return null;
  }

  private setFocus(widgetId: string): void {
    this.ctx.bridge.send('setFocus', { widgetId });
  }
}

/**
 * Create a focus trap for a container
 *
 * @example
 * const trap = createFocusTrap(ctx, 'dialog-1', {
 *   escapeDeactivates: true,
 *   onDeactivate: () => console.log('Dialog closed')
 * });
 * trap.activate();
 */
export function createFocusTrap(
  ctx: Context,
  containerWidgetId: string,
  options?: FocusTrapOptions
): FocusTrap {
  return new FocusTrap(ctx, containerWidgetId, options);
}
