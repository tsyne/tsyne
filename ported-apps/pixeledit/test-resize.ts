/**
 * Test canvas resize functionality
 */
import { app } from '../../src';

app({ title: 'Canvas Resize Test' }, async (a) => {
  await a.window({ title: 'Test', width: 400, height: 400 }, async (win) => {
    let canvas: any;

    await win.setContent(async () => {
      await a.center(async () => {
        // Create a 10x10 red canvas
        console.log('Creating 10x10 canvas...');
        const pixelData: Array<[number, number, number, number]> = [];
        for (let i = 0; i < 100; i++) {
          pixelData.push([255, 0, 0, 255]); // Red
        }
        canvas = await a.canvasRaster(10, 10, pixelData);
        console.log(`Canvas created: ${canvas.width}x${canvas.height}`);
      });
    });

    await win.show();

    // Wait a bit, then resize
    console.log('Waiting 1 second before resize...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Resizing canvas to 20x20...');
    const newPixelData: Array<[number, number, number, number]> = [];
    for (let i = 0; i < 400; i++) {
      newPixelData.push([0, 255, 0, 255]); // Green
    }

    await canvas.resize(20, 20, newPixelData);
    console.log(`Canvas resized: ${canvas.width}x${canvas.height}`);
    console.log('SUCCESS: Canvas resize completed without errors');

    // Wait a bit to see the result
    await new Promise(resolve => setTimeout(resolve, 2000));
    process.exit(0);
  });
});
