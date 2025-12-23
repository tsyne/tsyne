/** Luminance-only sharpening - preserves colors better */
export function sharpenLuminance(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const factor = amount / 100;

  // Laplacian kernel for edge detection
  const kernel = [0, -1, 0, -1, 4, -1, 0, -1, 0];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Calculate luminance edge
      let lumEdge = 0;
      let ki = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = Math.max(0, Math.min(width - 1, x + kx));
          const py = Math.max(0, Math.min(height - 1, y + ky));
          const pidx = (py * width + px) * 4;
          const lum = 0.299 * pixels[pidx] + 0.587 * pixels[pidx + 1] + 0.114 * pixels[pidx + 2];
          lumEdge += lum * kernel[ki++];
        }
      }

      // Apply sharpening to each channel based on luminance edge
      output[idx] = Math.max(0, Math.min(255, pixels[idx] + lumEdge * factor));
      output[idx + 1] = Math.max(0, Math.min(255, pixels[idx + 1] + lumEdge * factor));
      output[idx + 2] = Math.max(0, Math.min(255, pixels[idx + 2] + lumEdge * factor));
      output[idx + 3] = pixels[idx + 3];
    }
  }

  return output;
}
