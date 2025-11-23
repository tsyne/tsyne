/**
 * Drawing App Example
 *
 * Demonstrates the color picker dialog with a simple paint application.
 * Users can pick colors using the native color picker and paint on a grid canvas.
 */

import { app, window, vbox, hbox, label, button, separator } from '../src';

// Grid size for the canvas
const GRID_COLS = 16;
const GRID_ROWS = 12;

// Unicode block characters for drawing
const FILLED_BLOCK = '█';
const EMPTY_BLOCK = '░';

app({ title: 'Drawing App' }, () => {
  window({ title: 'Simple Paint - Color Picker Demo', width: 600, height: 500 }, (win) => {
    // Current drawing color
    let currentColor = '#000000';
    let currentColorLabel: any;
    let colorPreviewLabel: any;

    // Canvas state - 2D array of hex colors (null = empty)
    const canvas: (string | null)[][] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      canvas[r] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        canvas[r][c] = null;
      }
    }

    // Canvas display label
    let canvasLabel: any;

    // Render the canvas as a text grid
    function renderCanvas(): string {
      let output = '';
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          output += canvas[r][c] ? FILLED_BLOCK : EMPTY_BLOCK;
        }
        if (r < GRID_ROWS - 1) output += '\n';
      }
      return output;
    }

    // Update the canvas display
    function updateCanvas() {
      if (canvasLabel) {
        canvasLabel.setText(renderCanvas());
      }
    }

    // Paint at a specific position
    function paint(row: number, col: number) {
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        canvas[row][col] = currentColor;
        updateCanvas();
      }
    }

    // Erase at a specific position
    function erase(row: number, col: number) {
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        canvas[row][col] = null;
        updateCanvas();
      }
    }

    // Clear entire canvas
    function clearCanvas() {
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          canvas[r][c] = null;
        }
      }
      updateCanvas();
    }

    // Fill canvas with current color
    function fillCanvas() {
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          canvas[r][c] = currentColor;
        }
      }
      updateCanvas();
    }

    // Draw a random pattern
    function randomPattern() {
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (Math.random() > 0.5) {
            canvas[r][c] = colors[Math.floor(Math.random() * colors.length)];
          } else {
            canvas[r][c] = null;
          }
        }
      }
      updateCanvas();
    }

    win.setContent(() => {
      vbox(() => {
        label('Simple Paint - Color Picker Demo', undefined, 'center', undefined, { bold: true });
        separator();

        // Color selection area
        hbox(() => {
          label('Current Color: ');
          currentColorLabel = label(currentColor);
          colorPreviewLabel = label('  ██  ', undefined, undefined, undefined, { bold: true });

          button('Pick Color', async () => {
            const result = await win.showColorPicker('Choose Drawing Color', currentColor);
            if (result) {
              currentColor = result.hex;
              currentColorLabel.setText(currentColor);
              colorPreviewLabel.setText(`  ██  (RGB: ${result.r}, ${result.g}, ${result.b})`);
            }
          });
        });

        separator();

        // Quick color palette
        label('Quick Colors:');
        hbox(() => {
          const quickColors = [
            { name: 'Black', hex: '#000000' },
            { name: 'Red', hex: '#ff0000' },
            { name: 'Green', hex: '#00ff00' },
            { name: 'Blue', hex: '#0000ff' },
            { name: 'Yellow', hex: '#ffff00' },
            { name: 'Magenta', hex: '#ff00ff' },
            { name: 'Cyan', hex: '#00ffff' },
            { name: 'White', hex: '#ffffff' },
          ];

          for (const color of quickColors) {
            button(color.name, () => {
              currentColor = color.hex;
              currentColorLabel.setText(currentColor);
              colorPreviewLabel.setText(`  ██  `);
            });
          }
        });

        separator();

        // Canvas display (text-based grid)
        label('Canvas (text representation):');
        canvasLabel = label(renderCanvas(), undefined, 'leading', 'off', { monospace: true });

        separator();

        // Drawing tools
        label('Drawing Tools:');
        hbox(() => {
          // Paint buttons for different positions (simplified interaction)
          button('Paint Center', () => {
            paint(Math.floor(GRID_ROWS / 2), Math.floor(GRID_COLS / 2));
          });

          button('Paint Random', () => {
            const row = Math.floor(Math.random() * GRID_ROWS);
            const col = Math.floor(Math.random() * GRID_COLS);
            paint(row, col);
          });

          button('Fill All', () => {
            fillCanvas();
          });

          button('Random Pattern', () => {
            randomPattern();
          });

          button('Clear', () => {
            clearCanvas();
          });
        });

        separator();

        // Row-by-row painting
        label('Paint Row:');
        hbox(() => {
          for (let r = 0; r < Math.min(6, GRID_ROWS); r++) {
            const row = r;
            button(`Row ${r + 1}`, () => {
              for (let c = 0; c < GRID_COLS; c++) {
                canvas[row][c] = currentColor;
              }
              updateCanvas();
            });
          }
        });

        separator();

        // Instructions
        label('Instructions:', undefined, undefined, undefined, { italic: true });
        label('1. Click "Pick Color" to open the color picker dialog');
        label('2. Use quick colors or paint tools to draw on the canvas');
        label('3. The canvas shows filled (█) and empty (░) cells');
      });
    });

    win.show();
  });
});
