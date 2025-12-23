/** Frosted glass effect (random pixel displacement) */
export function frostedGlass(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offsetX = Math.round((Math.random() - 0.5) * amount);
      const offsetY = Math.round((Math.random() - 0.5) * amount);

      const srcX = Math.min(width - 1, Math.max(0, x + offsetX));
      const srcY = Math.min(height - 1, Math.max(0, y + offsetY));

      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * width + x) * 4;

      output[dstIdx] = pixels[srcIdx];
      output[dstIdx + 1] = pixels[srcIdx + 1];
      output[dstIdx + 2] = pixels[srcIdx + 2];
      output[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }
  return output;
}
