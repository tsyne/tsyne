/** Add random noise to image */
export function noise(pixels: Uint8ClampedArray, amount: number): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const n = (Math.random() - 0.5) * amount * 2;
    pixels[i] = Math.max(0, Math.min(255, pixels[i] + n));
    pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + n));
    pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + n));
  }
}
