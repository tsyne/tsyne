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
import { FolderMetadata, getFolderMetadata } from './folder-metadata';

export type ChangeListener = () => void;

/**
 * Persisted state interface
 */
interface PersistedState {
  expandedDirs: string[];
  showHidden: boolean;
  currentDir: string;
  version: number;
}

/**
 * Observable file browser store
 */
export class FylesStore {
  private currentDir: string = '';
  private items: FileItem[] = [];
  private showHidden: boolean = false;
  private changeListeners: ChangeListener[] = [];
  private homeDir: string;
  private expandedDirs: Set<string> = new Set();
  private stateFilePath: string;
  private persistenceEnabled: boolean;

  constructor(initialDir?: string, stateFilePath?: string) {
    this.homeDir = os.homedir();
    this.currentDir = this.homeDir; // Set default before loadState
    // Default state file location
    this.stateFilePath = stateFilePath || path.join(os.homedir(), '.tsyne', 'fyles-state.json');
    this.persistenceEnabled = stateFilePath !== null; // Disable if explicitly null

    // Load persisted state (may update currentDir)
    this.loadState();

    // Override with initialDir if explicitly provided
    if (initialDir) {
      this.currentDir = initialDir;
    }

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

  /**
   * Get metadata for the current directory (fancy folder backgrounds)
   */
  getCurrentDirMetadata(): FolderMetadata {
    return getFolderMetadata(this.currentDir);
  }

  /**
   * Check if a directory is expanded in tree view
   */
  isExpanded(dirPath: string): boolean {
    return this.expandedDirs.has(dirPath);
  }

  /**
   * Get all expanded directories
   */
  getExpandedDirs(): string[] {
    return Array.from(this.expandedDirs);
  }

  /**
   * Get subdirectories for a given path (for tree expansion)
   */
  getSubdirectories(dirPath: string): FileItem[] {
    try {
      const dirents = fs.readdirSync(dirPath, { withFileTypes: true });
      const items = dirents
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => createFileItem(dirent, dirPath));
      const sorted = sortFileItems(items);
      return this.filterItems(sorted);
    } catch (err) {
      console.error(`Failed to get subdirectories of ${dirPath}:`, err);
      return [];
    }
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
    this.saveState();
    this.notifyChange();
  }

  /**
   * Toggle expansion state of a directory in tree view
   */
  async toggleExpanded(dirPath: string): Promise<void> {
    if (this.expandedDirs.has(dirPath)) {
      this.expandedDirs.delete(dirPath);
    } else {
      this.expandedDirs.add(dirPath);
    }
    this.saveState();
    this.notifyChange();
  }

  /**
   * Expand a directory in tree view
   */
  async expandDir(dirPath: string): Promise<void> {
    if (!this.expandedDirs.has(dirPath)) {
      this.expandedDirs.add(dirPath);
      this.saveState();
      this.notifyChange();
    }
  }

  /**
   * Collapse a directory in tree view
   */
  async collapseDir(dirPath: string): Promise<void> {
    if (this.expandedDirs.has(dirPath)) {
      this.expandedDirs.delete(dirPath);
      this.saveState();
      this.notifyChange();
    }
  }

  /**
   * Collapse all expanded directories
   */
  async collapseAll(): Promise<void> {
    this.expandedDirs.clear();
    this.saveState();
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

  /**
   * Move a file or folder to a destination directory
   */
  async moveItem(sourcePath: string, destDir: string): Promise<void> {
    const fileName = path.basename(sourcePath);
    const destPath = path.join(destDir, fileName);

    // Check if source exists
    try {
      await fs.promises.access(sourcePath);
    } catch {
      throw new Error(`Source does not exist: ${sourcePath}`);
    }

    // Check if destination already has a file with same name
    try {
      await fs.promises.access(destPath);
      throw new Error(`Destination already exists: ${destPath}`);
    } catch (err: any) {
      // ENOENT is expected - destination doesn't exist yet
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    // Perform the move
    await fs.promises.rename(sourcePath, destPath);
    await this.refresh();
  }

  /**
   * Copy a file or folder to a destination directory
   */
  async copyItem(sourcePath: string, destDir: string): Promise<void> {
    const fileName = path.basename(sourcePath);
    const destPath = path.join(destDir, fileName);

    // Check if source exists
    const stats = await fs.promises.stat(sourcePath);

    // Check if destination already has a file with same name
    try {
      await fs.promises.access(destPath);
      throw new Error(`Destination already exists: ${destPath}`);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    // Perform the copy
    if (stats.isDirectory()) {
      await this.copyDirRecursive(sourcePath, destPath);
    } else {
      await fs.promises.copyFile(sourcePath, destPath);
    }
    await this.refresh();
  }

  /**
   * Recursively copy a directory
   */
  private async copyDirRecursive(src: string, dest: string): Promise<void> {
    await fs.promises.mkdir(dest, { recursive: true });
    const entries = await fs.promises.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirRecursive(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }

  // ========================================
  // Persistence
  // ========================================

  /**
   * Save state to disk
   */
  private saveState(): void {
    if (!this.persistenceEnabled) return;

    try {
      const dir = path.dirname(this.stateFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const state: PersistedState = {
        expandedDirs: Array.from(this.expandedDirs),
        showHidden: this.showHidden,
        currentDir: this.currentDir,
        version: 1,
      };

      fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save fyles state:', error);
    }
  }

  /**
   * Load state from disk
   */
  private loadState(): void {
    if (!this.persistenceEnabled) return;

    try {
      if (fs.existsSync(this.stateFilePath)) {
        const data = fs.readFileSync(this.stateFilePath, 'utf8');
        const state: PersistedState = JSON.parse(data);

        if (state.version === 1) {
          this.expandedDirs = new Set(state.expandedDirs || []);
          this.showHidden = state.showHidden || false;
          this.currentDir = state.currentDir || this.homeDir;
        }
      }
    } catch (error) {
      console.error('Failed to load fyles state:', error);
      // Continue with defaults
    }
  }

  /**
   * Clear persisted state (useful for tests)
   */
  clearPersistedState(): void {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        fs.unlinkSync(this.stateFilePath);
      }
    } catch (error) {
      console.error('Failed to clear persisted state:', error);
    }
  }

  /**
   * Get the state file path (useful for tests)
   */
  getStateFilePath(): string {
    return this.stateFilePath;
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
