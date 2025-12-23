/** Cross-processing effect */
export function crossProcess(pixels: Uint8ClampedArray): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    pixels[i] = Math.min(255, r * 1.2);
    pixels[i + 1] = Math.min(255, g * 0.9);
    pixels[i + 2] = Math.min(255, b * 1.1 + 20);
  }
}
