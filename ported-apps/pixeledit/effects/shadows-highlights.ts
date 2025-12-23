/** Adjust shadows and highlights separately */
export function shadowsHighlights(
  pixels: Uint8ClampedArray,
  shadows: number,
  highlights: number
): void {
  const shadowFactor = 1 + shadows / 100;
  const highlightFactor = 1 - highlights / 100;

  for (let i = 0; i < pixels.length; i += 4) {
    const gray = 0.2989 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];

    let factor: number;
    if (gray < 128) {
      // Shadow region
      factor = shadowFactor + (1 - shadowFactor) * (gray / 128);
    } else {
      // Highlight region
      factor = 1 + (highlightFactor - 1) * ((gray - 128) / 127);
    }

    pixels[i] = Math.max(0, Math.min(255, pixels[i] * factor));
    pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] * factor));
    pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] * factor));
  }
}
