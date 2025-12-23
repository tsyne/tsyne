/** Adjust color balance per channel */
export function colorBalance(
  pixels: Uint8ClampedArray,
  redCyan: number,
  greenMagenta: number,
  blueYellow: number
): void {
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = Math.max(0, Math.min(255, pixels[i] + redCyan));
    pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + greenMagenta));
    pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + blueYellow));
  }
}
