/**
 * FolderView - Folder Contents View for PhoneTop
 *
 * Displays the apps within a folder.
 * Uses long-scroll instead of pagination (Android-style).
 * Supports search functionality within the folder.
 */

import type { App, VBox, Label, Button } from 'tsyne';
import type { StackView, StackViewType } from './stack-view';
import type { GridIcon, Folder } from '../phonetop-groups';
import type { SearchModel } from '../search-model';

/**
 * Callback signature for app tap events
 */
export type OnAppTapCallback = (icon: GridIcon) => void;

/**
 * Callback signature for back navigation
 */
export type OnBackCallback = () => void;

/**
 * Options for creating a FolderView
 */
export interface FolderViewOptions {
  /** The Tsyne App instance */
  app: App;
  /** The folder to display */
  folder: Folder;
  /** Number of columns in the grid */
  cols: number;
  /** Font size for UI elements */
  fontSize?: number;
  /** Whether to use ImageButton for icons */
  useImageButton: boolean;
  /** Callback when an app is tapped */
  onAppTap: OnAppTapCallback;
  /** Callback when back is pressed */
  onBack: OnBackCallback;
  /** Search model to subscribe to */
  searchModel: SearchModel;
}

/**
 * Folder view showing apps within a folder in a scrollable grid.
 */
export class FolderView implements StackView {
  readonly id: string;
  readonly title: string;
  readonly type: StackViewType = 'folder';

  private a: App;
  private folder: Folder;
  private cols: number;
  private fontSize: number;
  private useImageButton: boolean;
  private onAppTap: OnAppTapCallback;
  private onBack: OnBackCallback;
  private searchModel: SearchModel;
  private unsubscribeSearch: (() => void) | null = null;

  // Search state (derived from model)
  private filteredApps: GridIcon[] = [];

  // Container reference for re-rendering
  private gridContainer: VBox | null = null;

  constructor(options: FolderViewOptions) {
    this.a = options.app;
    this.folder = options.folder;
    this.cols = options.cols;
    this.fontSize = options.fontSize ?? 14;
    this.useImageButton = options.useImageButton;
    this.onAppTap = options.onAppTap;
    this.onBack = options.onBack;
    this.searchModel = options.searchModel;

    this.id = `folder-${options.folder.category}`;
    this.title = options.folder.name;

    // Subscribe to search changes
    this.unsubscribeSearch = this.searchModel.onChange((query) => {
      this.onSearchChanged(query);
    });

    // Apply initial search state if any
    const initialQuery = this.searchModel.getQuery();
    if (initialQuery) {
      this.filteredApps = this.filterBySearch(initialQuery);
    }
  }

  /**
   * Update grid columns (e.g., after orientation change).
   */
  updateCols(cols: number): void {
    this.cols = cols;
  }

  /**
   * Render the folder view synchronously (called from setContent builder).
   * Note: Search is handled by PhoneTopStack breadcrumb bar, not here.
   */
  renderSync(app: App): void {
    app.border({
      top: () => {
        // Folder header only - search is in the global breadcrumb bar
        app.center(() => {
          app.hbox(() => {
            this.sizedLabel('📁');
            this.sizedLabel(` ${this.folder.name}`);
            this.sizedLabel(` (${this.folder.apps.length} apps)`);
          });
        });
      },
      center: () => {
        // Scrollable grid container - scroll in border center expands properly
        app.scroll(() => {
          this.gridContainer = app.vbox(() => {
            this.createAppGrid();
          });
        });
      }
    });
  }

  /**
   * Clean up resources when this view is popped.
   */
  cleanup(): void {
    this.unsubscribeSearch?.();
    this.unsubscribeSearch = null;
    this.gridContainer = null;
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
   * Truncate text to fit within grid cell.
   */
  private truncateName(text: string, maxChars: number = 8): string {
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars - 1) + '...';
  }

  /**
   * Create the app grid showing all apps in the folder (no pagination).
   */
  private createAppGrid(): void {
    // Use filtered apps when searching, otherwise all folder apps
    const query = this.searchModel.getQuery();
    const appsToShow = query ? this.filteredApps : this.folder.apps;

    this.a.grid(this.cols, () => {
      for (const icon of appsToShow) {
        this.createAppIcon(icon);
      }
    });
  }

  /**
   * Create an app icon.
   */
  private createAppIcon(icon: GridIcon): void {
    const displayName = this.truncateName(icon.metadata.name);

    this.a.center(() => {
      if (icon.resourceName && this.useImageButton) {
        this.a.imageButton({
          resource: icon.resourceName,
          text: displayName,
          textSize: this.fontSize
        })
          .withId(`icon-${icon.metadata.name}`)
          .onClick(() => this.onAppTap(icon));
      } else {
        const firstLetter = icon.metadata.name.charAt(0).toUpperCase();
        this.a.button(`${firstLetter}\n${displayName}`)
          .withId(`icon-${icon.metadata.name}`)
          .onClick(() => this.onAppTap(icon));
      }
    });
  }

  /**
   * Handle search model changes.
   */
  private onSearchChanged(query: string): void {
    if (!query) {
      this.filteredApps = [];
    } else {
      this.filteredApps = this.filterBySearch(query);
    }

    this.rebuildGrid();
  }

  /**
   * Filter apps by search query.
   */
  private filterBySearch(query: string): GridIcon[] {
    const pattern = this.queryToRegex(query);
    return this.folder.apps.filter(app =>
      pattern.test(app.metadata.name.toLowerCase())
    );
  }

  /**
   * Convert glob-style pattern to regex.
   */
  private queryToRegex(query: string): RegExp {
    const escaped = query.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const pattern = escaped.replace(/\*/g, '.*');
    return new RegExp(pattern, 'i');
  }

  /**
   * Rebuild the grid after search changes.
   */
  private rebuildGrid(): void {
    if (!this.gridContainer) return;

    this.gridContainer.removeAll();
    this.gridContainer.add(() => {
      this.createAppGrid();
    });
  }
}
