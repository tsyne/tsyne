/** Thermal/heat map effect */
export function thermal(pixels: Uint8ClampedArray): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    const t = gray / 255;
    // Blue → Cyan → Green → Yellow → Red
    if (t < 0.25) {
      pixels[i] = 0;
      pixels[i + 1] = Math.floor(t * 4 * 255);
      pixels[i + 2] = 255;
    } else if (t < 0.5) {
      pixels[i] = 0;
      pixels[i + 1] = 255;
      pixels[i + 2] = Math.floor((0.5 - t) * 4 * 255);
    } else if (t < 0.75) {
      pixels[i] = Math.floor((t - 0.5) * 4 * 255);
      pixels[i + 1] = 255;
      pixels[i + 2] = 0;
    } else {
      pixels[i] = 255;
      pixels[i + 1] = Math.floor((1 - t) * 4 * 255);
      pixels[i + 2] = 0;
    }
  }
}
