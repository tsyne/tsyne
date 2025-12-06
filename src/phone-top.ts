/**
 * Tsyne PhoneTop Environment
 *
 * A phone-like environment for launching Tsyne apps.
 * - Uses a fixed grid layout (3 columns x 4 rows = 12 apps per page)
 * - Moving an icon displaces another icon (swap positions)
 * - Has swipe-style navigation (left/right buttons)
 * - More compact than tablet view
 *
 * Run with: ./scripts/tsyne src/phone-top.ts
 */

import { App } from './app';
import { Window } from './window';
import { Label, Button } from './widgets';
import { enableDesktopMode, disableDesktopMode, ITsyneWindow } from './tsyne-window';
import { scanForApps, scanPortedApps, loadAppBuilder, AppMetadata } from './desktop-metadata';
import { ScopedResourceManager, ResourceManager } from './resources';
import * as path from 'path';

// Grid configuration for phone (portrait orientation)
const GRID_COLS = 3;
const GRID_ROWS = 4;
const APPS_PER_PAGE = GRID_COLS * GRID_ROWS;

// Phone options
export interface PhoneTopOptions {
  /** Directory to scan for apps */
  appDirectory?: string;
  /** Number of columns in the grid */
  columns?: number;
  /** Number of rows in the grid */
  rows?: number;
}

// App position in grid
interface GridPosition {
  page: number;
  row: number;
  col: number;
}

// Grid icon state
interface GridIcon {
  metadata: AppMetadata;
  position: GridPosition;
}

interface OpenApp {
  metadata: AppMetadata;
  tsyneWindow: ITsyneWindow;
}

class PhoneTop {
  private a: App;
  private win: Window | null = null;
  private icons: GridIcon[] = [];
  private openApps: Map<string, OpenApp> = new Map();
  private currentPage: number = 0;
  private totalPages: number = 1;
  private pageIndicatorLabels: Label[] = [];
  private options: PhoneTopOptions;
  private cols: number;
  private rows: number;
  private appsPerPage: number;
  private appInstanceCounter: Map<string, number> = new Map();

  constructor(app: App, options: PhoneTopOptions = {}) {
    this.a = app;
    this.options = options;
    this.cols = options.columns || GRID_COLS;
    this.rows = options.rows || GRID_ROWS;
    this.appsPerPage = this.cols * this.rows;
  }

  /**
   * Initialize the phone by scanning for apps
   */
  init() {
    const appDir = this.options.appDirectory || path.join(process.cwd(), 'examples');
    const portedAppsDir = path.join(process.cwd(), 'ported-apps');

    // Scan for apps
    const exampleApps = scanForApps(appDir);
    const portedApps = scanPortedApps(portedAppsDir);
    const apps = [...exampleApps, ...portedApps].sort((a, b) => a.name.localeCompare(b.name));

    // Position apps in grid across pages
    let page = 0;
    let row = 0;
    let col = 0;

    for (const metadata of apps) {
      this.icons.push({
        metadata,
        position: { page, row, col }
      });

      col++;
      if (col >= this.cols) {
        col = 0;
        row++;
        if (row >= this.rows) {
          row = 0;
          page++;
        }
      }
    }

    this.totalPages = Math.max(1, page + (row > 0 || col > 0 ? 1 : 0));
    console.log(`Found ${apps.length} apps across ${this.totalPages} pages`);
  }

  /**
   * Build the phone UI
   */
  build() {
    this.a.window({ title: 'Tsyne Phone', width: 400, height: 700 }, (win) => {
      this.win = win as Window;

      // Set up menu (minimal for phone)
      win.setMainMenu([
        {
          label: 'Settings',
          items: [
            { label: 'Light Theme', onClick: () => this.a.setTheme('light') },
            { label: 'Dark Theme', onClick: () => this.a.setTheme('dark') }
          ]
        }
      ]);

      this.rebuildContent();
    });
  }

  /**
   * Rebuild the content to show current page
   */
  private rebuildContent() {
    if (!this.win) return;

    this.win.setContent(() => {
      this.a.vbox(() => {
        // App grid (main content area)
        this.a.scroll(() => {
          this.a.vbox(() => {
            this.createAppGrid();
          });
        });

        this.a.separator();

        // Page dots indicator (like iOS/Android)
        this.createPageIndicator();

        // Swipe navigation buttons
        this.a.hbox(() => {
          this.a.button('< Swipe Left').withId('swipeLeft').onClick(() => this.previousPage());
          this.a.spacer();
          this.a.button('Swipe Right >').withId('swipeRight').onClick(() => this.nextPage());
        });
      });
    });
  }

  /**
   * Create page dots indicator
   */
  private createPageIndicator() {
    this.pageIndicatorLabels = [];

    this.a.center(() => {
      this.a.hbox(() => {
        for (let i = 0; i < this.totalPages; i++) {
          const dot = i === this.currentPage ? '●' : '○';
          const label = this.a.label(dot).withId(`page-dot-${i}`);
          this.pageIndicatorLabels.push(label);
        }
      });
    });
  }

  /**
   * Create the app grid for current page
   */
  private createAppGrid() {
    // Get apps for current page
    const pageApps = this.icons.filter(icon => icon.position.page === this.currentPage);

    // Create grid
    this.a.grid(this.cols, () => {
      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          const app = pageApps.find(a => a.position.row === row && a.position.col === col);

          if (app) {
            this.createAppIcon(app);
          } else {
            // Empty cell
            this.a.label('');
          }
        }
      }
    });
  }

  /**
   * Create an icon button for an app
   */
  private createAppIcon(icon: GridIcon) {
    // Use a vertical stack with icon placeholder and label
    this.a.vbox(() => {
      // Icon placeholder (colored box with first letter)
      const firstLetter = icon.metadata.name.charAt(0).toUpperCase();
      this.a.button(firstLetter)
        .withId(`icon-${icon.metadata.name}`)
        .onClick(() => this.launchApp(icon.metadata));

      // App name (truncated if too long)
      const shortName = icon.metadata.name.length > 10
        ? icon.metadata.name.substring(0, 9) + '...'
        : icon.metadata.name;
      this.a.label(shortName);
    });
  }

  /**
   * Navigate to previous page
   */
  private previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.rebuildContent();
    }
  }

  /**
   * Navigate to next page
   */
  private nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.rebuildContent();
    }
  }

  /**
   * Generate a unique scope name for an app instance
   */
  private generateAppScope(appName: string): string {
    const count = (this.appInstanceCounter.get(appName) || 0) + 1;
    this.appInstanceCounter.set(appName, count);
    return `${appName.toLowerCase().replace(/\s+/g, '-')}-${count}`;
  }

  /**
   * Launch an app
   */
  async launchApp(metadata: AppMetadata) {
    if (metadata.count !== 'many') {
      const existing = this.openApps.get(metadata.filePath);
      if (existing) {
        await existing.tsyneWindow.show();
        return;
      }
    }

    if (!this.win) {
      console.error('Window not initialized');
      return;
    }

    const appScope = this.generateAppScope(metadata.name);
    const originalResources = this.a.resources;
    const scopedResources = new ScopedResourceManager(
      originalResources as ResourceManager,
      appScope
    );

    try {
      const builder = await loadAppBuilder(metadata);
      if (!builder) {
        console.error(`Could not load builder for ${metadata.name}`);
        return;
      }

      let createdWindow: ITsyneWindow | null = null;
      const originalWindow = this.a.window.bind(this.a);
      (this.a as any).window = (options: any, builderFn: any) => {
        const win = originalWindow(options, builderFn);
        createdWindow = win;
        return win;
      };

      (this.a as any).resources = scopedResources;
      this.a.getContext().setResourceScope(appScope);

      await builder(this.a);

      (this.a as any).window = originalWindow;
      (this.a as any).resources = originalResources;
      this.a.getContext().setResourceScope(null);

      if (createdWindow) {
        this.openApps.set(metadata.filePath, { metadata, tsyneWindow: createdWindow });
        console.log(`Launched: ${metadata.name}`);
      }
    } finally {
      (this.a as any).resources = originalResources;
      this.a.getContext().setResourceScope(null);
    }
  }

  /**
   * Swap two apps' positions
   */
  swapApps(app1Index: number, app2Index: number) {
    if (app1Index < 0 || app1Index >= this.icons.length) return;
    if (app2Index < 0 || app2Index >= this.icons.length) return;

    const temp = this.icons[app1Index].position;
    this.icons[app1Index].position = this.icons[app2Index].position;
    this.icons[app2Index].position = temp;

    this.rebuildContent();
  }

  /**
   * Get the current page number
   */
  getCurrentPage(): number {
    return this.currentPage;
  }

  /**
   * Get total number of pages
   */
  getTotalPages(): number {
    return this.totalPages;
  }
}

/**
 * Build the phone environment
 */
export function buildPhoneTop(a: App, options?: PhoneTopOptions) {
  const phone = new PhoneTop(a, options);
  phone.init();
  phone.build();
}

export { PhoneTop };

// Entry point
if (require.main === module) {
  const { app } = require('./index');
  app({ title: 'Tsyne Phone' }, (a: App) => {
    buildPhoneTop(a);
  });
}
