/** Convert to binary black/white based on luminance threshold */
export function threshold(pixels: Uint8ClampedArray, thresholdValue: number): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    const value = gray >= thresholdValue ? 255 : 0;
    pixels[i] = value;
    pixels[i + 1] = value;
    pixels[i + 2] = value;
  }
}
