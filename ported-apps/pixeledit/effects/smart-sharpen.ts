import { blur } from './blur';

/** Smart sharpen - edge-aware sharpening with noise reduction */
export function smartSharpen(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number,
  radius: number,
  threshold: number = 10
): Uint8ClampedArray {
  const blurred = blur(pixels, width, height, radius);
  const output = new Uint8ClampedArray(pixels.length);
  const factor = amount / 100;

  for (let i = 0; i < pixels.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const diff = pixels[i + c] - blurred[i + c];

      // Only sharpen if difference exceeds threshold (reduces noise sharpening)
      if (Math.abs(diff) > threshold) {
        output[i + c] = Math.max(0, Math.min(255, pixels[i + c] + diff * factor));
      } else {
        output[i + c] = pixels[i + c];
      }
    }
    output[i + 3] = pixels[i + 3];
  }

  return output;
}
