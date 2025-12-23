/** Fill with linear gradient */
export function gradientFill(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
  angle: number = 0
): void {
  const cos = Math.cos(angle * Math.PI / 180);
  const sin = Math.sin(angle * Math.PI / 180);
  const maxDist = Math.abs(width * cos) + Math.abs(height * sin);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const pos = x * cos + y * sin;
      const t = Math.max(0, Math.min(1, (pos + maxDist / 2) / maxDist));

      pixels[idx] = Math.round(color1.r + (color2.r - color1.r) * t);
      pixels[idx + 1] = Math.round(color1.g + (color2.g - color1.g) * t);
      pixels[idx + 2] = Math.round(color1.b + (color2.b - color1.b) * t);
      pixels[idx + 3] = 255;
    }
  }
}

/** Fill with radial gradient */
export function radialGradientFill(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
  centerX?: number,
  centerY?: number
): void {
  const cx = centerX ?? width / 2;
  const cy = centerY ?? height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const t = Math.min(1, dist / maxDist);

      pixels[idx] = Math.round(color1.r + (color2.r - color1.r) * t);
      pixels[idx + 1] = Math.round(color1.g + (color2.g - color1.g) * t);
      pixels[idx + 2] = Math.round(color1.b + (color2.b - color1.b) * t);
      pixels[idx + 3] = 255;
    }
  }
}
