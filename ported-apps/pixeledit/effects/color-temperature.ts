/** Adjust color temperature (warm/cool) */
export function colorTemperature(pixels: Uint8ClampedArray, temperature: number): void {
  const warm = temperature > 0;
  const strength = Math.abs(temperature) / 100;
  for (let i = 0; i < pixels.length; i += 4) {
    if (warm) {
      pixels[i] = Math.min(255, pixels[i] + 30 * strength);
      pixels[i + 2] = Math.max(0, pixels[i + 2] - 20 * strength);
    } else {
      pixels[i] = Math.max(0, pixels[i] - 20 * strength);
      pixels[i + 2] = Math.min(255, pixels[i + 2] + 30 * strength);
    }
  }
}
