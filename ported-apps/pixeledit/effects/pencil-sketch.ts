import { grayscale } from './grayscale';
import { edgeDetect } from './edge-detect';
import { invert } from './invert';

/** Pencil sketch effect */
export function pencilSketch(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  // First grayscale
  grayscale(pixels);
  // Then edge detect and invert
  const edges = edgeDetect(pixels, width, height);
  invert(edges);
  return edges;
}
