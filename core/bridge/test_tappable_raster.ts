import { App, resolveTransport } from '../src/app';
import { TappableCanvasRaster } from '../src/widgets/canvas';

const app = new App(resolveTransport(), { title: 'Tappable Raster Test' });
const win = app.createWindow('Tappable Raster Test', 400, 400);

win.setContent(async (ctx) => {
  // Create a simple 10x10 raster with a checkerboard pattern
  const width = 10;
  const height = 10;
  const pixels: Array<[number, number, number, number]> = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isBlack = (x + y) % 2 === 0;
      if (isBlack) {
        pixels.push([0, 0, 0, 255]); // Black
      } else {
        pixels.push([255, 255, 255, 255]); // White
      }
    }
  }

  // Create the tappable raster with a tap handler that logs clicks
  const raster = new TappableCanvasRaster(ctx, width, height, pixels, (x: number, y: number) => {
    console.log(`[TEST] Canvas tapped at pixel coordinates: (${x}, ${y})`);
  });

  console.log('[TEST] Tappable raster created. Click on the canvas to test tap events.');
  console.log('[TEST] The checkerboard is 10x10 pixels. Each click should log coordinates 0-9.');
});

app.run();
