/**
 * Tsyne Desktop Environment
 *
 * A desktop-like environment for launching Tsyne apps.
 * - Displays app icons in a grid that can be clicked
 * - Double-click an icon to launch the app in an inner window
 * - Apps run within the same Node.js instance (using TsyneWindow abstraction)
 * - Includes a launch bar at the bottom
 *
 * Apps don't need special "contentBuilder" exports - the TsyneWindow abstraction
 * automatically converts a.window() calls to InnerWindow when in desktop mode.
 *
 * Run with: ./scripts/tsyne src/desktop.ts
 * Or import and use: import { buildDesktop, Desktop } from 'tsyne';
 */

import { App } from './app';
import { Window } from './window';
import { MultipleWindows, Label, Button, DesktopCanvas, DesktopMDI } from './widgets';
import { enableDesktopMode, disableDesktopMode, ITsyneWindow } from './tsyne-window';
import { scanForApps, scanPortedApps, loadAppBuilder, AppMetadata } from './app-metadata';
import { ScopedResourceManager, ResourceManager, IResourceManager } from './resources';
import { SandboxedApp, IApp } from './sandboxed-app';
import { Resvg, initResvg } from './resvg-loader';
import { Inspector } from './inspector';
import * as path from 'path';
import * as http from 'http';

// Core services (general-purpose, available everywhere)
import {
  MockClockService,
  MockNotificationService,
  MockStorageService,
  MockSettingsService,
  DesktopAppLifecycle,
  // NotAvailable implementations for phone-specific services
  NotAvailableContactsService,
  NotAvailableTelephonyService,
  NotAvailableSMSService,
} from './services';

// Desktop configuration
const ICON_SIZE = 80;
const ICON_SPACING = 100;
const ICON_POSITION_PREFIX = 'desktop.icon.';
const DOCK_APPS_KEY = 'desktop.dock.apps';

// Desktop options
export interface DesktopOptions {
  /** Directory to scan for apps with @tsyne-app metadata. Defaults to 'examples/' relative to cwd */
  appDirectory?: string;
  /** Pre-defined apps to use instead of scanning directories. For testing. */
  apps?: AppMetadata[];
  /** Port for remote debug server (disabled if not set) */
  debugPort?: number;
}

// Desktop state
interface DesktopIcon {
  metadata: AppMetadata;
  resourceName?: string;
  x: number;
  y: number;
  selected: boolean;
}

interface OpenApp {
  metadata: AppMetadata;
  tsyneWindow: ITsyneWindow;
}

class Desktop {
  private a: App;
  private win: Window | null = null;
  /** Unified desktop+MDI container - solves layering problem */
  private desktopMDI: DesktopMDI | null = null;
  // Keep legacy references for compatibility (may be null)
  private mdiContainer: MultipleWindows | null = null;
  private desktopCanvas: DesktopCanvas | null = null;
  private icons: DesktopIcon[] = [];
  private openApps: Map<string, OpenApp> = new Map();
  private selectedIcon: DesktopIcon | null = null;
  private runningAppsLabel: Label | null = null;
  private options: DesktopOptions;
  /** Counter for generating unique app instance scopes */
  private appInstanceCounter: Map<string, number> = new Map();
  /** Apps pinned to the dock/launch bar */
  private dockedApps: string[] = [];
  /** Cache of registered icon resources keyed by source file */
  private iconResourceCache: Map<string, string> = new Map();
  /** Inspector for widget tree queries */
  private inspector: Inspector | null = null;
  /** Debug HTTP server */
  private debugServer: http.Server | null = null;

  constructor(app: App, options: DesktopOptions = {}) {
    this.a = app;
    this.options = options;
    this.loadDockedApps();
  }

  /**
   * Load docked apps from preferences
   */
  private async loadDockedApps() {
    const saved = await this.a.getPreference(DOCK_APPS_KEY, '');
    if (saved) {
      try {
        this.dockedApps = JSON.parse(saved);
      } catch {
        this.dockedApps = [];
      }
    }
  }

  /**
   * Save docked apps to preferences
   */
  private saveDockedApps() {
    this.a.setPreference(DOCK_APPS_KEY, JSON.stringify(this.dockedApps));
  }

  /**
   * Add an app to the dock
   */
  addToDock(appName: string) {
    if (!this.dockedApps.includes(appName)) {
      this.dockedApps.push(appName);
      this.saveDockedApps();
      this.rebuildLaunchBar();
    }
  }

  /**
   * Remove an app from the dock
   */
  removeFromDock(appName: string) {
    const index = this.dockedApps.indexOf(appName);
    if (index >= 0) {
      this.dockedApps.splice(index, 1);
      this.saveDockedApps();
      this.rebuildLaunchBar();
    }
  }

  /**
   * Check if an app is in the dock
   */
  isInDock(appName: string): boolean {
    return this.dockedApps.includes(appName);
  }

  /**
   * Rebuild just the launch bar (after dock changes)
   */
  private rebuildLaunchBar() {
    // For now, rebuild the whole content - could be optimized later
    if (this.win) {
      this.win.setContent(() => {
        this.a.border({
          center: () => {
            this.desktopMDI = this.a.desktopMDI({ bgColor: '#2d5a87' });
            this.createDesktopIcons();
          },
          bottom: () => {
            this.createLaunchBar();
          }
        });
      });
    }
  }

  /**
   * Get a sanitized key for an app name (for use in preferences)
   */
  private getIconKey(appName: string): string {
    return appName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  /**
   * Render an inline SVG into a PNG data URI for desktop icons
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

    const originalTagLength = match[0].length;
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

    s = tag + s.slice(originalTagLength);
    return s;
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
      const resourceName = `desktop-icon-${this.getIconKey(`${metadata.name}-${baseName}`)}`;
      await this.a.resources.registerResource(resourceName, dataUri);
      this.iconResourceCache.set(cacheKey, resourceName);
      return resourceName;
    } catch (err) {
      console.error(`Failed to register desktop icon for ${metadata.name}:`, err);
      return undefined;
    }
  }

  /**
   * Save icon position to preferences
   */
  private saveIconPosition(appName: string, x: number, y: number) {
    const key = this.getIconKey(appName);
    this.a.setPreference(`${ICON_POSITION_PREFIX}${key}.x`, x.toString());
    this.a.setPreference(`${ICON_POSITION_PREFIX}${key}.y`, y.toString());
  }

  /**
   * Load icon position from preferences
   * Returns null if no saved position exists
   */
  private async loadIconPosition(appName: string): Promise<{ x: number; y: number } | null> {
    const key = this.getIconKey(appName);
    const xStr = await this.a.getPreference(`${ICON_POSITION_PREFIX}${key}.x`, '');
    const yStr = await this.a.getPreference(`${ICON_POSITION_PREFIX}${key}.y`, '');

    if (xStr && yStr) {
      const x = parseInt(xStr, 10);
      const y = parseInt(yStr, 10);
      if (!isNaN(x) && !isNaN(y)) {
        return { x, y };
      }
    }
    return null;
  }

  /**
   * Reset all icon positions to default grid layout
   */
  resetIconLayout() {
    const GRID_COLS = 8;
    let col = 0;
    let row = 0;

    for (const icon of this.icons) {
      icon.x = col * ICON_SPACING + 20;
      icon.y = row * ICON_SPACING + 20;
      this.saveIconPosition(icon.metadata.name, icon.x, icon.y);

      col++;
      if (col >= GRID_COLS) {
        col = 0;
        row++;
      }
    }
  }

  /**
   * Initialize the desktop by scanning for apps
   */
  async init() {
    let apps: AppMetadata[];

    if (this.options.apps) {
      // Use pre-defined apps (for testing)
      apps = this.options.apps;
    } else {
      // Scan directories for apps (relative to cwd, which is repo root when run via ./scripts/tsyne)
      const appDir = this.options.appDirectory || path.join(process.cwd(), 'examples');
      const portedAppsDir = path.join(process.cwd(), 'ported-apps');
      const phoneAppsDir = path.join(process.cwd(), 'phone-apps');

      const exampleApps = scanForApps(appDir);
      const portedApps = scanPortedApps(portedAppsDir);
      const phoneAppsFlat = scanForApps(phoneAppsDir);
      const phoneAppsNested = scanPortedApps(phoneAppsDir);  // Also scan nested phone-apps like voice-assistant/
      apps = [...exampleApps, ...portedApps, ...phoneAppsFlat, ...phoneAppsNested].sort((a, b) => a.name.localeCompare(b.name));
    }

    // Position icons in a grid (8 columns), but use saved positions if available
    const GRID_COLS = 8;
    let col = 0;
    let row = 0;

    for (const metadata of apps) {
      // Try to load saved position, otherwise use default grid position
      const savedPos = await this.loadIconPosition(metadata.name);
      const defaultX = col * ICON_SPACING + 20;
      const defaultY = row * ICON_SPACING + 20;
      const resourceName = await this.prepareIconResource(metadata);

      this.icons.push({
        metadata,
        resourceName,
        x: savedPos?.x ?? defaultX,
        y: savedPos?.y ?? defaultY,
        selected: false
      });

      col++;
      if (col >= GRID_COLS) {
        col = 0;
        row++;
      }
    }

    console.log(`Found ${apps.length} desktop apps`);

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
              '/state': 'Get desktop state',
              '/app/switchTo?id=appId': 'Bring app to front',
              '/app/quit?id=appId': 'Quit app (or front app if no id)',
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
          let clickedWidget: any = null;

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
          res.end(JSON.stringify({ success: true, clicked: widgetId }, null, 2));

        } else if (url.pathname === '/type') {
          const id = url.searchParams.get('id');
          const x = url.searchParams.get('x');
          const y = url.searchParams.get('y');
          const text = url.searchParams.get('text') || '';
          let widgetId = id;

          if (!widgetId && x && y && this.win) {
            const tree = await this.inspector!.getWindowTree(this.win.id);
            const widget = this.findWidgetAtPoint(tree, parseFloat(x), parseFloat(y));
            if (widget) widgetId = widget.id;
          }
          if (!widgetId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'No widget found' }));
            return;
          }
          await this.a.getContext().bridge.send('typeText', { widgetId, text });
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, typed: text, into: widgetId }, null, 2));

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
            iconCount: this.icons.length,
            openAppCount: this.openApps.size,
            dockedApps: this.dockedApps,
          }, null, 2));

        } else if (url.pathname === '/app/switchTo') {
          // Bring an app to the front
          const appId = url.searchParams.get('id');

          if (!appId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing id= param' }));
            return;
          }

          if (!this.openApps.has(appId)) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'App not found', id: appId }));
            return;
          }

          const openApp = this.openApps.get(appId)!;
          await openApp.tsyneWindow.bringToFront();
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            action: 'switchTo',
            appId,
            appName: openApp.metadata.name,
          }, null, 2));

        } else if (url.pathname === '/app/quit') {
          // Quit an app
          const appId = url.searchParams.get('id');

          if (!appId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing id= param' }));
            return;
          }

          if (!this.openApps.has(appId)) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'App not found', id: appId }));
            return;
          }

          const openApp = this.openApps.get(appId)!;
          const appName = openApp.metadata.name;
          await openApp.tsyneWindow.close();
          this.openApps.delete(appId);
          this.updateRunningApps();
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
      console.log(`[desktop] Debug server listening on http://0.0.0.0:${port}`);
    });
  }

  /**
   * Find the deepest widget containing the given absolute coordinates.
   */
  private findWidgetAtPoint(node: any, x: number, y: number): any | null {
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

  /**
   * Build the desktop UI
   */
  build() {
    this.a.window({ title: 'Tsyne Desktop', width: 1024, height: 768 }, (win) => {
      this.win = win as Window;

      // Set up the main menu with hamburger-style options
      win.setMainMenu([
        {
          label: 'Desktop',
          items: [
            { label: 'Re-layout Icons', onSelected: () => this.relayoutAndRefresh() },
            { label: '', isSeparator: true },
            { label: 'Light Theme', onSelected: () => this.setTheme('light') },
            { label: 'Dark Theme', onSelected: () => this.setTheme('dark') },
            { label: '', isSeparator: true },
            { label: 'About', onSelected: () => this.showAbout() }
          ]
        },
        {
          label: 'Dock',
          items: [
            { label: 'Add Selected to Dock', onSelected: () => this.addSelectedToDock() },
            { label: 'Remove Selected from Dock', onSelected: () => this.removeSelectedFromDock() },
            { label: '', isSeparator: true },
            { label: 'Move Selected Left in Dock', onSelected: () => this.moveDockItemLeft() },
            { label: 'Move Selected Right in Dock', onSelected: () => this.moveDockItemRight() },
            { label: '', isSeparator: true },
            { label: 'Clear Dock', onSelected: () => this.clearDock() }
          ]
        },
        {
          label: 'View',
          items: [
            { label: 'Show All Windows', onSelected: () => this.showAllWindows() },
            { label: 'Hide All Windows', onSelected: () => this.hideAllWindows() },
            { label: '', isSeparator: true },
            { label: 'Fullscreen', onSelected: () => win.setFullScreen(true) }
          ]
        }
      ]);

      win.setContent(() => {
        // Use border layout: desktop in center, launch bar at bottom
        this.a.border({
          center: () => {
            // Center: Desktop MDI with icons and windows
            this.desktopMDI = this.a.desktopMDI({ bgColor: '#2d5a87' });
            this.createDesktopIcons();
          },
          bottom: () => {
            // Bottom: Launch bar
            this.createLaunchBar();
          }
        });
      });
    });
  }

  /**
   * Re-layout icons and refresh the desktop display
   */
  private relayoutAndRefresh() {
    this.resetIconLayout();
    // Rebuild the UI to show new positions
    if (this.win && this.desktopMDI) {
      // Update icon positions in the MDI container
      for (let i = 0; i < this.icons.length; i++) {
        const icon = this.icons[i];
        this.desktopMDI.updateIconPosition(`app-${i}`, icon.x, icon.y);
      }
    }
  }

  /**
   * Set the application theme
   */
  private setTheme(theme: 'light' | 'dark') {
    this.a.setTheme(theme);
  }

  /**
   * Show an about dialog
   */
  private async showAbout() {
    if (this.win) {
      await this.win.showInfo('About Tsyne Desktop',
        'Tsyne Desktop Environment\n\n' +
        'A desktop-like environment for launching Tsyne apps.\n\n' +
        'Features:\n' +
        '- Drag icons to arrange them\n' +
        '- Double-click to launch apps\n' +
        '- Positions are saved across restarts\n\n' +
        `Apps available: ${this.icons.length}`
      );
    }
  }

  /**
   * Show app info dialog
   */
  private async showAppInfo(metadata: AppMetadata) {
    if (!this.win) return;

    const lines = [
      `Name: ${metadata.name}`,
      `File: ${metadata.filePath}`,
      `Builder: ${metadata.builder}`,
    ];

    if (metadata.contentBuilder) {
      lines.push(`Content Builder: ${metadata.contentBuilder}`);
    }

    if (metadata.category) {
      lines.push(`Category: ${metadata.category}`);
    }

    lines.push(`Instance Count: ${metadata.count}`);
    lines.push(`Args: ${metadata.args.join(', ')}`);

    if (metadata.icon) {
      lines.push(`Icon: ${metadata.iconIsSvg ? 'SVG' : metadata.icon}`);
    }

    await this.win.showInfo(`App Info: ${metadata.name}`, lines.join('\n'));
  }

  /**
   * Show error dialog when an app crashes during launch
   */
  private async showAppErrorDialog(appName: string, error: unknown) {
    if (!this.win) return;

    const errorMessage = error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);

    const stack = error instanceof Error && error.stack
      ? `\n\nStack trace:\n${error.stack.split('\n').slice(0, 5).join('\n')}`
      : '';

    await this.win.showError(
      `App Crashed: ${appName}`,
      `The application "${appName}" failed to launch.\n\n${errorMessage}${stack}`
    );
  }

  /**
   * Show all open windows
   */
  private showAllWindows() {
    for (const [, openApp] of this.openApps) {
      openApp.tsyneWindow.show();
    }
  }

  /**
   * Hide all open windows
   */
  private hideAllWindows() {
    for (const [, openApp] of this.openApps) {
      openApp.tsyneWindow.hide();
    }
  }

  /**
   * Add the currently selected icon to the dock
   */
  private async addSelectedToDock() {
    if (this.selectedIcon) {
      this.addToDock(this.selectedIcon.metadata.name);
    } else if (this.win) {
      await this.win.showInfo('No Selection', 'Click on an app icon first, then use Dock > Add Selected to Dock');
    }
  }

  /**
   * Remove the currently selected icon from the dock
   */
  private async removeSelectedFromDock() {
    if (this.selectedIcon) {
      if (this.isInDock(this.selectedIcon.metadata.name)) {
        this.removeFromDock(this.selectedIcon.metadata.name);
      } else if (this.win) {
        await this.win.showInfo('Not in Dock', `${this.selectedIcon.metadata.name} is not in the dock`);
      }
    } else if (this.win) {
      await this.win.showInfo('No Selection', 'Click on an app icon first');
    }
  }

  /**
   * Clear all apps from the dock
   */
  private clearDock() {
    this.dockedApps = [];
    this.saveDockedApps();
    this.rebuildLaunchBar();
  }

  /**
   * Move the selected app left in the dock
   */
  private async moveDockItemLeft() {
    if (!this.selectedIcon) {
      if (this.win) await this.win.showInfo('No Selection', 'Click on an app icon first');
      return;
    }

    const appName = this.selectedIcon.metadata.name;
    const index = this.dockedApps.indexOf(appName);

    if (index < 0) {
      if (this.win) await this.win.showInfo('Not in Dock', `${appName} is not in the dock`);
      return;
    }

    if (index === 0) {
      // Already at the leftmost position
      return;
    }

    // Swap with the item to the left
    [this.dockedApps[index - 1], this.dockedApps[index]] =
      [this.dockedApps[index], this.dockedApps[index - 1]];
    this.saveDockedApps();
    this.rebuildLaunchBar();
  }

  /**
   * Move the selected app right in the dock
   */
  private async moveDockItemRight() {
    if (!this.selectedIcon) {
      if (this.win) await this.win.showInfo('No Selection', 'Click on an app icon first');
      return;
    }

    const appName = this.selectedIcon.metadata.name;
    const index = this.dockedApps.indexOf(appName);

    if (index < 0) {
      if (this.win) await this.win.showInfo('Not in Dock', `${appName} is not in the dock`);
      return;
    }

    if (index === this.dockedApps.length - 1) {
      // Already at the rightmost position
      return;
    }

    // Swap with the item to the right
    [this.dockedApps[index], this.dockedApps[index + 1]] =
      [this.dockedApps[index + 1], this.dockedApps[index]];
    this.saveDockedApps();
    this.rebuildLaunchBar();
  }

  /**
   * Create draggable icons on the desktop MDI
   */
  private createDesktopIcons() {
    if (!this.desktopMDI) {
      console.log('ERROR: desktopMDI is null');
      return;
    }

    console.log(`Creating ${this.icons.length} desktop icons`);

    // Color palette for icons
    const colors = [
      '#dc3232', '#32b432', '#3264dc', '#dcb432', '#b432b4', '#32b4b4',
      '#dc6432', '#6432dc', '#32dc64', '#dc3264', '#64dc32', '#3232dc'
    ];

    for (let i = 0; i < this.icons.length; i++) {
      const icon = this.icons[i];
      const color = colors[i % colors.length];

      console.log(`Adding icon: ${icon.metadata.name} at (${icon.x}, ${icon.y})`);
      const iconId = `icon-${icon.metadata.name.toLowerCase().replace(/\s+/g, '-')}`;
      this.desktopMDI.addIcon({
        id: iconId,
        label: icon.metadata.name,
        resource: icon.resourceName,
        x: icon.x,
        y: icon.y,
        color,
        onClick: (iconId, x, y) => {
          this.selectIcon(icon);
        },
        onDoubleClick: (iconId, x, y) => {
          this.launchApp(icon.metadata);
        },
        onDragEnd: (iconId, x, y) => {
          // Update stored position and persist to preferences
          icon.x = x;
          icon.y = y;
          this.saveIconPosition(icon.metadata.name, x, y);
        },
        onRightClick: (iconId, x, y) => {
          this.showAppInfo(icon.metadata);
        }
      });
    }
  }

  /**
   * Get an emoji representation of the app
   */
  private getIconEmoji(name: string): string {
    const emojiMap: Record<string, string> = {
      'calculator': '\u{1F5A9}',   // Calculator
      'counter': '\u{1F522}',       // Numbers
      'todo': '\u{2611}',           // Checkbox
      'clock': '\u{1F550}',         // Clock
      'stopwatch': '\u{23F1}',      // Stopwatch
      'timer': '\u{23F2}',          // Timer
      'calendar': '\u{1F4C5}',      // Calendar
      'notes': '\u{1F4DD}',         // Memo
      'settings': '\u{2699}',       // Gear
      'file': '\u{1F4C1}',          // Folder
      'password': '\u{1F511}',      // Key
      'dice': '\u{1F3B2}',          // Die
      'game': '\u{1F3AE}',          // Game controller
      'rock': '\u{270A}',           // Fist (rock paper scissors)
      'quiz': '\u{2753}',           // Question mark
      'color': '\u{1F3A8}',         // Palette
      'tip': '\u{1F4B5}',           // Money
      'bmi': '\u{2696}',            // Scale
      'form': '\u{1F4CB}',          // Clipboard
      'list': '\u{1F4DD}',          // List
      'shop': '\u{1F6D2}',          // Shopping cart
      'table': '\u{1F4CA}',         // Bar chart
      'player': '\u{1F3C3}',        // Runner
      'hello': '\u{1F44B}',         // Wave
    };

    const nameLower = name.toLowerCase();
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (nameLower.includes(key)) {
        return emoji;
      }
    }
    return '\u{1F4BB}';  // Default: laptop
  }

  /**
   * Select an icon (visual feedback)
   */
  private selectIcon(icon: DesktopIcon) {
    if (this.selectedIcon) {
      this.selectedIcon.selected = false;
    }
    icon.selected = true;
    this.selectedIcon = icon;
  }

  /**
   * Generate a unique scope name for an app instance (e.g., "chess-1", "chess-2")
   */
  private generateAppScope(appName: string): string {
    const count = (this.appInstanceCounter.get(appName) || 0) + 1;
    this.appInstanceCounter.set(appName, count);
    return `${appName.toLowerCase().replace(/\s+/g, '-')}-${count}`;
  }

  /**
   * Launch an app in an inner window using TsyneWindow abstraction.
   * The app's builder calls a.window() which automatically creates
   * an InnerWindow because we're in desktop mode.
   */
  async launchApp(metadata: AppMetadata) {
    // Check if already open - bring to front (unless count allows multiple instances)
    if (metadata.count !== 'many' && metadata.count !== 'desktop-many') {
      const existing = this.openApps.get(metadata.filePath);
      if (existing) {
        await existing.tsyneWindow.show();
        return;
      }
    }

    if (!this.desktopMDI || !this.win) {
      console.error('Desktop MDI or parent window not initialized');
      return;
    }

    // Generate unique scope for this app instance (IoC resource isolation)
    const appScope = this.generateAppScope(metadata.name);

    // Enable desktop mode BEFORE loading the module so that any auto-run
    // app() calls in the module will use the desktop's App instead of creating new ones
    enableDesktopMode({
      desktopMDI: this.desktopMDI,
      parentWindow: this.win,
      desktopApp: this.a,
      onWindowClosed: (closedWindow) => this.handleWindowClosed(closedWindow)
    });

    // Create scoped resource manager for this app instance (IoC)
    const scopedResources = new ScopedResourceManager(
      this.a.resources as ResourceManager,
      appScope
    );

    // Create sandboxed app for this app instance
    // Apps receive IApp interface, not the real App - prevents cross-app interference
    const sandboxedApp = new SandboxedApp(this.a, appScope);

    // Track the created window for cleanup on error
    let createdWindow: ITsyneWindow | null = null;
    let originalWindow: typeof this.a.window | null = null;

    try {
      // Load the app's builder function (module auto-run will use desktop mode)
      const builder = await loadAppBuilder(metadata);
      if (!builder) {
        console.error(`Could not load builder for ${metadata.name}`);
        return;
      }

      // Temporarily monkey-patch the REAL app's window method to capture the window
      // The sandboxed app delegates to real app for window creation
      originalWindow = this.a.window.bind(this.a);
      (this.a as any).window = (options: any, builderFn: any) => {
        const win = originalWindow!(options, builderFn);
        createdWindow = win;
        return win;
      };

      // Build argument array based on @tsyne-app:args metadata (poor man's reflection)
      // 'app' now maps to sandboxedApp, not this.a
      const argMap: Record<string, any> = {
        'app': sandboxedApp,
        'resources': scopedResources,
        // General services (available on all platforms)
        'clock': new MockClockService(),
        'notifications': new MockNotificationService(),
        'storage': new MockStorageService(),
        'settings': new MockSettingsService(),
        // Phone-specific services (NotAvailable on desktop - returns "not a phone" errors)
        'telephony': new NotAvailableTelephonyService(),
        'contacts': new NotAvailableContactsService(),
        'sms': new NotAvailableSMSService(),
        // Desktop lifecycle - closes the inner window (closure captures createdWindow)
        'lifecycle': new DesktopAppLifecycle(() => {
          if (createdWindow) {
            createdWindow.close();
          }
        }),
      };
      const args = metadata.args.map(name => argMap[name]);

      // Call builder with the declared arguments
      await builder(...args);

      // Restore original window method
      (this.a as any).window = originalWindow;
      originalWindow = null;

      if (createdWindow) {
        // Track the open app - use appScope as key for multi-instance apps
        const appKey = (metadata.count === 'many' || metadata.count === 'desktop-many')
          ? appScope
          : metadata.filePath;
        this.openApps.set(appKey, { metadata, tsyneWindow: createdWindow });
        this.updateRunningApps();
        console.log(`Launched: ${metadata.name}`);
      }
    } catch (error) {
      // App crashed during launch - clean up and show error
      console.error(`Error launching ${metadata.name}:`, error);

      // Close any partially created window
      // Note: createdWindow can be set inside the monkey-patched window method,
      // so we need the type assertion here
      const windowToClose = createdWindow as ITsyneWindow | null;
      if (windowToClose) {
        try {
          await windowToClose.close();
        } catch (closeError) {
          // Ignore close errors
        }
      }

      // Show error dialog
      this.showAppErrorDialog(metadata.name, error);
    } finally {
      // Always disable desktop mode when done
      disableDesktopMode();

      // Restore window method if not already restored
      if (originalWindow) {
        (this.a as any).window = originalWindow;
      }
    }
  }

  /**
   * Create the launch bar at the bottom
   */
  private createLaunchBar() {
    this.a.hbox(() => {
      // Show Desktop button
      this.a.button('Show Desktop').withId('showDesktopBtn').onClick(() => {
        // Hide all open windows
        for (const [, openApp] of this.openApps) {
          openApp.tsyneWindow.hide();
        }
      });

      this.a.separator();

      // Docked apps section
      if (this.dockedApps.length > 0) {
        for (const appName of this.dockedApps) {
          const icon = this.icons.find(i => i.metadata.name === appName);
          if (icon) {
            // Get first letter as icon placeholder
            const firstLetter = appName.charAt(0).toUpperCase();
            this.a.button(`[${firstLetter}] ${appName}`)
              .withId(`dock-${this.getIconKey(appName)}`)
              .onClick(() => this.launchApp(icon.metadata));
          }
        }
        this.a.separator();
      }

      // Running apps label
      this.a.label('Running: ');
      this.runningAppsLabel = this.a.label('None').withId('runningAppsLabel');

      this.a.spacer();

      // App launcher
      this.a.button('All Apps').withId('allAppsBtn').onClick(() => {
        console.log('Available apps:');
        this.icons.forEach(i => console.log(`  - ${i.metadata.name}`));
      });
    });
  }

  /**
   * Update the running apps display
   */
  private updateRunningApps() {
    if (this.runningAppsLabel) {
      const count = this.openApps.size;
      if (count === 0) {
        this.runningAppsLabel.setText('None');
      } else {
        const names = Array.from(this.openApps.values())
          .map(a => a.metadata.name)
          .join(', ');
        this.runningAppsLabel.setText(`${count} (${names})`);
      }
    }
  }

  /**
   * Handle an inner window closing so the desktop can update state.
   */
  private handleWindowClosed(closedWindow: ITsyneWindow) {
    for (const [key, openApp] of this.openApps.entries()) {
      if (openApp.tsyneWindow.id === closedWindow.id) {
        this.openApps.delete(key);
        this.updateRunningApps();
        break;
      }
    }
  }
}

/**
 * Build the desktop environment
 * @param a - The App instance
 * @param options - Optional desktop configuration
 */
export async function buildDesktop(a: App, options?: DesktopOptions) {
  // Initialize wasm on aarch64 platforms (no-op on x64)
  await initResvg();

  const desktop = new Desktop(a, options);
  await desktop.init();
  desktop.build();
}

export { Desktop };

// Entry point - only run when executed directly
// Check if this module is the main entry point
if (require.main === module) {
  // Import the app function from index
  const { app, resolveTransport  } = require('./index');

  // Check for debug port from environment
  const debugPort = process.env.TSYNE_DEBUG_PORT ? parseInt(process.env.TSYNE_DEBUG_PORT, 10) : undefined;

  app(resolveTransport(), { title: 'Tsyne Desktop' }, async (a: App) => {
    await buildDesktop(a, { debugPort });
  });
}
