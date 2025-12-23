/** Reduce image to N colors */
export function colorQuantize(pixels: Uint8ClampedArray, numColors: number): void {
  // Simple quantization by rounding to fewer levels per channel
  const levels = Math.max(2, Math.ceil(Math.pow(numColors, 1 / 3)));
  const step = 255 / (levels - 1);

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = Math.round(Math.round(pixels[i] / step) * step);
    pixels[i + 1] = Math.round(Math.round(pixels[i + 1] / step) * step);
    pixels[i + 2] = Math.round(Math.round(pixels[i + 2] / step) * step);
  }
}
