/**
 * Disk Tree App - Treemap Visualization of Disk Usage
 *
 * A cross-platform utility that visualizes disk space using an interactive
 * squarified treemap. Select a folder to scan and explore the results with
 * drill-down navigation, color schemes, and real-time hover feedback.
 *
 * Inspired by GrandPerspective and DiskInventoryX.
 *
 * Copyright Paul Hammant 2025
 * License: MIT
 *
 * @tsyne-app:name Disk Tree
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 21H3V3h8V1H3a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2v-8h-2z"/><path d="M11 8h10V6H11z"/><path d="M11 13h10v-2H11z"/><path d="M11 18h10v-2H11z"/></svg>
 * @tsyne-app:category Utilities
 * @tsyne-app:builder buildDiskTreeApp
 * @tsyne-app:args app,win
 * @tsyne-app:count single
 */

import * as fs from 'fs';
import * as path from 'path';
import { cosyne, CosyneContext, enableEventHandling, refreshAllCosyneContexts, EventRouter } from 'cosyne';

// Type definitions for Tsyne (imported via the builder args pattern)
type App = any;
type Window = any;
type Label = any;

// ============================================================================
// DATA MODELS
// ============================================================================

export interface FileEntry {
  id: string;
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  children: FileEntry[];
  depth: number;
  extension: string;
  modifiedTime?: Date;
}

export interface TreemapRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  size: number;
  depth: number;
  entry: FileEntry;
}

export interface ScanProgress {
  filesScanned: number;
  directoriesScanned: number;
  currentPath: string;
  isScanning: boolean;
  totalSize: number;
}

export type ColorScheme = 'bySize' | 'byDepth' | 'byType' | 'byAge';

export interface AppState {
  rootEntry: FileEntry | null;
  currentEntry: FileEntry | null;  // For drill-down navigation
  allRects: TreemapRect[];
  selectedId: string | null;
  hoveredId: string | null;
  colorScheme: ColorScheme;
  breadcrumbs: FileEntry[];  // Navigation stack
  scanProgress: ScanProgress;
  canvasWidth: number;
  canvasHeight: number;
  minRectSize: number;  // Minimum size to render
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BEVEL_SIZE = 2;
const MIN_LABEL_WIDTH = 60;
const MIN_LABEL_HEIGHT = 20;
const HEADER_HEIGHT = 80;
const FOOTER_HEIGHT = 60;

// File type to hue mapping for 'byType' color scheme
const FILE_TYPE_HUES: Record<string, number> = {
  // Documents
  '.txt': 0, '.md': 5, '.pdf': 10, '.doc': 15, '.docx': 15,
  '.xls': 20, '.xlsx': 20, '.ppt': 25, '.pptx': 25,
  // Code
  '.ts': 200, '.tsx': 205, '.js': 50, '.jsx': 55, '.json': 60,
  '.py': 220, '.go': 180, '.rs': 30, '.java': 35, '.c': 40, '.cpp': 45,
  '.h': 42, '.hpp': 47, '.cs': 280, '.rb': 0, '.php': 260,
  '.html': 15, '.css': 195, '.scss': 330, '.less': 325,
  // Images
  '.png': 120, '.jpg': 125, '.jpeg': 125, '.gif': 130, '.svg': 135,
  '.webp': 140, '.ico': 145, '.bmp': 150,
  // Audio/Video
  '.mp3': 270, '.wav': 275, '.flac': 280, '.mp4': 285,
  '.avi': 290, '.mkv': 295, '.mov': 300,
  // Archives
  '.zip': 90, '.tar': 95, '.gz': 100, '.rar': 105, '.7z': 110,
  // Executables
  '.exe': 0, '.dll': 5, '.so': 10, '.dylib': 15,
  // Data
  '.db': 160, '.sqlite': 165, '.sql': 170,
  // Config
  '.yml': 55, '.yaml': 55, '.toml': 60, '.ini': 65, '.cfg': 70,
};

// ============================================================================
// OBSERVABLE STORE
// ============================================================================

type ChangeListener = () => void;

export class DiskTreeStore {
  private state: AppState;
  private changeListeners: ChangeListener[] = [];
  private nextId = 1;

  constructor() {
    this.state = {
      rootEntry: null,
      currentEntry: null,
      allRects: [],
      selectedId: null,
      hoveredId: null,
      colorScheme: 'byType',
      breadcrumbs: [],
      scanProgress: {
        filesScanned: 0,
        directoriesScanned: 0,
        currentPath: '',
        isScanning: false,
        totalSize: 0,
      },
      canvasWidth: 800,
      canvasHeight: 600,
      minRectSize: 4,
    };
  }

  getState(): Readonly<AppState> {
    return this.state;
  }

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }

  private notifyChange(): void {
    this.changeListeners.forEach(listener => listener());
  }

  // Generate unique ID
  private genId(): string {
    return `entry-${this.nextId++}`;
  }

  // ========== Scanning ==========

  async scanDirectory(dirPath: string): Promise<void> {
    this.nextId = 1;
    this.state.scanProgress = {
      filesScanned: 0,
      directoriesScanned: 0,
      currentPath: dirPath,
      isScanning: true,
      totalSize: 0,
    };
    this.notifyChange();

    try {
      const rootEntry = await this.scanDirectoryAsync(dirPath, 0);
      this.state.rootEntry = rootEntry;
      this.state.currentEntry = rootEntry;
      this.state.breadcrumbs = [rootEntry];
      this.state.scanProgress.totalSize = rootEntry.size;
      this.state.scanProgress.isScanning = false;
      this.recalculateLayout();
      this.notifyChange();
    } catch (e) {
      this.state.scanProgress.isScanning = false;
      this.notifyChange();
      throw e;
    }
  }

  private async scanDirectoryAsync(dirPath: string, depth: number): Promise<FileEntry> {
    const name = path.basename(dirPath) || dirPath;
    const entry: FileEntry = {
      id: this.genId(),
      name,
      path: dirPath,
      size: 0,
      isDirectory: true,
      children: [],
      depth,
      extension: '',
    };

    this.state.scanProgress.directoriesScanned++;
    this.state.scanProgress.currentPath = dirPath;

    // Yield to event loop periodically for UI updates
    if (this.state.scanProgress.directoriesScanned % 100 === 0) {
      this.notifyChange();
      await new Promise(resolve => setImmediate(resolve));
    }

    try {
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        // Skip hidden files and system directories
        if (file.startsWith('.')) continue;

        const filePath = path.join(dirPath, file);

        try {
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            const childEntry = await this.scanDirectoryAsync(filePath, depth + 1);
            entry.children.push(childEntry);
            entry.size += childEntry.size;
          } else {
            this.state.scanProgress.filesScanned++;
            const ext = path.extname(file).toLowerCase();
            entry.children.push({
              id: this.genId(),
              name: file,
              path: filePath,
              size: stat.size,
              isDirectory: false,
              children: [],
              depth: depth + 1,
              extension: ext,
              modifiedTime: stat.mtime,
            });
            entry.size += stat.size;
          }
        } catch {
          // Skip inaccessible files
        }
      }

      // Sort children by size (largest first)
      entry.children.sort((a, b) => b.size - a.size);
    } catch {
      // Can't read directory
    }

    return entry;
  }

  // ========== Layout ==========

  setCanvasSize(width: number, height: number): void {
    this.state.canvasWidth = width;
    this.state.canvasHeight = height;
    this.recalculateLayout();
    this.notifyChange();
  }

  recalculateLayout(): void {
    if (!this.state.currentEntry) {
      this.state.allRects = [];
      return;
    }

    const padding = 4;
    const items = this.state.currentEntry.children.filter(c => c.size > 0);

    this.state.allRects = layoutTreemap(
      padding,
      padding,
      this.state.canvasWidth - padding * 2,
      this.state.canvasHeight - padding * 2,
      items,
      this.state.minRectSize
    );
  }

  // ========== Navigation ==========

  drillDown(id: string): void {
    const rect = this.state.allRects.find(r => r.id === id);
    if (!rect || !rect.entry.isDirectory) return;

    this.state.breadcrumbs.push(rect.entry);
    this.state.currentEntry = rect.entry;
    this.state.selectedId = null;
    this.state.hoveredId = null;
    this.recalculateLayout();
    this.notifyChange();
  }

  drillUp(): void {
    if (this.state.breadcrumbs.length <= 1) return;

    this.state.breadcrumbs.pop();
    this.state.currentEntry = this.state.breadcrumbs[this.state.breadcrumbs.length - 1];
    this.state.selectedId = null;
    this.state.hoveredId = null;
    this.recalculateLayout();
    this.notifyChange();
  }

  goToRoot(): void {
    if (!this.state.rootEntry) return;

    this.state.breadcrumbs = [this.state.rootEntry];
    this.state.currentEntry = this.state.rootEntry;
    this.state.selectedId = null;
    this.state.hoveredId = null;
    this.recalculateLayout();
    this.notifyChange();
  }

  // ========== Selection ==========

  setSelected(id: string | null): void {
    this.state.selectedId = id;
    this.notifyChange();
  }

  setHovered(id: string | null): void {
    this.state.hoveredId = id;
    this.notifyChange();
  }

  // ========== Color Scheme ==========

  setColorScheme(scheme: ColorScheme): void {
    this.state.colorScheme = scheme;
    this.notifyChange();
  }

  // ========== Helpers ==========

  getSelectedEntry(): FileEntry | null {
    if (!this.state.selectedId) return null;
    const rect = this.state.allRects.find(r => r.id === this.state.selectedId);
    return rect?.entry || null;
  }

  getHoveredEntry(): FileEntry | null {
    if (!this.state.hoveredId) return null;
    const rect = this.state.allRects.find(r => r.id === this.state.hoveredId);
    return rect?.entry || null;
  }
}

// ============================================================================
// SQUARIFIED TREEMAP LAYOUT
// ============================================================================

interface LayoutItem {
  entry: FileEntry;
  size: number;
}

function layoutTreemap(
  x: number,
  y: number,
  width: number,
  height: number,
  items: FileEntry[],
  minSize: number
): TreemapRect[] {
  if (items.length === 0 || width < minSize || height < minSize) {
    return [];
  }

  const totalSize = items.reduce((sum, item) => sum + item.size, 0);
  if (totalSize === 0) return [];

  const layoutItems: LayoutItem[] = items
    .filter(item => item.size > 0)
    .map(item => ({ entry: item, size: item.size }));

  return squarify(layoutItems, [], x, y, width, height, totalSize, minSize);
}

function squarify(
  items: LayoutItem[],
  row: LayoutItem[],
  x: number,
  y: number,
  width: number,
  height: number,
  totalSize: number,
  minSize: number
): TreemapRect[] {
  if (items.length === 0) {
    return layoutRow(row, x, y, width, height, totalSize);
  }

  const [first, ...rest] = items;
  const newRow = [...row, first];

  // Calculate worst aspect ratio for current row vs row with new item
  const currentWorst = row.length > 0 ? worstAspectRatio(row, x, y, width, height, totalSize) : Infinity;
  const newWorst = worstAspectRatio(newRow, x, y, width, height, totalSize);

  if (row.length === 0 || newWorst <= currentWorst) {
    // Adding improves or maintains aspect ratio
    return squarify(rest, newRow, x, y, width, height, totalSize, minSize);
  } else {
    // Layout current row and continue with remaining items
    const rowRects = layoutRow(row, x, y, width, height, totalSize);
    const rowSize = row.reduce((sum, item) => sum + item.size, 0);
    const rowRatio = rowSize / totalSize;

    let newX = x, newY = y, newWidth = width, newHeight = height;
    if (width >= height) {
      const rowWidth = width * rowRatio;
      newX = x + rowWidth;
      newWidth = width - rowWidth;
    } else {
      const rowHeight = height * rowRatio;
      newY = y + rowHeight;
      newHeight = height - rowHeight;
    }

    const remainingSize = totalSize - rowSize;
    const remainingRects = squarify(items, [], newX, newY, newWidth, newHeight, remainingSize, minSize);

    return [...rowRects, ...remainingRects];
  }
}

function worstAspectRatio(
  row: LayoutItem[],
  x: number,
  y: number,
  width: number,
  height: number,
  totalSize: number
): number {
  if (row.length === 0) return Infinity;

  const rowSize = row.reduce((sum, item) => sum + item.size, 0);
  const rowRatio = rowSize / totalSize;

  const isHorizontal = width >= height;
  const rowLength = isHorizontal ? width * rowRatio : height * rowRatio;
  const crossLength = isHorizontal ? height : width;

  let worst = 0;
  for (const item of row) {
    const itemRatio = item.size / rowSize;
    const itemLength = crossLength * itemRatio;
    const aspect = rowLength > itemLength
      ? rowLength / itemLength
      : itemLength / rowLength;
    worst = Math.max(worst, aspect);
  }

  return worst;
}

function layoutRow(
  row: LayoutItem[],
  x: number,
  y: number,
  width: number,
  height: number,
  totalSize: number
): TreemapRect[] {
  if (row.length === 0) return [];

  const rowSize = row.reduce((sum, item) => sum + item.size, 0);
  const rowRatio = rowSize / totalSize;

  const isHorizontal = width >= height;
  const rowLength = isHorizontal ? width * rowRatio : height * rowRatio;

  const rects: TreemapRect[] = [];
  let offset = 0;

  for (const item of row) {
    const itemRatio = item.size / rowSize;
    const itemLength = (isHorizontal ? height : width) * itemRatio;

    const rect: TreemapRect = isHorizontal
      ? {
          id: item.entry.id,
          x: x,
          y: y + offset,
          width: rowLength,
          height: itemLength,
          size: item.size,
          depth: item.entry.depth,
          entry: item.entry,
        }
      : {
          id: item.entry.id,
          x: x + offset,
          y: y,
          width: itemLength,
          height: rowLength,
          size: item.size,
          depth: item.entry.depth,
          entry: item.entry,
        };

    rects.push(rect);
    offset += itemLength;
  }

  return rects;
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function getColorForRect(rect: TreemapRect, state: AppState, isHovered: boolean): string {
  const saturation = isHovered ? 85 : 65;
  const lightness = isHovered ? 50 : 60;
  let hue = 0;

  switch (state.colorScheme) {
    case 'bySize': {
      // Logarithmic scale: red (large) -> green (small)
      const totalSize = state.currentEntry?.size || 1;
      const ratio = Math.log(rect.size + 1) / Math.log(totalSize + 1);
      hue = (1 - ratio) * 120; // 0 = red, 120 = green
      break;
    }
    case 'byDepth': {
      // Depth-based: cycle through hues
      hue = (rect.depth * 60) % 360;
      break;
    }
    case 'byType': {
      // File extension based
      const ext = rect.entry.extension.toLowerCase();
      hue = FILE_TYPE_HUES[ext] ?? 180; // Default to cyan
      if (rect.entry.isDirectory) {
        hue = 45; // Yellow-ish for directories
      }
      break;
    }
    case 'byAge': {
      // Age-based: new files = green, old = red
      if (rect.entry.modifiedTime) {
        const now = Date.now();
        const age = now - rect.entry.modifiedTime.getTime();
        const dayMs = 24 * 60 * 60 * 1000;
        const ageInDays = age / dayMs;
        // 0 days = green (120), 365+ days = red (0)
        hue = Math.max(0, 120 - (ageInDays / 365) * 120);
      } else {
        hue = 180; // Cyan for unknown
      }
      break;
    }
  }

  const { r, g, b } = hslToRgb(hue, saturation, lightness);
  return `rgb(${r}, ${g}, ${b})`;
}

function lightenColor(color: string, amount: number): string {
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return color;

  const r = Math.min(255, parseInt(match[1]) + amount);
  const g = Math.min(255, parseInt(match[2]) + amount);
  const b = Math.min(255, parseInt(match[3]) + amount);
  return `rgb(${r}, ${g}, ${b})`;
}

function darkenColor(color: string, amount: number): string {
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return color;

  const r = Math.max(0, parseInt(match[1]) - amount);
  const g = Math.max(0, parseInt(match[2]) - amount);
  const b = Math.max(0, parseInt(match[3]) - amount);
  return `rgb(${r}, ${g}, ${b})`;
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

// ============================================================================
// DISK TREE UI
// ============================================================================

export class DiskTreeUI {
  private store: DiskTreeStore;
  private window: Window | null = null;
  private cosyneCtx: CosyneContext | null = null;
  private eventRouter: EventRouter | null = null;

  // Widget references
  private statusLabel: Label | null = null;
  private statsLabel: Label | null = null;
  private infoLabel: Label | null = null;
  private breadcrumbLabel: Label | null = null;

  constructor(private a: App) {
    this.store = new DiskTreeStore();
  }

  getStore(): DiskTreeStore {
    return this.store;
  }

  private updateStatusLabel(): void {
    const state = this.store.getState();
    if (this.statusLabel) {
      if (state.scanProgress.isScanning) {
        const truncatedPath = state.scanProgress.currentPath.length > 50
          ? '...' + state.scanProgress.currentPath.slice(-47)
          : state.scanProgress.currentPath;
        this.statusLabel.setText(`Scanning: ${truncatedPath}`);
      } else if (state.rootEntry) {
        this.statusLabel.setText(`Viewing: ${state.currentEntry?.name || state.rootEntry.name}`);
      } else {
        this.statusLabel.setText('Select a folder to analyze');
      }
    }
  }

  private updateStatsLabel(): void {
    const state = this.store.getState();
    if (this.statsLabel) {
      const progress = state.scanProgress;
      this.statsLabel.setText(
        `Files: ${formatNumber(progress.filesScanned)} | ` +
        `Folders: ${formatNumber(progress.directoriesScanned)} | ` +
        `Total: ${formatBytes(progress.totalSize)}`
      );
    }
  }

  private updateInfoLabel(): void {
    const state = this.store.getState();
    const entry = this.store.getHoveredEntry() || this.store.getSelectedEntry();

    if (this.infoLabel) {
      if (entry) {
        const type = entry.isDirectory ? 'Folder' : 'File';
        const ext = entry.extension ? ` (${entry.extension})` : '';
        this.infoLabel.setText(
          `${type}${ext}: ${entry.name} - ${formatBytes(entry.size)}`
        );
      } else {
        this.infoLabel.setText('Hover over an item for details');
      }
    }
  }

  private updateBreadcrumbLabel(): void {
    const state = this.store.getState();
    if (this.breadcrumbLabel) {
      const crumbs = state.breadcrumbs.map(e => e.name).join(' > ');
      this.breadcrumbLabel.setText(crumbs || 'Root');
    }
  }

  private async updateUI(): Promise<void> {
    this.updateStatusLabel();
    this.updateStatsLabel();
    this.updateInfoLabel();
    this.updateBreadcrumbLabel();
    refreshAllCosyneContexts();
  }

  private renderShadedRect(
    c: CosyneContext,
    rect: TreemapRect,
    baseColor: string,
    isSelected: boolean,
    isHovered: boolean
  ): void {
    const { x, y, width, height } = rect;
    const bevel = Math.min(BEVEL_SIZE, width / 4, height / 4);

    if (width < 2 || height < 2) return;

    // Skip bevels for very small rects
    if (width < 8 || height < 8) {
      c.rect(x, y, width, height)
        .fill(baseColor)
        .stroke(isSelected ? '#ff0000' : 'none', isSelected ? 2 : 0)
        .withId(`rect-main-${rect.id}`);
      return;
    }

    // Shadow edges (bottom & right) - darker
    c.rect(x + bevel, y + height - bevel, width - bevel, bevel)
      .fill(darkenColor(baseColor, 40))
      .stroke('none', 0)
      .withId(`rect-shadow-bottom-${rect.id}`);

    c.rect(x + width - bevel, y + bevel, bevel, height - bevel * 2)
      .fill(darkenColor(baseColor, 40))
      .stroke('none', 0)
      .withId(`rect-shadow-right-${rect.id}`);

    // Highlight edges (top & left) - lighter
    c.rect(x, y, width - bevel, bevel)
      .fill(lightenColor(baseColor, 40))
      .stroke('none', 0)
      .withId(`rect-highlight-top-${rect.id}`);

    c.rect(x, y + bevel, bevel, height - bevel * 2)
      .fill(lightenColor(baseColor, 40))
      .stroke('none', 0)
      .withId(`rect-highlight-left-${rect.id}`);

    // Main surface
    const strokeColor = isSelected ? '#ff0000' : (isHovered ? '#ffffff' : 'none');
    const strokeWidth = isSelected ? 2 : (isHovered ? 1 : 0);

    c.rect(x + bevel, y + bevel, width - bevel * 2, height - bevel * 2)
      .fill(baseColor)
      .stroke(strokeColor, strokeWidth)
      .withId(`rect-main-${rect.id}`);
  }

  private renderTreemap(c: CosyneContext): void {
    const state = this.store.getState();

    // Background
    c.rect(0, 0, state.canvasWidth, state.canvasHeight)
      .fill('#1a1a2e')
      .stroke('none', 0)
      .withId('background');

    // Render all rectangles
    for (const rect of state.allRects) {
      const isHovered = state.hoveredId === rect.id;
      const isSelected = state.selectedId === rect.id;
      const baseColor = getColorForRect(rect, state, isHovered);

      this.renderShadedRect(c, rect, baseColor, isSelected, isHovered);

      // Add label if rect is large enough
      if (rect.width >= MIN_LABEL_WIDTH && rect.height >= MIN_LABEL_HEIGHT) {
        const label = rect.entry.name.length > 15
          ? rect.entry.name.slice(0, 12) + '...'
          : rect.entry.name;

        c.text(rect.x + 4, rect.y + 14, label)
          .fill('#ffffff')
          .stroke('none', 0)
          .withId(`label-${rect.id}`);

        // Size label on second line if tall enough
        if (rect.height >= MIN_LABEL_HEIGHT * 2) {
          c.text(rect.x + 4, rect.y + 28, formatBytes(rect.size))
            .fill('#cccccc')
            .stroke('none', 0)
            .withId(`size-${rect.id}`);
        }
      }

      // Invisible hit-test rectangle for events
      const hitRect = c.rect(rect.x, rect.y, rect.width, rect.height)
        .fill('transparent')
        .stroke('none', 0)
        .withId(`hit-${rect.id}`);

      hitRect.onClick(() => {
        this.store.setSelected(rect.id);
        if (rect.entry.isDirectory) {
          this.store.drillDown(rect.id);
        }
        this.updateUI();
      });

      hitRect.onMouseEnter(() => {
        this.store.setHovered(rect.id);
        this.updateUI();
      });

      hitRect.onMouseLeave(() => {
        this.store.setHovered(null);
        this.updateUI();
      });
    }

    // Show message if no content
    if (state.allRects.length === 0 && !state.scanProgress.isScanning) {
      if (state.rootEntry) {
        c.text(state.canvasWidth / 2 - 80, state.canvasHeight / 2, 'Empty folder')
          .fill('#888888')
          .stroke('none', 0)
          .withId('empty-message');
      } else {
        c.text(state.canvasWidth / 2 - 100, state.canvasHeight / 2, 'Click "Open Folder" to start')
          .fill('#888888')
          .stroke('none', 0)
          .withId('start-message');
      }
    }
  }

  buildUI(win: Window): void {
    this.window = win;

    const canvasWidth = 800;
    const canvasHeight = 500;
    this.store.setCanvasSize(canvasWidth, canvasHeight);

    // Subscribe to store changes
    this.store.subscribe(() => {
      this.updateUI();
    });

    this.a.vbox(() => {
      // Title bar
      this.a.hbox(() => {
        this.a.label('Disk Tree - Treemap Visualization').withId('title');
        this.a.spacer();
        this.statusLabel = this.a.label('Select a folder to analyze').withId('status');
      });

      this.a.separator();

      // Control buttons
      this.a.hbox(() => {
        this.a.button('Open Folder')
          .onClick(async () => {
            const folderPath = await win.showFolderOpen();
            if (folderPath) {
              try {
                await this.store.scanDirectory(folderPath);
                this.a.sendNotification(
                  'Disk Tree',
                  `Scan complete: ${formatBytes(this.store.getState().scanProgress.totalSize)}`
                );
              } catch (e) {
                await win.showError('Scan Error', `Failed to scan: ${String(e)}`);
              }
            }
          })
          .withId('openBtn');

        this.a.button('Up')
          .onClick(() => {
            this.store.drillUp();
            this.updateUI();
          })
          .withId('upBtn');

        this.a.button('Root')
          .onClick(() => {
            this.store.goToRoot();
            this.updateUI();
          })
          .withId('rootBtn');

        this.a.spacer();

        // Color scheme buttons
        this.a.label('Color:');

        this.a.button('Type')
          .onClick(() => {
            this.store.setColorScheme('byType');
            this.updateUI();
          })
          .withId('colorTypeBtn');

        this.a.button('Size')
          .onClick(() => {
            this.store.setColorScheme('bySize');
            this.updateUI();
          })
          .withId('colorSizeBtn');

        this.a.button('Depth')
          .onClick(() => {
            this.store.setColorScheme('byDepth');
            this.updateUI();
          })
          .withId('colorDepthBtn');

        this.a.button('Age')
          .onClick(() => {
            this.store.setColorScheme('byAge');
            this.updateUI();
          })
          .withId('colorAgeBtn');
      });

      // Breadcrumb navigation
      this.a.hbox(() => {
        this.a.label('Path:');
        this.breadcrumbLabel = this.a.label('Root').withId('breadcrumb');
      });

      this.a.separator();

      // Canvas for treemap
      this.a.canvasStack(() => {
        cosyne(this.a, (c: CosyneContext) => {
          this.cosyneCtx = c;
          this.eventRouter = enableEventHandling(c, this.a, {
            width: canvasWidth,
            height: canvasHeight,
          });
          this.renderTreemap(c);
        });
      }, canvasWidth, canvasHeight);

      this.a.separator();

      // Info bar
      this.a.hbox(() => {
        this.infoLabel = this.a.label('Hover over an item for details').withId('info');
        this.a.spacer();
        this.statsLabel = this.a.label('Files: 0 | Folders: 0 | Total: 0 B').withId('stats');
      });
    });
  }

  // Public methods for testing
  getFormattedBytes(bytes: number): string {
    return formatBytes(bytes);
  }
}

// ============================================================================
// APP BUILDER
// ============================================================================

export function buildDiskTreeApp(a: App, win: Window): DiskTreeUI {
  const ui = new DiskTreeUI(a);

  win.setContent(() => {
    ui.buildUI(win);
  });

  return ui;
}

// ============================================================================
// STANDALONE EXECUTION
// ============================================================================

if (require.main === module) {
  const { app, resolveTransport } = require('tsyne');
  app(resolveTransport(), { title: 'Disk Tree', width: 900, height: 700 }, (a: App) => {
    a.window({ title: 'Disk Tree', width: 900, height: 700 }, (win: Window) => {
      buildDiskTreeApp(a, win);
      win.show();
    });
  });
}
