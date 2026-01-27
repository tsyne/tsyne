/**
 * AppView - Running App View for PhoneTop
 *
 * Displays a running app with a header containing breadcrumb navigation.
 * Wraps the StackPaneAdapter content and handles app menu integration.
 */

import type { App, VBox, Label, Window } from 'tsyne';
import type { StackPaneAdapter, ScopedResourceManager } from 'tsyne';
import type { AppMetadata } from 'tsyne';
import type { StackView, StackViewType } from './stack-view';

/**
 * Options for creating an AppView
 */
export interface AppViewOptions {
  /** The Tsyne App instance */
  app: App;
  /** The app ID (for tracking in runningApps) */
  appId: string;
  /** App metadata */
  metadata: AppMetadata;
  /** The StackPaneAdapter containing the app's content */
  adapter: StackPaneAdapter;
  /** The scoped resource manager for this app */
  scopedResources: ScopedResourceManager;
  /** The resource scope name */
  resourceScope: string;
  /** Layout scale for rendering */
  layoutScale: number;
  /** Font size for UI elements */
  fontSize?: number;
  /** The main window (for showing menus) */
  window: Window;
}

/**
 * App view showing a running app.
 * Note: Breadcrumbs/quit are rendered by PhoneTopStack, not here.
 */
export class AppView implements StackView {
  readonly id: string;
  readonly title: string;
  readonly type: StackViewType = 'app';

  private a: App;
  private appId: string;
  private metadata: AppMetadata;
  private adapter: StackPaneAdapter;
  private scopedResources: ScopedResourceManager;
  private resourceScope: string;
  private layoutScale: number;
  private fontSize: number;
  private win: Window;

  // Container reference
  private appVbox: VBox | null = null;

  constructor(options: AppViewOptions) {
    this.a = options.app;
    this.appId = options.appId;
    this.metadata = options.metadata;
    this.adapter = options.adapter;
    this.scopedResources = options.scopedResources;
    this.resourceScope = options.resourceScope;
    this.layoutScale = options.layoutScale;
    this.fontSize = options.fontSize ?? 14;
    this.win = options.window;

    this.id = `app-${options.appId}`;
    this.title = options.metadata.name;
  }

  /**
   * Render the app view synchronously.
   * Note: Breadcrumbs/quit are rendered by PhoneTopStack, not here.
   * This just renders the app content.
   */
  renderSync(app: App): void {
    const contentBuilder = this.adapter.contentBuilder;
    if (!contentBuilder) {
      console.error(`[AppView] No contentBuilder for ${this.metadata.name}`);
      app.vbox(() => {
        this.sizedLabel(`Error: No content for ${this.metadata.name}`);
      });
      return;
    }

    console.log(`[AppView] renderSync: ${this.metadata.name}`);

    // Set up resource scope for app content
    const originalResources = this.a.resources;
    (this.a as any).resources = this.scopedResources;
    this.a.getContext().setResourceScope(this.resourceScope);
    this.a.getContext().setLayoutScale(this.layoutScale);

    // Build app content - this is synchronous for the UI structure
    // but the content was prepared earlier
    try {
      contentBuilder();
    } catch (err) {
      console.error(`[AppView] App "${this.metadata.name}" crashed:`, err);
      app.vbox(() => {
        this.sizedLabel(`App Error: ${this.metadata.name}`);
        this.sizedLabel(err instanceof Error ? err.message : String(err));
      });
    }

    // Restore original resources
    (this.a as any).resources = originalResources;
    this.a.getContext().setResourceScope(null);
    this.a.getContext().setLayoutScale(1.0);
  }

  /**
   * Clean up resources when this view is popped.
   */
  cleanup(): void {
    // Clear references for GC
    this.appVbox = null;
  }

  /**
   * Create a label with the configured font size.
   */
  private sizedLabel(text: string, id?: string): Label {
    const label = this.a.label(text, { textSize: this.fontSize });
    if (id) label.withId(id);
    return label;
  }
}
