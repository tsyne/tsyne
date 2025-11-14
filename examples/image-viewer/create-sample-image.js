// Create a sample test image using Jimp
const { Jimp } = require('jimp');

async function createSampleImage() {
  // Create a 800x600 image
  const image = new Jimp({ width: 800, height: 600, color: 0xFFFFFFFF }); // White background

  // Draw some colored rectangles
  // Red rectangle (top-left)
  for (let y = 50; y < 250; y++) {
    for (let x = 50; x < 250; x++) {
      image.setPixelColor(0xFF0000FF, x, y); // Red
    }
  }

  // Green rectangle (top-right)
  for (let y = 50; y < 250; y++) {
    for (let x = 550; x < 750; x++) {
      image.setPixelColor(0x00FF00FF, x, y); // Green
    }
  }

  // Blue rectangle (bottom-left)
  for (let y = 350; y < 550; y++) {
    for (let x = 50; x < 250; x++) {
      image.setPixelColor(0x0000FFFF, x, y); // Blue
    }
  }

  // Yellow rectangle (bottom-right)
  for (let y = 350; y < 550; y++) {
    for (let x = 550; x < 750; x++) {
      image.setPixelColor(0xFFFF00FF, x, y); // Yellow
    }
  }

  // Purple rectangle (center)
  for (let y = 250; y < 350; y++) {
    for (let x = 300; x < 500; x++) {
      image.setPixelColor(0xFF00FFFF, x, y); // Purple
    }
  }

  // Save the image
  await image.write('./examples/image-viewer/sample-image.png');
  console.log('Sample image created: examples/image-viewer/sample-image.png');
}

createSampleImage().catch(console.error);
