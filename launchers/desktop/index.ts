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

import { App } from 'tsyne';
import { Window } from 'tsyne';
import { MultipleWindows, Label, Button, DesktopCanvas, DesktopMDI, InnerWindow } from 'tsyne';
import { ITsyneWindow } from 'tsyne';
import { parseAppMetadata, AppMetadata } from 'tsyne';
import { ALL_APPS } from '../all-apps';
import { initResvg } from 'tsyne';
import { Inspector } from 'tsyne';
import * as path from 'path';

// Import types and configuration from desktop_types
import {
  ICON_SPACING,
  WINDOW_MODE_KEY,
  WindowMode,
  DesktopOptions,
  DesktopIcon,
  DesktopFolder,
  OpenApp,
  CATEGORY_CONFIG,
  FILE_DROP_APPS,
  ICON_EMOJI_MAP,
  DEFAULT_ICON_EMOJI,
} from './desktop_types';

// Import debug server
import { DesktopDebugServer, IDesktopDebugHost } from './desktop_debug';

// Import icon manager
import { DesktopIconManager } from './desktop_icons';

// Import app launcher
import { AppLauncher, AppLauncherContext } from './desktop_launch';

// Import dock manager
import { DockManager } from './desktop_dock';

// Import file icon manager
import { FileIconManager, FileIconCallbacks } from './desktop_files';

// Re-export types for external use
export { DesktopOptions, DesktopIcon, DesktopFolder, FileIcon, OpenApp } from './desktop_types';
export { FileIconManager, FileIconCallbacks } from './desktop_files';

class Desktop implements IDesktopDebugHost {
  private a: App;
  private _win: Window | null = null;
  /** Unified desktop+MDI container - solves layering problem */
  private desktopMDI: DesktopMDI | null = null;
  // Keep legacy references for compatibility (may be null)
  private mdiContainer: MultipleWindows | null = null;
  private desktopCanvas: DesktopCanvas | null = null;
  /** Uncategorized app icons shown directly on desktop */
  private _icons: DesktopIcon[] = [];
  /** Folders containing categorized apps */
  private folders: DesktopFolder[] = [];
  /** File icon manager */
  private fileManager!: FileIconManager;
  private _openApps: Map<string, OpenApp> = new Map();
  private selectedIcon: DesktopIcon | null = null;
  private selectedFolder: DesktopFolder | null = null;
  private runningAppsLabel: Label | null = null;
  private options: DesktopOptions;
  /** Dock/launch bar manager */
  private dockManager: DockManager;
  /** Inspector for widget hit testing */
  private inspector: Inspector;
  /** Debug HTTP server */
  private debugServer: DesktopDebugServer | null = null;
  /** Window mode: 'inner' (MDI) or 'external' (separate OS windows) */
  private windowMode: WindowMode = 'inner';
  /** Icon resource manager */
  private iconManager: DesktopIconManager;
  /** App launcher */
  private appLauncher: AppLauncher;
  /** All available apps (for DesktopService) */
  private _appList: AppMetadata[] = [];

  // IDesktopDebugHost implementation
  get win(): Window | null { return this._win; }
  get icons(): DesktopIcon[] { return this._icons; }
  get openApps(): Map<string, OpenApp> { return this._openApps; }
  get dockedApps(): string[] { return this.dockManager.getAll(); }

  constructor(app: App, options: DesktopOptions = {}) {
    this.a = app;
    this.options = options;
    this.iconManager = new DesktopIconManager(app);
    this.appLauncher = new AppLauncher();
    this.dockManager = new DockManager(app, () => this.rebuildLaunchBar());
    this.fileManager = new FileIconManager(this.iconManager);
    this.inspector = new Inspector(app.getContext().bridge);
    this.dockManager.load();
    this.loadWindowMode();
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
    if (!this._win) return;

    this._win.setMainMenu([
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
          { label: 'Add Selected to Dock', onSelected: () => this.dockManager.addSelectedWithFeedback(this.selectedIcon?.metadata.name ?? null, this._win) },
          { label: 'Remove Selected from Dock', onSelected: () => this.dockManager.removeSelectedWithFeedback(this.selectedIcon?.metadata.name ?? null, this._win) },
          { label: '', isSeparator: true },
          { label: 'Move Selected Left in Dock', onSelected: () => this.dockManager.moveSelectedLeftWithFeedback(this.selectedIcon?.metadata.name ?? null, this._win) },
          { label: 'Move Selected Right in Dock', onSelected: () => this.dockManager.moveSelectedRightWithFeedback(this.selectedIcon?.metadata.name ?? null, this._win) },
          { label: '', isSeparator: true },
          { label: 'Clear Dock', onSelected: () => this.dockManager.clear() }
        ]
      },
      {
        label: 'View',
        items: [
          { label: 'Show All Windows', onSelected: () => this.showAllWindows() },
          { label: 'Hide All Windows', onSelected: () => this.hideAllWindows() },
          { label: 'Center All Windows', onSelected: () => this.centerAllWindows() },
          { label: '', isSeparator: true },
          { label: 'Fullscreen', onSelected: () => this._win!.setFullScreen(true) }
        ]
      }
    ]);
  }

  /**
   * Rebuild just the launch bar (after dock changes)
   */
  private rebuildLaunchBar() {
    // For now, rebuild the whole content - could be optimized later
    if (this._win) {
      this._win.setContent(() => {
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
   * Reset all icon positions to default grid layout
   */
  resetIconLayout() {
    const GRID_COLS = 8;
    let col = 0;
    let row = 0;

    for (const icon of this._icons) {
      icon.x = col * ICON_SPACING + 20;
      icon.y = row * ICON_SPACING + 20;
      this.iconManager.saveIconPosition(icon.metadata.name, icon.x, icon.y);

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
      // Load metadata from all registered apps
      apps = [];
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
    }

    // Store for DesktopService
    this._appList = apps;

    // Group apps by category
    const appsByCategory = new Map<string, DesktopIcon[]>();
    const uncategorizedApps: DesktopIcon[] = [];

    // First, create DesktopIcon objects for all apps
    for (const metadata of apps) {
      const resourceName = await this.iconManager.prepareIconResource(metadata);
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
      const resourceName = await this.iconManager.prepareFolderIconResource(category, config.icon);
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
    this._icons = uncategorizedApps;

    // Position folders first, then uncategorized icons in a grid
    const GRID_COLS = 8;
    let col = 0;
    let row = 0;

    // Position folders
    for (const folder of this.folders) {
      const savedPos = await this.iconManager.loadIconPosition(`folder:${folder.category}`);
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
    for (const icon of this._icons) {
      const savedPos = await this.iconManager.loadIconPosition(icon.metadata.name);
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
    console.log(`Found ${totalApps} desktop apps: ${this.folders.length} folders (${folderApps} apps), ${this._icons.length} uncategorized`);

    // Scan for files on ~/Desktop/
    await this.fileManager.scan(col, row);

    // Start debug server if port specified
    if (this.options.debugPort) {
      this.debugServer = new DesktopDebugServer(this.a, this);
      this.debugServer.start(this.options.debugPort);

      // Register cleanup callback to stop debug server
      this.a.registerCleanup(() => {
        if (this.debugServer) {
          this.debugServer.stop();
          this.debugServer = null;
        }
      });
    }
  }

  /**
   * Build the desktop UI
   */
  build() {
    this.a.window({ title: 'Tsyne Desktop', width: 1024, height: 768 }, (win) => {
      this._win = win as Window;

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
    if (this._win && this.desktopMDI) {
      // Update icon positions in the MDI container
      for (let i = 0; i < this._icons.length; i++) {
        const icon = this._icons[i];
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
    if (this._win) {
      await this._win.showInfo('About Tsyne Desktop',
        'Tsyne Desktop Environment\n\n' +
        'A desktop-like environment for launching Tsyne apps.\n\n' +
        'Features:\n' +
        '- Drag icons to arrange them\n' +
        '- Double-click to launch apps\n' +
        '- Positions are saved across restarts\n\n' +
        `Apps available: ${this._icons.length}`
      );
    }
  }

  /**
   * Show app info dialog
   */
  private async showAppInfo(metadata: AppMetadata) {
    if (!this._win) return;

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

    await this._win.showInfo(`App Info: ${metadata.name}`, lines.join('\n'));
  }

  /**
   * Show error dialog when an app crashes during launch
   */
  private async showAppErrorDialog(appName: string, error: unknown) {
    if (!this._win) return;

    const errorMessage = error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);

    const stack = error instanceof Error && error.stack
      ? `\n\nStack trace:\n${error.stack.split('\n').slice(0, 5).join('\n')}`
      : '';

    await this._win.showError(
      `App Crashed: ${appName}`,
      `The application "${appName}" failed to launch.\n\n${errorMessage}${stack}`
    );
  }

  /**
   * Show all open windows
   */
  private showAllWindows() {
    for (const [, openApp] of this._openApps) {
      openApp.tsyneWindow.show();
    }
  }

  /**
   * Hide all open windows
   */
  private hideAllWindows() {
    for (const [, openApp] of this._openApps) {
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
   * Create draggable icons on the desktop MDI
   */
  private createDesktopIcons() {
    if (!this.desktopMDI) {
      console.log('ERROR: desktopMDI is null');
      return;
    }

    console.log(`Creating ${this.folders.length} folder icons and ${this._icons.length} app icons`);

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
          this.iconManager.saveIconPosition(`folder:${folder.category}`, x, y);
        },
        onRightClick: (_iconId, _x, _y) => {
          this.showFolderInfo(folder);
        },
        onDropReceived: (droppedIconId) => {
          this.handleFolderDrop(folder, droppedIconId);
        }
      });
    }

    // Add app icons (uncategorized apps)
    for (let i = 0; i < this._icons.length; i++) {
      const icon = this._icons[i];
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
          this.iconManager.saveIconPosition(icon.metadata.name, x, y);
        },
        onRightClick: (iconId, x, y) => {
          this.showAppInfo(icon.metadata);
        },
        onDropReceived: (droppedIconId) => {
          this.fileManager.handleDrop(icon.metadata, droppedIconId, this.getFileIconCallbacks());
        }
      });
    }

    // Add file icons (PNG files from ~/Desktop/)
    const fileIcons = this.fileManager.getAll();
    for (let i = 0; i < fileIcons.length; i++) {
      const fileIcon = fileIcons[i];
      const color = colors[(i + this.folders.length + this._icons.length) % colors.length];

      console.log(`Adding file icon: ${fileIcon.fileName} at (${fileIcon.x}, ${fileIcon.y})`);
      const iconId = this.fileManager.getIconId(fileIcon);
      this.desktopMDI.addIcon({
        id: iconId,
        label: fileIcon.fileName,
        resource: fileIcon.resourceName,
        x: fileIcon.x,
        y: fileIcon.y,
        color,
        onClick: (_iconId, _x, _y) => {
          this.selectedIcon = null;
          this.selectedFolder = null;
          this.fileManager.select(fileIcon);
        },
        onDoubleClick: (_iconId, _x, _y) => {
          this.fileManager.launchWithApp(fileIcon, this.getFileIconCallbacks());
        },
        onDrag: async (_iconId, x, y, _dx, _dy) => {
          // Log what's under the pointer during drag
          await this.logWidgetUnderPointer(x, y);
        },
        onDragEnd: (_iconId, x, y) => {
          this.fileManager.savePosition(fileIcon, x, y);
        },
        onRightClick: (_iconId, _x, _y) => {
          this.fileManager.showInfo(fileIcon, this._win);
        }
      });
    }
  }

  /**
   * Log the widget under the given coordinates (for drag debugging)
   */
  private async logWidgetUnderPointer(x: number, y: number): Promise<void> {
    if (!this._win) return;
    try {
      const tree = await this.inspector.getWindowTree(this._win.id);
      const result = this.findWidgetAtPointWithPath(tree, x, y, []);
      if (result) {
        const { widget, path } = result;
        // Look for folder-app: custom ID in the widget or its ancestors
        const folderApp = this.findFolderAppInPath(path);
        if (folderApp) {
          console.log(`[drag] At (${x.toFixed(0)}, ${y.toFixed(0)}): ${folderApp}`);
        } else if (widget?.customId) {
          console.log(`[drag] At (${x.toFixed(0)}, ${y.toFixed(0)}): ${widget.customId}`);
        } else if (widget?.type) {
          console.log(`[drag] At (${x.toFixed(0)}, ${y.toFixed(0)}): ${widget.type} (${widget.id})`);
        }
      }
    } catch (err) {
      // Ignore errors during drag
    }
  }

  /**
   * Find folder-app: custom ID in the path from root to the hit widget
   */
  private findFolderAppInPath(path: any[]): string | null {
    for (const node of path) {
      if (node.customId?.startsWith('folder-app:')) {
        return node.customId;
      }
    }
    return null;
  }

  /**
   * Get callbacks for file icon operations
   */
  private getFileIconCallbacks(): FileIconCallbacks {
    return {
      findAppByName: (name: string) => {
        // Check uncategorized icons
        const icon = this._icons.find(i => i.metadata.name === name);
        if (icon) return icon.metadata;
        // Check folder apps
        for (const folder of this.folders) {
          const app = folder.apps.find(i => i.metadata.name === name);
          if (app) return app.metadata;
        }
        return null;
      },
      launchApp: (metadata: AppMetadata, filePath?: string) => this.launchApp(metadata, filePath),
      showInfo: (title: string, message: string) => this._win?.showInfo(title, message),
    };
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
    if (!this._win) return;

    const appNames = folder.apps.map(icon => icon.metadata.name).join('\n  - ');
    await this._win.showInfo(
      `Folder: ${folder.name}`,
      `Category: ${folder.category}\n` +
      `Apps (${folder.apps.length}):\n  - ${appNames}`
    );
  }

  /**
   * Handle a file being dropped on a folder icon
   */
  private async handleFolderDrop(folder: DesktopFolder, droppedIconId: string) {
    const fileIcon = this.fileManager.findById(droppedIconId);
    if (!fileIcon) {
      console.log(`Non-file icon dropped on folder ${folder.name}: ${droppedIconId}`);
      return;
    }

    // Find apps in this folder that support file drops
    const fileDropApps = folder.apps.filter(icon => FILE_DROP_APPS.has(icon.metadata.name));

    if (fileDropApps.length === 0) {
      // No apps in this folder support file drops
      this._win?.showInfo('No Compatible Apps',
        `None of the apps in "${folder.name}" can open files.`);
      return;
    }

    if (fileDropApps.length === 1) {
      // Only one app - launch it directly
      const app = fileDropApps[0].metadata;
      console.log(`File dropped on folder ${folder.name}, opening with ${app.name}: ${fileIcon.filePath}`);
      this.launchApp(app, fileIcon.filePath);
      return;
    }

    // Multiple apps - show picker
    const appOptions = fileDropApps.map(icon => ({
      label: icon.metadata.name,
      value: icon.metadata.name
    }));

    // Use form dialog with select field for app picker
    if (!this._win) return;

    const result = await this._win.showForm(
      'Open With',
      [{
        name: 'app',
        label: 'Choose app to open file:',
        type: 'select',
        options: appOptions.map(o => o.label)
      }],
      { confirmText: 'Open', dismissText: 'Cancel' }
    );

    if (result.submitted && result.values.app) {
      const selectedAppName = result.values.app as string;
      const selectedApp = fileDropApps.find(icon => icon.metadata.name === selectedAppName);
      if (selectedApp) {
        console.log(`File dropped on folder ${folder.name}, user chose ${selectedApp.metadata.name}: ${fileIcon.filePath}`);
        this.launchApp(selectedApp.metadata, fileIcon.filePath);
      }
    }
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

    // Custom ID prefix for folder app icons
    const FOLDER_APP_PREFIX = 'folder-app:';

    this.desktopMDI.addWindowWithContent(
      windowTitle,
      () => {
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
                    // Use custom ID for hit testing: folder-app:AppName
                    // Put it on the entire cell so the whole area is droppable
                    const customId = `${FOLDER_APP_PREFIX}${icon.metadata.name}`;
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
                    }).withId(customId);
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
      },
      undefined, // onClose
      async (droppedIconId, dropX, dropY) => {
        // Handle file drops on this folder window
        const fileIcon = this.fileManager.findById(droppedIconId);
        if (!fileIcon || !this._win) {
          return;
        }

        // Use inspector to find which widget is at the drop coordinates
        try {
          const tree = await this.inspector.getWindowTree(this._win.id);
          const result = this.findWidgetAtPointWithPath(tree, dropX, dropY, []);

          if (result) {
            // Look for folder-app: custom ID in the path from root to the hit widget
            const folderAppId = this.findFolderAppInPath(result.path);

            if (folderAppId) {
              // Extract app name from custom ID
              const appName = folderAppId.slice(FOLDER_APP_PREFIX.length);
              const targetApp = folder.apps.find(icon => icon.metadata.name === appName);

              if (targetApp) {
                if (FILE_DROP_APPS.has(targetApp.metadata.name)) {
                  this.launchApp(targetApp.metadata, fileIcon.filePath);
                } else {
                  this._win?.showInfo('Cannot Open File',
                    `${targetApp.metadata.name} cannot open files.`);
                }
              }
            }
          }
          // If no app found at drop point, just do nothing (icon returns to original position)
        } catch (err) {
          console.error('Error finding widget at drop point:', err);
        }
      }
    );
  }

  /**
   * Find the deepest widget containing the given absolute coordinates.
   */
  private findWidgetAtPoint(node: any, x: number, y: number): any | null {
    const result = this.findWidgetAtPointWithPath(node, x, y, []);
    return result?.widget || null;
  }

  /**
   * Find the deepest widget at coordinates, returning both the widget and the path from root.
   */
  private findWidgetAtPointWithPath(node: any, x: number, y: number, currentPath: any[]): { widget: any; path: any[] } | null {
    const inBounds = node.visible !== false &&
      x >= node.absX && x < node.absX + node.w &&
      y >= node.absY && y < node.absY + node.h;
    if (!inBounds) return null;

    const newPath = [...currentPath, node];

    if (node.children && node.children.length > 0) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        const childMatch = this.findWidgetAtPointWithPath(node.children[i], x, y, newPath);
        if (childMatch) return childMatch;
      }
    }
    return { widget: node, path: newPath };
  }

  /**
   * Get an emoji representation of the app
   */
  private getIconEmoji(name: string): string {
    const nameLower = name.toLowerCase();
    for (const [key, emoji] of Object.entries(ICON_EMOJI_MAP)) {
      if (nameLower.includes(key)) {
        return emoji;
      }
    }
    return DEFAULT_ICON_EMOJI;
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
   * Launch an app using the AppLauncher
   */
  async launchApp(metadata: AppMetadata, filePath?: string) {
    if (!this.desktopMDI || !this._win) {
      console.error('Desktop MDI or parent window not initialized');
      return;
    }

    const ctx: AppLauncherContext = {
      app: this.a,
      win: this._win,
      desktopMDI: this.desktopMDI,
      windowMode: this.windowMode,
      openApps: this._openApps,
      appList: this._appList,
      onAppLaunched: (appKey, openApp) => {
        this._openApps.set(appKey, openApp);
        this.updateRunningApps();
      },
      onAppClosed: (closedWindow) => this.handleWindowClosed(closedWindow),
      showErrorDialog: (appName, error) => this.showAppErrorDialog(appName, error),
    };

    await this.appLauncher.launchApp(ctx, metadata, filePath);
  }

  /**
   * Create the launch bar at the bottom
   */
  private createLaunchBar() {
    this.a.hbox(() => {
      // Show Desktop button
      this.a.button('Show Desktop').withId('showDesktopBtn').onClick(() => {
        // Hide all open windows
        for (const [, openApp] of this._openApps) {
          openApp.tsyneWindow.hide();
        }
      });

      this.a.separator();

      // Docked apps section
      const dockedApps = this.dockManager.getAll();
      if (dockedApps.length > 0) {
        for (const appName of dockedApps) {
          const icon = this._icons.find(i => i.metadata.name === appName);
          if (icon) {
            // Get first letter as icon placeholder
            const firstLetter = appName.charAt(0).toUpperCase();
            this.a.button(`[${firstLetter}] ${appName}`)
              .withId(`dock-${this.iconManager.getIconKey(appName)}`)
              .onClick(() => this.launchApp(icon.metadata));
          }
        }
        this.a.separator();
      }

      // Running apps label
      this.a.label('Running: ');
      this.runningAppsLabel = this.a.label('None').withId('runningAppsLabel');

      this.a.spacer();

      // App Search
      const allAppNames = this._appList.map(app => app.name).sort();

      const searchEntry = this.a.completionEntry([], 'Search apps...', async (text) => {
        if (!text) {
          await searchEntry.hideCompletion();
          return;
        }

        const filtered = allAppNames.filter(name =>
          name.toLowerCase().includes(text.toLowerCase())
        );

        await searchEntry.setOptions(filtered);

        if (filtered.length > 0) {
          await searchEntry.showCompletion();
        } else {
          await searchEntry.hideCompletion();
        }
      }, (text) => {
        // Launch on submit
        const app = this._appList.find(a => a.name === text);
        if (app) {
          this.launchApp(app);
          searchEntry.setText('');
          searchEntry.hideCompletion();
        }
      }).withId('appSearch');

      // Theme Toggle
      this.a.button('🌗').onClick(async () => {
        const current = await this.a.getTheme();
        this.a.setTheme(current === 'light' ? 'dark' : 'light');
      }).withId('themeToggle');

      // Clock
      const clockLabel = this.a.label(new Date().toLocaleTimeString());
      const timer = setInterval(() => {
        clockLabel.setText(new Date().toLocaleTimeString());
      }, 1000);
      this.a.registerCleanup(() => clearInterval(timer));
    });
  }

  /**
   * Update the running apps display
   */
  updateRunningApps() {
    if (this.runningAppsLabel) {
      const count = this._openApps.size;
      if (count === 0) {
        this.runningAppsLabel.setText('None');
      } else {
        const names = Array.from(this._openApps.values())
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
    for (const [key, openApp] of this._openApps.entries()) {
      if (openApp.tsyneWindow.id === closedWindow.id) {
        this._openApps.delete(key);
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
