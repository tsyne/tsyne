import { edgeDetect } from './edge-detect';

/** Edge-only sharpening - sharpens detected edges only */
export function sharpenEdges(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number,
  edgeThreshold: number = 30
): Uint8ClampedArray {
  const edges = edgeDetect(pixels, width, height);
  const output = new Uint8ClampedArray(pixels);
  const factor = amount / 100;

  // 3x3 sharpen kernel
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      // Only sharpen if this is an edge pixel
      if (edges[idx] > edgeThreshold) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let ki = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pidx = ((y + ky) * width + (x + kx)) * 4;
              sum += pixels[pidx + c] * kernel[ki++];
            }
          }
          const sharpened = Math.max(0, Math.min(255, sum));
          output[idx + c] = Math.round(pixels[idx + c] + (sharpened - pixels[idx + c]) * factor);
        }
      }
    }
  }

  return output;
}
