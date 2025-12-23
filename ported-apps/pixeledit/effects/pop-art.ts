import { posterize } from './posterize';
import { saturation } from './saturation';
import { edgeDetect } from './edge-detect';

/** Pop art effect with posterization and edge outlines */
export function popArt(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  // First posterize
  const posterized = new Uint8ClampedArray(pixels);
  posterize(posterized, 4);

  // Then boost saturation
  saturation(posterized, 80);

  // Add edge outlines
  const edges = edgeDetect(pixels, width, height);

  for (let i = 0; i < posterized.length; i += 4) {
    if (edges[i] > 100) {
      posterized[i] = 0;
      posterized[i + 1] = 0;
      posterized[i + 2] = 0;
    }
  }

  return posterized;
}
