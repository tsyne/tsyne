import { blur } from './blur';

/** Clarity (local contrast enhancement) */
export function clarity(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number
): Uint8ClampedArray {
  const blurred = blur(pixels, width, height, 3);
  const output = new Uint8ClampedArray(pixels.length);
  const factor = amount / 100;

  for (let i = 0; i < pixels.length; i += 4) {
    output[i] = Math.max(0, Math.min(255, pixels[i] + (pixels[i] - blurred[i]) * factor));
    output[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + (pixels[i + 1] - blurred[i + 1]) * factor));
    output[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + (pixels[i + 2] - blurred[i + 2]) * factor));
    output[i + 3] = pixels[i + 3];
  }
  return output;
}
