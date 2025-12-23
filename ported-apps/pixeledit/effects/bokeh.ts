/** Bokeh effect - circular blur with bright spot enhancement */
export function bokeh(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  threshold: number = 200
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
      let r = 0, g = 0, b = 0, weight = 0;

      for (const k of kernel) {
        const px = Math.min(width - 1, Math.max(0, x + k.dx));
        const py = Math.min(height - 1, Math.max(0, y + k.dy));
        const idx = (py * width + px) * 4;

        // Weight bright pixels more (bokeh effect)
        const lum = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
        const w = lum > threshold ? 2 : 1;

        r += pixels[idx] * w;
        g += pixels[idx + 1] * w;
        b += pixels[idx + 2] * w;
        weight += w;
      }

      const outIdx = (y * width + x) * 4;
      output[outIdx] = Math.min(255, r / weight);
      output[outIdx + 1] = Math.min(255, g / weight);
      output[outIdx + 2] = Math.min(255, b / weight);
      output[outIdx + 3] = pixels[outIdx + 3];
    }
  }
  return output;
}
