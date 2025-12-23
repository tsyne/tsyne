/** Adjust vibrance (smart saturation) */
export function vibrance(pixels: Uint8ClampedArray, amount: number): void {
  const factor = amount / 100;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const max = Math.max(r, g, b);
    const avg = (r + g + b) / 3;
    const sat = max !== 0 ? 1 - (avg / max) : 0;
    const adjustment = 1 + factor * (1 - sat);
    pixels[i] = Math.max(0, Math.min(255, avg + (r - avg) * adjustment));
    pixels[i + 1] = Math.max(0, Math.min(255, avg + (g - avg) * adjustment));
    pixels[i + 2] = Math.max(0, Math.min(255, avg + (b - avg) * adjustment));
  }
}
