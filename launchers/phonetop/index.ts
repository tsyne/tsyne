/**
 * Tsyne PhoneTop
 *
 * A phone-style launcher environment for ported Tsyne apps.
 * - Uses a fixed grid layout (3 columns x 4 rows = 12 apps per page)
 * - Moving an icon displaces another icon (swap positions)
 * - Has swipe-style navigation (left/right buttons)
 * - Supports @tsyne-app:args for dependency injection (app, resources)
 *
 * Run with: ./scripts/tsyne src/phonetop.ts
 */

import { App } from 'tsyne';
import { Window } from 'tsyne';
import { Label, Button, VBox } from 'tsyne';
import { enablePhoneMode, disablePhoneMode, StackPaneAdapter } from 'tsyne';
import { parseAppMetadata, loadAppBuilder, loadAppBuilderCached, AppMetadata } from 'tsyne';
import { ALL_APPS } from '../all-apps';
import { ScopedResourceManager, ResourceManager } from 'tsyne';
import { Inspector } from 'tsyne';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { BridgeKeyboardController } from '../../phone-apps/keyboard/controller';
import { buildKeyboard } from '../../phone-apps/keyboard/en-gb/keyboard';
import {
  GridPosition,
  GridIcon,
  Folder,
  GridItem,
  CATEGORY_CONFIG
} from './phonetop-groups';
import {
  PhoneServices,
  MockContactsService,
  MockTelephonyService,
  MockSMSService
} from '../../phone-apps/services';
import { MockRecordingService } from '../../phone-apps/audio-recorder/recording-service';

// Build timestamp - updated at bundle time for debugging APK versions
const BUILD_DATE = new Date();
const BUILD_TIMESTAMP = BUILD_DATE.toLocaleString('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

// Grid configuration for phone (portrait orientation)
const GRID_COLS_PORTRAIT = 3;
const GRID_ROWS_PORTRAIT = 4;

// Grid configuration for landscape orientation
const GRID_COLS_LANDSCAPE = 5;
const GRID_ROWS_LANDSCAPE = 2;

// Phone layout scale - varies by orientation
const PHONE_LAYOUT_SCALE_PORTRAIT = 0.5;
const PHONE_LAYOUT_SCALE_LANDSCAPE = 0.8;  // Larger scale in landscape to use space better

// Icon size for phone (slightly smaller than desktop's 80px)
// This is the base size - will be scaled up for high-DPI screens
const ICON_SIZE_BASE = 64;

// Default icon size (can be overridden via options)
let ICON_SIZE = 64;

// Default app icon (used when no icon is specified)
const DEFAULT_ICON = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="6" r="1"/><circle cx="9" cy="6" r="1"/></svg>`;

/** Static app definition for bundled apps (Android, iOS) */
export interface StaticAppDefinition {
  /** Display name for the app */
  name: string;
  /** The builder function (pre-imported) */
  builder: (...args: any[]) => void | Promise<void>;
  /** SVG icon content */
  icon?: string;
  /** App category for grouping */
  category?: string;
  /** Builder function arguments in order (default: ['app']) */
  args?: string[];
  /** Instance count: 'one' (default), 'many', or 'desktop-many' */
  count?: 'one' | 'many' | 'desktop-many';
}

// Phone options
export interface PhoneTopOptions {
  /** Static apps to include (for Android/iOS where dynamic loading isn't available) */
  staticApps?: StaticAppDefinition[];
  /** Number of columns in the grid */
  columns?: number;
  /** Number of rows in the grid */
  rows?: number;
  /** Port for remote debug server (disabled if not set) */
  debugPort?: number;
  /** Use fullscreen mode (let driver determine size, for Android embedded mode) */
  fullScreen?: boolean;
  /** Icon scale factor (default 1.0, use 2.0-3.0 for high-DPI screens) */
  iconScale?: number;
  /** Base font size in pixels (default 14, use 24-32 for high-DPI phone screens) */
  fontSize?: number;
  /** Injected services - if not provided, uses mock services for desktop testing */
  services?: PhoneServices;
  /** Use ImageButton for app icons (default true). Set false for older bridges without ImageButton support. */
  useImageButton?: boolean;
}

interface RunningApp {
  metadata: AppMetadata;
  adapter: StackPaneAdapter;  // The window adapter with captured content
  contentBuilt: boolean;      // Whether content has been built (for state preservation)
  resourceScope: string;      // The resource scope for this app instance
  scopedResources: ScopedResourceManager;  // The scoped resource manager for this app
}

class PhoneTop {
  private a: App;
  private win: Window | null = null;
  private icons: GridIcon[] = [];  // All app icons (for reference)
  private gridItems: GridItem[] = [];  // Items on the home grid (apps + folders)
  private folders: Map<string, Folder> = new Map();  // Folders by category
  private openFolder: Folder | null = null;  // Currently open folder
  private runningApps: Map<string, RunningApp> = new Map();
  private frontAppId: string | null = null;  // Currently visible app (null = home)
  private currentPage: number = 0;
  private totalPages: number = 1;
  private pageIndicatorLabels: Label[] = [];
  /** Current page within an open folder */
  private folderCurrentPage: number = 0;
  /** Total pages in the currently open folder */
  private folderTotalPages: number = 1;
  private options: PhoneTopOptions;
  /** Injected services (IoC) */
  private services: PhoneServices;
  private cols: number;
  private rows: number;
  private appsPerPage: number;
  private appInstanceCounter: Map<string, number> = new Map();
  /** Cache of registered icon resources keyed by source file */
  private iconResourceCache: Map<string, string> = new Map();
  /** Cache of registered folder icon resources keyed by category */
  private folderIconCache: Map<string, string> = new Map();
  /** Keyboard controller using bridge injection for cross-app typing */
  private keyboardController: BridgeKeyboardController | null = null;
  /** Whether the virtual keyboard is visible */
  private keyboardVisible: boolean = false;
  /** Keyboard container for show/hide */
  private keyboardContainer: VBox | null = null;
  /** Home screen container (built once, shown/hidden) */
  private homeContainer: VBox | null = null;
  /** Home screen grid container (rebuilt on page change) */
  private homeGridContainer: VBox | null = null;
  /** Folder view container (built once per folder, shown/hidden) */
  private folderContainer: VBox | null = null;
  /** Folder grid container (rebuilt on page change within folder) */
  private folderGridContainer: VBox | null = null;
  /** App view container (for running apps) */
  private appContainer: VBox | null = null;
  /** Whether keyboard has been built (only build once) */
  private keyboardBuilt: boolean = false;
  /** Current window dimensions */
  private windowWidth: number = 540;
  private windowHeight: number = 960;
  /** Whether currently in landscape orientation */
  private isLandscape: boolean = false;
  /** Font size for UI text (default 14, larger for high-DPI) */
  private fontSize: number = 14;
  /** Use ImageButton for icons (false for older bridges without ImageButton support) */
  private useImageButton: boolean = true;
  /** Inspector for widget tree queries */
  private inspector: Inspector | null = null;
  /** Debug HTTP server */
  private debugServer: http.Server | null = null;
  /** Debug server authentication token */
  private debugToken: string | null = null;

  constructor(app: App, options: PhoneTopOptions = {}) {
    this.a = app;
    this.options = options;

    // Services are injected (IoC) - composition root decides implementation
    // If not provided, caller is responsible for providing them
    if (!options.services) {
      throw new Error('PhoneTop requires services to be injected. Use buildPhoneTop() or provide services in options.');
    }
    this.services = options.services;

    // Apply icon scale for high-DPI screens (e.g., Android fullscreen)
    const iconScale = options.iconScale || 1.0;

    // Set font size (larger for high-DPI phone screens)
    this.fontSize = options.fontSize || 14;
    console.log(`[phonetop] Font size: ${this.fontSize}px`);

    // ImageButton support (default true, set false for older bridges)
    this.useImageButton = options.useImageButton !== false;
    console.log(`[phonetop] useImageButton: ${this.useImageButton}`);

    ICON_SIZE = Math.round(ICON_SIZE_BASE * iconScale);

    // Initialize with portrait defaults (will be updated on window creation)
    this.cols = options.columns || GRID_COLS_PORTRAIT;
    this.rows = options.rows || GRID_ROWS_PORTRAIT;
    this.appsPerPage = this.cols * this.rows;

    // Create bridge keyboard controller for cross-app keystroke injection
    this.keyboardController = new BridgeKeyboardController(this.a.getContext().bridge);

    // Listen for global textInputFocus events from any Entry widget
    // This enables showing/hiding the virtual keyboard when any text field is focused
    this.a.getContext().bridge.on('textInputFocus', (data: unknown) => {
      const eventData = data as { focused: boolean };
      this.handleFocusChange(eventData.focused);
    });
  }

  /**
   * Load app metadata from a resolved file path, returning null if it fails
   */
  private loadAppMetadata(filePath: string): AppMetadata | null {
    try {
      return parseAppMetadata(filePath);
    } catch {
      return null;
    }
  }

  /**
   * Update orientation based on window dimensions
   * Returns true if orientation changed
   */
  private updateOrientation(width: number, height: number): boolean {
    const wasLandscape = this.isLandscape;
    this.windowWidth = width;
    this.windowHeight = height;
    this.isLandscape = width > height;

    // Update grid configuration based on orientation (unless overridden by options)
    if (!this.options.columns && !this.options.rows) {
      if (this.isLandscape) {
        this.cols = GRID_COLS_LANDSCAPE;
        this.rows = GRID_ROWS_LANDSCAPE;
      } else {
        this.cols = GRID_COLS_PORTRAIT;
        this.rows = GRID_ROWS_PORTRAIT;
      }
      this.appsPerPage = this.cols * this.rows;
    }

    const orientationChanged = wasLandscape !== this.isLandscape;
    if (orientationChanged) {
      console.log(`[phonetop] Orientation changed to ${this.isLandscape ? 'landscape' : 'portrait'} (${width}x${height})`);
    }
    return orientationChanged;
  }

  /**
   * Get the current layout scale based on orientation
   */
  private getLayoutScale(): number {
    return this.isLandscape ? PHONE_LAYOUT_SCALE_LANDSCAPE : PHONE_LAYOUT_SCALE_PORTRAIT;
  }

  /**
   * Handle focus change from Entry widgets
   * Shows keyboard when an Entry gains focus, hides when it loses focus
   */
  handleFocusChange(focused: boolean) {
    if (focused && !this.keyboardVisible) {
      this.showKeyboard();
    } else if (!focused && this.keyboardVisible) {
      this.hideKeyboard();
    }
  }

  /**
   * Show the virtual keyboard
   */
  private showKeyboard() {
    if (this.keyboardContainer) {
      this.keyboardVisible = true;
      this.keyboardContainer.show();
    }
  }

  /**
   * Hide the virtual keyboard
   */
  private hideKeyboard() {
    if (this.keyboardContainer) {
      this.keyboardVisible = false;
      this.keyboardContainer.hide();
    }
  }

  /**
   * Render an inline SVG into a PNG data URI for phone icons
   */
  private renderSvgIconToDataUri(svg: string, size: number = ICON_SIZE): string {
    const normalized = this.normalizeSvg(svg, size);
    const renderer = new Resvg(normalized, {
      fitTo: {
        mode: 'width',
        value: size
      },
      background: 'rgba(0,0,0,0)'
    });
    const png = renderer.render().asPng();
    const buffer = Buffer.from(png);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  /**
   * Ensure inline SVG has the basics resvg expects (xmlns, width/height)
   */
  private normalizeSvg(svg: string, size: number): string {
    let s = svg.trim();
    if (!s.toLowerCase().startsWith('<svg')) {
      return s;
    }

    const match = s.match(/^<svg[^>]*>/i);
    if (!match) {
      return s;
    }

    const originalTag = match[0];
    const originalTagLength = originalTag.length;
    let tag = originalTag;

    const ensureAttr = (attr: string, value: string) => {
      if (tag.toLowerCase().includes(`${attr.toLowerCase()}=`)) {
        return;
      }
      tag = tag.slice(0, -1) + ` ${attr}="${value}">`;
    };

    ensureAttr('xmlns', 'http://www.w3.org/2000/svg');
    ensureAttr('width', size.toString());
    ensureAttr('height', size.toString());
    if (!/viewbox=/i.test(tag)) {
      ensureAttr('viewBox', `0 0 ${size} ${size}`);
    }
    ensureAttr('preserveAspectRatio', 'xMidYMid meet');

    // Use original tag length to correctly slice the rest of the SVG content
    s = tag + s.slice(originalTagLength);

    // Replace "currentColor" with a visible color - resvg doesn't resolve CSS currentColor
    s = s.replace(/currentColor/gi, '#333333');

    return s;
  }

  /**
   * Get a sanitized key for an app name (for use in resource names)
   */
  private getIconKey(appName: string): string {
    return appName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  /**
   * Convert an app's @tsyne-app:icon into a registered resource
   */
  private async prepareIconResource(metadata: AppMetadata): Promise<{ resourceName?: string }> {
    const cacheKey = metadata.filePath;
    if (this.iconResourceCache.has(cacheKey)) {
      return { resourceName: this.iconResourceCache.get(cacheKey)! };
    }

    if (!metadata.iconIsSvg || !metadata.icon) {
      return {};
    }

    try {
      const baseName = path.basename(metadata.filePath, '.ts');
      const resourceName = `phone-icon-${this.getIconKey(`${metadata.name}-${baseName}`)}`;

      // Register icon at standard size
      const dataUri = this.renderSvgIconToDataUri(metadata.icon, ICON_SIZE);
      await this.a.resources.registerResource(resourceName, dataUri);

      this.iconResourceCache.set(cacheKey, resourceName);
      return { resourceName };
    } catch (err) {
      console.error(`Failed to register phone icon for ${metadata.name}:`, err);
      return {};
    }
  }

  /**
   * Prepare folder icon resources (render SVG to image at ICON_SIZE)
   */
  private async prepareFolderIcons(): Promise<void> {
    for (const [category, config] of Object.entries(CATEGORY_CONFIG)) {
      if (this.folderIconCache.has(category)) {
        continue;
      }

      try {
        const resourceName = `phone-folder-${category}`;
        const dataUri = this.renderSvgIconToDataUri(config.icon, ICON_SIZE);
        await this.a.resources.registerResource(resourceName, dataUri);
        this.folderIconCache.set(category, resourceName);
      } catch (err) {
        console.error(`Failed to register folder icon for ${category}:`, err);
      }
    }
  }

  /**
   * Create a label with the configured font size
   */
  private sizedLabel(text: string, id?: string): Label {
    console.log(`[phonetop] sizedLabel: "${text}" with fontSize=${this.fontSize}`);
    const label = this.a.label(text, { textSize: this.fontSize });
    if (id) label.withId(id);
    return label;
  }

  /**
   * Create a button with the configured font size
   */
  private sizedButton(text: string, id?: string): Button {
    const btn = this.a.button(text, { textSize: this.fontSize });
    if (id) btn.withId(id);
    return btn;
  }

  /**
   * Initialize the phone by loading apps from registry and grouping into folders
   */
  async init() {
    // Load metadata from all registered apps
    const apps: AppMetadata[] = [];
    for (const filePath of ALL_APPS) {
      const metadata = this.loadAppMetadata(filePath);
      if (metadata) {
        apps.push(metadata);
      }
    }
    apps.sort((a, b) => a.name.localeCompare(b.name));

    // Prepare all app icons
    for (const metadata of apps) {
      const { resourceName } = await this.prepareIconResource(metadata);
      this.icons.push({
        metadata,
        position: { page: 0, row: 0, col: 0 },  // Will be set later
        resourceName
      });
    }

    // Process static apps (for Android/iOS where dynamic loading isn't available)
    if (this.options.staticApps && this.options.staticApps.length > 0) {
      console.log(`[phonetop] Processing ${this.options.staticApps.length} static apps`);
      for (const staticApp of this.options.staticApps) {
        // Create a synthetic AppMetadata for the static app
        const metadata: AppMetadata = {
          filePath: `static://${staticApp.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: staticApp.name,
          icon: staticApp.icon || DEFAULT_ICON,
          iconIsSvg: staticApp.icon ? staticApp.icon.trim().toLowerCase().startsWith('<svg') : true,
          category: staticApp.category,
          builder: 'staticBuilder',  // Not used - we have the function directly
          count: staticApp.count || 'one',
          args: staticApp.args || ['app']
        };

        const { resourceName } = await this.prepareIconResource(metadata);
        this.icons.push({
          metadata,
          position: { page: 0, row: 0, col: 0 },  // Will be set later
          resourceName,
          staticBuilder: staticApp.builder
        });
      }
    }

    // Group apps by category
    const appsByCategory = new Map<string, GridIcon[]>();
    const uncategorizedApps: GridIcon[] = [];

    for (const icon of this.icons) {
      const category = icon.metadata.category;
      if (category && CATEGORY_CONFIG[category]) {
        if (!appsByCategory.has(category)) {
          appsByCategory.set(category, []);
        }
        appsByCategory.get(category)!.push(icon);
      } else {
        uncategorizedApps.push(icon);
      }
    }

    // Create folders for categories with apps
    this.folders.clear();
    for (const [category, categoryApps] of appsByCategory) {
      const config = CATEGORY_CONFIG[category];
      this.folders.set(category, {
        name: config.displayName,
        category,
        apps: categoryApps,
        position: { page: 0, row: 0, col: 0 }  // Will be set during layout
      });
    }

    // Prepare folder icons (render SVG to images)
    await this.prepareFolderIcons();

    // Build grid items: folders first (sorted by name), then uncategorized apps
    this.gridItems = [];

    // Add folders
    const sortedFolders = Array.from(this.folders.values())
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const folder of sortedFolders) {
      this.gridItems.push({ type: 'folder', folder });
    }

    // Add uncategorized apps
    for (const icon of uncategorizedApps) {
      this.gridItems.push({ type: 'app', icon });
    }

    // Position grid items across pages
    this.layoutGridItems();

    console.log(`Found ${apps.length} apps: ${this.folders.size} folders, ${uncategorizedApps.length} uncategorized`);

    // Start debug server if port specified
    if (this.options.debugPort) {
      this.startDebugServer(this.options.debugPort);
    }
  }

  /**
   * Start the remote debug HTTP server
   */
  private startDebugServer(port: number): void {
    this.inspector = new Inspector(this.a.getContext().bridge);

    // Use pre-configured token or generate a random one
    this.debugToken = process.env.TSYNE_DEBUG_TOKEN || crypto.randomBytes(16).toString('hex');
    console.log(`[phonetop] Debug token: ${this.debugToken}`);

    this.debugServer = http.createServer(async (req, res) => {
      // CORS headers for cross-origin requests
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Content-Type', 'application/json');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url || '/', `http://localhost:${port}`);

      // Check authentication token (query param or header)
      const tokenParam = url.searchParams.get('token');
      const tokenHeader = req.headers['x-debug-token'] as string | undefined;
      const providedToken = tokenParam || tokenHeader;

      if (providedToken !== this.debugToken) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized - invalid or missing token' }));
        return;
      }

      try {
        if (url.pathname === '/') {
          // Index - list available endpoints
          res.writeHead(200);
          res.end(JSON.stringify({
            endpoints: {
              '/': 'This index',
              '/windows': 'List all window IDs',
              '/tree/:windowId': 'Get widget tree for a window',
              '/tree': 'Get widget tree for main window',
              '/widget/:id': 'Get single widget by ID (internal or custom)',
              '/widget-at?x=N&y=N': 'Find widget at absolute coordinates',
              '/click?x=N&y=N': 'Click widget at coordinates',
              '/click?id=widgetId': 'Click widget by ID',
              '/type?id=widgetId&text=hello': 'Type text into widget',
              '/type?x=N&y=N&text=hello': 'Type text into widget at coordinates',
              '/apps': 'List running apps',
              '/state': 'Get phonetop state (current page, open folder, etc.)',
              '/screenshot': 'Capture window screenshot (returns base64 PNG)',
              '/phonetop/home': 'Go to home screen',
              '/app/quit': 'Quit front app (or /app/quit?id=appId for specific app)',
              '/app/switchTo?id=appId': 'Bring app to front',
            }
          }, null, 2));

        } else if (url.pathname === '/windows') {
          const windows = await this.inspector!.listWindows();
          res.writeHead(200);
          res.end(JSON.stringify({ windows }, null, 2));

        } else if (url.pathname === '/tree') {
          // Get tree for main window
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

        } else if (url.pathname === '/apps') {
          const apps: any[] = [];
          for (const [id, app] of this.runningApps) {
            apps.push({
              id,
              name: app.metadata.name,
              isFront: id === this.frontAppId,
              resourceScope: app.resourceScope,
            });
          }
          res.writeHead(200);
          res.end(JSON.stringify({ apps, frontAppId: this.frontAppId }, null, 2));

        } else if (url.pathname === '/state') {
          res.writeHead(200);
          res.end(JSON.stringify({
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            openFolder: this.openFolder ? {
              name: this.openFolder.name,
              category: this.openFolder.category,
              appCount: this.openFolder.apps.length,
            } : null,
            frontAppId: this.frontAppId,
            runningAppCount: this.runningApps.size,
            gridItemCount: this.gridItems.length,
            folderCount: this.folders.size,
            isLandscape: this.isLandscape,
            windowSize: { width: this.windowWidth, height: this.windowHeight },
          }, null, 2));

        } else if (url.pathname === '/widget-at') {
          // Find widget at absolute x,y coordinates
          const x = parseFloat(url.searchParams.get('x') || '0');
          const y = parseFloat(url.searchParams.get('y') || '0');

          if (!this.win) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'No main window' }));
            return;
          }

          const tree = await this.inspector!.getWindowTree(this.win.id);
          const widget = this.findWidgetAtPoint(tree, x, y);

          if (widget) {
            res.writeHead(200);
            res.end(JSON.stringify({
              x, y,
              widget: {
                id: widget.id,
                customId: widget.customId,
                type: widget.type,
                widgetType: widget.widgetType,
                text: widget.text,
                absX: widget.absX,
                absY: widget.absY,
                w: widget.w,
                h: widget.h,
                visible: widget.visible,
              }
            }, null, 2));
          } else {
            res.writeHead(200);
            res.end(JSON.stringify({ x, y, widget: null, message: 'No widget at this point' }, null, 2));
          }

        } else if (url.pathname === '/click') {
          // Click a widget by ID or coordinates
          const id = url.searchParams.get('id');
          const x = url.searchParams.get('x');
          const y = url.searchParams.get('y');

          let widgetId = id;
          let clickedWidget: any = null;

          // If coordinates provided, find widget at that point
          if (!widgetId && x && y) {
            if (!this.win) {
              res.writeHead(404);
              res.end(JSON.stringify({ error: 'No main window' }));
              return;
            }
            const tree = await this.inspector!.getWindowTree(this.win.id);
            clickedWidget = this.findWidgetAtPoint(tree, parseFloat(x), parseFloat(y));
            if (clickedWidget) {
              widgetId = clickedWidget.id;
            }
          }

          if (!widgetId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'No widget found. Provide id= or x=&y= params' }));
            return;
          }

          await this.a.getContext().bridge.send('clickWidget', { widgetId });
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            clicked: widgetId,
            widget: clickedWidget ? {
              id: clickedWidget.id,
              type: clickedWidget.type,
              text: clickedWidget.text,
            } : undefined
          }, null, 2));

        } else if (url.pathname === '/type') {
          // Type text into a widget by ID or coordinates
          const id = url.searchParams.get('id');
          const x = url.searchParams.get('x');
          const y = url.searchParams.get('y');
          const text = url.searchParams.get('text') || '';

          let widgetId = id;
          let targetWidget: any = null;

          // If coordinates provided, find widget at that point
          if (!widgetId && x && y) {
            if (!this.win) {
              res.writeHead(404);
              res.end(JSON.stringify({ error: 'No main window' }));
              return;
            }
            const tree = await this.inspector!.getWindowTree(this.win.id);
            targetWidget = this.findWidgetAtPoint(tree, parseFloat(x), parseFloat(y));
            if (targetWidget) {
              widgetId = targetWidget.id;
            }
          }

          if (!widgetId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'No widget found. Provide id= or x=&y= params' }));
            return;
          }

          await this.a.getContext().bridge.send('typeText', { widgetId, text });
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            typed: text,
            into: widgetId,
            widget: targetWidget ? {
              id: targetWidget.id,
              type: targetWidget.type,
            } : undefined
          }, null, 2));

        } else if (url.pathname === '/screenshot') {
          // Capture window screenshot and return as base64 PNG
          if (!this.win) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'No main window' }));
            return;
          }

          // Use a temp file for capture (os.tmpdir() works cross-platform)
          const tempPath = path.join(os.tmpdir(), `tsyne-screenshot-${Date.now()}.png`);

          try {
            await this.win.screenshot(tempPath);

            // Read file and encode as base64
            const imageBuffer = fs.readFileSync(tempPath);
            const base64 = imageBuffer.toString('base64');

            // Clean up temp file
            fs.unlinkSync(tempPath);

            res.writeHead(200);
            res.end(JSON.stringify({
              success: true,
              format: 'png',
              encoding: 'base64',
              width: this.windowWidth,
              height: this.windowHeight,
              data: base64,
            }, null, 2));
          } catch (screenshotErr) {
            // Clean up on error
            try { fs.unlinkSync(tempPath); } catch {}
            res.writeHead(500);
            res.end(JSON.stringify({ error: `Screenshot failed: ${screenshotErr}` }));
          }

        } else if (url.pathname === '/phonetop/home') {
          // Go to home screen
          this.goHome();
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            action: 'home',
            frontAppId: this.frontAppId,
          }, null, 2));

        } else if (url.pathname === '/app/switchTo') {
          // Bring an app to the front
          const appId = url.searchParams.get('id');

          if (!appId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing id= param' }));
            return;
          }

          if (!this.runningApps.has(appId)) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'App not found', id: appId }));
            return;
          }

          const appName = this.runningApps.get(appId)?.metadata.name;
          this.switchToApp(appId);
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            action: 'switchTo',
            appId,
            appName,
          }, null, 2));

        } else if (url.pathname === '/app/quit') {
          // Quit the front app or a specific app by ID
          const appId = url.searchParams.get('id') || this.frontAppId;

          if (!appId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'No app to quit (no front app and no id= param)' }));
            return;
          }

          if (!this.runningApps.has(appId)) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'App not found', id: appId }));
            return;
          }

          const appName = this.runningApps.get(appId)?.metadata.name;
          this.quitApp(appId);
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            action: 'quit',
            quitAppId: appId,
            quitAppName: appName,
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
      console.log(`[phonetop] Debug server listening on http://0.0.0.0:${port}`);
    });
  }

  /**
   * Find the deepest widget containing the given absolute coordinates.
   * Returns the most specific (deepest) visible widget at that point.
   * If the deepest widget has a path-style ID (e.g., "root.0.0.1"), walks up
   * the parent chain to find the nearest clickable ancestor with a bridge ID.
   */
  private findWidgetAtPoint(node: any, x: number, y: number, clickableParent?: any): any | null {
    // Check if point is within this widget's bounds
    const inBounds = node.visible !== false &&
      x >= node.absX &&
      x < node.absX + node.w &&
      y >= node.absY &&
      y < node.absY + node.h;

    if (!inBounds) {
      return null;
    }

    // Track clickable parents (widgets with bridge-style IDs that can be clicked)
    // Bridge IDs start with _ (e.g., "_image_xyz") vs path-style IDs (e.g., "root.0.0.1")
    const isBridgeId = node.id && node.id.startsWith('_');
    const isClickable = node.type === 'ClickableContainer' || node.type === 'Button' || node.type === 'TsyneButton';
    const newClickableParent = (isBridgeId && isClickable) ? node : clickableParent;

    // Check children (depth-first) - return deepest match
    if (node.children && node.children.length > 0) {
      // Search in reverse order (last child is often on top)
      for (let i = node.children.length - 1; i >= 0; i--) {
        const childMatch = this.findWidgetAtPoint(node.children[i], x, y, newClickableParent);
        if (childMatch) {
          return childMatch;
        }
      }
    }

    // No child contains the point, but this widget does
    // If this widget has a path-style ID (not clickable), return the clickable parent instead
    const hasPathStyleId = node.id && node.id.startsWith('root.');
    if (hasPathStyleId && newClickableParent) {
      return newClickableParent;
    }

    return node;
  }

  /**
   * Layout grid items across pages
   */
  private layoutGridItems() {
    let page = 0;
    let row = 0;
    let col = 0;

    for (const item of this.gridItems) {
      const position = { page, row, col };

      if (item.type === 'folder') {
        item.folder.position = position;
      } else {
        item.icon.position = position;
      }

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

    // Ensure current page is valid
    if (this.currentPage >= this.totalPages) {
      this.currentPage = this.totalPages - 1;
    }
  }

  /**
   * Re-layout grid items when grid configuration changes (orientation change)
   * Preserves the order but repositions for new grid dimensions
   */
  private relayoutIconsForNewGrid() {
    this.layoutGridItems();
    console.log(`[phonetop] Relaid out ${this.gridItems.length} items for ${this.cols}x${this.rows} grid across ${this.totalPages} pages`);
  }

  /**
   * Build the phone UI
   */
  async build() {

    // Log build timestamp for debugging APK versions
    console.log(`[phonetop] BUILD: ${BUILD_TIMESTAMP}`);

    // Use phone-sized window or fullscreen for embedded mode (Android)
    const windowOpts: { title: string; width?: number; height?: number; padded?: boolean } = { title: 'Tsyne Phone' };
    if (this.options.fullScreen) {
      // Fullscreen mode: no padding, let driver determine size
      windowOpts.padded = false;
    } else {
      // Default to phone-sized window (portrait)
      windowOpts.width = 540;
      windowOpts.height = 960;
    }
    this.a.window(windowOpts, (win) => {
      this.win = win as Window;

      // Set initial orientation based on mode
      // In fullScreen mode (Android embedded), use typical phone dimensions
      // onResize will correct this when the actual size is known
      if (this.options.fullScreen) {
        // Default to Pixel 6a dimensions for Android embedded mode
        this.updateOrientation(1080, 2400);
      } else {
        // Desktop/testing mode - use smaller window
        this.updateOrientation(540, 960);
      }

      // Listen for window resize to detect orientation changes
      win.onResize((width, height) => {
        const orientationChanged = this.updateOrientation(width, height);
        if (orientationChanged) {
          // Re-layout icons for new grid configuration
          this.relayoutIconsForNewGrid();
          // Rebuild the appropriate grid to reflect new orientation
          if (this.frontAppId !== null) {
            // If an app is open, rebuild its content with new layout
            const runningApp = this.runningApps.get(this.frontAppId);
            if (runningApp) {
              this.showAppContent(runningApp);
            }
          } else if (this.openFolder) {
            // Folder is open - rebuild folder grid
            this.rebuildFolderGrid();
          } else {
            // Home screen - rebuild home grid
            this.rebuildHomeGrid();
          }
        }
      });

      // Set up menu (minimal for phone)
      win.setMainMenu([
        {
          label: 'Settings',
          items: [
            { label: 'Light Theme', onSelected: () => this.a.setTheme('light') },
            { label: 'Dark Theme', onSelected: () => this.a.setTheme('dark') }
          ]
        }
      ]);

      // Create persistent root structure ONCE - all containers built once, show/hide for navigation
      // CRITICAL: Using show/hide instead of removeAll/add prevents widgets from being
      // destroyed during their own tap callbacks, which was causing the "tap twice" bug
      win.setContent(() => {
        this.a.vbox(() => {
          // Navigation stack: home, folder, and app views layered
          this.a.stack(() => {
            // Home screen - built ONCE, shown when no folder/app is open
            this.homeContainer = this.a.vbox(() => {
              this.buildHomeScreen();
            });

            // Folder view - populated when folder is opened
            this.folderContainer = this.a.vbox(() => {
              // Content added when folder is opened
            });
            this.folderContainer.hide();  // Start hidden

            // App view - populated when app is launched
            this.appContainer = this.a.vbox(() => {
              // Content added when app is launched
            });
            this.appContainer.hide();  // Start hidden
          });

          // Keyboard container - built ONCE and reused
          this.keyboardContainer = this.a.vbox(() => {
            this.a.separator();
            if (this.keyboardController) {
              buildKeyboard(this.a, this.keyboardController as any);
            }
          });
          this.keyboardContainer.hide();  // Start hidden
          this.keyboardBuilt = true;
        });
      });
    });
  }

  /**
   * Build the home screen content (app grid + navigation)
   * Called once during initialization
   *
   * Structure:
   * - homeGridContainer: contains app grid + page indicator (rebuilt on page change)
   * - Navigation buttons: fixed, never rebuilt (avoids destroying during tap)
   */
  private buildHomeScreen() {
    this.a.border({
      top: () => {
        // Build timestamp - visible proof of which APK version is running
        this.sizedLabel(`Build: ${BUILD_TIMESTAMP}`, 'build-timestamp');
      },
      center: () => {
        // Use border layout so grid stays at top
        // Border's "top" takes only what it needs, "center" absorbs remaining space
        this.a.border({
          top: () => {
            // Grid container - the vbox that gets rebuilt on page change
            this.homeGridContainer = this.a.vbox(() => {
              this.createAppGrid();
              // Page dots indicator (part of scrollable area)
              this.createPageIndicator();
            });
          },
          center: () => {
            // Empty center absorbs vertical space - like Swing's BorderLayout
            this.a.spacer();
          }
        });
      },
      bottom: () => {
        // Navigation buttons - FIXED, never rebuilt
        // This prevents destroying buttons during their tap callbacks
        this.a.hbox(() => {
          this.sizedButton('< Swipe Left', 'swipeLeft').onClick(() => this.previousPage());
          this.a.spacer();
          this.sizedButton('Swipe Right >', 'swipeRight').onClick(() => this.nextPage());
        });
      }
    });
  }

  /**
   * Open a folder to show its contents
   * Uses show/hide instead of rebuilding - home screen stays intact
   */
  private openFolderView(folder: Folder) {
    this.openFolder = folder;
    this.folderCurrentPage = 0;

    // Build folder content (rebuild each time since different folders)
    if (this.folderContainer) {
      this.folderContainer.removeAll();
      this.folderContainer.add(() => {
        this.buildFolderScreen(folder);
      });
    }

    // Hide home, show folder
    this.homeContainer?.hide();
    this.folderContainer?.show();
  }

  /**
   * Close the currently open folder
   * Uses show/hide - home screen was never destroyed
   */
  private closeFolder() {
    this.openFolder = null;
    this.folderCurrentPage = 0;

    // Hide folder, show home (home was never destroyed!)
    this.folderContainer?.hide();
    this.homeContainer?.show();
  }

  /**
   * Build folder screen content
   * Structure similar to home screen:
   * - Header: folder name/icon (fixed)
   * - folderGridContainer: app grid + page indicator (rebuilt on page change)
   * - Navigation buttons: fixed (avoids destroying during tap)
   */
  private buildFolderScreen(folder: Folder) {
    const resourceName = this.folderIconCache.get(folder.category);

    // Calculate total pages for this folder
    const totalApps = folder.apps.length;
    this.folderTotalPages = Math.ceil(totalApps / this.appsPerPage);

    this.a.border({
      top: () => {
        this.a.vbox(() => {
          this.a.center(() => {
            this.a.hbox(() => {
              if (resourceName) {
                this.a.image({ resource: resourceName, fillMode: 'original' });
              } else {
                this.sizedLabel('📁');
              }
              this.sizedLabel(` ${folder.name}`);
              this.sizedLabel(` (${folder.apps.length} apps)`);
            });
          });
          this.a.separator();
        });
      },
      center: () => {
        // Grid container - can be rebuilt on page change
        this.folderGridContainer = this.a.vbox(() => {
          this.createFolderView(folder);
          if (this.folderTotalPages > 1) {
            this.createFolderPageIndicator();
          }
        });
      },
      bottom: () => {
        // Navigation buttons - FIXED, never rebuilt
        this.a.hbox(() => {
          this.sizedButton('← Back').onClick(() => this.closeFolder());
          this.a.spacer();
          if (this.folderTotalPages > 1) {
            this.sizedButton('<', 'folderPrev').onClick(() => this.previousFolderPage());
            this.sizedButton('>', 'folderNext').onClick(() => this.nextFolderPage());
          }
        });
      }
    });
  }

  /**
   * Create the folder contents view (paginated grid, same layout as home screen)
   */
  private createFolderView(folder: Folder) {
    // Calculate pages for this folder
    const totalApps = folder.apps.length;
    this.folderTotalPages = Math.ceil(totalApps / this.appsPerPage);

    // Ensure current folder page is valid
    if (this.folderCurrentPage >= this.folderTotalPages) {
      this.folderCurrentPage = Math.max(0, this.folderTotalPages - 1);
    }

    // Get apps for current folder page
    const startIndex = this.folderCurrentPage * this.appsPerPage;
    const pageApps = folder.apps.slice(startIndex, startIndex + this.appsPerPage);

    // Direct grid - same layout as home screen
    this.a.grid(this.cols, () => {
      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          const index = row * this.cols + col;
          if (index < pageApps.length) {
            this.createAppIcon(pageApps[index]);
          } else {
            this.a.label('');  // Empty cell
          }
        }
      }
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
   * Create the app grid for current page (shows folders and uncategorized apps)
   */
  private createAppGrid() {
    // Get items for current page
    const pageItems = this.gridItems.filter(item => {
      const pos = item.type === 'folder' ? item.folder.position : item.icon.position;
      return pos.page === this.currentPage;
    });

    // Create grid
    this.a.grid(this.cols, () => {
      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          const item = pageItems.find(i => {
            const pos = i.type === 'folder' ? i.folder.position : i.icon.position;
            return pos.row === row && pos.col === col;
          });

          if (item) {
            if (item.type === 'folder') {
              this.createFolderIcon(item.folder);
            } else {
              this.createAppIcon(item.icon);
            }
          } else {
            // Empty cell
            this.a.label('');
          }
        }
      }
    });
  }

  /**
   * Create a folder icon showing an SVG-rendered image
   * Uses show/hide navigation - tapping opens folder container without destroying home
   */
  private createFolderIcon(folder: Folder) {
    const displayName = this.truncateName(folder.name);
    const resourceName = this.folderIconCache.get(folder.category);

    this.a.center(() => {
      if (resourceName && this.useImageButton) {
        // Use ImageButton for native tap handling (when supported)
        this.a.imageButton({
          resource: resourceName,
          text: displayName,
          textSize: this.fontSize
        })
          .withId(`folder-${folder.category}`)
          .onClick(() => this.openFolderView(folder));
      } else {
        // Fallback: text button (or when ImageButton not supported)
        this.a.button(`📁 ${displayName}`)
          .withId(`folder-${folder.category}`)
          .onClick(() => this.openFolderView(folder));
      }
    });
  }

  /**
   * Truncate text to fit within grid cell (approximately)
   * @param text Text to truncate
   * @param maxChars Maximum characters before truncating
   */
  private truncateName(text: string, maxChars: number = 8): string {
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars - 1) + '…';
  }

  /**
   * Create an icon button for an app
   * Uses ImageButton for reliable touch support on mobile (when useImageButton is true).
   * @param icon The grid icon to display
   */
  private createAppIcon(icon: GridIcon) {
    const launchHandler = () => this.launchApp(icon.metadata);
    const textSize = this.fontSize;  // Use configured font size for labels
    const displayName = this.truncateName(icon.metadata.name);

    // Use ImageButton for native button tap handling (when supported)
    this.a.center(() => {
      if (icon.resourceName && this.useImageButton) {
        this.a.imageButton({
          resource: icon.resourceName,
          text: displayName,
          textSize: textSize
        })
          .withId(`icon-${icon.metadata.name}`)
          .onClick(launchHandler);
      } else {
        // Fallback: regular button with first letter (or when ImageButton not supported)
        const firstLetter = icon.metadata.name.charAt(0).toUpperCase();
        this.a.button(`${firstLetter}\n${displayName}`)
          .withId(`icon-${icon.metadata.name}`)
          .onClick(launchHandler);
      }
    });
  }

  /**
   * Navigate to previous page
   * Rebuilds only the grid, not the navigation buttons
   */
  private previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.rebuildHomeGrid();
    }
  }

  /**
   * Navigate to next page
   * Rebuilds only the grid, not the navigation buttons
   */
  private nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.rebuildHomeGrid();
    }
  }

  /**
   * Rebuild only the home grid (not navigation buttons)
   * Safe to call from navigation button handlers
   */
  private rebuildHomeGrid() {
    if (!this.homeGridContainer) return;
    this.homeGridContainer.removeAll();
    this.homeGridContainer.add(() => {
      this.createAppGrid();
      this.createPageIndicator();
    });
  }

  /**
   * Create page dots indicator for folder view
   */
  private createFolderPageIndicator() {
    this.a.center(() => {
      this.a.hbox(() => {
        for (let i = 0; i < this.folderTotalPages; i++) {
          const dot = i === this.folderCurrentPage ? '●' : '○';
          this.a.label(dot).withId(`folder-page-dot-${i}`);
        }
      });
    });
  }

  /**
   * Navigate to previous folder page
   * Rebuilds only the grid, not the navigation buttons
   */
  private previousFolderPage() {
    if (this.folderCurrentPage > 0) {
      this.folderCurrentPage--;
      this.rebuildFolderGrid();
    }
  }

  /**
   * Navigate to next folder page
   * Rebuilds only the grid, not the navigation buttons
   */
  private nextFolderPage() {
    if (this.folderCurrentPage < this.folderTotalPages - 1) {
      this.folderCurrentPage++;
      this.rebuildFolderGrid();
    }
  }

  /**
   * Rebuild only the folder grid (not navigation buttons)
   * Safe to call from navigation button handlers
   */
  private rebuildFolderGrid() {
    if (!this.folderGridContainer || !this.openFolder) return;
    this.folderGridContainer.removeAll();
    this.folderGridContainer.add(() => {
      this.createFolderView(this.openFolder!);
      if (this.folderTotalPages > 1) {
        this.createFolderPageIndicator();
      }
    });
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
   * Launch an app (single tap on phone)
   * App content renders as a layer over the home screen
   */
  async launchApp(metadata: AppMetadata) {
    // On phone, 'desktop-many' apps are treated as single instance
    // Only 'many' allows multiple instances on phone
    const isMultiInstance = metadata.count === 'many';

    const appId = isMultiInstance
      ? this.generateAppScope(metadata.name)
      : metadata.filePath;

    // If already running and single-instance, just switch to it
    if (!isMultiInstance) {
      const existing = this.runningApps.get(appId);
      if (existing) {
        this.switchToApp(appId);
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

    // Track the adapter created during this launch
    let createdAdapter: StackPaneAdapter | null = null;

    // Enable phone mode BEFORE loading the module - this ensures the module's
    // auto-run code (if any) doesn't create a real window
    enablePhoneMode({
      parentWindow: this.win,
      phoneApp: this.a,
      onShow: (adapter) => {
        createdAdapter = adapter;
      },
      onClose: (adapter) => {
        // Find and remove from running apps
        this.runningApps.forEach((app, id) => {
          if (app.adapter === adapter) {
            this.runningApps.delete(id);
          }
        });
        this.goHome();
      }
    });

    try {
      // Find the corresponding GridIcon to check for staticBuilder
      const icon = this.icons.find(i => i.metadata.filePath === metadata.filePath);
      let builder: ((...args: any[]) => void | Promise<void>) | null = null;

      if (icon?.staticBuilder) {
        // Use pre-loaded static builder (Android/iOS)
        builder = icon.staticBuilder;
        console.log(`[phonetop] Using static builder for: ${metadata.name}`);
      } else {
        // Use cached loading for faster app startup
        const result = await loadAppBuilderCached(metadata);
        builder = result.builder;
        if (!result.cached) {
          console.log(`[phonetop] Transpiled and cached: ${metadata.name}`);
        }
      }

      if (!builder) {
        console.error(`Could not load builder for ${metadata.name}`);
        disablePhoneMode();
        return;
      }

      (this.a as any).resources = scopedResources;
      this.a.getContext().setResourceScope(appScope);
      this.a.getContext().setLayoutScale(this.getLayoutScale());

      // Build argument map based on @tsyne-app:args metadata
      // Services are injected via constructor (IoC) - no service locator
      const mockRecording = new MockRecordingService();

      const argMap: Record<string, any> = {
        'app': this.a,
        'resources': scopedResources,
        'windowWidth': this.windowWidth,
        'windowHeight': this.windowHeight,
        'contacts': this.services.contacts,
        'telephony': this.services.telephony,
        'modem': this.services.telephony,  // alias for telephony
        'sms': this.services.sms,
        'recording': mockRecording,
      };

      // Map metadata.args to actual values (default is ['app'])
      const args = (metadata.args || ['app']).map(name => argMap[name]);
      await builder(...args);

      disablePhoneMode();
      (this.a as any).resources = originalResources;
      this.a.getContext().setResourceScope(null);
      this.a.getContext().setLayoutScale(1.0);

      console.log('[launchApp] createdAdapter:', !!createdAdapter);
      if (createdAdapter) {
        const adapter = createdAdapter as StackPaneAdapter;
        console.log('[launchApp] adapter.contentBuilder:', !!adapter.contentBuilder);
        if (adapter.contentBuilder) {
          // Store the running app with its resource scope
          this.runningApps.set(appId, {
            metadata,
            adapter,
            contentBuilt: false,
            resourceScope: appScope,
            scopedResources
          });

          // Switch to show this app
          console.log('[launchApp] Calling switchToApp');
          this.switchToApp(appId);
          console.log(`Launched: ${metadata.name}`);
        }
      }
    } finally {
      disablePhoneMode();
      (this.a as any).resources = originalResources;
      this.a.getContext().setResourceScope(null);
      this.a.getContext().setLayoutScale(1.0);
    }
  }

  /**
   * Switch to showing a specific app (or home if appId is null)
   * Uses show/hide on separate containers to avoid destroying widgets during tap callbacks
   */
  switchToApp(appId: string | null) {
    if (!this.win) return;

    this.frontAppId = appId;

    if (appId === null) {
      // Show home screen - hide other containers
      this.appContainer?.hide();
      this.folderContainer?.hide();
      this.homeContainer?.show();
    } else {
      const runningApp = this.runningApps.get(appId);
      if (runningApp) {
        // Show app - hide home and folder containers
        this.homeContainer?.hide();
        this.folderContainer?.hide();

        // Note: showAppContent is async, catch errors to avoid silent failures
        this.showAppContent(runningApp).catch(err => {
          console.error('[phonetop] showAppContent failed:', err);
        });
      }
    }
  }

  /**
   * Show app content with a back button header
   * Uses appContainer with show/hide - other containers stay intact
   *
   * IMPORTANT: The add() method's builder callback must be SYNCHRONOUS.
   * Passing an async callback causes container stack corruption because
   * add() calls pushContainer/popContainer synchronously around the builder,
   * but an async builder returns a Promise immediately before its work completes.
   * This caused stack overflow crashes when clicking dialer buttons.
   */
  private async showAppContent(runningApp: RunningApp) {
    if (!this.win || !this.appContainer) {
      return;
    }

    const contentBuilder = runningApp.adapter.contentBuilder;
    if (!contentBuilder) {
      return;
    }

    // Find the app ID for this running app
    let appId: string | null = null;
    this.runningApps.forEach((app, id) => {
      if (app === runningApp) appId = id;
    });

    // Store original resources to restore after content build
    const originalResources = this.a.resources;

    // Clear app container and rebuild content
    // This is safe because we're not destroying the container we tapped on
    this.appContainer.removeAll();

    // Set up resource scope for app content BEFORE creating widgets
    (this.a as any).resources = runningApp.scopedResources;
    this.a.getContext().setResourceScope(runningApp.resourceScope);
    this.a.getContext().setLayoutScale(this.getLayoutScale());

    // Capture appVbox from inside add() - will be assigned synchronously
    let appVbox: VBox;

    // Add app header SYNCHRONOUSLY (this is critical - async callbacks break add()!)
    this.appContainer.add(() => {
      // Create vbox to hold app header + content
      appVbox = this.a.vbox(() => {
        // Header with back button, quit button, menu button, and app name
        this.a.hbox(() => {
          this.sizedButton('← Home').onClick(() => {
            this.hideKeyboard();
            this.goHome();
          });
          this.sizedButton('✕ Quit').onClick(() => {
            this.hideKeyboard();
            if (appId) this.quitApp(appId);
          });

          // Menu button if app has menus
          const menuDef = runningApp.adapter.menuDefinition;
          if (menuDef && menuDef.length > 0) {
            this.sizedButton('☰').onClick(async () => {
              // Build menu options for form dialog
              const allOptions: string[] = [];
              const allCallbacks: Map<string, () => void> = new Map();

              for (const menu of menuDef) {
                for (const item of menu.items) {
                  if (!item.isSeparator && item.label) {
                    const label = `${menu.label} → ${item.label}`;
                    allOptions.push(label);
                    const callback = item.onSelected || item.onClick;
                    if (callback) {
                      allCallbacks.set(label, callback);
                    }
                  }
                }
              }

              // Show as selection dialog
              if (this.win && allOptions.length > 0) {
                const result = await this.win.showForm('Menu', [{
                  name: 'action',
                  type: 'select',
                  label: 'Action',
                  options: allOptions
                }]);

                if (result?.submitted && result.values?.action) {
                  const selected = result.values.action as string;
                  const callback = allCallbacks.get(selected);
                  if (callback) callback();
                }
              }
            });
          }

          this.a.spacer();
          this.sizedLabel(runningApp.adapter.title);
          this.a.spacer();
        });
        this.a.separator();
      });
    });

    // Build app content OUTSIDE of add() - this allows async operations
    // The contentBuilder may be async, so we await it here
    try {
      this.a.getContext().pushContainer();
      await contentBuilder();
      const appWidgetIds = this.a.getContext().popContainer();

      // Add app widgets to the app vbox
      for (const childId of appWidgetIds) {
        this.a.getContext().bridge.send('containerAdd', {
          containerId: appVbox!.id,
          childId
        });
      }
    } catch (err) {
      // Pop the container even on error to maintain context stack integrity
      try { this.a.getContext().popContainer(); } catch { /* ignore */ }

      // Show error message in the app area instead of crashing
      console.error(`[phonetop] App "${runningApp.metadata.name}" crashed:`, err);
      appVbox!.add(() => {
        this.a.vbox(() => {
          this.sizedLabel(`App Error: ${runningApp.metadata.name}`);
          this.sizedLabel(err instanceof Error ? err.message : String(err));
          this.a.spacer();
          this.sizedButton('Close App').onClick(() => {
            if (appId) this.quitApp(appId);
          });
        });
      });
    }

    // Restore original resources and layout scale
    (this.a as any).resources = originalResources;
    this.a.getContext().setResourceScope(null);
    this.a.getContext().setLayoutScale(1.0);

    // Show app container
    this.appContainer.show();
  }

  /**
   * Quit an app (remove from running apps)
   */
  quitApp(appId: string) {
    this.runningApps.delete(appId);
    this.goHome();
  }

  /**
   * Go back to home screen
   */
  goHome() {
    this.switchToApp(null);
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

    // Swapping happens on home screen
    this.rebuildHomeGrid();
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
// Track if WASM is initialized
let wasmInitialized = false;

/**
 * Build PhoneTop for desktop (composition root)
 * Creates mock services for testing/development
 */
export async function buildPhoneTop(a: App, options?: PhoneTopOptions) {
  // Initialize resvg WASM if not already done
  if (!wasmInitialized) {
    try {
      const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
      const wasmBuffer = fs.readFileSync(wasmPath);
      await initWasm(wasmBuffer);
      wasmInitialized = true;
    } catch (e) {
      console.warn('[phonetop] WASM init failed, icons may not render:', e);
    }
  }

  // Composition root: create services if not injected
  const finalOptions: PhoneTopOptions = {
    ...options,
    services: options?.services || createDesktopServices(),
  };

  const launcher = new PhoneTop(a, finalOptions);
  await launcher.init();
  await launcher.build();
}

/**
 * Create mock services for desktop testing (composition root helper)
 */
function createDesktopServices(): PhoneServices {
  return {
    contacts: new MockContactsService(),
    telephony: new MockTelephonyService(),
    sms: new MockSMSService(),
  };
}

export { PhoneTop };

// Re-export core app function for bundled usage
export { app, resolveTransport } from 'tsyne';

// Entry point
if (require.main === module) {
  const { app, resolveTransport } = require('tsyne');

  // Check for debug port via environment variable
  const debugPort = process.env.TSYNE_DEBUG_PORT ? parseInt(process.env.TSYNE_DEBUG_PORT, 10) : undefined;

  app(resolveTransport(), { title: 'App Launcher' }, async (a: App) => {
    await buildPhoneTop(a, { debugPort });
  });
}
