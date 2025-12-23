import { posterize } from './posterize';
import { edgeDetect } from './edge-detect';

/** Comics/comic book effect - bold colors with halftone-like dots and outlines */
export function comics(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  dotSize: number = 4
): Uint8ClampedArray {
  // Posterize to bold colors
  const output = new Uint8ClampedArray(pixels);
  posterize(output, 4);

  // Boost saturation
  for (let i = 0; i < output.length; i += 4) {
    const avg = (output[i] + output[i + 1] + output[i + 2]) / 3;
    output[i] = Math.min(255, output[i] + (output[i] - avg) * 0.5);
    output[i + 1] = Math.min(255, output[i + 1] + (output[i + 1] - avg) * 0.5);
    output[i + 2] = Math.min(255, output[i + 2] + (output[i + 2] - avg) * 0.5);
  }

  // Add halftone pattern to shadows
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const lum = (output[idx] + output[idx + 1] + output[idx + 2]) / 3;

      // Add dot pattern in mid-tones
      if (lum < 180 && lum > 60) {
        const dotX = x % dotSize;
        const dotY = y % dotSize;
        const centerDist = Math.sqrt(
          (dotX - dotSize / 2) ** 2 + (dotY - dotSize / 2) ** 2
        );
        const dotRadius = ((180 - lum) / 180) * (dotSize / 2);
        if (centerDist < dotRadius) {
          output[idx] = Math.max(0, output[idx] - 30);
          output[idx + 1] = Math.max(0, output[idx + 1] - 30);
          output[idx + 2] = Math.max(0, output[idx + 2] - 30);
        }
      }
    }
  }

  // Detect and draw bold outlines
  const edges = edgeDetect(pixels, width, height);
  for (let i = 0; i < output.length; i += 4) {
    if (edges[i] > 80) {
      output[i] = 0;
      output[i + 1] = 0;
      output[i + 2] = 0;
    }
  }

  return output;
}
