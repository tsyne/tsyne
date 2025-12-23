import { blur } from './blur';

/** Unsharp mask for sharpening based on blurred difference */
export function unsharpMask(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number,
  radius: number
): Uint8ClampedArray {
  const blurred = blur(pixels, width, height, radius);
  const output = new Uint8ClampedArray(pixels.length);

  for (let i = 0; i < pixels.length; i += 4) {
    output[i] = Math.max(0, Math.min(255, pixels[i] + (pixels[i] - blurred[i]) * amount));
    output[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + (pixels[i + 1] - blurred[i + 1]) * amount));
    output[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + (pixels[i + 2] - blurred[i + 2]) * amount));
    output[i + 3] = pixels[i + 3];
  }
  return output;
}
