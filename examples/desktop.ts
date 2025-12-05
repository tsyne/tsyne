/**
 * Tsyne Desktop Environment
 *
 * A desktop-like environment for launching Tsyne apps.
 * - Displays app icons in a grid that can be clicked
 * - Double-click an icon to launch the app in an inner window
 * - Apps run within the same Node.js instance
 * - Includes a launch bar at the bottom
 *
 * Run with: ./scripts/tsyne examples/desktop.ts
 */

import { app, App, Window, InnerWindow, MultipleWindows, Label, Button } from '../src';
import { scanForApps, loadContentBuilder, AppMetadata } from '../src/desktop-metadata';
import * as path from 'path';

// Desktop configuration
const ICON_SIZE = 80;
const ICON_SPACING = 100;
const LAUNCH_BAR_HEIGHT = 48;

// Desktop state
interface DesktopIcon {
  metadata: AppMetadata;
  x: number;
  y: number;
  selected: boolean;
}

interface OpenApp {
  metadata: AppMetadata;
  innerWindow: InnerWindow;
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
      this.win = win;
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
   * Launch an app in an inner window
   */
  async launchApp(metadata: AppMetadata) {
    // Check if already open - bring to front
    const existing = this.openApps.get(metadata.filePath);
    if (existing) {
      await existing.innerWindow.show();
      return;
    }

    // Load the app's content builder
    const contentBuilder = await loadContentBuilder(metadata);
    if (!contentBuilder) {
      console.error(`Could not load content builder for ${metadata.name}`);
      return;
    }

    if (!this.mdiContainer) {
      console.error('MDI container not initialized');
      return;
    }

    // Check if this is a content builder (doesn't create windows) or full builder
    const hasContentBuilder = !!metadata.contentBuilder;

    // Create inner window with the app content
    const innerWin = this.mdiContainer.addWindow(
      metadata.name,
      () => {
        if (hasContentBuilder) {
          // Content builder - just builds widgets directly
          contentBuilder(this.a);
        } else {
          // Full builder - wrap in a vbox and show a message
          this.a.vbox(() => {
            this.a.label(`App: ${metadata.name}`);
            this.a.label('(Needs contentBuilder for desktop mode)');
          });
        }
      },
      () => {
        // On close callback
        this.openApps.delete(metadata.filePath);
        this.updateRunningApps();
      }
    );

    // Track open app
    this.openApps.set(metadata.filePath, { metadata, innerWindow: innerWin });
    this.updateRunningApps();

    console.log(`Launched: ${metadata.name}`);
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
          openApp.innerWindow.hide();
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
