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
 * Run with: ./scripts/tsyne examples/desktop.ts
 */

import { app, App, Window, MultipleWindows, Label, Button, enableDesktopMode, disableDesktopMode, ITsyneWindow } from '../src';
import { scanForApps, loadAppBuilder, AppMetadata } from '../src/desktop-metadata';
import * as path from 'path';

// Desktop configuration
const ICON_SIZE = 80;
const ICON_SPACING = 100;

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
  private mdiContainer: MultipleWindows | null = null;
  private icons: DesktopIcon[] = [];
  private openApps: Map<string, OpenApp> = new Map();
  private iconWidgets: Map<string, Button> = new Map();
  private selectedIcon: DesktopIcon | null = null;
  private lastClickTime: Map<string, number> = new Map();
  private runningAppsLabel: Label | null = null;

  constructor(app: App) {
    this.a = app;
  }

  /**
   * Initialize the desktop by scanning for apps
   */
  init() {
    const examplesDir = path.join(__dirname);
    const apps = scanForApps(examplesDir);

    // Position icons in a grid (8 columns)
    const GRID_COLS = 8;
    let col = 0;
    let row = 0;

    for (const metadata of apps) {
      this.icons.push({
        metadata,
        x: col * ICON_SPACING + 20,
        y: row * ICON_SPACING + 20,
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
      win.setContent(() => {
        this.a.border({
          center: () => {
            // Stack: desktop icons underneath, MDI windows on top
            this.a.stack(() => {
              // Desktop background with scrollable icon grid
              this.a.scroll(() => {
                this.a.gridwrap(ICON_SIZE, ICON_SIZE + 24, () => {
                  for (const icon of this.icons) {
                    this.createIconWidget(icon);
                  }
                });
              });

              // MDI container for open app windows
              this.mdiContainer = this.a.multipleWindows();
            });
          },
          bottom: () => {
            // Launch bar
            this.createLaunchBar();
          }
        });
      });
    });
  }

  /**
   * Create a desktop icon widget
   */
  private createIconWidget(icon: DesktopIcon) {
    const iconId = `icon-${icon.metadata.name.replace(/\s+/g, '-').toLowerCase()}`;

    this.a.vbox(() => {
      // Icon button with emoji
      const iconBtn = this.a.button(this.getIconEmoji(icon.metadata.name))
        .withId(iconId);

      // Handle clicks (single = select, double = launch)
      iconBtn.onClick(() => {
        const now = Date.now();
        const lastClick = this.lastClickTime.get(iconId) || 0;

        if (now - lastClick < 400) {
          // Double click - launch the app
          this.launchApp(icon.metadata);
        } else {
          // Single click - select
          this.selectIcon(icon);
        }

        this.lastClickTime.set(iconId, now);
      });

      // Icon label
      this.a.label(icon.metadata.name, undefined, 'center');

      this.iconWidgets.set(icon.metadata.filePath, iconBtn);
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
   * Launch an app in an inner window using TsyneWindow abstraction.
   * The app's builder calls a.window() which automatically creates
   * an InnerWindow because we're in desktop mode.
   */
  async launchApp(metadata: AppMetadata) {
    // Check if already open - bring to front
    const existing = this.openApps.get(metadata.filePath);
    if (existing) {
      await existing.tsyneWindow.show();
      return;
    }

    // Load the app's builder function
    const builder = await loadAppBuilder(metadata);
    if (!builder) {
      console.error(`Could not load builder for ${metadata.name}`);
      return;
    }

    if (!this.mdiContainer || !this.win) {
      console.error('MDI container or parent window not initialized');
      return;
    }

    // Enable desktop mode so a.window() creates InnerWindows
    enableDesktopMode({
      mdiContainer: this.mdiContainer,
      parentWindow: this.win
    });

    try {
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

      builder(this.a);

      // Restore original
      (this.a as any).window = originalWindow;

      if (createdWindow) {
        // Track the open app
        this.openApps.set(metadata.filePath, { metadata, tsyneWindow: createdWindow });
        this.updateRunningApps();
        console.log(`Launched: ${metadata.name}`);
      }
    } finally {
      // Always disable desktop mode when done
      disableDesktopMode();
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

      // Running apps label
      this.a.label('Running: ');
      this.runningAppsLabel = this.a.label('None').withId('runningAppsLabel');

      this.a.spacer();

      // Quick launch for Calculator (demo)
      this.a.button('\u{1F5A9} Calc').withId('quickCalcBtn').onClick(() => {
        const calcApp = this.icons.find(i => i.metadata.name === 'Calculator');
        if (calcApp) {
          this.launchApp(calcApp.metadata);
        }
      });

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
}

// Build the desktop environment
export function buildDesktop(a: App) {
  const desktop = new Desktop(a);
  desktop.init();
  desktop.build();
}

// Skip auto-run when imported by test framework
const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (!isTestEnvironment) {
  app({ title: 'Tsyne Desktop' }, buildDesktop);
}

export { Desktop };
