/**
 * Pure JS separable Gaussian blur on RGBA Uint8Array buffers.
 *
 * Two-pass (horizontal then vertical) for O(n*r) complexity.
 * Edge pixels are clamped (nearest-neighbor extension).
 */

/**
 * In-place Gaussian blur on an RGBA pixel buffer.
 *
 * @param pixels - RGBA pixel data (4 bytes per pixel, row-major)
 * @param w - Buffer width in pixels
 * @param h - Buffer height in pixels
 * @param sigmaX - Horizontal blur standard deviation in pixels
 * @param sigmaY - Vertical blur standard deviation (defaults to sigmaX)
 */
export function gaussianBlur(
  pixels: Uint8Array,
  w: number,
  h: number,
  sigmaX: number,
  sigmaY?: number,
): void {
  if (sigmaX <= 0 && (sigmaY === undefined || sigmaY <= 0)) return;
  const sy = sigmaY ?? sigmaX;

  const temp = new Uint8Array(pixels.length);

  // Horizontal pass: pixels → temp
  if (sigmaX > 0) {
    const kernel = buildKernel(sigmaX);
    const r = (kernel.length - 1) / 2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let rr = 0, gg = 0, bb = 0, aa = 0;
        for (let k = -r; k <= r; k++) {
          const sx = Math.min(Math.max(x + k, 0), w - 1);
          const idx = (y * w + sx) * 4;
          const weight = kernel[k + r];
          rr += pixels[idx] * weight;
          gg += pixels[idx + 1] * weight;
          bb += pixels[idx + 2] * weight;
          aa += pixels[idx + 3] * weight;
        }
        const oi = (y * w + x) * 4;
        temp[oi] = Math.round(rr);
        temp[oi + 1] = Math.round(gg);
        temp[oi + 2] = Math.round(bb);
        temp[oi + 3] = Math.round(aa);
      }
    }
  } else {
    temp.set(pixels);
  }

  // Vertical pass: temp → pixels
  if (sy > 0) {
    const kernel = buildKernel(sy);
    const r = (kernel.length - 1) / 2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let rr = 0, gg = 0, bb = 0, aa = 0;
        for (let k = -r; k <= r; k++) {
          const sy2 = Math.min(Math.max(y + k, 0), h - 1);
          const idx = (sy2 * w + x) * 4;
          const weight = kernel[k + r];
          rr += temp[idx] * weight;
          gg += temp[idx + 1] * weight;
          bb += temp[idx + 2] * weight;
          aa += temp[idx + 3] * weight;
        }
        const oi = (y * w + x) * 4;
        pixels[oi] = Math.round(rr);
        pixels[oi + 1] = Math.round(gg);
        pixels[oi + 2] = Math.round(bb);
        pixels[oi + 3] = Math.round(aa);
      }
    }
  } else {
    pixels.set(temp);
  }
}

/** Build a normalized 1D Gaussian kernel with radius = ceil(3*sigma). */
function buildKernel(sigma: number): Float64Array {
  const r = Math.ceil(3 * sigma);
  const size = 2 * r + 1;
  const kernel = new Float64Array(size);
  const s2 = 2 * sigma * sigma;
  let sum = 0;
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / s2);
    kernel[i + r] = v;
    sum += v;
  }
  // Normalize
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }
  return kernel;
}
