/**
 * File Utilities
 *
 * Helper functions for file operations.
 */

import * as child_process from 'child_process';
import { FileItem } from './file-item';

/**
 * Open file with default application (xdg-open on Linux, open on macOS, start on Windows)
 */
export async function openFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let command: string;

    if (process.platform === 'darwin') {
      command = 'open';
    } else if (process.platform === 'win32') {
      command = 'start';
    } else {
      command = 'xdg-open';
    }

    const proc = child_process.spawn(command, [filePath], {
      detached: true,
      stdio: 'ignore',
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to open file: ${err.message}`));
    });

    proc.on('spawn', () => {
      proc.unref();
      resolve();
    });
  });
}

/**
 * Check if filename is hidden (starts with .)
 */
export function isHiddenFile(name: string): boolean {
  return name.startsWith('.');
}

/**
 * Filter for directories only
 */
export function filterDirectories(items: FileItem[]): FileItem[] {
  return items.filter((item) => item.isDirectory);
}

/**
 * Sort file items (directories first, then alphabetically)
 */
export function sortFileItems(items: FileItem[]): FileItem[] {
  return items.sort((a, b) => {
    // Directories first
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;

    // Then alphabetically by name (case-insensitive)
    return a.fullName.toLowerCase().localeCompare(b.fullName.toLowerCase());
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined) return '';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Get parent directory path
 */
export function getParentDir(dirPath: string): string | null {
  const path = require('path');
  const parent = path.dirname(dirPath);

  // Check if we're at the root
  if (parent === dirPath) {
    return null;
  }

  return parent;
}
