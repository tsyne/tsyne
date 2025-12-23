/** Rotate hue by degrees */
export function hueRotate(pixels: Uint8ClampedArray, degrees: number): void {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    pixels[i] = Math.max(0, Math.min(255,
      r * (0.213 + cos * 0.787 - sin * 0.213) +
      g * (0.715 - cos * 0.715 - sin * 0.715) +
      b * (0.072 - cos * 0.072 + sin * 0.928)));
    pixels[i + 1] = Math.max(0, Math.min(255,
      r * (0.213 - cos * 0.213 + sin * 0.143) +
      g * (0.715 + cos * 0.285 + sin * 0.140) +
      b * (0.072 - cos * 0.072 - sin * 0.283)));
    pixels[i + 2] = Math.max(0, Math.min(255,
      r * (0.213 - cos * 0.213 - sin * 0.787) +
      g * (0.715 - cos * 0.715 + sin * 0.715) +
      b * (0.072 + cos * 0.928 + sin * 0.072)));
  }
}
