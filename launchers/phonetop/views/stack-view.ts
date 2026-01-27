/**
 * StackView Interface
 *
 * Defines the contract for views that can be pushed onto the PhoneTop navigation stack.
 * Each view encapsulates its own state and rendering logic, following the IoC pattern.
 */

import type { App } from 'tsyne';

/**
 * Breadcrumb entry for navigation display
 */
export interface Breadcrumb {
  /** Display label for the breadcrumb */
  label: string;
  /** Index in the stack (for popTo navigation) */
  index: number;
}

/**
 * View types supported by the stack
 */
export type StackViewType = 'home' | 'folder' | 'app';

/**
 * Interface for views that can be pushed onto the PhoneTop navigation stack.
 *
 * Each view is responsible for:
 * - Rendering its content into a provided container
 * - Cleaning up resources when popped from the stack
 * - Optionally preserving/restoring state when hidden/shown
 */
export interface StackView {
  /** Unique identifier for this view instance */
  readonly id: string;

  /** Display title for breadcrumbs and headers */
  readonly title: string;

  /** Type of view (for breadcrumb styling and behavior) */
  readonly type: StackViewType;

  /**
   * Render the view's content synchronously.
   * Called inside window.setContent() builder, so must be synchronous.
   * The view renders directly - no container is passed since it's inside
   * the border's center which expands to fill.
   *
   * @param app - The Tsyne App instance for creating widgets
   */
  renderSync(app: App): void;

  /**
   * Clean up resources when the view is permanently removed from the stack.
   * Called when pop() or popTo() removes this view.
   * After cleanup(), the view should be ready for garbage collection.
   */
  cleanup(): void;

  /**
   * Optional: Called when another view is pushed on top of this one.
   * Use to preserve scroll position or other transient state.
   */
  willHide?(): void;

  /**
   * Optional: Called when this view becomes visible again after a pop.
   * Use to restore scroll position or refresh data.
   */
  willShow?(): void;
}
