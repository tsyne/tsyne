import { spherize } from './spherize';

/** Pinch effect (opposite of spherize) */
export function pinch(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number
): Uint8ClampedArray {
  return spherize(pixels, width, height, -strength);
}
