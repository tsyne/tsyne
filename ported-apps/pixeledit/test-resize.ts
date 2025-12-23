/**
 * Test canvas resize functionality
 */
import { app, resolveTransport  } from '../../core/src';

app(resolveTransport(), { title: 'Canvas Resize Test' }, async (a) => {
  await a.window({ title: 'Test', width: 400, height: 400 }, async (win) => {
    let canvas: any;

    await win.setContent(async () => {
      await a.center(async () => {
        // Create a 10x10 red canvas
        console.error('Creating 10x10 canvas...');
        const pixelData: Array<[number, number, number, number]> = [];
        for (let i = 0; i < 100; i++) {
          pixelData.push([255, 0, 0, 255]); // Red
        }
        canvas = await a.canvasRaster(10, 10, pixelData);
        console.error(`Canvas created: ${canvas.width}x${canvas.height}`);
      });
    });

    await win.show();

    // Wait a bit, then resize
    console.error('Waiting 1 second before resize...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.error('Resizing canvas to 20x20...');
    const newPixelData: Array<[number, number, number, number]> = [];
    for (let i = 0; i < 400; i++) {
      newPixelData.push([0, 255, 0, 255]); // Green
    }

    await canvas.resize(20, 20, newPixelData);
    console.error(`Canvas resized: ${canvas.width}x${canvas.height}`);
    console.error('SUCCESS: Canvas resize completed without errors');

    // Wait a bit to see the result
    await new Promise(resolve => setTimeout(resolve, 2000));
    process.exit(0);
  });
});
