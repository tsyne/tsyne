import { standaloneShutdownStrategy, refreshAllBindings } from 'tsyne';
/**
 * Disk Tree App - Treemap Visualization of Disk Usage
 *
 * A cross-platform utility that visualizes disk space using an interactive
 * squarified treemap with cushion shading. Select a folder to scan and
 * explore the results with drill-down navigation, color schemes, and
 * real-time hover feedback.
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
import { cosyne, CosyneContext } from 'cosyne';

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

const MIN_LABEL_WIDTH = 60;
const MIN_LABEL_HEIGHT = 20;

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

  // Progress-only listeners (for status updates during scan without canvas rebuild)
  private progressListeners: ChangeListener[] = [];

  subscribeProgress(listener: ChangeListener): () => void {
    this.progressListeners.push(listener);
    return () => {
      this.progressListeners = this.progressListeners.filter(l => l !== listener);
    };
  }

  private notifyProgressOnly(): void {
    this.progressListeners.forEach(listener => listener());
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

    // Yield to event loop periodically for UI updates (status labels only)
    // Throttle to every 500 dirs to reduce flicker - canvas only rebuilds on completion
    if (this.state.scanProgress.directoriesScanned % 500 === 0) {
      this.notifyProgressOnly();
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

    const topLevel = layoutTreemap(
      padding,
      padding,
      this.state.canvasWidth - padding * 2,
      this.state.canvasHeight - padding * 2,
      items,
      this.state.minRectSize
    );

    // Recursively subdivide directory rects into their children
    this.state.allRects = subdivideRects(topLevel, this.state.minRectSize);
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

  navigateToPath(dirPath: string): void {
    if (!this.state.rootEntry) return;

    // Walk the tree to find the entry and build breadcrumb trail
    const trail: FileEntry[] = [this.state.rootEntry];
    let current = this.state.rootEntry;

    if (dirPath !== current.path) {
      const relativeParts = dirPath.slice(current.path.length)
        .replace(/^\//, '').split('/').filter(p => p);

      for (const part of relativeParts) {
        const child = current.children.find(c => c.name === part && c.isDirectory);
        if (!child) return; // Path not found
        trail.push(child);
        current = child;
      }
    }

    this.state.breadcrumbs = trail;
    this.state.currentEntry = current;
    this.state.selectedId = null;
    this.state.hoveredId = null;
    this.recalculateLayout();
    this.notifyChange();
  }

  // ========== Selection ==========

  setSelected(id: string | null): void {
    this.state.selectedId = id;
  }

  setHovered(id: string | null): void {
    this.state.hoveredId = id;
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

/**
 * Recursively subdivide directory rects into their children.
 * Files are kept as-is. Directories with children get replaced by
 * recursive child rects (with a small inset for visual nesting).
 * Stops when rects are too small to subdivide.
 */
function subdivideRects(rects: TreemapRect[], minSize: number): TreemapRect[] {
  const result: TreemapRect[] = [];
  const nestInset = 2; // pixels inset per nesting level

  for (const rect of rects) {
    if (!rect.entry.isDirectory || rect.entry.children.length === 0) {
      // Leaf file or empty directory — keep as-is
      result.push(rect);
      continue;
    }

    const innerX = rect.x + nestInset;
    const innerY = rect.y + nestInset;
    const innerW = rect.width - nestInset * 2;
    const innerH = rect.height - nestInset * 2;

    if (innerW < minSize || innerH < minSize) {
      // Too small to subdivide — keep directory as a single tile
      result.push(rect);
      continue;
    }

    const children = rect.entry.children.filter(c => c.size > 0);
    const childRects = layoutTreemap(innerX, innerY, innerW, innerH, children, minSize);

    if (childRects.length === 0) {
      result.push(rect);
      continue;
    }

    // Recurse into child rects
    result.push(...subdivideRects(childRects, minSize));
  }

  return result;
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

function getColorForRectRGB(rect: TreemapRect, state: AppState): { r: number; g: number; b: number } {
  const saturation = 65;
  const lightness = 55;
  let hue = 0;

  switch (state.colorScheme) {
    case 'bySize': {
      const totalSize = state.currentEntry?.size || 1;
      const ratio = Math.log(rect.size + 1) / Math.log(totalSize + 1);
      hue = (1 - ratio) * 120;
      break;
    }
    case 'byDepth': {
      hue = (rect.depth * 60) % 360;
      break;
    }
    case 'byType': {
      const ext = rect.entry.extension.toLowerCase();
      hue = FILE_TYPE_HUES[ext] ?? 180;
      if (rect.entry.isDirectory) {
        hue = 45;
      }
      break;
    }
    case 'byAge': {
      if (rect.entry.modifiedTime) {
        const now = Date.now();
        const age = now - rect.entry.modifiedTime.getTime();
        const dayMs = 24 * 60 * 60 * 1000;
        const ageInDays = age / dayMs;
        hue = Math.max(0, 120 - (ageInDays / 365) * 120);
      } else {
        hue = 180;
      }
      break;
    }
  }

  return hslToRgb(hue, saturation, lightness);
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
// EXTENSION SUMMARY
// ============================================================================

interface ExtensionTotal {
  ext: string;
  totalSize: number;
  avgDepth: number;
  avgAgeDays: number;  // average age in days, -1 if unknown
  fileCount: number;
}

function computeExtensionTotals(entry: FileEntry): ExtensionTotal[] {
  const totals = new Map<string, { size: number; depthSum: number; ageSum: number; ageCount: number; count: number }>();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  function walk(e: FileEntry, depth: number): void {
    if (!e.isDirectory) {
      const ext = e.extension || '(no ext)';
      const prev = totals.get(ext) || { size: 0, depthSum: 0, ageSum: 0, ageCount: 0, count: 0 };
      prev.size += e.size;
      prev.depthSum += depth;
      prev.count++;
      if (e.modifiedTime) {
        prev.ageSum += (now - e.modifiedTime.getTime()) / dayMs;
        prev.ageCount++;
      }
      totals.set(ext, prev);
    }
    for (const child of e.children) {
      walk(child, depth + 1);
    }
  }

  walk(entry, 0);

  return Array.from(totals.entries())
    .map(([ext, d]) => ({
      ext,
      totalSize: d.size,
      avgDepth: d.count > 0 ? d.depthSum / d.count : 0,
      avgAgeDays: d.ageCount > 0 ? d.ageSum / d.ageCount : -1,
      fileCount: d.count,
    }))
    .sort((a, b) => b.totalSize - a.totalSize);
}

// ============================================================================
// CUSHION TREEMAP RENDERER
// ============================================================================

function renderCushionBuffer(
  width: number,
  height: number,
  rects: TreemapRect[],
  state: AppState,
  hoveredId: string | null,
  selectedId: string | null,
  highlightDirPath: string | null
): Uint8Array {
  const buf = new Uint8Array(width * height * 4);

  // Fill background (dark blue-grey)
  for (let i = 0; i < width * height; i++) {
    buf[i * 4] = 26;      // R
    buf[i * 4 + 1] = 26;  // G
    buf[i * 4 + 2] = 46;  // B
    buf[i * 4 + 3] = 255; // A
  }

  // Render each rect with cushion shading
  for (const rect of rects) {
    const rx = Math.round(rect.x);
    const ry = Math.round(rect.y);
    const rw = Math.round(rect.x + rect.width) - rx;
    const rh = Math.round(rect.y + rect.height) - ry;

    if (rw < 2 || rh < 2) continue;

    const baseColor = getColorForRectRGB(rect, state);
    const isHovered = hoveredId === rect.id;
    const isSelected = selectedId === rect.id;
    const isHighlighted = highlightDirPath !== null &&
      rect.entry.path.startsWith(highlightDirPath + '/');

    const halfW = rw / 2;
    const halfH = rh / 2;
    const centerX = rx + halfW;
    const centerY = ry + halfH;

    // Inner area (skip 1px border)
    const x0 = Math.max(0, rx + 1);
    const y0 = Math.max(0, ry + 1);
    const x1 = Math.min(width, rx + rw - 1);
    const y1 = Math.min(height, ry + rh - 1);

    for (let py = y0; py < y1; py++) {
      const ny = (py - centerY) / halfH;
      const ny2 = ny * ny;
      const rowOffset = py * width;

      for (let px = x0; px < x1; px++) {
        const nx = (px - centerX) / halfW;

        // Cushion height (parabolic surface)
        let cushion = 1.0 - nx * nx - ny2;
        if (cushion < 0) cushion = 0;

        // Lighting: ambient + diffuse from top-left
        let intensity = 0.35 + 0.65 * cushion;

        // Brighten hovered rect
        if (isHovered) {
          intensity = Math.min(1.0, intensity + 0.15);
        }

        const idx = (rowOffset + px) * 4;
        buf[idx] = Math.min(255, (baseColor.r * intensity) | 0);
        buf[idx + 1] = Math.min(255, (baseColor.g * intensity) | 0);
        buf[idx + 2] = Math.min(255, (baseColor.b * intensity) | 0);
        buf[idx + 3] = 255;
      }
    }

    // Draw 1px borders (dark)
    const borderR = 15, borderG = 15, borderB = 30;
    // Top edge
    if (ry >= 0 && ry < height) {
      for (let px = Math.max(0, rx); px < Math.min(width, rx + rw); px++) {
        const idx = (ry * width + px) * 4;
        buf[idx] = borderR; buf[idx + 1] = borderG; buf[idx + 2] = borderB; buf[idx + 3] = 255;
      }
    }
    // Bottom edge
    const by = ry + rh - 1;
    if (by >= 0 && by < height) {
      for (let px = Math.max(0, rx); px < Math.min(width, rx + rw); px++) {
        const idx = (by * width + px) * 4;
        buf[idx] = borderR; buf[idx + 1] = borderG; buf[idx + 2] = borderB; buf[idx + 3] = 255;
      }
    }
    // Left edge
    if (rx >= 0 && rx < width) {
      for (let py = Math.max(0, ry); py < Math.min(height, ry + rh); py++) {
        const idx = (py * width + rx) * 4;
        buf[idx] = borderR; buf[idx + 1] = borderG; buf[idx + 2] = borderB; buf[idx + 3] = 255;
      }
    }
    // Right edge
    const bx = rx + rw - 1;
    if (bx >= 0 && bx < width) {
      for (let py = Math.max(0, ry); py < Math.min(height, ry + rh); py++) {
        const idx = (py * width + bx) * 4;
        buf[idx] = borderR; buf[idx + 1] = borderG; buf[idx + 2] = borderB; buf[idx + 3] = 255;
      }
    }

    // Draw selection/highlight border (2px bright border)
    if (isSelected || isHighlighted) {
      const sr = 255, sg = 80, sb = 80;
      for (let t = 0; t < 2; t++) {
        // Top
        const sty = ry + t;
        if (sty >= 0 && sty < height) {
          for (let px = Math.max(0, rx); px < Math.min(width, rx + rw); px++) {
            const idx = (sty * width + px) * 4;
            buf[idx] = sr; buf[idx + 1] = sg; buf[idx + 2] = sb; buf[idx + 3] = 255;
          }
        }
        // Bottom
        const sby = ry + rh - 1 - t;
        if (sby >= 0 && sby < height) {
          for (let px = Math.max(0, rx); px < Math.min(width, rx + rw); px++) {
            const idx = (sby * width + px) * 4;
            buf[idx] = sr; buf[idx + 1] = sg; buf[idx + 2] = sb; buf[idx + 3] = 255;
          }
        }
        // Left
        const slx = rx + t;
        if (slx >= 0 && slx < width) {
          for (let py = Math.max(0, ry); py < Math.min(height, ry + rh); py++) {
            const idx = (py * width + slx) * 4;
            buf[idx] = sr; buf[idx + 1] = sg; buf[idx + 2] = sb; buf[idx + 3] = 255;
          }
        }
        // Right
        const srx = rx + rw - 1 - t;
        if (srx >= 0 && srx < width) {
          for (let py = Math.max(0, ry); py < Math.min(height, ry + rh); py++) {
            const idx = (py * width + srx) * 4;
            buf[idx] = sr; buf[idx + 1] = sg; buf[idx + 2] = sb; buf[idx + 3] = 255;
          }
        }
      }
    }
  }

  return buf;
}

// ============================================================================
// HIT TESTING
// ============================================================================

function hitTestRects(x: number, y: number, rects: TreemapRect[]): TreemapRect | null {
  // Iterate in reverse so later (smaller/on-top) rects take priority
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height) {
      return r;
    }
  }
  return null;
}

// ============================================================================
// DISK TREE UI
// ============================================================================

export class DiskTreeUI {
  private store: DiskTreeStore;
  private window: Window | null = null;
  private rasterCanvas: any = null;  // TappableCanvasRaster
  private canvasStack: any = null;

  // Widget references
  private titleLabel: Label | null = null;
  private statusLabel: Label | null = null;
  private statsLabel: Label | null = null;
  private infoLabel: Label | null = null;
  private infoBar: any = null;  // HBox for info bar (supports removeAll + add)
  private breadcrumbLabel: Label | null = null;
  private extListBox: any = null;  // VBox for extension summary (removeAll + add)
  private upBtn: any = null;
  private rootBtn: any = null;

  // Directory highlight (set when clicking a path segment in the info bar)
  private highlightDirPath: string | null = null;

  // Double-tap detection
  private lastTapTime = 0;
  private lastTapId: string | null = null;

  // Canvas dimensions
  private canvasWidth = 800;
  private canvasHeight = 500;

  constructor(private a: App) {
    this.store = new DiskTreeStore();
  }

  getStore(): DiskTreeStore {
    return this.store;
  }

  private updateStatusLabel(): void {
    const state = this.store.getState();
    if (this.titleLabel) {
      if (state.rootEntry) {
        this.titleLabel.setText(`Disk Tree - ${state.rootEntry.path}`);
      } else {
        this.titleLabel.setText('Disk Tree - Treemap Visualization');
      }
    }
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
    // When segmented bar is showing (selected file with clickable path),
    // don't touch it — hover highlight on the canvas is enough feedback.
    if (this.infoBarIsSegmented) return;

    const entry = this.store.getHoveredEntry() || this.store.getSelectedEntry();

    if (this.infoLabel) {
      if (entry) {
        const type = entry.isDirectory ? 'Folder' : 'File';
        const ext = entry.extension ? ` (${entry.extension})` : '';
        const state = this.store.getState();
        const rootPath = state.rootEntry?.path || '';
        const relativePath = rootPath && entry.path.startsWith(rootPath)
          ? entry.path.slice(rootPath.length).replace(/^\//, '')
          : entry.name;
        this.infoLabel.setText(
          `${type}${ext}: ${relativePath} - ${formatBytes(entry.size)}`
        );
      } else {
        this.infoLabel.setText('Hover over an item for details');
      }
    }
  }

  private infoBarIsSegmented = false;

  private restoreSimpleInfoBar(): void {
    if (!this.infoBarIsSegmented || !this.infoBar) return;
    this.infoBarIsSegmented = false;
    const state = this.store.getState();

    this.infoBar.removeAll();
    this.infoBar.add(() => {
      this.infoLabel = this.a.label('').withId('info');
      this.a.spacer();
      this.statsLabel = this.a.label(
        `Files: ${formatNumber(state.scanProgress.filesScanned)} | ` +
        `Folders: ${formatNumber(state.scanProgress.directoriesScanned)} | ` +
        `Total: ${formatBytes(state.scanProgress.totalSize)}`
      ).withId('stats');
    });
  }

  private rebuildInfoBar(entry: FileEntry): void {
    if (!this.infoBar) return;

    const state = this.store.getState();
    const rootPath = state.rootEntry?.path || '';

    // Compute relative path segments
    const relativePath = rootPath && entry.path.startsWith(rootPath)
      ? entry.path.slice(rootPath.length).replace(/^\//, '')
      : entry.name;
    const segments = relativePath.split('/');

    this.infoBarIsSegmented = true;
    this.infoBar.removeAll();
    this.infoBar.add(() => {
      const type = entry.isDirectory ? 'Folder' : 'File';
      const ext = entry.extension ? ` (${entry.extension})` : '';
      this.infoLabel = this.a.label(`${type}${ext}: `);

      // Each directory segment as a clickable button → navigates into that dir
      for (let i = 0; i < segments.length - 1; i++) {
        const dirPath = rootPath + '/' + segments.slice(0, i + 1).join('/');
        this.a.button(segments[i] + '/', { onClick: () => {
          this.highlightDirPath = null;
          this.store.navigateToPath(dirPath);
          this.updateUI(true);
        }});
      }

      // Final segment (the file/leaf itself) as plain label
      this.a.label(segments[segments.length - 1]);
      this.a.label(` - ${formatBytes(entry.size)}`);
      this.a.spacer();
      this.statsLabel = this.a.label(
        `Files: ${formatNumber(state.scanProgress.filesScanned)} | ` +
        `Folders: ${formatNumber(state.scanProgress.directoriesScanned)} | ` +
        `Total: ${formatBytes(state.scanProgress.totalSize)}`
      ).withId('stats');
    });
  }

  private refreshPixelBuffer(): void {
    if (!this.rasterCanvas) return;
    const st = this.store.getState();
    const buf = renderCushionBuffer(
      this.canvasWidth,
      this.canvasHeight,
      st.allRects,
      st,
      st.hoveredId,
      st.selectedId,
      this.highlightDirPath
    );
    this.rasterCanvas.setPixelBuffer(buf);
  }

  private updateBreadcrumbLabel(): void {
    const state = this.store.getState();
    if (this.breadcrumbLabel) {
      const crumbs = state.breadcrumbs.map(e => e.name).join(' > ');
      this.breadcrumbLabel.setText(crumbs || 'Root');
    }
  }

  private getExtSwatchColor(et: ExtensionTotal, state: AppState): string {
    const saturation = 65;
    const lightness = 55;
    let hue = 0;

    switch (state.colorScheme) {
      case 'byType': {
        hue = FILE_TYPE_HUES[et.ext.toLowerCase()] ?? 180;
        break;
      }
      case 'bySize': {
        const totalSize = state.currentEntry?.size || 1;
        const ratio = Math.log(et.totalSize + 1) / Math.log(totalSize + 1);
        hue = (1 - ratio) * 120;
        break;
      }
      case 'byDepth': {
        hue = (et.avgDepth * 60) % 360;
        break;
      }
      case 'byAge': {
        if (et.avgAgeDays >= 0) {
          hue = Math.max(0, 120 - (et.avgAgeDays / 365) * 120);
        } else {
          hue = 180;
        }
        break;
      }
    }

    const { r, g, b } = hslToRgb(hue, saturation, lightness);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  private updateExtensionList(): void {
    if (!this.extListBox) return;
    const state = this.store.getState();

    this.extListBox.removeAll();
    if (!state.currentEntry) return;

    switch (state.colorScheme) {
      case 'bySize':
        this.updateSizeLegend(state);
        break;
      case 'byDepth':
        this.updateDepthLegend(state);
        break;
      case 'byAge':
        this.updateAgeLegend(state);
        break;
      default:
        this.updateExtensionColorList(state);
        break;
    }
  }

  private updateSizeLegend(state: AppState): void {
    const totalSize = state.currentEntry?.size || 1;

    // Size break thresholds (descending)
    const breaks: { label: string; min: number; max: number }[] = [
      { label: '> 1 GB',     min: 1024 * 1024 * 1024, max: Infinity },
      { label: '> 100 MB',   min: 100 * 1024 * 1024,  max: 1024 * 1024 * 1024 },
      { label: '> 10 MB',    min: 10 * 1024 * 1024,   max: 100 * 1024 * 1024 },
      { label: '> 1 MB',     min: 1024 * 1024,         max: 10 * 1024 * 1024 },
      { label: '> 100 KB',   min: 100 * 1024,          max: 1024 * 1024 },
      { label: '> 10 KB',    min: 10 * 1024,           max: 100 * 1024 },
      { label: '> 1 KB',     min: 1024,                max: 10 * 1024 },
      { label: '< 1 KB',     min: 0,                   max: 1024 },
    ];

    // Count files and total bytes per bucket
    const buckets = breaks.map(b => ({ ...b, fileCount: 0, bucketSize: 0 }));
    function walk(e: FileEntry): void {
      if (!e.isDirectory) {
        for (const bucket of buckets) {
          if (e.size >= bucket.min && e.size < bucket.max) {
            bucket.fileCount++;
            bucket.bucketSize += e.size;
            break;
          }
        }
      }
      for (const child of e.children) walk(child);
    }
    walk(state.currentEntry!);

    // Only show buckets that have files
    const populated = buckets.filter(b => b.fileCount > 0);

    this.extListBox.add(() => {
      for (const bucket of populated) {
        // Use the geometric midpoint of the bucket for the representative color
        const repSize = bucket.min > 0 ? Math.sqrt(bucket.min * Math.min(bucket.max, totalSize)) : 1;
        const ratio = Math.log(repSize + 1) / Math.log(totalSize + 1);
        const hue = (1 - ratio) * 120;
        const { r, g, b } = hslToRgb(hue, 65, 55);
        const hex = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
        this.a.hbox(() => {
          this.a.canvasRectangle({ width: 12, height: 12, fillColor: hex });
          this.a.label(`${bucket.label}  ${bucket.fileCount} files  ${formatBytes(bucket.bucketSize)}`);
        });
      }
    });
  }

  private updateDepthLegend(state: AppState): void {
    // Gather files per depth level
    const depthBuckets = new Map<number, { fileCount: number; totalSize: number }>();
    function walk(e: FileEntry): void {
      if (!e.isDirectory) {
        const prev = depthBuckets.get(e.depth) || { fileCount: 0, totalSize: 0 };
        prev.fileCount++;
        prev.totalSize += e.size;
        depthBuckets.set(e.depth, prev);
      }
      for (const child of e.children) walk(child);
    }
    walk(state.currentEntry!);

    const sorted = Array.from(depthBuckets.entries()).sort((a, b) => a[0] - b[0]);

    this.extListBox.add(() => {
      for (const [depth, bucket] of sorted) {
        const hue = (depth * 60) % 360;
        const { r, g, b } = hslToRgb(hue, 65, 55);
        const hex = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
        this.a.hbox(() => {
          this.a.canvasRectangle({ width: 12, height: 12, fillColor: hex });
          this.a.label(`Depth ${depth}  ${bucket.fileCount} files  ${formatBytes(bucket.totalSize)}`);
        });
      }
    });
  }

  private updateAgeLegend(state: AppState): void {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const breaks: { label: string; minDays: number; maxDays: number }[] = [
      { label: '< 1 week',    minDays: 0,    maxDays: 7 },
      { label: '< 1 month',   minDays: 7,    maxDays: 30 },
      { label: '< 3 months',  minDays: 30,   maxDays: 90 },
      { label: '< 6 months',  minDays: 90,   maxDays: 180 },
      { label: '< 1 year',    minDays: 180,  maxDays: 365 },
      { label: '< 2 years',   minDays: 365,  maxDays: 730 },
      { label: '> 2 years',   minDays: 730,  maxDays: Infinity },
    ];

    const buckets = breaks.map(b => ({ ...b, fileCount: 0, totalSize: 0 }));

    function walk(e: FileEntry): void {
      if (!e.isDirectory) {
        const ageDays = e.modifiedTime ? (now - e.modifiedTime.getTime()) / dayMs : Infinity;
        for (const bucket of buckets) {
          if (ageDays >= bucket.minDays && ageDays < bucket.maxDays) {
            bucket.fileCount++;
            bucket.totalSize += e.size;
            break;
          }
        }
      }
      for (const child of e.children) walk(child);
    }
    walk(state.currentEntry!);

    const populated = buckets.filter(b => b.fileCount > 0);

    this.extListBox.add(() => {
      for (const bucket of populated) {
        // Use midpoint age for representative color — same formula as tiles
        const midDays = (bucket.minDays + Math.min(bucket.maxDays, 365 * 3)) / 2;
        const hue = Math.max(0, 120 - (midDays / 365) * 120);
        const { r, g, b } = hslToRgb(hue, 65, 55);
        const hex = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
        this.a.hbox(() => {
          this.a.canvasRectangle({ width: 12, height: 12, fillColor: hex });
          this.a.label(`${bucket.label}  ${bucket.fileCount} files  ${formatBytes(bucket.totalSize)}`);
        });
      }
    });
  }

  private updateExtensionColorList(state: AppState): void {
    const totals = computeExtensionTotals(state.currentEntry!);
    this.extListBox.add(() => {
      for (const et of totals) {
        const hex = this.getExtSwatchColor(et, state);
        this.a.hbox(() => {
          this.a.canvasRectangle({ width: 12, height: 12, fillColor: hex });
          this.a.label(`${et.ext}  ${formatBytes(et.totalSize)}`);
        });
      }
    });
  }

  private async updateUI(rebuildCanvas: boolean = false): Promise<void> {
    this.updateStatusLabel();
    this.updateStatsLabel();
    this.updateInfoLabel();
    this.updateBreadcrumbLabel();
    await refreshAllBindings();
    if (rebuildCanvas) {
      await this.renderToPixelBuffer();
    }
  }

  private rebuildInProgress = false;

  private async renderToPixelBuffer(): Promise<void> {
    if (!this.canvasStack) return;
    if (this.rebuildInProgress) return;

    this.rebuildInProgress = true;
    try {
      // Reset info bar to simple mode on structural changes
      this.highlightDirPath = null;
      this.restoreSimpleInfoBar();

      // Wait a tick to let removeAll settle on Go side before next mutation
      await new Promise(resolve => setImmediate(resolve));

      await this.rebuildTextOverlay();

      // Update extension list after canvas rebuild completes
      await new Promise(resolve => setImmediate(resolve));
      this.updateExtensionList();
    } finally {
      this.rebuildInProgress = false;
    }
  }

  private async rebuildTextOverlay(): Promise<void> {
    if (!this.canvasStack) return;

    await this.canvasStack.rebuild(() => {
      // Re-create the raster canvas (it's the base layer)
      this.rasterCanvas = this.a.tappableCanvasRaster(this.canvasWidth, this.canvasHeight, {
        onTap: (x: number, y: number) => this.handleTap(x, y),
        onMouseMove: (x: number, y: number) => this.handleMouseMove(x, y),
      });

      // Add Cosyne text overlay for labels on large cells
      const state = this.store.getState();
      cosyne(this.a, (c: CosyneContext) => {
        for (const rect of state.allRects) {
          if (rect.width >= MIN_LABEL_WIDTH && rect.height >= MIN_LABEL_HEIGHT) {
            const label = rect.entry.name.length > 15
              ? rect.entry.name.slice(0, 12) + '...'
              : rect.entry.name;

            c.text(rect.x + 4, rect.y + 14, label)
              .fill('#ffffff')
              .stroke('none', 0)
              .withId(`label-${rect.id}`);

            if (rect.height >= MIN_LABEL_HEIGHT * 2) {
              c.text(rect.x + 4, rect.y + 28, formatBytes(rect.size))
                .fill('#cccccc')
                .stroke('none', 0)
                .withId(`size-${rect.id}`);
            }
          }
        }

        // Show message if no content
        if (state.allRects.length === 0 && !state.scanProgress.isScanning) {
          if (state.rootEntry) {
            c.text(state.canvasWidth / 2 - 80, state.canvasHeight / 2, 'Empty folder')
              .fill('#ffffff')
              .stroke('none', 0)
              .withId('empty-message');
          } else {
            c.text(state.canvasWidth / 2 - 100, state.canvasHeight / 2, 'Click "Open Folder" to start')
              .fill('#ffffff')
              .stroke('none', 0)
              .withId('start-message');
          }
        }
      });

      // Now send the pixel buffer to the newly created raster
      const st = this.store.getState();
      const buf = renderCushionBuffer(
        this.canvasWidth,
        this.canvasHeight,
        st.allRects,
        st,
        st.hoveredId,
        st.selectedId,
        this.highlightDirPath
      );
      this.rasterCanvas.setPixelBuffer(buf);
    });
  }

  private handleTap(x: number, y: number): void {
    if (this.rebuildInProgress) return;  // Don't mutate during rebuild

    const state = this.store.getState();
    const hit = hitTestRects(x, y, state.allRects);
    if (!hit) return;

    const now = Date.now();
    const isDoubleTap = (now - this.lastTapTime < 400) && this.lastTapId === hit.id;
    this.lastTapTime = now;
    this.lastTapId = hit.id;

    if (isDoubleTap) {
      // Double-tap: drill into directory
      const dirPath = hit.entry.isDirectory
        ? hit.entry.path
        : path.dirname(hit.entry.path);
      this.highlightDirPath = null;
      this.store.navigateToPath(dirPath);
      this.updateUI(true);
    } else {
      // Single tap: select + show clickable path
      this.highlightDirPath = null;
      this.store.setSelected(hit.id);
      this.updateUI(false);
      this.rebuildInfoBar(hit.entry);
      this.refreshPixelBuffer();
    }
  }

  private handleMouseMove(x: number, y: number): void {
    if (this.rebuildInProgress) return;  // Don't mutate during rebuild

    const state = this.store.getState();
    const hit = hitTestRects(x, y, state.allRects);
    const newId = hit ? hit.id : null;

    if (newId !== state.hoveredId) {
      this.store.setHovered(newId);
      this.updateInfoLabel();

      // Re-render pixel buffer for hover highlight (but don't rebuild text overlay)
      if (this.rasterCanvas) {
        const st = this.store.getState();
        const buf = renderCushionBuffer(
          this.canvasWidth,
          this.canvasHeight,
          st.allRects,
          st,
          st.hoveredId,
          st.selectedId,
          this.highlightDirPath
        );
        this.rasterCanvas.setPixelBuffer(buf);
      }
    }
  }

  buildUI(win: Window): void {
    this.window = win;

    this.a.vbox(() => {
      // Title bar
      this.a.hbox(() => {
        this.titleLabel = this.a.label('Disk Tree - Treemap Visualization').withId('title');
        this.a.spacer();
        this.statusLabel = this.a.label('Select a folder to analyze').withId('status');
      });

      this.a.separator();

      // Control buttons
      this.a.hbox(() => {
        this.a.button('Open Folder', { onClick: async () => {
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
          } }).withId('openBtn');

        this.upBtn = this.a.button('Up', { onClick: () => {
            this.store.drillUp();
            this.updateUI(true);
          } }).withId('upBtn')
            .ghostWhen(() => this.store.getState().breadcrumbs.length <= 1);

        this.rootBtn = this.a.button('Root', { onClick: () => {
            this.store.goToRoot();
            this.updateUI(true);
          } }).withId('rootBtn')
            .ghostWhen(() => this.store.getState().breadcrumbs.length <= 1);

        this.a.spacer();

        // Color scheme buttons
        this.a.label('Color:');

        this.a.button('Type', { onClick: () => {
            this.store.setColorScheme('byType');
            this.updateUI(true);
          } }).withId('colorTypeBtn');

        this.a.button('Size', { onClick: () => {
            this.store.setColorScheme('bySize');
            this.updateUI(true);
          } }).withId('colorSizeBtn');

        this.a.button('Depth', { onClick: () => {
            this.store.setColorScheme('byDepth');
            this.updateUI(true);
          } }).withId('colorDepthBtn');

        this.a.button('Age', { onClick: () => {
            this.store.setColorScheme('byAge');
            this.updateUI(true);
          } }).withId('colorAgeBtn');
      });

      // Breadcrumb navigation
      this.a.hbox(() => {
        this.a.label('Path:');
        this.breadcrumbLabel = this.a.label('Root').withId('breadcrumb');
      });

      this.a.separator();

      // Canvas + extension summary side by side
      this.a.hbox(() => {
        // Canvas for treemap - canvasStack layers raster + text overlay
        this.canvasStack = this.a.canvasStack(() => {
          this.rasterCanvas = this.a.tappableCanvasRaster(this.canvasWidth, this.canvasHeight, {
            onTap: (x: number, y: number) => this.handleTap(x, y),
            onMouseMove: (x: number, y: number) => this.handleMouseMove(x, y),
          });

          // Initial text overlay (empty - will be populated after scan)
          cosyne(this.a, (c: CosyneContext) => {
            c.text(this.canvasWidth / 2 - 100, this.canvasHeight / 2, 'Click "Open Folder" to start')
              .fill('#ffffff')
              .stroke('none', 0)
              .withId('start-message');
          });
        });

        // Extension summary panel (scrollable)
        this.a.scroll(() => {
          this.extListBox = this.a.vbox(() => {
            this.a.label('Extensions');
          });
        }).withMinSize(160, this.canvasHeight);
      });

      this.a.separator();

      // Info bar (stored for dynamic rebuild with clickable path segments)
      this.infoBar = this.a.hbox(() => {
        this.infoLabel = this.a.label('Hover over an item for details').withId('info');
        this.a.spacer();
        this.statsLabel = this.a.label('Files: 0 | Folders: 0 | Total: 0 B').withId('stats');
      });
    });

    // Set up subscriptions AFTER canvasStack exists to avoid premature rebuilds
    this.store.setCanvasSize(this.canvasWidth, this.canvasHeight);

    // Subscribe to store changes - rebuild canvas when structure changes
    this.store.subscribe(() => {
      this.updateUI(true);
    });

    // Subscribe to progress updates - labels only, no canvas rebuild
    this.store.subscribeProgress(() => {
      this.updateStatusLabel();
      this.updateStatsLabel();
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
  const initialFolder = process.argv[2]; // Optional folder path as first arg

  const appInstance = app(resolveTransport(), { title: 'Disk Tree', width: 900, height: 700 }, (a: App) => {
    a.window({ title: 'Disk Tree', width: 900, height: 700 }, (win: Window) => {
      const ui = buildDiskTreeApp(a, win);
      win.show();

      // Auto-scan if folder provided via command line
      if (initialFolder) {
        console.log(`[DiskTree] Auto-scanning: ${initialFolder}`);
        ui.getStore().scanDirectory(initialFolder);
      }
    });
  });
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
