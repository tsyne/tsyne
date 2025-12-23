/** Adjust exposure in stops */
export function exposure(pixels: Uint8ClampedArray, stops: number): void {
  const factor = Math.pow(2, stops);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = Math.max(0, Math.min(255, pixels[i] * factor));
    pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] * factor));
    pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] * factor));
  }
}
