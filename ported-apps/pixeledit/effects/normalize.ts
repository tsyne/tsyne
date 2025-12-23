/** Auto-levels / normalize contrast */
export function normalize(pixels: Uint8ClampedArray): void {
  let minR = 255, minG = 255, minB = 255;
  let maxR = 0, maxG = 0, maxB = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    minR = Math.min(minR, pixels[i]);
    maxR = Math.max(maxR, pixels[i]);
    minG = Math.min(minG, pixels[i + 1]);
    maxG = Math.max(maxG, pixels[i + 1]);
    minB = Math.min(minB, pixels[i + 2]);
    maxB = Math.max(maxB, pixels[i + 2]);
  }
  const rangeR = maxR - minR || 1;
  const rangeG = maxG - minG || 1;
  const rangeB = maxB - minB || 1;
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = ((pixels[i] - minR) / rangeR) * 255;
    pixels[i + 1] = ((pixels[i + 1] - minG) / rangeG) * 255;
    pixels[i + 2] = ((pixels[i + 2] - minB) / rangeB) * 255;
  }
}
