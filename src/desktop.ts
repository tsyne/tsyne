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
import { scanForApps, scanPortedApps, loadAppBuilder, AppMetadata } from './desktop-metadata';
import { ScopedResourceManager, ResourceManager, IResourceManager } from './resources';
import * as path from 'path';

// Desktop configuration
const ICON_SIZE = 80;
const ICON_SPACING = 100;
const ICON_POSITION_PREFIX = 'desktop.icon.';
const DOCK_APPS_KEY = 'desktop.dock.apps';

// Desktop options
export interface DesktopOptions {
  /** Directory to scan for apps with @tsyne-app metadata. Defaults to 'examples/' relative to cwd */
  appDirectory?: string;
}

// Desktop state
interface DesktopIcon {
  metadata: AppMetadata;
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
    const appDir = this.options.appDirectory || path.join(process.cwd(), 'examples');
    const portedAppsDir = path.join(process.cwd(), 'ported-apps');

    // Scan both examples and ported-apps directories
    const exampleApps = scanForApps(appDir);
    const portedApps = scanPortedApps(portedAppsDir);
    const apps = [...exampleApps, ...portedApps].sort((a, b) => a.name.localeCompare(b.name));

    // Position icons in a grid (8 columns), but use saved positions if available
    const GRID_COLS = 8;
    let col = 0;
    let row = 0;

    for (const metadata of apps) {
      // Try to load saved position, otherwise use default grid position
      const savedPos = await this.loadIconPosition(metadata.name);
      const defaultX = col * ICON_SPACING + 20;
      const defaultY = row * ICON_SPACING + 20;

      this.icons.push({
        metadata,
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
      this.desktopMDI.addIcon({
        id: `app-${i}`,
        label: icon.metadata.name,
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
    // Check if already open - bring to front (unless count is 'many')
    if (metadata.count !== 'many') {
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

    // Save original resources and create scoped version for this app instance
    const originalResources = this.a.resources;
    const scopedResources = new ScopedResourceManager(
      originalResources as ResourceManager,
      appScope
    );

    try {
      // Load the app's builder function (module auto-run will use desktop mode)
      const builder = await loadAppBuilder(metadata);
      if (!builder) {
        console.error(`Could not load builder for ${metadata.name}`);
        return;
      }
      // Call the app's builder - it will call a.window() which creates an InnerWindow
      // We need to capture the created window
      let createdWindow: ITsyneWindow | null = null;

      // Temporarily monkey-patch to capture the window
      const originalWindow = this.a.window.bind(this.a);
      (this.a as any).window = (options: any, builderFn: any) => {
        const win = originalWindow(options, builderFn);
        createdWindow = win;
        return win;
      };

      // Inject scoped resources for this app instance (IoC)
      (this.a as any).resources = scopedResources;
      this.a.getContext().setResourceScope(appScope);

      await builder(this.a);

      // Restore originals
      (this.a as any).window = originalWindow;
      (this.a as any).resources = originalResources;
      this.a.getContext().setResourceScope(null);

      if (createdWindow) {
        // Track the open app
        this.openApps.set(metadata.filePath, { metadata, tsyneWindow: createdWindow });
        this.updateRunningApps();
        console.log(`Launched: ${metadata.name}`);
      }
    } finally {
      // Always disable desktop mode when done
      disableDesktopMode();
      // Ensure resources are restored even on error
      (this.a as any).resources = originalResources;
      this.a.getContext().setResourceScope(null);
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
  const desktop = new Desktop(a, options);
  await desktop.init();
  desktop.build();
}

export { Desktop };

// Entry point - only run when executed directly
// Check if this module is the main entry point
if (require.main === module) {
  // Import the app function from index
  const { app } = require('./index');

  app({ title: 'Tsyne Desktop' }, async (a: App) => {
    await buildDesktop(a);
  });
}
