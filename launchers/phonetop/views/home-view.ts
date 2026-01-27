/**
 * HomeView - Home Screen View for PhoneTop
 *
 * Displays the main grid of folders and uncategorized apps.
 * Uses long-scroll instead of pagination (Android-style).
 * Supports search functionality.
 */

import type { App, VBox, Label, Button } from 'tsyne';
import type { StackView, StackViewType } from './stack-view';
import type { GridItem, GridIcon, Folder } from '../phonetop-groups';
import type { SearchModel } from '../search-model';

/**
 * Callback signature for folder tap events
 */
export type OnFolderTapCallback = (folder: Folder) => void;

/**
 * Callback signature for app tap events
 */
export type OnAppTapCallback = (icon: GridIcon) => void;

/**
 * Options for creating a HomeView
 */
export interface HomeViewOptions {
  /** The Tsyne App instance */
  app: App;
  /** Grid items to display (folders + uncategorized apps) */
  gridItems: GridItem[];
  /** Number of columns in the grid */
  cols: number;
  /** Font size for UI elements */
  fontSize?: number;
  /** Cache of folder icon resources by category */
  folderIconCache: Map<string, string>;
  /** Whether to use ImageButton for icons */
  useImageButton: boolean;
  /** Build timestamp for display */
  buildTimestamp: string;
  /** Callback when a folder is tapped */
  onFolderTap: OnFolderTapCallback;
  /** Callback when an app is tapped */
  onAppTap: OnAppTapCallback;
  /** Search model to subscribe to */
  searchModel: SearchModel;
}

/**
 * Home screen view showing folders and uncategorized apps in a scrollable grid.
 */
export class HomeView implements StackView {
  readonly id = 'home';
  readonly title = 'Home';
  readonly type: StackViewType = 'home';

  private a: App;
  private gridItems: GridItem[];
  private cols: number;
  private fontSize: number;
  private folderIconCache: Map<string, string>;
  private useImageButton: boolean;
  private buildTimestamp: string;
  private onFolderTap: OnFolderTapCallback;
  private onAppTap: OnAppTapCallback;
  private searchModel: SearchModel;
  private unsubscribeSearch: (() => void) | null = null;

  // Search state (derived from model)
  private filteredGridItems: GridItem[] = [];

  // Container reference for re-rendering
  private gridContainer: VBox | null = null;

  constructor(options: HomeViewOptions) {
    this.a = options.app;
    this.gridItems = options.gridItems;
    this.cols = options.cols;
    this.fontSize = options.fontSize ?? 14;
    this.folderIconCache = options.folderIconCache;
    this.useImageButton = options.useImageButton;
    this.buildTimestamp = options.buildTimestamp;
    this.onFolderTap = options.onFolderTap;
    this.onAppTap = options.onAppTap;
    this.searchModel = options.searchModel;

    // Subscribe to search changes
    this.unsubscribeSearch = this.searchModel.onChange((query) => {
      this.onSearchChanged(query);
    });
  }

  /**
   * Update grid items (e.g., after orientation change).
   */
  updateGridItems(items: GridItem[]): void {
    this.gridItems = items;
  }

  /**
   * Update grid columns (e.g., after orientation change).
   */
  updateCols(cols: number): void {
    this.cols = cols;
  }

  /**
   * Render the home screen synchronously (called from setContent builder).
   * Note: Search is handled by PhoneTopStack breadcrumb bar, not here.
   */
  renderSync(app: App): void {
    // Use border layout - center will expand to fill available space
    app.border({
      top: () => {
        // Build timestamp only - search is in the global breadcrumb bar
        this.sizedLabel(`Build: ${this.buildTimestamp}`, 'build-timestamp');
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
   * Create the app grid showing all items (no pagination).
   */
  private createAppGrid(): void {
    // Use filtered items when searching, otherwise all grid items
    const query = this.searchModel.getQuery();
    const itemsToShow = query ? this.filteredGridItems : this.gridItems;

    this.a.grid(this.cols, () => {
      for (const item of itemsToShow) {
        if (item.type === 'folder') {
          this.createFolderIcon(item.folder);
        } else {
          this.createAppIcon(item.icon);
        }
      }
    });
  }

  /**
   * Create a folder icon.
   */
  private createFolderIcon(folder: Folder): void {
    const displayName = this.truncateName(folder.name);
    const resourceName = this.folderIconCache.get(folder.category);

    this.a.center(() => {
      if (resourceName && this.useImageButton) {
        this.a.imageButton({
          resource: resourceName,
          text: displayName,
          textSize: this.fontSize
        })
          .withId(`folder-${folder.category}`)
          .onClick(() => this.onFolderTap(folder));
      } else {
        this.a.button(`📁 ${displayName}`)
          .withId(`folder-${folder.category}`)
          .onClick(() => this.onFolderTap(folder));
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
      this.filteredGridItems = [];
    } else {
      this.filteredGridItems = this.filterBySearch(query);
    }

    this.rebuildGrid();
  }

  /**
   * Filter grid items by search query.
   */
  private filterBySearch(query: string): GridItem[] {
    const results: GridItem[] = [];
    const pattern = this.queryToRegex(query);

    for (const item of this.gridItems) {
      if (item.type === 'app') {
        if (pattern.test(item.icon.metadata.name.toLowerCase())) {
          results.push(item);
        }
      } else if (item.type === 'folder') {
        const folderMatches = pattern.test(item.folder.name.toLowerCase());
        const matchingApps = item.folder.apps.filter(app =>
          pattern.test(app.metadata.name.toLowerCase())
        );

        if (folderMatches || matchingApps.length > 0) {
          if (matchingApps.length > 0 && matchingApps.length < item.folder.apps.length) {
            // Partial match - create filtered folder
            results.push({
              type: 'folder',
              folder: {
                ...item.folder,
                apps: matchingApps
              }
            });
          } else {
            results.push(item);
          }
        }
      }
    }

    return results;
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
