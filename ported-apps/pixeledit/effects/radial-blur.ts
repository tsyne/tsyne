/** Radial blur (zoom blur from center) */
export function radialBlur(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const centerX = width / 2;
  const centerY = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const samples = Math.max(1, Math.floor(dist * strength / 100));

      let r = 0, g = 0, b = 0, a = 0;

      for (let s = 0; s < samples; s++) {
        const t = s / samples;
        const sx = Math.round(centerX + dx * (1 - t * strength / 100));
        const sy = Math.round(centerY + dy * (1 - t * strength / 100));

        if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
          const idx = (sy * width + sx) * 4;
          r += pixels[idx];
          g += pixels[idx + 1];
          b += pixels[idx + 2];
          a += pixels[idx + 3];
        }
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
