/** Apply gamma correction */
export function gamma(pixels: Uint8ClampedArray, gammaValue: number): void {
  const correction = 1 / gammaValue;
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = Math.pow(pixels[i] / 255, correction) * 255;
    pixels[i + 1] = Math.pow(pixels[i + 1] / 255, correction) * 255;
    pixels[i + 2] = Math.pow(pixels[i + 2] / 255, correction) * 255;
  }
}
