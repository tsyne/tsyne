/**
 * Fyles Observable Store
 *
 * MVC Model for file browser state management.
 * Follows the observable pattern from todomvc examples.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileItem, createFileItem } from './file-item';
import { sortFileItems, getParentDir } from './file-utils';

export type ChangeListener = () => void;

/**
 * Observable file browser store
 */
export class FylesStore {
  private currentDir: string;
  private items: FileItem[] = [];
  private showHidden: boolean = false;
  private changeListeners: ChangeListener[] = [];
  private homeDir: string;

  constructor(initialDir?: string) {
    this.homeDir = os.homedir();
    this.currentDir = initialDir || this.homeDir;
    // Use synchronous load for constructor to avoid race condition with UI
    this.loadDirectorySync(this.currentDir);
  }

  // ========================================
  // Observable Pattern
  // ========================================

  /**
   * Subscribe to store changes
   * @returns Unsubscribe function
   */
  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of changes
   */
  private notifyChange(): void {
    this.changeListeners.forEach((listener) => listener());
  }

  // ========================================
  // State Queries
  // ========================================

  /**
   * Get current directory path
   */
  getCurrentDir(): string {
    return this.currentDir;
  }

  /**
   * Get current directory name
   */
  getCurrentDirName(): string {
    return path.basename(this.currentDir);
  }

  /**
   * Get all items (unfiltered)
   */
  getItems(): FileItem[] {
    return this.items;
  }

  /**
   * Get visible items (respects showHidden filter)
   */
  getVisibleItems(): FileItem[] {
    return this.filterItems(this.items);
  }

  /**
   * Check if showing hidden files
   */
  isShowingHidden(): boolean {
    return this.showHidden;
  }

  /**
   * Get home directory path
   */
  getHomeDir(): string {
    return this.homeDir;
  }

  /**
   * Check if can navigate up
   */
  canNavigateUp(): boolean {
    return getParentDir(this.currentDir) !== null;
  }

  // ========================================
  // Navigation
  // ========================================

  /**
   * Navigate to a directory
   */
  async navigateToDir(dirPath: string): Promise<void> {
    try {
      // Check if directory exists and is accessible
      const stats = await fs.promises.stat(dirPath);
      if (!stats.isDirectory()) {
        throw new Error('Not a directory');
      }

      // Update state
      this.currentDir = dirPath;
      await this.loadDirectory(dirPath);
      this.notifyChange();
    } catch (err) {
      console.error(`Failed to navigate to ${dirPath}:`, err);
      throw err;
    }
  }

  /**
   * Navigate to parent directory
   */
  async navigateUp(): Promise<void> {
    const parent = getParentDir(this.currentDir);
    if (parent) {
      await this.navigateToDir(parent);
    }
  }

  /**
   * Navigate to home directory
   */
  async navigateHome(): Promise<void> {
    await this.navigateToDir(this.homeDir);
  }

  // ========================================
  // Mutations
  // ========================================

  /**
   * Toggle hidden file visibility
   */
  async toggleShowHidden(): Promise<void> {
    this.showHidden = !this.showHidden;
    this.notifyChange();
  }

  /**
   * Create a new folder in current directory
   */
  async createFolder(name: string): Promise<void> {
    if (!name || name.trim() === '') {
      throw new Error('Folder name cannot be empty');
    }

    const newPath = path.join(this.currentDir, name);

    try {
      await fs.promises.mkdir(newPath, { recursive: false });
      await this.refresh();
    } catch (err) {
      console.error(`Failed to create folder ${name}:`, err);
      throw err;
    }
  }

  /**
   * Refresh current directory
   */
  async refresh(): Promise<void> {
    await this.loadDirectory(this.currentDir);
    this.notifyChange();
  }

  // ========================================
  // Private Methods
  // ========================================

  /**
   * Load directory contents synchronously (for constructor)
   * Prevents race condition where UI builds before directory loads
   */
  private loadDirectorySync(dirPath: string): void {
    try {
      const dirents = fs.readdirSync(dirPath, { withFileTypes: true });
      const items = dirents.map((dirent) => createFileItem(dirent, dirPath));
      this.items = sortFileItems(items);
    } catch (err) {
      console.error(`Failed to load directory ${dirPath}:`, err);
      this.items = [];
      throw err;
    }
  }

  /**
   * Load directory contents (async for navigation)
   */
  private async loadDirectory(dirPath: string): Promise<void> {
    try {
      const dirents = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const items = dirents.map((dirent) => createFileItem(dirent, dirPath));
      this.items = sortFileItems(items);
    } catch (err) {
      console.error(`Failed to load directory ${dirPath}:`, err);
      this.items = [];
      throw err;
    }
  }

  /**
   * Filter items based on current settings
   */
  private filterItems(items: FileItem[]): FileItem[] {
    if (this.showHidden) {
      return items;
    }

    return items.filter((item) => !item.isHidden);
  }
}
