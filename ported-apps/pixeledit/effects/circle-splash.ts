/** Circle splash effect - radial explosion/splash from center */
export function circleSplash(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  centerX?: number,
  centerY?: number,
  strength: number = 50
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const cx = centerX ?? width / 2;
  const cy = centerY ?? height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  const factor = strength / 100;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Splash: pixels move outward with wave pattern
      const wave = Math.sin(dist * 0.2) * factor * 10;
      const newDist = dist + wave;

      const srcX = Math.round(cx + newDist * Math.cos(angle));
      const srcY = Math.round(cy + newDist * Math.sin(angle));

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
