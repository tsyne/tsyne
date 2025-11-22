/**
 * Pixel Art Editor - Pixel-level drawing demo using canvas.Raster
 *
 * Demonstrates:
 * - canvas.Raster for pixel manipulation
 * - setPixel and setPixels for drawing
 * - Color palette selection
 */

import { app, CanvasRaster } from '../src/index';

app({ title: 'Pixel Art Editor' }, (a) => {
  const CANVAS_WIDTH = 32;
  const CANVAS_HEIGHT = 32;
  const PIXEL_SIZE = 16;

  let currentColor = { r: 0, g: 0, b: 0, a: 255 };
  let raster: CanvasRaster;

  // Color palette
  const palette = [
    { r: 0, g: 0, b: 0, a: 255 },       // Black
    { r: 255, g: 255, b: 255, a: 255 }, // White
    { r: 255, g: 0, b: 0, a: 255 },     // Red
    { r: 0, g: 255, b: 0, a: 255 },     // Green
    { r: 0, g: 0, b: 255, a: 255 },     // Blue
    { r: 255, g: 255, b: 0, a: 255 },   // Yellow
    { r: 255, g: 0, b: 255, a: 255 },   // Magenta
    { r: 0, g: 255, b: 255, a: 255 },   // Cyan
    { r: 255, g: 128, b: 0, a: 255 },   // Orange
    { r: 128, g: 0, b: 255, a: 255 },   // Purple
    { r: 128, g: 128, b: 128, a: 255 }, // Gray
    { r: 139, g: 69, b: 19, a: 255 },   // Brown
  ];

  a.window({ title: 'Pixel Art Editor', width: 700, height: 650 }, (win) => {
    win.setContent(() => {
      a.border({
        left: () => {
          a.vbox(() => {
            a.label('Color Palette', undefined, 'center', undefined, { bold: true });
            a.separator();

            // Color buttons
            palette.forEach((color, index) => {
              a.button(`Color ${index + 1}`, () => {
                currentColor = color;
                console.log(`Selected color: RGB(${color.r}, ${color.g}, ${color.b})`);
              });
            });

            a.separator();
            a.label('Tools', undefined, 'center', undefined, { bold: true });
            a.separator();
            a.button('Fill All', async () => {
              // Fill entire canvas with current color
              const updates = [];
              for (let y = 0; y < CANVAS_HEIGHT; y++) {
                for (let x = 0; x < CANVAS_WIDTH; x++) {
                  updates.push({
                    x, y,
                    r: currentColor.r,
                    g: currentColor.g,
                    b: currentColor.b,
                    a: currentColor.a
                  });
                }
              }
              await raster.setPixels(updates);
            });
            a.button('Clear', async () => {
              // Clear to white
              const updates = [];
              for (let y = 0; y < CANVAS_HEIGHT; y++) {
                for (let x = 0; x < CANVAS_WIDTH; x++) {
                  updates.push({ x, y, r: 255, g: 255, b: 255, a: 255 });
                }
              }
              await raster.setPixels(updates);
            });
            a.button('Demo Pattern', async () => {
              // Create a checkerboard pattern
              const updates = [];
              for (let y = 0; y < CANVAS_HEIGHT; y++) {
                for (let x = 0; x < CANVAS_WIDTH; x++) {
                  const isBlack = (x + y) % 2 === 0;
                  updates.push({
                    x, y,
                    r: isBlack ? 0 : 255,
                    g: isBlack ? 0 : 255,
                    b: isBlack ? 0 : 255,
                    a: 255
                  });
                }
              }
              await raster.setPixels(updates);
            });
            a.button('Gradient', async () => {
              // Create a gradient pattern
              const updates = [];
              for (let y = 0; y < CANVAS_HEIGHT; y++) {
                for (let x = 0; x < CANVAS_WIDTH; x++) {
                  const r = Math.floor((x / CANVAS_WIDTH) * 255);
                  const g = Math.floor((y / CANVAS_HEIGHT) * 255);
                  updates.push({ x, y, r, g, b: 128, a: 255 });
                }
              }
              await raster.setPixels(updates);
            });
            a.button('Smiley Face', async () => {
              // Draw a simple smiley face
              const updates = [];
              // Fill with yellow background
              for (let y = 0; y < CANVAS_HEIGHT; y++) {
                for (let x = 0; x < CANVAS_WIDTH; x++) {
                  const cx = x - CANVAS_WIDTH / 2;
                  const cy = y - CANVAS_HEIGHT / 2;
                  const dist = Math.sqrt(cx * cx + cy * cy);
                  if (dist < 14) {
                    updates.push({ x, y, r: 255, g: 255, b: 0, a: 255 }); // Yellow
                  } else {
                    updates.push({ x, y, r: 255, g: 255, b: 255, a: 255 }); // White
                  }
                }
              }
              // Eyes (black)
              [{ x: 11, y: 10 }, { x: 20, y: 10 }].forEach(pos => {
                for (let dy = 0; dy < 3; dy++) {
                  for (let dx = 0; dx < 3; dx++) {
                    updates.push({ x: pos.x + dx, y: pos.y + dy, r: 0, g: 0, b: 0, a: 255 });
                  }
                }
              });
              // Mouth (arc of black pixels)
              for (let x = 10; x < 23; x++) {
                const y = 18 + Math.floor(Math.sin((x - 10) / 12 * Math.PI) * 4);
                updates.push({ x, y, r: 0, g: 0, b: 0, a: 255 });
              }
              await raster.setPixels(updates);
            });
          });
        },
        center: () => {
          // Main canvas area
          a.center(() => {
            a.vbox(() => {
              a.label('Pixel Art Canvas (32x32)', undefined, 'center', undefined, { bold: true });
              // Create the raster canvas
              raster = a.canvasRaster(CANVAS_WIDTH * PIXEL_SIZE, CANVAS_HEIGHT * PIXEL_SIZE);
              a.label('Click buttons on the left to manipulate pixels');
            });
          });
        },
        bottom: () => {
          a.label('Pixel Art Editor - Use the palette and tools to create pixel art');
        }
      });
    });
    win.show();
  });
});
