/** Adjust color saturation */
export function saturation(pixels: Uint8ClampedArray, amount: number): void {
  const factor = 1 + amount / 100;
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = 0.2989 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    pixels[i] = Math.max(0, Math.min(255, gray + factor * (pixels[i] - gray)));
    pixels[i + 1] = Math.max(0, Math.min(255, gray + factor * (pixels[i + 1] - gray)));
    pixels[i + 2] = Math.max(0, Math.min(255, gray + factor * (pixels[i + 2] - gray)));
  }
}
