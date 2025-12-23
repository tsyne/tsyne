/** Aggressive sharpening - strong enhancement for landscapes/architecture */
export function sharpenAggressive(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const factor = 1 + amount / 50;

  // Strong 3x3 kernel
  const kernel = [-1, -1, -1, -1, 9, -1, -1, -1, -1];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = Math.max(0, Math.min(width - 1, x + kx));
            const py = Math.max(0, Math.min(height - 1, y + ky));
            const pidx = (py * width + px) * 4;
            sum += pixels[pidx + c] * kernel[ki++];
          }
        }

        // Blend between original and sharpened
        const sharpened = Math.max(0, Math.min(255, sum));
        output[idx + c] = Math.max(0, Math.min(255,
          pixels[idx + c] + (sharpened - pixels[idx + c]) * (factor - 1)
        ));
      }
      output[idx + 3] = pixels[idx + 3];
    }
  }

  return output;
}
