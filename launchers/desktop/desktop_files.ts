/**
 * Desktop File Icon Manager
 *
 * Handles scanning ~/Desktop/ for files, file icon display, and file operations.
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { Window } from 'tsyne';
import { AppMetadata } from 'tsyne';
import { FileIcon, ICON_SPACING, FILE_DROP_APPS } from './desktop_types';
import { DesktopIconManager } from './desktop_icons';

/** Callbacks for file operations that need Desktop integration */
export interface FileIconCallbacks {
  findAppByName: (name: string) => AppMetadata | null;
  launchApp: (metadata: AppMetadata, filePath?: string) => Promise<void>;
  showInfo: (title: string, message: string) => void;
}

/**
 * Manages file icons from ~/Desktop/
 */
export class FileIconManager {
  private fileIcons: FileIcon[] = [];
  private iconManager: DesktopIconManager;

  constructor(iconManager: DesktopIconManager) {
    this.iconManager = iconManager;
  }

  /**
   * Get all file icons
   */
  getAll(): FileIcon[] {
    return this.fileIcons;
  }

  /**
   * Scan ~/Desktop/ for PNG files and create file icons
   */
  async scan(startCol: number, startRow: number): Promise<void> {
    const desktopDir = path.join(os.homedir(), 'Desktop');

    // Check if directory exists
    try {
      await fs.promises.access(desktopDir, fs.constants.R_OK);
    } catch {
      console.log(`Desktop directory not found: ${desktopDir}`);
      return;
    }

    // Read directory and filter for PNG files
    try {
      const entries = await fs.promises.readdir(desktopDir, { withFileTypes: true });
      const pngFiles = entries
        .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.png'))
        .map(e => e.name);

      if (pngFiles.length === 0) {
        console.log('No PNG files found in ~/Desktop/');
        return;
      }

      console.log(`Found ${pngFiles.length} PNG files in ~/Desktop/`);

      // Prepare the generic image icon resource
      const imageIconResource = await this.iconManager.prepareFileIconResource();

      // Position file icons after folders and apps
      const GRID_COLS = 8;
      let col = startCol;
      let row = startRow;

      for (const fileName of pngFiles) {
        const filePath = path.join(desktopDir, fileName);
        const savedPos = await this.iconManager.loadIconPosition(`file:${fileName}`);
        const defaultX = col * ICON_SPACING + 20;
        const defaultY = row * ICON_SPACING + 20;

        this.fileIcons.push({
          filePath,
          fileName,
          resourceName: imageIconResource,
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
    } catch (err) {
      console.error('Error scanning desktop files:', err);
    }
  }

  /**
   * Select a file icon (visual feedback)
   */
  select(fileIcon: FileIcon): void {
    // Deselect all file icons
    for (const f of this.fileIcons) {
      f.selected = false;
    }
    fileIcon.selected = true;
  }

  /**
   * Deselect all file icons
   */
  deselectAll(): void {
    for (const f of this.fileIcons) {
      f.selected = false;
    }
  }

  /**
   * Show file info dialog
   */
  async showInfo(fileIcon: FileIcon, win: Window | null): Promise<void> {
    if (!win) return;

    await win.showInfo(
      `File: ${fileIcon.fileName}`,
      `Path: ${fileIcon.filePath}\nType: PNG Image`
    );
  }

  /**
   * Find a file icon by its desktop icon ID
   */
  findById(iconId: string): FileIcon | null {
    if (!iconId.startsWith('file-')) return null;

    // Icon IDs are: file-${fileName.toLowerCase().replace(/\s+/g, '-')}
    for (const fileIcon of this.fileIcons) {
      const expectedId = `file-${fileIcon.fileName.toLowerCase().replace(/\s+/g, '-')}`;
      if (expectedId === iconId) {
        return fileIcon;
      }
    }
    return null;
  }

  /**
   * Generate the icon ID for a file icon
   */
  getIconId(fileIcon: FileIcon): string {
    return `file-${fileIcon.fileName.toLowerCase().replace(/\s+/g, '-')}`;
  }

  /**
   * Launch a file with its associated app (Image Viewer)
   */
  launchWithApp(fileIcon: FileIcon, callbacks: FileIconCallbacks): void {
    const imageViewerApp = callbacks.findAppByName('Image Viewer');
    if (imageViewerApp) {
      callbacks.launchApp(imageViewerApp, fileIcon.filePath);
    } else {
      console.error('Image Viewer app not found');
      callbacks.showInfo('Error', 'Image Viewer app not found');
    }
  }

  /**
   * Handle a file being dropped on an app icon
   */
  handleDrop(
    appMetadata: AppMetadata,
    droppedIconId: string,
    callbacks: FileIconCallbacks
  ): void {
    const fileIcon = this.findById(droppedIconId);
    if (fileIcon) {
      if (FILE_DROP_APPS.has(appMetadata.name)) {
        console.log(`File dropped on ${appMetadata.name}: ${fileIcon.filePath}`);
        callbacks.launchApp(appMetadata, fileIcon.filePath);
      } else {
        console.log(`${appMetadata.name} doesn't support file drops`);
        callbacks.showInfo('Not Supported', `${appMetadata.name} doesn't support opening files.`);
      }
    } else {
      console.log(`Non-file icon dropped on ${appMetadata.name}: ${droppedIconId}`);
    }
  }

  /**
   * Save a file icon's position
   */
  savePosition(fileIcon: FileIcon, x: number, y: number): void {
    fileIcon.x = x;
    fileIcon.y = y;
    this.iconManager.saveIconPosition(`file:${fileIcon.fileName}`, x, y);
  }
}
