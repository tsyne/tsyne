/**
 * Desktop Settings Panel
 *
 * A settings panel for managing desktop apps and preferences.
 * Can be launched from the desktop or run standalone.
 *
 * Run with: ./scripts/tsyne examples/desktop-settings.ts
 */

// @tsyne-app:name Desktop Settings
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/><path d="M12 2a1 1 0 011 1v2a1 1 0 01-2 0V3a1 1 0 011-1zm0 16a1 1 0 011 1v2a1 1 0 01-2 0v-2a1 1 0 011-1zm10-6a1 1 0 01-1 1h-2a1 1 0 010-2h2a1 1 0 011 1zM6 12a1 1 0 01-1 1H3a1 1 0 010-2h2a1 1 0 011 1zm12.364 5.364a1 1 0 01-1.414 0l-1.414-1.414a1 1 0 011.414-1.414l1.414 1.414a1 1 0 010 1.414zM8.464 8.464a1 1 0 01-1.414 0L5.636 7.05a1 1 0 111.414-1.414l1.414 1.414a1 1 0 010 1.414zm9.9-1.414a1 1 0 01-1.414 1.414L15.536 7.05a1 1 0 111.414-1.414l1.414 1.414zM8.464 15.536a1 1 0 01-1.414 1.414L5.636 18.364a1 1 0 01-1.414-1.414l1.414-1.414a1 1 0 011.414 0z" fill="none" stroke="currentColor" stroke-width="1"/></svg>
// @tsyne-app:category system
// @tsyne-app:contentBuilder buildDesktopSettingsContent

import { app, App, Window, Label, Select, List } from '../src';
import { scanForApps, AppMetadata } from '../src/desktop-metadata';
import * as path from 'path';

interface SettingsState {
  availableApps: AppMetadata[];
  selectedAppIndex: number;
  iconSize: 'small' | 'medium' | 'large';
  gridColumns: number;
}

class DesktopSettings {
  private a: App;
  private state: SettingsState;
  private appListLabel: Label | null = null;
  private selectedAppLabel: Label | null = null;

  constructor(app: App) {
    this.a = app;
    this.state = {
      availableApps: [],
      selectedAppIndex: -1,
      iconSize: 'medium',
      gridColumns: 8
    };
  }

  init() {
    const examplesDir = path.join(__dirname);
    this.state.availableApps = scanForApps(examplesDir);
  }

  buildContent() {
    this.a.tabs([
      {
        title: 'Apps',
        builder: () => this.buildAppsTab()
      },
      {
        title: 'Display',
        builder: () => this.buildDisplayTab()
      },
      {
        title: 'About',
        builder: () => this.buildAboutTab()
      }
    ]);
  }

  private buildAppsTab() {
    this.a.vbox(() => {
      this.a.label('Available Desktop Apps', undefined, 'leading', undefined, { bold: true });
      this.a.separator();

      this.a.hbox(() => {
        // App list
        this.a.vbox(() => {
          const appNames = this.state.availableApps.map(app => app.name);
          this.a.list(
            appNames,
            (index) => {
              this.state.selectedAppIndex = index;
              this.updateSelectedAppInfo();
            }
          );
        });

        this.a.separator();

        // Selected app details
        this.a.vbox(() => {
          this.a.label('App Details', undefined, 'leading', undefined, { bold: true });
          this.a.separator();
          this.selectedAppLabel = this.a.label('Select an app to view details');
        });
      });
    });
  }

  private buildDisplayTab() {
    this.a.vbox(() => {
      this.a.label('Display Settings', undefined, 'leading', undefined, { bold: true });
      this.a.separator();

      // Icon size selector
      this.a.hbox(() => {
        this.a.label('Icon Size:');
        this.a.select(
          ['Small', 'Medium', 'Large'],
          (selected) => {
            this.state.iconSize = selected.toLowerCase() as 'small' | 'medium' | 'large';
          }
        );
      });

      // Grid columns selector
      this.a.hbox(() => {
        this.a.label('Grid Columns:');
        this.a.select(
          ['4', '6', '8', '10', '12'],
          (selected) => {
            this.state.gridColumns = parseInt(selected, 10);
          }
        );
      });

      this.a.spacer();

      this.a.label('Note: Changes apply on desktop restart', undefined, 'center');
    });
  }

  private buildAboutTab() {
    this.a.center(() => {
      this.a.vbox(() => {
        this.a.label('Tsyne Desktop', undefined, 'center', undefined, { bold: true });
        this.a.separator();
        this.a.label('A desktop environment for Tsyne apps', undefined, 'center');
        this.a.spacer();
        this.a.label('Features:', undefined, 'leading', undefined, { bold: true });
        this.a.label('- Launch apps in inner windows');
        this.a.label('- Multiple apps running simultaneously');
        this.a.label('- Shared Node.js instance');
        this.a.label('- Apps work standalone or in desktop');
        this.a.spacer();
        this.a.label(`Total Apps: ${this.state.availableApps.length}`, undefined, 'center');
      });
    });
  }

  private updateSelectedAppInfo() {
    if (!this.selectedAppLabel || this.state.selectedAppIndex < 0) return;

    const app = this.state.availableApps[this.state.selectedAppIndex];
    if (!app) return;

    const info = [
      `Name: ${app.name}`,
      `Category: ${app.category || 'Uncategorized'}`,
      `File: ${path.basename(app.filePath)}`,
      `Builder: ${app.builder}`,
      `Content Builder: ${app.contentBuilder || 'N/A'}`,
      `Desktop Ready: ${app.contentBuilder ? 'Yes' : 'No'}`
    ].join('\n');

    this.selectedAppLabel.setText(info);
  }
}

/**
 * Build just the settings content (for desktop environment)
 */
export function buildDesktopSettingsContent(a: App) {
  const settings = new DesktopSettings(a);
  settings.init();
  settings.buildContent();
}

/**
 * Build the settings in a window (for standalone)
 */
export function buildDesktopSettings(a: App) {
  a.window({ title: 'Desktop Settings', width: 600, height: 400 }, (win: Window) => {
    win.setContent(() => {
      buildDesktopSettingsContent(a);
    });
  });
}

// Skip auto-run when imported by test framework
const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (!isTestEnvironment) {
  app({ title: 'Desktop Settings' }, buildDesktopSettings);
}
