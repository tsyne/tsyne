// Create a sample test image using Jimp
const { Jimp } = require('jimp');

async function createSampleImage() {
  // Create a 1920x1080 image (matching test expectations)
  const image = new Jimp({ width: 1920, height: 1080, color: 0xFFFFFFFF }); // White background

  // Draw some colored rectangles
  // Red rectangle (top-left)
  for (let y = 100; y < 450; y++) {
    for (let x = 100; x < 600; x++) {
      image.setPixelColor(0xFF0000FF, x, y); // Red
    }
  }

  // Green rectangle (top-right)
  for (let y = 100; y < 450; y++) {
    for (let x = 1320; x < 1820; x++) {
      image.setPixelColor(0x00FF00FF, x, y); // Green
    }
  }

  // Blue rectangle (bottom-left)
  for (let y = 630; y < 980; y++) {
    for (let x = 100; x < 600; x++) {
      image.setPixelColor(0x0000FFFF, x, y); // Blue
    }
  }

  // Yellow rectangle (bottom-right)
  for (let y = 630; y < 980; y++) {
    for (let x = 1320; x < 1820; x++) {
      image.setPixelColor(0xFFFF00FF, x, y); // Yellow
    }
  }

  // Purple rectangle (center)
  for (let y = 450; y < 630; y++) {
    for (let x = 760; x < 1160; x++) {
      image.setPixelColor(0xFF00FFFF, x, y); // Purple
    }
  }

  // Save the image
  await image.write('./examples/image-viewer/sample-image.png');
  console.log('Sample image created: examples/image-viewer/sample-image.png');
}

createSampleImage().catch(console.error);
