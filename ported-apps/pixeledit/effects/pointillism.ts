/** Pointillism effect with random dots */
export function pointillism(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  dotSize: number,
  density: number
): Uint8ClampedArray {
  // Start with white background
  const output = new Uint8ClampedArray(pixels.length);
  for (let i = 0; i < output.length; i += 4) {
    output[i] = 255;
    output[i + 1] = 255;
    output[i + 2] = 255;
    output[i + 3] = 255;
  }

  // Draw random dots
  const numDots = Math.floor((width * height * density) / 100);

  for (let d = 0; d < numDots; d++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const srcIdx = (y * width + x) * 4;

    const r = pixels[srcIdx];
    const g = pixels[srcIdx + 1];
    const b = pixels[srcIdx + 2];

    // Draw a dot
    const radius = Math.floor(dotSize / 2);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < width && py >= 0 && py < height) {
            const dstIdx = (py * width + px) * 4;
            output[dstIdx] = r;
            output[dstIdx + 1] = g;
            output[dstIdx + 2] = b;
          }
        }
      }
    }
  }

  return output;
}
