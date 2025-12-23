/** Star burst effect - pointed star rays from bright areas */
export function star(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  rayLength: number,
  rayCount: number = 4,
  threshold: number = 230
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels);

  // Find bright pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const lum = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;

      if (lum > threshold) {
        // Draw star rays
        for (let r = 0; r < rayCount; r++) {
          const angle = (r / rayCount) * Math.PI * 2;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          for (let d = 1; d <= rayLength; d++) {
            const px = Math.round(x + cos * d);
            const py = Math.round(y + sin * d);

            if (px >= 0 && px < width && py >= 0 && py < height) {
              const falloff = 1 - d / rayLength;
              const rayIdx = (py * width + px) * 4;
              output[rayIdx] = Math.min(255, output[rayIdx] + 255 * falloff * 0.5);
              output[rayIdx + 1] = Math.min(255, output[rayIdx + 1] + 255 * falloff * 0.5);
              output[rayIdx + 2] = Math.min(255, output[rayIdx + 2] + 255 * falloff * 0.5);
            }
          }
        }
      }
    }
  }

  return output;
}
