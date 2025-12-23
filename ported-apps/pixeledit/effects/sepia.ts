/** Apply sepia tone effect */
export function sepia(pixels: Uint8ClampedArray): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    pixels[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
    pixels[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
    pixels[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
  }
}
