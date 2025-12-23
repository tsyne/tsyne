/** Subtle sharpening - gentle enhancement for portraits */
export function sharpenSubtle(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const factor = amount / 200; // Half strength

  // Gentle 5x5 kernel for subtle sharpening
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let count = 0;

        // Sample in a + pattern for softer effect
        const offsets = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0], [0, -2], [0, 2]];
        for (const [dx, dy] of offsets) {
          const px = Math.max(0, Math.min(width - 1, x + dx));
          const py = Math.max(0, Math.min(height - 1, y + dy));
          const pidx = (py * width + px) * 4;
          sum += pixels[pidx + c];
          count++;
        }

        const avg = sum / count;
        const diff = pixels[idx + c] - avg;
        output[idx + c] = Math.max(0, Math.min(255, pixels[idx + c] + diff * factor));
      }
      output[idx + 3] = pixels[idx + 3];
    }
  }

  return output;
}
