/** Spin blur - rotational motion blur around center */
export function spinBlur(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  angle: number,
  centerX?: number,
  centerY?: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const cx = centerX ?? width / 2;
  const cy = centerY ?? height / 2;
  const samples = Math.max(3, Math.floor(Math.abs(angle) / 5));
  const angleRad = angle * Math.PI / 180;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const baseAngle = Math.atan2(dy, dx);

      let r = 0, g = 0, b = 0, a = 0;

      for (let s = 0; s < samples; s++) {
        const t = (s / (samples - 1)) - 0.5; // -0.5 to 0.5
        const sampleAngle = baseAngle + t * angleRad;

        const sx = Math.round(cx + dist * Math.cos(sampleAngle));
        const sy = Math.round(cy + dist * Math.sin(sampleAngle));

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
