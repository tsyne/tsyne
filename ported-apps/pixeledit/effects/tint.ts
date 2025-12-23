/** Apply color tint */
export function tint(
  pixels: Uint8ClampedArray,
  r: number,
  g: number,
  b: number,
  strength: number
): void {
  const factor = strength / 100;
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = Math.min(255, pixels[i] + (r - pixels[i]) * factor);
    pixels[i + 1] = Math.min(255, pixels[i + 1] + (g - pixels[i + 1]) * factor);
    pixels[i + 2] = Math.min(255, pixels[i + 2] + (b - pixels[i + 2]) * factor);
  }
}
