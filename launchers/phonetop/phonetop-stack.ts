/**
 * PhoneTopStack - Navigation Stack Manager
 *
 * Manages a stack of views for PhoneTop navigation.
 * Views are pushed when navigating deeper (folder, app) and popped when going back.
 * Uses window.setContent() to swap entire view content for proper layout expansion.
 */

import type { App, VBox, Window, Label, Button, Entry } from 'tsyne';
import type { StackView, Breadcrumb } from './views/stack-view';
import type { SearchModel } from './search-model';

/**
 * Callback signature for quit action (from breadcrumb bar)
 */
export type OnQuitCallback = (appId: string) => void;

/**
 * Callback signature for hiding keyboard
 */
export type OnHideKeyboardCallback = () => void;

/**
 * Callback signature for stack change notifications
 */
export type StackChangeCallback = () => void;

/**
 * Callback to build keyboard container (only built once)
 */
export type KeyboardBuilder = () => VBox;

/**
 * Options for creating a PhoneTopStack
 */
export interface PhoneTopStackOptions {
  /** The Tsyne App instance */
  app: App;
  /** The window to render into */
  window: Window;
  /** Font size for UI elements */
  fontSize?: number;
  /** Builder for the keyboard container */
  keyboardBuilder?: KeyboardBuilder;
  /** Search model for global search state */
  searchModel: SearchModel;
  /** Callback when quit is pressed (for app views) */
  onQuit?: OnQuitCallback;
  /** Callback to hide keyboard before navigation */
  onHideKeyboard?: OnHideKeyboardCallback;
}

/**
 * Navigation stack manager for PhoneTop.
 *
 * Handles push/pop semantics for views, automatically managing:
 * - View lifecycle (render, cleanup)
 * - State preservation (willHide/willShow callbacks)
 * - Breadcrumb generation
 * - Full window content replacement for proper expansion
 */
export class PhoneTopStack {
  private views: StackView[] = [];
  private changeCallbacks: StackChangeCallback[] = [];
  private a: App;
  private win: Window;
  private fontSize: number;
  private keyboardBuilder?: KeyboardBuilder;
  private keyboardContainer: VBox | null = null;
  private searchModel: SearchModel;
  private onQuit?: OnQuitCallback;
  private onHideKeyboard?: OnHideKeyboardCallback;
  private searchEntry: Entry | null = null;

  constructor(options: PhoneTopStackOptions) {
    this.a = options.app;
    this.win = options.window;
    this.fontSize = options.fontSize ?? 14;
    this.keyboardBuilder = options.keyboardBuilder;
    this.searchModel = options.searchModel;
    this.onQuit = options.onQuit;
    this.onHideKeyboard = options.onHideKeyboard;
  }

  /**
   * Subscribe to stack changes.
   * Callback is invoked after push/pop operations complete.
   */
  onChange(callback: StackChangeCallback): () => void {
    this.changeCallbacks.push(callback);
    return () => {
      this.changeCallbacks = this.changeCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Push a new view onto the stack.
   * The previous top view's willHide() is called (if defined).
   * The new view's render() is called to display it.
   */
  async push(view: StackView): Promise<void> {
    console.log(`[PhoneTopStack] push: ${view.id} (${view.type})`);

    // Notify current top that it's being hidden
    const current = this.top();
    if (current?.willHide) {
      current.willHide();
    }

    // Add to stack
    this.views.push(view);

    // Render the new view
    await this.renderCurrentView();

    // Notify subscribers
    this.notifyChange();
  }

  /**
   * Pop the top view from the stack.
   * The popped view's cleanup() is called for GC.
   * The new top view's willShow() is called (if defined).
   */
  async pop(): Promise<void> {
    if (this.views.length <= 1) {
      console.log('[PhoneTopStack] pop: cannot pop last view');
      return;
    }

    const popped = this.views.pop()!;
    console.log(`[PhoneTopStack] pop: ${popped.id}`);

    // Cleanup the popped view
    popped.cleanup();

    // Notify new top that it's becoming visible
    const newTop = this.top();
    if (newTop?.willShow) {
      newTop.willShow();
    }

    // Render the new top
    await this.renderCurrentView();

    // Notify subscribers
    this.notifyChange();
  }

  /**
   * Pop to a specific stack index.
   * All views above the index are cleaned up.
   *
   * @param index - The stack index to pop to (0 = home)
   */
  async popTo(index: number): Promise<void> {
    if (index < 0 || index >= this.views.length) {
      console.log(`[PhoneTopStack] popTo: invalid index ${index}`);
      return;
    }

    if (index === this.views.length - 1) {
      // Already at this index
      return;
    }

    console.log(`[PhoneTopStack] popTo: index ${index}`);

    // Pop and cleanup all views above the target index
    while (this.views.length > index + 1) {
      const popped = this.views.pop()!;
      popped.cleanup();
    }

    // Notify new top that it's becoming visible
    const newTop = this.top();
    if (newTop?.willShow) {
      newTop.willShow();
    }

    // Render the new top
    await this.renderCurrentView();

    // Notify subscribers
    this.notifyChange();
  }

  /**
   * Get the current top view (or null if stack is empty).
   */
  top(): StackView | null {
    return this.views.length > 0 ? this.views[this.views.length - 1] : null;
  }

  /**
   * Get the current stack depth.
   */
  depth(): number {
    return this.views.length;
  }

  /**
   * Check if the stack contains only the home view.
   */
  isAtHome(): boolean {
    return this.views.length === 1 && this.views[0]?.type === 'home';
  }

  /**
   * Get breadcrumbs for the current stack.
   * Returns an array of breadcrumb entries for navigation.
   */
  getBreadcrumbs(): Breadcrumb[] {
    return this.views.map((view, index) => ({
      label: view.title,
      index
    }));
  }

  /**
   * Get the keyboard container (for show/hide operations).
   */
  getKeyboardContainer(): VBox | null {
    return this.keyboardContainer;
  }

  /**
   * Render the current top view using window.setContent().
   * This ensures proper layout expansion within the window.
   *
   * Layout structure:
   *   border {
   *     top: breadcrumbsNavAndQuit()  // 0px when at home, shows nav when deeper
   *     center: currentView.renderSync()
   *     bottom: keyboard (hidden by default)
   *   }
   */
  async renderCurrentView(): Promise<void> {
    const current = this.top();
    if (!current) {
      console.error('[PhoneTopStack] No view to render');
      return;
    }

    // Use setContent to rebuild entire window content
    // This avoids dynamic add issues with layout expansion
    this.win.setContent(() => {
      this.a.border({
        top: () => {
          // Breadcrumb navigation bar - only shown when not at home
          this.renderBreadcrumbBar();
        },
        center: () => {
          // View renders directly into border's center
          // Border center expands to fill, scroll inside will work
          current.renderSync(this.a);
        },
        bottom: () => {
          // Keyboard container - built once and reused
          if (this.keyboardBuilder) {
            this.keyboardContainer = this.keyboardBuilder();
            this.keyboardContainer.hide();
          }
        }
      });
    });
  }

  /**
   * Render the top bar with breadcrumbs (LHS) and search/quit (RHS).
   * - At home: just search field
   * - In folder: "Home >" + search field
   * - In app: "Home > Folder > App" + quit button
   */
  private renderBreadcrumbBar(): void {
    const breadcrumbs = this.getBreadcrumbs();
    const topView = this.top();
    const isApp = topView?.type === 'app';
    const isHome = this.views.length <= 1;

    this.a.vbox(() => {
      this.a.hbox(() => {
        // Breadcrumb navigation (only when not at home)
        if (!isHome) {
          for (let i = 0; i < breadcrumbs.length; i++) {
            const bc = breadcrumbs[i];
            const isLast = i === breadcrumbs.length - 1;

            if (isLast) {
              // Current view - just a label
              this.sizedLabel(bc.label);
            } else {
              // Clickable breadcrumb
              const targetIndex = bc.index;
              this.sizedButton(bc.label, `breadcrumb-${i}`)
                .onClick(() => {
                  this.onHideKeyboard?.();
                  this.searchModel.clear();
                  this.popTo(targetIndex);
                });
              this.sizedLabel(' > ');
            }
          }
        }

        this.a.spacer();

        // RHS: Search (when not in app) OR Quit (when in app)
        // Both rendered but with opposite .when() conditions

        // Search field - visible when NOT in app
        const searchHbox = this.a.hbox(() => {
          this.searchEntry = this.a.entry(
            'Search...',
            () => {},           // onSubmit
            200,                // minWidth
            undefined,          // onDoubleClick
            (text: string) => this.searchModel.setQuery(text)
          ).withId('global-search') as Entry;

          // Restore previous search text if any
          const currentQuery = this.searchModel.getQuery();
          if (currentQuery) {
            (this.searchEntry as any).setText?.(currentQuery);
          }

          this.sizedButton('✕', 'clear-search').onClick(() => {
            if (this.searchEntry) {
              (this.searchEntry as any).setText?.('');
            }
            this.searchModel.clear();
          });
        });
        searchHbox.when(() => !this.isInAppView());

        // Quit button - visible when IN app
        if (this.onQuit) {
          const quitBtn = this.sizedButton('✕ Quit', 'quit-app');
          quitBtn.onClick(() => {
            this.onHideKeyboard?.();
            const appView = this.top();
            if (appView?.type === 'app') {
              const appId = appView.id.replace('app-', '');
              this.onQuit!(appId);
            }
          });
          quitBtn.when(() => this.isInAppView());
        }
      });

      this.a.separator();
    });
  }

  /**
   * Check if currently viewing an app.
   */
  private isInAppView(): boolean {
    return this.top()?.type === 'app';
  }

  /**
   * Create a label with the configured font size.
   */
  private sizedLabel(text: string, id?: string): Label {
    const label = this.a.label(text, { textSize: this.fontSize });
    if (id) label.withId(id);
    return label;
  }

  /**
   * Create a button with the configured font size.
   */
  private sizedButton(text: string, id?: string): Button {
    const btn = this.a.button(text, { textSize: this.fontSize });
    if (id) btn.withId(id);
    return btn;
  }

  /**
   * Notify all subscribers of a stack change.
   */
  private notifyChange(): void {
    for (const cb of this.changeCallbacks) {
      try {
        cb();
      } catch (err) {
        console.error('[PhoneTopStack] Change callback error:', err);
      }
    }
  }

  /**
   * Clear all views from the stack (for cleanup).
   */
  clearAll(): void {
    for (const view of this.views) {
      view.cleanup();
    }
    this.views = [];
    this.notifyChange();
  }
}
