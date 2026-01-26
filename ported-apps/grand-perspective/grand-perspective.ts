/**
 * GrandPerspective for Tsyne - Disk Usage Visualization
 *
 * Portions copyright © Erwin Bonsma (GrandPerspective original)
 * Portions copyright © Paul Hammant 2026 (Tsyne port)
 *
 * Licensed under MIT License
 * Based on GrandPerspective by Erwin Bonsma (GPL-2.0)
 * https://grandperspectiv.sourceforge.net/
 *
 * @tsyne-app:name GrandPerspective
 * @tsyne-app:icon storage
 * @tsyne-app:category Utilities
 * @tsyne-app:builder buildGrandPerspectiveApp
 * @tsyne-app:args app,initialPath,windowWidth,windowHeight
 */

import * as fs from 'fs';
import * as path from 'path';
import { cosyne, refreshAllCosyneContexts, EventRouter, enableEventHandling } from 'cosyne';

// ============================================================================
// Data Types
// ============================================================================

export interface FileEntry {
  id: string;
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  children: FileEntry[];
  parent?: FileEntry;
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

export interface AppState {
  rootPath: string;
  rootEntry: FileEntry | null;
  allRects: TreemapRect[];
  currentPath: string[];
  colorScheme: 'bySize' | 'byDepth' | 'byType';
  selectedId: string | null;
  hoveredId: string | null;
  totalSize: number;
}

// ============================================================================
// Observable Store
// ============================================================================

type ChangeListener = () => void;

export class GrandPerspectiveStore {
  private state: AppState;
  private changeListeners: ChangeListener[] = [];
  private nextId = 0;

  constructor() {
    this.state = {
      rootPath: process.env.HOME || '/home',
      rootEntry: null,
      allRects: [],
      currentPath: [],
      colorScheme: 'bySize',
      selectedId: null,
      hoveredId: null,
      totalSize: 0,
    };
  }

  getState(): AppState {
    return this.state;
  }

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }

  private notifyChange(): void {
    this.changeListeners.forEach(l => l());
  }

  // Scan directory recursively, max depth to avoid massive trees
  async scanDirectory(dirPath: string, maxDepth = 5): Promise<FileEntry> {
    const scan = (currentPath: string, currentDepth: number): FileEntry => {
      const name = path.basename(currentPath);
      const id = `file-${this.nextId++}`;
      let size = 0;
      let children: FileEntry[] = [];

      try {
        const stats = fs.statSync(currentPath);
        size = stats.isDirectory() ? 0 : stats.size;

        if (stats.isDirectory() && currentDepth < maxDepth) {
          const entries = fs.readdirSync(currentPath, { withFileTypes: true });
          children = entries
            .map(entry => scan(path.join(currentPath, entry.name), currentDepth + 1))
            .sort((a, b) => b.size - a.size);

          size = children.reduce((sum, child) => sum + getTotalSize(child), 0);
        }
      } catch (e) {
        // Skip permissions errors
      }

      const entry: FileEntry = {
        id,
        name: name || currentPath,
        path: currentPath,
        size,
        isDirectory: fs.statSync(currentPath).isDirectory(),
        children,
      };

      return entry;
    };

    const entry = scan(dirPath, 0);
    this.state.rootEntry = entry;
    this.state.rootPath = dirPath;
    this.state.totalSize = getTotalSize(entry);
    this.generateTreemapRects();
    this.notifyChange();
    return entry;
  }

  setRootPath(dirPath: string): void {
    this.state.rootPath = dirPath;
    this.scanDirectory(dirPath).catch(() => {});
  }

  setColorScheme(scheme: 'bySize' | 'byDepth' | 'byType'): void {
    this.state.colorScheme = scheme;
    this.notifyChange();
  }

  setSelected(id: string | null): void {
    this.state.selectedId = id;
    this.notifyChange();
  }

  setHovered(id: string | null): void {
    this.state.hoveredId = id;
    this.notifyChange();
  }

  drillDown(id: string): void {
    const rect = this.state.allRects.find(r => r.id === id);
    if (rect && rect.entry.isDirectory) {
      this.state.currentPath = [...this.state.currentPath, rect.entry.name];
      this.generateTreemapRects();
      this.notifyChange();
    }
  }

  drillUp(): void {
    if (this.state.currentPath.length > 0) {
      this.state.currentPath = this.state.currentPath.slice(0, -1);
      this.generateTreemapRects();
      this.notifyChange();
    }
  }

  private getCurrentEntry(): FileEntry | null {
    if (!this.state.rootEntry) return null;
    let current = this.state.rootEntry;
    for (const name of this.state.currentPath) {
      const next = current.children.find(c => c.name === name);
      if (!next) return current;
      current = next;
    }
    return current;
  }

  private generateTreemapRects(): void {
    const current = this.getCurrentEntry();
    if (!current) {
      this.state.allRects = [];
      return;
    }

    const rects: TreemapRect[] = [];
    const treemapRects = layoutTreemap(0, 0, 800, 600, current.children);

    treemapRects.forEach(rect => {
      rects.push({
        ...rect,
        depth: this.state.currentPath.length,
        entry: rect.entry,
      });
    });

    this.state.allRects = rects;
  }
}

// ============================================================================
// Treemap Layout Algorithm
// ============================================================================

function getTotalSize(entry: FileEntry): number {
  if (!entry.isDirectory) return entry.size;
  return entry.children.reduce((sum, child) => sum + getTotalSize(child), 0);
}

interface LayoutResult {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  size: number;
  entry: FileEntry;
}

function layoutTreemap(
  x: number,
  y: number,
  width: number,
  height: number,
  items: FileEntry[],
  minSize = 5000
): LayoutResult[] {
  const results: LayoutResult[] = [];

  // Filter out very small items
  const filtered = items.filter(item => getTotalSize(item) >= minSize);
  if (filtered.length === 0) {
    return results;
  }

  const totalSize = filtered.reduce((sum, item) => sum + getTotalSize(item), 0);
  const sorted = filtered.sort((a, b) => getTotalSize(b) - getTotalSize(a));

  // Squarified treemap layout
  let row: FileEntry[] = [];
  let rowWidth = Math.min(width, height);

  let currentX = x;
  let currentY = y;
  let remainingWidth = width;
  let remainingHeight = height;

  sorted.forEach(item => {
    const itemSize = getTotalSize(item);
    const ratio = itemSize / totalSize;

    if (row.length === 0) {
      row.push(item);
      return;
    }

    const rowTotal = row.reduce((sum, i) => sum + getTotalSize(i), 0);
    const newRowTotal = rowTotal + itemSize;
    const worstBefore = worstAspectRatio(
      row.map(i => getTotalSize(i) / totalSize),
      rowWidth
    );
    const worstAfter = worstAspectRatio(
      [...row, item].map(i => getTotalSize(i) / totalSize),
      rowWidth
    );

    if (worstAfter < worstBefore || row.length === 1) {
      row.push(item);
    } else {
      // Layout current row
      const rects = layoutRow(currentX, currentY, rowWidth, row, totalSize);
      results.push(...rects);

      if (rowWidth === width) {
        currentY += rowWidth;
        remainingHeight -= rowWidth;
        rowWidth = Math.min(remainingWidth, remainingHeight);
      } else {
        currentX += rowWidth;
        remainingWidth -= rowWidth;
        rowWidth = Math.min(remainingWidth, remainingHeight);
      }

      row = [item];
    }
  });

  // Layout remaining row
  if (row.length > 0) {
    const rects = layoutRow(currentX, currentY, rowWidth, row, totalSize);
    results.push(...rects);
  }

  return results;
}

function worstAspectRatio(ratios: number[], container: number): number {
  return Math.max(
    ...ratios.map(ratio => {
      const w = container * ratio;
      const h = container / ratio;
      return Math.max(w / h, h / w);
    })
  );
}

function layoutRow(
  x: number,
  y: number,
  rowWidth: number,
  items: FileEntry[],
  totalSize: number
): LayoutResult[] {
  const results: LayoutResult[] = [];
  const rowTotal = items.reduce((sum, item) => sum + getTotalSize(item), 0);
  let currentY = y;

  items.forEach(item => {
    const itemSize = getTotalSize(item);
    const ratio = itemSize / rowTotal;
    const height = rowWidth * ratio;

    results.push({
      id: item.id,
      x,
      y: currentY,
      width: rowWidth,
      height,
      size: itemSize,
      entry: item,
    });

    currentY += height;
  });

  return results;
}

// ============================================================================
// Display Utilities
// ============================================================================

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ============================================================================
// Color Utilities
// ============================================================================

function getColor(rect: TreemapRect, state: AppState, hovered: boolean): string {
  let h = 0;
  let s = hovered ? 100 : 70;
  let l = hovered ? 45 : 55;

  if (state.colorScheme === 'bySize') {
    const ratio = Math.log(rect.size + 1) / Math.log(state.totalSize + 1);
    h = (ratio * 360) % 360;
  } else if (state.colorScheme === 'byDepth') {
    h = (rect.depth * 60) % 360;
  } else if (state.colorScheme === 'byType') {
    const ext = path.extname(rect.entry.name).toLowerCase();
    const typeMap: Record<string, number> = {
      '.ts': 0,
      '.js': 30,
      '.json': 60,
      '.md': 120,
      '.png': 180,
      '.jpg': 200,
      '.mp4': 240,
      '.pdf': 270,
    };
    h = typeMap[ext] ?? 300;
  }

  // Convert to RGB since Go bridge doesn't parse HSL
  const { r, g, b } = hslToRgb(h, s, l);
  return `rgb(${r}, ${g}, ${b})`;
}

function getTextColor(bgColor: string): string {
  // Parse RGB and calculate perceived brightness
  const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return '#ffffff';
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  // Use perceived brightness formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(255 * f(0)),
    g: Math.round(255 * f(8)),
    b: Math.round(255 * f(4)),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function parseRgb(rgb: string): { r: number; g: number; b: number } | null {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return null;
  return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
}

function lightenColor(color: string, amount: number): string {
  const rgb = parseRgb(color);
  if (!rgb) return color;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const newL = Math.min(100, hsl.l + amount);
  const { r, g, b } = hslToRgb(hsl.h, hsl.s, newL);
  return `rgb(${r}, ${g}, ${b})`;
}

function darkenColor(color: string, amount: number): string {
  const rgb = parseRgb(color);
  if (!rgb) return color;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const newL = Math.max(0, hsl.l - amount);
  const { r, g, b } = hslToRgb(hsl.h, hsl.s, newL);
  return `rgb(${r}, ${g}, ${b})`;
}

function renderShadedRect(c: any, rect: TreemapRect, baseColor: string, isSelected: boolean, bevelSize: number = 3): void {
  const BEVEL = bevelSize;

  // Shadow edges (bottom and right)
  c.rect(rect.x + BEVEL, rect.y + rect.height - BEVEL, rect.width - BEVEL, BEVEL)
    .fill(darkenColor(baseColor, 15))
    .stroke('none', 0);

  c.rect(rect.x + rect.width - BEVEL, rect.y + BEVEL, BEVEL, rect.height - BEVEL)
    .fill(darkenColor(baseColor, 15))
    .stroke('none', 0);

  // Highlight edges (top and left)
  c.rect(rect.x, rect.y, rect.width - BEVEL, BEVEL)
    .fill(lightenColor(baseColor, 20))
    .stroke('none', 0);

  c.rect(rect.x, rect.y + BEVEL, BEVEL, rect.height - BEVEL)
    .fill(lightenColor(baseColor, 20))
    .stroke('none', 0);

  // Main surface
  c.rect(rect.x + BEVEL, rect.y + BEVEL, rect.width - 2 * BEVEL, rect.height - 2 * BEVEL)
    .fill(baseColor)
    .stroke(isSelected ? '#ff0000' : '#ffffff', isSelected ? 1 : 0)
    .withId(`rect-${rect.id}`);
}

// ============================================================================
// Main App
// ============================================================================

export function buildGrandPerspectiveApp(a: any, initialPath?: string, windowWidth?: number, windowHeight?: number): void {
  const store = new GrandPerspectiveStore();
  let cosyneCtx: any = null;
  let eventRouter: EventRouter | null = null;
  let infoLabel: any = null;

  const updateUI = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    refreshAllCosyneContexts();
  };

  const updateHoverInfo = () => {
    if (!infoLabel) return;

    const state = store.getState();
    if (!state.hoveredId) {
      infoLabel.setText('Hover over an item for details');
      return;
    }

    const hoveredRect = state.allRects.find(r => r.id === state.hoveredId);
    if (!hoveredRect) {
      infoLabel.setText('Hover over an item for details');
      return;
    }

    const type = hoveredRect.entry.isDirectory ? 'Folder' : 'File';
    const size = formatSize(hoveredRect.size);
    infoLabel.setText(`${type}: ${hoveredRect.entry.name}  |  Size: ${size}`);
  };

  // Determine starting directory with priority:
  // 1. Parameter passed to function (for programmatic use)
  // 2. Command-line argument (process.argv[2])
  // 3. Default fallback directories
  const getStartingDirectory = (): string => {
    if (initialPath) {
      try {
        fs.statSync(initialPath);
        return initialPath;
      } catch (e) {
        // Fall through to next option
      }
    }

    if (typeof process !== 'undefined' && process.argv && process.argv[2]) {
      const cliPath = process.argv[2];
      try {
        fs.statSync(cliPath);
        return cliPath;
      } catch (e) {
        console.warn(`Directory not found or inaccessible: ${cliPath}`);
      }
    }

    // Fallback chain
    const fallbacks = [
      '/home/user/tsyne/ported-apps',
      '/home/user/tsyne',
      process.env.HOME || '/home',
      '/tmp',
    ];

    for (const path of fallbacks) {
      try {
        fs.statSync(path);
        return path;
      } catch (e) {
        // Continue to next fallback
      }
    }

    return '/tmp';
  };

  // Initialize with determined directory
  const startingDir = getStartingDirectory();
  store.scanDirectory(startingDir).catch(() => {
    store.scanDirectory('/tmp').catch(() => {});
  });

  const buildContent = () => {
    a.vbox(() => {
        // Header with controls
        a.hbox(() => {
          a.label('Disk Usage Visualization').withId('title-label');
          a.button('Parent').onClick(() => {
            store.drillUp();
            updateUI();
          }).withId('parent-btn');

          a.spacer();

          a.button('by Size').onClick(() => {
            store.setColorScheme('bySize');
            updateUI();
          }).withId('color-size-btn');

          a.button('by Depth').onClick(() => {
            store.setColorScheme('byDepth');
            updateUI();
          }).withId('color-depth-btn');

          a.button('by Type').onClick(() => {
            store.setColorScheme('byType');
            updateUI();
          }).withId('color-type-btn');
        });

        // Info panel
        infoLabel = a.label('Hover over an item for details').withId('info-label');

        // Canvas
        a.canvasStack(() => {
          cosyneCtx = cosyne(a, (c: any) => {
            const state = store.getState();

            // Background
            c.rect(0, 0, 800, 600)
              .fill('#f5f5f5')
              .stroke('#cccccc', 1);

            if (!state.allRects || state.allRects.length === 0) {
              c.text(400, 300, 'Select a directory', { fontSize: 16 })
                .fill('#999999');
              return;
            }

            // Render treemap rects with 3D shading
            state.allRects.forEach(rect => {
              const isSelected = rect.id === state.selectedId;
              const isHovered = rect.id === state.hoveredId;
              const bgColor = getColor(rect, state, isHovered);
              const textColor = getTextColor(bgColor);

              // Use 3D shaded rectangle rendering
              renderShadedRect(c, rect, bgColor, isSelected, rect.width < 30 ? 1 : 3);

              // Get the main rect object for event handling
              const rectObj = c.rect(rect.x, rect.y, rect.width, rect.height)
                .fill('transparent')
                .stroke('none', 0)
                .withId(`rect-${rect.id}`);

              if (rect.height > 25 && rect.width > 40) {
                const fileName = rect.entry.name.length > 20
                  ? rect.entry.name.substring(0, 17) + '...'
                  : rect.entry.name;

                c.text(
                  rect.x + 5,
                  rect.y + 15,
                  fileName,
                  { fontSize: 10 }
                )
                  .fill(textColor)
                  .withId(`text-${rect.id}`);
              }

              rectObj.onClick(() => {
                store.setSelected(rect.id);
                if (rect.entry.isDirectory) {
                  store.drillDown(rect.id);
                }
                updateUI();
              });

              rectObj.onMouseEnter(() => {
                store.setHovered(rect.id);
                updateHoverInfo();
              });

              rectObj.onMouseLeave(() => {
                store.setHovered(null);
                updateHoverInfo();
              });
            });

            // Render tooltip for hovered item (rendered last to be on top)
          });

          if (cosyneCtx && eventRouter === null) {
            eventRouter = enableEventHandling(cosyneCtx, a, { width: 800, height: 600 });
          }
        });
    });
  };

  // Update info label when selection changes
  store.subscribe(() => {
    const state = store.getState();
    const selected = state.allRects.find(r => r.id === state.selectedId);
    if (selected) {
      const sizeMB = (selected.size / 1024 / 1024).toFixed(2);
      const type = selected.entry.isDirectory ? 'Folder' : 'File';
      const infoText = `${type}: ${selected.entry.name} (${sizeMB} MB)`;
      // Note: Can't directly update label without reference, would need widget refs
    }
  });

  // Always create a window - PhoneTop intercepts this to create a StackPaneAdapter
  a.window({ title: 'GrandPerspective', width: 1000, height: 700 }, (win: any) => {
    win.setContent(buildContent);
    win.show();
  });
}

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport } = require('../../core/src');

  // Extract starting directory from command-line argument (argv[2])
  // Usage: npx tsx grand-perspective.ts /path/to/directory
  const startDir = process.argv[2] || undefined;

  app(resolveTransport(), { title: 'GrandPerspective' }, (a: any) => {
    buildGrandPerspectiveApp(a, startDir);
  });
}
