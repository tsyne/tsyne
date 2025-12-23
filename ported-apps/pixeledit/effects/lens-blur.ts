/** Lens blur with hexagonal bokeh */
export function lensBlur(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  brightness: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const kernel: Array<{ dx: number; dy: number }> = [];

  // Create hexagonal kernel
  for (let angle = 0; angle < 360; angle += 60) {
    for (let r = 1; r <= radius; r++) {
      const rad = (angle * Math.PI) / 180;
      kernel.push({
        dx: Math.round(r * Math.cos(rad)),
        dy: Math.round(r * Math.sin(rad))
      });
    }
  }

  const boostFactor = 1 + brightness / 100;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;

      for (const k of kernel) {
        const px = Math.min(width - 1, Math.max(0, x + k.dx));
        const py = Math.min(height - 1, Math.max(0, y + k.dy));
        const idx = (py * width + px) * 4;

        // Boost bright pixels (bokeh effect)
        const lum = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
        const boost = lum > 200 ? boostFactor : 1;

        r += pixels[idx] * boost;
        g += pixels[idx + 1] * boost;
        b += pixels[idx + 2] * boost;
        count++;
      }

      const outIdx = (y * width + x) * 4;
      output[outIdx] = Math.min(255, r / count);
      output[outIdx + 1] = Math.min(255, g / count);
      output[outIdx + 2] = Math.min(255, b / count);
      output[outIdx + 3] = pixels[outIdx + 3];
    }
  }
  return output;
}
