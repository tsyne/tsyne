/**
 * Test for Drawing App example
 *
 * Tests the color picker dialog integration and drawing functionality.
 */

import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

// Grid configuration (must match drawing-app.ts)
const GRID_COLS = 16;
const GRID_ROWS = 12;
const FILLED_BLOCK = '█';
const EMPTY_BLOCK = '░';

describe('Drawing App Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial empty canvas', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Drawing App Test', width: 600, height: 500 }, (win) => {
        let currentColor = '#000000';
        let currentColorLabel: any;
        let canvasLabel: any;

        const canvas: (string | null)[][] = [];
        for (let r = 0; r < GRID_ROWS; r++) {
          canvas[r] = [];
          for (let c = 0; c < GRID_COLS; c++) {
            canvas[r][c] = null;
          }
        }

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

        win.setContent(() => {
          app.vbox(() => {
            app.label('Simple Paint - Color Picker Demo');
            currentColorLabel = app.label(currentColor);
            canvasLabel = app.label(renderCanvas());

            app.button('Pick Color', async () => {
              const result = await win.showColorPicker('Choose Color', currentColor);
              if (result) {
                currentColor = result.hex;
                currentColorLabel.setText(currentColor);
              }
            });

            app.button('Clear', () => {
              for (let r = 0; r < GRID_ROWS; r++) {
                for (let c = 0; c < GRID_COLS; c++) {
                  canvas[r][c] = null;
                }
              }
              canvasLabel.setText(renderCanvas());
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify initial state
    await ctx.expect(ctx.getByText('Simple Paint')).toBeVisible();
    await ctx.expect(ctx.getByExactText('#000000')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Pick Color')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Clear')).toBeVisible();

    // Canvas should be visible (contains empty blocks)
    await ctx.expect(ctx.getByText(EMPTY_BLOCK)).toBeVisible();

    // Capture screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'drawing-app.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should fill canvas and clear it', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Drawing App Test', width: 600, height: 500 }, (win) => {
        let canvasLabel: any;

        const canvas: (string | null)[][] = [];
        for (let r = 0; r < GRID_ROWS; r++) {
          canvas[r] = [];
          for (let c = 0; c < GRID_COLS; c++) {
            canvas[r][c] = null;
          }
        }

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

        win.setContent(() => {
          app.vbox(() => {
            app.label('Canvas Test');
            canvasLabel = app.label(renderCanvas());

            app.button('Fill All', () => {
              for (let r = 0; r < GRID_ROWS; r++) {
                for (let c = 0; c < GRID_COLS; c++) {
                  canvas[r][c] = '#000000';
                }
              }
              canvasLabel.setText(renderCanvas());
            });

            app.button('Clear', () => {
              for (let r = 0; r < GRID_ROWS; r++) {
                for (let c = 0; c < GRID_COLS; c++) {
                  canvas[r][c] = null;
                }
              }
              canvasLabel.setText(renderCanvas());
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial state - empty canvas (all empty blocks)
    await ctx.expect(ctx.getByText(EMPTY_BLOCK)).toBeVisible();

    // Fill the canvas
    await ctx.getByExactText('Fill All').click();
    await ctx.wait(100);

    // Now canvas should show filled blocks
    await ctx.expect(ctx.getByText(FILLED_BLOCK)).toBeVisible();

    // Clear the canvas
    await ctx.getByExactText('Clear').click();
    await ctx.wait(100);

    // Canvas should be empty again
    await ctx.expect(ctx.getByText(EMPTY_BLOCK)).toBeVisible();
  });

  test('should use quick color buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Quick Colors Test', width: 600, height: 400 }, (win) => {
        let currentColor = '#000000';
        let colorLabel: any;

        win.setContent(() => {
          app.vbox(() => {
            app.label('Quick Colors Test');
            colorLabel = app.label(currentColor);

            app.hbox(() => {
              app.button('Red', () => {
                currentColor = '#ff0000';
                colorLabel.setText(currentColor);
              });

              app.button('Green', () => {
                currentColor = '#00ff00';
                colorLabel.setText(currentColor);
              });

              app.button('Blue', () => {
                currentColor = '#0000ff';
                colorLabel.setText(currentColor);
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial color should be black
    await ctx.expect(ctx.getByExactText('#000000')).toBeVisible();

    // Click Red
    await ctx.getByExactText('Red').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('#ff0000')).toBeVisible();

    // Click Green
    await ctx.getByExactText('Green').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('#00ff00')).toBeVisible();

    // Click Blue
    await ctx.getByExactText('Blue').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('#0000ff')).toBeVisible();
  });

  test('should paint center position', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Paint Test', width: 600, height: 500 }, (win) => {
        let canvasLabel: any;
        let paintedCount = 0;
        let paintedLabel: any;

        const canvas: (string | null)[][] = [];
        for (let r = 0; r < GRID_ROWS; r++) {
          canvas[r] = [];
          for (let c = 0; c < GRID_COLS; c++) {
            canvas[r][c] = null;
          }
        }

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

        function countPainted(): number {
          let count = 0;
          for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
              if (canvas[r][c]) count++;
            }
          }
          return count;
        }

        win.setContent(() => {
          app.vbox(() => {
            app.label('Paint Test');
            paintedLabel = app.label('Painted: 0');
            canvasLabel = app.label(renderCanvas());

            app.button('Paint Center', () => {
              const centerRow = Math.floor(GRID_ROWS / 2);
              const centerCol = Math.floor(GRID_COLS / 2);
              canvas[centerRow][centerCol] = '#000000';
              paintedCount = countPainted();
              paintedLabel.setText(`Painted: ${paintedCount}`);
              canvasLabel.setText(renderCanvas());
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial state
    await ctx.expect(ctx.getByExactText('Painted: 0')).toBeVisible();

    // Paint center
    await ctx.getByExactText('Paint Center').click();
    await ctx.wait(100);

    // Should have 1 painted cell
    await ctx.expect(ctx.getByExactText('Painted: 1')).toBeVisible();

    // Canvas should show at least one filled block
    await ctx.expect(ctx.getByText(FILLED_BLOCK)).toBeVisible();
  });
});
