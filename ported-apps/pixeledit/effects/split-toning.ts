/** Split toning - different tints for shadows and highlights */
export function splitToning(
  pixels: Uint8ClampedArray,
  shadowR: number,
  shadowG: number,
  shadowB: number,
  highlightR: number,
  highlightG: number,
  highlightB: number,
  balance: number
): void {
  const threshold = 128 + balance;

  for (let i = 0; i < pixels.length; i += 4) {
    const gray = 0.2989 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    const shadowAmt = Math.max(0, (threshold - gray) / threshold);
    const highlightAmt = Math.max(0, (gray - threshold) / (255 - threshold));

    pixels[i] = Math.max(0, Math.min(255, pixels[i] + (shadowR - 128) * shadowAmt * 0.5 + (highlightR - 128) * highlightAmt * 0.5));
    pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + (shadowG - 128) * shadowAmt * 0.5 + (highlightG - 128) * highlightAmt * 0.5));
    pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + (shadowB - 128) * shadowAmt * 0.5 + (highlightB - 128) * highlightAmt * 0.5));
  }
}
