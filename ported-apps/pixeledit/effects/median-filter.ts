/** Median filter for noise reduction */
export function medianFilter(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rValues: number[] = [];
      const gValues: number[] = [];
      const bValues: number[] = [];

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const idx = (py * width + px) * 4;
          rValues.push(pixels[idx]);
          gValues.push(pixels[idx + 1]);
          bValues.push(pixels[idx + 2]);
        }
      }

      rValues.sort((a, b) => a - b);
      gValues.sort((a, b) => a - b);
      bValues.sort((a, b) => a - b);

      const mid = Math.floor(rValues.length / 2);
      const outIdx = (y * width + x) * 4;
      output[outIdx] = rValues[mid];
      output[outIdx + 1] = gValues[mid];
      output[outIdx + 2] = bValues[mid];
      output[outIdx + 3] = pixels[outIdx + 3];
    }
  }
  return output;
}
