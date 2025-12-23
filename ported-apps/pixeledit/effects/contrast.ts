/** Adjust contrast using standard contrast formula */
export function contrast(pixels: Uint8ClampedArray, amount: number): void {
  const factor = (259 * (amount + 255)) / (255 * (259 - amount));
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = Math.max(0, Math.min(255, factor * (pixels[i] - 128) + 128));
    pixels[i + 1] = Math.max(0, Math.min(255, factor * (pixels[i + 1] - 128) + 128));
    pixels[i + 2] = Math.max(0, Math.min(255, factor * (pixels[i + 2] - 128) + 128));
  }
}
