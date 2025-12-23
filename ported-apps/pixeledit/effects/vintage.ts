/** Vintage/retro photo effect */
export function vintage(pixels: Uint8ClampedArray): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    // Sepia-ish transform with contrast reduction
    pixels[i] = Math.min(255, r * 0.9 + 30);
    pixels[i + 1] = Math.min(255, g * 0.7 + 20);
    pixels[i + 2] = Math.min(255, b * 0.5 + 10);
  }
}
