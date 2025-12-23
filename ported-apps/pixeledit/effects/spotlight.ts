/** Spotlight effect - circular illumination from a point */
export function spotlight(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radius: number,
  intensity: number = 100
): void {
  const factor = intensity / 100;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Soft falloff from center
      let light: number;
      if (dist < radius * 0.5) {
        light = 1;
      } else if (dist < radius) {
        light = 1 - (dist - radius * 0.5) / (radius * 0.5);
      } else {
        light = 0;
      }

      // Apply darkening outside spotlight
      const darkness = 1 - (1 - light) * factor;

      const idx = (y * width + x) * 4;
      pixels[idx] = Math.round(pixels[idx] * darkness);
      pixels[idx + 1] = Math.round(pixels[idx + 1] * darkness);
      pixels[idx + 2] = Math.round(pixels[idx + 2] * darkness);
    }
  }
}
