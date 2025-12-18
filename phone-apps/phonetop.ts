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

import { App } from '../core/src/app';
import { Window } from '../core/src/window';
import { Label, Button, VBox } from '../core/src/widgets';
import { enablePhoneMode, disablePhoneMode, StackPaneAdapter } from '../core/src/tsyne-window';
import { scanForApps, scanPortedApps, loadAppBuilder, AppMetadata } from '../core/src/app-metadata';
import { ScopedResourceManager, ResourceManager } from '../core/src/resources';
import { Resvg } from '@resvg/resvg-js';
import * as path from 'path';
import { BridgeKeyboardController } from './keyboard/controller';
import { buildKeyboard } from './keyboard/en-gb/keyboard';

// Grid configuration for phone (portrait orientation)
const GRID_COLS = 3;
const GRID_ROWS = 4;
const APPS_PER_PAGE = GRID_COLS * GRID_ROWS;

// Phone layout scale (400px phone width vs 800px typical desktop)
const PHONE_LAYOUT_SCALE = 0.5;

// Icon size for phone (slightly smaller than desktop's 80px)
const ICON_SIZE = 64;

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
  resourceName?: string;  // Registered icon resource name (for SVG icons)
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
  private icons: GridIcon[] = [];
  private runningApps: Map<string, RunningApp> = new Map();
  private frontAppId: string | null = null;  // Currently visible app (null = home)
  private currentPage: number = 0;
  private totalPages: number = 1;
  private pageIndicatorLabels: Label[] = [];
  private options: PhoneTopOptions;
  private cols: number;
  private rows: number;
  private appsPerPage: number;
  private appInstanceCounter: Map<string, number> = new Map();
  /** Cache of registered icon resources keyed by source file */
  private iconResourceCache: Map<string, string> = new Map();
  /** Keyboard controller using bridge injection for cross-app typing */
  private keyboardController: BridgeKeyboardController | null = null;
  /** Whether the virtual keyboard is visible */
  private keyboardVisible: boolean = false;
  /** Keyboard container for show/hide */
  private keyboardContainer: VBox | null = null;

  constructor(app: App, options: PhoneTopOptions = {}) {
    this.a = app;
    this.options = options;
    this.cols = options.columns || GRID_COLS;
    this.rows = options.rows || GRID_ROWS;
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

    let tag = match[0];
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

    s = tag + s.slice(tag.length);
    return s;
  }

  /**
   * Get a sanitized key for an app name (for use in resource names)
   */
  private getIconKey(appName: string): string {
    return appName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  /**
   * Convert an app's @tsyne-app:icon into a registered resource (if possible)
   */
  private async prepareIconResource(metadata: AppMetadata): Promise<string | undefined> {
    const cacheKey = metadata.filePath;
    if (this.iconResourceCache.has(cacheKey)) {
      return this.iconResourceCache.get(cacheKey);
    }

    if (!metadata.iconIsSvg || !metadata.icon) {
      return undefined;
    }

    try {
      const dataUri = this.renderSvgIconToDataUri(metadata.icon, ICON_SIZE);
      const baseName = path.basename(metadata.filePath, '.ts');
      const resourceName = `phone-icon-${this.getIconKey(`${metadata.name}-${baseName}`)}`;
      await this.a.resources.registerResource(resourceName, dataUri);
      this.iconResourceCache.set(cacheKey, resourceName);
      return resourceName;
    } catch (err) {
      console.error(`Failed to register phone icon for ${metadata.name}:`, err);
      return undefined;
    }
  }

  /**
   * Initialize the phone by scanning for apps
   */
  async init() {
    const appDir = this.options.appDirectory || path.join(process.cwd(), 'examples');
    const portedAppsDir = path.join(process.cwd(), 'ported-apps');
    const phoneAppsDir = path.join(process.cwd(), 'phone-apps');

    // Scan for apps
    const exampleApps = scanForApps(appDir);
    const portedApps = scanPortedApps(portedAppsDir);
    const phoneApps = scanForApps(phoneAppsDir);
    const apps = [...exampleApps, ...portedApps, ...phoneApps].sort((a, b) => a.name.localeCompare(b.name));

    // Position apps in grid across pages
    let page = 0;
    let row = 0;
    let col = 0;

    for (const metadata of apps) {
      // Prepare icon resource (render SVG to PNG)
      const resourceName = await this.prepareIconResource(metadata);

      this.icons.push({
        metadata,
        position: { page, row, col },
        resourceName
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
            { label: 'Light Theme', onSelected: () => this.a.setTheme('light') },
            { label: 'Dark Theme', onSelected: () => this.a.setTheme('dark') }
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
      // Main layout: app content fills space, keyboard at bottom (hidden by default)
      this.a.vbox(() => {
        // Use border layout: grid fills center, controls at bottom
        this.a.max(() => {
          this.a.border({
            center: () => {
              // App grid fills available space
              this.createAppGrid();
            },
            bottom: () => {
              this.a.vbox(() => {
                // Page dots indicator (like iOS/Android)
                this.createPageIndicator();

                // Swipe navigation buttons
                this.a.hbox(() => {
                  this.a.button('< Swipe Left').withId('swipeLeft').onClick(() => this.previousPage());
                  this.a.spacer();
                  this.a.button('Swipe Right >').withId('swipeRight').onClick(() => this.nextPage());
                });
              });
            }
          });
        });

        // Virtual keyboard (hidden by default, shown on Entry focus)
        this.keyboardContainer = this.a.vbox(() => {
          this.a.separator();
          if (this.keyboardController) {
            buildKeyboard(this.a, this.keyboardController as any);
          }
        });
        this.keyboardContainer.hide();  // Start hidden
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
    // Center the icon content within its grid cell
    this.a.center(() => {
      this.a.vbox(() => {
        if (icon.resourceName) {
          // Use SVG icon rendered as image
          this.a.image({
            resource: icon.resourceName,
            fillMode: 'original',
            onClick: () => this.launchApp(icon.metadata)
          }).withId(`icon-${icon.metadata.name}`);
        } else {
          // Fallback: button with first letter
          const firstLetter = icon.metadata.name.charAt(0).toUpperCase();
          this.a.button(firstLetter)
            .withId(`icon-${icon.metadata.name}`)
            .onClick(() => this.launchApp(icon.metadata));
        }

        // App name (truncated if too long)
        const shortName = icon.metadata.name.length > 10
          ? icon.metadata.name.substring(0, 9) + '...'
          : icon.metadata.name;
        this.a.label(shortName);
      });
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
      const builder = await loadAppBuilder(metadata);
      if (!builder) {
        console.error(`Could not load builder for ${metadata.name}`);
        disablePhoneMode();
        return;
      }

      (this.a as any).resources = scopedResources;
      this.a.getContext().setResourceScope(appScope);
      this.a.getContext().setLayoutScale(PHONE_LAYOUT_SCALE);

      // Build argument map based on @tsyne-app:args metadata
      const argMap: Record<string, any> = {
        'app': this.a,
        'resources': scopedResources,
      };

      // Map metadata.args to actual values (default is ['app'])
      const args = (metadata.args || ['app']).map(name => argMap[name]);
      await builder(...args);

      disablePhoneMode();
      (this.a as any).resources = originalResources;
      this.a.getContext().setResourceScope(null);
      this.a.getContext().setLayoutScale(1.0);

      if (createdAdapter) {
        const adapter = createdAdapter as StackPaneAdapter;
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
   */
  private switchToApp(appId: string | null) {
    if (!this.win) return;

    this.frontAppId = appId;

    if (appId === null) {
      // Show home screen
      this.rebuildContent();
    } else {
      const runningApp = this.runningApps.get(appId);
      if (runningApp) {
        // Show app with back button
        this.showAppContent(runningApp);
      }
    }
  }

  /**
   * Show app content with a back button header
   */
  private showAppContent(runningApp: RunningApp) {
    if (!this.win) return;

    const contentBuilder = runningApp.adapter.contentBuilder;
    if (!contentBuilder) return;

    // Find the app ID for this running app
    let appId: string | null = null;
    this.runningApps.forEach((app, id) => {
      if (app === runningApp) appId = id;
    });

    // Store original resources to restore after content build
    const originalResources = this.a.resources;

    this.win.setContent(() => {
      // Main layout: app content fills space, keyboard at bottom
      this.a.vbox(() => {
        // App content with header
        this.a.max(() => {
          // Restore the app's resource scope and layout scale for content building
          (this.a as any).resources = runningApp.scopedResources;
          this.a.getContext().setResourceScope(runningApp.resourceScope);
          this.a.getContext().setLayoutScale(PHONE_LAYOUT_SCALE);

          this.a.vbox(() => {
            // Header with back button, quit button, and app name
            this.a.hbox(() => {
              this.a.button('← Home').onClick(() => {
                this.hideKeyboard();  // Hide keyboard when going home
                this.goHome();
              });
              this.a.button('✕ Quit').onClick(() => {
                this.hideKeyboard();  // Hide keyboard when quitting
                if (appId) this.quitApp(appId);
              });
              this.a.spacer();
              this.a.label(runningApp.adapter.title);
              this.a.spacer();
            });

            this.a.separator();

            // App content fills the rest
            this.a.max(() => {
              contentBuilder();
            });
          });

          // Restore original resources and layout scale after content build
          (this.a as any).resources = originalResources;
          this.a.getContext().setResourceScope(null);
          this.a.getContext().setLayoutScale(1.0);
        });

        // Virtual keyboard (hidden by default, shown on Entry focus)
        this.keyboardContainer = this.a.vbox(() => {
          this.a.separator();
          if (this.keyboardController) {
            buildKeyboard(this.a, this.keyboardController as any);
          }
        });
        this.keyboardContainer.hide();  // Start hidden
      });
    });
  }

  /**
   * Quit an app (remove from running apps)
   */
  private quitApp(appId: string) {
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
export async function buildPhoneTop(a: App, options?: PhoneTopOptions) {
  const launcher = new PhoneTop(a, options);
  await launcher.init();
  launcher.build();
}

export { PhoneTop };

// Entry point
if (require.main === module) {
  const { app } = require('../core/src/index');
  app({ title: 'App Launcher' }, async (a: App) => {
    await buildPhoneTop(a);
  });
}
