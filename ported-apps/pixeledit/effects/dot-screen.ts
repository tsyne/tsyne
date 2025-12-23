/** Dot screen effect - regular dot pattern */
export function dotScreen(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  dotSize: number,
  angle: number = 0
): void {
  const cos = Math.cos(angle * Math.PI / 180);
  const sin = Math.sin(angle * Math.PI / 180);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Rotate coordinates
      const rx = x * cos - y * sin;
      const ry = x * sin + y * cos;

      // Calculate position in dot grid
      const dotX = ((rx % dotSize) + dotSize) % dotSize;
      const dotY = ((ry % dotSize) + dotSize) % dotSize;
      const centerDist = Math.sqrt(
        (dotX - dotSize / 2) ** 2 + (dotY - dotSize / 2) ** 2
      );

      const idx = (y * width + x) * 4;
      const lum = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
      const dotRadius = (lum / 255) * (dotSize / 2);

      if (centerDist < dotRadius) {
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
