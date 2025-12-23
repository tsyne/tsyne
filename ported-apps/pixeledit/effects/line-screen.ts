/** Line screen effect - parallel line pattern */
export function lineScreen(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  lineWidth: number,
  angle: number = 0
): void {
  const cos = Math.cos(angle * Math.PI / 180);
  const sin = Math.sin(angle * Math.PI / 180);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Rotate coordinates
      const ry = x * sin + y * cos;

      // Position within line period
      const linePos = ((ry % lineWidth) + lineWidth) % lineWidth;

      const idx = (y * width + x) * 4;
      const lum = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
      const threshold = (lum / 255) * lineWidth;

      if (linePos < threshold) {
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
