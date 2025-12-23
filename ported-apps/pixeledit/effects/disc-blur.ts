/** Disc blur - circular averaging blur (like camera lens) */
export function discBlur(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);

  // Create circular kernel
  const kernel: Array<{ dx: number; dy: number }> = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        kernel.push({ dx, dy });
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (const k of kernel) {
        const px = Math.max(0, Math.min(width - 1, x + k.dx));
        const py = Math.max(0, Math.min(height - 1, y + k.dy));
        const idx = (py * width + px) * 4;
        r += pixels[idx];
        g += pixels[idx + 1];
        b += pixels[idx + 2];
        a += pixels[idx + 3];
      }

      const outIdx = (y * width + x) * 4;
      output[outIdx] = r / kernel.length;
      output[outIdx + 1] = g / kernel.length;
      output[outIdx + 2] = b / kernel.length;
      output[outIdx + 3] = a / kernel.length;
    }
  }

  return output;
}
