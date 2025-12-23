/** Emboss effect */
export function emboss(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixels.length);
  const kernel = [-2, -1, 0, -1, 1, 1, 0, 1, 2];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = Math.max(0, Math.min(width - 1, x + kx));
            const py = Math.max(0, Math.min(height - 1, y + ky));
            const ki = (ky + 1) * 3 + (kx + 1);
            sum += pixels[(py * width + px) * 4 + c] * kernel[ki];
          }
        }
        result[i + c] = Math.max(0, Math.min(255, sum + 128));
      }
      result[i + 3] = pixels[i + 3];
    }
  }
  return result;
}
