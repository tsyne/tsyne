/**
 * Tsyne PhoneTop
 *
 * A phone-style launcher environment for ported Tsyne apps.
 * - Uses a scrollable grid layout (Android-style)
 * - Stack-based navigation with push/pop semantics
 * - Breadcrumb navigation for deep views
 * - Supports @tsyne-app:args for dependency injection (app, resources)
 *
 * Run with: ./scripts/tsyne launchers/phonetop/index.ts
 */

import { App } from 'tsyne';
import { Window } from 'tsyne';
import { Label, Button, VBox } from 'tsyne';
import { StackPaneAdapter } from 'tsyne';
import { parseAppMetadata, loadAppBuilderCached, AppMetadata } from 'tsyne';
import { ALL_APPS } from '../all-apps';
import { ScopedResourceManager, ResourceManager } from 'tsyne';
import { Inspector } from 'tsyne';
import { getSvgRasterizer } from 'tsyne';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { BridgeKeyboardController } from '../../phone-apps/keyboard/controller';
import { buildKeyboard } from '../../phone-apps/keyboard/en-gb/keyboard';
import {
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

// Stack navigation
import { PhoneTopStack } from './phonetop-stack';
import { HomeView } from './views/home-view';
import { FolderView } from './views/folder-view';
import { AppView } from './views/app-view';
import { SearchModel } from './search-model';

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

// Grid configuration for landscape orientation
const GRID_COLS_LANDSCAPE = 5;

// Phone layout scale - varies by orientation
const PHONE_LAYOUT_SCALE_PORTRAIT = 0.5;
const PHONE_LAYOUT_SCALE_LANDSCAPE = 0.8;

// Icon size for phone (slightly smaller than desktop's 80px)
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
  adapter: StackPaneAdapter;
  contentBuilt: boolean;
  resourceScope: string;
  scopedResources: ScopedResourceManager;
}

class PhoneTop {
  private a: App;
  private win: Window | null = null;
  private icons: GridIcon[] = [];
  private gridItems: GridItem[] = [];
  private folders: Map<string, Folder> = new Map();
  private runningApps: Map<string, RunningApp> = new Map();
  private options: PhoneTopOptions;
  private services: PhoneServices;
  private cols: number;
  private appInstanceCounter: Map<string, number> = new Map();
  private iconResourceCache: Map<string, string> = new Map();
  private folderIconCache: Map<string, string> = new Map();
  private keyboardController: BridgeKeyboardController | null = null;
  private keyboardVisible: boolean = false;
  private keyboardContainer: VBox | null = null;
  private keyboardBuilt: boolean = false;
  private windowWidth: number = 540;
  private windowHeight: number = 960;
  private isLandscape: boolean = false;
  private fontSize: number = 14;
  private useImageButton: boolean = true;
  private inspector: Inspector | null = null;
  private debugServer: http.Server | null = null;
  private debugToken: string | null = null;

  // Stack navigation
  private stack: PhoneTopStack | null = null;
  private homeView: HomeView | null = null;
  private searchModel = new SearchModel();

  constructor(app: App, options: PhoneTopOptions = {}) {
    this.a = app;
    this.options = options;

    if (!options.services) {
      throw new Error('PhoneTop requires services to be injected. Use buildPhoneTop() or provide services in options.');
    }
    this.services = options.services;

    const iconScale = options.iconScale || 1.0;
    this.fontSize = options.fontSize || 14;
    this.useImageButton = options.useImageButton !== false;

    ICON_SIZE = Math.round(ICON_SIZE_BASE * iconScale);

    // Initialize with portrait defaults
    this.cols = options.columns || GRID_COLS_PORTRAIT;

    // Stack is created in build() when we have the window

    // Create bridge keyboard controller
    this.keyboardController = new BridgeKeyboardController(this.a.getContext().bridge);

    // Listen for global textInputFocus events
    this.a.getContext().bridge.on('textInputFocus', (data: unknown) => {
      const eventData = data as { focused: boolean };
      this.handleFocusChange(eventData.focused);
    });
  }

  private loadAppMetadata(filePath: string): AppMetadata | null {
    try {
      return parseAppMetadata(filePath);
    } catch {
      return null;
    }
  }

  private updateOrientation(width: number, height: number): boolean {
    const wasLandscape = this.isLandscape;
    this.windowWidth = width;
    this.windowHeight = height;
    this.isLandscape = width > height;

    if (!this.options.columns) {
      this.cols = this.isLandscape ? GRID_COLS_LANDSCAPE : GRID_COLS_PORTRAIT;
    }

    const orientationChanged = wasLandscape !== this.isLandscape;
    if (orientationChanged) {
      console.log(`[phonetop] Orientation changed to ${this.isLandscape ? 'landscape' : 'portrait'} (${width}x${height})`);
    }
    return orientationChanged;
  }

  private getLayoutScale(): number {
    return this.isLandscape ? PHONE_LAYOUT_SCALE_LANDSCAPE : PHONE_LAYOUT_SCALE_PORTRAIT;
  }

  handleFocusChange(focused: boolean) {
    if (focused && !this.keyboardVisible) {
      this.showKeyboard();
    } else if (!focused && this.keyboardVisible) {
      this.hideKeyboard();
    }
  }

  private showKeyboard() {
    const kb = this.keyboardContainer || this.stack?.getKeyboardContainer();
    if (kb) {
      this.keyboardVisible = true;
      kb.show();
    }
  }

  hideKeyboard() {
    const kb = this.keyboardContainer || this.stack?.getKeyboardContainer();
    if (kb) {
      this.keyboardVisible = false;
      kb.hide();
    }
  }

  private async renderSvgIconToDataUri(svg: string, size: number = ICON_SIZE): Promise<string> {
    const normalized = this.normalizeSvg(svg, size);
    const Resvg = await getSvgRasterizer();
    const renderer = new Resvg(normalized, {
      fitTo: { mode: 'width', value: size },
      background: 'rgba(0,0,0,0)'
    });
    const png = renderer.render().asPng();
    const buffer = Buffer.from(png);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  private normalizeSvg(svg: string, size: number): string {
    let s = svg.trim();
    if (!s.toLowerCase().startsWith('<svg')) return s;

    const match = s.match(/^<svg[^>]*>/i);
    if (!match) return s;

    const originalTag = match[0];
    const originalTagLength = originalTag.length;
    let tag = originalTag;

    const ensureAttr = (attr: string, value: string) => {
      if (tag.toLowerCase().includes(`${attr.toLowerCase()}=`)) return;
      tag = tag.slice(0, -1) + ` ${attr}="${value}">`;
    };

    ensureAttr('xmlns', 'http://www.w3.org/2000/svg');
    ensureAttr('width', size.toString());
    ensureAttr('height', size.toString());
    if (!/viewbox=/i.test(tag)) {
      ensureAttr('viewBox', `0 0 ${size} ${size}`);
    }
    ensureAttr('preserveAspectRatio', 'xMidYMid meet');

    s = tag + s.slice(originalTagLength);
    s = s.replace(/currentColor/gi, '#333333');

    return s;
  }

  private getIconKey(appName: string): string {
    return appName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  private async prepareIconResource(metadata: AppMetadata): Promise<{ resourceName?: string }> {
    const cacheKey = metadata.filePath;
    if (this.iconResourceCache.has(cacheKey)) {
      return { resourceName: this.iconResourceCache.get(cacheKey)! };
    }

    if (!metadata.iconIsSvg || !metadata.icon) return {};

    try {
      const baseName = path.basename(metadata.filePath, '.ts');
      const resourceName = `phone-icon-${this.getIconKey(`${metadata.name}-${baseName}`)}`;

      const dataUri = await this.renderSvgIconToDataUri(metadata.icon, ICON_SIZE);
      await this.a.resources.registerResource(resourceName, dataUri);

      this.iconResourceCache.set(cacheKey, resourceName);
      return { resourceName };
    } catch (err) {
      console.error(`Failed to register phone icon for ${metadata.name}:`, err);
      return {};
    }
  }

  private async prepareFolderIcons(): Promise<void> {
    for (const [category, config] of Object.entries(CATEGORY_CONFIG)) {
      if (this.folderIconCache.has(category)) continue;

      try {
        const resourceName = `phone-folder-${category}`;
        const dataUri = await this.renderSvgIconToDataUri(config.icon, ICON_SIZE);
        await this.a.resources.registerResource(resourceName, dataUri);
        this.folderIconCache.set(category, resourceName);
      } catch (err) {
        console.error(`Failed to register folder icon for ${category}:`, err);
      }
    }
  }

  private sizedLabel(text: string, id?: string): Label {
    const label = this.a.label(text, { textSize: this.fontSize });
    if (id) label.withId(id);
    return label;
  }

  private sizedButton(text: string, id?: string): Button {
    const btn = this.a.button(text, { textSize: this.fontSize });
    if (id) btn.withId(id);
    return btn;
  }

  async init() {
    // Load metadata from all registered apps
    const apps: AppMetadata[] = [];
    for (const filePath of ALL_APPS) {
      const metadata = this.loadAppMetadata(filePath);
      if (metadata) apps.push(metadata);
    }
    apps.sort((a, b) => a.name.localeCompare(b.name));

    // Prepare all app icons
    for (const metadata of apps) {
      const { resourceName } = await this.prepareIconResource(metadata);
      this.icons.push({
        metadata,
        position: { page: 0, row: 0, col: 0 },
        resourceName
      });
    }

    // Process static apps (for Android/iOS)
    if (this.options.staticApps && this.options.staticApps.length > 0) {
      console.log(`[phonetop] Processing ${this.options.staticApps.length} static apps`);
      for (const staticApp of this.options.staticApps) {
        const metadata: AppMetadata = {
          filePath: `static://${staticApp.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: staticApp.name,
          icon: staticApp.icon || DEFAULT_ICON,
          iconIsSvg: staticApp.icon ? staticApp.icon.trim().toLowerCase().startsWith('<svg') : true,
          category: staticApp.category,
          builder: 'staticBuilder',
          count: staticApp.count || 'one',
          args: staticApp.args || ['app']
        };

        const { resourceName } = await this.prepareIconResource(metadata);
        this.icons.push({
          metadata,
          position: { page: 0, row: 0, col: 0 },
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

    // Create folders
    this.folders.clear();
    for (const [category, categoryApps] of appsByCategory) {
      const config = CATEGORY_CONFIG[category];
      this.folders.set(category, {
        name: config.displayName,
        category,
        apps: categoryApps,
        position: { page: 0, row: 0, col: 0 }
      });
    }

    await this.prepareFolderIcons();

    // Build grid items
    this.gridItems = [];
    const sortedFolders = Array.from(this.folders.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const folder of sortedFolders) {
      this.gridItems.push({ type: 'folder', folder });
    }
    for (const icon of uncategorizedApps) {
      this.gridItems.push({ type: 'app', icon });
    }

    console.log(`Found ${apps.length} apps: ${this.folders.size} folders, ${uncategorizedApps.length} uncategorized`);

    if (this.options.debugPort) {
      this.startDebugServer(this.options.debugPort);
    }
  }

  private startDebugServer(port: number): void {
    this.inspector = new Inspector(this.a.getContext().bridge);
    this.debugToken = process.env.TSYNE_DEBUG_TOKEN || crypto.randomBytes(16).toString('hex');
    console.log(`[phonetop] Debug token: ${this.debugToken}`);

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
      const tokenParam = url.searchParams.get('token');
      const tokenHeader = req.headers['x-debug-token'] as string | undefined;
      const providedToken = tokenParam || tokenHeader;

      if (providedToken !== this.debugToken) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized - invalid or missing token' }));
        return;
      }

      try {
        await this.handleDebugRequest(url, res);
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: String(err) }));
      }
    });

    this.debugServer.listen(port, '0.0.0.0', () => {
      console.log(`[phonetop] Debug server listening on http://0.0.0.0:${port}`);
    });
  }

  private async handleDebugRequest(url: URL, res: http.ServerResponse): Promise<void> {
    if (url.pathname === '/') {
      res.writeHead(200);
      res.end(JSON.stringify({
        endpoints: {
          '/': 'This index',
          '/windows': 'List all window IDs',
          '/tree': 'Get widget tree for main window',
          '/apps': 'List running apps',
          '/state': 'Get phonetop state',
          '/screenshot': 'Capture window screenshot',
          '/phonetop/home': 'Go to home screen',
          '/app/quit': 'Quit front app',
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

    } else if (url.pathname === '/apps') {
      const apps: any[] = [];
      const topView = this.stack?.top() ?? null;
      const frontAppId = topView?.type === 'app' ? topView.id.replace('app-', '') : null;

      for (const [id, app] of this.runningApps) {
        apps.push({
          id,
          name: app.metadata.name,
          isFront: id === frontAppId,
          resourceScope: app.resourceScope,
        });
      }
      res.writeHead(200);
      res.end(JSON.stringify({ apps, frontAppId }, null, 2));

    } else if (url.pathname === '/state') {
      const topView = this.stack?.top() ?? null;
      res.writeHead(200);
      res.end(JSON.stringify({
        stackDepth: this.stack?.depth() ?? 0,
        currentView: topView ? { id: topView.id, type: topView.type, title: topView.title } : null,
        breadcrumbs: this.stack?.getBreadcrumbs() ?? [],
        runningAppCount: this.runningApps.size,
        gridItemCount: this.gridItems.length,
        folderCount: this.folders.size,
        isLandscape: this.isLandscape,
        windowSize: { width: this.windowWidth, height: this.windowHeight },
      }, null, 2));

    } else if (url.pathname === '/screenshot') {
      if (!this.win) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'No main window' }));
        return;
      }

      const tempPath = path.join(os.tmpdir(), `tsyne-screenshot-${Date.now()}.png`);
      try {
        await this.win.screenshot(tempPath);
        const imageBuffer = fs.readFileSync(tempPath);
        const base64 = imageBuffer.toString('base64');
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
        try { fs.unlinkSync(tempPath); } catch {}
        res.writeHead(500);
        res.end(JSON.stringify({ error: `Screenshot failed: ${screenshotErr}` }));
      }

    } else if (url.pathname === '/phonetop/home') {
      await this.goHome();
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, action: 'home' }, null, 2));

    } else if (url.pathname === '/app/quit') {
      const topView = this.stack?.top() ?? null;
      if (topView?.type !== 'app') {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'No app in foreground' }));
        return;
      }

      const appId = topView.id.replace('app-', '');
      await this.quitApp(appId);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, action: 'quit', appId }, null, 2));

    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  async build() {
    console.log(`[phonetop] BUILD: ${BUILD_TIMESTAMP}`);

    const windowOpts: { title: string; width?: number; height?: number; padded?: boolean } = { title: 'Tsyne Phone' };
    if (this.options.fullScreen) {
      windowOpts.padded = false;
    } else {
      windowOpts.width = 540;
      windowOpts.height = 960;
    }

    this.a.window(windowOpts, (win) => {
      this.win = win as Window;

      if (this.options.fullScreen) {
        this.updateOrientation(1080, 2400);
      } else {
        this.updateOrientation(540, 960);
      }

      win.onResize((width, height) => {
        const orientationChanged = this.updateOrientation(width, height);
        if (orientationChanged) {
          // Update views with new columns
          if (this.homeView) {
            this.homeView.updateCols(this.cols);
          }
        }
      });

      win.setMainMenu([
        {
          label: 'Settings',
          items: [
            { label: 'Light Theme', onSelected: () => this.a.setTheme('light') },
            { label: 'Dark Theme', onSelected: () => this.a.setTheme('dark') }
          ]
        }
      ]);

      // Create stack navigation manager with window and keyboard builder
      this.stack = new PhoneTopStack({
        app: this.a,
        window: this.win,
        fontSize: this.fontSize,
        searchModel: this.searchModel,
        onQuit: (appId) => this.quitApp(appId),
        onHideKeyboard: () => this.hideKeyboard(),
        keyboardBuilder: () => {
          const kbContainer = this.a.vbox(() => {
            this.a.separator();
            if (this.keyboardController) {
              buildKeyboard(this.a, this.keyboardController as any);
            }
          });
          this.keyboardContainer = kbContainer;
          this.keyboardBuilt = true;
          return kbContainer;
        }
      });

      // Initialize with HomeView - this calls renderCurrentView which sets window content
      this.initializeHomeView();
    });
  }

  private async initializeHomeView(): Promise<void> {
    if (!this.stack) return;

    // Create HomeView
    this.homeView = new HomeView({
      app: this.a,
      gridItems: this.gridItems,
      cols: this.cols,
      fontSize: this.fontSize,
      folderIconCache: this.folderIconCache,
      useImageButton: this.useImageButton,
      buildTimestamp: BUILD_TIMESTAMP,
      searchModel: this.searchModel,
      onFolderTap: (folder) => this.openFolder(folder),
      onAppTap: (icon) => this.launchApp(icon.metadata)
    });

    // Push HomeView onto stack
    await this.stack.push(this.homeView);
  }

  private async openFolder(folder: Folder): Promise<void> {
    if (!this.stack) return;
    console.log(`[phonetop] Opening folder: ${folder.name}`);

    // Always use the original unfiltered folder from the master list
    // (the passed folder may be a filtered copy from search results)
    const originalFolder = this.folders.get(folder.category) ?? folder;

    const folderView = new FolderView({
      app: this.a,
      folder: originalFolder,
      cols: this.cols,
      fontSize: this.fontSize,
      useImageButton: this.useImageButton,
      searchModel: this.searchModel,
      onAppTap: (icon) => this.launchApp(icon.metadata),
      onBack: () => this.stack?.pop()
    });

    await this.stack.push(folderView);
  }

  private generateAppScope(appName: string): string {
    const count = (this.appInstanceCounter.get(appName) || 0) + 1;
    this.appInstanceCounter.set(appName, count);
    return `${appName.toLowerCase().replace(/\s+/g, '-')}-${count}`;
  }

  async launchApp(metadata: AppMetadata) {
    console.log(`[launchApp] START: ${metadata.name}`);

    const isMultiInstance = metadata.count === 'many';
    const appId = isMultiInstance
      ? this.generateAppScope(metadata.name)
      : metadata.filePath;

    // If already running and single-instance, switch to it
    if (!isMultiInstance && this.runningApps.has(appId)) {
      console.log(`[launchApp] Already running, switching to: ${metadata.name}`);
      await this.switchToApp(appId);
      return;
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
      const icon = this.icons.find(i => i.metadata.filePath === metadata.filePath);
      let builder: ((...args: any[]) => void | Promise<void>) | null = null;

      if (icon?.staticBuilder) {
        builder = icon.staticBuilder;
      } else {
        const result = await loadAppBuilderCached(metadata);
        builder = result.builder;
      }

      if (!builder) {
        console.error(`Could not load builder for ${metadata.name}`);
        return;
      }

      (this.a as any).resources = scopedResources;
      this.a.getContext().setResourceScope(appScope);
      this.a.getContext().setLayoutScale(this.getLayoutScale());

      const adapter = new StackPaneAdapter(
        this.a.getContext(),
        this.win,
        { title: metadata.name, width: this.windowWidth, height: this.windowHeight },
        {
          onClose: () => {
            this.runningApps.delete(appId);
            this.goHome();
          }
        }
      );

      const mockRecording = new MockRecordingService();
      const argMap: Record<string, any> = {
        'app': this.a,
        'resources': scopedResources,
        'window': adapter,
        'windowWidth': this.windowWidth,
        'windowHeight': this.windowHeight,
        'contacts': this.services.contacts,
        'telephony': this.services.telephony,
        'modem': this.services.telephony,
        'sms': this.services.sms,
        'recording': mockRecording,
      };

      const argNames = metadata.args || ['app'];
      const args = argNames.map(name => argMap[name]);

      await builder(...args);

      (this.a as any).resources = originalResources;
      this.a.getContext().setResourceScope(null);
      this.a.getContext().setLayoutScale(1.0);

      if (adapter.contentBuilder) {
        this.runningApps.set(appId, {
          metadata,
          adapter,
          contentBuilt: false,
          resourceScope: appScope,
          scopedResources
        });

        await this.pushAppView(appId);
        console.log(`Launched: ${metadata.name}`);
      }
    } catch (err) {
      console.error(`[phonetop] Error launching ${metadata.name}:`, err);
      (this.a as any).resources = originalResources;
      this.a.getContext().setResourceScope(null);
      this.a.getContext().setLayoutScale(1.0);
    }
  }

  private async pushAppView(appId: string): Promise<void> {
    const runningApp = this.runningApps.get(appId);
    if (!runningApp || !this.win || !this.stack) return;

    const appView = new AppView({
      app: this.a,
      appId,
      metadata: runningApp.metadata,
      adapter: runningApp.adapter,
      scopedResources: runningApp.scopedResources,
      resourceScope: runningApp.resourceScope,
      layoutScale: this.getLayoutScale(),
      fontSize: this.fontSize,
      window: this.win,
    });

    await this.stack.push(appView);
  }

  private async switchToApp(appId: string): Promise<void> {
    if (!this.stack) return;
    // For single-instance apps that are already running
    // Pop to home first, then push the app view
    await this.stack.popTo(0);
    await this.pushAppView(appId);
  }

  async quitApp(appId: string) {
    if (!this.stack) return;
    console.log(`[quitApp] ${appId}`);
    this.runningApps.delete(appId);
    await this.stack.pop();
  }

  async goHome() {
    if (!this.stack) return;
    console.log('[goHome]');
    await this.stack.popTo(0);
  }

  getCurrentPage(): number {
    return 0; // No pagination with scroll
  }

  getTotalPages(): number {
    return 1; // No pagination with scroll
  }
}

/**
 * Build PhoneTop for desktop (composition root)
 */
export async function buildPhoneTop(a: App, options?: PhoneTopOptions) {
  const finalOptions: PhoneTopOptions = {
    ...options,
    services: options?.services || createDesktopServices(),
  };

  const launcher = new PhoneTop(a, finalOptions);
  await launcher.init();
  await launcher.build();
}

/**
 * Create mock services for desktop testing
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
  const debugPort = process.env.TSYNE_DEBUG_PORT ? parseInt(process.env.TSYNE_DEBUG_PORT, 10) : undefined;

  app(resolveTransport(), { title: 'App Launcher' }, async (a: App) => {
    await buildPhoneTop(a, { debugPort });
  });
}
