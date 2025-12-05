/**
 * Tsyne TabletTop Environment
 *
 * A tablet-like environment for launching Tsyne apps.
 * - Uses a fixed grid layout (no pixel-based positioning)
 * - Apps are arranged in a grid (e.g., 4 columns x 4 rows = 16 apps per page)
 * - Moving an icon displaces another icon (swap positions)
 * - Has left/right navigation for multiple pages
 *
 * Run with: ./scripts/tsyne src/tablet-top.ts
 */

import { App } from './app';
import { Window } from './window';
import { Label, Button } from './widgets';
import { enableDesktopMode, disableDesktopMode, ITsyneWindow } from './tsyne-window';
import { scanForApps, scanPortedApps, loadAppBuilder, AppMetadata } from './desktop-metadata';
import { ScopedResourceManager, ResourceManager } from './resources';
import * as path from 'path';

// Grid configuration for tablet
const GRID_COLS = 4;
const GRID_ROWS = 4;
const APPS_PER_PAGE = GRID_COLS * GRID_ROWS;

// Tablet options
export interface TabletTopOptions {
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

// Grid state
interface GridIcon {
  metadata: AppMetadata;
  position: GridPosition;
}

interface OpenApp {
  metadata: AppMetadata;
  tsyneWindow: ITsyneWindow;
}

class TabletTop {
  private a: App;
  private win: Window | null = null;
  private icons: GridIcon[] = [];
  private openApps: Map<string, OpenApp> = new Map();
  private currentPage: number = 0;
  private totalPages: number = 1;
  private pageLabel: Label | null = null;
  private gridContainer: any = null;
  private options: TabletTopOptions;
  private cols: number;
  private rows: number;
  private appsPerPage: number;
  private appInstanceCounter: Map<string, number> = new Map();

  constructor(app: App, options: TabletTopOptions = {}) {
    this.a = app;
    this.options = options;
    this.cols = options.columns || GRID_COLS;
    this.rows = options.rows || GRID_ROWS;
    this.appsPerPage = this.cols * this.rows;
  }

  /**
   * Initialize the tablet by scanning for apps
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
   * Build the tablet UI
   */
  build() {
    this.a.window({ title: 'Tsyne Tablet', width: 800, height: 700 }, (win) => {
      this.win = win as Window;

      // Set up menu
      win.setMainMenu([
        {
          label: 'View',
          items: [
            { label: 'Light Theme', onClick: () => this.a.setTheme('light') },
            { label: 'Dark Theme', onClick: () => this.a.setTheme('dark') },
            { isSeparator: true },
            { label: 'Fullscreen', onClick: () => win.setFullScreen(true) }
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
        // Page navigation header
        this.a.hbox(() => {
          this.a.button('<').withId('prevPage').onClick(() => this.previousPage());
          this.a.spacer();
          this.pageLabel = this.a.label(`Page ${this.currentPage + 1} of ${this.totalPages}`).withId('pageLabel');
          this.a.spacer();
          this.a.button('>').withId('nextPage').onClick(() => this.nextPage());
        });

        this.a.separator();

        // App grid
        this.createAppGrid();
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
            this.createAppButton(app);
          } else {
            // Empty cell
            this.a.label('');
          }
        }
      }
    });
  }

  /**
   * Create a button for an app
   */
  private createAppButton(icon: GridIcon) {
    const btn = this.a.button(icon.metadata.name)
      .withId(`app-${icon.metadata.name}`)
      .onClick(() => this.launchApp(icon.metadata));
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
}

/**
 * Build the tablet environment
 */
export function buildTabletTop(a: App, options?: TabletTopOptions) {
  const tablet = new TabletTop(a, options);
  tablet.init();
  tablet.build();
}

export { TabletTop };

// Entry point
if (require.main === module) {
  const { app } = require('./index');
  app({ title: 'Tsyne Tablet' }, (a: App) => {
    buildTabletTop(a);
  });
}
