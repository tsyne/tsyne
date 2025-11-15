/**
 * Fyles File Browser for Tsyne
 *
 * Ported from https://github.com/FyshOS/fyles
 * Original authors: FyshOS contributors
 * License: See original repository
 *
 * A simple file browser with:
 * - Directory navigation panel (left)
 * - File grid view (right)
 * - Toolbar with home button, new folder, current path
 * - Hidden file filtering
 * - File/folder icons
 *
 * Implementation notes:
 * - Uses incremental updates like solitaire (no full rebuild on every change)
 * - Only rebuilds when directory changes
 * - Updates path label directly when just toggling hidden files
 */

import { app } from '../../src';
import type { App } from '../../src/app';
import type { Window } from '../../src/window';
import * as os from 'os';
import * as path from 'path';
import { FylesStore } from './fyles-store';
import { FileItem, getFileIcon } from './file-item';
import { openFile, getParentDir } from './file-utils';

// ============================================================================
// Fyles UI Class (MVC Controller/View)
// ============================================================================

class FylesUI {
  private store: FylesStore;
  private window: Window | null = null;
  private pathLabel: any = null;
  private app: App;

  // Track last directory to detect when we need a full rebuild
  private lastDirectory: string = '';

  constructor(app: App, initialDir?: string) {
    this.app = app;
    this.store = new FylesStore(initialDir);
    this.lastDirectory = this.store.getCurrentDir();

    // Subscribe to store changes → incremental updates
    this.store.subscribe(() => {
      this.handleStoreChange();
    });
  }

  /**
   * Build the main UI
   */
  buildUI(win: Window): void {
    this.window = win;

    // Use vbox with border layout
    this.app.border({
      top: () => this.buildToolbar(),
      left: () => this.buildNavigationPanel(),
      center: () => this.buildFileGrid(),
    });
  }

  /**
   * Build toolbar (home button, new folder button, current path)
   */
  private buildToolbar(): void {
    this.app.hbox(() => {
      // Home button
      this.app.button('🏠', async () => {
        try {
          await this.store.navigateHome();
        } catch (err) {
          console.error('Navigate home failed:', err);
        }
      });

      // New folder button
      this.app.button('📁+', () => {
        console.log('New folder button clicked - dialog not yet implemented');
      });

      // Toggle hidden files button
      this.app.button(
        this.store.isShowingHidden() ? '👁️' : '👁️‍🗨️',
        async () => {
          await this.store.toggleShowHidden();
        }
      );

      // Current path (scrollable label)
      this.app.scroll(() => {
        this.pathLabel = this.app.label(this.store.getCurrentDir());
      });
    });
  }

  /**
   * Build simplified navigation panel (left side)
   * Shows: Parent folder, current folder, and subfolders
   */
  private buildNavigationPanel(): void {
    this.app.scroll(() => {
      this.app.vbox(() => {
        const currentDir = this.store.getCurrentDir();
        const parentDir = getParentDir(currentDir);

        // Parent folder (..)
        if (parentDir) {
          this.app.button('⬆️ ..', async () => {
            try {
              await this.store.navigateUp();
            } catch (err) {
              console.error('Navigate up failed:', err);
            }
          });

          this.app.separator();
        }

        // Current folder label
        this.app.label(`📂 ${path.basename(currentDir)}`);
        this.app.separator();

        // List subdirectories
        const items = this.store.getVisibleItems();
        const dirs = items.filter((item) => item.isDirectory);

        if (dirs.length > 0) {
          this.app.label('Subdirectories:');

          dirs.forEach((dir) => {
            this.app.button(`📁 ${dir.fullName}`, async () => {
              try {
                await this.store.navigateToDir(dir.path);
              } catch (err) {
                console.error('Navigate to dir failed:', err);
              }
            });
          });
        } else {
          this.app.label('(no subdirectories)');
        }
      });
    });
  }

  /**
   * Build file grid (center panel)
   */
  private buildFileGrid(): void {
    this.app.scroll(() => {
      const items = this.store.getVisibleItems();

      if (items.length === 0) {
        this.app.center(() => {
          this.app.label('Empty directory');
        });
        return;
      }

      // Use vbox instead of gridwrap for simplicity
      this.app.vbox(() => {
        items.forEach((item) => {
          this.buildFileItem(item);
        });
      });
    });
  }

  /**
   * Build a single file item (icon + label)
   */
  private buildFileItem(item: FileItem): void {
    this.app.hbox(() => {
      const icon = getFileIcon(item);

      // File icon/emoji as label
      this.app.label(icon);

      // File name as button (clickable)
      this.app.button(item.fullName, async () => {
        await this.handleItemClick(item);
      });

      // Add size info for files
      if (!item.isDirectory && item.size !== undefined) {
        const sizeKB = (item.size / 1024).toFixed(1);
        this.app.label(`${sizeKB} KB`);
      }
    });
  }

  /**
   * Handle click on file/folder item
   */
  private async handleItemClick(item: FileItem): Promise<void> {
    if (item.isDirectory) {
      // Navigate into directory
      try {
        await this.store.navigateToDir(item.path);
      } catch (err) {
        console.error('Navigate to directory failed:', err);
      }
    } else {
      // Open file with default application
      try {
        await openFile(item.path);
        console.log(`Opened file: ${item.path}`);
      } catch (err) {
        console.error('Open file failed:', err);
      }
    }
  }

  /**
   * Handle store changes with incremental updates (like solitaire)
   * - Only rebuild when directory changes
   * - Just update path label when toggling hidden files
   */
  private handleStoreChange(): void {
    const currentDir = this.store.getCurrentDir();
    const dirChanged = currentDir !== this.lastDirectory;

    if (dirChanged) {
      // Directory changed - need full rebuild
      this.lastDirectory = currentDir;
      this.rebuildUI();
    } else {
      // Same directory, just hidden files toggled - incremental update
      // Update path label (even though it's same path, good to refresh)
      this.updatePathLabel();

      // For now, rebuild to show/hide hidden files
      // TODO: Could be more incremental with ModelBoundList pattern
      this.rebuildUI();
    }
  }

  /**
   * Update path label incrementally (like solitaire's updateStatus)
   */
  private async updatePathLabel(): Promise<void> {
    if (this.pathLabel) {
      await this.pathLabel.setText(this.store.getCurrentDir());
    }
  }

  /**
   * Rebuild the entire UI (like solitaire's rebuildUI)
   * Only called when directory changes or files visibility changes
   */
  private rebuildUI(): void {
    if (!this.window) return;

    this.window.setContent(() => {
      this.buildUI(this.window!);
    });
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Create and run the Fyles application
 */
export function createFylesApp(a: App, initialDir?: string): FylesUI {
  const ui = new FylesUI(a, initialDir);

  a.window({ title: 'Fyles - File Browser', width: 800, height: 600 }, (win) => {
    ui.buildUI(win);
    win.show();
  });

  return ui;
}

/**
 * Standalone entry point
 */
if (require.main === module) {
  app({ title: 'Fyles' }, (a) => {
    // Get initial directory from command line args or use home
    const initialDir = process.argv[2] || os.homedir();
    createFylesApp(a, initialDir);
  });
}
