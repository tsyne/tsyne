// @tsyne-app:name File Browser
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z"/></svg>
// @tsyne-app:category utilities
// @tsyne-app:builder createFylesApp

/**
 * Fyles File Browser for Tsyne
 *
 * Ported from https://github.com/FyshOS/fyles
 * Original authors: FyshOS contributors
 * License: See original repository
 *
 * A simple file browser with:
 * - Multi-panel view (multiple side-by-side file browsers)
 * - Directory navigation panel (left) with expandable tree view
 * - File grid view (right)
 * - Toolbar with home button, new folder, split panel, current path
 * - Hidden file filtering
 * - File/folder icons with fancy folder support
 * - Right-click context menus (Open, Copy path)
 * - New folder creation dialog
 * - Drag-and-drop file operations (move files by dragging to folders)
 * - Cross-panel drag-and-drop (drag from one panel, drop in another)
 * - Tree expansion state persistence (remembers expanded folders)
 * - Fancy folder backgrounds (fancyfs style metadata support)
 *
 * Implementation notes:
 * - Uses incremental updates like solitaire (no full rebuild on every change)
 * - Only rebuilds when directory changes
 * - Updates path label directly when just toggling hidden files
 * - Persists state to ~/.tsyne/fyles-state.json
 * - Multiple panels use hsplit for side-by-side layout
 * - Special folder icons for Home, Desktop, Documents, Downloads, Music, Pictures, Videos
 * - Background image detection (.background.png/jpg/svg)
 */

import { app } from '../../src';
import type { App } from '../../src/app';
import type { Window } from '../../src/window';
import * as os from 'os';
import * as path from 'path';
import { FylesStore } from './fyles-store';
import { FileItem, getFileIcon } from './file-item';
import { openFile, getParentDir } from './file-utils';
import { getSpecialFolderIcon, SpecialFolderType } from './folder-metadata';

// ============================================================================
// Multi-Panel Manager
// ============================================================================

/**
 * Manages multiple file browser panels
 */
class FylesMultiPanel {
  private panels: FylesPanel[] = [];
  private app: App;
  private window: Window | null = null;

  constructor(app: App, initialDirs: string[]) {
    this.app = app;

    // Create initial panels
    if (initialDirs.length === 0) {
      initialDirs = [os.homedir()];
    }

    initialDirs.forEach((dir, index) => {
      this.panels.push(new FylesPanel(app, dir, index, this));
    });
  }

  /**
   * Get the number of panels
   */
  getPanelCount(): number {
    return this.panels.length;
  }

  /**
   * Add a new panel (split)
   */
  addPanel(initialDir?: string): void {
    const dir = initialDir || this.panels[this.panels.length - 1]?.getStore().getCurrentDir() || os.homedir();
    const index = this.panels.length;
    this.panels.push(new FylesPanel(this.app, dir, index, this));
    this.rebuildUI();
  }

  /**
   * Remove a panel by index
   */
  removePanel(index: number): void {
    if (this.panels.length <= 1) {
      // Cannot remove the last panel - silently ignore
      return;
    }
    this.panels.splice(index, 1);
    // Re-index remaining panels
    this.panels.forEach((panel, i) => panel.setIndex(i));
    this.rebuildUI();
  }

  /**
   * Get the window reference
   */
  getWindow(): Window | null {
    return this.window;
  }

  /**
   * Build the main UI
   */
  buildUI(win: Window): void {
    this.window = win;

    // Set window reference on all panels
    this.panels.forEach((panel) => panel.setWindow(win));

    if (this.panels.length === 1) {
      // Single panel - simple layout
      this.panels[0].buildPanel();
    } else {
      // Multiple panels - use hsplit recursively
      this.buildSplitPanels(0);
    }
  }

  /**
   * Build panels using nested hsplit
   */
  private buildSplitPanels(startIndex: number): void {
    if (startIndex >= this.panels.length - 1) {
      // Last panel
      this.panels[startIndex].buildPanel();
      return;
    }

    // Split: left panel + rest of panels
    this.app.hsplit(
      () => this.panels[startIndex].buildPanel(),
      () => this.buildSplitPanels(startIndex + 1),
      1.0 / (this.panels.length - startIndex) // Equal distribution
    );
  }

  /**
   * Request a UI rebuild from any panel
   */
  rebuildUI(): void {
    if (!this.window) return;

    this.window.setContent(() => {
      this.buildUI(this.window!);
    });
  }
}

// ============================================================================
// Single Panel Class (MVC Controller/View)
// ============================================================================

/**
 * Represents a single file browser panel
 */
class FylesPanel {
  private store: FylesStore;
  private window: Window | null = null;
  private pathLabel: any = null;
  private app: App;
  private panelIndex: number;
  private multiPanelManager: FylesMultiPanel;

  // Track last directory to detect when we need a full rebuild
  private lastDirectory: string = '';

  constructor(app: App, initialDir: string, index: number, manager: FylesMultiPanel) {
    this.app = app;
    this.panelIndex = index;
    this.multiPanelManager = manager;
    // Each panel gets its own state file to persist its state independently
    const stateFile = index === 0
      ? undefined  // Default state file for first panel
      : path.join(os.homedir(), '.tsyne', `fyles-state-panel-${index}.json`);
    this.store = new FylesStore(initialDir, stateFile);
    this.lastDirectory = this.store.getCurrentDir();

    // Subscribe to store changes → incremental updates
    this.store.subscribe(() => {
      this.handleStoreChange();
    });
  }

  /**
   * Get the store for this panel
   */
  getStore(): FylesStore {
    return this.store;
  }

  /**
   * Set the panel index (used when panels are removed/reordered)
   */
  setIndex(index: number): void {
    this.panelIndex = index;
  }

  /**
   * Set the window reference
   */
  setWindow(win: Window): void {
    this.window = win;
  }

  /**
   * Build this panel's UI
   */
  buildPanel(): void {
    // Use vbox with border layout
    this.app.border({
      top: () => this.buildToolbar(),
      left: () => this.buildNavigationPanel(),
      center: () => this.buildFileGrid(),
    });
  }

  /**
   * Build toolbar (home button, new folder button, split, close, current path)
   */
  private buildToolbar(): void {
    this.app.hbox(() => {
      // Home button
      this.app.button('🏠').onClick(async () => {
        try {
          await this.store.navigateHome();
        } catch (err) {
          await this.window?.showError('Navigation Error', `Failed to navigate home: ${err}`);
        }
      }).withId(`panel-${this.panelIndex}-home`);

      // New folder button
      this.app.button('📁+').onClick(async () => {
        if (!this.window) return;
        const folderName = await this.window.showEntryDialog(
          'New Folder',
          'Enter folder name:'
        );
        if (folderName && folderName.trim()) {
          try {
            await this.store.createFolder(folderName.trim());
          } catch (err) {
            await this.window.showError('Error', `Failed to create folder: ${err}`);
          }
        }
      }).withId(`panel-${this.panelIndex}-newfolder`);

      // Toggle hidden files button
      this.app.button(
        this.store.isShowingHidden() ? '👁️' : '👁️‍🗨️'
      ).onClick(async () => {
        await this.store.toggleShowHidden();
      }).withId(`panel-${this.panelIndex}-hidden`);

      // Split panel button (add new panel)
      this.app.button('⊞').onClick(() => {
        this.multiPanelManager.addPanel(this.store.getCurrentDir());
      }).withId(`panel-${this.panelIndex}-split`);

      // Close panel button (only show if more than one panel)
      if (this.multiPanelManager.getPanelCount() > 1) {
        this.app.button('✕').onClick(() => {
          this.multiPanelManager.removePanel(this.panelIndex);
        }).withId(`panel-${this.panelIndex}-close`);
      }

      // Current path (scrollable label) with context menu
      this.app.scroll(() => {
        this.pathLabel = this.app.label(this.store.getCurrentDir());
        this.pathLabel.withId(`panel-${this.panelIndex}-path`);
        // Add right-click context menu to copy current directory path
        this.pathLabel.setContextMenu([
          {
            label: 'Copy folder path',
            onSelected: async () => {
              if (this.window) {
                await this.window.setClipboard(this.store.getCurrentDir());
              }
            },
          },
        ]);
      });
    });
  }

  /**
   * Build navigation panel (left side) with tree expansion
   * Shows: Parent folder, current folder, and expandable subfolders
   */
  private buildNavigationPanel(): void {
    this.app.scroll(() => {
      this.app.vbox(() => {
        const currentDir = this.store.getCurrentDir();
        const parentDir = getParentDir(currentDir);

        // Parent folder (..)
        if (parentDir) {
          this.app.button('⬆️ ..').onClick(async () => {
            try {
              await this.store.navigateUp();
            } catch (err) {
              await this.window?.showError('Navigation Error', `Failed to navigate up: ${err}`);
            }
          }).withId('parent-dir-btn');

          this.app.separator();
        }

        // Current folder label with collapse all button
        // Use fancy folder icon for special folders
        const currentDirMetadata = this.store.getCurrentDirMetadata();
        const currentFolderIcon = currentDirMetadata.specialType !== SpecialFolderType.None
          ? getSpecialFolderIcon(currentDirMetadata.specialType)
          : '📂';
        this.app.hbox(() => {
          this.app.label(`${currentFolderIcon} ${path.basename(currentDir)}`);
          // Collapse all button (only show if something is expanded)
          if (this.store.getExpandedDirs().length > 0) {
            this.app.button('⏫').onClick(async () => {
              await this.store.collapseAll();
            }).withId('collapse-all-btn');
          }
        });
        this.app.separator();

        // List subdirectories with tree expansion
        const items = this.store.getVisibleItems();
        const dirs = items.filter((item) => item.isDirectory);

        if (dirs.length > 0) {
          this.app.label('Subdirectories:');

          dirs.forEach((dir) => {
            this.buildTreeNode(dir, 0);
          });
        } else {
          this.app.label('(no subdirectories)');
        }
      });
    });
  }

  /**
   * Build a tree node (folder) with expand/collapse support
   */
  private buildTreeNode(dir: FileItem, depth: number): void {
    const isExpanded = this.store.isExpanded(dir.path);
    const indent = '  '.repeat(depth);
    const expandIcon = isExpanded ? '▼' : '▶';

    this.app.hbox(() => {
      // Expand/collapse toggle button
      this.app.button(`${indent}${expandIcon}`).onClick(async () => {
        await this.store.toggleExpanded(dir.path);
      }).withId(`panel-${this.panelIndex}-expand-${dir.fullName}`);

      // Folder button (navigate on click)
      const navButton = this.app.button(`📁 ${dir.fullName}`).onClick(async () => {
        try {
          await this.store.navigateToDir(dir.path);
        } catch (err) {
          await this.window?.showError('Navigation Error', `Failed to open folder: ${err}`);
        }
      }).withId(`panel-${this.panelIndex}-nav-folder-${dir.fullName}`);

      // Make navigation folders droppable
      navButton.makeDroppable({
        onDrop: async (dragData: string, _sourceId: string) => {
          await this.handleFileDrop(dragData, dir.path);
        },
        onDragEnter: () => {
          // Visual feedback handled by Fyne
        },
        onDragLeave: () => {
          // Visual feedback handled by Fyne
        },
      });

      // Add right-click context menu for navigation folders
      navButton.setContextMenu([
        {
          label: 'Open',
          onSelected: async () => {
            try {
              await this.store.navigateToDir(dir.path);
            } catch (err) {
              await this.window?.showError('Navigation Error', `Failed to open folder: ${err}`);
            }
          },
        },
        {
          label: isExpanded ? 'Collapse' : 'Expand',
          onSelected: async () => {
            await this.store.toggleExpanded(dir.path);
          },
        },
        { label: '', onSelected: () => {}, isSeparator: true },
        {
          label: 'Copy folder path',
          onSelected: async () => {
            if (this.window) {
              await this.window.setClipboard(dir.path);
            }
          },
        },
      ]);
    });

    // If expanded, show child directories recursively
    if (isExpanded) {
      const childDirs = this.store.getSubdirectories(dir.path);
      childDirs.forEach((childDir) => {
        this.buildTreeNode(childDir, depth + 1);
      });
    }
  }

  /**
   * Build file grid (center panel)
   * Shows fancy folder background info if available
   */
  private buildFileGrid(): void {
    this.app.scroll(() => {
      const items = this.store.getVisibleItems();
      const metadata = this.store.getCurrentDirMetadata();

      // Use vbox instead of gridwrap for simplicity
      this.app.vbox(() => {
        // Show background image indicator if present (fancy folder feature)
        if (metadata.backgroundImagePath) {
          this.app.hbox(() => {
            this.app.label('🎨');
            this.app.label(`Background: ${path.basename(metadata.backgroundImagePath!)}`);
          });
          this.app.separator();
        }

        if (items.length === 0) {
          this.app.center(() => {
            this.app.label('Empty directory');
          });
          return;
        }

        items.forEach((item) => {
          this.buildFileItem(item);
        });
      });
    });
  }

  /**
   * Build a single file item (icon + label) with context menu and drag-drop
   */
  private buildFileItem(item: FileItem): void {
    this.app.hbox(() => {
      const icon = getFileIcon(item);

      // File icon/emoji as label
      this.app.label(icon);

      // File name as button (clickable)
      const itemType = item.isDirectory ? 'folder' : 'file';
      const button = this.app.button(item.fullName).onClick(async () => {
        await this.handleItemClick(item);
      }).withId(`panel-${this.panelIndex}-grid-${itemType}-${item.fullName}`);

      // Make files and folders draggable (drag data is the file path)
      button.makeDraggable({
        dragData: item.path,
        onDragStart: () => {
          // Drag started - visual feedback handled by Fyne
        },
        onDragEnd: () => {
          // Drag ended - visual feedback handled by Fyne
        },
      });

      // Make folders droppable to receive file drops (on the button itself)
      if (item.isDirectory) {
        button.makeDroppable({
          onDrop: async (dragData: string, _sourceId: string) => {
            await this.handleFileDrop(dragData, item.path);
          },
          onDragEnter: () => {
            // Visual feedback handled by Fyne
          },
          onDragLeave: () => {
            // Visual feedback handled by Fyne
          },
        });
      }

      // Add right-click context menu
      if (item.isDirectory) {
        // Folder context menu
        button.setContextMenu([
          {
            label: 'Open',
            onSelected: async () => {
              await this.handleItemClick(item);
            },
          },
          { label: '', onSelected: () => {}, isSeparator: true },
          {
            label: 'Copy folder path',
            onSelected: async () => {
              if (this.window) {
                await this.window.setClipboard(item.path);
              }
            },
          },
        ]);
      } else {
        // File context menu
        button.setContextMenu([
          {
            label: 'Open',
            onSelected: async () => {
              await this.handleItemClick(item);
            },
          },
          { label: '', onSelected: () => {}, isSeparator: true },
          {
            label: 'Copy path',
            onSelected: async () => {
              if (this.window) {
                await this.window.setClipboard(item.path);
              }
            },
          },
        ]);
      }

      // Add size info for files
      if (!item.isDirectory && item.size !== undefined) {
        const sizeKB = (item.size / 1024).toFixed(1);
        this.app.label(`${sizeKB} KB`);
      }
    });
  }

  /**
   * Handle file drop onto a folder
   */
  private async handleFileDrop(sourcePath: string, destFolder: string): Promise<void> {
    // Don't allow dropping onto itself or parent
    if (sourcePath === destFolder || destFolder.startsWith(sourcePath + path.sep)) {
      await this.window?.showInfo('Cannot Move', 'Cannot move a folder into itself or its children');
      return;
    }

    // Don't allow dropping into same directory (no-op)
    const sourceDir = path.dirname(sourcePath);
    if (sourceDir === destFolder) {
      // Silently ignore - file is already in this directory
      return;
    }

    const fileName = path.basename(sourcePath);

    try {
      // For now, default to move operation
      // Could add a dialog to choose move vs copy
      await this.store.moveItem(sourcePath, destFolder);
    } catch (err) {
      await this.window?.showError('Move Failed', `Failed to move ${fileName}: ${err}`);
    }
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
        await this.window?.showError('Navigation Error', `Failed to open folder: ${err}`);
      }
    } else {
      // Open file with default application
      try {
        await openFile(item.path);
      } catch (err) {
        await this.window?.showError('Open Failed', `Failed to open file: ${err}`);
      }
    }
  }

  /**
   * Handle store changes with incremental updates (like solitaire)
   * - Only rebuild when directory changes
   * - Just update path label when toggling hidden files
   */
  private handleStoreChange(): void {
    // HACK: Add a small delay to debounce UI updates and stabilize tests
    setTimeout(() => {
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
    }, 200); // 200ms delay
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
    // Delegate to multi-panel manager for full rebuild
    this.multiPanelManager.rebuildUI();
  }
}

// ============================================================================
// Legacy Single Panel Class (for backwards compatibility)
// ============================================================================

/**
 * Legacy FylesUI class for single-panel usage (backwards compatible)
 */
class FylesUI {
  private multiPanel: FylesMultiPanel;

  constructor(app: App, initialDir?: string) {
    this.multiPanel = new FylesMultiPanel(app, initialDir ? [initialDir] : []);
  }

  buildUI(win: Window): void {
    this.multiPanel.buildUI(win);
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Create and run the Fyles application with a single panel (backwards compatible)
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
 * Create and run the Fyles application with multiple panels
 */
export function createMultiPanelFylesApp(a: App, initialDirs: string[]): FylesMultiPanel {
  const multiPanel = new FylesMultiPanel(a, initialDirs);

  // Calculate window width based on number of panels
  const panelWidth = 540;
  const width = Math.min(15 + (panelWidth * Math.max(1, initialDirs.length)), 1920);

  a.window({ title: 'Fyles - File Browser', width, height: 600 }, (win) => {
    multiPanel.buildUI(win);
    win.show();
  });

  return multiPanel;
}

/**
 * Standalone entry point
 * Supports multiple directory arguments for multi-panel view:
 *   fyles /path/one /path/two   - Opens two panels
 */
if (require.main === module) {
  app({ title: 'Fyles' }, (a) => {
    // Get initial directories from command line args
    const args = process.argv.slice(2);

    if (args.length === 0) {
      // No args - single panel with home directory
      createFylesApp(a, os.homedir());
    } else if (args.length === 1) {
      // One arg - single panel with specified directory
      createFylesApp(a, args[0]);
    } else {
      // Multiple args - multi-panel view
      createMultiPanelFylesApp(a, args);
    }
  });
}
