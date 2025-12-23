import { blur } from './blur';

/** Tilt-shift blur - selective focus with blur bands */
export function tiltShift(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  focusY: number,
  focusHeight: number,
  blurAmount: number
): Uint8ClampedArray {
  const blurred = blur(pixels, width, height, blurAmount);
  const output = new Uint8ClampedArray(pixels.length);

  const focusTop = focusY - focusHeight / 2;
  const focusBottom = focusY + focusHeight / 2;
  const transitionSize = focusHeight * 0.5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      let blurFactor: number;

      if (y >= focusTop && y <= focusBottom) {
        // In focus zone
        blurFactor = 0;
      } else if (y < focusTop) {
        // Above focus - gradually increase blur
        const dist = focusTop - y;
        blurFactor = Math.min(1, dist / transitionSize);
      } else {
        // Below focus - gradually increase blur
        const dist = y - focusBottom;
        blurFactor = Math.min(1, dist / transitionSize);
      }

      // Blend between sharp and blurred
      output[idx] = Math.round(pixels[idx] * (1 - blurFactor) + blurred[idx] * blurFactor);
      output[idx + 1] = Math.round(pixels[idx + 1] * (1 - blurFactor) + blurred[idx + 1] * blurFactor);
      output[idx + 2] = Math.round(pixels[idx + 2] * (1 - blurFactor) + blurred[idx + 2] * blurFactor);
      output[idx + 3] = pixels[idx + 3];
    }
  }

  return output;
}
