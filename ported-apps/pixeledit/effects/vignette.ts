/** Add vignette (darkened edges) */
export function vignette(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number
): void {
  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const factor = 1 - (dist / maxDist) * strength;
      pixels[i] *= factor;
      pixels[i + 1] *= factor;
      pixels[i + 2] *= factor;
    }
  }
}
