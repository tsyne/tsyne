/** Vortex effect - spiral distortion that increases towards center */
export function vortex(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number,
  radius?: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = radius ?? Math.min(centerX, centerY);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let srcX: number, srcY: number;

      if (dist < maxRadius) {
        // Vortex: rotation increases as we approach center
        const normalizedDist = dist / maxRadius;
        const rotation = (1 - normalizedDist) * strength * Math.PI / 180;

        const angle = Math.atan2(dy, dx) - rotation;
        srcX = Math.round(centerX + dist * Math.cos(angle));
        srcY = Math.round(centerY + dist * Math.sin(angle));
      } else {
        srcX = x;
        srcY = y;
      }

      const dstIdx = (y * width + x) * 4;

      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const srcIdx = (srcY * width + srcX) * 4;
        output[dstIdx] = pixels[srcIdx];
        output[dstIdx + 1] = pixels[srcIdx + 1];
        output[dstIdx + 2] = pixels[srcIdx + 2];
        output[dstIdx + 3] = pixels[srcIdx + 3];
      } else {
        output[dstIdx] = 0;
        output[dstIdx + 1] = 0;
        output[dstIdx + 2] = 0;
        output[dstIdx + 3] = 255;
      }
    }
  }

  return output;
}
