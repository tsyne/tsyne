/** Zoom blur - radial blur simulating camera zoom */
export function zoomBlur(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number,
  centerX?: number,
  centerY?: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const cx = centerX ?? width / 2;
  const cy = centerY ?? height / 2;
  const samples = Math.max(1, Math.floor(amount / 5));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;

      let r = 0, g = 0, b = 0, a = 0;

      for (let s = 0; s < samples; s++) {
        const t = s / samples;
        const scale = 1 + t * amount / 100;

        const sx = Math.round(cx + dx * scale);
        const sy = Math.round(cy + dy * scale);

        const px = Math.max(0, Math.min(width - 1, sx));
        const py = Math.max(0, Math.min(height - 1, sy));
        const idx = (py * width + px) * 4;

        r += pixels[idx];
        g += pixels[idx + 1];
        b += pixels[idx + 2];
        a += pixels[idx + 3];
      }

      const outIdx = (y * width + x) * 4;
      output[outIdx] = r / samples;
      output[outIdx + 1] = g / samples;
      output[outIdx + 2] = b / samples;
      output[outIdx + 3] = a / samples;
    }
  }

  return output;
}
