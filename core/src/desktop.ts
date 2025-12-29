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
import { MultipleWindows, Label, Button, DesktopCanvas, DesktopMDI, InnerWindow } from './widgets';
import { enableDesktopMode, disableDesktopMode, ITsyneWindow } from './tsyne-window';
import { scanForApps, scanPortedApps, loadAppBuilder, AppMetadata } from './app-metadata';
import { ScopedResourceManager, ResourceManager, IResourceManager } from './resources';
import { SandboxedApp, IApp } from './sandboxed-app';
import { Resvg, initResvg } from './resvg-loader';
import { Inspector } from './inspector';
// Category configuration for app groups (same as phonetop-groups.ts)
const CATEGORY_CONFIG: Record<string, { displayName: string; icon: string }> = {
  'utilities': {
    displayName: 'Utilities',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M40 12L52 24M48 16L24 40L20 52L32 48L56 24C58 22 58 18 56 16L48 8C46 6 42 6 40 8L40 12Z"/><path d="M8 56L20 44"/><circle cx="14" cy="50" r="4" fill="#666"/></svg>`
  },
  'graphics': {
    displayName: 'Graphics',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round"><circle cx="20" cy="44" r="12" fill="#E57373"/><circle cx="32" cy="24" r="12" fill="#81C784"/><circle cx="44" cy="44" r="12" fill="#64B5F6"/></svg>`
  },
  'games': {
    displayName: 'Games',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="18" width="52" height="32" rx="8" fill="#444"/><circle cx="20" cy="34" r="6" fill="#666"/><path d="M20 28v12M14 34h12" stroke="#999" stroke-width="2"/><circle cx="44" cy="30" r="3" fill="#E57373"/><circle cx="50" cy="36" r="3" fill="#81C784"/><circle cx="44" cy="42" r="3" fill="#64B5F6"/><circle cx="38" cy="36" r="3" fill="#FFD54F"/></svg>`
  },
  'media': {
    displayName: 'Media',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="24" fill="#444"/><circle cx="32" cy="32" r="8" fill="#666"/><circle cx="32" cy="32" r="2" fill="#999"/><path d="M32 8v4M32 52v4M8 32h4M52 32h4"/></svg>`
  },
  'phone': {
    displayName: 'Phone',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="4" width="32" height="56" rx="4" fill="#444"/><line x1="26" y1="10" x2="38" y2="10" stroke="#666"/><circle cx="32" cy="52" r="3" fill="#666"/></svg>`
  },
  'system': {
    displayName: 'System',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3"><circle cx="32" cy="32" r="10"/><path d="M32 8v6M32 50v6M8 32h6M50 32h6M14 14l4 4M46 46l4 4M14 50l4-4M46 18l4-4"/></svg>`
  },
  'fun': {
    displayName: 'Fun',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round"><circle cx="32" cy="36" r="22" fill="#FFD54F"/><circle cx="24" cy="32" r="3" fill="#444"/><circle cx="40" cy="32" r="3" fill="#444"/><path d="M22 44c4 6 16 6 20 0" stroke="#444" stroke-width="3"/></svg>`
  },
  'productivity': {
    displayName: 'Productivity',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="48" height="48" rx="4" fill="#444"/><path d="M16 20h32M16 32h24M16 44h28" stroke="#999"/><path d="M48 24l-8 8-4-4" stroke="#81C784" stroke-width="3"/></svg>`
  },
  'creativity': {
    displayName: 'Creativity',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round"><path d="M32 8l6 18h18l-14 10 6 18-16-12-16 12 6-18-14-10h18z" fill="#FFD54F" stroke="#F9A825"/></svg>`
  },
  'development': {
    displayName: 'Development',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20l-12 12 12 12M44 20l12 12-12 12M38 12l-12 40"/></svg>`
  },
  'native': {
    displayName: 'Native',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="48" height="48" rx="4" fill="#444"/><path d="M20 32h24M32 20v24" stroke="#999" stroke-width="2"/><circle cx="20" cy="20" r="3" fill="#81C784"/></svg>`
  },
};
import * as path from 'path';
import * as http from 'http';
import * as os from 'os';
import * as fs from 'fs';

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
const WINDOW_MODE_KEY = 'desktop.windowMode';

type WindowMode = 'inner' | 'external';

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

/** Folder containing apps grouped by category */
interface DesktopFolder {
  name: string;
  category: string;
  apps: DesktopIcon[];
  resourceName?: string;
  x: number;
  y: number;
}

/** File icon for files on ~/Desktop/ */
interface FileIcon {
  filePath: string;      // Full path to the file
  fileName: string;      // Display name (basename)
  resourceName?: string; // Icon resource (thumbnail or generic)
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
  /** Uncategorized app icons shown directly on desktop */
  private icons: DesktopIcon[] = [];
  /** Folders containing categorized apps */
  private folders: DesktopFolder[] = [];
  /** File icons from ~/Desktop/ */
  private fileIcons: FileIcon[] = [];
  /** Cache of folder icon resources by category */
  private folderIconCache: Map<string, string> = new Map();
  private openApps: Map<string, OpenApp> = new Map();
  private selectedIcon: DesktopIcon | null = null;
  private selectedFolder: DesktopFolder | null = null;
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
  /** Window mode: 'inner' (MDI) or 'external' (separate OS windows) */
  private windowMode: WindowMode = 'inner';

  constructor(app: App, options: DesktopOptions = {}) {
    this.a = app;
    this.options = options;
    this.loadDockedApps();
    this.loadWindowMode();
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
   * Load window mode from preferences
   */
  private async loadWindowMode() {
    const saved = await this.a.getPreference(WINDOW_MODE_KEY, 'inner');
    if (saved === 'inner' || saved === 'external') {
      this.windowMode = saved;
    }
  }

  /**
   * Save window mode to preferences
   */
  private saveWindowMode() {
    this.a.setPreference(WINDOW_MODE_KEY, this.windowMode);
  }

  /**
   * Set window mode and save preference
   */
  setWindowMode(mode: WindowMode) {
    this.windowMode = mode;
    this.saveWindowMode();
    this.updateMainMenu();
  }

  /**
   * Get current window mode
   */
  getWindowMode(): WindowMode {
    return this.windowMode;
  }

  /**
   * Update the main menu (e.g., after window mode changes)
   */
  private updateMainMenu() {
    if (!this.win) return;

    this.win.setMainMenu([
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
        label: 'Windows',
        items: [
          { label: 'Inner Windows (MDI)', checked: this.windowMode === 'inner', onSelected: () => this.setWindowMode('inner') },
          { label: 'External Windows (OS)', checked: this.windowMode === 'external', onSelected: () => this.setWindowMode('external') },
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
          { label: 'Center All Windows', onSelected: () => this.centerAllWindows() },
          { label: '', isSeparator: true },
          { label: 'Fullscreen', onSelected: () => this.win!.setFullScreen(true) }
        ]
      }
    ]);
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

    // Group apps by category
    const appsByCategory = new Map<string, DesktopIcon[]>();
    const uncategorizedApps: DesktopIcon[] = [];

    // First, create DesktopIcon objects for all apps
    for (const metadata of apps) {
      const resourceName = await this.prepareIconResource(metadata);
      const icon: DesktopIcon = {
        metadata,
        resourceName,
        x: 0,  // Will be set during layout
        y: 0,
        selected: false
      };

      const category = metadata.category;
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
    this.folders = [];
    for (const [category, categoryApps] of appsByCategory) {
      const config = CATEGORY_CONFIG[category];
      const resourceName = await this.prepareFolderIconResource(category, config.icon);
      this.folders.push({
        name: config.displayName,
        category,
        apps: categoryApps,
        resourceName,
        x: 0,  // Will be set during layout
        y: 0
      });
    }
    // Sort folders by name
    this.folders.sort((a, b) => a.name.localeCompare(b.name));

    // Set uncategorized apps as the main icons list
    this.icons = uncategorizedApps;

    // Position folders first, then uncategorized icons in a grid
    const GRID_COLS = 8;
    let col = 0;
    let row = 0;

    // Position folders
    for (const folder of this.folders) {
      const savedPos = await this.loadIconPosition(`folder:${folder.category}`);
      const defaultX = col * ICON_SPACING + 20;
      const defaultY = row * ICON_SPACING + 20;
      folder.x = savedPos?.x ?? defaultX;
      folder.y = savedPos?.y ?? defaultY;

      col++;
      if (col >= GRID_COLS) {
        col = 0;
        row++;
      }
    }

    // Position uncategorized icons
    for (const icon of this.icons) {
      const savedPos = await this.loadIconPosition(icon.metadata.name);
      const defaultX = col * ICON_SPACING + 20;
      const defaultY = row * ICON_SPACING + 20;
      icon.x = savedPos?.x ?? defaultX;
      icon.y = savedPos?.y ?? defaultY;

      col++;
      if (col >= GRID_COLS) {
        col = 0;
        row++;
      }
    }

    const totalApps = apps.length;
    const folderApps = this.folders.reduce((sum, f) => sum + f.apps.length, 0);
    console.log(`Found ${totalApps} desktop apps: ${this.folders.length} folders (${folderApps} apps), ${this.icons.length} uncategorized`);

    // Scan for files on ~/Desktop/
    await this.scanDesktopFiles(col, row);

    // Start debug server if port specified
    if (this.options.debugPort) {
      this.startDebugServer(this.options.debugPort);
    }
  }

  /**
   * Scan ~/Desktop/ for PNG files and create file icons
   */
  private async scanDesktopFiles(startCol: number, startRow: number) {
    const desktopDir = path.join(os.homedir(), 'Desktop');

    // Check if directory exists
    try {
      await fs.promises.access(desktopDir, fs.constants.R_OK);
    } catch {
      console.log(`Desktop directory not found: ${desktopDir}`);
      return;
    }

    // Read directory and filter for PNG files
    try {
      const entries = await fs.promises.readdir(desktopDir, { withFileTypes: true });
      const pngFiles = entries
        .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.png'))
        .map(e => e.name);

      if (pngFiles.length === 0) {
        console.log('No PNG files found in ~/Desktop/');
        return;
      }

      console.log(`Found ${pngFiles.length} PNG files in ~/Desktop/`);

      // Prepare the generic image icon resource
      const imageIconResource = await this.prepareFileIconResource();

      // Position file icons after folders and apps
      const GRID_COLS = 8;
      let col = startCol;
      let row = startRow;

      for (const fileName of pngFiles) {
        const filePath = path.join(desktopDir, fileName);
        const savedPos = await this.loadIconPosition(`file:${fileName}`);
        const defaultX = col * ICON_SPACING + 20;
        const defaultY = row * ICON_SPACING + 20;

        this.fileIcons.push({
          filePath,
          fileName,
          resourceName: imageIconResource,
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
    } catch (err) {
      console.error('Error scanning desktop files:', err);
    }
  }

  /**
   * Prepare a generic image icon resource for file icons
   */
  private async prepareFileIconResource(): Promise<string | undefined> {
    // Generic image/photo icon SVG
    const imageSvg = `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="8" y="8" width="48" height="48" rx="4" fill="#f0f0f0"/>
      <circle cx="24" cy="24" r="6" fill="#FFD54F"/>
      <path d="M8 44 L24 32 L36 44 L48 28 L56 40 L56 52 C56 54.2 54.2 56 52 56 L12 56 C9.8 56 8 54.2 8 52 Z" fill="#81C784"/>
    </svg>`;

    try {
      const normalized = this.normalizeSvg(imageSvg, ICON_SIZE);
      const renderer = new Resvg(normalized, {
        fitTo: { mode: 'width', value: ICON_SIZE },
        background: 'rgba(0,0,0,0)'
      });
      const png = renderer.render().asPng();
      const buffer = Buffer.from(png);
      const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;

      const resourceName = `file-icon-image`;
      this.a.registerResource(resourceName, dataUri);
      return resourceName;
    } catch (err) {
      console.error('Failed to prepare file icon resource:', err);
      return undefined;
    }
  }

  /**
   * Prepare a folder icon resource (render SVG to PNG)
   */
  private async prepareFolderIconResource(category: string, svg: string): Promise<string | undefined> {
    if (this.folderIconCache.has(category)) {
      return this.folderIconCache.get(category);
    }

    try {
      const normalized = this.normalizeSvg(svg, ICON_SIZE);
      const renderer = new Resvg(normalized, {
        fitTo: { mode: 'width', value: ICON_SIZE },
        background: 'rgba(0,0,0,0)'
      });
      const png = renderer.render().asPng();
      const buffer = Buffer.from(png);
      const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;

      const resourceName = `desktop-folder-${category}`;
      await this.a.resources.registerResource(resourceName, dataUri);
      this.folderIconCache.set(category, resourceName);
      return resourceName;
    } catch (err) {
      console.error(`Failed to register folder icon for ${category}:`, err);
      return undefined;
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
              '/doubleClick?id=widgetId': 'Double-click widget by ID',
              '/doubleClick?x=N&y=N': 'Double-click widget at coordinates',
              '/type?id=widgetId&text=hello': 'Type text into widget',
              '/icons': 'List all desktop icons (available apps)',
              '/launch?name=appName': 'Launch app by name',
              '/apps': 'List open/running apps',
              '/state': 'Get desktop state',
              '/app/switchTo?id=appId': 'Bring app to front',
              '/app/quit?id=appId': 'Quit app by id',
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

        } else if (url.pathname === '/doubleClick') {
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
          await this.a.getContext().bridge.send('doubleTapWidget', { widgetId });
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, doubleClicked: widgetId }, null, 2));

        } else if (url.pathname === '/launch') {
          // Launch app by name
          const name = url.searchParams.get('name');
          if (!name) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing name= param' }));
            return;
          }

          const icon = this.icons.find(i =>
            i.metadata.name.toLowerCase() === name.toLowerCase() ||
            i.metadata.name.toLowerCase().includes(name.toLowerCase())
          );

          if (!icon) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'App not found', name }));
            return;
          }

          try {
            await this.launchApp(icon.metadata);
            res.writeHead(200);
            res.end(JSON.stringify({
              success: true,
              launched: icon.metadata.name,
              filePath: icon.metadata.filePath
            }, null, 2));
          } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({
              error: 'Launch failed',
              name: icon.metadata.name,
              details: String(err)
            }));
          }

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

        } else if (url.pathname === '/icons') {
          // List all desktop icons (available apps)
          const icons = this.icons.map(icon => ({
            name: icon.metadata.name,
            filePath: icon.metadata.filePath,
            category: icon.metadata.category,
            x: icon.x,
            y: icon.y
          }));
          res.writeHead(200);
          res.end(JSON.stringify({ icons, count: icons.length }, null, 2));

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

      // Set up the main menu
      this.updateMainMenu();

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
   * Center all windows (useful for recovering off-screen windows)
   * Includes both app windows and folder windows
   */
  private async centerAllWindows() {
    if (!this.desktopMDI) return;

    // Get all window IDs from the MDI container (includes folders and apps)
    const windowIds = this.desktopMDI.getWindowIds();

    // Center position - place windows at a reasonable starting position
    const centerX = 100;
    const centerY = 100;
    let offset = 0;

    for (const windowId of windowIds) {
      // Send move command directly via bridge
      await this.a.getContext().bridge.send('moveInnerWindow', {
        widgetId: windowId,
        x: centerX + offset,
        y: centerY + offset
      });
      offset += 30;
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

    console.log(`Creating ${this.folders.length} folder icons and ${this.icons.length} app icons`);

    // Color palette for icons
    const colors = [
      '#dc3232', '#32b432', '#3264dc', '#dcb432', '#b432b4', '#32b4b4',
      '#dc6432', '#6432dc', '#32dc64', '#dc3264', '#64dc32', '#3232dc'
    ];

    // Add folder icons first
    for (let i = 0; i < this.folders.length; i++) {
      const folder = this.folders[i];
      const color = colors[i % colors.length];

      console.log(`Adding folder: ${folder.name} at (${folder.x}, ${folder.y}) with ${folder.apps.length} apps`);
      const folderId = `folder-${folder.category}`;
      this.desktopMDI.addIcon({
        id: folderId,
        label: `${folder.name} (${folder.apps.length})`,
        resource: folder.resourceName,
        x: folder.x,
        y: folder.y,
        color,
        onClick: (_iconId, _x, _y) => {
          this.selectFolder(folder);
        },
        onDoubleClick: (_iconId, _x, _y) => {
          this.openFolderWindow(folder);
        },
        onDragEnd: (_iconId, x, y) => {
          folder.x = x;
          folder.y = y;
          this.saveIconPosition(`folder:${folder.category}`, x, y);
        },
        onRightClick: (_iconId, _x, _y) => {
          this.showFolderInfo(folder);
        }
      });
    }

    // Add app icons (uncategorized apps)
    for (let i = 0; i < this.icons.length; i++) {
      const icon = this.icons[i];
      const color = colors[(i + this.folders.length) % colors.length];

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
        },
        onDropReceived: (droppedIconId) => {
          this.handleFileDrop(icon.metadata, droppedIconId);
        }
      });
    }

    // Add file icons (PNG files from ~/Desktop/)
    for (let i = 0; i < this.fileIcons.length; i++) {
      const fileIcon = this.fileIcons[i];
      const color = colors[(i + this.folders.length + this.icons.length) % colors.length];

      console.log(`Adding file icon: ${fileIcon.fileName} at (${fileIcon.x}, ${fileIcon.y})`);
      const iconId = `file-${fileIcon.fileName.toLowerCase().replace(/\s+/g, '-')}`;
      this.desktopMDI.addIcon({
        id: iconId,
        label: fileIcon.fileName,
        resource: fileIcon.resourceName,
        x: fileIcon.x,
        y: fileIcon.y,
        color,
        onClick: (_iconId, _x, _y) => {
          this.selectFileIcon(fileIcon);
        },
        onDoubleClick: (_iconId, _x, _y) => {
          this.launchFileWithApp(fileIcon);
        },
        onDragEnd: (_iconId, x, y) => {
          fileIcon.x = x;
          fileIcon.y = y;
          this.saveIconPosition(`file:${fileIcon.fileName}`, x, y);
        },
        onRightClick: (_iconId, _x, _y) => {
          this.showFileInfo(fileIcon);
        }
      });
    }
  }

  /**
   * Select a file icon (visual feedback)
   */
  private selectFileIcon(fileIcon: FileIcon) {
    this.selectedIcon = null;
    this.selectedFolder = null;
    // Deselect all file icons
    for (const f of this.fileIcons) {
      f.selected = false;
    }
    fileIcon.selected = true;
  }

  /**
   * Show file info dialog
   */
  private async showFileInfo(fileIcon: FileIcon) {
    if (!this.win) return;

    await this.win.showInfo(
      `File: ${fileIcon.fileName}`,
      `Path: ${fileIcon.filePath}\nType: PNG Image`
    );
  }

  /**
   * Launch a file with its associated app
   */
  private launchFileWithApp(fileIcon: FileIcon) {
    // Find image-viewer app
    const imageViewerApp = this.findAppByName('Image Viewer');
    if (imageViewerApp) {
      this.launchApp(imageViewerApp, fileIcon.filePath);
    } else {
      console.error('Image Viewer app not found');
      this.win?.showInfo('Error', 'Image Viewer app not found');
    }
  }

  /**
   * Find an app by name (searches folders and uncategorized icons)
   */
  private findAppByName(name: string): AppMetadata | null {
    // Check uncategorized icons
    const icon = this.icons.find(i => i.metadata.name === name);
    if (icon) return icon.metadata;

    // Check folder apps
    for (const folder of this.folders) {
      const app = folder.apps.find(i => i.metadata.name === name);
      if (app) return app.metadata;
    }

    return null;
  }

  /**
   * Find a file icon by its desktop icon ID
   */
  private findFileIconById(iconId: string): FileIcon | null {
    if (!iconId.startsWith('file-')) return null;

    // Icon IDs are: file-${fileName.toLowerCase().replace(/\s+/g, '-')}
    // So we need to match the generated ID pattern
    for (const fileIcon of this.fileIcons) {
      const expectedId = `file-${fileIcon.fileName.toLowerCase().replace(/\s+/g, '-')}`;
      if (expectedId === iconId) {
        return fileIcon;
      }
    }
    return null;
  }

  /** Apps that support opening files via drag-and-drop */
  private static readonly FILE_DROP_APPS = new Set([
    'Image Viewer',
    'Pixel Editor',
  ]);

  /**
   * Handle a file being dropped on an app icon
   */
  private handleFileDrop(appMetadata: AppMetadata, droppedIconId: string) {
    const fileIcon = this.findFileIconById(droppedIconId);
    if (fileIcon) {
      if (Desktop.FILE_DROP_APPS.has(appMetadata.name)) {
        console.log(`File dropped on ${appMetadata.name}: ${fileIcon.filePath}`);
        this.launchApp(appMetadata, fileIcon.filePath);
      } else {
        console.log(`${appMetadata.name} doesn't support file drops`);
        this.win?.showInfo('Not Supported', `${appMetadata.name} doesn't support opening files.`);
      }
    } else {
      console.log(`Non-file icon dropped on ${appMetadata.name}: ${droppedIconId}`);
    }
  }

  /**
   * Select a folder (visual feedback)
   */
  private selectFolder(folder: DesktopFolder) {
    this.selectedIcon = null;
    this.selectedFolder = folder;
  }

  /**
   * Show folder info dialog
   */
  private async showFolderInfo(folder: DesktopFolder) {
    if (!this.win) return;

    const appNames = folder.apps.map(icon => icon.metadata.name).join('\n  - ');
    await this.win.showInfo(
      `Folder: ${folder.name}`,
      `Category: ${folder.category}\n` +
      `Apps (${folder.apps.length}):\n  - ${appNames}`
    );
  }

  /**
   * Open a folder window showing all apps in the folder
   */
  private openFolderWindow(folder: DesktopFolder) {
    if (!this.desktopMDI) return;

    // Create an inner window for the folder contents
    const windowTitle = `${folder.name} (${folder.apps.length} apps)`;

    // Calculate grid dimensions based on number of apps
    const cols = 4;
    const rows = Math.ceil(folder.apps.length / cols);

    this.desktopMDI.addWindowWithContent(windowTitle, () => {
      // Simple scrollable content - no border layout to avoid stretching
      const scroll = this.a.scroll(() => {
        this.a.vbox(() => {
          // Header
          this.a.center(() => {
            this.a.label(`${folder.name}`, undefined, 'center');
          });
          this.a.separator();

          // App grid (4 columns) - fill all cells including empty ones
          this.a.grid(cols, () => {
            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) {
                const index = row * cols + col;
                if (index < folder.apps.length) {
                  const icon = folder.apps[index];
                  this.a.vbox(() => {
                    // Use hbox with spacers for horizontal centering only
                    // (center() would also center vertically, causing y-separation)
                    this.a.hbox(() => {
                      this.a.spacer();
                      if (icon.resourceName) {
                        this.a.image({
                          resource: icon.resourceName,
                          fillMode: 'original',
                          onClick: () => this.launchApp(icon.metadata)
                        });
                      } else {
                        this.a.button(this.getIconEmoji(icon.metadata.name))
                          .onClick(() => this.launchApp(icon.metadata));
                      }
                      this.a.spacer();
                    });
                    this.a.label(icon.metadata.name, undefined, 'center');
                    this.a.spacer();  // Push content to top of cell
                  });
                } else {
                  // Empty cell - placeholder to keep grid consistent
                  this.a.label('');
                }
              }
            }
          });
        });
      });
      // Set minimum size so the window is reasonably sized
      scroll.withMinSize(450, 300);
    });
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
   * @param metadata App metadata
   * @param filePath Optional file path to pass to the app (e.g., for opening files)
   */
  async launchApp(metadata: AppMetadata, filePath?: string) {
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
    // Only enable if window mode is 'inner' (MDI); external windows don't need desktop mode
    const useInnerWindows = this.windowMode === 'inner';
    if (useInnerWindows) {
      enableDesktopMode({
        desktopMDI: this.desktopMDI,
        parentWindow: this.win,
        desktopApp: this.a,
        onWindowClosed: (closedWindow) => this.handleWindowClosed(closedWindow)
      });
    }

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
        'filePath': filePath,  // Optional file path for opening files
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

      // Lazily load additional services from phone-apps when needed
      for (const argName of metadata.args) {
        if (argMap[argName] === undefined) {
          try {
            if (argName === 'battery') {
              const { MockBatteryService } = require('../../phone-apps/battery/battery-service');
              argMap['battery'] = new MockBatteryService();
            } else if (argName === 'recording') {
              const { MockRecordingService } = require('../../phone-apps/audio-recorder/recording-service');
              argMap['recording'] = new MockRecordingService();
            } else if (argName === 'camera') {
              const { MockCameraService } = require('../../phone-apps/camera/camera-service');
              argMap['camera'] = new MockCameraService();
            } else if (argName === 'music') {
              const { MockMusicService } = require('../../phone-apps/music-player/music-service');
              argMap['music'] = new MockMusicService();
            } else if (argName === 'calendar') {
              const { MockCalendarService } = require('../../phone-apps/calendar/calendar-service');
              argMap['calendar'] = new MockCalendarService();
            } else if (argName === 'modem') {
              // Modem is phone-only, provide NotAvailable
              argMap['modem'] = { isAvailable: () => false, getUnavailableReason: () => 'Modem is not available on desktop' };
            } else if (argName === 'win') {
              // Apps that require 'win' expect someone else to create the window
              // This is not supported in desktop mode - they should use a.window() instead
              console.warn(`App ${metadata.name} requires 'win' argument which is not available in desktop mode`);
              argMap['win'] = null;
            }
          } catch (err) {
            console.warn(`Could not load service '${argName}' for ${metadata.name}:`, err);
          }
        }
      }

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
      // Disable desktop mode if we enabled it
      if (useInnerWindows) {
        disableDesktopMode();
      }

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

  // Prevent unhandled promise rejections from crashing the desktop
  // This catches errors from apps that throw after their builder returns
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('[desktop] Unhandled promise rejection (app may have crashed):', reason);
    // Don't exit - keep the desktop running
  });

  // Check for debug port from environment
  const debugPort = process.env.TSYNE_DEBUG_PORT ? parseInt(process.env.TSYNE_DEBUG_PORT, 10) : undefined;

  app(resolveTransport(), { title: 'Tsyne Desktop' }, async (a: App) => {
    await buildDesktop(a, { debugPort });
  });
}
