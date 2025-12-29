/**
 * Desktop Dock Manager
 *
 * Manages the dock/launch bar's pinned apps - persistence, add/remove, reordering.
 */

import { App } from './app';
import { Window } from './window';
import { DOCK_APPS_KEY } from './desktop_types';

/**
 * Manages pinned apps in the dock/launch bar
 */
export class DockManager {
  private app: App;
  private dockedApps: string[] = [];
  private onDockChanged: () => void;

  constructor(app: App, onDockChanged: () => void) {
    this.app = app;
    this.onDockChanged = onDockChanged;
  }

  /**
   * Load docked apps from preferences
   */
  async load(): Promise<void> {
    const saved = await this.app.getPreference(DOCK_APPS_KEY, '');
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
  private save(): void {
    this.app.setPreference(DOCK_APPS_KEY, JSON.stringify(this.dockedApps));
  }

  /**
   * Get all docked app names
   */
  getAll(): string[] {
    return this.dockedApps;
  }

  /**
   * Add an app to the dock
   */
  add(appName: string): void {
    if (!this.dockedApps.includes(appName)) {
      this.dockedApps.push(appName);
      this.save();
      this.onDockChanged();
    }
  }

  /**
   * Remove an app from the dock
   */
  remove(appName: string): void {
    const index = this.dockedApps.indexOf(appName);
    if (index >= 0) {
      this.dockedApps.splice(index, 1);
      this.save();
      this.onDockChanged();
    }
  }

  /**
   * Check if an app is in the dock
   */
  contains(appName: string): boolean {
    return this.dockedApps.includes(appName);
  }

  /**
   * Clear all apps from the dock
   */
  clear(): void {
    this.dockedApps = [];
    this.save();
    this.onDockChanged();
  }

  /**
   * Move an app left in the dock
   * @returns true if moved, false if already at left edge or not in dock
   */
  moveLeft(appName: string): boolean {
    const index = this.dockedApps.indexOf(appName);
    if (index < 0 || index === 0) {
      return false;
    }

    // Swap with the item to the left
    [this.dockedApps[index - 1], this.dockedApps[index]] =
      [this.dockedApps[index], this.dockedApps[index - 1]];
    this.save();
    this.onDockChanged();
    return true;
  }

  /**
   * Move an app right in the dock
   * @returns true if moved, false if already at right edge or not in dock
   */
  moveRight(appName: string): boolean {
    const index = this.dockedApps.indexOf(appName);
    if (index < 0 || index === this.dockedApps.length - 1) {
      return false;
    }

    // Swap with the item to the right
    [this.dockedApps[index], this.dockedApps[index + 1]] =
      [this.dockedApps[index + 1], this.dockedApps[index]];
    this.save();
    this.onDockChanged();
    return true;
  }

  /**
   * Add selected icon to dock with user feedback
   */
  async addSelectedWithFeedback(selectedAppName: string | null, win: Window | null): Promise<void> {
    if (selectedAppName) {
      this.add(selectedAppName);
    } else if (win) {
      await win.showInfo('No Selection', 'Click on an app icon first, then use Dock > Add Selected to Dock');
    }
  }

  /**
   * Remove selected icon from dock with user feedback
   */
  async removeSelectedWithFeedback(selectedAppName: string | null, win: Window | null): Promise<void> {
    if (selectedAppName) {
      if (this.contains(selectedAppName)) {
        this.remove(selectedAppName);
      } else if (win) {
        await win.showInfo('Not in Dock', `${selectedAppName} is not in the dock`);
      }
    } else if (win) {
      await win.showInfo('No Selection', 'Click on an app icon first');
    }
  }

  /**
   * Move selected app left with user feedback
   */
  async moveSelectedLeftWithFeedback(selectedAppName: string | null, win: Window | null): Promise<void> {
    if (!selectedAppName) {
      if (win) await win.showInfo('No Selection', 'Click on an app icon first');
      return;
    }

    if (!this.contains(selectedAppName)) {
      if (win) await win.showInfo('Not in Dock', `${selectedAppName} is not in the dock`);
      return;
    }

    this.moveLeft(selectedAppName);
  }

  /**
   * Move selected app right with user feedback
   */
  async moveSelectedRightWithFeedback(selectedAppName: string | null, win: Window | null): Promise<void> {
    if (!selectedAppName) {
      if (win) await win.showInfo('No Selection', 'Click on an app icon first');
      return;
    }

    if (!this.contains(selectedAppName)) {
      if (win) await win.showInfo('Not in Dock', `${selectedAppName} is not in the dock`);
      return;
    }

    this.moveRight(selectedAppName);
  }
}
