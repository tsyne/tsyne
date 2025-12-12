// @tsyne-app:name Prime Grid Visualizer
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="1"/><line x1="6" y1="6" x2="6" y2="18"/><line x1="10" y1="6" x2="10" y2="18"/><line x1="14" y1="6" x2="14" y2="18"/><line x1="18" y1="6" x2="18" y2="18"/><line x1="2" y1="6" x2="22" y2="6"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="2" y1="14" x2="22" y2="14"/><line x1="2" y1="18" x2="22" y2="18"/></svg>
// @tsyne-app:category utilities
// @tsyne-app:builder createPrimeGridApp

/**
 * Prime Grid Visualizer for Tsyne
 *
 * Ported from https://abhrankan-chakrabarti.github.io/prime-grid-visualizer/
 * Original author: Abhrankan Chakrabarti
 * License: Please see https://github.com/abhrankan-chakrabarti/prime-grid-visualizer for original license
 *
 * This application visualizes prime numbers in a customizable grid layout.
 * Features include:
 * - Interactive grid visualization of primes and composites
 * - Customizable parameters (max number, grid columns, cell size)
 * - Statistics display (prime count, percentage)
 * - Screenshot/export capability
 *
 * This Tsyne port adapts the original web-based visualization to work with
 * Tsyne's TypeScript-to-Fyne bridge architecture while maintaining the same
 * core prime number calculation and visualization capabilities.
 */

import { app } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { CanvasRaster } from '../../core/src/widgets/canvas';

// Color constants (RGB)
const COLOR_PRIME = { r: 34, g: 197, b: 94 };        // Green
const COLOR_COMPOSITE = { r: 239, g: 68, b: 68 };    // Red
const COLOR_ONE = { r: 59, g: 130, b: 246 };         // Blue
const COLOR_WHITE = { r: 255, g: 255, b: 255 };
const COLOR_BLACK = { r: 0, g: 0, b: 0 };
const COLOR_BORDER = { r: 51, g: 51, b: 51 };

interface GridState {
  n: number;
  columns: number;
  cellSize: number;
  isPrimes: boolean[];
  primeCount: number;
}

/**
 * Prime sieve using Sieve of Eratosthenes algorithm
 */
function sieveOfEratosthenes(max: number): boolean[] {
  if (max < 2) return [];

  const isPrime = new Array(max + 1).fill(true);
  isPrime[0] = false;
  isPrime[1] = false;

  for (let i = 2; i * i <= max; i++) {
    if (isPrime[i]) {
      for (let j = i * i; j <= max; j += i) {
        isPrime[j] = false;
      }
    }
  }

  return isPrime;
}

/**
 * Check if a color is light
 */
function isLightColor(color: { r: number; g: number; b: number }): boolean {
  const luminance = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
  return luminance > 0.5;
}

/**
 * Draw a single cell on the raster
 */
async function drawCell(
  raster: CanvasRaster,
  cellNum: number,
  isPrimes: boolean[],
  cellSize: number,
  startX: number,
  startY: number
) {
  // Determine color
  let color = COLOR_COMPOSITE;
  if (cellNum === 1) {
    color = COLOR_ONE;
  } else if (isPrimes[cellNum]) {
    color = COLOR_PRIME;
  }

  // Draw filled rectangle (main cell content)
  await raster.fillRect(
    startX + 1,
    startY + 1,
    cellSize - 2,
    cellSize - 2,
    color.r,
    color.g,
    color.b,
    255
  );

  // Draw border
  await raster.fillRect(startX, startY, cellSize, 1, COLOR_BORDER.r, COLOR_BORDER.g, COLOR_BORDER.b, 255); // Top
  await raster.fillRect(startX, startY + cellSize - 1, cellSize, 1, COLOR_BORDER.r, COLOR_BORDER.g, COLOR_BORDER.b, 255); // Bottom
  await raster.fillRect(startX, startY, 1, cellSize, COLOR_BORDER.r, COLOR_BORDER.g, COLOR_BORDER.b, 255); // Left
  await raster.fillRect(startX + cellSize - 1, startY, 1, cellSize, COLOR_BORDER.r, COLOR_BORDER.g, COLOR_BORDER.b, 255); // Right
}

export function createPrimeGridApp(a: App, win: Window): void {
  let state: GridState = {
    n: 100,
    columns: 10,
    cellSize: 20,
    isPrimes: [],
    primeCount: 0,
  };

  let raster: CanvasRaster | null = null;
  let statsLabel: any;

  /**
   * Calculate the number of rows needed
   */
  function getRows(): number {
    return Math.ceil((state.n + 1) / state.columns);
  }

  /**
   * Calculate canvas dimensions
   */
  function getCanvasDimensions(): { width: number; height: number } {
    const width = state.columns * state.cellSize;
    const height = getRows() * state.cellSize;
    return { width: Math.min(width, 800), height: Math.min(height, 800) };
  }

  /**
   * Generate the grid
   */
  function generateGrid() {
    if (state.n < 2) {
      state.n = 2;
    }
    if (state.columns < 1) {
      state.columns = 1;
    }
    if (state.cellSize < 5) {
      state.cellSize = 5;
    }

    state.isPrimes = sieveOfEratosthenes(state.n);
    state.primeCount = 0;
    for (let i = 2; i <= state.n; i++) {
      if (state.isPrimes[i]) {
        state.primeCount++;
      }
    }

    updateDisplay();
  }

  /**
   * Render the grid to the raster
   */
  async function renderGridToRaster() {
    if (!raster || !state.isPrimes.length) return;

    try {
      const dims = getCanvasDimensions();

      // Draw background
      await raster.fillRect(
        0,
        0,
        dims.width,
        dims.height,
        COLOR_WHITE.r,
        COLOR_WHITE.g,
        COLOR_WHITE.b,
        255
      );

      // Draw cells
      let cellNum = 1;
      for (let row = 0; row < getRows() && cellNum <= state.n; row++) {
        for (let col = 0; col < state.columns && cellNum <= state.n; col++) {
          const x = col * state.cellSize;
          const y = row * state.cellSize;
          await drawCell(raster, cellNum, state.isPrimes, state.cellSize, x, y);
          cellNum++;
        }
      }
    } catch (error) {
      console.error('Error rendering grid:', error);
    }
  }

  /**
   * Update display elements and redraw
   */
  async function updateDisplay() {
    // Update statistics
    const composites = Math.max(0, state.n - 1 - state.primeCount);
    const percentage = state.n > 0 ? ((state.primeCount / state.n) * 100).toFixed(1) : '0.0';
    const statsText = `Primes: ${state.primeCount} | Composites: ${composites} | ${percentage}% prime`;

    if (statsLabel) {
      statsLabel.setText(statsText);
    }

    // Redraw raster
    await renderGridToRaster();
  }

  /**
   * Export as screenshot
   */
  async function exportScreenshot() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `/tmp/prime-grid-${timestamp}.png`;
      await win.screenshot(filename);
      await win.showInfo('Export Successful', `Screenshot saved to ${filename}`);
    } catch (error) {
      await win.showError('Export Failed', `Error: ${String(error)}`);
    }
  }

  // Build UI
  a.window({ title: 'Prime Grid Visualizer', width: 900, height: 900 }, (winCtx) => {
    winCtx.setContent(() => {
      a.vbox(() => {
        // Title
        a.label('Prime Grid Visualizer').setFontSize(18);

        // Control Panel
        a.padded(() => {
          a.vbox(() => {
            // Row 1: Input controls
            a.hbox(() => {
              a.label('Max Number:').withId('labelMaxN');
              a.entry(
                state.n.toString(),
                (val) => {
                  const newN = parseInt(val, 10) || 100;
                  if (newN > 1) {
                    state.n = newN;
                  }
                },
                80
              ).withId('inputMaxN');

              a.label('  Columns:').withId('labelColumns');
              a.entry(
                state.columns.toString(),
                (val) => {
                  const newCols = parseInt(val, 10) || 10;
                  if (newCols > 0) {
                    state.columns = newCols;
                  }
                },
                80
              ).withId('inputColumns');

              a.label('  Cell Size:').withId('labelCellSize');
              a.entry(
                state.cellSize.toString(),
                (val) => {
                  const newSize = parseInt(val, 10) || 20;
                  if (newSize >= 5) {
                    state.cellSize = newSize;
                  }
                },
                80
              ).withId('inputCellSize');

              a.button('Generate').onClick(() => {
                generateGrid();
              }).withId('btnGenerate');
            });

            // Row 2: Statistics
            statsLabel = a.label('Ready to generate...').withId('statsLabel');

            // Row 3: Export button
            a.button('Export as Screenshot').onClick(() => {
              exportScreenshot();
            }).withId('btnExport');

            // Legend
            a.hbox(() => {
              a.label('Legend: ').setFontSize(10);
              a.rectangle('#22c55e', 12, 12); // Prime
              a.label(' Prime  ', '', 10);

              a.rectangle('#ef4444', 12, 12); // Composite
              a.label(' Composite  ', '', 10);

              a.rectangle('#3b82f6', 12, 12); // One
              a.label(' One  ', '', 10);
            });
          });
        });

        // Grid Display Area
        a.scroll(() => {
          const dims = getCanvasDimensions();
          raster = a.canvasRaster(dims.width, dims.height);
          raster.withId('gridRaster');
        });
      });
    });

    winCtx.show();
  });

  // Initialize with default grid
  generateGrid();
}
