/** Halo effect - glowing ring around bright areas */
export function halo(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  intensity: number,
  color: { r: number; g: number; b: number } = { r: 255, g: 255, b: 200 }
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels);
  const factor = intensity / 100;

  // Find bright pixels and add halos
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const lum = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;

      if (lum > 220) {
        // Add halo around this bright pixel
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const px = x + dx;
            const py = y + dy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0 && dist <= radius) {
                const falloff = 1 - dist / radius;
                const haloIdx = (py * width + px) * 4;
                output[haloIdx] = Math.min(255, output[haloIdx] + color.r * falloff * factor);
                output[haloIdx + 1] = Math.min(255, output[haloIdx + 1] + color.g * falloff * factor);
                output[haloIdx + 2] = Math.min(255, output[haloIdx + 2] + color.b * falloff * factor);
              }
            }
          }
        }
      }
    }
  }

  return output;
}
