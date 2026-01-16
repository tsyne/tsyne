/**
 * GrandPerspective for Tsyne - Disk Usage Visualization
 *
 * @tsyne-app:name GrandPerspective
 * @tsyne-app:icon storage
 * @tsyne-app:category Utilities
 * @tsyne-app:args (a: any) => void
 */

import * as fs from 'fs';
import * as path from 'path';
import { cosyne, refreshAllCosyneContexts } from '../../cosyne/src/index';
import { EventRouter } from '../../cosyne/src/events';

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

  return `hsl(${Math.round(h)},${Math.round(s)}%,${Math.round(l)}%)`;
}

function getTextColor(bgHsl: string): string {
  // Simple heuristic: if lightness > 60, use dark text
  const match = bgHsl.match(/hsl\([^,]+,[^,]+,(\d+)/);
  const lightness = match ? parseInt(match[1]) : 50;
  return lightness > 60 ? '#000000' : '#ffffff';
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

function lightenColor(hsl: string, amount: number): string {
  const match = hsl.match(/hsl\(([^,]+),([^,]+),([^)]+)\)/);
  if (!match) return hsl;
  const h = parseFloat(match[1]);
  const s = parseFloat(match[2]);
  const l = parseFloat(match[3]);
  return `hsl(${h},${s}%,${Math.min(100, l + amount)}%)`;
}

function darkenColor(hsl: string, amount: number): string {
  const match = hsl.match(/hsl\(([^,]+),([^,]+),([^)]+)\)/);
  if (!match) return hsl;
  const h = parseFloat(match[1]);
  const s = parseFloat(match[2]);
  const l = parseFloat(match[3]);
  return `hsl(${h},${s}%,${Math.max(0, l - amount)}%)`;
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

export function buildGrandPerspectiveApp(a: any, initialPath?: string): void {
  const store = new GrandPerspectiveStore();
  let cosyneCtx: any = null;
  let eventRouter: EventRouter | null = null;

  const updateUI = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    refreshAllCosyneContexts();
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

  a.window({ title: 'GrandPerspective', width: 1000, height: 700 }, (win: any) => {
    win.setContent(() => {
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
        a.label('').withId('info-label');

        // Canvas
        a.canvasStack(() => {
          cosyneCtx = cosyne(a, (c: any) => {
            const state = store.getState();

            // Background
            c.rect(0, 0, 800, 600)
              .fill('#f5f5f5')
              .stroke('#cccccc', 1);

            if (!state.allRects || state.allRects.length === 0) {
              c.text(400, 300, 'Select a directory')
                .fill('#999999')
                .fontSize(16);
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
                  fileName
                )
                  .fill(textColor)
                  .fontSize(10)
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
                updateUI();
              });

              rectObj.onMouseLeave(() => {
                store.setHovered(null);
                updateUI();
              });
            });
          });

          if (cosyneCtx && eventRouter === null) {
            eventRouter = new EventRouter(cosyneCtx.primitives, cosyneCtx.root);
          }
        }).withId('canvas-container');
      });
    });

    // Update info label when selection changes
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const selected = state.allRects.find(r => r.id === state.selectedId);
      if (selected) {
        const sizeMB = (selected.size / 1024 / 1024).toFixed(2);
        const type = selected.entry.isDirectory ? 'Folder' : 'File';
        const infoText = `${type}: ${selected.entry.name} (${sizeMB} MB)`;
        // Note: Can't directly update label without reference, would need widget refs
      }
    });

    win.show();
  });
}

// Standalone execution
if (require.main === module) {
  // @Grab required if using external deps
  const { app } = require('../../src/index');

  // Extract starting directory from command-line argument (argv[2])
  // Usage: npx tsx grand-perspective.ts /path/to/directory
  const startDir = process.argv[2] || undefined;

  app({ title: 'GrandPerspective' }, (a: any) => {
    buildGrandPerspectiveApp(a, startDir);
  });
}
