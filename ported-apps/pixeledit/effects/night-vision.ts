/** Night vision (green phosphor) effect */
export function nightVision(pixels: Uint8ClampedArray): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    pixels[i] = 0;
    pixels[i + 1] = Math.min(255, gray * 1.5);
    pixels[i + 2] = 0;
  }
}
