/** Color splash - keep target color, desaturate rest */
export function colorSplash(
  pixels: Uint8ClampedArray,
  targetR: number,
  targetG: number,
  targetB: number,
  tolerance: number
): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const dist = Math.sqrt((r - targetR) ** 2 + (g - targetG) ** 2 + (b - targetB) ** 2);
    if (dist > tolerance) {
      const gray = Math.round(0.2989 * r + 0.587 * g + 0.114 * b);
      pixels[i] = gray;
      pixels[i + 1] = gray;
      pixels[i + 2] = gray;
    }
  }
}
