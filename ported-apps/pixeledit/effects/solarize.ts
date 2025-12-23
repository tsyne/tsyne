/** Solarize: invert pixels above threshold */
export function solarize(pixels: Uint8ClampedArray, thresholdValue: number): void {
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] > thresholdValue) pixels[i] = 255 - pixels[i];
    if (pixels[i + 1] > thresholdValue) pixels[i + 1] = 255 - pixels[i + 1];
    if (pixels[i + 2] > thresholdValue) pixels[i + 2] = 255 - pixels[i + 2];
  }
}
