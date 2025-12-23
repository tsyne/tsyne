/** Ripple effect (concentric wave distortion) */
export function ripple(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  amplitude: number,
  wavelength: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const centerX = width / 2;
  const centerY = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const offset = amplitude * Math.sin(2 * Math.PI * dist / wavelength);
      const angle = Math.atan2(dy, dx);

      const srcX = Math.round(x + offset * Math.cos(angle));
      const srcY = Math.round(y + offset * Math.sin(angle));

      const dstIdx = (y * width + x) * 4;

      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const srcIdx = (srcY * width + srcX) * 4;
        output[dstIdx] = pixels[srcIdx];
        output[dstIdx + 1] = pixels[srcIdx + 1];
        output[dstIdx + 2] = pixels[srcIdx + 2];
        output[dstIdx + 3] = pixels[srcIdx + 3];
      } else {
        output[dstIdx] = pixels[dstIdx];
        output[dstIdx + 1] = pixels[dstIdx + 1];
        output[dstIdx + 2] = pixels[dstIdx + 2];
        output[dstIdx + 3] = pixels[dstIdx + 3];
      }
    }
  }
  return output;
}
