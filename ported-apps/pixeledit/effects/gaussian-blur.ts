import { blur } from './blur';

/** Gaussian blur approximated with 3 box blur passes */
export function gaussianBlur(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  sigma: number
): Uint8ClampedArray {
  const radius = Math.ceil(sigma * 2);
  let result = blur(pixels, width, height, radius);
  result = blur(result, width, height, radius);
  result = blur(result, width, height, radius);
  return result;
}
