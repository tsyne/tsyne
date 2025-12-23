/** Halftone dot pattern effect */
export function halftone(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  dotSize: number
): void {
  for (let y = 0; y < height; y += dotSize) {
    for (let x = 0; x < width; x += dotSize) {
      let sum = 0, count = 0;
      // Calculate average brightness in block
      for (let dy = 0; dy < dotSize && y + dy < height; dy++) {
        for (let dx = 0; dx < dotSize && x + dx < width; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          sum += 0.2989 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
          count++;
        }
      }
      const avgBrightness = sum / count;
      const radius = (1 - avgBrightness / 255) * (dotSize / 2);

      // Draw dot
      const centerX = x + dotSize / 2;
      const centerY = y + dotSize / 2;
      for (let dy = 0; dy < dotSize && y + dy < height; dy++) {
        for (let dx = 0; dx < dotSize && x + dx < width; dx++) {
          const px = x + dx;
          const py = y + dy;
          const dist = Math.sqrt((px - centerX) ** 2 + (py - centerY) ** 2);
          const idx = (py * width + px) * 4;
          if (dist <= radius) {
            pixels[idx] = 0;
            pixels[idx + 1] = 0;
            pixels[idx + 2] = 0;
          } else {
            pixels[idx] = 255;
            pixels[idx + 1] = 255;
            pixels[idx + 2] = 255;
          }
        }
      }
    }
  }
}
