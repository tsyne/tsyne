/**
 * Disk Tree App - Visualize disk usage by folders and files
 *
 * A cross-platform utility to visually show the disk space used by folders,
 * subfolders and files. Select a folder and initiate the scan to see results
 * with real-time progress updates.
 *
 * Portions copyright original team and portions copyright Paul Hammant 2025
 * License: MIT
 *
 * @tsyne-app:name Disk Tree
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 21H3V3h8V1H3a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2v-8h-2z"/><path d="M11 8h10V6H11z"/><path d="M11 13h10v-2H11z"/><path d="M11 18h10v-2H11z"/></svg>
 * @tsyne-app:category Utilities
 * @tsyne-app:builder buildDiskTreeApp
 * @tsyne-app:args app,win
 * @tsyne-app:count single
 */

import type { App } from './app';
import type { Window } from './window';
import type { Label } from './widgets/display';
import type { Button } from './widgets/inputs';
import * as fs from 'fs';
import * as path from 'path';

interface DiskTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  children: DiskTreeNode[];
  isLoading?: boolean;
}

interface ScanStats {
  filesScanned: number;
  directoriesScanned: number;
  totalSize: number;
  isScanning: boolean;
  currentPath: string;
}

/**
 * Disk Tree UI class
 */
class DiskTreeUI {
  private window: Window | null = null;
  private root: DiskTreeNode | null = null;
  private stats: ScanStats = {
    filesScanned: 0,
    directoriesScanned: 0,
    totalSize: 0,
    isScanning: false,
    currentPath: '',
  };

  private statusLabel: Label | null = null;
  private statsLabel: Label | null = null;
  private sortBySize = false;

  constructor(private a: App) {}

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getDirectorySize(dirPath: string, stats: ScanStats): number {
    let totalSize = 0;

    try {
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);

        try {
          const fileStat = fs.statSync(filePath);

          if (fileStat.isDirectory()) {
            stats.directoriesScanned++;
            totalSize += this.getDirectorySize(filePath, stats);
          } else {
            stats.filesScanned++;
            totalSize += fileStat.size;
          }
        } catch (e) {
          // Skip files/dirs we can't access
        }
      }
    } catch (e) {
      // Can't read directory
    }

    return totalSize;
  }

  private buildTreeNode(dirPath: string, nodeName: string, stats: ScanStats): DiskTreeNode {
    const node: DiskTreeNode = {
      name: nodeName,
      path: dirPath,
      isDirectory: true,
      size: 0,
      children: [],
    };

    try {
      const files = fs.readdirSync(dirPath);
      const children: DiskTreeNode[] = [];

      for (const file of files) {
        const filePath = path.join(dirPath, file);

        try {
          const fileStat = fs.statSync(filePath);

          if (fileStat.isDirectory()) {
            const childNode = this.buildTreeNode(filePath, file, stats);
            children.push(childNode);
            node.size += childNode.size;
          } else {
            stats.filesScanned++;
            node.size += fileStat.size;
            children.push({
              name: file,
              path: filePath,
              isDirectory: false,
              size: fileStat.size,
              children: [],
            });
          }
        } catch (e) {
          // Skip inaccessible files
        }
      }

      // Sort children
      if (this.sortBySize) {
        children.sort((a, b) => b.size - a.size);
      } else {
        children.sort((a, b) => a.name.localeCompare(b.name));
      }

      node.children = children;
    } catch (e) {
      // Can't read directory
    }

    return node;
  }

  private updateStats(): void {
    if (this.statusLabel) {
      const status = this.stats.isScanning
        ? `Scanning: ${this.stats.currentPath}`
        : this.root
          ? `Ready - ${this.root.name}`
          : 'No folder selected';
      this.statusLabel.setText(status);
    }

    if (this.statsLabel) {
      const statsText =
        `Files: ${this.stats.filesScanned} | ` +
        `Dirs: ${this.stats.directoriesScanned} | ` +
        `Total: ${this.formatBytes(this.stats.totalSize)}`;
      this.statsLabel.setText(statsText);
    }
  }

  private renderTree(node: DiskTreeNode, level: number = 0): void {
    const indent = '  '.repeat(level);
    const icon = node.isDirectory ? '📁' : '📄';
    const sizeStr = this.formatBytes(node.size);

    this.a.label(`${indent}${icon} ${node.name} [${sizeStr}]`).withId(`tree-node-${node.path}`);

    if (node.isDirectory && node.children.length > 0) {
      // Sort before rendering
      const sortedChildren = [...node.children];
      if (this.sortBySize) {
        sortedChildren.sort((a, b) => b.size - a.size);
      } else {
        sortedChildren.sort((a, b) => a.name.localeCompare(b.name));
      }

      for (const child of sortedChildren) {
        this.renderTree(child, level + 1);
      }
    }
  }

  async scanFolder(folderPath: string): Promise<void> {
    this.stats = {
      filesScanned: 0,
      directoriesScanned: 1,
      totalSize: 0,
      isScanning: true,
      currentPath: folderPath,
    };

    try {
      const folderName = path.basename(folderPath) || folderPath;
      this.root = this.buildTreeNode(folderPath, folderName, this.stats);
      this.stats.totalSize = this.root.size;
      this.stats.isScanning = false;

      // Notify user
      if (this.window) {
        this.a.sendNotification(
          'Disk Tree',
          `Scan complete: ${this.formatBytes(this.stats.totalSize)} in ${folderName}`
        );
      }
    } catch (e) {
      this.stats.isScanning = false;
      if (this.window) {
        await this.window.showError('Scan Error', `Failed to scan folder: ${String(e)}`);
      }
    }

    this.refreshUI();
  }

  private refreshUI(): void {
    if (this.window) {
      this.window.setContent(() => this.buildUI(this.window!));
    }
  }

  buildUI(win: Window): void {
    this.window = win;

    this.a.vbox(() => {
      // Title
      this.a.label('Disk Tree - Visualize Disk Usage').withId('diskTreeTitle');

      this.a.separator();

      // Control buttons
      this.a.hbox(() => {
        this.a.button('Open Folder')
          .onClick(async () => {
            const folderPath = await win.showFolderOpen();
            if (folderPath) {
              await this.scanFolder(folderPath);
            }
          })
          .withId('diskTreeOpenBtn');

        this.a.spacer();

        this.a.button(this.sortBySize ? 'Sort by Name' : 'Sort by Size')
          .onClick(() => {
            this.sortBySize = !this.sortBySize;
            this.refreshUI();
          })
          .withId('diskTreeSortBtn');
      });

      this.a.separator();

      // Status information
      this.statusLabel = this.a.label('No folder selected').withId('diskTreeStatus');
      this.statsLabel = this.a.label('Files: 0 | Dirs: 0 | Total: 0 B').withId('diskTreeStats');

      this.a.separator();

      // Tree view in scroll container
      this.a.scroll(() => {
        this.a.vbox(() => {
          if (this.root) {
            this.renderTree(this.root);
          } else {
            this.a.label('Select a folder to analyze disk usage').withId('diskTreePlaceholder');
          }
        });
      });
    });

    this.updateStats();
  }

  // Public methods for testing
  getStats(): Readonly<ScanStats> {
    return { ...this.stats };
  }

  getRoot(): DiskTreeNode | null {
    return this.root;
  }

  getFormattedBytes(bytes: number): string {
    return this.formatBytes(bytes);
  }
}

/**
 * Create the Disk Tree app
 */
export function buildDiskTreeApp(a: App, win: Window): DiskTreeUI {
  const ui = new DiskTreeUI(a);

  win.setContent(() => {
    ui.buildUI(win);
  });

  return ui;
}

// Standalone execution
if (require.main === module) {
  const { app } = require('./index');
  app({ title: 'Disk Tree', width: 800, height: 600 }, (a: App) => {
    a.window({ title: 'Disk Tree', width: 800, height: 600 }, (win: Window) => {
      buildDiskTreeApp(a, win);
      win.show();
    });
  });
}
