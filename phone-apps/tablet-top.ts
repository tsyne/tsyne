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

import { App } from 'tsyne';
import { Window } from 'tsyne';
import { Label, Button } from 'tsyne';
import { enableDesktopMode, disableDesktopMode, ITsyneWindow } from 'tsyne';
import { parseAppMetadata, loadAppBuilder, AppMetadata } from 'tsyne';
import { ALL_APPS } from '../launchers/all-apps';
import { ScopedResourceManager, ResourceManager } from 'tsyne';
import { SandboxedApp } from 'tsyne';
import { Inspector, WidgetNode } from 'tsyne';
import * as path from 'path';
import * as http from 'http';

// Import logging services for phone apps
import {
  modemLog,
  ModemLogEntry,
  createLoggingServices,
} from './logging-services';

// Grid configuration for tablet
const GRID_COLS = 4;
const GRID_ROWS = 4;
const APPS_PER_PAGE = GRID_COLS * GRID_ROWS;

// Tablet layout scale (800px tablet width is same as typical desktop)
const TABLET_LAYOUT_SCALE = 1.0;

// Tablet options
export interface TabletTopOptions {
  /** Number of columns in the grid */
  columns?: number;
  /** Number of rows in the grid */
  rows?: number;
  /** Port for remote debug server (disabled if not set) */
  debugPort?: number;
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
  /** Inspector for widget tree queries */
  private inspector: Inspector | null = null;
  /** Debug HTTP server */
  private debugServer: http.Server | null = null;

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
   * Initialize the tablet by loading apps from registry
   */
  init() {
    // Load metadata from all registered apps
    const apps: AppMetadata[] = [];
    for (const filePath of ALL_APPS) {
      try {
        const metadata = parseAppMetadata(filePath);
        if (metadata) {
          apps.push(metadata);
        }
      } catch {
        // Silently skip apps that fail to load
      }
    }
    apps.sort((a, b) => a.name.localeCompare(b.name));

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

    // Start debug server if port specified
    if (this.options.debugPort) {
      this.startDebugServer(this.options.debugPort);
    }
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
      this.a.getContext().setLayoutScale(TABLET_LAYOUT_SCALE);

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
      this.a.getContext().setLayoutScale(1.0);

      if (createdWindow) {
        this.openApps.set(metadata.filePath, { metadata, tsyneWindow: createdWindow });
        console.log(`Launched: ${metadata.name}`);
      }
    } finally {
      (this.a as any).resources = originalResources;
      this.a.getContext().setResourceScope(null);
      this.a.getContext().setLayoutScale(1.0);
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

  /**
   * Start the remote debug HTTP server
   */
  private startDebugServer(port: number): void {
    this.inspector = new Inspector(this.a.getContext().bridge);

    this.debugServer = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Content-Type', 'application/json');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url || '/', `http://localhost:${port}`);

      try {
        if (url.pathname === '/') {
          res.writeHead(200);
          res.end(JSON.stringify({
            endpoints: {
              '/': 'This index',
              '/windows': 'List all window IDs',
              '/tree': 'Get widget tree for main window',
              '/tree/:windowId': 'Get widget tree for a window',
              '/widget/:id': 'Get single widget by ID (internal or custom)',
              '/widget-at?x=N&y=N': 'Find widget at coordinates',
              '/click?x=N&y=N': 'Click widget at coordinates',
              '/click?id=widgetId': 'Click widget by ID',
              '/type?id=widgetId&text=hello': 'Type text into widget',
              '/apps': 'List open apps',
              '/state': 'Get tablet state',
            }
          }, null, 2));

        } else if (url.pathname === '/windows') {
          const windows = await this.inspector!.listWindows();
          res.writeHead(200);
          res.end(JSON.stringify({ windows }, null, 2));

        } else if (url.pathname === '/tree') {
          if (!this.win) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'No main window' }));
            return;
          }
          const tree = await this.inspector!.getWindowTree(this.win.id);
          res.writeHead(200);
          res.end(JSON.stringify({ tree }, null, 2));

        } else if (url.pathname.startsWith('/tree/')) {
          const windowId = url.pathname.slice(6);
          const tree = await this.inspector!.getWindowTree(windowId);
          res.writeHead(200);
          res.end(JSON.stringify({ tree }, null, 2));

        } else if (url.pathname.startsWith('/widget/')) {
          const widgetId = decodeURIComponent(url.pathname.slice(8));
          if (!this.win) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'No main window' }));
            return;
          }
          const tree = await this.inspector!.getWindowTree(this.win.id);
          const widget = this.inspector!.findById(tree, widgetId)
                      || this.inspector!.findByCustomId(tree, widgetId);
          if (!widget) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Widget not found', id: widgetId }));
            return;
          }
          res.writeHead(200);
          res.end(JSON.stringify({ widget }, null, 2));

        } else if (url.pathname === '/widget-at') {
          const x = parseFloat(url.searchParams.get('x') || '0');
          const y = parseFloat(url.searchParams.get('y') || '0');
          if (!this.win) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'No main window' }));
            return;
          }
          const tree = await this.inspector!.getWindowTree(this.win.id);
          const widget = this.findWidgetAtPoint(tree, x, y);
          res.writeHead(200);
          res.end(JSON.stringify({ x, y, widget: widget || null }, null, 2));

        } else if (url.pathname === '/click') {
          const id = url.searchParams.get('id');
          const x = url.searchParams.get('x');
          const y = url.searchParams.get('y');
          let widgetId = id;
          let clickedWidget: WidgetNode | null = null;

          if (!widgetId && x && y && this.win) {
            const tree = await this.inspector!.getWindowTree(this.win.id);
            clickedWidget = this.findWidgetAtPoint(tree, parseFloat(x), parseFloat(y));
            if (clickedWidget) widgetId = clickedWidget.id;
          }
          if (!widgetId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'No widget found' }));
            return;
          }
          await this.a.getContext().bridge.send('clickWidget', { widgetId });
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, clicked: widgetId, widget: clickedWidget }, null, 2));

        } else if (url.pathname === '/type') {
          const id = url.searchParams.get('id');
          const x = url.searchParams.get('x');
          const y = url.searchParams.get('y');
          const text = url.searchParams.get('text') || '';
          let widgetId = id;
          let targetWidget: WidgetNode | null = null;

          if (!widgetId && x && y && this.win) {
            const tree = await this.inspector!.getWindowTree(this.win.id);
            targetWidget = this.findWidgetAtPoint(tree, parseFloat(x), parseFloat(y));
            if (targetWidget) widgetId = targetWidget.id;
          }
          if (!widgetId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'No widget found' }));
            return;
          }
          await this.a.getContext().bridge.send('typeText', { widgetId, text });
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, typed: text, into: widgetId, widget: targetWidget }, null, 2));

        } else if (url.pathname === '/apps') {
          const apps: any[] = [];
          for (const [id, app] of this.openApps) {
            apps.push({ id, name: app.metadata.name });
          }
          res.writeHead(200);
          res.end(JSON.stringify({ apps }, null, 2));

        } else if (url.pathname === '/state') {
          res.writeHead(200);
          res.end(JSON.stringify({
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            gridCols: this.cols,
            gridRows: this.rows,
            iconCount: this.icons.length,
            openAppCount: this.openApps.size,
          }, null, 2));

        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: String(err) }));
      }
    });

    this.debugServer.listen(port, '0.0.0.0', () => {
      console.log(`[tablet-top] Debug server listening on http://0.0.0.0:${port}`);
    });
  }

  /**
   * Find the deepest widget containing the given absolute coordinates.
   */
  private findWidgetAtPoint(node: WidgetNode, x: number, y: number): WidgetNode | null {
    const inBounds = node.visible !== false &&
      x >= node.absX && x < node.absX + node.w &&
      y >= node.absY && y < node.absY + node.h;
    if (!inBounds) return null;

    if (node.children && node.children.length > 0) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        const childMatch = this.findWidgetAtPoint(node.children[i], x, y);
        if (childMatch) return childMatch;
      }
    }
    return node;
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
  const { app, resolveTransport  } = require('../core/src/index');

  // Check for debug port from environment
  const debugPort = process.env.TSYNE_DEBUG_PORT ? parseInt(process.env.TSYNE_DEBUG_PORT, 10) : undefined;

  app(resolveTransport(), { title: 'Tsyne Tablet' }, (a: App) => {
    buildTabletTop(a, { debugPort });
  });
}
