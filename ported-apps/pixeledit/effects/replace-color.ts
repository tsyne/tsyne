/** Replace one color with another */
export function replaceColor(
  pixels: Uint8ClampedArray,
  fromR: number,
  fromG: number,
  fromB: number,
  toR: number,
  toG: number,
  toB: number,
  tolerance: number
): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const dist = Math.sqrt(
      (pixels[i] - fromR) ** 2 +
      (pixels[i + 1] - fromG) ** 2 +
      (pixels[i + 2] - fromB) ** 2
    );

    if (dist <= tolerance) {
      const blend = 1 - dist / tolerance;
      pixels[i] = Math.round(pixels[i] + (toR - pixels[i]) * blend);
      pixels[i + 1] = Math.round(pixels[i + 1] + (toG - pixels[i + 1]) * blend);
      pixels[i + 2] = Math.round(pixels[i + 2] + (toB - pixels[i + 2]) * blend);
    }
  }
}
