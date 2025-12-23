import { posterize } from './posterize';
import { edgeDetect } from './edge-detect';

/** Cartoon/cel shading effect */
export function cartoon(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  levels: number,
  edgeThreshold: number
): Uint8ClampedArray {
  // Posterize colors
  const output = new Uint8ClampedArray(pixels);
  posterize(output, levels);

  // Detect edges
  const edges = edgeDetect(pixels, width, height);

  // Draw black outlines
  for (let i = 0; i < output.length; i += 4) {
    if (edges[i] > edgeThreshold) {
      output[i] = 0;
      output[i + 1] = 0;
      output[i + 2] = 0;
    }
  }

  return output;
}
