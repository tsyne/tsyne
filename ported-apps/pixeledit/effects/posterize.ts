/** Reduce color levels (posterization) */
export function posterize(pixels: Uint8ClampedArray, levels: number): void {
  const factor = 255 / (levels - 1);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = Math.round(Math.round(pixels[i] / factor) * factor);
    pixels[i + 1] = Math.round(Math.round(pixels[i + 1] / factor) * factor);
    pixels[i + 2] = Math.round(Math.round(pixels[i + 2] / factor) * factor);
  }
}
