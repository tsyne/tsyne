/** Duotone effect mapping grayscale to two colors */
export function duotone(
  pixels: Uint8ClampedArray,
  darkR: number,
  darkG: number,
  darkB: number,
  lightR: number,
  lightG: number,
  lightB: number
): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = (0.2989 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]) / 255;
    pixels[i] = darkR + (lightR - darkR) * gray;
    pixels[i + 1] = darkG + (lightG - darkG) * gray;
    pixels[i + 2] = darkB + (lightB - darkB) * gray;
  }
}
