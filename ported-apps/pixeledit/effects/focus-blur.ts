import { discBlur } from './disc-blur';

/** Focus blur - circular depth of field simulation */
export function focusBlur(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  focusX: number,
  focusY: number,
  focusRadius: number,
  maxBlur: number
): Uint8ClampedArray {
  const blurred = discBlur(pixels, width, height, maxBlur);
  const output = new Uint8ClampedArray(pixels.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const dx = x - focusX;
      const dy = y - focusY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Calculate blur amount based on distance from focus point
      const blurFactor = Math.min(1, Math.max(0, (dist - focusRadius) / focusRadius));

      // Blend between sharp and blurred
      output[idx] = Math.round(pixels[idx] * (1 - blurFactor) + blurred[idx] * blurFactor);
      output[idx + 1] = Math.round(pixels[idx + 1] * (1 - blurFactor) + blurred[idx + 1] * blurFactor);
      output[idx + 2] = Math.round(pixels[idx + 2] * (1 - blurFactor) + blurred[idx + 2] * blurFactor);
      output[idx + 3] = pixels[idx + 3];
    }
  }

  return output;
}
