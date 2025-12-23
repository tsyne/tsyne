/** Circular screen effect - concentric circle pattern */
export function circularScreen(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  ringWidth: number
): void {
  const centerX = width / 2;
  const centerY = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Position within ring period
      const ringPos = dist % ringWidth;

      const idx = (y * width + x) * 4;
      const lum = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
      const threshold = (lum / 255) * ringWidth;

      if (ringPos < threshold) {
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
