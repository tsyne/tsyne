/** Light leak effect - colored light bleeding from edges */
export function lightLeak(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  intensity: number,
  color: { r: number; g: number; b: number } = { r: 255, g: 180, b: 100 }
): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
  const factor = intensity / 100;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Leak comes from top-right corner
      const dx = x - width;
      const dy = y;
      const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
      const leak = Math.max(0, 1 - dist) * factor;

      const idx = (y * width + x) * 4;
      pixels[idx] = Math.min(255, pixels[idx] + color.r * leak);
      pixels[idx + 1] = Math.min(255, pixels[idx + 1] + color.g * leak);
      pixels[idx + 2] = Math.min(255, pixels[idx + 2] + color.b * leak);
    }
  }
}
