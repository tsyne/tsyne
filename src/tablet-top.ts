/**
 * Tsyne TabletTop Environment
 *
 * A tablet-like environment for launching Tsyne apps.
 * - Uses a fixed grid layout (no pixel-based positioning)
 * - Apps are arranged in a grid (e.g., 4 columns x 4 rows = 16 apps per page)
 * - Moving an icon displaces another icon (swap positions)
 * - Has left/right navigation for multiple pages
 * - Supports phone-apps with logging services
 *
 * Run with: ./scripts/tsyne src/tablet-top.ts
 */

import { App } from './app';
import { Window } from './window';
import { Label, Button } from './widgets';
import { enableDesktopMode, disableDesktopMode, ITsyneWindow } from './tsyne-window';
import { scanForApps, scanPortedApps, loadAppBuilder, AppMetadata } from './desktop-metadata';
import { ScopedResourceManager, ResourceManager } from './resources';
import { SandboxedApp } from './sandboxed-app';
import * as path from 'path';

// Import logging services for phone apps
import {
  modemLog,
  ModemLogEntry,
  createLoggingServices,
} from '../phone-apps/logging-services';

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
  private services: ReturnType<typeof createLoggingServices>;
  private modemWin: Window | null = null;
  private modemLogLabel: Label | null = null;
  private modemLogLines: string[] = [];

  constructor(app: App, options: TabletTopOptions = {}) {
    this.a = app;
    this.options = options;
    this.cols = options.columns || GRID_COLS;
    this.rows = options.rows || GRID_ROWS;
    this.appsPerPage = this.cols * this.rows;
    this.services = createLoggingServices();

    // Subscribe to modem log for phone apps
    modemLog.subscribe((entry) => this.handleModemLog(entry));
  }

  private handleModemLog(entry: ModemLogEntry): void {
    const time = entry.timestamp.toLocaleTimeString('en-US', { hour12: false });
    const arrow = entry.direction === 'TX' ? '→' : entry.direction === 'RX' ? '←' : '•';
    const line = `[${time}] ${arrow} ${entry.subsystem}: ${entry.message}`;

    this.modemLogLines.push(line);
    if (this.modemLogLines.length > 50) {
      this.modemLogLines.shift();
    }

    if (this.modemLogLabel) {
      this.modemLogLabel.setText(this.modemLogLines.join('\n'));
    }
  }

  /**
   * Initialize the tablet by scanning for apps
   */
  init() {
    const appDir = this.options.appDirectory || path.join(process.cwd(), 'examples');
    const portedAppsDir = path.join(process.cwd(), 'ported-apps');
    const phoneAppsDir = path.join(process.cwd(), 'phone-apps');

    // Scan for apps from all directories
    const exampleApps = scanForApps(appDir);
    const portedApps = scanPortedApps(portedAppsDir);
    const phoneApps = scanForApps(phoneAppsDir);
    const apps = [...exampleApps, ...portedApps, ...phoneApps].sort((a, b) => a.name.localeCompare(b.name));

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
            { label: 'Light Theme', onSelected: () => this.a.setTheme('light') },
            { label: 'Dark Theme', onSelected: () => this.a.setTheme('dark') },
            { label: '', isSeparator: true },
            { label: 'Modem Console', onSelected: () => this.showModemConsole() },
            { label: '', isSeparator: true },
            { label: 'Fullscreen', onSelected: () => win.setFullScreen(true) }
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
   * Check if an app is a phone app (has phone-specific args)
   */
  private isPhoneApp(metadata: AppMetadata): boolean {
    const phoneArgs = ['telephony', 'contacts', 'clock', 'notifications', 'storage', 'settings', 'sms'];
    return metadata.args.some(arg => phoneArgs.includes(arg));
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

      // Check if this is a phone app that needs service injection
      if (this.isPhoneApp(metadata)) {
        // Create sandboxed app for phone apps
        const sandboxedApp = new SandboxedApp(this.a, metadata.name.toLowerCase());

        // Build argument map with logging services
        const argMap: Record<string, any> = {
          'app': sandboxedApp,
          'resources': scopedResources,
          'telephony': this.services.telephony,
          'contacts': this.services.contacts,
          'clock': this.services.clock,
          'notifications': this.services.notifications,
          'storage': this.services.storage,
          'settings': this.services.settings,
          'sms': this.services.sms,
        };

        const args = metadata.args.map(name => argMap[name]);
        await builder(...args);
      } else {
        // Regular app - just pass the App instance
        await builder(this.a);
      }

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
   * Show the Modem Console window for phone app activity
   */
  private showModemConsole(): void {
    if (this.modemWin) {
      // Already open
      return;
    }

    this.a.window({
      title: 'Modem Console',
      width: 500,
      height: 400,
    }, (win) => {
      this.modemWin = win as Window;

      win.setContent(() => {
        this.a.vbox(() => {
          this.a.hbox(() => {
            this.a.label('📡 Baseband Modem - Human Readable Mode');
            this.a.spacer();
            this.a.button('Clear').onClick(() => {
              modemLog.clear();
              this.modemLogLines = [];
              if (this.modemLogLabel) {
                this.modemLogLabel.setText('(log cleared)');
              }
            });
          });

          this.a.separator();

          this.a.label('Legend: → TX (to hardware)  ← RX (from hardware)  • INFO');

          this.a.separator();

          this.a.scroll(() => {
            this.modemLogLabel = this.a.label(this.modemLogLines.join('\n') || '(waiting for phone app activity...)');
          });
        });
      });

      win.show();
    });
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
