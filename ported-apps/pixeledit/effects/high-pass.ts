import { blur } from './blur';

/** High pass filter for edge enhancement */
export function highPass(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): Uint8ClampedArray {
  const blurred = blur(pixels, width, height, radius);
  const output = new Uint8ClampedArray(pixels.length);

  for (let i = 0; i < pixels.length; i += 4) {
    output[i] = Math.max(0, Math.min(255, 128 + (pixels[i] - blurred[i])));
    output[i + 1] = Math.max(0, Math.min(255, 128 + (pixels[i + 1] - blurred[i + 1])));
    output[i + 2] = Math.max(0, Math.min(255, 128 + (pixels[i + 2] - blurred[i + 2])));
    output[i + 3] = pixels[i + 3];
  }
  return output;
}
