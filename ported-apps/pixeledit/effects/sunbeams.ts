/** Sunbeams effect - rays emanating from a point */
export function sunbeams(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  rayCount: number,
  intensity: number
): void {
  const factor = intensity / 100;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const angle = Math.atan2(dy, dx);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Create rays using sine wave
      const rayAngle = angle * rayCount;
      const ray = (Math.sin(rayAngle) + 1) / 2;

      // Fade with distance
      const maxDist = Math.sqrt(width * width + height * height);
      const distFade = 1 - dist / maxDist;

      const brightness = ray * distFade * factor;

      const idx = (y * width + x) * 4;
      pixels[idx] = Math.min(255, pixels[idx] + 255 * brightness);
      pixels[idx + 1] = Math.min(255, pixels[idx + 1] + 230 * brightness);
      pixels[idx + 2] = Math.min(255, pixels[idx + 2] + 180 * brightness);
    }
  }
}
