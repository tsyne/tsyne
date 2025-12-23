/** Adjust brightness by adding amount to each RGB channel */
export function brightness(pixels: Uint8ClampedArray, amount: number): void {
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = Math.max(0, Math.min(255, pixels[i] + amount));
    pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + amount));
    pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + amount));
  }
}
